import { app, BrowserWindow, Menu, Tray, ipcMain, screen } from "electron";
import { AgentId, AgentState, AGENT_STATES, assertAgentId, assertAgentState } from "../shared/state";
import { createStore } from "../shared/store";
import { FLOATING_WINDOW_HEIGHT, createFloatingWindow, resolveFloatingWindowWidth } from "./window";
import { createTray } from "./tray";
import { playAttentionSound, shouldPlayAttentionSound } from "./sound";
import { AgentDetection, detectAgents } from "../shared/detector";

function log(message: string): void {
  console.log(`[agent-light:main] ${message}`);
}

process.on("unhandledRejection", (reason) => {
  console.error("[agent-light:main] unhandled rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[agent-light:main] uncaught exception:", error);
});

const store = createStore();
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pollTimer: NodeJS.Timeout | null = null;
let previousStates: Partial<Record<AgentId, AgentState>> = {};

function broadcastState(state: Awaited<ReturnType<typeof store.readState>>): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("agent-light:state-changed", state);
  }
}

function broadcastDetections(detections: AgentDetection[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("agent-light:detections-changed", detections);
  }
}

function resizeFloatingWindowForDetections(detections: AgentDetection[]): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const visibleAgentCount = detections.filter((detection) => detection.detected).length;
  const nextWidth = resolveFloatingWindowWidth(Math.max(visibleAgentCount, 1));
  const current = mainWindow.getBounds();

  if (current.width === nextWidth && current.height === FLOATING_WINDOW_HEIGHT) {
    return;
  }

  const display = screen.getDisplayMatching(current);
  const right = current.x + current.width;
  const minX = display.workArea.x;
  const maxX = display.workArea.x + display.workArea.width - nextWidth;
  const nextX = Math.min(Math.max(right - nextWidth, minX), maxX);

  mainWindow.setBounds({
    x: nextX,
    y: current.y,
    width: nextWidth,
    height: FLOATING_WINDOW_HEIGHT
  });
}

async function pollState(): Promise<void> {
  const [state, preferences, command] = await Promise.all([store.readState(), store.readPreferences(), store.readCommand()]);
  const detections = detectAgents();

  if (command?.command === "quit") {
    await store.clearCommand();
    app.quit();
    return;
  }

  for (const [agent, status] of Object.entries(state.agents) as [AgentId, { state: AgentState }][]) {
    if (!preferences.muted && shouldPlayAttentionSound(previousStates[agent], status.state)) {
      playAttentionSound(mainWindow, agent, status.state);
    }
    previousStates[agent] = status.state;
  }

  broadcastState(state);
  resizeFloatingWindowForDetections(detections);
  broadcastDetections(detections);
}

function showAgentMenu(agent: AgentId): void {
  assertAgentId(agent);
  const template = AGENT_STATES.map((state) => ({
    label: state,
    click: async () => {
      await store.updateAgentState(agent, state, "menu");
      await pollState();
    }
  }));
  Menu.buildFromTemplate(template).popup({ window: mainWindow ?? undefined });
}

function registerIpc(): void {
  ipcMain.handle("agent-light:get-state", () => store.readState());
  ipcMain.handle("agent-light:get-preferences", () => store.readPreferences());
  ipcMain.handle("agent-light:get-detections", () => detectAgents());
  ipcMain.handle("agent-light:set-muted", async (_event, muted: boolean) => {
    const next = await store.setMuted(Boolean(muted));
    return next;
  });
  ipcMain.handle("agent-light:set-agent-state", async (_event, agent: AgentId, state: AgentState, message?: string) => {
    assertAgentId(agent);
    assertAgentState(state);
    const next = await store.updateAgentState(agent, state, message ?? "ui");
    broadcastState(next);
    return next;
  });
  ipcMain.handle("agent-light:show-agent-menu", (_event, agent: AgentId) => showAgentMenu(agent));
  ipcMain.handle("agent-light:close-window", () => mainWindow?.close());
  ipcMain.handle("agent-light:hide-window", () => mainWindow?.hide());
}

app.whenReady().then(async () => {
  log("Electron app ready");
  registerIpc();
  log("IPC handlers registered");
  mainWindow = createFloatingWindow();
  tray = createTray(mainWindow, store);
  log("tray created");
  mainWindow.on("closed", () => {
    log("floating window closed");
    mainWindow = null;
  });

  await pollState();
  log("initial state loaded");
  pollTimer = setInterval(() => {
    void pollState().catch((error) => console.error(error));
  }, 1000);
  log("state polling started");
}).catch((error) => {
  console.error("[agent-light:main] failed during app startup:", error);
  app.quit();
});

app.on("before-quit", () => {
  log("app before-quit");
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  tray = null;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
