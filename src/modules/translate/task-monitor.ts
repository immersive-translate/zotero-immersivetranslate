import { TranslationTaskData } from "../../types";
import { updateTaskInList } from "./task-manager";

const ATTR_TAG = "BabelDOC_translated";

// Add a task monitor singleton to track all translation tasks
export const TranslationTaskMonitor = {
  activeTasks: new Map<
    string,
    {
      taskData: TranslationTaskData;
      parentItem?: Zotero.Item;
    }
  >(),
  pollingInterval: 3000,
  isPolling: false,

  // Add a task to the monitor
  addTask(
    pdfId: string,
    taskData: TranslationTaskData,
    parentItem?: Zotero.Item,
  ) {
    this.activeTasks.set(pdfId, { taskData, parentItem });

    // Start polling if not already running
    if (!this.isPolling) {
      this.startPolling();
    }

    ztoolkit.log(
      `Added task to monitor: ${pdfId} (${taskData.attachmentFilename})`,
    );
  },

  // Start the central polling process
  async startPolling() {
    if (this.isPolling) return;

    this.isPolling = true;
    ztoolkit.log(
      `Starting centralized translation task monitor with ${this.activeTasks.size} tasks`,
    );

    // Maximum number of concurrent requests to prevent overloading
    const MAX_CONCURRENT_REQUESTS = 6;

    while (this.activeTasks.size > 0) {
      // Get all current tasks
      const taskEntries = Array.from(this.activeTasks.entries());
      // Process tasks in batches
      for (let i = 0; i < taskEntries.length; i += MAX_CONCURRENT_REQUESTS) {
        const batch = taskEntries.slice(i, i + MAX_CONCURRENT_REQUESTS);
        const batchPromises = batch.map(([pdfId, { taskData, parentItem }]) =>
          this.checkTaskProgress(pdfId, taskData, parentItem),
        );

        // Wait for the current batch to complete before processing the next batch
        await Promise.all(batchPromises);
      }

      // Wait before the next polling cycle
      await Zotero.Promise.delay(this.pollingInterval);
    }

    this.isPolling = false;
    ztoolkit.log("All translation tasks completed, stopping monitor");
  },

  // Check progress for a single task
  async checkTaskProgress(
    pdfId: string,
    taskData: TranslationTaskData,
    parentItem?: Zotero.Item,
  ) {
    try {
      const processStatus = await addon.api.getTranslateStatus({ pdfId });
      const attachmentId = taskData.attachmentId;
      const attachmentFilename = taskData.attachmentFilename;

      ztoolkit.log(
        `Polling: Status for ${pdfId} (${attachmentFilename}):`,
        processStatus,
      );

      // Update status and stage on parent item
      const currentStage = `${processStatus.currentStageName || "queued"}`;

      updateTaskInList(attachmentId, {
        status: "translating",
        stage: currentStage,
        progress: processStatus.overall_progress || 0,
      });

      // --- Check for Success ---
      if (
        processStatus.status === "ok" &&
        processStatus.overall_progress === 100
      ) {
        ztoolkit.log(
          `Translation completed for PDF ID: ${pdfId} (${attachmentFilename})`,
        );
        updateTaskInList(attachmentId, {
          status: "translating",
          stage: "downloading",
          progress: 100,
        });

        // Download the result
        try {
          downloadTranslateResult({ pdfId, taskData, parentItem });
          // Remove task from monitor after success
          this.activeTasks.delete(pdfId);
        } catch (downloadError: any) {
          ztoolkit.log(
            `ERROR: Failed to download result for ${pdfId} (${attachmentFilename}):`,
            downloadError.message || downloadError,
          );
          updateTaskInList(attachmentId, {
            status: "failed",
            error: downloadError.message || "Failed to download result",
          });
          // Remove failed task from monitor
          this.activeTasks.delete(pdfId);
        }
        return;
      }

      // --- Check for Failure ---
      if (
        processStatus.status &&
        processStatus.status !== "" &&
        processStatus.status !== "ok"
      ) {
        const errorMsg = `Translation failed with status: ${processStatus.status}`;
        ztoolkit.log(
          `ERROR: ${errorMsg} for PDF ID: ${pdfId} (${attachmentFilename}).`,
        );
        updateTaskInList(attachmentId, {
          status: "failed",
          error: processStatus.message,
        });
        // Remove failed task from monitor
        this.activeTasks.delete(pdfId);
      }
    } catch (error: any) {
      // Handle API call errors
      const taskInfo = this.activeTasks.get(pdfId);
      if (taskInfo) {
        ztoolkit.log(
          `ERROR: During polling check for PDF ID ${pdfId} (${taskInfo.taskData.attachmentFilename}):`,
          error.message || error,
        );

        updateTaskInList(taskInfo.taskData.attachmentId, {
          status: "failed",
          error: error.message || "Error checking translation status",
        });
      }
      // Remove failed task from monitor
      this.activeTasks.delete(pdfId);
    }
  },
};

