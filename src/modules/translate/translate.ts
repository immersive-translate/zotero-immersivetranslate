import type { TranslationTaskData } from "../../types";
import { updateTaskInList } from "./task-manager";
import { TranslationTaskMonitor } from "./task-monitor";

export async function translatePDF(
  taskData: TranslationTaskData,
  parentItem?: Zotero.Item,
): Promise<void> {
  // Update task status in taskList
  updateTaskInList(taskData.attachmentId, {
    status: "uploading",
    stage: "uploading",
    progress: 0,
  });

  // --- Upload ---
  const uploadInfo = await uploadAttachmentFile(
    taskData.attachmentPath,
    taskData.attachmentFilename,
  ); // Wait for upload
  if (!uploadInfo) {
    throw new Error(`Upload failed for ${taskData.attachmentFilename}`);
  }
  ztoolkit.log(`Upload successful for: ${taskData.attachmentFilename}`);

  // --- Create Task ---
  const pdfId = await addon.api.createTranslateTask({
    objectKey: uploadInfo.result.objectKey,
    pdfOptions: { conversion_formats: { html: true } },
    fileName: taskData.attachmentFilename,
    targetLanguage: taskData.targetLanguage,
    requestModel: taskData.translateModel,
    enhance_compatibility: taskData.enhanceCompatibility,
    turnstileResponse: "",
    OCRWorkaround: taskData.ocrWorkaround,
  });

  ztoolkit.log(
    `Translation task created for ${taskData.attachmentFilename}. PDF ID: ${pdfId}`,
  );
  // Update taskData with pdfId for the monitoring task
  updateTaskInList(taskData.attachmentId, {
    status: "translating",
    stage: "queued",
    progress: 0,
    pdfId: pdfId,
  });

  // Add task to centralized monitor instead of launching a separate monitoring process
  TranslationTaskMonitor.addTask(pdfId, taskData, parentItem);

  ztoolkit.log(
    `Task added to background monitor: ${pdfId} (${taskData.attachmentFilename}).`,
  );
}

// Renamed and refactored to upload a single file
async function uploadAttachmentFile(
  attachmentPath: string,
  attachmentFilename: string,
): Promise<any> {
  // Returns single upload info or throws error
  ztoolkit.log(`Uploading attachment: ${attachmentFilename}`);

  try {
    const uploadInfo = await addon.api.getPdfUploadUrl();
    if (!attachmentPath)
      throw new Error(
        `File path is missing for attachment ${attachmentFilename}`,
      );
    const fileContents = await IOUtils.read(attachmentPath); // Read the specific path
    if (!fileContents)
      throw new Error(`Failed to read file contents for ${attachmentFilename}`);

    if (typeof File === "undefined") {
      throw new Error("File constructor not available in this environment.");
    }
    const file = new File([fileContents], attachmentFilename, {
      type: "application/pdf",
    });

    await addon.api.uploadPdf({
      uploadUrl: uploadInfo.result.preSignedURL,
      file,
    });
    ztoolkit.log(`Successfully uploaded ${attachmentFilename}`);
    return uploadInfo; // Return the info for the uploaded file
  } catch (error: any) {
    ztoolkit.log(
      `ERROR: Upload failed for ${attachmentFilename}:`,
      error.message || error,
    );
    throw error; // Re-throw to be caught by handleSingleItemTranslation -> processNextItem
  }
}
