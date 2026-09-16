"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConnectorMark, StatusDot, buttonClass } from "@/components/ui";
import { CONNECTORS_BY_SLUG } from "@/lib/catalog";
import { formatDateTime } from "@/lib/format";
import type { Connection } from "@/lib/store";

export default function ConnectionList({ connections }: { connections: Connection[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, payload: Record<string, unknown>) {
    setBusyId(id);
    await fetch("/api/connections", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  async function remove(id: string, name: string) {
    if (!confirm("Disconnect " + name + "? Historical rows stay until you purge them.")) return;
    setBusyId(id);
    await fetch("/api/connections?id=" + encodeURIComponent(id), { method: "DELETE" });
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  return (
    <ul className="divide-y divide-ink-200">
      {connections.map((connection) => {
        const connector = CONNECTORS_BY_SLUG[connection.connector];
        const busy = busyId === connection.id || pending;
        return (
          <li key={connection.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <ConnectorMark name={connector?.name ?? connection.connector} color={connector?.color ?? "#52607a"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">
                {connector?.name ?? connection.connector}
              </p>
              <p className="truncate text-xs text-ink-400">
                {connection.accountName} · {connection.accountId}
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-ink-500">
              <StatusDot tone={connection.status === "connected" ? "good" : connection.status === "error" ? "bad" : "warn"} />
              <span className="capitalize">{connection.status}</span>
            </div>

            <div className="w-28 text-xs text-ink-400">Synced {formatDateTime(connection.lastSyncAt)}</div>

            <select
              value={connection.frequency}
              disabled={busy}
              onChange={(e) => act(connection.id, { frequency: e.target.value })}
              className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-xs text-ink-700 outline-none focus:border-brand-400"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => act(connection.id, { action: "sync" })}
                className={buttonClass("secondary", "sm")}
              >
                {busy ? "Working…" : "Sync now"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => act(connection.id, { action: connection.status === "paused" ? "resume" : "pause" })}
                className={buttonClass("ghost", "sm")}
              >
                {connection.status === "paused" ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(connection.id, connector?.name ?? connection.connector)}
                className={buttonClass("danger", "sm")}
              >
                Disconnect
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
