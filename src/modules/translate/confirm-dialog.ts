import { translateModels, translateModes } from "../../config";
import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";
import { getLanguageOptions } from "../language";
import { Language } from "../language/types";

export async function showConfirmationDialog(): Promise<{
  action: "confirm" | "cancel";
  data?: {
    targetLanguage: Language;
    translateMode: string;
    translateModel: string;
    enhanceCompatibility: boolean;
    ocrWorkaround: boolean;
  };
}> {
  const dialogData: { [key: string | number]: any } = {
    targetLanguage: getPref("targetLanguage"),
    translateMode: getPref("translateMode"),
    translateModel: getPref("translateModel"),
    enhanceCompatibility: getPref("enhanceCompatibility"),
    ocrWorkaround: getPref("ocrWorkaround"),
  };
  const dialogHelper = new ztoolkit.Dialog(11, 4)
    .addCell(0, 0, {
      tag: "h2",
      properties: {
        innerHTML: getString("confirm-options"),
      },
      styles: {
        width: "300px",
      },
    })
    .addCell(1, 0, {
      tag: "label",
      namespace: "html",
      properties: {
        innerHTML: getString("confirm-target-language"),
      },
      styles: {
        width: "200px",
      },
    })
    .addCell(
      2,
      0,
      {
        tag: "select",
        id: "targetLanguage",
        attributes: {
          "data-bind": "targetLanguage",
          "data-prop": "value",
        },
        children: getLanguageOptions().map(
          (lang: { value: string; label: string }) => ({
            tag: "option",
            properties: {
              value: lang.value,
              innerHTML: lang.label,
            },
          }),
        ),
        styles: {
          width: "200px",
          height: "30px",
          margin: "3px 0",
        },
      },
      false,
    )
    .addCell(3, 0, {
      tag: "label",
      namespace: "html",
      properties: {
        innerHTML: getString("confirm-translate-mode"),
      },
      styles: {
        width: "200px",
      },
    })
    .addCell(
      4,
      0,
      {
        tag: "select",
        id: "translateMode",
        attributes: {
          "data-bind": "translateMode",
          "data-prop": "value",
        },
        children: translateModes.map(
          (mode: { value: string; label: string }) => ({
            tag: "option",
            properties: {
              value: mode.value,
              innerHTML: getString(mode.label),
            },
          }),
        ),
        styles: {
          width: "200px",
          height: "30px",
          margin: "3px 0",
        },
      },
      false,
    )
    .addCell(5, 0, {
      tag: "label",
      namespace: "html",
      properties: {
        innerHTML: getString("confirm-translate-model"),
      },
      styles: {
        width: "200px",
      },
    })
    .addCell(
      6,
      0,
      {
        tag: "select",
        id: "translateModel",
        attributes: {
          "data-bind": "translateModel",
          "data-prop": "value",
        },
        children: translateModels.map(
          (model: { value: string; label: string }) => ({
            tag: "option",
            properties: {
              value: model.value,
              innerHTML: getString(model.label),
            },
          }),
        ),
        styles: {
          width: "200px",
          height: "30px",
          margin: "3px 0",
        },
      },
      false,
    )
    .addCell(
      7,
      0,
      {
        tag: "input",
        namespace: "html",
        id: "enhanceCompatibility",
        attributes: {
          "data-bind": "enhanceCompatibility",
          "data-prop": "checked",
          type: "checkbox",
        },
        properties: { label: getString("confirm-enable-compatibility") },
      },
      false,
    )
    .addCell(7, 1, {
      tag: "label",
      namespace: "html",
      attributes: {
        for: "enhanceCompatibility",
      },
      properties: { innerHTML: getString("confirm-enable-compatibility") },
      styles: {
        width: "200px",
      },
    })
    .addCell(8, 0, {
      tag: "p",
      namespace: "html",
      properties: {
        innerHTML: getString("confirm-enable-compatibility-description"),
      },
      styles: {
        width: "400px",
      },
    })
    .addCell(
      9,
      0,
      {
        tag: "input",
        namespace: "html",
        id: "ocrWorkaround",
        attributes: {
          "data-bind": "ocrWorkaround",
          "data-prop": "checked",
          type: "checkbox",
        },
        properties: { label: getString("confirm-enable-ocr-workaround") },
      },
      false,
    )
    .addCell(9, 1, {
      tag: "label",
      namespace: "html",
      attributes: {
        for: "ocrWorkaround",
      },
      properties: { innerHTML: getString("confirm-enable-ocr-workaround") },
      styles: {
        width: "200px",
      },
    })
    .addCell(10, 0, {
      tag: "p",
      namespace: "html",
      properties: {
        innerHTML: getString("confirm-enable-ocr-workaround-description"),
      },
      styles: {
        width: "400px",
      },
    })
    .addButton(getString("confirm-yes"), "confirm")
    .addButton(getString("confirm-cancel"), "cancel")
    .setDialogData(dialogData)
    .open(getString("confirm-title"));

  addon.data.dialog = dialogHelper;
  await dialogData.unloadLock.promise;
  addon.data.dialog = undefined;
  if (addon.data.alive) {
    if (dialogData._lastButtonId === "confirm") {
      setPref("targetLanguage", dialogData.targetLanguage);
      setPref("translateMode", dialogData.translateMode);
      setPref("translateModel", dialogData.translateModel);
      setPref("enhanceCompatibility", dialogData.enhanceCompatibility);
      setPref("ocrWorkaround", dialogData.ocrWorkaround);
      return {
        action: "confirm",
        data: dialogData as {
          targetLanguage: Language;
          translateMode: string;
          translateModel: string;
          enhanceCompatibility: boolean;
          ocrWorkaround: boolean;
        },
      };
    } else {
      return {
        action: "cancel",
      };
    }
  }
  return {
    action: "cancel",
  };
}
