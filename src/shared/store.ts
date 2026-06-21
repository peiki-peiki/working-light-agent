import { promises as fs } from "node:fs";
import path from "node:path";
import {
  AgentId,
  AgentState,
  AppState,
  Preferences,
  applyStateExpiry,
  assertAgentId,
  assertAgentState,
  createDefaultState,
  normalizePreferences,
  normalizeState
} from "./state";
import { AppPaths, getAppPaths } from "./paths";

export interface Store {
  readState(): Promise<AppState>;
  writeState(state: AppState): Promise<void>;
  updateAgentState(agent: AgentId, state: AgentState, message?: string): Promise<AppState>;
  readPreferences(): Promise<Preferences>;
  writePreferences(preferences: Preferences): Promise<void>;
  setMuted(muted: boolean): Promise<Preferences>;
  requestQuit(): Promise<void>;
  readCommand(): Promise<{ command: "quit"; updatedAt: number } | null>;
  clearCommand(): Promise<void>;
}

async function readJson<T>(filePath: string, fallback: T, normalize: (value: unknown) => T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return normalize(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function atomicWriteJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(tmpPath, filePath);
}

export function createStore(paths: AppPaths = getAppPaths()): Store {
  async function readPreferences(): Promise<Preferences> {
    return readJson(paths.preferencesFile, normalizePreferences(undefined), normalizePreferences);
  }

  async function writePreferences(preferences: Preferences): Promise<void> {
    await atomicWriteJson(paths.preferencesFile, normalizePreferences(preferences));
  }

  async function readState(): Promise<AppState> {
    const [rawState, preferences] = await Promise.all([
      readJson(paths.stateFile, createDefaultState(), normalizeState),
      readPreferences()
    ]);
    const next = applyStateExpiry(rawState, preferences);
    if (next !== rawState) {
      await atomicWriteJson(paths.stateFile, next);
    }
    return next;
  }

  async function writeState(state: AppState): Promise<void> {
    await atomicWriteJson(paths.stateFile, normalizeState(state));
  }

  return {
    readState,
    writeState,
    async updateAgentState(agent, state, message) {
      assertAgentId(agent);
      assertAgentState(state);

      const current = await readState();
      const next: AppState = {
        version: 1,
        agents: {
          ...current.agents,
          [agent]: {
            state,
            updatedAt: Date.now(),
            message
          }
        }
      };
      await writeState(next);
      return next;
    },
    readPreferences,
    writePreferences,
    async setMuted(muted) {
      const preferences = await readPreferences();
      const next = { ...preferences, muted };
      await writePreferences(next);
      return next;
    },
    async requestQuit() {
      await atomicWriteJson(paths.commandFile, { command: "quit", updatedAt: Date.now() });
    },
    async readCommand() {
      return readJson(paths.commandFile, null, (value) => {
        if (!value || typeof value !== "object") {
          return null;
        }
        const command = value as { command?: unknown; updatedAt?: unknown };
        return command.command === "quit" && typeof command.updatedAt === "number"
          ? { command: "quit", updatedAt: command.updatedAt }
          : null;
      });
    },
    async clearCommand() {
      try {
        await fs.unlink(paths.commandFile);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    }
  };
}
