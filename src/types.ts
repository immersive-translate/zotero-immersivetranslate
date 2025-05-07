import { Language } from "./modules/language/types";

export type Status =
  | "uploading"
  | "queued"
  | "translating"
  | "success"
  | "failed"
  | "canceled";

export type Stage = "queued" | "processing" | "success" | "failed";

export type TranslationTaskData = {
  parentItemId?: number;
  parentItemTitle?: string;
  attachmentId: number;
  attachmentFilename: string;
  attachmentPath: string;
  targetLanguage: Language;
  translateModel: string;
  translateMode: string;
  enhanceCompatibility: boolean;
  ocrWorkaround: boolean;
  pdfId?: string;
  status?: Status;
  stage?: string;
  progress?: number;
  error?: string;
  resultAttachmentId?: number;
};
