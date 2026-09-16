"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";

const NAV = [
  { href: "/app", label: "Overview", icon: "M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-5H4v5Zm10-11h6V4h-6v5Z" },
  { href: "/app/connectors", label: "Data sources", icon: "M4 7h10a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h12" },
  { href: "/app/destinations", label: "Pipelines", icon: "M3 6h18M3 12h18M3 18h12" },
  { href: "/app/data", label: "Data explorer", icon: "M4 5h16v4H4zM4 11h16v8H4z" },
  { href: "/app/attribution", label: "Attribution", icon: "M12 3v18M4 12h16M7 7l10 10M17 7 7 17" },
  { href: "/app/api-keys", label: "API keys", icon: "M15 7a4 4 0 1 1-3.87 5H7v3H4v-3l4-4h3.13A4 4 0 0 1 15 7Z" },
  { href: "/app/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 12h2m12 0h2M12 4v2m0 12v2" },
];

export default function AppSidebar({ user }: { user: { name: string; email: string; company: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const nav = (
    <nav className="flex-1 space-y-0.5 px-3">
      {NAV.map((item) => {
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
              (active ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-100 hover:text-ink-900")
            }
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3 lg:hidden">
        <Logo href="/app" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-ink-700 hover:bg-ink-100"
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open ? <div className="border-b border-ink-200 py-3 lg:hidden">{nav}</div> : null}

      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white lg:flex">
        <div className="px-5 py-5">
          <Logo href="/app" />
        </div>
        {nav}
        <div className="border-t border-ink-200 p-3">
          <div className="rounded-lg px-3 py-2">
            <p className="truncate text-sm font-medium text-ink-900">{user.name}</p>
            <p className="truncate text-xs text-ink-400">{user.company}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
