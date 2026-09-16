import type { Metadata } from "next";
import Link from "next/link";
import { CORE_DIMENSIONS, CORE_METRICS } from "@/lib/catalog";
import { DATE_PRESETS } from "@/lib/metrics";

export const metadata: Metadata = {
  title: "API documentation",
  description: "One authenticated REST endpoint across every connected marketing data source.",
};

const PARAMS = [
  { name: "api_key", required: true, type: "string", desc: "Workspace key. Create and revoke keys in Settings → API keys." },
  { name: "fields", required: true, type: "csv", desc: "Comma separated dimensions and metrics. Order is preserved in the response." },
  { name: "connector", required: false, type: "csv", desc: "Restrict to one or more connector slugs. Defaults to every connected source." },
  { name: "date_preset", required: false, type: "enum", desc: "Relative window. Ignored when date_from and date_to are supplied." },
  { name: "date_from", required: false, type: "date", desc: "Inclusive start date, YYYY-MM-DD." },
  { name: "date_to", required: false, type: "date", desc: "Inclusive end date, YYYY-MM-DD." },
  { name: "filter", required: false, type: "expr", desc: "Repeatable. field:operator:value, e.g. filter=campaign:contains:brand or filter=spend:gt:100." },
  { name: "order_by", required: false, type: "string", desc: "Field to sort by. Prefix with - for descending, e.g. order_by=-spend." },
  { name: "limit", required: false, type: "int", desc: "Row cap, 1 to 50000. Defaults to 1000." },
  { name: "format", required: false, type: "enum", desc: "json (default) or csv." },
];

export default function DocsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">API</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink-900">API documentation</h1>
      <p className="mt-4 text-base leading-relaxed text-ink-500">
        Every connected source sits behind one endpoint with one query shape. If you can write a URL, you can
        pull blended marketing data into anything.
      </p>

      <Block title="Base URL">
        <Code>{`https://api.adsconnect.io/v1`}</Code>
        <p className="mt-3 text-sm text-ink-500">
          Running this project locally, the same routes are served from{" "}
          <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[13px]">http://localhost:3000/api/v1</code>.
        </p>
      </Block>

      <Block title="Authentication">
        <p className="text-sm leading-relaxed text-ink-500">
          Pass your workspace key as the <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[13px]">api_key</code>{" "}
          query parameter, or as a bearer token if you would rather keep it out of URLs and logs.
        </p>
        <Code className="mt-4">{`curl -H "Authorization: Bearer ac_live_xxx" \\
  "https://api.adsconnect.io/v1/all?fields=date,source,spend"`}</Code>
      </Block>

      <Block title="GET /v1/all">
        <p className="text-sm leading-relaxed text-ink-500">
          Returns rows across every connected source, aggregated to the dimensions you asked for.
        </p>
        <div className="mt-5 overflow-x-auto rounded-xl border border-ink-200 scrollbar-thin">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Parameter</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {PARAMS.map((param) => (
                <tr key={param.name}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-ink-900">
                    {param.name}
                    {param.required ? <span className="ml-1.5 text-[11px] text-[var(--status-bad)]">required</span> : null}
                  </td>
                  <td className="px-4 py-3 text-ink-400">{param.type}</td>
                  <td className="px-4 py-3 text-ink-500">{param.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>

      <Block title="Date presets">
        <div className="flex flex-wrap gap-1.5">
          {DATE_PRESETS.map((preset) => (
            <span key={preset.id} className="rounded-md bg-ink-100 px-2 py-1 font-mono text-[12px] text-ink-700">
              {preset.id}
            </span>
          ))}
        </div>
      </Block>

      <Block title="Core fields">
        <p className="text-sm text-ink-500">
          Available on every connector. Source-specific fields are listed on each{" "}
          <Link href="/connectors" className="font-medium text-brand-600 hover:text-brand-700">
            connector page
          </Link>
          .
        </p>
        <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-ink-400">Dimensions</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CORE_DIMENSIONS.map((field) => (
            <span key={field} className="rounded-md bg-ink-100 px-2 py-1 font-mono text-[12px] text-ink-700">
              {field}
            </span>
          ))}
        </div>
        <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-ink-400">Metrics</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CORE_METRICS.map((field) => (
            <span key={field} className="rounded-md bg-ink-100 px-2 py-1 font-mono text-[12px] text-ink-700">
              {field}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-500">
          Ratio metrics (ctr, cpc, cpm, cpa, roas, conversion_rate) are recomputed after aggregation from their
          components, so a weekly CTR is not an average of daily CTRs.
        </p>
      </Block>

      <Block title="Example response">
        <Code>{`{
  "meta": {
    "date_from": "2026-08-17",
    "date_to": "2026-09-15",
    "fields": ["date", "source", "spend", "clicks", "conversions", "roas"],
    "connectors": ["google-ads", "facebook-ads"],
    "row_count": 60
  },
  "data": [
    {
      "date": "2026-08-17",
      "source": "Google Ads",
      "spend": 1804.22,
      "clicks": 942,
      "conversions": 43,
      "roas": 4.91
    }
  ]
}`}</Code>
      </Block>

      <Block title="Attribution endpoint">
        <p className="text-sm leading-relaxed text-ink-500">
          <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[13px]">GET /v1/attribution</code> returns
          credit per channel under a chosen model.
        </p>
        <Code className="mt-4">{`curl "https://api.adsconnect.io/v1/attribution?api_key=ac_live_xxx\\
  &model=markov&date_preset=last_30d"`}</Code>
      </Block>

      <Block title="Pulling into other tools">
        <h3 className="text-sm font-semibold text-ink-900">Google Sheets</h3>
        <Code className="mt-2">{`=IMPORTDATA("https://api.adsconnect.io/v1/all?api_key=ac_live_xxx&format=csv&fields=date,source,spend")`}</Code>
        <h3 className="mt-6 text-sm font-semibold text-ink-900">Python</h3>
        <Code className="mt-2">{`import pandas as pd

url = "https://api.adsconnect.io/v1/all"
params = {
    "api_key": "ac_live_xxx",
    "date_preset": "last_90d",
    "fields": "date,source,campaign,spend,conversions,revenue",
}
df = pd.read_json(url + "?" + "&".join(f"{k}={v}" for k, v in params.items()))`}</Code>
      </Block>

      <Block title="Errors and limits">
        <ul className="space-y-2 text-sm text-ink-500">
          <li>
            <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[13px]">401</code> missing or unknown
            api_key.
          </li>
          <li>
            <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[13px]">400</code> unknown field, bad
            date, or malformed filter. The message names the offending value.
          </li>
          <li>
            <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[13px]">429</code> more than 120
            requests a minute per key.
          </li>
        </ul>
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 border-t border-ink-200 pt-8">
      <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Code({ children, className = "" }: { children: string; className?: string }) {
  return (
    <pre className={"overflow-x-auto rounded-xl bg-ink-900 px-4 py-4 text-[13px] leading-relaxed text-white/90 scrollbar-thin " + className}>
      <code>{children}</code>
    </pre>
  );
}
