import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { GoldParticles } from "@/components/landing/atmos";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-[100svh] bg-background text-foreground overflow-hidden flex items-center justify-center px-5 py-12 isolate">
      {/* Vignette */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 30%, oklch(0.74 0.12 85 / 0.16), transparent 65%), radial-gradient(ellipse 100% 80% at 50% 120%, oklch(0 0 0 / 0.95), transparent 60%)",
        }}
      />
      <GoldParticles density={50} />

      <div className="relative w-full max-w-md">
        <Link to="/" className="block text-center mb-8 group">
          <h1
            className="font-display text-4xl tracking-[0.35em] font-bold"
            style={{
              backgroundImage:
                "linear-gradient(100deg, #C9A84C 0%, #F0C96A 35%, #FFE8A8 50%, #F0C96A 65%, #C9A84C 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 0 24px rgba(201,168,76,0.25))",
            }}
          >
            ALIVE
          </h1>
          <p className="mt-2 text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
            A daily ritual
          </p>
        </Link>

        <div
          className="relative rounded-[20px] border border-gold/30 bg-card/90 backdrop-blur-xl p-8 md:p-10"
          style={{
            boxShadow:
              "0 30px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.08), inset 0 1px 0 rgba(255,232,168,0.05)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-px left-8 right-8 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(240,201,106,0.8), transparent)",
            }}
          />

          <h2 className="font-display text-3xl text-foreground mb-2 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground italic mb-8">{subtitle}</p>
          )}
          {!subtitle && <div className="mb-6" />}

          {children}

          {footer && (
            <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}

export function authInputClass(extra = "") {
  return [
    "w-full bg-transparent border-0 border-b border-border rounded-none px-0 py-2.5",
    "font-body text-lg text-foreground placeholder:text-muted-foreground/40",
    "focus:outline-none focus:border-gold transition-colors",
    extra,
  ].join(" ");
}

export function GoldButton({
  children,
  loading,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="group relative w-full overflow-hidden rounded-[14px] px-6 py-4 font-medium tracking-[0.15em] uppercase text-sm text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
      style={{
        background:
          "linear-gradient(100deg, #C9A84C 0%, #F0C96A 50%, #C9A84C 100%)",
        boxShadow:
          "0 10px 30px -10px rgba(201,168,76,0.5), inset 0 1px 0 rgba(255,232,168,0.6)",
      }}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span>One moment…</span>
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-[10px] border px-4 py-3 text-sm"
      style={{
        borderColor: "rgba(220,80,80,0.35)",
        background: "rgba(220,80,80,0.08)",
        color: "#F0C96A",
      }}
    >
      <span className="text-[#F0C96A]">{message}</span>
    </div>
  );
}
