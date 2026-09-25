import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Feather, ImagePlus, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { loadStorageUsed, saveCapture, saveTranscript, storageLimitFor } from "@/lib/moments";
import { transcribeAudio } from "@/lib/voice/transcribe";
import { flush, outboxCount, OUTBOX_CHANGED_EVENT } from "@/lib/outbox";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { AskPanel } from "@/components/ask/AskPanel";
import { formatBytes, MAX_PHOTOS, splitAttachments, storageCheck } from "@/lib/capture-model";
import { usePlan } from "@/lib/plan";

type Draft = { text: string; photos: File[]; files: File[]; audio: Blob | null };
const EMPTY: Draft = { text: "", photos: [], files: [], audio: null };

/**
 * Capture anytime: one floating button on every signed-in page opens a sheet
 * with a textarea, up to three photos and any files. Nothing is required.
 * The sheet closes the moment Save is tapped; encryption and upload happen
 * in the background. If saving fails, the draft comes back so nothing is lost.
 */
export function CaptureButton() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  // The full-screen reflection session has its own controls in that corner.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hidden = pathname.startsWith("/reflect");
  const pendingCount = usePendingCount();

  async function save(d: Draft) {
    setDraft(EMPTY);
    setOpen(false);
    const id = crypto.randomUUID();
    try {
      const { synced } = await saveCapture({
        id,
        capturedAt: new Date().toISOString(),
        text: d.text,
        photos: d.photos,
        files: d.files,
        audio: d.audio,
      });
      if (!synced) toast.success("Saved on this device. It will sync when you're back online.");
      else toast.success(d.audio ? "Saved. Transcribing on this device…" : "Saved.");
    } catch (e) {
      console.error(e);
      setDraft(d);
      toast.error("Could not save. Your capture is still in the sheet.", {
        action: { label: "Open", onClick: () => setOpen(true) },
      });
      return;
    }
    // The moment is already saved with its audio; the transcript only indexes it.
    if (d.audio) {
      const { text } = await transcribeAudio(d.audio);
      if (text) await saveTranscript(id, d.text, text).catch(() => {});
      else toast.message("Voice note saved. It couldn't be transcribed, but the audio is kept.");
    }
  }

  if (hidden && !open) return null;

  return (
    <>
      {pendingCount > 0 && (
        <div
          role="status"
          className="fixed bottom-[92px] right-6 z-40 rounded-full px-3 h-8 flex items-center text-[11px] text-gold-light"
          style={{ background: "#16161F", border: "1px solid rgba(240,201,106,0.3)" }}
        >
          Saved on this device · syncing {pendingCount > 1 ? `(${pendingCount})` : ""}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Capture a moment"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full flex items-center justify-center text-background shadow-lg"
        style={{
          background: "linear-gradient(135deg, #F0C96A, #C9A84C)",
          boxShadow: "0 14px 40px -10px rgba(240,201,106,0.55)",
        }}
      >
        <Feather className="h-6 w-6" />
      </button>
      {open && (
        <CaptureSheet
          draft={draft}
          onChange={setDraft}
          onSave={save}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** Items waiting in the on-device outbox; flushes on load and when back online. */
function usePendingCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const refresh = () => void outboxCount().then(setCount);
    const retry = () => void flush();
    window.addEventListener(OUTBOX_CHANGED_EVENT, refresh);
    window.addEventListener("online", retry);
    const timer = window.setInterval(retry, 60_000);
    retry();
    refresh();
    return () => {
      window.removeEventListener(OUTBOX_CHANGED_EVENT, refresh);
      window.removeEventListener("online", retry);
      window.clearInterval(timer);
    };
  }, []);
  return count;
}

function CaptureSheet({
  draft,
  onChange,
  onSave,
  onClose,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSave: (d: Draft) => void;
  onClose: () => void;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"capture" | "ask">("capture");
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { plan } = usePlan();
  const limit = storageLimitFor(plan);
  const [used, setUsed] = useState<number | null>(null);

  const addBytes =
    [...draft.photos, ...draft.files].reduce((n, f) => n + f.size, 0) + (draft.audio?.size ?? 0);
  const check = used === null ? null : storageCheck(used, addBytes, limit);
  const hasContent = Boolean(
    draft.text.trim() || draft.photos.length || draft.files.length || draft.audio,
  );
  const canSave = hasContent && check?.ok !== false;

  useEffect(() => {
    // Autofocus on desktop only; on phones it would pop the keyboard over the sheet.
    if (window.matchMedia("(pointer: fine)").matches) textRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    loadStorageUsed()
      .then(setUsed)
      .catch(() => setUsed(null));
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function add(list: FileList | null) {
    if (!list) return;
    const { photos, files, extraPhotos } = splitAttachments([
      ...draft.photos,
      ...draft.files,
      ...Array.from(list),
    ]);
    if (extraPhotos) toast.message(`Up to ${MAX_PHOTOS} photos per moment.`);
    onChange({ ...draft, photos, files });
  }

  function remove(f: File) {
    onChange({
      ...draft,
      photos: draft.photos.filter((p) => p !== f),
      files: draft.files.filter((p) => p !== f),
    });
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/70" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Capture a moment"
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 mx-auto max-w-2xl rounded-t-[14px] p-5 pb-8"
        style={{ background: "#16161F", border: "1px solid rgba(240,201,106,0.25)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1" role="tablist">
            {(["capture", "ask"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className="px-3 h-8 rounded-full text-[11px] uppercase tracking-[0.3em]"
                style={{
                  color: tab === t ? "#0A0A0F" : "rgba(240,201,106,0.8)",
                  background: tab === t ? "#F0C96A" : "transparent",
                }}
              >
                {t === "capture" ? "Capture" : "Ask"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-gold-light"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {tab === "ask" ? (
          <div className="mt-4">
            <AskPanel onNavigate={onClose} />
          </div>
        ) : (
          <>
            <textarea
              ref={textRef}
              value={draft.text}
              onChange={(e) => onChange({ ...draft, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSave) onSave(draft);
              }}
              placeholder="What's on your mind?"
              rows={5}
              className="mt-3 w-full resize-none rounded-[14px] bg-[#0A0A0F] p-4 text-[17px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
              style={{ fontFamily: "Georgia, serif", border: "1px solid rgba(240,201,106,0.18)" }}
            />

            {(draft.photos.length > 0 || draft.files.length > 0) && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {[...draft.photos, ...draft.files].map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 rounded-full px-3 h-8 text-xs text-foreground/85"
                    style={{ border: "1px solid rgba(240,201,106,0.25)", background: "#0A0A0F" }}
                  >
                    <span className="max-w-[160px] truncate">{f.name}</span>
                    <span className="text-muted-foreground">{formatBytes(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => remove(f)}
                      aria-label={`Remove ${f.name}`}
                      className="text-muted-foreground hover:text-gold-light"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex items-center gap-2">
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  add(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  add(e.target.files);
                  e.target.value = "";
                }}
              />
              <IconButton
                label="Add photos"
                onClick={() => photoInput.current?.click()}
                disabled={draft.photos.length >= MAX_PHOTOS}
              >
                <ImagePlus className="h-5 w-5" />
              </IconButton>
              <IconButton label="Add files" onClick={() => fileInput.current?.click()}>
                <Paperclip className="h-5 w-5" />
              </IconButton>
              {draft.audio ? (
                <span
                  className="flex items-center gap-2 rounded-full px-3 h-8 text-xs text-gold-light"
                  style={{ border: "1px solid rgba(240,201,106,0.35)", background: "#0A0A0F" }}
                >
                  Voice note · {formatBytes(draft.audio.size)}
                  <button
                    type="button"
                    onClick={() => onChange({ ...draft, audio: null })}
                    aria-label="Remove voice note"
                    className="text-muted-foreground hover:text-gold-light"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : (
                <VoiceButton compact onRecorded={(audio) => onChange({ ...draft, audio })} />
              )}
              {used !== null && (
                <p
                  className={`ml-auto text-[11px] ${check?.ok === false ? "text-red-300" : "text-muted-foreground"}`}
                >
                  {check?.ok === false
                    ? `Not enough space: ${formatBytes(check.remainingBytes)} left of ${formatBytes(limit)}`
                    : `${formatBytes(used + addBytes)} of ${formatBytes(limit)} used`}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onSave(draft)}
              disabled={!canSave}
              className="mt-4 h-12 w-full rounded-[14px] text-sm uppercase tracking-[0.2em] font-medium text-background disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #F0C96A, #C9A84C)" }}
            >
              Save
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="h-11 w-11 rounded-full flex items-center justify-center text-gold-light disabled:opacity-40"
      style={{ border: "1px solid rgba(240,201,106,0.3)", background: "#0A0A0F" }}
    >
      {children}
    </button>
  );
}
