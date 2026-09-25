import { createFileRoute, Link } from "@tanstack/react-router";
import { useAiAccess } from "@/lib/ai-client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO, subDays, startOfDay } from "date-fns";
import { RefreshCw, Sparkles } from "lucide-react";
import { loadDayMoods, loadDaysWritten, loadMoments } from "@/lib/moments";
import { buildDayEntries } from "@/lib/writing-stats";
import { GoldParticles } from "@/components/landing/atmos";
import { BecomingSection } from "@/components/insights/BecomingSection";
import { usePlan } from "@/lib/plan";
import { UpgradeGate } from "@/components/UpgradeGate";

export const Route = createFileRoute("/_authenticated/insights")({
  component: InsightsPage,
});

type Entry = {
  id: string;
  date: string;
  title: string | null;
  content: string | null;
  mood_label?: string | null;
  mood_x: number | null;
  mood_y: number | null;
  mood_color: string | null;
  focus_word: string | null;
  one_thing: string | null;
  created_at: string;
};

type UserRow = {
  /** Days with at least one moment in the last 30. Replaces streaks. */
  daysWritten: number;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function InsightsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const { plan } = usePlan();
  // AI sections work on a paid plan or with the person's own AI key.
  const { hasAi } = useAiAccess();
  const isSoulPlus = hasAi || plan === "soul" || plan === "family" || plan === "legacy";

  useEffect(() => {
    (async () => {
      // Decrypted on this device: one entry per day from the person's moments,
      // with that day's reflection mood when there is one.
      const [moments, moods, daysWritten] = await Promise.all([
        loadMoments({ limit: 600 }),
        loadDayMoods(),
        loadDaysWritten(30),
      ]);
      setEntries(buildDayEntries(moments, moods).slice(0, 60) as Entry[]);
      setUser({ daysWritten });
      setLoading(false);
    })();
  }, []);

  const scores = useMemo(() => computeScores(entries, user), [entries, user]);
  const chartData = useMemo(() => buildChart(entries), [entries]);
  const moodStats = useMemo(() => buildMoodStats(entries), [entries]);

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-foreground overflow-x-hidden">
      <GoldParticles />
      <div className="relative max-w-5xl mx-auto px-6 py-12 space-y-16">
        <header>
          <h1 className="font-display text-4xl md:text-5xl text-gold-light tracking-tight">
            Your Insights
          </h1>
          <p className="text-muted-foreground mt-2">
            What ALIVE has learned about you.
          </p>
        </header>

        {loading ? (
          <div className="text-muted-foreground">Reading your story…</div>
        ) : (
          <>
            <ChampionSection scores={scores} />
            {isSoulPlus ? (
              <BecomingSection entries={entries} />
            ) : (
              <UpgradeGate
                feature="Who You Are Becoming"
                required="soul"
                description="Track identity trends — discipline, gratitude, purpose, relationships — across months and years."
              />
            )}
            <MoodLandscape data={chartData} stats={moodStats} entries={entries} />
            {isSoulPlus && <PatternCards entries={entries} />}
            {entries.length === 0 && (
              <EmptyState />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Champion ---------------- */

function computeScores(entries: Entry[], user: UserRow | null) {
  const written = user?.daysWritten ?? 0;

  // Consistency: days written out of the last 30 (no streaks)
  const consistency = clamp01(written / 30);

  // Resilience: % of low-mood days followed by improvement
  let lowDays = 0;
  let bouncedBack = 0;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i].mood_y ?? 0;
    const next = sorted[i + 1].mood_y ?? 0;
    if (cur < -0.1) {
      lowDays++;
      if (next > cur + 0.1) bouncedBack++;
    }
  }
  const resilience = lowDays > 0 ? clamp01(bouncedBack / lowDays) : written > 5 ? 0.7 : 0.5;

  // Self awareness: avg content length / 800
  const lens = entries.map((e) => (e.content ?? "").length);
  const avgLen = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const selfAwareness = clamp01(avgLen / 800);

  // Growth: % entries with focus_word or one_thing
  const withGoal = entries.filter((e) => e.focus_word || e.one_thing).length;
  const growth = entries.length ? clamp01(withGoal / entries.length) : 0;

  return [
    { label: "Consistency", value: consistency },
    { label: "Resilience", value: resilience },
    { label: "Self Awareness", value: selfAwareness },
    { label: "Growth Mindset", value: growth },
  ];
}

function ChampionSection({ scores }: { scores: { label: string; value: number }[] }) {
  return (
    <section>
      <h2 className="font-display text-2xl text-gold mb-6">Champion Score</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {scores.map((s, i) => (
          <Ring key={s.label} label={s.label} value={s.value} delay={i * 0.15} />
        ))}
      </div>
    </section>
  );
}

function Ring({ label, value, delay }: { label: string; value: number; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const pct = Math.round(value * 100);
  const r = 46;
  const c = 2 * Math.PI * r;
  const dash = c * value;

  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={r}
            stroke="hsl(var(--border) / 0.6)"
            strokeOpacity={0.25}
            strokeWidth="8"
            fill="none"
            className="text-border"
          />
          <motion.circle
            cx="60"
            cy="60"
            r={r}
            stroke="oklch(0.83 0.13 88)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={inView ? { strokeDashoffset: c - dash } : { strokeDashoffset: c }}
            transition={{ duration: 1.4, delay, ease: "easeOut" }}
            style={{ filter: "drop-shadow(0 0 6px oklch(0.83 0.13 88 / 0.6))" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: delay + 0.6 }}
            className="font-display text-3xl text-gold-light"
          >
            {pct}%
          </motion.span>
        </div>
      </div>
      <div className="mt-3 text-sm text-muted-foreground tracking-wide">{label}</div>
    </div>
  );
}

/* ---------------- Mood Landscape ---------------- */

function buildChart(entries: Entry[]) {
  const today = startOfDay(new Date());
  const map = new Map<string, Entry>();
  entries.forEach((e) => map.set(e.date, e));
  const points: { date: string; label: string; mood: number | null; entry: Entry | null }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = subDays(today, i);
    const key = format(d, "yyyy-MM-dd");
    const e = map.get(key) ?? null;
    points.push({
      date: key,
      label: format(d, "MMM d"),
      mood: e ? Number(((e.mood_y ?? 0) + (e.mood_x ?? 0)) / 2) : null,
      entry: e,
    });
  }
  return points;
}

function buildMoodStats(entries: Entry[]) {
  const last30 = entries.filter((e) => {
    const d = parseISO(e.date);
    return d >= subDays(new Date(), 30);
  });
  const counts: Record<string, number> = {};
  last30.forEach((e) => {
    const label = e.mood_label ?? bucketMood(e.mood_x ?? 0, e.mood_y ?? 0);
    counts[label] = (counts[label] ?? 0) + 1;
  });
  const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const dayScores: number[][] = Array.from({ length: 7 }, () => []);
  last30.forEach((e) => {
    const d = parseISO(e.date).getDay();
    dayScores[d].push(((e.mood_y ?? 0) + (e.mood_x ?? 0)) / 2);
  });
  const dayAvg = dayScores.map((arr) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  );
  let bestIdx = -1;
  let worstIdx = -1;
  dayAvg.forEach((v, i) => {
    if (v == null) return;
    if (bestIdx < 0 || v > (dayAvg[bestIdx] ?? -Infinity)) bestIdx = i;
    if (worstIdx < 0 || v < (dayAvg[worstIdx] ?? Infinity)) worstIdx = i;
  });
  return {
    mostCommon,
    bestDay: bestIdx >= 0 ? DAY_LABELS[bestIdx] : "—",
    hardestDay: worstIdx >= 0 ? DAY_LABELS[worstIdx] : "—",
  };
}

function bucketMood(x: number, y: number) {
  if (y > 0.2 && x > 0.2) return "Energized";
  if (y > 0.2 && x < -0.2) return "Calm";
  if (y < -0.2 && x > 0.2) return "Frustrated";
  if (y < -0.2 && x < -0.2) return "Heavy";
  return "Steady";
}

function MoodLandscape({
  data,
  stats,
  entries,
}: {
  data: ReturnType<typeof buildChart>;
  stats: ReturnType<typeof buildMoodStats>;
  entries: Entry[];
}) {
  const byDate = useMemo(() => {
    const m = new Map<string, Entry>();
    entries.forEach((e) => m.set(e.date, e));
    return m;
  }, [entries]);

  return (
    <section>
      <h2 className="font-display text-2xl text-gold mb-6">Mood Landscape</h2>
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-4 md:p-6">
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="oklch(0.3 0.02 80 / 0.15)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                interval={4}
                stroke="oklch(0.3 0.02 80 / 0.3)"
              />
              <YAxis
                domain={[-1, 1]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                stroke="oklch(0.3 0.02 80 / 0.3)"
              />
              <Tooltip
                contentStyle={{
                  background: "#0A0A0F",
                  border: "1px solid oklch(0.74 0.12 85 / 0.5)",
                  borderRadius: 12,
                  color: "white",
                }}
                formatter={(v: number) => [v?.toFixed(2) ?? "—", "Mood"]}
              />
              <Line
                type="monotone"
                dataKey="mood"
                stroke="oklch(0.83 0.13 88)"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  if (payload.mood == null) return <g key={index} />;
                  const e: Entry | null = byDate.get(payload.date) ?? null;
                  return (
                    <circle
                      key={index}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="oklch(0.83 0.13 88)"
                      stroke="#0A0A0F"
                      strokeWidth={2}
                      style={{ cursor: e ? "pointer" : "default" }}
                      onClick={() => {
                        if (e) {
                          // Vault has a modal; deep-link by id via query param
                          window.location.assign(`/vault?entry=${e.id}`);
                        }
                      }}
                    />
                  );
                }}
                connectNulls
                isAnimationActive
                animationDuration={1200}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 text-sm">
          <Stat label="Most common mood" value={stats.mostCommon} />
          <Stat label="Best day of week" value={stats.bestDay} />
          <Stat label="Hardest day of week" value={stats.hardestDay} />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg text-gold-light">{value}</div>
    </div>
  );
}

/* ---------------- Weekly Prediction ---------------- */

/* ---------------- Pattern Cards ---------------- */

function PatternStrip({ patterns }: { patterns: { text: string; emoji: string }[] }) {
  return (
    <div className="mt-8">
      <h3 className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-4">
        Patterns ALIVE noticed
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 snap-x">
        {patterns.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="snap-start shrink-0 w-64 md:w-72 rounded-2xl border border-gold/30 bg-card/70 p-5"
          >
            <div className="text-3xl mb-3">{p.emoji}</div>
            <p className="font-display text-lg text-gold-light leading-snug">{p.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PatternCards({ entries }: { entries: Entry[] }) {
  // Local pattern detection in addition to AI strip
  const local = useMemo(() => {
    const out: { text: string; emoji: string }[] = [];
    if (entries.length >= 5) {
      const total = entries.reduce((s, e) => s + (e.mood_y ?? 0), 0);
      if (total / entries.length > 0.2) out.push({ text: "Your baseline mood is trending bright", emoji: "☀️" });
      if (total / entries.length < -0.2) out.push({ text: "You've been carrying weight lately — be gentle", emoji: "🌑" });
    }
    const focusWords = entries.map((e) => e.focus_word).filter(Boolean) as string[];
    if (focusWords.length >= 3) {
      const top = mode(focusWords);
      if (top) out.push({ text: `"${top}" keeps showing up as your focus`, emoji: "🎯" });
    }
    return out;
  }, [entries]);

  if (!local.length) return null;
  return (
    <section>
      <h2 className="font-display text-2xl text-gold mb-4">From your data</h2>
      <PatternStrip patterns={local} />
    </section>
  );
}

function mode(arr: string[]) {
  const m: Record<string, number> = {};
  arr.forEach((v) => (m[v] = (m[v] ?? 0) + 1));
  return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0];
}

/* ---------------- Empty ---------------- */

function EmptyState() {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-10 text-center">
      <p className="font-display text-xl text-gold-light">
        ALIVE needs a few sessions to start seeing you.
      </p>
      <p className="text-muted-foreground mt-2 mb-6">
        Capture today and watch the patterns appear.
      </p>
      <Link
        to="/reflect"
        className="inline-block rounded-full bg-gold px-6 py-3 text-background font-medium hover:bg-gold-light transition-colors"
      >
        Begin a reflection
      </Link>
    </div>
  );
}
