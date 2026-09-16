"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConnectorMark, StatusDot, buttonClass } from "@/components/ui";
import { CONNECTORS_BY_SLUG, DESTINATIONS, DESTINATIONS_BY_SLUG } from "@/lib/catalog";
import { formatDateTime, metricLabel } from "@/lib/format";
import type { DestinationConfig } from "@/lib/store";

const FIELD_CHOICES = [
  "date",
  "source",
  "account_name",
  "campaign",
  "adgroup",
  "device",
  "country",
  "impressions",
  "clicks",
  "spend",
  "conversions",
  "revenue",
  "ctr",
  "cpc",
  "cpa",
  "roas",
];

const DEFAULT_FIELDS = ["date", "source", "campaign", "spend", "clicks", "conversions", "revenue"];

interface Props {
  pipelines: DestinationConfig[];
  connectedSlugs: string[];
}

export default function PipelineManager({ pipelines, connectedSlugs }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [destination, setDestination] = useState(DESTINATIONS[0].slug);
  const [name, setName] = useState("");
  const [sources, setSources] = useState<string[]>(connectedSlugs);
  const [fields, setFields] = useState<string[]>(DEFAULT_FIELDS);
  const [schedule, setSchedule] = useState("daily");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const spec = DESTINATIONS_BY_SLUG[destination];

  async function act(id: string, payload: Record<string, unknown>) {
    setBusyId(id);
    await fetch("/api/destinations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  async function remove(id: string, label: string) {
    if (!confirm("Delete the pipeline “" + label + "”? The destination itself is left untouched.")) return;
    setBusyId(id);
    await fetch("/api/destinations?id=" + encodeURIComponent(id), { method: "DELETE" });
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  async function create() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/destinations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        destination,
        name: name || spec.name + " pipeline",
        connectors: sources,
        fields,
        schedule,
        config,
      }),
    });
    setPending(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Could not create the pipeline." }));
      setError(body.error);
      return;
    }
    setCreating(false);
    setName("");
    setConfig({});
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-ink-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Pipelines ({pipelines.length})</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Each pipeline is a set of sources and fields on a schedule, pointed at one destination.
            </p>
          </div>
          <button type="button" onClick={() => setCreating((v) => !v)} className={buttonClass("primary", "sm")}>
            {creating ? "Cancel" : "New pipeline"}
          </button>
        </div>

        {creating ? (
          <div className="border-b border-ink-200 bg-ink-50 px-5 py-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Destination</span>
                <select
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setConfig({});
                  }}
                  className="mt-1.5 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
                >
                  {DESTINATIONS.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-ink-700">Pipeline name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={spec.name + " pipeline"}
                  className="mt-1.5 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
                />
              </label>

              {spec.setupFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-sm font-medium text-ink-700">{field.label}</span>
                  <input
                    value={config[field.key] ?? ""}
                    onChange={(e) => setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="mt-1.5 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 font-mono text-sm outline-none focus:border-brand-400"
                  />
                </label>
              ))}

              <label className="block">
                <span className="text-sm font-medium text-ink-700">Schedule</span>
                <select
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-400"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
            </div>

            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-ink-700">Sources</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {connectedSlugs.map((slug) => {
                  const connector = CONNECTORS_BY_SLUG[slug];
                  const on = sources.includes(slug);
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() =>
                        setSources((prev) => (on ? prev.filter((s) => s !== slug) : [...prev, slug]))
                      }
                      className={
                        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                        (on ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-500")
                      }
                    >
                      <ConnectorMark name={connector?.name ?? slug} color={connector?.color ?? "#52607a"} size={18} />
                      {connector?.name ?? slug}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-ink-700">Fields</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {FIELD_CHOICES.map((field) => {
                  const on = fields.includes(field);
                  return (
                    <button
                      key={field}
                      type="button"
                      onClick={() => setFields((prev) => (on ? prev.filter((f) => f !== field) : [...prev, field]))}
                      className={
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                        (on ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-500")
                      }
                    >
                      {metricLabel(field)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={create} disabled={pending} className={buttonClass("primary")}>
                {pending ? "Creating…" : "Create pipeline"}
              </button>
              <button type="button" onClick={() => setCreating(false)} className={buttonClass("secondary")}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {pipelines.length ? (
          <ul className="divide-y divide-ink-200">
            {pipelines.map((pipeline) => {
              const spec = DESTINATIONS_BY_SLUG[pipeline.destination];
              const busy = busyId === pipeline.id;
              return (
                <li key={pipeline.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <ConnectorMark name={spec?.name ?? pipeline.destination} color={spec?.color ?? "#52607a"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{pipeline.name}</p>
                    <p className="truncate text-xs text-ink-400">
                      {spec?.name} · {pipeline.connectors.length} sources · {pipeline.fields.length} fields ·{" "}
                      {pipeline.schedule}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-ink-500">
                    <StatusDot tone={pipeline.status === "active" ? "good" : "warn"} />
                    <span className="capitalize">{pipeline.status}</span>
                  </div>
                  <div className="w-24 text-xs text-ink-400">Ran {formatDateTime(pipeline.lastRunAt)}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(pipeline.id, { action: "run" })}
                      className={buttonClass("secondary", "sm")}
                    >
                      {busy ? "Working…" : "Run now"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(pipeline.id, { action: pipeline.status === "active" ? "pause" : "resume" })}
                      className={buttonClass("ghost", "sm")}
                    >
                      {pipeline.status === "active" ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(pipeline.id, pipeline.name)}
                      className={buttonClass("danger", "sm")}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-ink-500">
            No pipelines yet. Create one to start delivering data.
          </p>
        )}
      </div>
    </div>
  );
}