// Modified signature to use taskData
async function downloadTranslateResult({
  pdfId,
  taskData, // Use TranslationTaskData
  parentItem: parentItem, // Rename item to parentItem for clarity
}: {
  pdfId: string;
  taskData: TranslationTaskData;
  parentItem?: Zotero.Item;
}) {
  try {
    const result = await addon.api.getTranslatePdfResult({ pdfId });
    ztoolkit.log(
      `Download Result Info for ${taskData.attachmentFilename}:`,
      result,
    );
    const translateMode = taskData.translateMode;
    // Update the task status
    updateTaskInList(taskData.attachmentId, {
      status: "translating",
      stage: "downloading",
      progress: 100,
    });

    // Handle the case where we want to download both types
    if (translateMode === "all") {
      // Download and process both PDF types
      const dualResult = await downloadAndProcessPdf({
        fileUrl: result.translationDualPdfOssUrl,
        mode: "dual",
        pdfId,
        taskData,
        parentItem,
      });

      const translationOnlyResult = await downloadAndProcessPdf({
        fileUrl: result.translationOnlyPdfOssUrl,
        mode: "translation",
        pdfId,
        taskData,
        parentItem,
      });

      // Update final status using the ID of the translation-only version
      updateTaskInList(taskData.attachmentId, {
        status: "success",
        stage: "completed",
        progress: 100,
        resultAttachmentId: dualResult.id,
      });

      return;
    }

    // For single PDF download, determine which URL to use
    const fileUrl =
      translateMode === "dual"
        ? result.translationDualPdfOssUrl
        : result.translationOnlyPdfOssUrl;

    // Use the common helper function for single file download too
    const attachment = await downloadAndProcessPdf({
      fileUrl,
      mode: translateMode,
      pdfId,
      taskData,
      parentItem,
    });

    // Update final status in taskList
    updateTaskInList(taskData.attachmentId, {
      status: "success",
      stage: "completed",
      progress: 100,
      resultAttachmentId: attachment.id,
    });
  } catch (error: any) {
    ztoolkit.log(
      `ERROR: Failed download/process for PDF ID ${pdfId} (${taskData.attachmentFilename}):`,
      error.message || error,
    );
    throw error;
  }
}

// Helper function to download and process a single PDF file
async function downloadAndProcessPdf({
  fileUrl,
  mode,
  pdfId,
  taskData,
  parentItem,
}: {
  fileUrl: string;
  mode: string;
  pdfId: string;
  taskData: TranslationTaskData;
  parentItem?: Zotero.Item;
}) {
  if (!fileUrl) {
    throw new Error(
      `No download URL found for ${mode} mode (${taskData.attachmentFilename}).`,
    );
  }

  ztoolkit.log(
    `File URL for ${taskData.attachmentFilename} (${mode}):`,
    fileUrl,
  );

  const fileBuffer = await addon.api.downloadPdf(fileUrl);
  ztoolkit.log(
    `File downloaded for ${taskData.attachmentFilename} (${mode}, Size: ${fileBuffer.byteLength})`,
  );

  if (fileBuffer.byteLength === 0) {
    throw new Error(
      `Downloaded file is empty for ${taskData.attachmentFilename} (${mode}).`,
    );
  }

  const originalFilename = taskData.attachmentFilename;
  const baseName = originalFilename.replace(/\.pdf$/i, "");
  const targetLanguage = taskData.targetLanguage;
  const fileName = `${baseName}_${targetLanguage}_${mode}.pdf`;

  const tempDir = PathUtils.tempDir || Zotero.getTempDirectory().path;
  const tempPath = PathUtils.join(tempDir, fileName);
  ztoolkit.log(`Writing downloaded file to temp path: ${tempPath}`);

  await IOUtils.write(tempPath, new Uint8Array(fileBuffer));

  ztoolkit.log(`Importing attachment to item: ${taskData.parentItemId}`);

  const attachment = await Zotero.Attachments.importFromFile({
    file: tempPath,
    parentItemID: taskData.parentItemId || 0,
    libraryID: parentItem?.libraryID,
    title: fileName,
    contentType: "application/pdf",
  });

  attachment.setTags([ATTR_TAG, pdfId]);

  ztoolkit.log(
    `Attachment created (ID: ${attachment.id}) for ${taskData.attachmentFilename} (${mode})`,
  );

  await attachment.saveTx();

  try {
    await IOUtils.remove(tempPath);
    ztoolkit.log(`Removed temporary file: ${tempPath}`);
  } catch (removeError: any) {
    ztoolkit.log(
      `WARNING: Failed to remove temporary file ${tempPath}:`,
      removeError.message || removeError,
    );
  }

  return attachment;
}
