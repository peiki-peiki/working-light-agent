#!/usr/bin/env node
import { createStore } from "../shared/store";
import { AgentId, assertAgentId } from "../shared/state";
import { decideHookState, getHookName, parseHookInput } from "../shared/hookRules";

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      raw += chunk;
    });
    process.stdin.on("error", reject);
    process.stdin.on("end", () => resolve(raw));
  });
}

async function main(): Promise<void> {
  const [agentArg, hookArg] = process.argv.slice(2);
  assertAgentId(agentArg);

  const raw = await readStdin();
  const input = parseHookInput(raw);
  const hookName = getHookName(input, hookArg);
  const store = createStore();
  const currentState = await store.readState();
  const decision = decideHookState(agentArg as AgentId, input, hookName, {
    previousState: currentState.agents[agentArg].state
  });
  await store.updateAgentState(decision.agent, decision.state, decision.message);
  console.error(`${decision.agent} -> ${decision.state} (${decision.message})`);
  if (decision.agent === "codex") {
    console.log("{}");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
