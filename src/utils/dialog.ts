import { getString } from "./locale";

export function showDialog({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  new ztoolkit.Dialog(3, 4)
    .addCell(0, 0, {
      tag: "h2",
      properties: {
        innerHTML: title,
      },
      styles: {
        width: "300px",
      },
    })
    .addCell(1, 0, {
      tag: "label",
      namespace: "html",
      properties: {
        innerHTML: message,
      },
      styles: {
        width: "300px",
      },
    })
    .addButton(getString("confirm-yes"), "confirm")
    .open(title);
}

export async function showConfirmDialog({
  title,
  message,
  linkText,
  linkUrl,
}: {
  title: string;
  message?: string;
  linkText?: string;
  linkUrl?: string;
}): Promise<boolean> {
  const dialogData: { [key: string | number]: any } = {};

  // 构建消息内容，如果有链接则添加链接
  const fullMessage =
    message +
    (linkText && linkUrl
      ? `\n\n<a href="#" id="dialog-link">${linkText}</a>`
      : "");

  const dialogHelper = new ztoolkit.Dialog(3, 4)
    .addCell(0, 0, {
      tag: "h2",
      properties: {
        innerHTML: title,
      },
      styles: {
        width: linkText && linkUrl ? "350px" : "300px",
      },
    })
    .addCell(1, 0, {
      tag: linkText && linkUrl ? "div" : "label",
      namespace: "html",
      properties: {
        innerHTML: fullMessage,
      },
      styles: {
        width: linkText && linkUrl ? "350px" : "300px",
        marginBottom: linkText && linkUrl ? "10px" : "0",
      },
    })
    .addButton(getString("confirm-yes"), "confirm")
    .addButton(getString("confirm-cancel"), "cancel")
    .setDialogData(dialogData)
    .open(title);

  // 添加链接点击事件
  if (linkText && linkUrl) {
    setTimeout(() => {
      const linkElement =
        dialogHelper.window.document?.getElementById("dialog-link");
      if (linkElement) {
        linkElement.addEventListener("click", (e: Event) => {
          e.preventDefault();
          Zotero.launchURL(linkUrl);
        });
      }
    }, 100);
  }

  addon.data.dialog = dialogHelper;
  await dialogData.unloadLock.promise;
  addon.data.dialog = undefined;

  return addon.data.alive && dialogData._lastButtonId === "confirm";
}
