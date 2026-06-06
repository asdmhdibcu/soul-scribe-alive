import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { GoldParticles } from "@/components/landing/atmos";

const PHRASES = [
  "Reading your day…",
  "Finding your patterns…",
  "Hearing what you didn't say…",
  "Writing your story…",
  "Almost ready…",
];

export function GenerationChamber({
  moodColor,
  hasPhotos,
  hasVoice,
  hasText,
  cardsCount,
}: {
  moodColor: string;
  hasPhotos: boolean;
  hasVoice: boolean;
  hasText: boolean;
  cardsCount: number;
}) {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setPhraseIdx((i) => (i + 1) % PHRASES.length),
      2000,
    );
    return () => clearInterval(t);
  }, []);

  // Elements that fly in toward center
  const elements = [
    { type: "mood", angle: 0 },
    ...Array.from({ length: Math.min(cardsCount, 6) }).map((_, i) => ({
      type: "card",
      angle: 30 + i * 50,
    })),
    ...(hasPhotos ? [{ type: "photo", angle: 220 }] : []),
    ...(hasVoice ? [{ type: "voice", angle: 280 }] : []),
    ...(hasText ? [{ type: "text", angle: 320 }] : []),
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
      <GoldParticles density={50} />

      {/* Central merging orb */}
      <div className="relative h-72 w-72 flex items-center justify-center">
        {elements.map((el, i) => {
          const rad = (el.angle * Math.PI) / 180;
          const dist = 280;
          const fromX = Math.cos(rad) * dist;
          const fromY = Math.sin(rad) * dist;
          return (
            <motion.div
              key={i}
              className="absolute rounded-xl flex items-center justify-center text-xs"
              initial={{ x: fromX, y: fromY, scale: 1, opacity: 0 }}
              animate={{
                x: 0,
                y: 0,
                scale: 0.3,
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 2.4,
                delay: i * 0.25,
                repeat: Infinity,
                repeatDelay: 1.5,
                ease: [0.5, 0, 0.4, 1],
              }}
              style={{
                width: el.type === "mood" ? 44 : 36,
                height: el.type === "mood" ? 44 : 36,
                background:
                  el.type === "mood"
                    ? `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.3), ${moodColor})`
                    : el.type === "photo"
                    ? "linear-gradient(135deg, rgba(240,201,106,0.4), rgba(120,80,20,0.6))"
                    : el.type === "voice"
                    ? "linear-gradient(135deg, rgba(240,201,106,0.3), rgba(22,22,31,0.8))"
                    : "linear-gradient(135deg, rgba(28,28,40,0.95), rgba(40,30,15,0.95))",
                border: "1px solid rgba(240,201,106,0.4)",
                borderRadius: el.type === "mood" ? "50%" : "10px",
                color: "#F0C96A",
                boxShadow: "0 0 18px rgba(240,201,106,0.35)",
              }}
            >
              {el.type === "card" && "✦"}
              {el.type === "photo" && "📸"}
              {el.type === "voice" && "🎤"}
              {el.type === "text" && "✍"}
            </motion.div>
          );
        })}

        {/* The growing gold orb at center */}
        <motion.div
          className="rounded-full"
          style={{
            width: 180,
            height: 180,
            background:
              "radial-gradient(circle at 35% 30%, #FFE8A8 0%, #F0C96A 35%, #C9A84C 65%, rgba(201,168,76,0.15) 100%)",
            boxShadow:
              "0 0 90px 24px rgba(240,201,106,0.4), 0 0 200px 60px rgba(201,168,76,0.22), inset 0 -20px 40px rgba(120,80,20,0.3)",
          }}
          animate={{ scale: [1, 1.08, 1], rotate: [0, 360] }}
          transition={{
            scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 24, repeat: Infinity, ease: "linear" },
          }}
        />

        {/* Concentric pulse rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 200,
              height: 200,
              border: "1px solid rgba(240,201,106,0.4)",
            }}
            animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 1,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      <div className="mt-16 h-8 text-center">
        <motion.p
          key={phraseIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="font-display text-lg md:text-xl italic text-gold-light tracking-wide"
        >
          {PHRASES[phraseIdx]}
        </motion.p>
      </div>
    </div>
  );
}
