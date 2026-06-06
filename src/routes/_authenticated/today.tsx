import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoldParticles } from "@/components/landing/atmos";
import { GoldButton } from "@/components/auth/AuthShell";
import { SparkCards, type SwipeResult } from "@/components/session/SparkCards";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({ meta: [{ title: "Today — ALIVE" }] }),
  component: TodayPage,
});

type Screen = "portal" | "mood" | "cards" | "done";

type SessionState = {
  mood_x: number;
  mood_y: number;
  mood_color: string;
  mood_label: string;
  cards_swiped?: SwipeResult[];
};

function TodayPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("portal");
  const [session, setSession] = useState<SessionState | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("users")
        .select("streak")
        .eq("id", u.user.id)
        .maybeSingle();
      setStreak(data?.streak ?? 0);
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground overflow-hidden isolate">
      <BackgroundAtmos />
      <AnimatePresence mode="wait">
        {screen === "portal" && (
          <motion.div
            key="portal"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <PortalScreen onBegin={() => setScreen("mood")} />
          </motion.div>
        )}
        {screen === "mood" && (
          <motion.div
            key="mood"
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <MoodScreen
              onConfirm={(s) => {
                setSession(s);
                setScreen("cards");
              }}
            />
          </motion.div>
        )}
        {screen === "cards" && (
          <motion.div
            key="cards"
            className="absolute inset-0"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          >
            <SparkCards
              streak={streak}
              onExit={() => navigate({ to: "/" })}
              onComplete={(results) => {
                setSession((s) => (s ? { ...s, cards_swiped: results } : s));
                setScreen("done");
              }}
            />
          </motion.div>
        )}
        {screen === "done" && (
          <motion.div
            key="done"
            className="absolute inset-0 flex items-center justify-center px-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <DonePreview session={session} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/* ────────────────────────────── BACKGROUND ────────────────────────────── */
function BackgroundAtmos() {
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 25%, oklch(0.74 0.12 85 / 0.10), transparent 65%), radial-gradient(ellipse 100% 80% at 50% 120%, oklch(0 0 0 / 0.92), transparent 60%)",
        }}
      />
      <GoldParticles density={40} />
    </>
  );
}

