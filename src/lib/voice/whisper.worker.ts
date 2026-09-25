/// <reference lib="webworker" />
/**
 * On-device speech-to-text. Runs Whisper in this worker so the page stays
 * responsive. Audio never leaves the device: the model files are downloaded
 * once from the Hugging Face hub and cached by the browser.
 */

const LIBRARY = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
const MODEL = "onnx-community/whisper-base";

type TranscribeRequest = { id: number; audio: Float32Array; backend: "webgpu" | "wasm" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: Promise<any> | null = null;

function load(backend: "webgpu" | "wasm") {
  if (!transcriber) {
    transcriber = (async () => {
      const lib = await import(/* @vite-ignore */ LIBRARY);
      lib.env.allowLocalModels = false;
      return lib.pipeline("automatic-speech-recognition", MODEL, {
        device: backend,
        dtype: backend === "webgpu" ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
      });
    })();
    transcriber.catch(() => {
      transcriber = null;
    });
  }
  return transcriber;
}

self.onmessage = async (e: MessageEvent<TranscribeRequest>) => {
  const { id, audio, backend } = e.data;
  try {
    const run = await load(backend);
    // No language hint: Whisper detects it, so any language works.
    const out = await run(audio, { chunk_length_s: 30, stride_length_s: 5, task: "transcribe" });
    const text = Array.isArray(out) ? out.map((o) => o.text).join(" ") : out.text;
    self.postMessage({ id, text: String(text ?? "") });
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
