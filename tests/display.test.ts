import { describe, expect, it } from "vitest";
import { selectVisibleDetections } from "../src/renderer/display";

describe("renderer display selection", () => {
  it("returns no active detections for the empty-column state", () => {
    expect(
      selectVisibleDetections([
        { agent: "codex", label: "Codex", detected: false, source: "none" },
        { agent: "claude", label: "Claude", detected: false, source: "none" }
      ])
    ).toEqual([]);
  });

  it("returns active detections in agent order", () => {
    expect(
      selectVisibleDetections([
        { agent: "codex", label: "Codex", detected: true, source: "process" },
        { agent: "claude", label: "Claude", detected: true, source: "process" }
      ]).map((detection) => detection.label)
    ).toEqual(["Codex", "Claude"]);
  });
});
