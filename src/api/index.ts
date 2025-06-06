import { request } from "./request";

export function checkAuthKey(params: { apiKey: string }): Promise<boolean> {
  return request({
    url: `/check-key`,
    params,
  });
}

export type UploadUrlResponse = {
  result: {
    objectKey: string;
    preSignedURL: string;
    imgUrl: string;
  };
  id: number;
  exception: string;
  status: string;
  isCanceled: boolean;
  isCompleted: boolean;
  isCompletedSuccessfully: boolean;
  creationOptions: number;
  asyncState: null;
  isFaulted: boolean;
};

export function getPdfUploadUrl(): Promise<UploadUrlResponse> {
  return request({
    url: `/pdf-upload-url`,
    retries: 3,
  });
}

type UploadPdfRequest = {
  uploadUrl: string;
  file: File;
};

export function uploadPdf(data: UploadPdfRequest) {
  return request({
    url: data.uploadUrl,
    method: "PUT",
    body: data.file,
    responseType: "arraybuffer",
    retries: 3,
    headers: {
      "Content-Type": "application/pdf",
    },
  });
}

export function downloadPdf(url: string) {
  return request({
    url,
    method: "GET",
    retries: 3,
    responseType: "arraybuffer",
  });
}

type CreateTranslateTaskRequest = {
  objectKey: string;
  pdfOptions: {
    conversion_formats: {
      html: boolean;
    };
  };
  fileName: string;
  targetLanguage: string;
  requestModel: string;
  enhance_compatibility: boolean;
  turnstileResponse: string;
  OCRWorkaround: boolean;
};

export function createTranslateTask(
  data: CreateTranslateTaskRequest,
): Promise<string> {
  return request({
    url: "/backend-babel-pdf",
    method: "POST",
    body: data,
    retries: 3,
  });
}

type GetTranslatePdfCountRequest = {
  objectKey: string;
};

export function getTranslatePdfCount(
  data: GetTranslatePdfCountRequest,
): Promise<string> {
  return request({
    url: `/pdf-count`,
    body: data,
  });
}

type GetTranslateStatusRequest = {
  pdfId: string;
};

type GetTranslateStatusResponse = {
  overall_progress: number;
  currentStageName: string;
  status: string;
  message: string;
  num_pages: number;
};

export function getTranslateStatus(
  data: GetTranslateStatusRequest,
): Promise<GetTranslateStatusResponse> {
  return request({
    url: `/pdf/${data.pdfId}/process`,
    retries: 10,
  });
}

type GetTranslatePdfResultRequest = {
  pdfId: string;
};

type GetTranslatePdfResultResponse = {
  translationOnlyPdfOssUrl: string;
  translationDualPdfOssUrl: string;
  waterMask: boolean;
  monoFileUrl: string;
};

export function getTranslatePdfResult(
  data: GetTranslatePdfResultRequest,
): Promise<GetTranslatePdfResultResponse> {
  return request({
    url: `/pdf/${data.pdfId}/temp-url`,
    retries: 3,
  });
}

type GetRecordListRequest = {
  page?: number;
  pageSize?: number;
};

type GetRecordListResponse = {
  total: number;
  list: {
    createTime: string;
    fileName: string;
    pdfStatus: string;
    recordId: string;
    pageCount: number;
    consumed: boolean;
    backendStatus: string;
    isWaterMark: boolean;
    sourceLanguage?: string;
    targetLanguage: string;
    errMsg?: string;
    detailStatus?: string;
  }[];
};

export function getRecordList(
  params: GetRecordListRequest,
): Promise<GetRecordListResponse> {
  return request({
    url: `/pdf/record-list`,
    params,
  });
}

export default {
  checkAuthKey,
  getPdfUploadUrl,
  createTranslateTask,
  getTranslatePdfCount,
  getTranslateStatus,
  getTranslatePdfResult,
  getRecordList,
  uploadPdf,
  downloadPdf,
};
