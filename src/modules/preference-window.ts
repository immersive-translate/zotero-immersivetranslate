import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import { showDialog } from "../utils/dialog";
import { getLanguages, nativeLangMap } from "./language";
import { translateModes, translateModels } from "../config";

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
            const nativeLang = nativeLangMap[lang];
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
          children: translateModels.map((item) => {
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
          },
        },
      ],
    },
    doc.querySelector(`#${config.addonRef}-translate-model-placeholder`)!,
  );
}

function bindPrefEvents() {
  addon.data
    .prefs!.window.document?.querySelector(
      `#zotero-prefpane-${config.addonRef}-authkey`,
    )
    ?.addEventListener("change", (e: Event) => {
      ztoolkit.log(e);
      setPref("authkey", (e.target as HTMLInputElement).value);
    });

  addon.data
    .prefs!.window.document?.querySelector(
      `#zotero-prefpane-${config.addonRef}-test-button`,
    )
    ?.addEventListener("command", async (e: Event) => {
      try {
        const url = await addon.api.getPdfUploadUrl();
        showDialog({
          title: getString("pref-test-success"),
        });
      } catch (error) {
        ztoolkit.log(error);
        showDialog({
          title: getString("pref-test-failed"),
          message: getString("pref-test-failed-description"),
        });
      }
    });
}
