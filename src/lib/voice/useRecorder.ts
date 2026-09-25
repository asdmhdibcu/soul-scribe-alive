import { useEffect, useRef, useState } from "react";
import { pickMimeType } from "@/lib/voice-model";

/**
 * Tap to start, tap to stop. No time limit, and nothing cancels the recording
 * if the finger leaves the button, so a phone can lie on a table for minutes.
 */
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(24).fill(0));
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const resolveStop = useRef<((b: Blob | null) => void) | null>(null);

  function cleanup() {
    if (raf.current) cancelAnimationFrame(raf.current);
    if (timer.current) window.clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    void audioCtx.current?.close();
    raf.current = null;
    timer.current = null;
    stream.current = null;
    audioCtx.current = null;
  }

  useEffect(() => cleanup, []);

  async function start() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const type = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
      const mr = new MediaRecorder(s, type ? { mimeType: type } : undefined);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        const blob = chunks.current.length
          ? new Blob(chunks.current, { type: mr.mimeType || type || "audio/webm" })
          : null;
        cleanup();
        resolveStop.current?.(blob);
        resolveStop.current = null;
      };
      mr.start(1000);
      rec.current = mr;

      // Live waveform from the microphone level.
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(s).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        setLevels(Array.from(buf.slice(0, 24), (v) => v / 255));
        raf.current = requestAnimationFrame(tick);
      };
      tick();

      const started = Date.now();
      setElapsed(0);
      timer.current = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 250);
      setRecording(true);
    } catch {
      cleanup();
      setError("Microphone is not available. Check the browser's permission.");
    }
  }

  function stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!rec.current || rec.current.state === "inactive") return resolve(null);
      resolveStop.current = resolve;
      rec.current.stop();
      setRecording(false);
    });
  }

  return { recording, elapsed, levels, error, start, stop };
}
