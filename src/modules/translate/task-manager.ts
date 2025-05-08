import { isWindowAlive } from "../../utils/window";
import { config } from "../../../package.json";
import { getString } from "../../utils/locale";
import { saveTranslationData } from "./persistence";
import { Status, TranslationTaskData } from "../../types";
import { getTranslateModeLabel, getTranslateModelLabel } from "../../config";
import { Language } from "../language/types";
import { nativeLangMap } from "../language";
import { showDialog } from "../../utils/dialog";

/**
 * 显示翻译任务列表的弹窗
 */
export async function showTaskManager() {
  // 创建对话框
  if (isWindowAlive(addon.data.task.window)) {
    addon.data.task.window?.focus();
    refresh();
  } else {
    const windowArgs = {
      _initPromise: Zotero.Promise.defer(),
    };
    const win = Zotero.getMainWindow().openDialog(
      `chrome://${config.addonRef}/content/taskManager.xhtml`,
      `${config.addonRef}-taskManager`,
      `chrome,centerscreen,resizable,status,dialog=no`,
      windowArgs,
    )!;
    await windowArgs._initPromise.promise;
    addon.data.task.window = win;
    addon.data.task.tableHelper = new ztoolkit.VirtualizedTable(win!)
      .setContainerId("table-container")
      .setProp({
        id: "manager-table",
        // Do not use setLocale, as it modifies the Zotero.Intl.strings
        // Set locales directly to columns
        columns: [
          {
            dataKey: "parentItemTitle",
            label: getString("column-item"),
            fixedWidth: false,
          },
          {
            dataKey: "attachmentFilename",
            label: getString("column-attachment"),
            fixedWidth: false,
          },
          {
            dataKey: "targetLanguage",
            label: getString("column-target-language"),
            fixedWidth: false,
          },
          {
            dataKey: "translateModel",
            label: getString("column-translate-model"),
            fixedWidth: false,
          },
          {
            dataKey: "translateMode",
            label: getString("column-translate-mode"),
            fixedWidth: false,
          },
          {
            dataKey: "pdfId",
            label: getString("column-pdfId"),
            fixedWidth: false,
          },
          {
            dataKey: "status",
            label: getString("column-status"),
            fixedWidth: false,
          },
          {
            dataKey: "stage",
            label: getString("column-stage"),
            fixedWidth: false,
          },
          {
            dataKey: "progress",
            label: getString("column-progress"),
            fixedWidth: false,
          },
          {
            dataKey: "error",
            label: getString("column-error"),
            fixedWidth: false,
          },
        ].map((column) =>
          Object.assign(column, {
            label: column.label,
          }),
        ),
        showHeader: true,
        multiSelect: false,
        staticColumns: false,
        disableFontSizeScaling: true,
      })
      .setProp("getRowCount", () => addon.data.task.translationTaskList.length)
      .setProp("getRowData", (index) => {
        const task = addon.data.task.translationTaskList[index];
        return {
          status: getStatusText(task.status),
          progress: `${task.progress || "0"}%`,
          parentItemTitle: task.parentItemTitle || "-",
          attachmentFilename: task.attachmentFilename || "",
          targetLanguage: getLanguageName(task.targetLanguage) || "",
          translateModel: getTranslateModelLabel(task.translateModel) || "",
          translateMode: getTranslateModeLabel(task.translateMode) || "",
          stage: getStageText(task.stage) || "",
          pdfId: task.pdfId || "-",
          error: task.error || "-",
          resultAttachmentId: task.resultAttachmentId?.toString() || "",
        };
      })
      .setProp("onActivate", () => {
        const tasks = getSelectedTasks();
        if (tasks.length > 0) {
          const task = tasks[0];
          if (task.pdfId) {
            new ztoolkit.Clipboard().addText(task.pdfId, "text/unicode").copy();
            showDialog({
              title: getString("task-copy-success"),
            });
          }
        }
        return true;
      })
      .setProp(
        "getRowString",
        (index) =>
          addon.data.task.translationTaskList[index].parentItemTitle || "",
      )
      .render();
    const refreshButton = win.document.querySelector(
      "#refresh",
    ) as HTMLButtonElement;
    const copyPdfIdButton = win.document.querySelector(
      "#copy-pdf-id",
    ) as HTMLButtonElement;
    const cancelButton = win.document.querySelector(
      "#cancel",
    ) as HTMLButtonElement;
    const viewPdfButton = win.document.querySelector(
      "#view-pdf",
    ) as HTMLButtonElement;
    viewPdfButton.addEventListener("click", (ev) => {
      const tasks = getSelectedTasks();
      if (tasks.length > 0) {
        const task = tasks[0];
        if (task.resultAttachmentId) {
          const resultAttachment = Zotero.Items.get(task.resultAttachmentId);
          if (resultAttachment) {
            Zotero.Reader.open(resultAttachment.id);
          }
        } else {
          showDialog({
            title: getString("task-uncomplete"),
          });
        }
      } else {
        showDialog({
          title: getString("task-select-tip"),
        });
      }
    });

    refreshButton.addEventListener("click", (ev) => {
      refresh();
    });
    copyPdfIdButton.addEventListener("click", (ev) => {
      const tasks = getSelectedTasks();
      if (tasks.length > 0) {
        const task = tasks[0];
        if (task.pdfId) {
          new ztoolkit.Clipboard().addText(task.pdfId, "text/unicode").copy();
          showDialog({
            title: getString("task-copy-success"),
          });
        }
      } else {
        showDialog({
          title: getString("task-select-tip"),
        });
      }
    });
    cancelButton.addEventListener("click", (ev) => {
      const tasks = getSelectedTasks();
      if (tasks.length > 0) {
        const task = tasks[0];
        if (task.status === "queued") {
          cancelTask(task);
          refresh();
          showDialog({
            title: getString("task-cancel-success"),
          });
        } else {
          showDialog({
            title: getString("task-cancel-tip"),
          });
        }
      } else {
        showDialog({
          title: getString("task-select-tip"),
        });
      }
    });
    createWindowBoundInterval(
      () => {
        refresh();
      },
      3000,
      win,
    );
  }
}

