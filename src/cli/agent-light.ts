#!/usr/bin/env node
import { createStore } from "../shared/store";
import { AGENT_STATES, AGENTS, AgentId, AgentState, STATE_LABELS, assertAgentId, assertAgentState } from "../shared/state";

const store = createStore();

function usage(): string {
  return [
    "Usage:",
    "  agent-light set <codex|claude> <idle|working|done|waiting|error> [message]",
    "  agent-light status [--json]",
    "  agent-light mute",
    "  agent-light unmute",
    "  agent-light quit"
  ].join("\n");
}

async function main(argv: string[]): Promise<void> {
  const [command, ...args] = argv;

  if (!command || command === "-h" || command === "--help") {
    console.log(usage());
    return;
  }

  if (command === "set") {
    const [agent, state, ...messageParts] = args;
    assertAgentId(agent);
    assertAgentState(state);
    const next = await store.updateAgentState(agent, state, messageParts.join(" ") || "cli");
    console.log(`${agent} -> ${next.agents[agent].state}`);
    return;
  }

  if (command === "status") {
    const json = args.includes("--json");
    const [state, preferences] = await Promise.all([store.readState(), store.readPreferences()]);
    if (json) {
      console.log(JSON.stringify({ ...state, preferences }, null, 2));
      return;
    }

    for (const agent of AGENTS) {
      const status = state.agents[agent];
      const seen = status.updatedAt > 0 ? new Date(status.updatedAt).toLocaleString() : "never";
      console.log(`${agent}: ${STATE_LABELS[status.state]} (${status.state}), updated: ${seen}`);
    }
    console.log(`muted: ${preferences.muted}`);
    return;
  }

  if (command === "mute" || command === "unmute") {
    const muted = command === "mute";
    await store.setMuted(muted);
    console.log(`muted: ${muted}`);
    return;
  }

  if (command === "quit") {
    await store.requestQuit();
    console.log("quit requested");
    return;
  }

  throw new Error(`Unknown command "${command}".\n${usage()}`);
}

main(process.argv.slice(2)).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  console.error(`Agents: ${AGENTS.join(", ")} | States: ${AGENT_STATES.join(", ")}`);
  process.exit(1);
});

export type CliAgent = AgentId;
export type CliState = AgentState;
