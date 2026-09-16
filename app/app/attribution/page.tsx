import Link from "next/link";
import BarChart from "@/components/charts/BarChart";
import RankedBars from "@/components/charts/RankedBars";
import DateRangePicker from "@/components/app/DateRangePicker";
import { ButtonLink, Card, CardHeader, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  ATTRIBUTION_MODELS,
  attribute,
  attributionChannels,
  channelLabel,
  generateJourneys,
  pathLengthDistribution,
  topPaths,
  type AttributionModel,
} from "@/lib/attribution";
import { formatCurrency, formatNumber } from "@/lib/format";
import { resolveRange } from "@/lib/metrics";
import { listConnections } from "@/lib/store";

export default async function AttributionPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; model?: string }>;
}) {
  const user = await requireUser();
  const { range, model: modelParam } = await searchParams;

  const connections = listConnections(user.id).filter((c) => c.status !== "paused");
  const channels = attributionChannels(connections.map((c) => c.connector));

  if (channels.length < 2) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          title="Attribution needs at least two acquisition sources"
          body="Paths are stitched across channels that can win a visit, such as ad platforms, social, email and organic search. Analytics and store connectors measure the conversion rather than earning credit for it."
          action={<ButtonLink href="/app/connectors">Connect another source</ButtonLink>}
        />
      </div>
    );
  }

  const model = (ATTRIBUTION_MODELS.some((m) => m.id === modelParam) ? modelParam : "markov") as AttributionModel;
  const { from, to } = resolveRange(range ?? "last_30d");
  const journeys = generateJourneys({ channels, from, to });

  const selected = attribute(journeys, model);
  const lastClick = attribute(journeys, "last_click");
  const lastClickByChannel = new Map(lastClick.map((c) => [c.channel, c]));

  const allModels = ATTRIBUTION_MODELS.map((m) => ({
    model: m,
    credits: m.id === model ? selected : m.id === "last_click" ? lastClick : attribute(journeys, m.id),
  }));

  const orderedChannels = lastClick.map((c) => c.channel);
  const comparisonData = orderedChannels.map((channel) => ({
    label: channelLabel(channel).replace(" Ads", ""),
    segments: allModels
      .filter((entry) => ["last_click", "linear", "markov"].includes(entry.model.id))
      .map((entry) => ({
        key: entry.model.id,
        label: entry.model.label,
        value: Math.round(entry.credits.find((c) => c.channel === channel)?.conversions ?? 0),
      })),
  }));

  const distribution = pathLengthDistribution(journeys);
  const paths = topPaths(journeys, 10);
  const totalRevenue = journeys.reduce((a, j) => a + j.revenue, 0);
  const assistedShare =
    journeys.length === 0 ? 0 : (journeys.filter((j) => j.path.length > 1).length / journeys.length) * 100;

  return (
    <div className="p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Attribution</h1>
          <p className="mt-1 text-sm text-ink-500">
            {formatNumber(journeys.length)} conversions · {formatCurrency(totalRevenue)} revenue ·{" "}
            {assistedShare.toFixed(0)}% involved more than one touch
          </p>
        </div>
        <DateRangePicker />
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {ATTRIBUTION_MODELS.map((item) => (
          <Link
            key={item.id}
            href={"/app/attribution?model=" + item.id + (range ? "&range=" + range : "")}
            className={
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors " +
              (item.id === model
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 bg-white text-ink-500 hover:border-brand-300 hover:text-brand-700")
            }
          >
            {item.label}
          </Link>
        ))}
      </div>

      <p className="mt-3 text-sm text-ink-500">
        {ATTRIBUTION_MODELS.find((m) => m.id === model)?.blurb}
      </p>

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Credit by channel"
            subtitle={"Under " + ATTRIBUTION_MODELS.find((m) => m.id === model)?.label + ", against last click"}
          />
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Channel</th>
                  <th className="px-5 py-2.5 text-right font-medium">Conversions</th>
                  <th className="px-5 py-2.5 text-right font-medium">Revenue</th>
                  <th className="px-5 py-2.5 text-right font-medium">Last click</th>
                  <th className="px-5 py-2.5 text-right font-medium">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {selected.map((credit) => {
                  const base = lastClickByChannel.get(credit.channel)?.conversions ?? 0;
                  const delta = credit.conversions - base;
                  const pct = base ? (delta / base) * 100 : null;
                  return (
                    <tr key={credit.channel} className="hover:bg-ink-50">
                      <td className="px-5 py-3 text-ink-700">{channelLabel(credit.channel)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-ink-900">
                        {formatNumber(credit.conversions, 1)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-ink-900">
                        {formatCurrency(credit.revenue)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-ink-400">{formatNumber(base, 1)}</td>
                      <td
                        className="px-5 py-3 text-right tabular-nums font-medium"
                        style={{ color: delta >= 0 ? "var(--status-good)" : "var(--status-bad)" }}
                      >
                        {delta >= 0 ? "+" : ""}
                        {formatNumber(delta, 1)}
                        {pct !== null ? (
                          <span className="ml-1 font-normal text-ink-400">
                            ({pct >= 0 ? "+" : ""}
                            {pct.toFixed(0)}%)
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Revenue credit" subtitle={ATTRIBUTION_MODELS.find((m) => m.id === model)?.label} />
          <div className="p-5">
            <RankedBars
              metric="revenue"
              data={selected.map((credit) => ({
                label: channelLabel(credit.channel),
                value: credit.revenue,
                sub: formatNumber(credit.conversions, 1) + " conversions",
              }))}
            />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Model comparison" subtitle="Last click vs linear vs data driven" />
          <div className="p-5">
            <BarChart data={comparisonData} stacked={false} metric="conversions" height={290} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Touches before conversion" />
          <div className="p-5">
            <RankedBars
              metric="conversions"
              colorByIndex={false}
              data={distribution.map((bucket) => ({
                label: bucket.label + (bucket.touches === 1 ? " touch" : " touches"),
                value: bucket.conversions,
              }))}
            />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Top conversion paths" subtitle="Ordered by frequency in the selected window" />
        <ul className="divide-y divide-ink-200">
          {paths.map((path) => (
            <li key={path.path.join(">")} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
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
                {formatNumber(path.conversions)} conversions · {formatCurrency(path.revenue)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
