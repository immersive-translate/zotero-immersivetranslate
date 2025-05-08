import { saveTranslationData } from "./persistence";
import { showTaskManager, updateTaskInList } from "./task-manager";
import type { TranslationTaskData } from "../../types";
import { getPref } from "../../utils/prefs";
import { showConfirmationDialog } from "./confirm-dialog";
import { translatePDF } from "./translate";
import { TranslationTaskMonitor } from "./task-monitor";
import { getString } from "../../utils/locale";
import { showDialog } from "../../utils/dialog";
import { Language } from "../language/types";

const ATTR_TAG = "BabelDOC_translated";

/**
 * Check if attachment is already in the translation task list
 */
export function isAttachmentInTaskList(attachmentId: number): boolean {
  return !!addon.data.task.translationTaskList?.find(
    (task) =>
      task.attachmentId === attachmentId &&
      task.status !== "success" &&
      task.status !== "failed",
  );
}

export async function addTasksToQueue() {
  const tasksToQueue = await getTranslationTasks();

  if (tasksToQueue.length === 0) {
    ztoolkit.log("No valid PDF attachments found to add to the queue.");
    showDialog({
      title: getString("task-no-pdf"),
    });
    return;
  }
  const translateMode = getPref("translateMode");
  const translateModel = getPref("translateModel");
  const targetLanguage = getPref("targetLanguage") as Language;
  const enhanceCompatibility = getPref("enhanceCompatibility");
  const ocrWorkaround = getPref("ocrWorkaround");
  const confirmResult = await showConfirmationDialog();
  if (confirmResult.action === "cancel") {
    return;
  }

  tasksToQueue.forEach((task) => {
    task.translateMode = confirmResult.data?.translateMode || translateMode;
    task.translateModel = confirmResult.data?.translateModel || translateModel;
    task.targetLanguage = confirmResult.data?.targetLanguage || targetLanguage;
    task.enhanceCompatibility =
      confirmResult.data?.enhanceCompatibility || enhanceCompatibility;
    task.ocrWorkaround = confirmResult.data?.ocrWorkaround || ocrWorkaround;
  });
  ztoolkit.log(`Adding ${tasksToQueue.length} translation tasks to the queue.`);
  addon.data.task.translationGlobalQueue.push(...tasksToQueue); // Add new tasks

  // Deep clone the tasks to translationTaskList for tracking
  if (!addon.data.task.translationTaskList) {
    addon.data.task.translationTaskList = [];
  }
  const clonedTasks = tasksToQueue.map((task) =>
    JSON.parse(JSON.stringify(task)),
  );
  addon.data.task.translationTaskList.push(...clonedTasks);

  // Save the updated queues
  saveTranslationData();

  startQueueProcessing();
}

