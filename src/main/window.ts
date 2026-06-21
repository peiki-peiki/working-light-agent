import path from "node:path";
import { BrowserWindow, screen } from "electron";

export const FLOATING_WINDOW_HEIGHT = 68;
export const SINGLE_AGENT_WINDOW_WIDTH = 202;
export const DOUBLE_AGENT_WINDOW_WIDTH = 292;

function log(message: string): void {
  console.log(`[agent-light:main] ${message}`);
}

export function resolveFloatingWindowWidth(visibleAgentCount: number): number {
  return visibleAgentCount >= 2 ? DOUBLE_AGENT_WINDOW_WIDTH : SINGLE_AGENT_WINDOW_WIDTH;
}

function resolveWindowBounds(): { width: number; height: number; x: number; y: number } {
  const display = screen.getPrimaryDisplay();
  const width = resolveFloatingWindowWidth(2);
  const height = FLOATING_WINDOW_HEIGHT;
  const padding = 24;
  const targetX = Math.round(display.workArea.x + display.workArea.width - width - padding);
  const targetY = Math.round(display.workArea.y + 96);
  const minX = display.workArea.x;
  const maxX = display.workArea.x + display.workArea.width - width;
  const minY = display.workArea.y;
  const maxY = display.workArea.y + display.workArea.height - height;

  if (targetX < minX || targetX > maxX || targetY < minY || targetY > maxY) {
    return {
      width,
      height,
      x: Math.round(display.workArea.x + (display.workArea.width - width) / 2),
      y: Math.round(display.workArea.y + (display.workArea.height - height) / 2)
    };
  }

  return {
    width,
    height,
    x: targetX,
    y: targetY
  };
}

export function createFloatingWindow(): BrowserWindow {
  const bounds = resolveWindowBounds();
  log(`creating floating window at ${JSON.stringify(bounds)}`);

  const window = new BrowserWindow({
    ...bounds,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    skipTaskbar: false,
    title: "Code Agent Traffic Light",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.setAlwaysOnTop(true, "floating");
  if (process.platform === "darwin") {
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  window.once("ready-to-show", () => {
    window.show();
    window.focus();
    window.moveTop();
    window.setAlwaysOnTop(true, "floating");
    log(`floating window shown with bounds ${JSON.stringify(window.getBounds())}`);
  });

  window.webContents.on("did-finish-load", () => {
    log(`renderer loaded: ${window.webContents.getURL()}`);
  });

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[agent-light:main] renderer failed to load ${validatedURL}: ${errorCode} ${errorDescription}`);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    log(`loading dev renderer: ${process.env.VITE_DEV_SERVER_URL}`);
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const filePath = path.join(__dirname, "../renderer/index.html");
    log(`loading packaged renderer: ${filePath}`);
    void window.loadFile(filePath);
  }

  return window;
}
