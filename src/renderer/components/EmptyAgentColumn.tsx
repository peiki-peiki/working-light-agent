import TrafficLight from "./TrafficLight";

const IDLE_STATUS = {
  state: "idle" as const,
  updatedAt: 0
};

export default function EmptyAgentColumn(): JSX.Element {
  return (
    <article className="agent-column empty-agent-column">
      <TrafficLight status={IDLE_STATUS} waitingBlinkSeconds={0} />
      <div className="agent-copy">
        <h2>未连接</h2>
        <div className="state-label idle">未连接</div>
      </div>
    </article>
  );
}
