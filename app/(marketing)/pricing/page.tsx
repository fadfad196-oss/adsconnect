import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { TOTAL_SOURCE_COUNT } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Plans by number of data sources and refresh frequency. 30-day free trial, no credit card.",
};

const PLANS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "One source, one destination. Enough to prove the thing works.",
    features: ["1 data source", "1 destination", "Daily refresh", "3 months of history", "Community support"],
    cta: "Start free",
    href: "/signup?plan=free",
  },
  {
    name: "Basic",
    price: "$19",
    cadence: "per source / month",
    blurb: "For a single brand running a handful of channels.",
    features: [
      "Up to 5 data sources",
      "Unlimited destinations",
      "Daily refresh",
      "24 months of history",
      "Email support",
    ],
    cta: "Start free trial",
    href: "/signup?plan=basic",
  },
  {
    name: "Standard",
    price: "$49",
    cadence: "per source / month",
    highlight: true,
    blurb: "For teams that report on blended performance across channels.",
    features: [
      "Unlimited data sources",
      "Unlimited destinations",
      "Hourly refresh",
      "Full available history",
      "Multi-touch attribution",
      "REST API access",
      "Priority support",
    ],
    cta: "Start free trial",
    href: "/signup?plan=standard",
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "annual",
    blurb: "Agencies and groups running many clients under one roof.",
    features: [
      "Everything in Standard",
      "Unlimited workspaces",
      "SSO and role based access",
      "Custom connectors",
      "SLA and named contact",
      "Security review support",
    ],
    cta: "Talk to sales",
    href: "/signup?plan=enterprise",
  },
];

const COMPARISON: { label: string; values: [string, string, string, string] }[] = [
  { label: "Data sources", values: ["1", "5", "Unlimited", "Unlimited"] },
  { label: "Destinations", values: ["1", "Unlimited", "Unlimited", "Unlimited"] },
  { label: "Refresh frequency", values: ["Daily", "Daily", "Hourly", "Hourly"] },
  { label: "Historical backfill", values: ["3 months", "24 months", "All available", "All available"] },
  { label: "Attribution models", values: ["Last click", "Last click", "All 7", "All 7 + custom"] },
  { label: "REST API", values: ["-", "-", "Included", "Included"] },
  { label: "Workspaces", values: ["1", "1", "3", "Unlimited"] },
  { label: "Support", values: ["Community", "Email", "Priority", "SLA"] },
];

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Pricing</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink-900">Pay for the sources you use</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-500">
          Every plan includes the full {TOTAL_SOURCE_COUNT}+ source catalogue and every destination. The
          difference is how many sources you connect and how often they refresh.
        </p>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={
              "flex flex-col rounded-2xl border p-6 " +
              (plan.highlight ? "border-brand-500 bg-white shadow-lg ring-1 ring-brand-500" : "border-ink-200 bg-white")
            }
          >
            {plan.highlight ? (
              <span className="mb-3 inline-flex w-fit rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                Most popular
              </span>
            ) : null}
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">{plan.name}</h2>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tracking-tight text-ink-900">{plan.price}</span>
              <span className="text-xs text-ink-400">{plan.cadence}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">{plan.blurb}</p>
            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm text-ink-700">
                  <svg className="mt-0.5 shrink-0 text-brand-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <ButtonLink
              href={plan.href}
              variant={plan.highlight ? "primary" : "secondary"}
              className="mt-6 w-full"
            >
              {plan.cta}
            </ButtonLink>
          </div>
        ))}
      </div>

      <div className="mt-16 overflow-x-auto rounded-xl border border-ink-200 scrollbar-thin">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-5 py-3 font-medium">Compare plans</th>
              {PLANS.map((plan) => (
                <th key={plan.name} className="px-5 py-3 font-medium">
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {COMPARISON.map((row) => (
              <tr key={row.label}>
                <td className="px-5 py-3 font-medium text-ink-900">{row.label}</td>
                {row.values.map((value, i) => (
                  <td key={i} className="px-5 py-3 text-ink-500">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-14 rounded-2xl border border-ink-200 bg-ink-50 p-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-ink-900">Not sure which plan?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-500">
          Start on the trial with everything switched on. If you end up using two sources, you pay for two.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/signup">Start 30-day trial</ButtonLink>
          <Link
            href="/docs"
            className="inline-flex h-10 items-center rounded-lg border border-ink-200 bg-white px-4 text-sm font-medium text-ink-700 hover:bg-white/60"
          >
            Read the docs
          </Link>
        </div>
      </div>
    </div>
  );
}
