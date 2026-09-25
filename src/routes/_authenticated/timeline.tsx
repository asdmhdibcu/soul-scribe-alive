import { createFileRoute } from "@tanstack/react-router";
import { loadOwnAi, useAiAccess } from "@/lib/ai-client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { BookMarked, Sparkles } from "lucide-react";
import { generateTimeline } from "@/lib/timeline.functions";
import { UpgradeGate } from "@/components/UpgradeGate";
import { loadMoments, momentsForAi, quotesInMoments } from "@/lib/moments";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({ meta: [{ title: "Life Timeline — ALIVE" }] }),
  component: TimelinePage,
});

type Chapter = {
  title: string;
  start_date: string;
  end_date: string;
  summary: string;
  key_emotions: string[];
  important_memories: string[];
  entry_dates: string[];
};

function fmt(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function groupByYear(chapters: Chapter[]) {
  const map = new Map<number, Chapter[]>();
  for (const c of chapters) {
    const y = new Date(c.start_date).getFullYear() || new Date().getFullYear();
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(c);
  }
  return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
}

function TimelinePage() {
  // Timeline works on a paid plan or with the person's own AI key.
  const { hasAi, loading: planLoading } = useAiAccess();
  const can = (_f: "timeline") => hasAi;
  const fetchTimeline = useServerFn(generateTimeline);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["life-timeline"],
    queryFn: async () => {
      // Decrypt here; the server only sees dated text for this one request.
      const moments = await loadMoments({ limit: 400 });
      const res = await fetchTimeline({
        data: { ai: await loadOwnAi(), entries: momentsForAi(moments) },
      });
      // Citation law: keep only memories quoted word for word from the moments.
      return {
        chapters: res.chapters.map((c) => ({
          ...c,
          important_memories: quotesInMoments(c.important_memories, moments),
        })),
      };
    },
    staleTime: 1000 * 60 * 30,
    enabled: can("timeline"),
  });

  if (planLoading) return <div className="p-10 text-center text-muted-foreground">…</div>;
  if (!can("timeline")) {
    return (
      <UpgradeGate
        feature="Life Timeline"
        required="soul"
        description="Turn years of entries into the chapters of your life."
      />
    );
  }

  const chapters = (data?.chapters ?? []) as Chapter[];
  const photos: Record<string, string[]> = {};
  const grouped = groupByYear(chapters);

  return (
    <div className="relative min-h-screen text-foreground">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 5%, oklch(0.74 0.12 85 / 0.10), transparent 65%), radial-gradient(ellipse 100% 80% at 50% 110%, oklch(0 0 0 / 0.9), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-3xl px-6 pt-16 pb-24">
        <div className="text-center mb-14">
          <p className="text-[10px] uppercase tracking-[0.5em] text-gold/70 mb-4">Your Archive</p>
          <h1 className="font-display tracking-tight text-4xl md:text-5xl text-gold-light">
            Life Timeline
          </h1>
          <p
            className="mt-4 text-base md:text-lg text-muted-foreground italic"
            style={{ fontFamily: "Georgia, serif" }}
          >
            The chapters of you, gathered from your own words.
          </p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold-light/80 hover:text-gold-light disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3" />
            {isFetching ? "Reading…" : "Re-read my story"}
          </button>
        </div>

        {isLoading && (
          <div className="text-center text-muted-foreground py-20 italic">
            ALIVE is reading your archive…
          </div>
        )}

        {!isLoading && chapters.length === 0 && (
          <div className="text-center py-16 px-6 rounded-2xl border border-gold/20 bg-card/30">
            <BookMarked className="h-8 w-8 mx-auto text-gold/70 mb-4" />
            <p className="text-foreground/80" style={{ fontFamily: "Georgia, serif" }}>
              Your timeline will appear once you have a few more entries.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Every session adds another sentence to your life story.
            </p>
          </div>
        )}

        <div className="relative">
          {chapters.length > 0 && (
            <div
              aria-hidden
              className="absolute left-[14px] md:left-1/2 top-0 bottom-0 w-px"
              style={{
                background:
                  "linear-gradient(180deg, transparent, oklch(0.74 0.12 85 / 0.55) 8%, oklch(0.74 0.12 85 / 0.55) 92%, transparent)",
              }}
            />
          )}

          <div className="space-y-16">
            {grouped.map(([year, items]) => (
              <section key={year}>
                <div className="relative flex md:justify-center mb-8">
                  <div
                    className="absolute left-[14px] md:left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-gold shadow-[0_0_18px_rgba(240,201,106,0.7)]"
                    aria-hidden
                  />
                  <h2 className="ml-12 md:ml-0 md:px-6 font-display text-3xl text-gold-light bg-background/80 relative">
                    {year}
                  </h2>
                </div>

                <div className="space-y-10">
                  {items.map((c, i) => {
                    const side = i % 2 === 0 ? "left" : "right";
                    const chapterPhotos = c.entry_dates.flatMap((d) => photos[d] ?? []).slice(0, 4);
                    return (
                      <motion.article
                        key={`${year}-${i}`}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className={`relative pl-12 md:pl-0 md:grid md:grid-cols-2 md:gap-10 ${
                          side === "right" ? "md:[&>div]:col-start-2" : ""
                        }`}
                      >
                        <span
                          aria-hidden
                          className="absolute left-[10px] md:left-1/2 top-6 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-gold-light ring-4 ring-background"
                        />
                        <div
                          className={`rounded-[16px] p-6 md:p-7 ${
                            side === "right" ? "md:col-start-2" : ""
                          }`}
                          style={{
                            background:
                              "linear-gradient(180deg, rgba(28,28,40,0.92), rgba(18,18,28,0.92))",
                            border: "1px solid rgba(240,201,106,0.28)",
                            borderTop: "2px solid rgba(240,201,106,0.6)",
                            boxShadow: "0 24px 60px -30px rgba(240,201,106,0.25)",
                          }}
                        >
                          <p className="text-[10px] uppercase tracking-[0.35em] text-gold/70">
                            {fmt(c.start_date)} — {fmt(c.end_date)}
                          </p>
                          <h3 className="mt-2 font-display text-2xl text-gold-light">{c.title}</h3>
                          <p
                            className="mt-4 text-[15px] leading-relaxed text-foreground/85"
                            style={{ fontFamily: "Georgia, serif" }}
                          >
                            {c.summary}
                          </p>

                          {c.key_emotions?.length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-2">
                              {c.key_emotions.map((e) => (
                                <span
                                  key={e}
                                  className="text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full text-gold-light/90"
                                  style={{
                                    border: "1px solid rgba(240,201,106,0.35)",
                                  }}
                                >
                                  {e}
                                </span>
                              ))}
                            </div>
                          )}

                          {c.important_memories?.length > 0 && (
                            <ul className="mt-5 space-y-1.5">
                              {c.important_memories.map((m, j) => (
                                <li key={j} className="text-sm text-foreground/75 flex gap-2">
                                  <span className="text-gold/70">◆</span>
                                  <span>{m}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {chapterPhotos.length > 0 && (
                            <div className="mt-5 grid grid-cols-4 gap-1.5">
                              {chapterPhotos.map((url, k) => (
                                <div
                                  key={k}
                                  className="aspect-square rounded-md overflow-hidden bg-card border border-gold/15"
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          <p className="mt-5 text-[11px] text-muted-foreground">
                            {c.entry_dates.length} entr
                            {c.entry_dates.length === 1 ? "y" : "ies"}
                          </p>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        {chapters.length > 0 && (
          <p className="mt-16 text-center text-xs italic text-muted-foreground">
            Your timeline grows richer with every session.
          </p>
        )}
      </div>
    </div>
  );
}
