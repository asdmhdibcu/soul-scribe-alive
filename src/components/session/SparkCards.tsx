import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, type MotionValue, type PanInfo } from "motion/react";
import { X, Flame, Check, ArrowRight, Star, ArrowDown } from "lucide-react";

export type Swipe = "right" | "left" | "up" | "down";
export type SwipeResult = { card: string; emoji: string; category: string; swipe: Swipe };

type Card = { text: string; emoji: string; category: string };

const LIBRARY: Card[] = [
  // Wins & Achievements
  { text: "I achieved something today", emoji: "🏆", category: "Wins" },
  { text: "I kept a promise to myself", emoji: "🤝", category: "Wins" },
  { text: "I surprised myself", emoji: "⚡", category: "Wins" },
  { text: "I finished something I started", emoji: "✅", category: "Wins" },
  { text: "I helped someone today", emoji: "💛", category: "Wins" },
  { text: "I stayed disciplined", emoji: "💪", category: "Wins" },
  { text: "I made a good decision", emoji: "🎯", category: "Wins" },
  { text: "I learned something valuable", emoji: "📚", category: "Wins" },
  { text: "I created something", emoji: "🎨", category: "Wins" },
  // Struggles
  { text: "Something disappointed me", emoji: "😔", category: "Struggle" },
  { text: "I avoided something I should face", emoji: "😬", category: "Struggle" },
  { text: "I felt overwhelmed", emoji: "🌪️", category: "Struggle" },
  { text: "Someone frustrated me", emoji: "😤", category: "Struggle" },
  { text: "I was hard on myself today", emoji: "💢", category: "Struggle" },
  { text: "I procrastinated", emoji: "⏳", category: "Struggle" },
  { text: "I felt anxious or worried", emoji: "😰", category: "Struggle" },
  { text: "I made a mistake", emoji: "❌", category: "Struggle" },
  { text: "I felt like giving up", emoji: "😓", category: "Struggle" },
  // Emotions
  { text: "I felt genuinely loved", emoji: "❤️", category: "Connection" },
  { text: "I felt lonely today", emoji: "🌑", category: "Connection" },
  { text: "I laughed until it hurt", emoji: "😂", category: "Connection" },
  { text: "I cried today", emoji: "😢", category: "Connection" },
  { text: "I felt proud of someone", emoji: "🥹", category: "Connection" },
  { text: "I missed someone", emoji: "💭", category: "Connection" },
  { text: "I felt disconnected", emoji: "🔌", category: "Connection" },
  { text: "I had a meaningful conversation", emoji: "💬", category: "Connection" },
  // Life areas
  { text: "Money was on my mind", emoji: "💰", category: "Life" },
  { text: "Work challenged me today", emoji: "💼", category: "Life" },
  { text: "My body felt strong or weak", emoji: "💪", category: "Life" },
  { text: "I thought about my future", emoji: "🔮", category: "Life" },
  { text: "Family was on my mind", emoji: "👨‍👩‍👧", category: "Life" },
  { text: "My faith felt near or far", emoji: "🕌", category: "Life" },
  { text: "I needed rest and took it", emoji: "😴", category: "Life" },
  { text: "I needed rest and didn't get it", emoji: "😩", category: "Life" },
  // Deep moments
  { text: "A moment changed my perspective", emoji: "🌅", category: "Deep" },
  { text: "I felt grateful for something small", emoji: "🙏", category: "Deep" },
  { text: "I had a realization about myself", emoji: "🪞", category: "Deep" },
  { text: "I felt like I'm becoming someone", emoji: "🦋", category: "Deep" },
  { text: "I questioned something I believed", emoji: "🤔", category: "Deep" },
  { text: "I felt truly alive today", emoji: "✨", category: "Deep" },
  { text: "I want to remember this day", emoji: "📌", category: "Deep" },
];

function pickTwelve(): Card[] {
  const arr = [...LIBRARY];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 12);
}

const SWIPE_DISTANCE = 90;
const SWIPE_VELOCITY = 500;

