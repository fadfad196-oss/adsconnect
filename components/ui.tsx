import Link from "next/link";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={"rounded-xl border border-ink-200 bg-white " + className}>{children}</div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 border border-transparent",
  secondary: "bg-white text-ink-700 hover:bg-ink-50 border border-ink-200",
  ghost: "bg-transparent text-ink-500 hover:text-ink-900 hover:bg-ink-100 border border-transparent",
  danger: "bg-white text-[var(--status-bad)] hover:bg-red-50 border border-ink-200",
};

const SIZES = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: keyof typeof SIZES = "md") {
  return (
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
    BUTTON_STYLES[variant] +
    " " +
    SIZES[size]
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size) + " " + className}>
      {children}
    </Link>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "brand";
}) {
  const tones = {
    neutral: "bg-ink-100 text-ink-700",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    bad: "bg-red-50 text-red-700",
    brand: "bg-brand-50 text-brand-700",
  };
  return (
    <span className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " + tones[tone]}>
      {children}
    </span>
  );
}

export function StatusDot({ tone }: { tone: "good" | "warn" | "bad" | "neutral" }) {
  const colors = {
    good: "var(--status-good)",
    warn: "var(--status-warn)",
    bad: "var(--status-bad)",
    neutral: "var(--text-muted)",
  };
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: colors[tone] }} />;
}

/**
 * Connector marks are rendered as initials on the platform's brand colour rather
 * than shipping third-party logo files.
 */
export function ConnectorMark({
  name,
  color,
  size = 36,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const initials = name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const light = isLight(color);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg font-semibold"
      style={{
        width: size,
        height: size,
        background: color,
        color: light ? "#0b1220" : "#ffffff",
        fontSize: size * 0.38,
        boxShadow: light ? "inset 0 0 0 1px rgba(11,18,32,0.12)" : undefined,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function isLight(hex: string): boolean {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.72;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50 px-6 py-14 text-center">
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ink-500">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Section({
  eyebrow,
  title,
  body,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={"mx-auto w-full max-w-6xl px-5 py-16 sm:py-20 " + className}>
      <div className="mx-auto max-w-2xl text-center">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{eyebrow}</p>
        ) : null}
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">{title}</h2>
        {body ? <p className="mt-4 text-base leading-relaxed text-ink-500">{body}</p> : null}
      </div>
      {children}
    </section>
  );
}
