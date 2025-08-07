import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";

export const translateModes = [
  {
    label: "translateMode-all",
    value: "all",
  },
  {
    label: "translateMode-dua",
    value: "dual",
  },
  {
    label: "translateMode-translation",
    value: "translation",
  },
];

export const translateModels = [
  {
    label: "translateModel-deepseek",
    value: "deepseek",
  },
  {
    label: "translateModel-doubao",
    value: "doubao",
  },
  {
    label: "translateModel-glm-4-plus",
    value: "glm-4-plus",
  },
  {
    label: "translateModel-OpenAI",
    value: "gpt-4.1-mini-2025-04-14",
  },
  {
    label: "translateModel-Gemini",
    value: "gemini-2.0-flash-001",
  },
  {
    label: "translateModel-glm-4-flash",
    value: "glm-4-flash",
  },
];

export const CUSTOM_MODEL_VALUE = "custom-api";

export function getAvailableTranslateModels() {
  const models = [...translateModels];
  
  if (getPref("useCustomAPI")) {
    models.push({
      label: "translateModel-custom",
      value: CUSTOM_MODEL_VALUE,
    });
  }
  
  return models;
}

export function getTranslateModelLabel(model: string) {
  if (model === CUSTOM_MODEL_VALUE) {
    const customName = getPref("customModelName");
    return customName || getString("translateModel-custom");
  }
  
  const label = translateModels.find((m) => m.value === model)?.label;
  if (!label) {
    return "";
  }
  return getString(label);
}

export function getTranslateModeLabel(mode: string) {
  const label = translateModes.find((m) => m.value === mode)?.label;
  if (!label) {
    return "";
  }
  return getString(label);
}
