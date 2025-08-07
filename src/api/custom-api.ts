import { getPref } from "../utils/prefs";
import { CUSTOM_MODEL_VALUE } from "../config";

export interface CustomAPITranslateRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface CustomAPITranslateResponse {
  translatedText: string;
  sourceLanguage?: string;
}

export async function translateWithCustomAPI(
  request: CustomAPITranslateRequest,
): Promise<CustomAPITranslateResponse> {
  const endpoint = getPref("customAPIEndpoint");
  const apiKey = getPref("customAPIKey");
  const modelName = getPref("customModelName");

  if (!endpoint || !apiKey) {
    throw new Error("Custom API endpoint and API key are required");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following text from ${request.sourceLanguage || "auto-detect"} to ${request.targetLanguage}. Only return the translated text, no explanations.`,
        },
        {
          role: "user",
          content: request.text,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Custom API request failed: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();
  
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return {
      translatedText: data.choices[0].message.content,
      sourceLanguage: request.sourceLanguage,
    };
  }

  throw new Error("Invalid response format from custom API");
}

export function isCustomAPIModel(model: string): boolean {
  return model === CUSTOM_MODEL_VALUE;
}

export function validateCustomAPIConfig(): string | null {
  const useCustomAPI = getPref("useCustomAPI");
  
  if (!useCustomAPI) {
    return null;
  }

  const endpoint = getPref("customAPIEndpoint");
  const apiKey = getPref("customAPIKey");
  const modelName = getPref("customModelName");

  if (!endpoint) {
    return "Custom API endpoint is required";
  }

  if (!apiKey) {
    return "Custom API key is required";
  }

  if (!modelName) {
    return "Custom model name is required";
  }

  try {
    new URL(endpoint);
  } catch {
    return "Invalid API endpoint URL";
  }

  return null;
}