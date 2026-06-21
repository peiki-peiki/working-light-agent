import { describe, expect, it } from "vitest";
import { applyStateExpiry, assertAgentId, assertAgentState, createDefaultState, nextAgentState, visibleAgents } from "../src/shared/state";

describe("state helpers", () => {
  it("rejects invalid agents and states", () => {
    expect(() => assertAgentId("codex")).not.toThrow();
    expect(() => assertAgentId("other")).toThrow(/Invalid agent/);
    expect(() => assertAgentState("working")).not.toThrow();
    expect(() => assertAgentState("paused")).toThrow(/Invalid state/);
  });

  it("expires done states back to idle", () => {
    const state = createDefaultState();
    state.agents.codex = {
      state: "done",
      updatedAt: 1_000,
      message: "Stop"
    };

    const next = applyStateExpiry(
      state,
      {
        muted: false,
        doneAutoIdleSeconds: 10,
        waitingBlinkSeconds: 10
      },
      12_000
    );

    expect(next.agents.codex.state).toBe("idle");
    expect(next.agents.codex.message).toBe("auto-idle");
  });

  it("tracks visible agents by persisted status", () => {
    const state = createDefaultState();
    expect(visibleAgents(state)).toEqual([]);
    state.agents.claude.updatedAt = Date.now();
    expect(visibleAgents(state)).toEqual(["claude"]);
  });

  it("cycles states in UI order", () => {
    expect(nextAgentState("idle")).toBe("working");
    expect(nextAgentState("error")).toBe("idle");
  });
});
