"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { ApiKey } from "@/lib/store";

export default function ApiKeyManager({ keys }: { keys: ApiKey[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  async function create() {
    setPending(true);
    await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name || "New key" }),
    });
    setName("");
    setPending(false);
    startTransition(() => router.refresh());
  }

  async function revoke(id: string, label: string) {
    if (!confirm("Revoke “" + label + "”? Anything using it stops working immediately.")) return;
    await fetch("/api/keys?id=" + encodeURIComponent(id), { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  async function copy(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setRevealed((prev) => [...prev, key]);
    }
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-white">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-200 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">API keys ({keys.length})</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Keys carry full read access to every connected source in this workspace.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name, e.g. Looker Studio"
            className="h-9 w-56 rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400"
          />
          <button type="button" onClick={create} disabled={pending} className={buttonClass("primary", "sm")}>
            {pending ? "Creating…" : "Create key"}
          </button>
        </div>
      </div>

      <ul className="divide-y divide-ink-200">
        {keys.map((key) => {
          const shown = revealed.includes(key.key);
          return (
            <li key={key.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-900">{key.name}</p>
                <p className="mt-0.5 font-mono text-xs text-ink-500">
                  {shown ? key.key : key.key.slice(0, 7) + "…" + key.key.slice(-4)}
                </p>
              </div>
              <div className="text-xs text-ink-400">Last used {formatDateTime(key.lastUsedAt)}</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRevealed((prev) => (shown ? prev.filter((k) => k !== key.key) : [...prev, key.key]))}
                  className={buttonClass("ghost", "sm")}
                >
                  {shown ? "Hide" : "Reveal"}
                </button>
                <button type="button" onClick={() => copy(key.key)} className={buttonClass("secondary", "sm")}>
                  {copied === key.key ? "Copied" : "Copy"}
                </button>
                <button type="button" onClick={() => revoke(key.id, key.name)} className={buttonClass("danger", "sm")}>
                  Revoke
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {!keys.length ? (
        <p className="px-5 py-10 text-center text-sm text-ink-500">No keys yet. Create one to use the API.</p>
      ) : null}
    </div>
  );
}
