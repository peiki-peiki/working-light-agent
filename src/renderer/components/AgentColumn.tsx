import { AgentId, AgentStatus, Preferences, STATE_LABELS, nextAgentState } from "../../shared/state";
import TrafficLight from "./TrafficLight";

interface AgentColumnProps {
  agent: AgentId;
  label: string;
  status: AgentStatus;
  preferences: Preferences;
}

export default function AgentColumn({ agent, label, status, preferences }: AgentColumnProps): JSX.Element {
  async function cycleState(): Promise<void> {
    await window.agentLight?.setAgentState(agent, nextAgentState(status.state), "double-click");
  }

  async function showMenu(event: React.MouseEvent): Promise<void> {
    event.preventDefault();
    await window.agentLight?.showAgentMenu(agent);
  }

  return (
    <article className={`agent-column ${status.state}`} onDoubleClick={cycleState} onContextMenu={showMenu}>
      <TrafficLight status={status} waitingBlinkSeconds={preferences.waitingBlinkSeconds} />
      <div className="agent-copy">
        <h2>{label}</h2>
        <div className={`state-label ${status.state}`}>{STATE_LABELS[status.state]}</div>
      </div>
    </article>
  );
}
