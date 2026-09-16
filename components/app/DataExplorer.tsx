"use client";

import { useEffect, useMemo, useState } from "react";
import LineChart from "@/components/charts/LineChart";
import { buttonClass } from "@/components/ui";
import { CONNECTORS_BY_SLUG } from "@/lib/catalog";
import { formatDate, formatMetric, metricLabel } from "@/lib/format";
import { DATE_PRESETS, type Row } from "@/lib/metrics";

interface Props {
  connectedSlugs: string[];
  dimensions: string[];
  metrics: string[];
  apiKey: string;
}

interface QueryResponse {
  meta: { date_from: string; date_to: string; fields: string[]; row_count: number };
  data: Row[];
}

const OPERATORS = ["contains", "eq", "ne", "gt", "gte", "lt", "lte"];

export default function DataExplorer({ connectedSlugs, dimensions, metrics, apiKey }: Props) {
  const [sources, setSources] = useState<string[]>(connectedSlugs);
  const [groupBy, setGroupBy] = useState<string[]>(["date", "source"]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["spend", "clicks", "conversions", "revenue", "roas"]);
  const [preset, setPreset] = useState("last_30d");
  const [filterField, setFilterField] = useState("");
  const [filterOperator, setFilterOperator] = useState("contains");
  const [filterValue, setFilterValue] = useState("");
  const [limit, setLimit] = useState(500);

  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fields = useMemo(() => [...groupBy, ...selectedMetrics], [groupBy, selectedMetrics]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("fields", fields.join(","));
    if (sources.length && sources.length !== connectedSlugs.length) {
      params.set("connector", sources.join(","));
    }
    params.set("date_preset", preset);
    params.set("limit", String(limit));
    if (filterField && filterValue) {
      params.append("filter", filterField + ":" + filterOperator + ":" + filterValue);
    }
    if (selectedMetrics.length) params.set("order_by", "-" + selectedMetrics[0]);
    return params.toString();
  }, [fields, sources, connectedSlugs.length, preset, limit, filterField, filterOperator, filterValue, selectedMetrics]);

  useEffect(() => {
    let cancelled = false;
    if (!fields.length) {
      setResult(null);
      setError("Pick at least one field.");
      return;
    }
    setLoading(true);
    fetch("/api/query?" + queryString)
      .then(async (response) => {
        const body = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(body.error ?? "Query failed.");
          setResult(null);
        } else {
          setError(null);
          setResult(body);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Query failed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryString, fields.length]);

  const chart = useMemo(() => {
    if (!result || !groupBy.includes("date") || !selectedMetrics.length) return null;
    const byDate = new Map<string, Record<string, number>>();
    for (const row of result.data) {
      const date = String(row.date);
      const bucket = byDate.get(date) ?? {};
      for (const metric of selectedMetrics) {
        bucket[metric] = (bucket[metric] ?? 0) + Number(row[metric] ?? 0);
      }
      byDate.set(date, bucket);
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, values]) => ({ x: date, xLabel: formatDate(date), values }));
  }, [result, groupBy, selectedMetrics]);

  // Ratio metrics cannot be re-summed client side, so they are charted separately.
  const chartMetrics = selectedMetrics.filter((m) => !["ctr", "cpc", "cpm", "cpa", "roas", "conversion_rate"].includes(m)).slice(0, 4);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="block text-ink-500">Period</span>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="mt-1 h-9 rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400"
            >
              {DATE_PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="block text-ink-500">Row limit</span>
            <input
              type="number"
              min={1}
              max={50000}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 1)}
              className="mt-1 h-9 w-28 rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <div className="flex items-end gap-2 text-sm">
            <label>
              <span className="block text-ink-500">Filter</span>
              <select
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                className="mt-1 h-9 rounded-lg border border-ink-200 px-2 text-sm outline-none focus:border-brand-400"
              >
                <option value="">No filter</option>
                {[...dimensions, ...metrics].map((field) => (
                  <option key={field} value={field}>
                    {metricLabel(field)}
                  </option>
                ))}
              </select>
            </label>
            <select
              value={filterOperator}
              onChange={(e) => setFilterOperator(e.target.value)}
              disabled={!filterField}
              className="h-9 rounded-lg border border-ink-200 px-2 text-sm outline-none focus:border-brand-400"
            >
              {OPERATORS.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
            <input
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              disabled={!filterField}
              placeholder="value"
              className="h-9 w-32 rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400"
            />
          </div>

          <div className="ml-auto flex gap-2">
            <a href={"/api/query?" + queryString + "&format=csv"} className={buttonClass("secondary", "sm")}>
              Download CSV
            </a>
          </div>
        </div>

        <Picker
          label="Sources"
          options={connectedSlugs.map((slug) => ({ value: slug, label: CONNECTORS_BY_SLUG[slug]?.name ?? slug }))}
          selected={sources}
          onToggle={(value) => toggle(sources, setSources, value)}
        />
        <Picker
          label="Group by"
          options={dimensions.map((field) => ({ value: field, label: metricLabel(field) }))}
          selected={groupBy}
          onToggle={(value) => toggle(groupBy, setGroupBy, value)}
        />
        <Picker
          label="Metrics"
          options={metrics.map((field) => ({ value: field, label: metricLabel(field) }))}
          selected={selectedMetrics}
          onToggle={(value) => toggle(selectedMetrics, setSelectedMetrics, value)}
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {chart && chartMetrics.length ? (
        <div className="rounded-xl border border-ink-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-ink-900">Trend</h3>
          <p className="mb-4 text-xs text-ink-500">
            Summed across the grouped rows for each day. Each metric keeps its own scale, so dollars and
            counts are never forced onto one axis.
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            {chartMetrics.map((metric) => (
              <div key={metric}>
                <p className="mb-1 text-xs font-medium text-ink-700">{metricLabel(metric)}</p>
                <LineChart
                  data={chart}
                  series={[{ key: metric, label: metricLabel(metric) }]}
                  height={200}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-ink-900">
            Results{result ? " (" + result.meta.row_count + " rows)" : ""}
          </h3>
          {loading ? <span className="text-xs text-ink-400">Running…</span> : null}
        </div>
        {result && result.data.length ? (
          <div className="max-h-[540px] overflow-auto scrollbar-thin">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  {result.meta.fields.map((field) => (
                    <th
                      key={field}
                      className={"whitespace-nowrap px-4 py-2.5 font-medium " + (groupBy.includes(field) ? "" : "text-right")}
                    >
                      {metricLabel(field)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {result.data.map((row, i) => (
                  <tr key={i} className="hover:bg-ink-50">
                    {result.meta.fields.map((field) => (
                      <td
                        key={field}
                        className={
                          "whitespace-nowrap px-4 py-2.5 " +
                          (groupBy.includes(field) ? "text-ink-700" : "text-right tabular-nums text-ink-900")
                        }
                      >
                        {groupBy.includes(field)
                          ? String(row[field] ?? "-")
                          : formatMetric(field, Number(row[field] ?? 0))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-ink-500">
            {loading ? "Running query…" : "No rows for this selection."}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-ink-200 bg-ink-900 p-4">
        <p className="mb-2 text-xs font-medium text-white/60">The same query over the public API</p>
        <pre className="overflow-x-auto text-[12px] leading-relaxed text-white/90 scrollbar-thin">
          <code>{"curl \"https://api.adsconnect.io/v1/all?api_key=" + apiKey + "&" + queryString + "\""}</code>
        </pre>
      </div>
    </div>
  );
}

function Picker({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const on = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (on ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-500 hover:border-brand-300")
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
