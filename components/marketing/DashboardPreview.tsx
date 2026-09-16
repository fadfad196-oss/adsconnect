import LineChart from "@/components/charts/LineChart";
import DonutChart from "@/components/charts/DonutChart";
import { aggregate, generateRows, resolveRange, sortRows, totals } from "@/lib/metrics";
import { formatCompact, formatCurrency, formatDate, formatMetric } from "@/lib/format";
import { CONNECTORS_BY_SLUG } from "@/lib/catalog";

const SOURCES = ["google-ads", "facebook-ads", "tiktok-ads", "klaviyo"];

/** The hero product shot is the real chart stack, rendered from the real data layer. */
export default function DashboardPreview() {
  const { from, to } = resolveRange("last_30d");
  const rows = generateRows({ connectors: SOURCES, from, to });

  const byDate = sortRows(aggregate(rows, ["date"], ["spend", "revenue"]), "date", "asc");
  const bySource = sortRows(aggregate(rows, ["source"], ["spend", "revenue", "conversions"]), "spend", "desc");
  const totalRow = totals(rows, ["spend", "revenue", "conversions", "roas"]);

  const lineData = byDate.map((row) => ({
    x: String(row.date),
    xLabel: formatDate(String(row.date)),
    values: { spend: Number(row.spend), revenue: Number(row.revenue) },
  }));

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[0_24px_60px_-24px_rgba(11,18,32,0.35)]">
      <div className="flex items-center gap-2 border-b border-ink-200 bg-ink-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        <span className="ml-3 text-xs font-medium text-ink-500">app.adsconnect.io / overview</span>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Ad spend" value={formatCurrency(Number(totalRow.spend))} />
          <Tile label="Revenue" value={formatCurrency(Number(totalRow.revenue))} />
          <Tile label="Conversions" value={formatCompact(Number(totalRow.conversions))} />
          <Tile label="ROAS" value={formatMetric("roas", Number(totalRow.roas))} />
        </div>

        <div className="rounded-xl border border-ink-200 p-4">
          <h3 className="mb-1 text-sm font-semibold text-ink-900">Spend and revenue, last 30 days</h3>
          <p className="mb-3 text-xs text-ink-500">Blended across {SOURCES.length} connected sources</p>
          <LineChart
            data={lineData}
            series={[
              { key: "spend", label: "Spend" },
              { key: "revenue", label: "Revenue" },
            ]}
            height={230}
          />
        </div>

        <div className="rounded-xl border border-ink-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-ink-900">Spend by source</h3>
          <DonutChart
            data={bySource.map((row) => ({ label: String(row.source), value: Number(row.spend) }))}
            centerLabel="Total spend"
            centerValue={formatCurrency(Number(totalRow.spend))}
            metric="spend"
          />
          <ul className="mt-4 space-y-1.5 border-t border-ink-200 pt-3 text-xs text-ink-500">
            {bySource.slice(0, 3).map((row) => {
              const connector = Object.values(CONNECTORS_BY_SLUG).find((c) => c.name === row.source);
              return (
                <li key={String(row.source)} className="flex justify-between gap-3">
                  <span>{connector?.name ?? String(row.source)}</span>
                  <span className="tabular-nums">
                    {formatCompact(Number(row.conversions))} conversions ·{" "}
                    {formatMetric("roas", Number(row.spend) ? Number(row.revenue) / Number(row.spend) : 0)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-200 p-3">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-ink-900">{value}</div>
    </div>
  );
}
