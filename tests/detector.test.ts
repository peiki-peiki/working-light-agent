import { describe, expect, it } from "vitest";
import { detectAgentsFromProcesses, parseProcessList } from "../src/shared/detector";

describe("process detector", () => {
  it("detects no agents when no supported process is running", () => {
    const detections = detectAgentsFromProcesses([
      { pid: 101, command: "/bin/zsh", args: "-l" },
      { pid: 102, command: "node", args: "server.js" }
    ]);

    expect(detections.filter((detection) => detection.detected)).toEqual([]);
  });

  it("detects a codex process", () => {
    const detections = detectAgentsFromProcesses([{ pid: 101, command: "/usr/local/bin/codex", args: "" }]);

    expect(detections.find((detection) => detection.agent === "codex")).toMatchObject({
      detected: true,
      label: "Codex",
      source: "process",
      processName: "codex"
    });
    expect(detections.find((detection) => detection.agent === "claude")?.detected).toBe(false);
  });

  it("detects a claude process by node script argument", () => {
    const detections = detectAgentsFromProcesses([{ pid: 101, command: "node", args: "/opt/homebrew/bin/claude" }]);

    expect(detections.find((detection) => detection.agent === "claude")).toMatchObject({
      detected: true,
      label: "Claude",
      source: "process",
      processName: "claude"
    });
  });

  it("detects both supported processes", () => {
    const detections = detectAgentsFromProcesses([
      { pid: 101, command: "codex", args: "" },
      { pid: 102, command: "node", args: "/opt/homebrew/bin/claude" }
    ]);

    expect(detections.filter((detection) => detection.detected).map((detection) => detection.agent)).toEqual(["codex", "claude"]);
  });

  it("ignores hook scripts that mention claude in arguments", () => {
    const detections = detectAgentsFromProcesses([
      {
        pid: 101,
        command: "node",
        args: "/Applications/CodeAgentTrafficLight.app/Contents/Resources/app.asar.unpacked/dist/cli/agent-light-hook.js claude Stop"
      }
    ]);

    expect(detections.find((detection) => detection.agent === "claude")?.detected).toBe(false);
  });

  it("parses posix process lists", () => {
    const processes = parseProcessList("  123 /usr/local/bin/codex codex --version\n  124 node /opt/homebrew/bin/claude\n", "darwin");

    expect(processes).toEqual([
      { pid: 123, command: "/usr/local/bin/codex", args: "codex --version" },
      { pid: 124, command: "node", args: "/opt/homebrew/bin/claude" }
    ]);
  });
});
