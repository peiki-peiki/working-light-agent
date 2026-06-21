import { AgentState, AgentStatus } from "../../shared/state";

interface TrafficLightProps {
  status: AgentStatus;
  waitingBlinkSeconds: number;
}

const LIGHTS: { color: "red" | "blue" | "green"; activeFor: AgentState[] }[] = [
  { color: "red", activeFor: ["waiting", "error"] },
  { color: "blue", activeFor: ["working"] },
  { color: "green", activeFor: ["done"] }
];

function getActiveColor(state: AgentState): "red" | "blue" | "green" | "idle" {
  return LIGHTS.find((light) => light.activeFor.includes(state))?.color ?? "idle";
}

export default function TrafficLight({ status, waitingBlinkSeconds }: TrafficLightProps): JSX.Element {
  const shouldBlink =
    status.state === "waiting" && status.updatedAt > 0 && Date.now() - status.updatedAt < waitingBlinkSeconds * 1000;
  const activeColor = getActiveColor(status.state);

  return (
    <div className="traffic-light" aria-label={status.state}>
      <span className={`light ${activeColor} ${shouldBlink ? "blink" : ""}`} />
    </div>
  );
}
