import { useEffect, useMemo, useState } from "react";
import { Minus, Volume2, VolumeX, X } from "lucide-react";
import type { AgentDetection } from "../shared/detector";
import { AgentId, AgentState, AppState, Preferences, createDefaultState, DEFAULT_PREFERENCES } from "../shared/state";
import AgentColumn from "./components/AgentColumn";
import EmptyAgentColumn from "./components/EmptyAgentColumn";
import { selectVisibleDetections } from "./display";

type SoundPayload = {
  agent: AgentId;
  state: AgentState;
};

type OscillatorWave = OscillatorType;

function createAudioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  return new AudioContextClass();
}

function playTone(
  context: AudioContext,
  start: number,
  duration: number,
  fromFrequency: number,
  toFrequency: number,
  peakGain: number,
  type: OscillatorWave = "sine"
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(fromFrequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(toFrequency, start + duration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peakGain, start + Math.min(0.035, duration * 0.28));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playDogBark(context: AudioContext): void {
  const now = context.currentTime;
  playTone(context, now, 0.13, 360, 170, 0.09, "square");
  playTone(context, now + 0.17, 0.12, 410, 190, 0.075, "square");
}

function playCatMeow(context: AudioContext): void {
  const now = context.currentTime;
  playTone(context, now, 0.28, 620, 920, 0.055, "sine");
  playTone(context, now + 0.18, 0.24, 900, 520, 0.045, "triangle");
}

function playCowMoo(context: AudioContext): void {
  const now = context.currentTime;
  playTone(context, now, 0.46, 160, 95, 0.07, "sawtooth");
  playTone(context, now + 0.04, 0.42, 120, 82, 0.035, "sine");
}

function playHorseNeigh(context: AudioContext): void {
  const now = context.currentTime;
  playTone(context, now, 0.13, 760, 1120, 0.055, "triangle");
  playTone(context, now + 0.11, 0.15, 980, 520, 0.06, "square");
  playTone(context, now + 0.25, 0.1, 690, 880, 0.038, "triangle");
}

function playStateSound(payload: SoundPayload): void {
  const context = createAudioContext();
  if (!context) {
    return;
  }

  if (payload.state === "waiting" || payload.state === "error") {
    playDogBark(context);
    return;
  }

  if (payload.state === "done") {
    playCatMeow(context);
    return;
  }

  if (payload.state === "working") {
    if (Math.random() < 0.5) {
      playCowMoo(context);
    } else {
      playHorseNeigh(context);
    }
  }
}

export default function App(): JSX.Element {
  const [state, setState] = useState<AppState>(createDefaultState());
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [detections, setDetections] = useState<AgentDetection[]>([]);

  useEffect(() => {
    let mounted = true;
    void window.agentLight?.getState().then((next) => mounted && setState(next));
    void window.agentLight?.getPreferences().then((next) => mounted && setPreferences(next));
    void window.agentLight?.getDetections().then((next) => mounted && setDetections(next));
    const offState = window.agentLight?.onStateChanged((next) => setState(next));
    const offDetections = window.agentLight?.onDetectionsChanged((next) => setDetections(next));
    const offSound = window.agentLight?.onPlaySound?.((payload) => playStateSound(payload));
    return () => {
      mounted = false;
      offState?.();
      offDetections?.();
      offSound?.();
    };
  }, []);

  const activeDetections = useMemo<AgentDetection[]>(() => selectVisibleDetections(detections), [detections]);

  async function toggleMuted(): Promise<void> {
    const next = await window.agentLight?.setMuted(!preferences.muted);
    if (next) {
      setPreferences(next);
    }
  }

  return (
    <main className="shell">
      <section className={`agent-grid count-${Math.max(activeDetections.length, 1)}`}>
        {activeDetections.length === 0 ? (
          <EmptyAgentColumn />
        ) : (
          activeDetections.map((detection) => (
            <AgentColumn
              key={detection.agent}
              agent={detection.agent}
              label={detection.label}
              status={state.agents[detection.agent]}
              preferences={preferences}
            />
          ))
        )}
      </section>
      <div className="window-controls" aria-label="窗口控制">
        <button className="icon-button" type="button" aria-label={preferences.muted ? "取消静音" : "静音"} onClick={toggleMuted}>
          {preferences.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        <button className="icon-button" type="button" aria-label="隐藏" onClick={() => window.agentLight?.hideWindow()}>
          <Minus size={13} />
        </button>
        <button className="icon-button close" type="button" aria-label="关闭" onClick={() => window.agentLight?.closeWindow()}>
          <X size={13} />
        </button>
      </div>
    </main>
  );
}
