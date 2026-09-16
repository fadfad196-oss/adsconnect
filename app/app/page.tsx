import Link from "next/link";
import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import LineChart from "@/components/charts/LineChart";
import RankedBars from "@/components/charts/RankedBars";
import DataTable from "@/components/app/DataTable";
import DateRangePicker from "@/components/app/DateRangePicker";
import StatTile from "@/components/app/StatTile";
import { Badge, ButtonLink, Card, CardHeader, ConnectorMark, EmptyState, StatusDot } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { CONNECTORS_BY_SLUG } from "@/lib/catalog";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import {
  aggregate,
  eachDate,
  previousRange,
  resolveRange,
  sortRows,
  totals,
} from "@/lib/metrics";
import { rowsForConnections } from "@/lib/sources";
import { listConnections } from "@/lib/store";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireUser();
  const { range } = await searchParams;
  const connections = listConnections(user.id);

  if (!connections.length) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          title="No data sources connected yet"
          body="Connect an ad account, analytics property or store and your overview fills in on the first sync."
          action={<ButtonLink href="/app/connectors">Connect a source</ButtonLink>}
        />
      </div>
    );
  }

  const { from, to } = resolveRange(range ?? "last_30d");
  const prior = previousRange(from, to);

  // Live sources come from their platform API; the rest serve sample rows.
  const [current_, previous_] = await Promise.all([
    rowsForConnections(connections, from, to),
    rowsForConnections(connections, prior.from, prior.to),
  ]);
  const rows = current_.rows;
  const priorRows = previous_.rows;
  const warnings = current_.errors;

  const KPIS = ["spend", "revenue", "conversions", "roas", "cpa", "clicks"];
  const current = totals(rows, KPIS);
  const previous = totals(priorRows, KPIS);

  const byDate = sortRows(aggregate(rows, ["date"], ["spend", "revenue", "conversions", "clicks"]), "date", "asc");
  const bySource = sortRows(
    aggregate(rows, ["source", "connector"], ["spend", "clicks", "conversions", "revenue", "cpa", "roas"]),
    "spend",
    "desc",
  );
  const byCampaign = sortRows(
    aggregate(rows, ["campaign", "source"], ["spend", "conversions", "revenue", "roas"]),
    "spend",
    "desc",
  ).slice(0, 6);

  const lineData = byDate.map((row) => ({
    x: String(row.date),
    xLabel: formatDate(String(row.date)),
    values: {
      spend: Number(row.spend),
      revenue: Number(row.revenue),
    },
  }));

  // Daily stacks get noisy past a month, so bucket into weeks when the window is long.
  const days = eachDate(from, to);
  const bucketSize = days.length > 21 ? 7 : 1;
  const stackRows = aggregate(rows, ["date", "source"], ["spend"]);
  const buckets = new Map<string, Map<string, number>>();
  for (const row of stackRows) {
    const index = days.indexOf(String(row.date));
    const bucketStart = days[Math.floor(Math.max(0, index) / bucketSize) * bucketSize];
    const bucket = buckets.get(bucketStart) ?? new Map<string, number>();
    bucket.set(String(row.source), (bucket.get(String(row.source)) ?? 0) + Number(row.spend));
    buckets.set(bucketStart, bucket);
  }
  // Sources with no spend would only add empty stack segments and legend rows.
  const spendingSources = bySource.filter((row) => Number(row.spend) > 0).map((row) => String(row.source));
  const bucketStarts = [...buckets.keys()].sort();
  const stackData = bucketStarts.map((date) => {
    const bucket = buckets.get(date)!;
    const start = days.indexOf(date);
    const partial = bucketSize > 1 && start + bucketSize > days.length;
    return {
      label: formatDate(date) + (partial ? " (partial)" : ""),
      segments: spendingSources
        .filter((source) => (bucket.get(source) ?? 0) > 0)
        .map((source) => ({ key: source, label: source, value: Math.round(bucket.get(source) ?? 0) })),
    };
  });

  const trend = (metric: string) => byDate.map((row) => Number(row[metric]));

  return (
    <div className="p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Overview</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <span>
              {connections.length} source{connections.length === 1 ? "" : "s"} · {from} to {to}
            </span>
            <Badge tone={current_.live ? "good" : "neutral"}>
              {current_.live ? "Live platform data" : "Sample data"}
            </Badge>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker />
          <ButtonLink href="/app/data" variant="secondary" size="sm">
            Open data explorer
          </ButtonLink>
        </div>
      </header>

      {warnings.length ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <h2 className="text-sm font-semibold text-amber-900">
            {warnings.length} source{warnings.length === 1 ? "" : "s"} could not be read
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {warnings.map((warning) => (
              <li key={warning.connectionId}>
                <span className="font-medium">{CONNECTORS_BY_SLUG[warning.connector]?.name ?? warning.connector}:</span>{" "}
                {warning.message}
                {warning.reauthorize ? (
                  <Link href={"/app/connectors/" + warning.connector} className="ml-1 font-medium underline">
                    Reconnect
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile metric="spend" value={Number(current.spend)} previous={Number(previous.spend)} trend={trend("spend")} label="Ad spend" />
        <StatTile metric="revenue" value={Number(current.revenue)} previous={Number(previous.revenue)} trend={trend("revenue")} />
        <StatTile metric="roas" value={Number(current.roas)} previous={Number(previous.roas)} />
        <StatTile metric="conversions" value={Number(current.conversions)} previous={Number(previous.conversions)} trend={trend("conversions")} />
        <StatTile metric="cpa" value={Number(current.cpa)} previous={Number(previous.cpa)} />
        <StatTile metric="clicks" value={Number(current.clicks)} previous={Number(previous.clicks)} trend={trend("clicks")} />
      </div>

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Spend and revenue" subtitle="Blended across every connected source" />
          <div className="p-5">
            <LineChart
              data={lineData}
              series={[
                { key: "spend", label: "Spend" },
                { key: "revenue", label: "Revenue" },
              ]}
              height={280}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Spend share" subtitle="By source" />
          <div className="p-5">
            <DonutChart
              data={bySource.map((row) => ({ label: String(row.source), value: Number(row.spend) }))}
              centerLabel="Total spend"
              centerValue={formatCurrency(Number(current.spend))}
              metric="spend"
            />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Spend by source over time"
            subtitle={bucketSize === 7 ? "Weekly buckets" : "Daily"}
          />
          <div className="p-5">
            <BarChart data={stackData} metric="spend" height={280} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Top campaigns" subtitle="By spend" />
          <div className="p-5">
            <RankedBars
              metric="spend"
              data={byCampaign.map((row) => ({
                label: String(row.campaign),
                value: Number(row.spend),
                sub: String(row.source) + " · " + Number(row.conversions) + " conversions",
              }))}
            />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Source performance"
            subtitle="Same window, same definitions, every platform"
            action={
              <Link href="/app/data" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                Explore →
              </Link>
            }
          />
          <DataTable
            rows={bySource.map(({ connector: _connector, ...rest }) => rest)}
            columns={["source", "spend", "clicks", "conversions", "cpa", "revenue", "roas"]}
          />
        </Card>

        <Card>
          <CardHeader
            title="Sync status"
            action={
              <Link href="/app/connectors" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                Manage →
              </Link>
            }
          />
          <ul className="divide-y divide-ink-200">
            {connections.map((connection) => {
              const connector = CONNECTORS_BY_SLUG[connection.connector];
              return (
                <li key={connection.id} className="flex items-center gap-3 px-5 py-3">
                  <ConnectorMark name={connector?.name ?? connection.connector} color={connector?.color ?? "#52607a"} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{connector?.name ?? connection.connector}</p>
                    <p className="truncate text-xs text-ink-400">
                      {connection.accountName} · {connection.frequency}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-ink-500">
                    <StatusDot tone={connection.status === "connected" ? "good" : connection.status === "error" ? "bad" : "warn"} />
                    {formatDateTime(connection.lastSyncAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
