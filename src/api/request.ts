import { getPref } from "../utils/prefs";
import {
  BASE_URL_TEST,
  BASE_URL,
  BASE_URL_TEST_CN,
  BASE_URL_CN,
} from "../utils/const";
import { checkIsCN } from "../utils/cn";

function getBaseUrl() {
  const isCN = checkIsCN();
  const isDev = addon.data.env === "development";
  if (isDev) {
    return isCN ? BASE_URL_TEST_CN : BASE_URL_TEST;
  } else {
    return isCN ? BASE_URL_CN : BASE_URL;
  }
}

export async function request({
  url,
  method = "GET",
  body = null,
  params = {},
  headers = {},
  responseType = "json",
  fullFillOnError = false,
  retries = 0,
  retryDelay = 1000,
}: {
  url: string;
  method?: string;
  body?: any;
  params?: any;
  headers?: any;
  responseType?: "json" | "text" | "blob" | "arraybuffer";
  fullFillOnError?: boolean | number[];
  retries?: number;
  retryDelay?: number;
}) {
  let retryCount = 0;
  let lastError: any;

  // Helper function to parse response based on responseType
  async function parseResponse(
    response: Response,
    type: "json" | "text" | "blob" | "arraybuffer" = "json",
  ) {
    try {
      let data: any;
      if (type === "json") {
        data = await response.json();
      } else if (type === "text") {
        data = await response.text();
      } else if (type === "blob") {
        data = await response.blob();
      } else if (type === "arraybuffer") {
        data = await response.arrayBuffer();
      }
      return { success: true, data };
    } catch (error: any) {
      return {
        success: false,
        error: new Error(
          `Failed to parse response as ${type}: ${error.message}`,
        ),
      };
    }
  }

  // Helper function to extract error message from response data
  function extractErrorMessage(data: any): string {
    if (!data || typeof data !== "object") {
      return "Unknown error";
    }

    if ("message" in data) {
      return String(data.message);
    } else if ("error" in data) {
      return String(data.error);
    } else if ("code" in data) {
      return `Error code: ${data.code}`;
    }

    return "Unknown error";
  }

  while (retryCount <= retries) {
    try {
      const URL = getBaseUrl();
      const isCustomUrl = url.startsWith("http");
      const queryParams = new URLSearchParams(params);

      // For GET requests, always append params to URL. For other methods, only if not custom URL
      let _url;
      if (method === "GET" || !isCustomUrl) {
        _url = isCustomUrl
          ? `${url}${params && Object.keys(params).length > 0 ? `?${queryParams.toString()}` : ""}`
          : `${URL}${url}?${queryParams.toString()}`;
      } else {
        _url = isCustomUrl ? url : `${URL}${url}`;
      }

      const requestOptions = {
        method,
        headers: {
          ...(isCustomUrl
            ? {}
            : {
                Authorization: `Bearer ${getPref("authkey")}`,
                "Content-Type": "application/json",
              }),
          ...headers,
        },
        ...(method !== "GET" &&
          method !== "HEAD" && {
            body: isCustomUrl ? body : JSON.stringify(body, null, 2),
          }),
      };

      const response = await fetch(_url, requestOptions);

      if (!response.ok) {
        const errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
        lastError = new Error(errorMessage);

        // Try to parse response body for more detailed error information
        const parseResult = await parseResponse(response);
        if (parseResult.success && parseResult.data) {
          const errorData = parseResult.data;
          if (typeof errorData === "object" && errorData !== null) {
            if ("code" in errorData && errorData.code !== 0) {
              lastError = new Error(extractErrorMessage(errorData));
            }
          }
        }

        // Don't retry for client-side errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          if (fullFillOnError) {
            return {
              error: lastError,
              status: response.status,
              data: parseResult.data,
            };
          }
          throw lastError;
        }

        // For server errors, attempt retry if we have retries left
        if (retryCount < retries) {
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        } else {
          if (fullFillOnError) {
            return { error: lastError, status: response.status };
          }
          throw lastError;
        }
      }

      // Process response based on responseType
      const parseResult = await parseResponse(response, responseType);
      if (!parseResult.success) {
        lastError = parseResult.error;
        if (fullFillOnError) {
          return { error: lastError };
        }
        throw lastError;
      }

      const data = parseResult.data;
      if (responseType === "arraybuffer") {
        return data;
      }

      ztoolkit.log("===========", data);

      // Handle the case with data.code
      if (data && typeof data === "object" && data !== null) {
        // Case: response has code property
        if ("code" in data) {
          if (data.code === 0) {
            return "data" in data ? data.data : data;
          } else {
            // Case: code is not equal to 0
            lastError = new Error(extractErrorMessage(data));

            if (fullFillOnError) {
              return data;
            }

            // Try to retry for server errors
            if (retryCount < retries) {
              retryCount++;
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
              continue;
            } else {
              throw lastError;
            }
          }
        }
        // Case: no code property but has data
        return data;
      }

      // Case: successful response with no structured data
      return data;
    } catch (error: any) {
      lastError = error;

      if (retryCount < retries) {
        retryCount++;
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      if (fullFillOnError) {
        return { error: lastError };
      }

      handleError(lastError);
      throw lastError; // Explicitly throw to outer layer
    }
  }

  // This should never happen but just in case
  if (lastError) {
    throw lastError;
  }

  return null;
}

export function handleError(error: any) {
  new ztoolkit.ProgressWindow(addon.data.config.addonName)
    .createLine({
      text: `${error}`,
      type: "error",
    })
    .show();
}
