import { saveCapture, saveTranscript } from "@/lib/moments";
import { transcribeAudio } from "@/lib/voice/transcribe";

/**
 * Saves a recording made during the reflection session as its own encrypted
 * voice moment, then transcribes it on this device. Returns the transcript
 * ("" if it could not be transcribed; the audio is kept either way).
 */
export async function saveVoiceMoment(blob: Blob): Promise<string> {
  const id = crypto.randomUUID();
  await saveCapture({
    id,
    capturedAt: new Date().toISOString(),
    text: "",
    photos: [],
    files: [],
    audio: blob,
  });
  const { text } = await transcribeAudio(blob);
  if (text) await saveTranscript(id, "", text).catch(() => {});
  return text ?? "";
}

/** Saves session photos as one encrypted photo moment. */
export async function savePhotoMoment(photos: File[]) {
  await saveCapture({
    id: crypto.randomUUID(),
    capturedAt: new Date().toISOString(),
    text: "",
    photos,
    files: [],
  });
}
