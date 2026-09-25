import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Feather, Mic, Sparkles, Waypoints } from "lucide-react";
import { BriefCard } from "@/components/brief/BriefCard";
import { loadDaysWritten, loadMoments, MOMENT_SAVED_EVENT, type Moment } from "@/lib/moments";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({ meta: [{ title: "Today — ALIVE" }] }),
  component: TodayHome,
});

/**
 * Home: the morning brief, today's moments in time order, and the way into
 * the weekly reflection. Nothing here asks anything of the person.
 */
function TodayHome() {
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [written, setWritten] = useState<number | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const load = () => {
      void loadMoments({ sinceDay: today })
        .then((all) => setMoments(all.filter((m) => m.day === today).reverse()))
        .catch(() => setMoments([]));
      void loadDaysWritten(30)
        .then(setWritten)
        .catch(() => {});
    };
    load();
    window.addEventListener(MOMENT_SAVED_EVENT, load);
    return () => window.removeEventListener(MOMENT_SAVED_EVENT, load);
  }, [today]);

  return (
    <div className="mx-auto max-w-2xl px-5 pt-10 pb-28">
      <p className="text-[10px] uppercase tracking-[0.45em] text-gold-light/80">
        {new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>
      <h1 className="mt-2 font-display text-3xl text-gold-light tracking-tight">Today</h1>
      {written !== null && (
        <p className="mt-1 text-sm text-muted-foreground italic">
          You've written {written} of the last 30 days.
        </p>
      )}

      <div className="mt-8">
        <BriefCard />
      </div>

      <section className="mt-10">
        <h2 className="text-[10px] uppercase tracking-[0.4em] text-gold-light/80">So far today</h2>
        {moments === null ? (
          <p className="mt-4 text-sm text-muted-foreground italic">Opening…</p>
        ) : moments.length === 0 ? (
          <p
            className="mt-4 text-sm text-muted-foreground"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Nothing yet. Tap the <Feather className="inline h-4 w-4 text-gold" /> whenever
            something's on your mind.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {moments.map((m) => (
              <li key={m.id}>
                <Link
                  to="/vault"
                  search={{ day: today }}
                  className="block rounded-[14px] p-4 hover:border-gold/40"
                  style={{ background: "#16161F", border: "1px solid rgba(240,201,106,0.14)" }}
                >
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>
                      {new Date(m.capturedAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {m.hasAudio && <Mic className="h-3 w-3" aria-label="Voice" />}
                  </div>
                  <p
                    className="mt-1 text-[15px] text-foreground/85 line-clamp-3"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {m.decryptFailed
                      ? "This entry could not be decrypted."
                      : m.text ||
                        m.attachments[0]?.name ||
                        (m.hasAudio ? "Voice note (transcribing)" : "Photo")}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <Link
          to="/reflect"
          className="rounded-[14px] p-5"
          style={{ background: "#16161F", border: "1px solid rgba(240,201,106,0.2)" }}
        >
          <Sparkles className="h-4 w-4 text-gold-light" />
          <p className="mt-2 font-display text-lg text-gold-light">Weekly reflection</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The six-step session, whenever you want to go deeper.
          </p>
        </Link>
        <Link
          to="/alive"
          className="rounded-[14px] p-5"
          style={{ background: "#16161F", border: "1px solid rgba(240,201,106,0.2)" }}
        >
          <Waypoints className="h-4 w-4 text-gold-light" />
          <p className="mt-2 font-display text-lg text-gold-light">What's alive</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your topics and intentions, in your own words.
          </p>
        </Link>
      </div>
    </div>
  );
}
