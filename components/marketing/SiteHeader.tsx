"use client";

import Link from "next/link";
import { useState } from "react";
import Logo from "@/components/Logo";
import { buttonClass } from "@/components/ui";

const NAV = [
  { href: "/connectors", label: "Data sources" },
  { href: "/destinations", label: "Destinations" },
  { href: "/attribution", label: "Attribution" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "API docs" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className={buttonClass("secondary", "sm")}>
            Log in
          </Link>
          <Link href="/signup" className={buttonClass("primary", "sm")}>
            Start free trial
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open ? (
        <div className="border-t border-ink-200 bg-white px-5 py-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-3 flex gap-2">
            <Link href="/login" className={buttonClass("secondary", "sm") + " flex-1"}>
              Log in
            </Link>
            <Link href="/signup" className={buttonClass("primary", "sm") + " flex-1"}>
              Start free
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
