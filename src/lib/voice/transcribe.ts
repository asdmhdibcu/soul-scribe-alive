import { chooseBackend, cleanTranscript } from "@/lib/voice-model";

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (r: { text?: string; error?: string }) => void>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; text?: string; error?: string }>) => {
      pending.get(e.data.id)?.(e.data);
      pending.delete(e.data.id);
    };
  }
  return worker;
}

/** Decodes any recorded blob to 16 kHz mono samples, the rate Whisper expects. */
async function toSamples(blob: Blob): Promise<{ samples: Float32Array; seconds: number }> {
  const data = await blob.arrayBuffer();
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx({ sampleRate: 16000 });
  try {
    const decoded = await ctx.decodeAudioData(data);
    const samples = decoded.getChannelData(0).slice();
    return { samples, seconds: decoded.duration };
  } finally {
    void ctx.close();
  }
}

/**
 * Transcribes a recording entirely on this device. Returns { text: null } on
 * any failure: the recording is the record, the transcript is only an index.
 */
export async function transcribeAudio(
  blob: Blob,
): Promise<{ text: string | null; durationSeconds: number }> {
  let durationSeconds = 0;
  try {
    const { samples, seconds } = await toSamples(blob);
    durationSeconds = seconds;
    const backend = chooseBackend(navigator.userAgent, "gpu" in navigator);
    const id = nextId++;
    const result = await new Promise<{ text?: string; error?: string }>((resolve) => {
      pending.set(id, resolve);
      getWorker().postMessage({ id, audio: samples, backend }, [samples.buffer]);
    });
    if (result.error) throw new Error(result.error);
    const text = cleanTranscript(result.text ?? "");
    return { text: text || null, durationSeconds };
  } catch (e) {
    console.error("[transcribe]", e);
    return { text: null, durationSeconds };
  }
}
