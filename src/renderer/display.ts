import type { AgentDetection } from "../shared/detector";

export function selectVisibleDetections(detections: AgentDetection[]): AgentDetection[] {
  return detections.filter((detection) => detection.detected);
}
