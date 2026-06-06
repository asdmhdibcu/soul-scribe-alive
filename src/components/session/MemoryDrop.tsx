import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Camera, Mic, Pen, Play, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GoldButton } from "@/components/auth/AuthShell";

export type MemoryPayload = {
  photos: string[];
  voice_url: string | null;
  voice_transcript: string;
  one_sentence: string;
};

export function MemoryDrop({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: (m: MemoryPayload) => void;
}) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [sentence, setSentence] = useState("");
  const [saving, setSaving] = useState(false);

  const canContinue =
    photos.length > 0 || voiceUrl !== null || sentence.trim().length > 0;

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const remaining = Math.max(0, 3 - photos.length);
    const selected = Array.from(files).slice(0, remaining);
    if (!selected.length) {
      toast.error("Up to 3 photos.");
      return;
    }
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of selected) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${u.user.id}/photos/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("alive-media")
        .upload(path, file, { upsert: false });
      if (error) {
        toast.error(error.message);
        continue;
      }
      const { data: signed } = await supabase.storage
        .from("alive-media")
        .createSignedUrl(path, 60 * 60 * 24);
      if (signed?.signedUrl) uploaded.push(signed.signedUrl);
    }
    setUploading(false);
    setPhotos((p) => [...p, ...uploaded]);
  }

  async function handleVoiceSave(blob: Blob, autoTranscript: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const path = `${u.user.id}/voice/${Date.now()}.webm`;
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
    setVoiceBlob(blob);
    setTranscript(autoTranscript);
  }

  function clearVoice() {
    setVoiceUrl(null);
    setVoiceBlob(null);
    setTranscript("");
  }

  function go() {
    setSaving(true);
    onContinue({
      photos,
      voice_url: voiceUrl,
      voice_transcript: transcript,
      one_sentence: sentence.trim(),
    });
  }

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="min-h-full flex flex-col px-5 pt-6 pb-10 max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            aria-label="Back"
            className="h-10 w-10 rounded-full border border-gold/25 flex items-center justify-center text-gold-light hover:bg-gold/5 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="text-[11px] uppercase tracking-[0.4em] text-gold-light">
            Memory Drop
          </div>
          <div className="w-10" />
        </div>

        <div className="mt-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl tracking-tight">
            Drop a memory from today.
          </h2>
          <p className="mt-3 font-body text-muted-foreground italic">
            A photo, a voice, a sentence. Or all three.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-8 space-y-4 flex-1">
          {/* Photo */}
          <Card icon={<Camera className="h-6 w-6 text-gold-light" />}
            emoji="📸" title="Photo Memory" subtitle="Share what you saw today"
            active={photos.length > 0}
          >
            {photos.length < 3 && (
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadPhotos(e.target.files)}
                />
                <span
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-xs uppercase tracking-[0.25em] text-gold-light cursor-pointer transition"
                  style={{
                    border: "1px solid rgba(240,201,106,0.4)",
                    background: "rgba(201,168,76,0.06)",
                  }}
                >
                  {uploading ? "Uploading…" : "Tap to open gallery"}
                </span>
              </label>
            )}
            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {photos.map((url) => (
                  <div
                    key={url}
                    className="relative aspect-square rounded-[10px] overflow-hidden border border-gold/30"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3 text-gold-light" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Voice */}
          <Card icon={<Mic className="h-6 w-6 text-gold-light" />}
            emoji="🎤" title="Voice Memory" subtitle="Speak what happened"
            active={voiceUrl !== null}
          >
            {!voiceUrl ? (
              <VoiceRecorder onSave={handleVoiceSave} />
            ) : (
              <VoicePlayback
                url={voiceUrl}
                transcript={transcript}
                onClear={clearVoice}
                hasBlob={!!voiceBlob}
              />
            )}
          </Card>

          {/* One sentence */}
          <Card icon={<Pen className="h-6 w-6 text-gold-light" />}
            emoji="✍️" title="One Sentence" subtitle="Write the essence of today"
            active={sentence.trim().length > 0}
          >
            <textarea
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              rows={3}
              placeholder="The one thing that defined today was…"
              className="w-full bg-transparent border-0 border-b border-gold/20 focus:border-gold focus:outline-none px-0 py-2 text-base text-foreground placeholder:text-muted-foreground/50 font-body italic resize-none"
            />
          </Card>
        </div>

        <div className="mt-8 sticky bottom-0">
          <div className="max-w-sm mx-auto">
            <GoldButton type="button" onClick={go} disabled={!canContinue || saving}>
              I've captured it →
            </GoldButton>
            {!canContinue && (
              <p className="mt-3 text-center text-xs text-muted-foreground/70 italic">
                Add at least one — a photo, a voice, or a sentence.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  emoji,
  icon,
  title,
  subtitle,
  active,
  children,
}: {
  emoji: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[14px] p-5 transition-all duration-300"
      style={{
        background: active
          ? "linear-gradient(160deg, rgba(201,168,76,0.14), rgba(22,22,31,0.7))"
          : "rgba(22,22,31,0.7)",
        border: active
          ? "1px solid rgba(240,201,106,0.55)"
          : "1px solid rgba(201,168,76,0.15)",
        boxShadow: active ? "0 12px 30px -12px rgba(240,201,106,0.3)" : undefined,
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="text-2xl leading-none">{emoji}</div>
        <div className="flex-1">
          <div className="font-display text-lg text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground italic">{subtitle}</div>
        </div>
        <div className="opacity-50">{icon}</div>
      </div>
      {children}
    </div>
  );
}

/* ────────── Voice Recorder ────────── */
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
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      transcriptRef.current = "";
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
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

      // Web Speech transcription (best-effort)
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
          recognitionRef.current = rec;
        } catch {}
      }
    } catch (e) {
      toast.error("Microphone permission denied.");
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
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
    <div className="flex flex-col items-center py-3">
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={() => recording && stop()}
        className="relative h-20 w-20 rounded-full flex items-center justify-center select-none touch-none"
        style={{
          background: recording
            ? "radial-gradient(circle at 35% 30%, #FFE8A8, #C9A84C 70%)"
            : "radial-gradient(circle at 35% 30%, #F0C96A, #C9A84C 70%)",
          boxShadow: recording
            ? "0 0 50px 8px rgba(240,201,106,0.55)"
            : "0 0 30px 4px rgba(240,201,106,0.3)",
        }}
      >
        <Mic className="h-8 w-8 text-background" />
        {recording && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid rgba(240,201,106,0.7)" }}
            animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </button>

      <div className="mt-3 text-[11px] uppercase tracking-[0.35em] text-gold-light/80">
        {recording ? `Recording… ${elapsed.toFixed(1)}s / 60s` : "Hold to record"}
      </div>

      {recording && <Waveform />}
    </div>
  );
}

function Waveform() {
  return (
    <div className="mt-3 flex items-end gap-1 h-8">
      {Array.from({ length: 18 }).map((_, i) => (
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
  );
}

function VoicePlayback({
  url,
  transcript,
  onClear,
  hasBlob,
}: {
  url: string;
  transcript: string;
  onClear: () => void;
  hasBlob: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  void hasBlob;

  function toggle() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  }

  return (
    <div className="flex flex-col items-center py-2">
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
          onClick={toggle}
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
        <p className="mt-3 text-center text-sm text-muted-foreground italic line-clamp-3 max-w-xs">
          "{transcript}"
        </p>
      )}
    </div>
  );
}
