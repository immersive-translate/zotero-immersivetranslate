import { getString, initLocale } from "./utils/locale";
import {
  registerPrefs,
  registerPrefsScripts,
} from "./modules/preference-window";
import { registerShortcuts } from "./modules/shortcuts";
import { createZToolkit } from "./utils/ztoolkit";
import { registerMenu, registerWindowMenu } from "./modules/menu";
import { registerToolbar } from "./modules/toolbar";
import { registerNotifier } from "./modules/notify";
import {
  addTasksToQueue,
  startQueueProcessing,
} from "./modules/translate/task";
import {
  loadSavedTranslationData,
  restoreUnfinishedTasks,
  saveTranslationData,
} from "./modules/translate/persistence";
import { showTaskManager } from "./modules/translate/task-manager";
import { initTasks } from "./modules/translate/store";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  registerPrefs();

  registerNotifier(["item", "file"]);

  registerShortcuts();

  initTasks();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  // 加载保存的翻译任务和队列数据
  loadSavedTranslationData();

  // 恢复未完成的翻译任务
  const restoredCount = restoreUnfinishedTasks();
  if (restoredCount > 0) {
    ztoolkit.log(`已恢复${restoredCount}个未完成的翻译任务，准备重新处理`);

    // 启动处理队列
    startQueueProcessing();
  }
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  // @ts-ignore This is a moz feature
  win.MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-mainWindow.ftl`,
  );

  const popupWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: true,
    closeTime: -1,
  })
    .createLine({
      text: getString("startup-begin"),
      type: "default",
      progress: 0,
    })
    .show();

  await Zotero.Promise.delay(1000);
  popupWin.changeLine({
    progress: 30,
    text: `[30%] ${getString("startup-begin")}`,
  });

  registerMenu();

  registerWindowMenu();

  registerToolbar();

  await Zotero.Promise.delay(1000);

  popupWin.changeLine({
    progress: 100,
    text: `[100%] ${getString("startup-finish")}`,
  });
  popupWin.startCloseTimer(5000);
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
  ztoolkit.Menu.unregisterAll();
}

function onShutdown(): void {
  // 关闭前保存翻译数据
  saveTranslationData();
  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  // @ts-ignore - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this function clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  ztoolkit.log("notify", event, type, ids, extraData);
  // TODO: add your code here
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this function clear.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

function onShortcuts(type: string) {}

function onTranslate() {
  addTasksToQueue();
}

function onViewTranslationTasks() {
  showTaskManager();
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onShortcuts,
  onTranslate,
  onViewTranslationTasks,
};