/* ────────────────────────────── SCREEN 1 ────────────────────────────── */
function PortalScreen({ onBegin }: { onBegin: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("friend");
  const [greeting, setGreeting] = useState("");
  const [existing, setExisting] = useState<null | { id: string }>(null);
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(0); // 0: greeting, 1: today is yours, 2: capture, 3: tap
  const [tapped, setTapped] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(
      hour < 5
        ? "Late night"
        : hour < 12
        ? "Good morning"
        : hour < 17
        ? "Good afternoon"
        : hour < 21
        ? "Good evening"
        : "Quiet night",
    );

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const meta = (u.user.user_metadata?.name as string | undefined) ?? null;
      const fromRow = await supabase
        .from("users")
        .select("name")
        .eq("id", u.user.id)
        .maybeSingle();
      const n = (fromRow.data?.name ?? meta ?? u.user.email?.split("@")[0] ?? "friend")
        .split(" ")[0];
      setName(n);

      const today = new Date().toISOString().slice(0, 10);
      const { data: entry } = await supabase
        .from("diary_entries")
        .select("id")
        .eq("user_id", u.user.id)
        .eq("date", today)
        .maybeSingle();
      if (entry) setExisting({ id: entry.id });
      setChecking(false);
    })();
  }, []);

  useEffect(() => {
    if (checking || existing) return;
    if (step >= 3) return;
    const delays = [600, 1500, 1400, 0];
    const t = setTimeout(() => setStep((s) => s + 1), delays[step]);
    return () => clearTimeout(t);
  }, [step, checking, existing]);

  if (checking) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <Orb size={120} pulse />
      </div>
    );
  }

  if (existing) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <Orb size={140} pulse />
        <h2 className="mt-10 font-display text-3xl md:text-4xl tracking-tight">
          You already captured today.
        </h2>
        <p className="mt-3 text-muted-foreground italic max-w-md">
          Tomorrow will offer its own questions. Or revisit what you wrote.
        </p>
        <div className="mt-10 flex flex-col gap-3 w-full max-w-xs">
          <GoldButton
            type="button"
            onClick={() => navigate({ to: "/today", search: { view: existing.id } as never })}
          >
            View Today's Entry
          </GoldButton>
          <button
            type="button"
            onClick={onBegin}
            className="text-sm text-muted-foreground hover:text-gold-light transition tracking-[0.2em] uppercase"
          >
            Redo session
          </button>
        </div>
      </div>
    );
  }

  function handleTap() {
    if (tapped) return;
    setTapped(true);
    setTimeout(onBegin, 700);
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        animate={tapped ? { scale: 14, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.55, 0, 0.7, 1] }}
      >
        <Orb size={180} pulse />
      </motion.div>

      <div className="mt-12 min-h-[140px] space-y-3">
        <AnimatePresence>
          {step >= 1 && (
            <motion.p
              key="g"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-display text-3xl md:text-4xl tracking-tight"
            >
              {greeting},{" "}
              <span className="italic text-gold-light">{name}.</span>
            </motion.p>
          )}
          {step >= 2 && (
            <motion.p
              key="t"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-body text-lg text-muted-foreground italic"
            >
              Today is yours.
            </motion.p>
          )}
          {step >= 3 && (
            <motion.p
              key="c"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-body text-lg text-muted-foreground italic"
            >
              Let's capture it.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {step >= 3 && !tapped && (
          <motion.button
            key="tap"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6 }}
            onClick={handleTap}
            className="relative mt-14 text-[11px] uppercase tracking-[0.5em] text-gold-light"
          >
            <span className="relative z-10">Tap to Begin</span>
            <motion.span
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-40 rounded-full"
              style={{ border: "1px solid rgba(240,201,106,0.4)" }}
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function Orb({ size, pulse }: { size: number; pulse?: boolean }) {
  return (
    <motion.div
      className="rounded-full relative"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 35% 30%, #FFE8A8 0%, #F0C96A 30%, #C9A84C 60%, rgba(201,168,76,0.15) 100%)",
        boxShadow:
          "0 0 80px 18px rgba(240,201,106,0.32), 0 0 160px 40px rgba(201,168,76,0.18), inset 0 -20px 40px rgba(120,80,20,0.3)",
      }}
      animate={pulse ? { scale: [1, 1.07, 1] } : undefined}
      transition={pulse ? { duration: 3.4, repeat: Infinity, ease: "easeInOut" } : undefined}
    />
  );
}

/* ────────────────────────────── SCREEN 2 ────────────────────────────── */
const MOOD_LABELS: Record<string, string[]> = {
  tr: ["Energized", "Motivated", "Grateful"], // top-right
  tl: ["Calm", "Reflective", "Peaceful"],
  br: ["Angry", "Frustrated", "Intense"],
  bl: ["Drained", "Heavy", "Sad"],
};

