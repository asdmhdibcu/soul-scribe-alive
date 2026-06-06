import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { BookOpen } from "lucide-react";
import { GoldParticles } from "@/components/landing/atmos";

export const Route = createFileRoute("/_authenticated/life-book")({
  head: () => ({ meta: [{ title: "Life Book — ALIVE" }] }),
  component: LifeBookPage,
});

function LifeBookPage() {
  const year = new Date().getFullYear();
  return (
    <div className="relative min-h-screen text-foreground overflow-hidden">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 10%, oklch(0.74 0.12 85 / 0.10), transparent 65%), radial-gradient(ellipse 100% 80% at 50% 110%, oklch(0 0 0 / 0.9), transparent 60%)",
        }}
      />
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-60">
        <GoldParticles density={28} />
      </div>

      <div className="mx-auto max-w-3xl px-6 pt-20 pb-24 text-center">
        <p className="text-[10px] uppercase tracking-[0.5em] text-gold/70 mb-6">
          Coming soon
        </p>
        <h1 className="font-display tracking-tight text-4xl md:text-6xl text-gold-light">
          📖 Life Book
        </h1>
        <p
          className="mt-6 text-lg md:text-xl text-muted-foreground italic max-w-xl mx-auto"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Your year, beautifully remembered.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 mx-auto max-w-md"
        >
          <div
            className="relative rounded-[18px] p-10 text-left"
            style={{
              background:
                "linear-gradient(180deg, rgba(28,28,40,0.95), rgba(18,18,28,0.95))",
              border: "1px solid rgba(240,201,106,0.35)",
              borderTop: "3px solid rgba(240,201,106,0.7)",
              boxShadow: "0 30px 80px -30px rgba(240,201,106,0.35)",
            }}
          >
            <div className="flex items-center gap-3 text-gold-light">
              <BookOpen className="h-5 w-5" strokeWidth={1.4} />
              <p className="text-[10px] uppercase tracking-[0.35em]">
                The {year} Edition
              </p>
            </div>
            <h2 className="mt-5 font-display text-2xl md:text-3xl text-gold-light">
              A book of your year, written by your year.
            </h2>
            <p
              className="mt-5 text-sm md:text-base text-foreground/80 leading-relaxed"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Every December, ALIVE quietly gathers your best entries,
              the memories that mattered, the patterns in your moods,
              the lessons you returned to, and the photos that held
              something — and binds them into a single, beautiful digital book.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-foreground/85">
              {[
                "Your best entries of the year",
                "Key memories and moments",
                "Your mood landscape, mapped",
                "Lessons you returned to",
                "The photos that mattered",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold-light shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.3em] text-gold-light"
              style={{ border: "1px solid rgba(240,201,106,0.4)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gold-light animate-pulse" />
              Compiling soon
            </div>
          </div>
        </motion.div>

        <p className="mt-12 text-sm text-muted-foreground italic">
          The more you write today, the richer your Life Book becomes.
        </p>
        <div className="mt-6">
          <Link
            to="/today"
            className="inline-flex items-center justify-center rounded-[14px] bg-gradient-gold px-8 py-3.5 font-medium text-primary-foreground tracking-wide shadow-premium hover:scale-[1.02] transition-transform"
          >
            Today's Session
          </Link>
        </div>
      </div>
    </div>
  );
}
