import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Compass } from "lucide-react";
import { coachSuggestions } from "@/lib/coach";
import { localToday } from "@/lib/brief";
import { useAiAccess } from "@/lib/ai-client";
import { aiErrorMessage } from "@/lib/ai-model";
import type { CoachItem } from "@/lib/brief-model";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({ meta: [{ title: "Coach — ALIVE" }] }),
  component: CoachPage,
});

function fmt(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  });
}

/** Coach speaks only here, when opened and asked — never as a pop-up. */
function CoachPage() {
  const { hasAi, loading } = useAiAccess();
  const [items, setItems] = useState<CoachItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setItems(await coachSuggestions(3, localToday()));
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pt-12 pb-28">
      <div className="flex items-center gap-2 text-gold-light">
        <Compass className="h-5 w-5" />
        <h1 className="font-display text-3xl tracking-tight">Coach</h1>
      </div>
      <p
        className="mt-2 text-sm text-muted-foreground italic"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Small next steps built only on what you said you want, quoting you. It speaks when you ask,
        and never checks up on you.
      </p>

      {!loading && !hasAi ? (
        <p className="mt-8 text-sm text-foreground/85">
          Coach needs AI.{" "}
          <Link to="/settings" className="text-gold underline-offset-4 hover:underline">
            Add your own AI key
          </Link>{" "}
          (free), or upgrade to Soul.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="mt-8 h-12 w-full rounded-[14px] text-sm uppercase tracking-[0.2em] text-background disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #F0C96A, #C9A84C)" }}
        >
          {busy ? "Reading what you said…" : items ? "Suggest again" : "Suggest a next step"}
        </button>
      )}

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      {items && items.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground" style={{ fontFamily: "Georgia, serif" }}>
          Nothing to suggest yet. When you write about something you want or mean to do, Coach will
          build on it.
        </p>
      )}
      {items && items.length > 0 && (
        <ul className="mt-6 space-y-4">
          {items.map((s, i) => (
            <li
              key={i}
              className="rounded-[14px] p-4"
              style={{ background: "#16161F", border: "1px solid rgba(240,201,106,0.18)" }}
            >
              <p
                className="text-[15px] text-foreground/90 leading-relaxed"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {s.text}
              </p>
              <p
                className="mt-2 text-sm italic text-foreground/70"
                style={{ fontFamily: "Georgia, serif" }}
              >
                “{s.quote}”{" "}
                <Link
                  to="/vault"
                  search={{ day: s.citedDate }}
                  className="not-italic text-xs text-gold/80 hover:text-gold-light"
                >
                  — {fmt(s.citedDate)}
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
