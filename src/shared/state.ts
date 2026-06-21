export type AgentId = "codex" | "claude";

export type AgentState = "idle" | "working" | "done" | "waiting" | "error";

export interface AgentStatus {
  state: AgentState;
  updatedAt: number;
  message?: string;
}

export interface AppState {
  version: 1;
  agents: Record<AgentId, AgentStatus>;
}

export interface Preferences {
  muted: boolean;
  doneAutoIdleSeconds: number;
  waitingBlinkSeconds: number;
}

export const AGENTS: AgentId[] = ["codex", "claude"];
export const AGENT_STATES: AgentState[] = ["idle", "working", "done", "waiting", "error"];

export const AGENT_LABELS: Record<AgentId, string> = {
  codex: "Codex",
  claude: "Claude"
};

export const STATE_LABELS: Record<AgentState, string> = {
  idle: "空闲",
  working: "工作中",
  done: "待验收",
  waiting: "等你回复",
  error: "异常"
};

export const DEFAULT_PREFERENCES: Preferences = {
  muted: false,
  doneAutoIdleSeconds: 600,
  waitingBlinkSeconds: 10
};

export function createDefaultState(): AppState {
  return {
    version: 1,
    agents: {
      codex: { state: "idle", updatedAt: 0 },
      claude: { state: "idle", updatedAt: 0 }
    }
  };
}

export function isAgentId(value: unknown): value is AgentId {
  return typeof value === "string" && AGENTS.includes(value as AgentId);
}

export function isAgentState(value: unknown): value is AgentState {
  return typeof value === "string" && AGENT_STATES.includes(value as AgentState);
}

export function assertAgentId(value: unknown): asserts value is AgentId {
  if (!isAgentId(value)) {
    throw new Error(`Invalid agent "${String(value)}". Expected one of: ${AGENTS.join(", ")}`);
  }
}

export function assertAgentState(value: unknown): asserts value is AgentState {
  if (!isAgentState(value)) {
    throw new Error(`Invalid state "${String(value)}". Expected one of: ${AGENT_STATES.join(", ")}`);
  }
}

export function normalizeState(value: unknown): AppState {
  const next = createDefaultState();

  if (!value || typeof value !== "object") {
    return next;
  }

  const maybe = value as Partial<AppState>;
  if (maybe.version !== 1 || !maybe.agents || typeof maybe.agents !== "object") {
    return next;
  }

  for (const agent of AGENTS) {
    const current = maybe.agents[agent] as Partial<AgentStatus> | undefined;
    if (!current || !isAgentState(current.state)) {
      continue;
    }

    next.agents[agent] = {
      state: current.state,
      updatedAt: typeof current.updatedAt === "number" ? current.updatedAt : 0,
      message: typeof current.message === "string" ? current.message : undefined
    };
  }

  return next;
}

export function normalizePreferences(value: unknown): Preferences {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_PREFERENCES };
  }

  const maybe = value as Partial<Preferences>;
  return {
    muted: typeof maybe.muted === "boolean" ? maybe.muted : DEFAULT_PREFERENCES.muted,
    doneAutoIdleSeconds:
      typeof maybe.doneAutoIdleSeconds === "number" && maybe.doneAutoIdleSeconds >= 0
        ? maybe.doneAutoIdleSeconds
        : DEFAULT_PREFERENCES.doneAutoIdleSeconds,
    waitingBlinkSeconds:
      typeof maybe.waitingBlinkSeconds === "number" && maybe.waitingBlinkSeconds >= 0
        ? maybe.waitingBlinkSeconds
        : DEFAULT_PREFERENCES.waitingBlinkSeconds
  };
}

export function applyStateExpiry(state: AppState, preferences: Preferences, now = Date.now()): AppState {
  const doneAutoIdleMs = preferences.doneAutoIdleSeconds * 1000;

  if (doneAutoIdleMs <= 0) {
    return state;
  }

  let changed = false;
  const next: AppState = {
    version: 1,
    agents: { ...state.agents }
  };

  for (const agent of AGENTS) {
    const status = state.agents[agent];
    if (status.state === "done" && status.updatedAt > 0 && now - status.updatedAt >= doneAutoIdleMs) {
      next.agents[agent] = {
        state: "idle",
        updatedAt: now,
        message: "auto-idle"
      };
      changed = true;
    }
  }

  return changed ? next : state;
}

export function nextAgentState(state: AgentState): AgentState {
  const order: AgentState[] = ["idle", "working", "done", "waiting", "error"];
  return order[(order.indexOf(state) + 1) % order.length];
}

export function visibleAgents(state: AppState): AgentId[] {
  return AGENTS.filter((agent) => state.agents[agent].updatedAt > 0);
}
