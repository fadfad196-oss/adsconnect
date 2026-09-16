import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, ConnectorMark } from "@/components/ui";
import { CONNECTORS, CONNECTORS_BY_SLUG, CORE_DIMENSIONS, CORE_METRICS, DESTINATIONS } from "@/lib/catalog";
import { generateRows, resolveRange, sortRows } from "@/lib/metrics";
import { formatMetric, metricLabel } from "@/lib/format";

export function generateStaticParams() {
  return CONNECTORS.map((connector) => ({ slug: connector.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const connector = CONNECTORS_BY_SLUG[slug];
  if (!connector) return { title: "Data source" };
  return {
    title: connector.name + " connector",
    description: connector.name + " data in Looker Studio, Sheets, BigQuery or your warehouse. " + connector.tagline,
  };
}

const AUTH_COPY = {
  oauth: "One-click OAuth. Authorise the account and pick which ad accounts or properties to sync.",
  api_key: "Paste an API key or token from the platform. We store it encrypted and rotate on request.",
  file: "Drop a file or point us at a bucket, and we normalise it into the same schema as every other source.",
};

export default async function ConnectorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const connector = CONNECTORS_BY_SLUG[slug];
  if (!connector) notFound();

  const { from, to } = resolveRange("last_7d");
  const rows = sortRows(generateRows({ connectors: [connector.slug], from, to }), "spend", "desc").slice(0, 6);

  const dimensions = [...CORE_DIMENSIONS, ...(connector.extraDimensions ?? [])];
  const metrics = [...CORE_METRICS, ...(connector.extraMetrics ?? [])];
  const related = CONNECTORS.filter((c) => c.category === connector.category && c.slug !== connector.slug).slice(0, 6);

  const previewColumns = ["date", "campaign", "impressions", "clicks", "spend", "conversions", "revenue"];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14">
      <nav className="mb-8 flex items-center gap-2 text-sm text-ink-400">
        <Link href="/connectors" className="hover:text-brand-600">
          Data sources
        </Link>
        <span>/</span>
        <span className="text-ink-700">{connector.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-4">
            <ConnectorMark name={connector.name} color={connector.color} size={52} />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-ink-900">
                {connector.name} connector
              </h1>
              <p className="mt-1 text-sm text-ink-400">{connector.category}</p>
            </div>
          </div>

          <p className="mt-6 text-lg leading-relaxed text-ink-500">{connector.tagline}</p>

          <h2 className="mt-10 text-lg font-semibold text-ink-900">How the connection works</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{AUTH_COPY[connector.auth]}</p>
          <ul className="mt-4 space-y-2 text-sm text-ink-500">
            <li className="flex gap-2">
              <Check /> Full historical backfill on first sync, then incremental updates.
            </li>
            <li className="flex gap-2">
              <Check /> Hourly, daily or weekly refresh per connection.
            </li>
            <li className="flex gap-2">
              <Check /> Currency and timezone normalised to your workspace settings.
            </li>
            <li className="flex gap-2">
              <Check /> Field renames on the platform side absorbed upstream, not in your dashboard.
            </li>
          </ul>

          <h2 className="mt-10 text-lg font-semibold text-ink-900">Sample response</h2>
          <p className="mt-1 text-sm text-ink-500">Last 7 days, top rows by spend.</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-ink-200 scrollbar-thin">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  {previewColumns.map((column) => (
                    <th key={column} className="whitespace-nowrap px-4 py-2.5 font-medium">
                      {metricLabel(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {rows.map((row, i) => (
                  <tr key={i} className="text-ink-700">
                    {previewColumns.map((column) => (
                      <td key={column} className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                        {typeof row[column] === "number"
                          ? formatMetric(column, Number(row[column]))
                          : String(row[column] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-10 text-lg font-semibold text-ink-900">Available fields</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <FieldList title="Dimensions" fields={dimensions} />
            <FieldList title="Metrics" fields={metrics} />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-ink-200 bg-ink-50 p-6">
            <h3 className="text-sm font-semibold text-ink-900">Connect {connector.name}</h3>
            <p className="mt-2 text-sm text-ink-500">
              Free for 30 days. Connect the account, choose a destination, done.
            </p>
            <ButtonLink href={"/signup?source=" + connector.slug} className="mt-4 w-full">
              Start free trial
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" className="mt-2 w-full">
              Open demo workspace
            </ButtonLink>
          </div>

          <div className="rounded-xl border border-ink-200 p-6">
            <h3 className="text-sm font-semibold text-ink-900">Send {connector.name} data to</h3>
            <ul className="mt-3 space-y-2">
              {DESTINATIONS.slice(0, 6).map((destination) => (
                <li key={destination.slug}>
                  <Link
                    href={"/destinations/" + destination.slug}
                    className="flex items-center gap-2.5 text-sm text-ink-500 hover:text-brand-600"
                  >
                    <ConnectorMark name={destination.name} color={destination.color} size={22} />
                    {destination.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-ink-200 p-6">
            <h3 className="text-sm font-semibold text-ink-900">API query</h3>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-ink-900 p-3 text-[12px] leading-relaxed text-white/90 scrollbar-thin">
              <code>{`GET /v1/all
  ?api_key=ac_live_xxx
  &connector=${connector.slug}
  &date_preset=last_30d
  &fields=date,campaign,spend,clicks`}</code>
            </pre>
            <Link href="/docs" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
              API documentation →
            </Link>
          </div>
        </aside>
      </div>

      {related.length ? (
        <div className="mt-16 border-t border-ink-200 pt-10">
          <h2 className="text-lg font-semibold text-ink-900">Other {connector.category.toLowerCase()} sources</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={"/connectors/" + item.slug}
                className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <ConnectorMark name={item.name} color={item.color} size={30} />
                <span className="text-sm font-medium text-ink-900">{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FieldList({ title, fields }: { title: string; fields: string[] }) {
  return (
    <div className="rounded-xl border border-ink-200 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-400">{title}</h3>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {fields.map((field) => (
          <li key={field} className="rounded-md bg-ink-100 px-2 py-1 font-mono text-[12px] text-ink-700">
            {field}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Check() {
  return (
    <svg className="mt-0.5 shrink-0 text-brand-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}
