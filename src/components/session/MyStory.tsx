import { useState } from "react";
import { useRecorder } from "@/lib/voice/useRecorder";
import { saveVoiceMoment } from "@/lib/voice/sessionVoice";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Mic, Pen, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GoldButton } from "@/components/auth/AuthShell";

export type StoryPayload = {
  personal_notes: string;
  user_voice_story: string;
};

export function MyStory({
  initial,
  onBack,
  onContinue,
}: {
  initial?: StoryPayload;
  onBack: () => void;
  onContinue: (s: StoryPayload) => void;
}) {
  const [tab, setTab] = useState<"write" | "speak">("write");
  const [notes, setNotes] = useState(initial?.personal_notes ?? "");
  const [voiceStory, setVoiceStory] = useState(initial?.user_voice_story ?? "");

  // Voice: tap to start, tap to stop, no time limit. The recording is saved
  // encrypted as its own moment and transcribed on this device.
  const rec = useRecorder();
  const recording = rec.recording;
  const elapsed = Math.floor(rec.elapsed);
  const level = rec.levels.reduce((a, b) => a + b, 0) / rec.levels.length;
  const [transcribing, setTranscribing] = useState(false);

  async function toggleRecording() {
    if (!recording) {
      await rec.start();
      if (rec.error) toast.error(rec.error);
      return;
    }
    const blob = await rec.stop();
    if (!blob) return;
    setTranscribing(true);
    try {
      const text = await saveVoiceMoment(blob);
      if (text) setVoiceStory((prev) => [prev, text].filter(Boolean).join(" "));
      else toast.message("Recording saved. It couldn't be transcribed, but the audio is kept.");
    } catch {
      toast.error("Could not save the recording.");
    } finally {
      setTranscribing(false);
    }
  }

  function clearVoice() {
    setVoiceStory("");
  }

  function handleContinue() {
    onContinue({
      personal_notes: notes.trim(),
      user_voice_story: voiceStory.trim(),
    });
  }

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="relative h-full w-full flex flex-col px-6 pt-6 pb-8">
      <button
        onClick={onBack}
        className="absolute top-5 left-5 h-9 w-9 rounded-full flex items-center justify-center text-gold-light/70 hover:text-gold-light transition"
        aria-label="Back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="text-center mt-8">
        <h1 className="font-display text-3xl text-gold-light tracking-tight">My Story</h1>
        <p className="mt-1 text-sm text-muted-foreground italic">Tell it your way.</p>
      </div>

      {/* Tabs */}
      <div className="mt-6 mx-auto flex rounded-full p-1"
        style={{ border: "1px solid rgba(240,201,106,0.25)", background: "rgba(22,22,31,0.6)" }}
      >
        {(["write", "speak"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2 rounded-full text-xs uppercase tracking-[0.25em] transition flex items-center gap-2"
            style={{
              background:
                tab === t
                  ? "linear-gradient(135deg, rgba(240,201,106,0.25), rgba(240,201,106,0.05))"
                  : "transparent",
              color: tab === t ? "#F0C96A" : "rgba(240,201,106,0.55)",
            }}
          >
            {t === "write" ? <Pen className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            {t === "write" ? "Write" : "Speak"}
          </button>
        ))}
      </div>

      <div className="flex-1 mt-6 min-h-0">
        <AnimatePresence mode="wait">
          {tab === "write" ? (
            <motion.div
              key="write"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="h-full"
            >
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`What happened today?\nWhat are you still thinking about?\nWhat would you want to remember?`}
                className="w-full h-full min-h-[260px] resize-none rounded-2xl p-5 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                style={{
                  background: "rgba(15,15,22,0.85)",
                  border: "1px solid rgba(240,201,106,0.2)",
                  boxShadow: "inset 0 0 40px rgba(0,0,0,0.4)",
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="speak"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="h-full flex flex-col items-center justify-start"
            >
              {/* Mic */}
              <div className="relative mt-4 mb-4 flex items-center justify-center">
                {/* pulse rings */}
                {recording && (
                  <>
                    <motion.div
                      className="absolute h-40 w-40 rounded-full"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      style={{ background: "radial-gradient(circle, rgba(240,201,106,0.35), transparent 70%)" }}
                    />
                  </>
                )}
                <motion.button
                  type="button"
                  onClick={() => void toggleRecording()}
                  disabled={transcribing}
                  aria-label={recording ? "Stop recording" : "Start recording"}
                  whileTap={{ scale: 0.96 }}
                  className="relative h-32 w-32 rounded-full flex items-center justify-center select-none"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, #FFE8A8, #F0C96A 40%, #C9A84C 75%)",
                    boxShadow: recording
                      ? `0 0 ${40 + level * 60}px rgba(240,201,106,${0.5 + level * 0.4})`
                      : "0 10px 40px rgba(240,201,106,0.35)",
                  }}
                >
                  {recording ? (
                    <Square className="h-9 w-9 text-background" fill="currentColor" />
                  ) : (
                    <Mic className="h-10 w-10 text-background" />
                  )}
                </motion.button>
              </div>

              <p className="text-[11px] uppercase tracking-[0.3em] text-gold-light/60">
                {transcribing ? "Transcribing on this device…" : recording ? "Recording · tap to stop" : "Tap to record"}
              </p>

              {/* Waveform / timer */}
              <div className="mt-5 h-12 w-full max-w-xs flex items-center justify-center gap-1">
                {Array.from({ length: 28 }).map((_, i) => {
                  const phase = (i / 28) * Math.PI * 2;
                  const h = recording
                    ? 6 + Math.abs(Math.sin(phase + elapsed)) * level * 36 + Math.random() * 6
                    : 4;
                  return (
                    <div
                      key={i}
                      className="w-[3px] rounded-full transition-[height] duration-100"
                      style={{
                        height: h,
                        background: "linear-gradient(180deg, #FFE8A8, #C9A84C)",
                        opacity: recording ? 0.9 : 0.25,
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-1 text-xs font-mono text-gold-light/70 tabular-nums">{mmss} / 05:00</div>

              {voiceStory && (
                <div className="mt-5 w-full max-w-md rounded-xl p-4 text-sm text-foreground/90 italic relative"
                  style={{
                    background: "rgba(15,15,22,0.7)",
                    border: "1px solid rgba(240,201,106,0.15)",
                  }}
                >
                  <p className="pr-7">“{voiceStory}”</p>
                  <button
                    onClick={clearVoice}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-gold-light"
                    aria-label="Clear"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 shrink-0">
        <GoldButton type="button" onClick={handleContinue}>
          I'm Ready. Write My Story.
        </GoldButton>
        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
          Everything optional
        </p>
      </div>
    </div>
  );
}
