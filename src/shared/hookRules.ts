import { AgentId, AgentState, assertAgentId } from "./state";

export interface HookDecision {
  agent: AgentId;
  state: AgentState;
  message: string;
}

export interface HookDecisionOptions {
  previousState?: AgentState;
}

const WAITING_PATTERNS = [
  /需要你确认/i,
  /等你回复/i,
  /请选择/i,
  /请告诉我/i,
  /你想用哪个/i,
  /需要.*?(回复|确认|授权|登录|验证码|文件|截图|选择|提供|补充|决定|输入)/i,
  /请.*?(回复|确认|授权|登录|提供|发我|补充|选择|决定|输入|告诉我)/i,
  /approval/i,
  /permission/i,
  /waitingonuserinput/i,
  /waiting on user input/i,
  /waiting for user/i,
  /inputrequired/i,
  /input required/i,
  /requestuserinputquestionoption/i,
  /request user input/i,
  /which option/i,
  /choose/i,
  /reply/i,
  /confirm/i,
  /是否/i,
  /可以吗/i,
  /要不要/i,
  /行不行/i,
  /\?/,
  /？/
];

const HOOK_STATE: Record<string, AgentState> = {
  SessionStart: "idle",
  UserPromptSubmit: "working",
  PreToolUse: "working",
  PostToolUse: "working",
  PermissionRequest: "waiting",
  Notification: "waiting",
  StopFailure: "error",
  SubagentStart: "working",
  SubagentStop: "done"
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function parseHookInput(raw: string): Record<string, unknown> {
  if (!raw.trim()) {
    return {};
  }

  const parsed = JSON.parse(raw);
  const record = asRecord(parsed);
  if (!record) {
    throw new Error("Hook input must be a JSON object");
  }
  return record;
}

export function getHookName(input: Record<string, unknown>, fallback?: string): string {
  const candidates = [
    input.hook,
    input.hookName,
    input.hook_event_name,
    input.event,
    input.eventName,
    input.type,
    fallback
  ];
  return candidates.find((value): value is string => typeof value === "string" && value.length > 0) ?? "Unknown";
}

function collectStrings(value: unknown, bucket: string[], depth = 0): void {
  if (depth > 8 || bucket.length > 200) {
    return;
  }

  if (typeof value === "string") {
    bucket.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, bucket, depth + 1);
    }
    return;
  }

  const record = asRecord(value);
  if (!record) {
    return;
  }

  for (const key of [
    "message",
    "content",
    "text",
    "lastAssistantMessage",
    "last_assistant_message",
    "last_message",
    "prompt",
    "status",
    "state",
    "reason",
    "transcript"
  ]) {
    if (key in record) {
      collectStrings(record[key], bucket, depth + 1);
    }
  }
}

export function looksLikeWaitingForUser(text: string): boolean {
  return WAITING_PATTERNS.some((pattern) => pattern.test(text));
}

export function extractAssistantText(input: Record<string, unknown>): string {
  const strings: string[] = [];
  collectStrings(input.lastAssistantMessage, strings);
  collectStrings(input.last_assistant_message, strings);
  collectStrings(input.assistantMessage, strings);
  collectStrings(input.prompt, strings);
  collectStrings(input.message, strings);
  collectStrings(input.messages, strings);
  collectStrings(input.transcript, strings);
  return strings.join("\n");
}

export function decideHookState(
  agent: AgentId,
  input: Record<string, unknown>,
  hookName = getHookName(input),
  options: HookDecisionOptions = {}
): HookDecision {
  assertAgentId(agent);

  if (hookName === "Stop") {
    const assistantText = extractAssistantText(input);
    return {
      agent,
      state: options.previousState === "waiting" || looksLikeWaitingForUser(assistantText) ? "waiting" : "done",
      message: hookName
    };
  }

  return {
    agent,
    state: HOOK_STATE[hookName] ?? "working",
    message: hookName
  };
}