// get translation tasks from selected items
async function getTranslationTasks(): Promise<TranslationTaskData[]> {
  const selectedItems = Zotero.getActiveZoteroPane().getSelectedItems();
  const tasks: TranslationTaskData[] = [];

  for (const item of selectedItems) {
    let parentItem: Zotero.Item | null = null;
    const attachmentsToProcess: Zotero.Item[] = [];

    if (item.isRegularItem()) {
      parentItem = item;
      const attachmentIds = item.getAttachments(false);
      // 只处理PDF附件
      for (const id of attachmentIds) {
        const attachment = Zotero.Items.get(id);
        const hasTranslatedTag = attachment
          .getTags()
          .find((tagItem) => tagItem.tag === ATTR_TAG);
        if (hasTranslatedTag) {
          ztoolkit.log(
            `Attachment ${id} is already a translation result, skipping.`,
          );
          continue;
        }
        if (attachment && attachment.isPDFAttachment()) {
          attachmentsToProcess.push(attachment);
        }
      }
    } else if (item.isPDFAttachment()) {
      const hasTranslatedTag = item
        .getTags()
        .find((tagItem) => tagItem.tag === ATTR_TAG);
      if (hasTranslatedTag) {
        ztoolkit.log(
          `Attachment ${item.id} is already a translation result, skipping.`,
        );
        continue;
      }
      const parentItemId = item.parentItemID;

      if (parentItemId) {
        const potentialParent = Zotero.Items.get(parentItemId);
        if (potentialParent && potentialParent.isRegularItem()) {
          parentItem = potentialParent;
          attachmentsToProcess.push(item); // Only process the selected attachment
        } else {
          ztoolkit.log(
            `Attachment ${item.id} has no valid parent item, skipping.`,
          );
          continue;
        }
      } else {
        attachmentsToProcess.push(item);
      }
    }

    for (const attachment of attachmentsToProcess) {
      const attachmentId = attachment.id;
      const attachmentFilename =
        attachment.attachmentFilename || `Attachment ${attachmentId}`;

      // Check attachment is already in the translation task list?
      const isInTaskList = isAttachmentInTaskList(attachmentId);
      // TODO 检查是否是已成功的翻译任务，给予提示
      // 1. 在 tasklist 中，并且状态是成功
      // 2. 有同名称的带 babeldoc tag 的翻译结果附件
      if (isInTaskList) {
        ztoolkit.log(
          `Attachment ${attachmentId} (${attachmentFilename}) is already in the translation task list, skipping.`,
        );
        continue;
      }
      // --- End Deduplication Checks ---

      // Proceed only if not deduplicated
      const exists = await attachment.fileExists();
      if (exists) {
        const filePath = await attachment.getFilePathAsync();
        const translateMode = getPref("translateMode");
        const translateModel = getPref("translateModel");
        const targetLanguage = getPref("targetLanguage") as Language;
        const enhanceCompatibility = getPref("enhanceCompatibility");
        const ocrWorkaround = getPref("ocrWorkaround");
        if (filePath && attachmentFilename) {
          tasks.push({
            parentItemId: parentItem?.id,
            parentItemTitle: parentItem?.getField("title"),
            attachmentId: attachmentId,
            attachmentFilename: attachmentFilename,
            attachmentPath: filePath,
            status: "queued",
            targetLanguage: targetLanguage,
            translateModel: translateModel,
            translateMode: translateMode,
            enhanceCompatibility: enhanceCompatibility,
            ocrWorkaround: ocrWorkaround,
          });
        } else {
          ztoolkit.log(
            `Could not get path or valid filename for attachment ${attachmentId}, skipping.`,
          );
        }
      } else {
        ztoolkit.log(
          `Attachment file does not exist for ${attachmentId}, skipping.`,
        );
      }
    }
  }

  ztoolkit.log("Found tasks (after refined deduplication):", tasks);
  return tasks;
}

export async function startQueueProcessing() {
  if (
    addon.data.task.isQueueProcessing ||
    addon.data.task.translationGlobalQueue.length === 0
  ) {
    return; // Already running or queue empty
  }
  showTaskManager();
  addon.data.task.isQueueProcessing = true;
  ztoolkit.log("Starting queue processing loop.");
  // Use Zotero.Promise.delay(0).then() to avoid deep recursion and yield
  Zotero.Promise.delay(0).then(processNextItem);
}

async function processNextItem() {
  if (addon.data.task.translationGlobalQueue.length === 0) {
    addon.data.task.isQueueProcessing = false;
    ztoolkit.log("Translation queue empty. Stopping processing loop.");
    saveTranslationData(); // Save the empty queue state
    return;
  }

  // Rename queueItem to taskData for clarity
  const taskData = addon.data.task.translationGlobalQueue.shift();

  // Save queue state after removing an item
  saveTranslationData();

  if (!taskData) {
    Zotero.Promise.delay(0).then(processNextItem);
    return;
  }

  // Get the parent item using parentItemId from taskData
  const parentItem = taskData.parentItemId
    ? Zotero.Items.get(taskData.parentItemId)
    : undefined;

  ztoolkit.log(
    `Processing task for attachment: ${taskData.attachmentFilename} (Parent: ${taskData.parentItemTitle}, ID: ${taskData.parentItemId})`,
  );

  try {
    // 如果任务已经有pdfId，说明是程序重启后恢复的任务，并且已经创建了翻译任务
    if (taskData.pdfId) {
      ztoolkit.log(
        `恢复已有pdfId(${taskData.pdfId})的任务: ${taskData.attachmentFilename}，直接进入监控阶段`,
      );
      // 直接启动监控任务
      TranslationTaskMonitor.addTask(taskData.pdfId, taskData, parentItem);
    } else {
      // 常规流程 - 从上传开始
      await translatePDF(taskData, parentItem);
      ztoolkit.log(
        `Initiated processing for: ${taskData.attachmentFilename}. Moving to next queue item.`,
      );
    }
  } catch (error: any) {
    ztoolkit.log(
      `ERROR: Failed to initiate translation for ${taskData.attachmentFilename}:`,
      error.message || error,
    );
    updateTaskInList(taskData.attachmentId, {
      status: "failed",
    });
  } finally {
    Zotero.Promise.delay(0).then(processNextItem);
  }
}
