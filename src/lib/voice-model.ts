/** Pure voice rules. No imports; tested directly. */

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

/** First recording format the browser supports; "" lets the browser choose. */
export function pickMimeType(isSupported: (type: string) => boolean): string {
  return MIME_CANDIDATES.find((t) => isSupported(t)) ?? "";
}

/** GPU transcription fails on iPhone/iPad WebKit; CPU (wasm) works there. */
export function chooseBackend(userAgent: string, hasWebGpu: boolean): "webgpu" | "wasm" {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "wasm";
  return hasWebGpu ? "webgpu" : "wasm";
}

/** Typed words stay first and untouched; the transcript is added after them. */
export function combineTextAndTranscript(typed: string, transcript: string): string {
  return [typed, transcript].filter((p) => p.trim()).join("\n\n");
}

export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Drops the model's non-speech markers like [BLANK_AUDIO] or [Music]. */
export function cleanTranscript(text: string): string {
  return text
    .replace(/\[[^\]]*\]|\([^)]*(music|silence|blank)[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
