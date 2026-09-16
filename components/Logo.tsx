import Link from "next/link";

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--series-1)" />
      <circle cx="10.5" cy="11" r="3.1" fill="#fff" />
      <circle cx="10.5" cy="21" r="3.1" fill="#fff" opacity="0.75" />
      <circle cx="22" cy="16" r="3.6" fill="#fff" />
      <path d="M13.2 12.3 18.8 15M13.2 19.7 18.8 17" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <LogoMark />
      <span className={"text-[17px] font-semibold tracking-tight " + (light ? "text-white" : "text-ink-900")}>
        AdsConnect
      </span>
    </Link>
  );
}
