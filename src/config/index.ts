import { getString } from "../utils/locale";

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
    label: "translateModel-kimi-qwen",
    value: "kimi+qwen",
  },
  {
    label: "translateModel-kimi-deepseek",
    value: "kimi+deepseek",
  },
  {
    label: "translateModel-qwen",
    value: "qwen-1",
  },
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
    value: "glm-paid-1",
  },
  {
    label: "translateModel-OpenAI",
    value: "gpt-1",
  },
  {
    label: "translateModel-Gemini",
    value: "gemini-1",
  },
  {
    label: "translateModel-glm-4-flash",
    value: "glm-free-1",
  },
];

export const translateModels_CN = [
  {
    label: "translateModel-kimi-qwen",
    value: "kimi+qwen",
  },
  {
    label: "translateModel-kimi-deepseek",
    value: "kimi+deepseek",
  },
  {
    label: "translateModel-qwen",
    value: "qwen-1",
  },
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
    value: "glm-paid-1",
  },
  {
    label: "translateModel-glm-4-flash",
    value: "glm-free-1",
  },
];

export const ocrWorkaroundOptions = [
  {
    label: "auto",
    value: "auto",
  },
  {
    label: "ocr_workaround_enable",
    value: "true",
  },
  {
    label: "ocr_workaround_disable",
    value: "false",
  },
];

export const fontFamilyOptions = [
  {
    label: "auto",
    value: "none",
  },
  {
    label: "font_family_serif",
    value: "serif",
  },
  {
    label: "font_family_sans-serif",
    value: "sans-serif",
  },
  {
    label: "font_family_script",
    value: "script",
  },
];

export const dualModeOptions = [
  {
    label: "dual_mode_lort",
    value: "lort",
  },
  {
    label: "dual_mode_ltro",
    value: "ltro",
  },
  {
    label: "dual_mode_uodt",
    value: "uodt",
  },
  {
    label: "dual_mode_utdo",
    value: "utdo",
  },
];

export const layoutModelOptions = [
  {
    label: "layoutModel-version-2",
    value: "version_2",
  },
  {
    label: "layoutModel-version-3",
    value: "version_3",
  },
];

export function getTranslateModelLabel(model: string) {
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

export function getOcrWorkaroundLabel(val: string) {
  const label = ocrWorkaroundOptions.find((v) => v.value === val)?.label;
  if (!label) {
    return "";
  }
  return getString(label);
}

export function getDuaModeLabel(val: string) {
  const label = dualModeOptions.find((v) => v.value === val)?.label;
  if (!label) {
    return "";
  }
  return getString(label);
}

export function getLayoutModelLabel(val: string) {
  const label = layoutModelOptions.find((v) => v.value === val)?.label;
  if (!label) {
    return "";
  }
  return getString(label);
}

export function getFontFamilyLabel(val: string) {
  const label = fontFamilyOptions.find((v) => v.value === val)?.label;
  if (!label) {
    return "";
  }
  return getString(label);
}
