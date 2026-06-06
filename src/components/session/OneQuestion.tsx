import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Mic, Pen, Play, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GoldButton } from "@/components/auth/AuthShell";
import { generateReflectionQuestion } from "@/lib/reflection.functions";
import type { SwipeResult } from "./SparkCards";

export type AnswerPayload = {
  question: string;
  answer_text: string;
  answer_voice_url: string | null;
};

type Props = {
  context: {
    mood_x: number;
    mood_y: number;
    mood_label: string;
    cards: SwipeResult[];
    one_sentence: string;
    has_photo: boolean;
    has_voice: boolean;
    ai_tone: string | null;
  };
  onBack: () => void;
  onComplete: (a: AnswerPayload) => void;
};

export function OneQuestion({ context, onBack, onComplete }: Props) {
  const ask = useServerFn(generateReflectionQuestion);
  const [question, setQuestion] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [mode, setMode] = useState<"choose" | "voice" | "text">("choose");
  const [answerText, setAnswerText] = useState("");
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    (async () => {
      try {
        const result = await ask({
          data: {
            mood_x: context.mood_x,
            mood_y: context.mood_y,
            mood_label: context.mood_label,
            cards_up: context.cards.filter((c) => c.swipe === "up").map((c) => c.card),
            cards_down: context.cards.filter((c) => c.swipe === "down").map((c) => c.card),
            cards_right: context.cards.filter((c) => c.swipe === "right").map((c) => c.card),
            one_sentence: context.one_sentence,
            has_photo: context.has_photo,
            has_voice: context.has_voice,
            ai_tone: context.ai_tone,
          },
        });
        setQuestion(result.question);
      } catch (e) {
        console.error(e);
        setQuestion(
          "When you think about today, what is the part of yourself you're trying not to look at?",
        );
      }
    })();
  }, []);

  // Word-by-word reveal once question arrives
  useEffect(() => {
    if (!question) return;
    const words = question.split(" ");
    if (revealed >= words.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 140);
    return () => clearTimeout(t);
  }, [question, revealed]);

  const words = question ? question.split(" ") : [];
  const fullyRevealed = question && revealed >= words.length;

  const canSubmit = answerText.trim().length > 0 || voiceUrl !== null;

  async function handleVoiceSave(blob: Blob, autoTranscript: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const path = `${u.user.id}/voice/answer-${Date.now()}.webm`;
    const { error } = await supabase.storage
      .from("alive-media")
      .upload(path, blob, { contentType: blob.type || "audio/webm" });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: signed } = await supabase.storage
      .from("alive-media")
      .createSignedUrl(path, 60 * 60 * 24);
    if (signed?.signedUrl) setVoiceUrl(signed.signedUrl);
    setVoiceTranscript(autoTranscript);
    if (autoTranscript) setAnswerText(autoTranscript);
  }

  function submit() {
    onComplete({
      question: question ?? "",
      answer_text: answerText.trim() || voiceTranscript.trim(),
      answer_voice_url: voiceUrl,
    });
  }

  if (!question) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <motion.div
          className="h-32 w-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #FFE8A8 0%, #F0C96A 35%, #C9A84C 70%, rgba(201,168,76,0.15) 100%)",
            boxShadow:
              "0 0 80px 18px rgba(240,201,106,0.35), 0 0 160px 40px rgba(201,168,76,0.18), inset 0 -20px 40px rgba(120,80,20,0.3)",
          }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <p className="mt-10 font-body text-muted-foreground italic tracking-widest text-sm">
          ALIVE is thinking…
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col px-5 pt-6 pb-8 overflow-y-auto">
      {/* Top */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          aria-label="Back"
          className="h-10 w-10 rounded-full border border-gold/25 flex items-center justify-center text-gold-light hover:bg-gold/5 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="text-[11px] uppercase tracking-[0.4em] text-gold-light">
          One Question
        </div>
        <div className="w-10" />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-3 py-10 max-w-2xl mx-auto">
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="font-display text-6xl text-gold-light leading-none mb-4 select-none"
          style={{ textShadow: "0 0 24px rgba(240,201,106,0.4)" }}
        >
          “
        </motion.div>

        <p
          className="font-display text-2xl md:text-3xl leading-snug text-foreground"
          style={{ textShadow: "0 1px 0 rgba(0,0,0,0.4)" }}
        >
          {words.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={
                i < revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }
              }
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="inline-block"
            >
              {w}
              {i < words.length - 1 ? "\u00A0" : ""}
            </motion.span>
          ))}
        </p>

        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: fullyRevealed ? 1 : 0 }}
          transition={{ duration: 0.6 }}
          className="font-display text-6xl text-gold-light leading-none mt-4 select-none"
          style={{ textShadow: "0 0 24px rgba(240,201,106,0.4)" }}
        >
          ”
        </motion.div>
      </div>

      {/* Response */}
      <AnimatePresence mode="wait">
        {fullyRevealed && mode === "choose" && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto w-full"
          >
            <ChoiceButton
              onClick={() => setMode("voice")}
              icon={<Mic className="h-4 w-4" />}
              label="Speak my answer"
            />
            <ChoiceButton
              onClick={() => setMode("text")}
              icon={<Pen className="h-4 w-4" />}
              label="Write my answer"
            />
          </motion.div>
        )}

        {mode === "voice" && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto w-full"
          >
            {voiceUrl ? (
              <VoicePlayback
                url={voiceUrl}
                transcript={voiceTranscript}
                onClear={() => {
                  setVoiceUrl(null);
                  setVoiceTranscript("");
                  setAnswerText("");
                }}
              />
            ) : (
              <VoiceRecorder onSave={handleVoiceSave} />
            )}
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="block mx-auto mt-3 text-[11px] uppercase tracking-[0.3em] text-muted-foreground hover:text-gold-light transition"
            >
              ← Other way
            </button>
          </motion.div>
        )}

        {mode === "text" && (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl mx-auto w-full"
          >
            <textarea
              autoFocus
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={6}
              placeholder="Be honest. No one else will read this."
              className="w-full bg-card/60 border border-gold/20 focus:border-gold rounded-[14px] px-5 py-4 text-base text-foreground placeholder:text-muted-foreground/50 font-body italic resize-none focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="block mx-auto mt-3 text-[11px] uppercase tracking-[0.3em] text-muted-foreground hover:text-gold-light transition"
            >
              ← Other way
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {fullyRevealed && (mode !== "choose" || canSubmit) && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 max-w-md mx-auto w-full"
        >
          <GoldButton type="button" onClick={submit} disabled={!canSubmit}>
            I've answered. Write my story →
          </GoldButton>
        </motion.div>
      )}
    </div>
  );
}

function ChoiceButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[14px] px-5 py-4 text-sm uppercase tracking-[0.2em] text-gold-light flex items-center justify-center gap-2 transition hover:scale-[1.01]"
      style={{
        background:
          "linear-gradient(160deg, rgba(201,168,76,0.12), rgba(22,22,31,0.7))",
        border: "1px solid rgba(240,201,106,0.5)",
        boxShadow: "0 10px 30px -12px rgba(240,201,106,0.3)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ────────── Reuse voice components inline (kept local to keep file self-contained) ────────── */
function VoiceRecorder({
  onSave,
}: {
  onSave: (blob: Blob, transcript: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recRef = useRef<any>(null);
  const transcriptRef = useRef("");

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      transcriptRef.current = "";
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onSave(blob, transcriptRef.current.trim());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 0.1 >= 60) {
            stop();
            return 60;
          }
          return e + 0.1;
        });
      }, 100);

      const SR =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = "en-US";
        rec.onresult = (ev: any) => {
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            if (ev.results[i].isFinal) {
              transcriptRef.current += ev.results[i][0].transcript + " ";
            }
          }
        };
        rec.onerror = () => {};
        try {
          rec.start();
          recRef.current = rec;
        } catch {}
      }
    } catch {
      toast.error("Microphone permission denied.");
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recRef.current) {
      try { recRef.current.stop(); } catch {}
      recRef.current = null;
    }
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    setRecording(false);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        mediaRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center py-4">
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={() => recording && stop()}
        className="relative h-24 w-24 rounded-full flex items-center justify-center select-none touch-none"
        style={{
          background: recording
            ? "radial-gradient(circle at 35% 30%, #FFE8A8, #C9A84C 70%)"
            : "radial-gradient(circle at 35% 30%, #F0C96A, #C9A84C 70%)",
          boxShadow: recording
            ? "0 0 60px 10px rgba(240,201,106,0.6)"
            : "0 0 30px 4px rgba(240,201,106,0.3)",
        }}
      >
        <Mic className="h-10 w-10 text-background" />
        {recording && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid rgba(240,201,106,0.7)" }}
            animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </button>
      <div className="mt-3 text-[11px] uppercase tracking-[0.35em] text-gold-light/80">
        {recording ? `Recording… ${elapsed.toFixed(1)}s / 60s` : "Hold to record"}
      </div>
      {recording && (
        <div className="mt-3 flex items-end gap-1 h-8">
          {Array.from({ length: 22 }).map((_, i) => (
            <motion.span
              key={i}
              className="w-1 rounded-full bg-gold-light"
              animate={{ height: ["20%", "100%", "30%", "80%", "20%"] }}
              transition={{
                duration: 0.9 + (i % 4) * 0.15,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.04,
              }}
              style={{ height: "20%" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VoicePlayback({
  url,
  transcript,
  onClear,
}: {
  url: string;
  transcript: string;
  onClear: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="flex flex-col items-center py-4">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (!audioRef.current) return;
            if (playing) audioRef.current.pause();
            else audioRef.current.play();
          }}
          className="h-14 w-14 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(201,168,76,0.15)",
            border: "1px solid rgba(240,201,106,0.5)",
          }}
        >
          {playing ? (
            <Square className="h-5 w-5 text-gold-light" />
          ) : (
            <Play className="h-5 w-5 text-gold-light ml-0.5" />
          )}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="h-10 px-3 rounded-full flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground border border-border hover:text-gold-light hover:border-gold/40 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Redo
        </button>
      </div>
      {transcript && (
        <p className="mt-3 text-center text-sm text-muted-foreground italic line-clamp-3 max-w-md">
          "{transcript}"
        </p>
      )}
    </div>
  );
}
