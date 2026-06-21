import { BrowserWindow } from "electron";
import { AgentId, AgentState } from "../shared/state";

export function shouldPlayAttentionSound(previous: AgentState | undefined, next: AgentState): boolean {
  return previous !== next && (next === "working" || next === "done" || next === "waiting" || next === "error");
}

export function playAttentionSound(window: BrowserWindow | null, agent: AgentId, state: AgentState): void {
  if (!window || window.isDestroyed()) {
    return;
  }
  window.webContents.send("agent-light:play-sound", { agent, state });
}