async function updateTable() {
  const keys =
    addon.data.task.tableHelper?.treeInstance.selection.selected?.keys() || [];
  let id = undefined;
  for (const key of keys) {
    id = key;
  }
  return new Promise<void>((resolve) => {
    addon.data.task.tableHelper?.render(id, (_: any) => {
      resolve();
    });
  });
}

async function refresh() {
  await updateTable();
}

// Helper function to update a task in the translationTaskList
export function updateTaskInList(
  attachmentId: number,
  updates: {
    status?: Status;
    stage?: string;
    pdfId?: string;
    progress?: number;
    resultAttachmentId?: number;
    error?: string;
  },
) {
  if (!addon.data.task.translationTaskList) return;

  // Find the task from the end of the array (most recent task) - simple approach
  let taskIndex = -1;
  for (let i = addon.data.task.translationTaskList.length - 1; i >= 0; i--) {
    if (addon.data.task.translationTaskList[i].attachmentId === attachmentId) {
      taskIndex = i;
      break;
    }
  }

  if (taskIndex !== -1) {
    addon.data.task.translationTaskList[taskIndex] = {
      ...addon.data.task.translationTaskList[taskIndex],
      ...updates,
    };
  }

  // Call saveTranslationData after updating the task list
  saveTranslationData();
}

function getSelectedTasks() {
  const keys =
    addon.data.task.tableHelper?.treeInstance.selection.selected?.keys() || [];
  const datas = [];
  for (const key of keys) {
    const data = addon.data.task.translationTaskList[key];
    datas.push(data);
  }
  return datas;
}

function cancelTask(task: TranslationTaskData) {
  updateTaskInList(task.attachmentId, {
    status: "canceled",
  });
  addon.data.task.translationGlobalQueue.splice(
    addon.data.task.translationGlobalQueue.findIndex(
      (t) => t.attachmentId === task.attachmentId,
    ),
    1,
  );
  saveTranslationData();
}

/**
 * Creates a recurring interval that automatically cleans up when the window is closed
 * @param callback Function to execute at each interval
 * @param delay Time in milliseconds between executions
 * @param window Window to attach the interval to
 * @returns Interval ID that can be used with clearInterval if needed
 */
export function createWindowBoundInterval(
  callback: () => void,
  delay: number,
  window: Window,
): ReturnType<typeof setInterval> {
  const intervalId = setInterval(callback, delay);

  // Add unload listener to clean up the interval when the window closes
  window.addEventListener(
    "unload",
    () => {
      clearInterval(intervalId);
    },
    { once: true },
  );

  return intervalId;
}

function getStatusText(status?: string) {
  const statusMap: Record<string, string> = {
    queued: getString("task-status-queued"),
    uploading: getString("task-status-uploading"),
    translating: getString("task-status-translating"),
    success: getString("task-status-success"),
    failed: getString("task-status-failed"),
    canceled: getString("task-status-canceled"),
  };

  if (!status) return "";

  return statusMap[status];
}

function getStageText(stage?: string) {
  if (!stage) return "";
  const translationMap: { [key: string]: string } = {
    queued: getString("task-stage-queued"),
    uploading: getString("task-stage-uploading"),
    downloading: getString("task-stage-downloading"),
    completed: getString("task-stage-completed"),
    "Parse PDF and Create Intermediate Representation": getString(
      "task-stage-parse-pdf",
    ),
    DetectScannedFile: getString("task-stage-DetectScannedFile"),
    "Parse Page Layout": getString("task-stage-ParseLayout"),
    "Parse Paragraphs": getString("task-stage-ParseParagraphs"),
    "Parse Formulas and Styles": getString("task-stage-ParseFormulasAndStyles"),
    "Remove Char Descent": getString("task-stage-RemoveCharDescent"),
    "Translate Paragraphs": getString("task-stage-TranslateParagraphs"),
    Typesetting: getString("task-stage-Typesetting"),
    "Add Fonts": getString("task-stage-AddFonts"),
    "Generate drawing instructions": getString(
      "task-stage-GenerateDrawingInstructions",
    ),
    "Subset font": getString("task-stage-SubsetFont"),
    "Save PDF": getString("task-stage-SavePDF"),
    "prepare file download": getString("task-stage-prepareFileDownload"),
    "Prepare File Download": getString("task-stage-SavePDF"),
    "Parse Table": getString("task-stage-ParseTable"),
    "Waiting in line": getString("task-stage-WaitingInLine"),
    "Create Task": getString("task-stage-CreateTask"),
  };

  return translationMap[stage] || stage;
}

function getLanguageName(language: Language) {
  return nativeLangMap[language] || language;
}
