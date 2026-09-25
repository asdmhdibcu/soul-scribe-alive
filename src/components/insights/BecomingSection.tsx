import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { loadOwnAi } from "@/lib/ai-client";
import { aiErrorMessage } from "@/lib/ai-model";
import { motion } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Sparkles } from "lucide-react";
import { subDays, subMonths, subYears, parseISO, format } from "date-fns";
import { generateBecoming, METRIC_DEFS } from "@/lib/becoming.functions";

type Entry = {
  date: string;
  content: string | null;
  focus_word: string | null;
  one_thing: string | null;
  mood_label?: string | null;
};

type Metric = {
  key: string;
  score: number;
  trend: "up" | "down" | "steady";
  delta_pct: number;
  evidence: string;
};

type Result = { metrics: Metric[]; summary: string };

type RangeKey = "month" | "lastMonth" | "year";

const RANGES: { key: RangeKey; label: string; cmpLabel: string }[] = [
  { key: "month", label: "This month", cmpLabel: "vs last month" },
  { key: "lastMonth", label: "Last month", cmpLabel: "vs prior month" },
  { key: "year", label: "Last year", cmpLabel: "vs prior year" },
];

function windowFor(range: RangeKey, entries: Entry[]) {
  const now = new Date();
  let start: Date, end: Date, cStart: Date, cEnd: Date;
  if (range === "month") {
    start = subDays(now, 30);
    end = now;
    cStart = subDays(now, 60);
    cEnd = subDays(now, 30);
  } else if (range === "lastMonth") {
    start = subDays(now, 60);
    end = subDays(now, 30);
    cStart = subDays(now, 90);
    cEnd = subDays(now, 60);
  } else {
    start = subYears(now, 1);
    end = now;
    cStart = subYears(now, 2);
    cEnd = subYears(now, 1);
  }
  const inRange = (s: Date, e: Date) =>
    entries.filter((x) => {
      const d = parseISO(x.date);
      return d >= s && d <= e;
    });
  return { entries: inRange(start, end), compare: inRange(cStart, cEnd) };
}

export function BecomingSection({ entries }: { entries: Entry[] }) {
  const run = useServerFn(generateBecoming);
  const [range, setRange] = useState<RangeKey>("month");
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const { entries: windowEntries, compare } = useMemo(
    () => windowFor(range, entries),
    [range, entries]
  );

  async function load(force = false) {
    const cacheKey = `alive:becoming:${range}`;
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.ts < 24 * 60 * 60 * 1000) {
            setData(parsed.data);
            return;
          }
        } catch {}
      }
    }
    setLoading(true);
    try {
      const cur = RANGES.find((r) => r.key === range)!;
      const res = await run({
        data: {
          ai: await loadOwnAi(),
          entries: windowEntries.map((e) => ({
            date: e.date,
            content: e.content,
            focus_word: e.focus_word,
            one_thing: e.one_thing,
            mood_label: e.mood_label ?? null,
          })),
          compare_entries: compare.map((e) => ({
            date: e.date,
            content: e.content,
            focus_word: e.focus_word,
            one_thing: e.one_thing,
            mood_label: e.mood_label ?? null,
          })),
          window_label: cur.label,
          compare_label: cur.cmpLabel,
        },
      });
      setData(res as Result);
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: res }));
    } catch (e) {
      toast.error(aiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (entries.length) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, entries.length]);

  const byKey = useMemo(() => {
    const m = new Map<string, Metric>();
    data?.metrics.forEach((x) => m.set(x.key, x));
    return m;
  }, [data]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl text-gold">◆ Who You Are Becoming</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Identity trends across time — not just how you felt.
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-gold-light disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-4 py-2 rounded-full text-xs uppercase tracking-widest border transition-all ${
              range === r.key
                ? "border-gold text-gold-light bg-gold/10"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {data?.summary ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-[1px] bg-gradient-to-br from-[oklch(0.83_0.13_88)] via-[oklch(0.74_0.12_85_/_0.4)] to-transparent mb-6"
        >
          <div className="rounded-2xl bg-[#0F0F16] p-6">
            <p className="font-serif text-lg text-foreground/90 leading-relaxed">
              {data.summary}
            </p>
          </div>
        </motion.div>
      ) : loading ? (
        <div className="flex items-center gap-3 text-muted-foreground mb-6">
          <Sparkles size={16} className="text-gold animate-pulse" />
          Reading who you are becoming…
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {METRIC_DEFS.map((m, i) => {
          const v = byKey.get(m.key);
          return (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{m.emoji}</span>
                  <div>
                    <div className="font-display text-lg text-gold-light">{m.label}</div>
                    {v && <TrendBadge trend={v.trend} delta={v.delta_pct} />}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl text-gold-light">
                    {v ? Math.round(v.score) : "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    score
                  </div>
                </div>
              </div>
              {v && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                  {v.evidence}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Snapshot generated {format(new Date(), "MMM d, yyyy")} · {windowEntries.length} entries in window
      </p>
    </section>
  );
}

function TrendBadge({ trend, delta }: { trend: "up" | "down" | "steady"; delta: number }) {
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const color =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
        ? "text-rose-400"
        : "text-muted-foreground";
  const sign = delta > 0 ? "+" : "";
  return (
    <div className={`flex items-center gap-1 text-xs ${color} mt-0.5`}>
      <Icon size={12} />
      <span>
        {sign}
        {Math.round(delta)}%
      </span>
    </div>
  );
}
