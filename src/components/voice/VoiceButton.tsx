import { Mic, Square } from "lucide-react";
import { useRecorder } from "@/lib/voice/useRecorder";
import { formatElapsed } from "@/lib/voice-model";

/**
 * Shared tap-to-record control: a mic that becomes a stop button, with a
 * timer and a live waveform. Calls onRecorded with the finished recording.
 */
export function VoiceButton({
  onRecorded,
  disabled,
  compact,
}: {
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { recording, elapsed, levels, error, start, stop } = useRecorder();

  async function toggle() {
    if (!recording) return start();
    const blob = await stop();
    if (blob) onRecorded(blob);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={recording ? "Stop recording" : "Record a voice note"}
        title={recording ? "Stop recording" : "Record a voice note"}
        className={`${compact ? "h-11 w-11" : "h-14 w-14"} rounded-full flex items-center justify-center disabled:opacity-40`}
        style={
          recording
            ? { background: "#C9A84C", color: "#0A0A0F" }
            : { border: "1px solid rgba(240,201,106,0.3)", background: "#0A0A0F", color: "#F0C96A" }
        }
      >
        {recording ? (
          <Square className="h-4 w-4" fill="currentColor" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>
      {recording && (
        <div className="flex items-center gap-3" aria-live="polite">
          <span className="font-mono text-sm text-gold-light tabular-nums">
            {formatElapsed(elapsed)}
          </span>
          <div className="flex items-end gap-[2px] h-6" aria-hidden>
            {levels.map((v, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full"
                style={{
                  height: `${Math.max(8, v * 100)}%`,
                  background: "#F0C96A",
                  opacity: 0.4 + v * 0.6,
                }}
              />
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
