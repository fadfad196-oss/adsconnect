"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ConnectorMark } from "@/components/ui";
import { CATEGORIES, type Connector } from "@/lib/catalog";

interface Props {
  connectors: Connector[];
  initialCategory?: string;
  /** Where a card links to: the marketing detail page or the in-app connect flow. */
  hrefBase?: string;
  cta?: string;
  connectedSlugs?: string[];
}

export default function ConnectorBrowser({
  connectors,
  initialCategory,
  hrefBase = "/connectors/",
  cta,
  connectedSlugs = [],
}: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory ?? "All");
  const connected = useMemo(() => new Set(connectedSlugs), [connectedSlugs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return connectors.filter((connector) => {
      if (category !== "All" && connector.category !== category) return false;
      if (!q) return true;
      return (
        connector.name.toLowerCase().includes(q) ||
        connector.category.toLowerCase().includes(q) ||
        connector.tagline.toLowerCase().includes(q)
      );
    });
  }, [connectors, query, category]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const connector of connectors) {
      map.set(connector.category, (map.get(connector.category) ?? 0) + 1);
    }
    return map;
  }, [connectors]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search data sources"
            className="h-11 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="text-sm text-ink-400">
          {filtered.length} source{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["All", ...CATEGORIES].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors " +
              (category === item
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 bg-white text-ink-500 hover:border-brand-300 hover:text-brand-700")
            }
          >
            {item}
            {item !== "All" ? <span className="ml-1.5 opacity-60">{counts.get(item) ?? 0}</span> : null}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((connector) => (
          <Link
            key={connector.slug}
            href={hrefBase + connector.slug}
            className="group flex h-full flex-col rounded-xl border border-ink-200 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <ConnectorMark name={connector.name} color={connector.color} />
              {connected.has(connector.slug) ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  Connected
                </span>
              ) : connector.popular ? (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                  Popular
                </span>
              ) : null}
            </div>
            <h3 className="mt-3.5 text-sm font-semibold text-ink-900 group-hover:text-brand-700">
              {connector.name}
            </h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-500">{connector.tagline}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-ink-400">
              <span>{connector.category}</span>
              <span className="font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
                {cta ?? "View details"} →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-ink-500">
          Nothing matches “{query}”. We add sources on request, so tell us what you need.
        </p>
      ) : null}
    </div>
  );
}