// Map (x,y) in [-1, 1] to one of the four corner color anchors via bilinear interp.
function moodColorFor(x: number, y: number): string {
  // x: -1 left (heavy/low) → +1 right (alive/high)
  // y: -1 bottom (dark) → +1 top (bright)
  // Corners:
  const TR = [201, 168, 76];   // warm gold #C9A84C
  const TL = [232, 184, 109];  // soft amber #E8B86D
  const BR = [139, 58, 58];    // storm red #8B3A3A
  const BL = [26, 26, 62];     // deep navy #1A1A3E
  const u = (x + 1) / 2; // 0..1 left→right
  const v = (y + 1) / 2; // 0..1 bottom→top
  const top = TL.map((tl, i) => tl + (TR[i] - tl) * u);
  const bot = BL.map((bl, i) => bl + (BR[i] - bl) * u);
  const c = top.map((t, i) => Math.round(bot[i] + (t - bot[i]) * v));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function emotionFor(x: number, y: number): string {
  const r = Math.hypot(x, y);
  if (r < 0.18) return "Quietly Centered";
  const corner = x >= 0 ? (y >= 0 ? "tr" : "br") : y >= 0 ? "tl" : "bl";
  const list = MOOD_LABELS[corner];
  // Weight by distance from corner (closer to corner = first label)
  const idx = Math.min(list.length - 1, Math.floor((1 - r) * list.length));
  const map: Record<string, string> = {
    tr: ["Fully Alive", "Motivated", "Quietly Determined"][idx] ?? list[0],
    tl: ["Deeply Peaceful", "Reflective", "Softly Calm"][idx] ?? list[0],
    br: ["Burning", "Frustrated", "Tense"][idx] ?? list[0],
    bl: ["Heavy", "Worn Thin", "Quietly Sad"][idx] ?? list[0],
  };
  return map[corner];
}

function MoodScreen({ onConfirm }: { onConfirm: (s: SessionState) => void }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [normX, setNormX] = useState(0);
  const [normY, setNormY] = useState(0);
  const [bounds, setBounds] = useState({ w: 320, h: 320 });
  const [moved, setMoved] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function measure() {
      if (!areaRef.current) return;
      const r = areaRef.current.getBoundingClientRect();
      const s = Math.min(r.width, r.height);
      setBounds({ w: s, h: s });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Update normalized coords whenever motion values change
  useEffect(() => {
    const unsubX = x.on("change", (v) => {
      const half = bounds.w / 2;
      setNormX(Math.max(-1, Math.min(1, v / half)));
    });
    const unsubY = y.on("change", (v) => {
      const half = bounds.h / 2;
      // Invert Y so up = positive
      setNormY(Math.max(-1, Math.min(1, -v / half)));
    });
    return () => {
      unsubX();
      unsubY();
    };
  }, [x, y, bounds]);

  // Idle detection
  useEffect(() => {
    if (!moved) return;
    setShowCta(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setShowCta(true), 5000);
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [normX, normY, moved]);

  const color = useMemo(() => moodColorFor(normX, normY), [normX, normY]);
  const emotion = useMemo(
    () => (moved ? emotionFor(normX, normY) : "Take your time…"),
    [moved, normX, normY],
  );

  const dragRadius = bounds.w / 2;
  const orbSize = useTransform([x, y], ([vx, vy]: number[]) => {
    const r = Math.hypot(vx as number, vy as number) / dragRadius;
    return 150 + r * 30;
  });

  function confirm() {
    onConfirm({
      mood_x: normX,
      mood_y: normY,
      mood_color: color,
      mood_label: emotion,
    });
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between py-10 px-6">
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.5em] text-gold/70">Step 1 of 6</p>
        <h2 className="mt-3 font-display text-2xl md:text-3xl tracking-tight">
          Where are you, right now?
        </h2>
      </div>

      {/* Drag area */}
      <div className="relative flex-1 w-full max-w-md flex items-center justify-center my-6">
        <div
          ref={areaRef}
          className="relative w-full aspect-square rounded-full"
          style={{
            background:
              "radial-gradient(circle at center, rgba(201,168,76,0.06), transparent 70%)",
            border: "1px dashed rgba(201,168,76,0.18)",
          }}
        >
          {/* Axis labels */}
          <AxisLabel pos="top">Bright</AxisLabel>
          <AxisLabel pos="bottom">Dark</AxisLabel>
          <AxisLabel pos="left">Heavy</AxisLabel>
          <AxisLabel pos="right">Alive</AxisLabel>

          {/* Center crosshair */}
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-px w-12 bg-gold/15"
          />
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-12 bg-gold/15"
          />

          {/* Floating mood word hints */}
          <CornerWords corner="tr" active={normX > 0.3 && normY > 0.3} />
          <CornerWords corner="tl" active={normX < -0.3 && normY > 0.3} />
          <CornerWords corner="br" active={normX > 0.3 && normY < -0.3} />
          <CornerWords corner="bl" active={normX < -0.3 && normY < -0.3} />

          {/* The orb */}
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.08}
            dragConstraints={{
              top: -dragRadius * 0.85,
              bottom: dragRadius * 0.85,
              left: -dragRadius * 0.85,
              right: dragRadius * 0.85,
            }}
            onDragStart={() => setMoved(true)}
            style={{
              x,
              y,
              width: orbSize,
              height: orbSize,
              background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35), ${color} 55%, rgba(0,0,0,0.4) 100%)`,
              boxShadow: `0 0 60px 10px ${color}66, 0 0 140px 30px ${color}33, inset 0 -20px 40px rgba(0,0,0,0.45)`,
            }}
            className="absolute top-1/2 left-1/2 rounded-full cursor-grab active:cursor-grabbing -translate-x-1/2 -translate-y-1/2 touch-none"
            whileDrag={{ scale: 1.04 }}
            animate={!moved ? { scale: [1, 1.04, 1] } : undefined}
            transition={
              !moved
                ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
          />
        </div>
      </div>

      {/* Detected emotion + CTA */}
      <div className="text-center w-full max-w-sm">
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          You feel
        </p>
        <motion.p
          key={emotion}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-2 font-display text-2xl md:text-3xl text-gold-light italic"
        >
          {emotion}
        </motion.p>

        <AnimatePresence>
          {showCta && (
            <motion.button
              key="cta"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              onClick={confirm}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-[14px] text-sm tracking-[0.2em] uppercase text-gold-light"
              style={{
                border: "1px solid rgba(240,201,106,0.5)",
                background:
                  "linear-gradient(160deg, rgba(201,168,76,0.12), rgba(22,22,31,0.6))",
                boxShadow: "0 10px 30px -10px rgba(240,201,106,0.35)",
              }}
            >
              This feels right
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {!showCta && moved && (
          <p className="mt-4 text-xs text-muted-foreground/70 italic">
            Drag the orb until it matches.
          </p>
        )}
        {!moved && (
          <p className="mt-4 text-xs text-muted-foreground/70 italic">
            Drag the orb across the space.
          </p>
        )}
      </div>
    </div>
  );
}

function AxisLabel({
  pos,
  children,
}: {
  pos: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}) {
  const map = {
    top: "top-2 left-1/2 -translate-x-1/2",
    bottom: "bottom-2 left-1/2 -translate-x-1/2",
    left: "left-2 top-1/2 -translate-y-1/2",
    right: "right-2 top-1/2 -translate-y-1/2",
  } as const;
  return (
    <span
      className={`absolute ${map[pos]} text-[10px] uppercase tracking-[0.4em] text-gold/70`}
    >
      {children}
    </span>
  );
}

function CornerWords({
  corner,
  active,
}: {
  corner: "tr" | "tl" | "br" | "bl";
  active: boolean;
}) {
  const words = MOOD_LABELS[corner];
  const posMap: Record<string, string> = {
    tr: "top-8 right-8 text-right",
    tl: "top-8 left-8 text-left",
    br: "bottom-8 right-8 text-right",
    bl: "bottom-8 left-8 text-left",
  };
  return (
    <motion.div
      className={`absolute ${posMap[corner]} space-y-1 pointer-events-none`}
      animate={{ opacity: active ? 1 : 0.18 }}
      transition={{ duration: 0.5 }}
    >
      {words.map((w) => (
        <div
          key={w}
          className="font-body text-xs italic text-gold-light/90"
          style={{ textShadow: "0 0 12px rgba(240,201,106,0.4)" }}
        >
          {w}
        </div>
      ))}
    </motion.div>
  );
}

/* ────────────────────────────── DONE PREVIEW ────────────────────────────── */
function DonePreview({ session }: { session: SessionState | null }) {
  if (!session) return null;
  return (
    <div className="max-w-md">
      <div
        className="mx-auto h-32 w-32 rounded-full mb-8"
        style={{
          background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.3), ${session.mood_color} 55%, rgba(0,0,0,0.4) 100%)`,
          boxShadow: `0 0 60px 10px ${session.mood_color}66`,
        }}
      />
      <p className="text-[10px] uppercase tracking-[0.5em] text-gold/70 mb-3">
        Captured
      </p>
      <h2 className="font-display text-3xl md:text-4xl tracking-tight">
        You feel{" "}
        <span className="italic text-gold-light">{session.mood_label}.</span>
      </h2>
      <p className="mt-4 text-muted-foreground italic">
        The rest of your session continues from here.
      </p>
    </div>
  );
}
