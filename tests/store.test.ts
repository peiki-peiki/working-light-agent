import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStore } from "../src/shared/store";

let tempDir = "";

function pathsFor(dir: string) {
  return {
    dataDir: dir,
    stateFile: path.join(dir, "state.json"),
    preferencesFile: path.join(dir, "preferences.json"),
    commandFile: path.join(dir, "command.json")
  };
}

describe("store", () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-light-"));
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("initializes missing state and preferences", async () => {
    const store = createStore(pathsFor(tempDir));
    const [state, preferences] = await Promise.all([store.readState(), store.readPreferences()]);
    expect(state.agents.codex.state).toBe("idle");
    expect(state.agents.claude.state).toBe("idle");
    expect(preferences.doneAutoIdleSeconds).toBe(600);
  });

  it("updates agents independently", async () => {
    const store = createStore(pathsFor(tempDir));
    await store.updateAgentState("codex", "working", "PreToolUse");
    const state = await store.updateAgentState("claude", "waiting", "PermissionRequest");

    expect(state.agents.codex.state).toBe("working");
    expect(state.agents.claude.state).toBe("waiting");
    expect(state.agents.codex.message).toBe("PreToolUse");
  });

  it("persists mute and quit command", async () => {
    const store = createStore(pathsFor(tempDir));
    await store.setMuted(true);
    expect((await store.readPreferences()).muted).toBe(true);

    await store.requestQuit();
    expect((await store.readCommand())?.command).toBe("quit");
    await store.clearCommand();
    expect(await store.readCommand()).toBeNull();
  });
});
