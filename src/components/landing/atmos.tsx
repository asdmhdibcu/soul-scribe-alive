import { useEffect, useRef, useState } from "react";

/** Drifting gold particles canvas — subtle, premium, GPU-light. */
export function GoldParticles({ density = 60 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; tw: number };
    let parts: P[] = [];

    function resize() {
      if (!canvas) return;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: density }, () => spawn(true));
    }

    function spawn(initial: boolean): P {
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : h + 10,
        vx: (Math.random() - 0.5) * 0.08,
        vy: -0.08 - Math.random() * 0.18,
        r: 0.4 + Math.random() * 1.6,
        a: 0.15 + Math.random() * 0.55,
        tw: Math.random() * Math.PI * 2,
      };
    }

    function tick() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.tw += 0.02;
        const alpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
        const g = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        g.addColorStop(0, `rgba(240, 201, 106, ${alpha})`);
        g.addColorStop(1, "rgba(240, 201, 106, 0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.fillStyle = `rgba(255, 230, 170, ${Math.min(1, alpha + 0.15)})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();

        if (p.y < -20 || p.x < -20 || p.x > w + 20) {
          Object.assign(p, spawn(false));
        }
      }
      raf = requestAnimationFrame(tick);
    }

    resize();
    tick();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

/** Reveal on scroll. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: As = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <As
      ref={ref as React.Ref<HTMLElement>}
      style={{ transitionDelay: `${delay}ms` }}
      className={[
        "transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      ].join(" ")}
    >
      {children}
    </As>
  );
}
