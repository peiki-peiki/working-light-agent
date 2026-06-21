import { contextBridge, ipcRenderer } from "electron";
import type { AgentDetection } from "../shared/detector";
import type { AgentId, AgentState, AppState } from "../shared/state";

contextBridge.exposeInMainWorld("agentLight", {
  getState: () => ipcRenderer.invoke("agent-light:get-state"),
  getPreferences: () => ipcRenderer.invoke("agent-light:get-preferences"),
  getDetections: () => ipcRenderer.invoke("agent-light:get-detections"),
  setAgentState: (agent: AgentId, state: AgentState, message?: string) =>
    ipcRenderer.invoke("agent-light:set-agent-state", agent, state, message),
  setMuted: (muted: boolean) => ipcRenderer.invoke("agent-light:set-muted", muted),
  showAgentMenu: (agent: AgentId) => ipcRenderer.invoke("agent-light:show-agent-menu", agent),
  closeWindow: () => ipcRenderer.invoke("agent-light:close-window"),
  hideWindow: () => ipcRenderer.invoke("agent-light:hide-window"),
  onStateChanged: (listener: (state: AppState) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, state: AppState) => listener(state);
    ipcRenderer.on("agent-light:state-changed", wrapped);
    return () => ipcRenderer.off("agent-light:state-changed", wrapped);
  },
  onDetectionsChanged: (listener: (detections: AgentDetection[]) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, detections: AgentDetection[]) => listener(detections);
    ipcRenderer.on("agent-light:detections-changed", wrapped);
    return () => ipcRenderer.off("agent-light:detections-changed", wrapped);
  },
  onPlaySound: (listener: (payload: { agent: AgentId; state: AgentState }) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: { agent: AgentId; state: AgentState }) => listener(payload);
    ipcRenderer.on("agent-light:play-sound", wrapped);
    return () => ipcRenderer.off("agent-light:play-sound", wrapped);
  }
});
