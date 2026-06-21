/// <reference types="vite/client" />

import type { AgentDetection } from "./shared/detector";
import type { AgentId, AgentState, AppState, Preferences } from "./shared/state";

declare global {
  interface Window {
    agentLight?: {
      getState: () => Promise<AppState>;
      getPreferences: () => Promise<Preferences>;
      setAgentState: (agent: AgentId, state: AgentState, message?: string) => Promise<AppState>;
      setMuted: (muted: boolean) => Promise<Preferences>;
      getDetections: () => Promise<AgentDetection[]>;
      onStateChanged: (listener: (state: AppState) => void) => () => void;
      onDetectionsChanged: (listener: (detections: AgentDetection[]) => void) => () => void;
      onPlaySound: (listener: (payload: { agent: AgentId; state: AgentState }) => void) => () => void;
      showAgentMenu: (agent: AgentId) => Promise<void>;
      closeWindow: () => Promise<void>;
      hideWindow: () => Promise<void>;
    };
  }
}
