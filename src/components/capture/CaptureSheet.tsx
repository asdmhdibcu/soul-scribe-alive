import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Feather, X } from "lucide-react";
import { toast } from "sonner";
import { saveTextMoment } from "@/lib/moments";

/**
 * Capture anytime: one floating button on every signed-in page opens a sheet
 * with a single optional textarea. Nothing is required: no mood, no prompt.
 * The sheet closes the moment Save is tapped; encryption and upload happen
 * in the background. If saving fails, the text comes back so nothing is lost.
 */
export function CaptureButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  // The full-screen reflection session has its own controls in that corner.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hidden = pathname.startsWith("/today");

  async function save() {
    const draft = text;
    setText("");
    setOpen(false);
    try {
      await saveTextMoment(draft);
      toast.success("Saved.");
    } catch (e) {
      console.error(e);
      setText(draft);
      toast.error("Could not save. Your words are still in the sheet.", {
        action: { label: "Open", onClick: () => setOpen(true) },
      });
    }
  }

  if (hidden && !open) return null;

  return (
    <>
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
        <CaptureSheet text={text} onChange={setText} onSave={save} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function CaptureSheet({
  text,
  onChange,
  onSave,
  onClose,
}: {
  text: string;
  onChange: (t: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSave = text.trim().length > 0;

  useEffect(() => {
    // Autofocus on desktop only; on phones it would pop the keyboard over the sheet.
    if (window.matchMedia("(pointer: fine)").matches) ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
          <p className="text-[10px] uppercase tracking-[0.4em] text-gold-light/80">
            {new Date().toLocaleString(undefined, {
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-gold-light"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSave) onSave();
          }}
          placeholder="What's on your mind?"
          rows={6}
          className="mt-3 w-full resize-none rounded-[14px] bg-[#0A0A0F] p-4 text-[17px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
          style={{ fontFamily: "Georgia, serif", border: "1px solid rgba(240,201,106,0.18)" }}
        />
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="mt-4 h-12 w-full rounded-[14px] text-sm uppercase tracking-[0.2em] font-medium text-background disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #F0C96A, #C9A84C)" }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
