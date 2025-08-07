import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import { showDialog } from "../utils/dialog";
import { getLanguages, getLanguageName } from "./language";
import { translateModes, getAvailableTranslateModels, CUSTOM_MODEL_VALUE } from "../config";
import { validateCustomAPIConfig } from "../api/custom-api";
import type { Language } from "./language/types";

export function registerPrefs() {
  Zotero.PreferencePanes.register({
    pluginID: addon.data.config.addonID,
    src: rootURI + "content/preferences.xhtml",
    label: getString("prefs-title"),
    image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.png`,
  });
}

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/content/preferences.xhtml onpaneload
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
    };
  } else {
    addon.data.prefs.window = _window;
  }
  buildPrefsPane();
  bindPrefEvents();
}

function buildPrefsPane() {
  const doc = addon.data.prefs?.window?.document;
  if (!doc) {
    return;
  }
  ztoolkit.UI.replaceElement(
    {
      tag: "menulist",
      id: `${config.addonRef}-target-language`,
      attributes: {
        value: getPref("targetLanguage") as string,
        native: "true",
      },
      styles: {
        maxWidth: "250px",
      },
      children: [
        {
          tag: "menupopup",
          children: getLanguages().map((lang) => {
            const nativeLang = getLanguageName(lang, Zotero.locale as Language);
            return {
              tag: "menuitem",
              attributes: {
                label: nativeLang,
                value: lang,
              },
            };
          }),
        },
      ],
      listeners: [
        {
          type: "command",
          listener: (e: Event) => {
            ztoolkit.log(e);
            setPref("targetLanguage", (e.target as XUL.MenuList).value);
          },
        },
      ],
    },
    doc.querySelector(`#${config.addonRef}-target-language-placeholder`)!,
  );

  ztoolkit.UI.replaceElement(
    {
      tag: "menulist",
      id: `${config.addonRef}-translate-mode`,
      attributes: {
        value: getPref("translateMode") as string,
        native: "true",
      },
      styles: {
        maxWidth: "250px",
      },
      children: [
        {
          tag: "menupopup",
          children: translateModes.map((item) => {
            return {
              tag: "menuitem",
              attributes: {
                label: getString(item.label),
                value: item.value,
              },
            };
          }),
        },
      ],
      listeners: [
        {
          type: "command",
          listener: (e: Event) => {
            ztoolkit.log(e);
            setPref("translateMode", (e.target as XUL.MenuList).value);
          },
        },
      ],
    },
    doc.querySelector(`#${config.addonRef}-translate-mode-placeholder`)!,
  );

  ztoolkit.UI.replaceElement(
    {
      tag: "menulist",
      id: `${config.addonRef}-translate-model`,
      attributes: {
        value: getPref("translateModel") as string,
        native: "true",
      },
      styles: {
        maxWidth: "250px",
      },
      children: [
        {
          tag: "menupopup",
          children: getAvailableTranslateModels().map((item) => {
            return {
              tag: "menuitem",
              attributes: {
                label: getString(item.label),
                value: item.value,
              },
            };
          }),
        },
      ],
      listeners: [
        {
          type: "command",
          listener: (e: Event) => {
            ztoolkit.log(e);
            setPref("translateModel", (e.target as XUL.MenuList).value);
            
            // No need to show/hide anything here since model depends on useCustomAPI pref
          },
        },
      ],
    },
    doc.querySelector(`#${config.addonRef}-translate-model-placeholder`)!,
  );
}

function bindPrefEvents() {
  const doc = addon.data.prefs?.window?.document;
  if (!doc) return;

  // Existing auth key events
  doc.querySelector(`#zotero-prefpane-${config.addonRef}-authkey`)
    ?.addEventListener("change", (e: Event) => {
      ztoolkit.log(e);
      setPref("authkey", (e.target as HTMLInputElement).value);
    });

  doc.querySelector(`#zotero-prefpane-${config.addonRef}-test-button`)
    ?.addEventListener("command", async (e: Event) => {
      try {
        const result = await addon.api.checkAuthKey({
          apiKey: getPref("authkey"),
        });
        if (result) {
          showDialog({
            title: getString("pref-test-success"),
          });
        } else {
          showDialog({
            title: getString("pref-test-failed"),
            message: getString("pref-test-failed-description"),
          });
        }
      } catch (error) {
        ztoolkit.log(error);
        showDialog({
          title: getString("pref-test-failed"),
          message: getString("pref-test-failed-description"),
        });
      }
    });

  // Custom API events
  doc.querySelector(`#zotero-prefpane-${config.addonRef}-use-custom-api`)
    ?.addEventListener("command", (e: Event) => {
      setPref("useCustomAPI", (e.target as HTMLInputElement).checked);
      
      // Show/hide custom API details
      const customApiDetails = doc.querySelector(`#${config.addonRef}-custom-api-details`);
      if (customApiDetails) {
        if ((e.target as HTMLInputElement).checked) {
          (customApiDetails as any).style.display = "block";
        } else {
          (customApiDetails as any).style.display = "none";
        }
      }
      
      // Rebuild preferences to update available models
      buildPrefsPane();
    });

  doc.querySelector(`#zotero-prefpane-${config.addonRef}-custom-api-endpoint`)
    ?.addEventListener("change", (e: Event) => {
      setPref("customAPIEndpoint", (e.target as HTMLInputElement).value);
    });

  doc.querySelector(`#zotero-prefpane-${config.addonRef}-custom-api-key`)
    ?.addEventListener("change", (e: Event) => {
      setPref("customAPIKey", (e.target as HTMLInputElement).value);
    });

  doc.querySelector(`#zotero-prefpane-${config.addonRef}-custom-model-name`)
    ?.addEventListener("change", (e: Event) => {
      setPref("customModelName", (e.target as HTMLInputElement).value);
    });

  doc.querySelector(`#zotero-prefpane-${config.addonRef}-test-custom-api-button`)
    ?.addEventListener("command", async (e: Event) => {
      const validationError = validateCustomAPIConfig();
      if (validationError) {
        showDialog({
          title: getString("pref-test-failed"),
          message: validationError,
        });
        return;
      }

      try {
        // Test the custom API with a simple translation
        const { translateWithCustomAPI } = await import("../api/custom-api");
        await translateWithCustomAPI({
          text: "Hello",
          targetLanguage: "zh-CN",
          sourceLanguage: "en",
        });
        
        showDialog({
          title: getString("pref-test-success"),
          message: "Custom API connection successful!",
        });
      } catch (error: any) {
        ztoolkit.log(error);
        showDialog({
          title: getString("pref-test-failed"),
          message: error.message || "Custom API test failed",
        });
      }
    });

  // Initially show/hide custom API details based on current useCustomAPI setting
  const customApiDetails = doc.querySelector(`#${config.addonRef}-custom-api-details`);
  if (customApiDetails) {
    if (getPref("useCustomAPI")) {
      (customApiDetails as any).style.display = "block";
    } else {
      (customApiDetails as any).style.display = "none";
    }
  }
}
