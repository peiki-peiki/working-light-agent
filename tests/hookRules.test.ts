import { describe, expect, it } from "vitest";
import { decideHookState, getHookName, looksLikeWaitingForUser, parseHookInput } from "../src/shared/hookRules";

describe("hook rules", () => {
  it("parses hook JSON and common hook name fields", () => {
    const input = parseHookInput('{"hook_event_name":"PreToolUse"}');
    expect(getHookName(input)).toBe("PreToolUse");
    expect(decideHookState("codex", input).state).toBe("working");
  });

  it("maps permission and failure hooks", () => {
    expect(decideHookState("claude", {}, "PermissionRequest").state).toBe("waiting");
    expect(decideHookState("claude", {}, "StopFailure").state).toBe("error");
  });

  it("detects Stop hooks that are waiting for user confirmation", () => {
    const input = {
      hook_event_name: "Stop",
      messages: [{ role: "assistant", content: "需要你确认是否继续？" }]
    };

    expect(looksLikeWaitingForUser("approval required")).toBe(true);
    expect(decideHookState("codex", input).state).toBe("waiting");
  });

  it("detects Codex Stop hooks that ask the user to choose an option", () => {
    const input = {
      hook_event_name: "Stop",
      last_assistant_message: "请选择一种方案"
    };

    expect(decideHookState("codex", input).state).toBe("waiting");
  });

  it("detects Codex Stop hooks that ask the user to reply with a preference", () => {
    const input = {
      hook_event_name: "Stop",
      last_assistant_message: "请告诉我你想用哪个"
    };

    expect(decideHookState("codex", input).state).toBe("waiting");
  });

  it("detects Codex internal waiting state strings", () => {
    expect(
      decideHookState("codex", {
        hook_event_name: "Stop",
        last_assistant_message: "WaitingOnUserInput: RequestUserInputQuestionOption"
      }).state
    ).toBe("waiting");

    expect(
      decideHookState("codex", {
        hook_event_name: "Stop",
        last_assistant_message: "InputRequired"
      }).state
    ).toBe("waiting");
  });

  it("marks ordinary Stop hooks as done", () => {
    const input = {
      hook_event_name: "Stop",
      message: "Build finished successfully."
    };

    expect(decideHookState("codex", input).state).toBe("done");
  });

  it("keeps a waiting agent waiting when Stop follows a permission request", () => {
    const input = {
      hook_event_name: "Stop",
      last_assistant_message: "I need approval before continuing."
    };

    expect(decideHookState("codex", input, "Stop", { previousState: "waiting" }).state).toBe("waiting");
  });

  it("does not overwrite a waiting state on an empty ordinary Stop hook", () => {
    expect(decideHookState("codex", { hook_event_name: "Stop" }, "Stop", { previousState: "waiting" }).state).toBe(
      "waiting"
    );
  });
});
