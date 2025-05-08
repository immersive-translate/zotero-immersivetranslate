import { getPref } from "../utils/prefs";

const BASE_URL_TEST = "https://test-api2.immersivetranslate.com/zotero";
const BASE_URL = "https://api2.immersivetranslate.com/zotero";

export async function request({
  url,
  method = "GET",
  body = null,
  params = {},
  headers = {},
  responseType = "json",
}: {
  url: string;
  method?: string;
  body?: any;
  params?: any;
  headers?: any;
  responseType?: "json" | "text" | "blob" | "arraybuffer";
}) {
  try {
    const URL = addon.data.env === "development" ? BASE_URL_TEST : BASE_URL;
    const isCustomUrl = url.startsWith("http");
    const queryParams = new URLSearchParams(params);
    const urlWithParams = `${URL}${url}?${queryParams.toString()}`;
    const _url = isCustomUrl ? url : urlWithParams;
    const res = await Zotero.HTTP.request(method, _url, {
      headers: {
        ...(isCustomUrl
          ? {}
          : {
              Authorization: `Bearer ${getPref("authkey")}`,
              "Content-Type": "application/json",
            }),
        ...headers,
      },
      body: isCustomUrl ? body : JSON.stringify(body, null, 2),
      responseType,
    });
    if (responseType === "arraybuffer") {
      return res.response;
    }
    if (res.response) {
      if (res.response.code === 0) {
        return res.response.data;
      } else {
        handleError(new Error(res.response.message || res.response.error));
      }
    }
    return res.response;
  } catch (error: any) {
    if (error?.xmlhttp?.response) {
      handleError(new Error(error.xmlhttp.response.error));
    } else {
      handleError(error);
    }
  }
}

export function handleError(error: any) {
  new ztoolkit.ProgressWindow(addon.data.config.addonName)
    .createLine({
      text: `${error}`,
      type: "error",
    })
    .show();
  throw error;
}
