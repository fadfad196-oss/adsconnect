import type { Metadata } from "next";
import BarChart from "@/components/charts/BarChart";
import { ButtonLink } from "@/components/ui";
import { ATTRIBUTION_MODELS, attribute, channelLabel, generateJourneys, topPaths } from "@/lib/attribution";
import { resolveRange } from "@/lib/metrics";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Multi-touch attribution",
  description:
    "Compare last click, first click, linear, time decay, position based and data-driven Markov attribution on your own conversion paths.",
};

const CHANNELS = ["google-ads", "facebook-ads", "tiktok-ads", "klaviyo", "google-search-console"];
const COMPARED = ["last_click", "linear", "markov"] as const;

export default function AttributionPage() {
  const { from, to } = resolveRange("last_30d");
  const journeys = generateJourneys({ channels: CHANNELS, from, to });

  const credits = Object.fromEntries(COMPARED.map((model) => [model, attribute(journeys, model)]));
  const channels = credits.last_click.map((c) => c.channel);

  const chartData = channels.map((channel) => ({
    label: channelLabel(channel).replace(" Ads", ""),
    segments: COMPARED.map((model) => ({
      key: model,
      label: ATTRIBUTION_MODELS.find((m) => m.id === model)!.label,
      value: Math.round(credits[model].find((c) => c.channel === channel)?.conversions ?? 0),
    })),
  }));

  const paths = topPaths(journeys, 6);
  const totalConversions = journeys.length;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Attribution</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink-900">
          Last click is a reporting habit, not a finding
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-500">
          Platform-reported conversions double count and every channel claims the same order. AdsConnect
          stitches touchpoints into paths and runs seven models over them, so you can see how much of your
          top-of-funnel spend last click has been quietly writing off.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/signup">Start free trial</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            See it on demo data
          </ButtonLink>
        </div>
      </div>

      <div className="mt-12 rounded-xl border border-ink-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-ink-900">Same conversions, three models</h2>
        <p className="mt-1 text-sm text-ink-500">
          {formatNumber(totalConversions)} conversions over the last 30 days, redistributed by model.
          Prospecting channels gain, closers give back.
        </p>
        <div className="mt-6">
          <BarChart data={chartData} stacked={false} metric="conversions" height={300} />
        </div>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ATTRIBUTION_MODELS.map((model) => (
          <div key={model.id} className="rounded-xl border border-ink-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-ink-900">{model.label}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{model.blurb}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-ink-200 bg-white">
        <div className="border-b border-ink-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-ink-900">Most common conversion paths</h2>
          <p className="mt-0.5 text-xs text-ink-500">Built from stitched touchpoints, not platform reports.</p>
        </div>
        <ul className="divide-y divide-ink-200">
          {paths.map((path) => (
            <li key={path.path.join(">")} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {path.path.map((channel, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 ? <span className="text-ink-300">→</span> : null}
                    <span className="rounded-md bg-ink-100 px-2 py-1 text-xs font-medium text-ink-700">
                      {channelLabel(channel)}
                    </span>
                  </span>
                ))}
              </div>
              <span className="text-sm tabular-nums text-ink-500">
                {formatNumber(path.conversions)} conversions
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12 rounded-2xl bg-ink-900 p-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Find out what your awareness spend is actually doing
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/70">
          Connect your sources and the models run on your own paths, not a vendor benchmark.
        </p>
        <div className="mt-6 flex justify-center">
          <ButtonLink href="/signup">Start free trial</ButtonLink>
        </div>
      </div>
    </div>
  );
}