export function SparkCards({
  streak,
  onExit,
  onComplete,
}: {
  streak: number;
  onExit: () => void;
  onComplete: (results: SwipeResult[]) => void;
}) {
  const cards = useMemo(() => pickTwelve(), []);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<SwipeResult[]>([]);
  const [summary, setSummary] = useState<null | { total: number; wins: number; needs: number }>(null);

  function recordSwipe(swipe: Swipe) {
    const card = cards[index];
    const next = [...results, { card: card.text, emoji: card.emoji, category: card.category, swipe }];
    setResults(next);
    if (index + 1 >= cards.length) {
      const wins = next.filter((r) => r.swipe === "right" || r.swipe === "up").length;
      const needs = next.filter((r) => r.swipe === "down").length;
      const total = next.filter((r) => r.swipe !== "left").length;
      setSummary({ total, wins, needs });
      setTimeout(() => onComplete(next), 2200);
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (summary) {
    return <SummaryCard summary={summary} />;
  }

  const remaining = cards.length - index;

  return (
    <div className="absolute inset-0 flex flex-col px-5 pt-6 pb-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          aria-label="Exit session"
          className="h-10 w-10 rounded-full border border-gold/25 flex items-center justify-center text-muted-foreground hover:text-gold-light hover:bg-gold/5 transition"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-[11px] uppercase tracking-[0.4em] text-gold-light">
          {Math.min(index + 1, cards.length)} of {cards.length}
        </div>
        <div className="flex items-center gap-1.5 px-3 h-10 rounded-full border border-gold/25 bg-card/60">
          <Flame className="h-4 w-4 text-gold-light" />
          <span className="font-display text-sm text-gold-light">{streak}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1 w-full rounded-full bg-gold/10 overflow-hidden">
        <motion.div
          className="h-full"
          style={{
            background: "linear-gradient(90deg, #C9A84C, #F0C96A)",
            boxShadow: "0 0 12px rgba(240,201,106,0.5)",
          }}
          animate={{ width: `${(index / cards.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Card stack */}
      <div className="flex-1 relative flex items-center justify-center my-6">
        <div className="relative w-full max-w-sm aspect-[3/4]">
          <AnimatePresence>
            {cards
              .slice(index, index + 3)
              .map((c, i) => {
                const isTop = i === 0;
                return (
                  <CardView
                    key={`${c.text}-${index + i}`}
                    card={c}
                    depth={i}
                    isTop={isTop}
                    showHint={isTop && index === 0}
                    onSwipe={recordSwipe}
                  />
                );
              })
              .reverse()}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer hint */}
      <div className="text-center text-[11px] uppercase tracking-[0.35em] text-muted-foreground/70">
        {remaining > 0 ? "Swipe what felt true today" : ""}
      </div>
    </div>
  );
}

function CardView({
  card,
  depth,
  isTop,
  showHint,
  onSwipe,
}: {
  card: Card;
  depth: number;
  isTop: boolean;
  showHint: boolean;
  onSwipe: (s: Swipe) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-14, 0, 14]);

  // Tint overlays driven by drag
  const rightOpacity = useTransform(x, [0, 120], [0, 0.9]);
  const leftOpacity = useTransform(x, [-120, 0], [0.9, 0]);
  const upOpacity = useTransform(y, [-120, 0], [0.9, 0]);
  const downOpacity = useTransform(y, [0, 120], [0, 0.9]);

  const [exiting, setExiting] = useState<Swipe | null>(null);
  const triggered = useRef(false);

  function fly(dir: Swipe) {
    if (triggered.current) return;
    triggered.current = true;
    setExiting(dir);
    setTimeout(() => onSwipe(dir), 260);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    if (absX > absY) {
      if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) return fly("right");
      if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) return fly("left");
    } else {
      if (offset.y < -SWIPE_DISTANCE || velocity.y < -SWIPE_VELOCITY) return fly("up");
      if (offset.y > SWIPE_DISTANCE || velocity.y > SWIPE_VELOCITY) return fly("down");
    }
    x.set(0);
    y.set(0);
  }

  const exitTarget =
    exiting === "right"
      ? { x: 600, y: 60, rotate: 30, opacity: 0 }
      : exiting === "left"
      ? { x: -600, y: 60, rotate: -30, opacity: 0 }
      : exiting === "up"
      ? { x: 0, y: -700, rotate: 0, opacity: 0, scale: 0.9 }
      : exiting === "down"
      ? { x: 0, y: 700, rotate: 0, opacity: 0, scale: 0.95 }
      : undefined;

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        zIndex: 10 - depth,
        pointerEvents: isTop ? "auto" : "none",
      }}
      initial={{ scale: 1 - depth * 0.05, y: depth * 14, opacity: depth === 2 ? 0.5 : 1 }}
      animate={{
        scale: 1 - depth * 0.05,
        y: depth * 14,
        opacity: depth === 2 ? 0.6 : 1,
      }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      <motion.div
        drag={isTop && !exiting}
        dragElastic={0.6}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x, y, rotate }}
        animate={exitTarget}
        transition={exiting ? { duration: 0.26, ease: "easeOut" } : undefined}
        whileTap={{ scale: 0.99 }}
        className="absolute inset-0 rounded-[22px] overflow-hidden select-none touch-none"
      >
        <div
          className="absolute inset-0 rounded-[22px] flex flex-col items-center justify-between p-7"
          style={{
            background:
              "linear-gradient(160deg, #1f1f2c 0%, #16161f 55%, #101019 100%)",
            border: "1px solid rgba(201,168,76,0.35)",
            boxShadow:
              "0 30px 70px -20px rgba(0,0,0,0.75), 0 0 0 1px rgba(201,168,76,0.05), inset 0 1px 0 rgba(255,232,168,0.07)",
          }}
        >
          {/* Top gold rule */}
          <div
            aria-hidden
            className="absolute top-0 left-8 right-8 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(240,201,106,0.7), transparent)",
            }}
          />

          <div className="pt-4 text-[64px] leading-none select-none" aria-hidden>
            {card.emoji}
          </div>

          <p
            className="font-display text-[22px] leading-snug text-center text-foreground px-3"
            style={{ textShadow: "0 1px 0 rgba(0,0,0,0.4)" }}
          >
            {card.text}
          </p>

          <div className="pb-1 text-[11px] uppercase tracking-[0.4em] text-muted-foreground/70 font-body italic">
            {card.category}
          </div>

          {/* Swipe tint overlays */}
          <DirectionOverlay
            opacity={rightOpacity}
            color="rgba(201,168,76,0.4)"
            corner="tr"
            icon={<Check className="h-7 w-7" />}
            label="Yes"
          />
          <DirectionOverlay
            opacity={leftOpacity}
            color="rgba(80,80,90,0.55)"
            corner="tl"
            icon={<ArrowRight className="h-7 w-7 rotate-180" />}
            label="Skip"
          />
          <DirectionOverlay
            opacity={upOpacity}
            color="rgba(240,201,106,0.5)"
            corner="top"
            icon={<Star className="h-7 w-7" />}
            label="Major"
          />
          <DirectionOverlay
            opacity={downOpacity}
            color="rgba(40,55,120,0.6)"
            corner="bottom"
            icon={<ArrowDown className="h-7 w-7" />}
            label="Hurt"
          />
        </div>

        {/* First-card gesture hint */}
        {showHint && !exiting && <GestureHint />}
      </motion.div>
    </motion.div>
  );
}

function DirectionOverlay({
  opacity,
  color,
  corner,
  icon,
  label,
}: {
  opacity: MotionValue<number>;
  color: string;
  corner: "tr" | "tl" | "top" | "bottom";
  icon: React.ReactNode;
  label: string;
}) {
  const positions: Record<string, string> = {
    tr: "top-5 right-5 items-end",
    tl: "top-5 left-5 items-start",
    top: "top-5 left-1/2 -translate-x-1/2 items-center",
    bottom: "bottom-5 left-1/2 -translate-x-1/2 items-center",
  };
  return (
    <motion.div
      style={{ opacity }}
      className="absolute inset-0 pointer-events-none rounded-[22px]"
    >
      <div
        className="absolute inset-0 rounded-[22px]"
        style={{ background: `radial-gradient(circle at center, ${color}, transparent 70%)` }}
      />
      <div className={`absolute flex flex-col gap-1 ${positions[corner]} text-gold-light`}>
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(10,10,15,0.65)",
            border: "1px solid rgba(240,201,106,0.6)",
            boxShadow: "0 0 24px rgba(240,201,106,0.45)",
          }}
        >
          {icon}
        </div>
        <div className="text-[10px] uppercase tracking-[0.35em]">{label}</div>
      </div>
    </motion.div>
  );
}

function GestureHint() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {[
        { side: "top-3 left-1/2 -translate-x-1/2", dir: "up", label: "Major" },
        { side: "bottom-3 left-1/2 -translate-x-1/2", dir: "down", label: "Hurt" },
        { side: "left-3 top-1/2 -translate-y-1/2", dir: "left", label: "Skip" },
        { side: "right-3 top-1/2 -translate-y-1/2", dir: "right", label: "Yes" },
      ].map((h) => (
        <motion.div
          key={h.dir}
          className={`absolute ${h.side} text-[10px] uppercase tracking-[0.3em] text-gold-light/80 flex flex-col items-center gap-1`}
          animate={{
            opacity: [0.3, 1, 0.3],
            x:
              h.dir === "left" ? [-2, -10, -2] : h.dir === "right" ? [2, 10, 2] : 0,
            y: h.dir === "up" ? [-2, -10, -2] : h.dir === "down" ? [2, 10, 2] : 0,
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          {h.label}
        </motion.div>
      ))}
    </motion.div>
  );
}

function SummaryCard({
  summary,
}: {
  summary: { total: number; wins: number; needs: number };
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
      <div className="max-w-md">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="mx-auto h-24 w-24 rounded-full mb-8 flex items-center justify-center font-display text-3xl text-background"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #FFE8A8 0%, #F0C96A 35%, #C9A84C 80%)",
            boxShadow:
              "0 0 60px 18px rgba(240,201,106,0.45), inset 0 -10px 24px rgba(120,80,20,0.4)",
          }}
        >
          ✦
        </motion.div>

        <p className="text-[10px] uppercase tracking-[0.5em] text-gold/70 mb-3">
          Today, in your own hand
        </p>
        <h2 className="font-display text-3xl md:text-4xl tracking-tight">
          <span className="text-gold-light">{summary.total}</span> things happened.
        </h2>
        <p className="mt-3 font-body text-lg text-muted-foreground italic">
          <span className="text-gold-light not-italic">{summary.wins}</span> were
          wins.{" "}
          <span className="text-gold-light not-italic">{summary.needs}</span> need
          attention.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full"
          style={{
            background:
              "linear-gradient(160deg, rgba(201,168,76,0.18), rgba(22,22,31,0.6))",
            border: "1px solid rgba(240,201,106,0.5)",
            boxShadow: "0 0 24px rgba(240,201,106,0.35)",
          }}
        >
          <span className="text-base">🪙</span>
          <span className="text-sm tracking-[0.2em] uppercase text-gold-light">
            +5 coins
          </span>
        </motion.div>
      </div>
    </div>
  );
}
