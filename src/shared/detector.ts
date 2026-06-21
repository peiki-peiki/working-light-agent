import { spawnSync } from "node:child_process";
import path from "node:path";
import { AgentId, AGENT_LABELS, AGENTS } from "./state";

export interface AgentDetection {
  agent: AgentId;
  label: string;
  detected: boolean;
  source: "process" | "none";
  pid?: number;
  processName?: string;
}

export interface ProcessRecord {
  pid?: number;
  command: string;
  args: string;
}

const AGENT_PROCESS_NAMES: Record<AgentId, string[]> = {
  codex: ["codex"],
  claude: ["claude"]
};

const EXCLUDED_PROCESS_PATTERNS = [
  /agent-light/i,
  /CodeAgentTrafficLight/i,
  /app\.asar/i,
  /electron/i,
  /dist\/cli/i,
  /src\/cli/i
];

function normalizeToken(token: string): string {
  return path.basename(token).replace(/\.(cmd|exe|js|mjs|cjs)$/i, "").toLowerCase();
}

function splitCommandLine(commandLine: string): string[] {
  return commandLine.match(/"[^"]+"|'[^']+'|\S+/g)?.map((token) => token.replace(/^["']|["']$/g, "")) ?? [];
}

function isExcludedProcess(processRecord: ProcessRecord): boolean {
  const text = `${processRecord.command} ${processRecord.args}`;
  if (processRecord.pid === process.pid) {
    return true;
  }
  return EXCLUDED_PROCESS_PATTERNS.some((pattern) => pattern.test(text));
}

function detectAgentInProcesses(agent: AgentId, processes: ProcessRecord[]): AgentDetection {
  const expectedNames = AGENT_PROCESS_NAMES[agent];

  for (const processRecord of processes) {
    if (isExcludedProcess(processRecord)) {
      continue;
    }

    const tokens = [processRecord.command, ...splitCommandLine(processRecord.args)].map(normalizeToken);
    const matchedName = tokens.find((token) => expectedNames.includes(token));
    if (matchedName) {
      return {
        agent,
        label: AGENT_LABELS[agent],
        detected: true,
        source: "process",
        pid: processRecord.pid,
        processName: matchedName
      };
    }
  }

  return { agent, label: AGENT_LABELS[agent], detected: false, source: "none" };
}

function parsePosixProcessList(raw: string): ProcessRecord[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map<ProcessRecord | null>((line) => {
      const match = line.match(/^(\d+)\s+(\S+)\s*(.*)$/);
      if (!match) {
        return null;
      }
      return {
        pid: Number(match[1]),
        command: match[2],
        args: match[3] ?? ""
      };
    })
    .filter((record): record is ProcessRecord => record !== null);
}

function readPosixProcesses(): ProcessRecord[] {
  const result = spawnSync("ps", ["-axo", "pid=,comm=,args="], {
    encoding: "utf8"
  });
  return result.status === 0 && result.stdout ? parsePosixProcessList(result.stdout) : [];
}

function readWindowsProcesses(): ProcessRecord[] {
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress"
    ],
    {
      encoding: "utf8",
      windowsHide: true
    }
  );

  if (result.status !== 0 || !result.stdout) {
    return [];
  }

  try {
    const parsed = JSON.parse(result.stdout) as unknown;
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        pid: typeof item.ProcessId === "number" ? item.ProcessId : undefined,
        command: typeof item.Name === "string" ? item.Name : "",
        args: typeof item.CommandLine === "string" ? item.CommandLine : ""
      }));
  } catch {
    return [];
  }
}

export function detectAgentsFromProcesses(processes: ProcessRecord[]): AgentDetection[] {
  return AGENTS.map((agent) => detectAgentInProcesses(agent, processes));
}

export function parseProcessList(raw: string, platform: NodeJS.Platform = process.platform): ProcessRecord[] {
  return platform === "win32" ? [] : parsePosixProcessList(raw);
}

export function detectAgents(): AgentDetection[] {
  const processes = process.platform === "win32" ? readWindowsProcesses() : readPosixProcesses();
  return detectAgentsFromProcesses(processes);
}
