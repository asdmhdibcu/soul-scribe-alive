import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  loadThreadDetails,
  setThreadHidden,
  THREADS_CHANGED_EVENT,
  type ThreadDetail,
} from "@/lib/sorter";
import { useAiAccess } from "@/lib/ai-client";

export const Route = createFileRoute("/_authenticated/alive")({
  head: () => ({ meta: [{ title: "What's alive — ALIVE" }] }),
  component: AlivePage,
});

const KIND_LABEL: Record<string, string> = {
  worry: "Worries",
  project: "Projects",
  person: "People",
  idea: "Ideas",
  hope: "Hopes",
};

function fmt(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function AlivePage() {
  const { hasAi, loading: aiLoading } = useAiAccess();
  const [threads, setThreads] = useState<ThreadDetail[] | null>(null);
  const [showQuiet, setShowQuiet] = useState(false);

  useEffect(() => {
    const load = () =>
      void loadThreadDetails()
        .then(setThreads)
        .catch(() => setThreads([]));
    load();
    window.addEventListener(THREADS_CHANGED_EVENT, load);
    return () => window.removeEventListener(THREADS_CHANGED_EVENT, load);
  }, []);

  const visible = (threads ?? []).filter((t) => !t.hidden);
  const intentions = visible.filter((t) => t.kind === "intention" && t.state === "warm");
  const warm = visible.filter((t) => t.kind !== "intention" && t.state === "warm");
  const quiet = visible.filter((t) => t.state === "quiet");

  async function hide(t: ThreadDetail) {
    await setThreadHidden(t.id, true);
    toast.success("Let go. It won't come up again.", {
      action: { label: "Undo", onClick: () => void setThreadHidden(t.id, false) },
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pt-12 pb-28">
      <h1 className="font-display text-3xl text-gold-light tracking-tight">What's alive</h1>
      <p className="mt-2 text-sm text-muted-foreground italic">
        Filed quietly from your own words. Every line is a quote, with the day you said it.
      </p>

      {!aiLoading && !hasAi && (
        <p
          className="mt-6 rounded-[14px] p-4 text-sm text-foreground/85"
          style={{ background: "#16161F", border: "1px solid rgba(240,201,106,0.25)" }}
        >
          Sorting needs AI.{" "}
          <Link to="/settings" className="text-gold underline-offset-4 hover:underline">
            Add your own AI key
          </Link>{" "}
          (free), or upgrade to Soul. Your entries are kept either way.
        </p>
      )}

      {threads === null ? (
        <p className="mt-10 text-muted-foreground italic">Reading…</p>
      ) : (
        <>
          {intentions.length > 0 && (
            <Section title="You said you'd…">
              {intentions.map((t) => (
                <ThreadCard key={t.id} t={t} onHide={() => hide(t)} />
              ))}
            </Section>
          )}
          {Object.keys(KIND_LABEL).map((k) => {
            const list = warm.filter((t) => t.kind === k);
            return list.length ? (
              <Section key={k} title={KIND_LABEL[k]}>
                {list.map((t) => (
                  <ThreadCard key={t.id} t={t} onHide={() => hide(t)} />
                ))}
              </Section>
            ) : null;
          })}
          {quiet.length > 0 && (
            <div className="mt-10">
              <button
                type="button"
                onClick={() => setShowQuiet((v) => !v)}
                className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-gold-light"
              >
                {showQuiet ? "Hide" : "Show"} gone quiet ({quiet.length})
              </button>
              {showQuiet && (
                <div className="mt-4 space-y-3 opacity-70">
                  {quiet.map((t) => (
                    <ThreadCard key={t.id} t={t} onHide={() => hide(t)} />
                  ))}
                </div>
              )}
            </div>
          )}
          {visible.length === 0 && hasAi && (
            <p className="mt-10 text-muted-foreground italic">
              Nothing filed yet. Capture a few thoughts and they'll gather here.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-[10px] uppercase tracking-[0.4em] text-gold-light/80">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function ThreadCard({ t, onHide }: { t: ThreadDetail; onHide: () => void }) {
  return (
    <article
      className="rounded-[14px] p-4"
      style={{ background: "#16161F", border: "1px solid rgba(240,201,106,0.16)" }}
    >
      <div className="flex items-start gap-3">
        <h3 className="flex-1 font-display text-lg text-gold-light leading-snug">{t.title}</h3>
        <button
          type="button"
          onClick={onHide}
          aria-label={`Let go of ${t.title}`}
          title="Let go"
          className="text-muted-foreground hover:text-gold-light"
        >
          <EyeOff className="h-4 w-4" />
        </button>
      </div>
      {t.first && (
        <p
          className="mt-2 text-[15px] text-foreground/85 leading-relaxed"
          style={{ fontFamily: "Georgia, serif" }}
        >
          “{t.first.quote}”{" "}
          <span className="text-xs text-muted-foreground not-italic">— {fmt(t.first.day)}</span>
        </p>
      )}
      {t.later.length > 0 && (
        <ul
          className="mt-3 space-y-1 text-sm text-foreground/70"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {t.later.slice(0, 3).map((m, i) => (
            <li key={i}>
              <span className="text-xs text-muted-foreground">{fmt(m.day)}:</span> “{m.quote}”
            </li>
          ))}
          {t.later.length > 3 && (
            <li className="text-xs text-muted-foreground">and {t.later.length - 3} more</li>
          )}
        </ul>
      )}
    </article>
  );
}
