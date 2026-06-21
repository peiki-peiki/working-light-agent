import { app, BrowserWindow, Menu, Tray, nativeImage } from "electron";
import { Store } from "../shared/store";

export function createTray(window: BrowserWindow, store: Store): Tray {
  const image = nativeImage.createEmpty();
  const tray = new Tray(image);
  tray.setToolTip("Code Agent Traffic Light");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "显示窗口",
        click: () => window.show()
      },
      {
        label: "隐藏窗口",
        click: () => window.hide()
      },
      { type: "separator" },
      {
        label: "静音",
        type: "checkbox",
        click: async (menuItem) => {
          await store.setMuted(menuItem.checked);
        }
      },
      { type: "separator" },
      {
        label: "退出",
        click: () => app.quit()
      }
    ])
  );
  return tray;
}
