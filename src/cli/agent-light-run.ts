#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createStore } from "../shared/store";
import { AgentId, assertAgentId } from "../shared/state";

async function main(argv: string[]): Promise<void> {
  const [agentArg, command, ...args] = argv;
  assertAgentId(agentArg);

  if (!command) {
    throw new Error("Usage: agent-light-run <codex|claude> <command> [...args]");
  }

  const agent = agentArg as AgentId;
  const store = createStore();
  await store.updateAgentState(agent, "working", `run: ${[command, ...args].join(" ")}`);

  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  const code = await new Promise<number>((resolve) => {
    child.on("error", () => resolve(1));
    child.on("close", (exitCode) => resolve(exitCode ?? 1));
  });

  await store.updateAgentState(agent, code === 0 ? "done" : "error", `run exit ${code}`);
  process.exit(code);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
