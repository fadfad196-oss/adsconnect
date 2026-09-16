"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConnectorMark, buttonClass } from "@/components/ui";
import type { Connector } from "@/lib/catalog";

interface Account {
  id: string;
  name: string;
  currency: string;
  spend30d: string;
}

const STEPS = ["Authorise", "Choose accounts", "Sync settings"];

export default function ConnectFlow({
  connector,
  accounts,
  alreadyConnected,
}: {
  connector: Connector;
  accounts: Account[];
  alreadyConnected: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([accounts[0]?.id].filter(Boolean) as string[]);
  const [frequency, setFrequency] = useState("daily");
  const [history, setHistory] = useState("24");
  const [credential, setCredential] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsCredential = connector.auth === "api_key";

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function finish() {
    setPending(true);
    setError(null);

    for (const accountId of selected) {
      const account = accounts.find((a) => a.id === accountId);
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          connector: connector.slug,
          accountId,
          accountName: account?.name ?? "Account",
          frequency,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Could not connect." }));
        setError(body.error);
        setPending(false);
        return;
      }
    }

    router.push("/app/connectors");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-white">
      <div className="flex items-center gap-4 border-b border-ink-200 px-6 py-5">
        <ConnectorMark name={connector.name} color={connector.color} size={44} />
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Connect {connector.name}</h1>
          <p className="text-sm text-ink-500">{connector.tagline}</p>
        </div>
      </div>

      <ol className="flex border-b border-ink-200">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={
              "flex flex-1 items-center gap-2 px-6 py-3 text-sm " +
              (i === step ? "font-medium text-brand-700" : i < step ? "text-ink-500" : "text-ink-400")
            }
          >
            <span
              className={
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold " +
                (i <= step ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-400")
              }
            >
              {i < step ? "✓" : i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <div className="px-6 py-6">
        {alreadyConnected ? (
          <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You already have a {connector.name} connection. Adding another account is fine, they sync
            independently.
          </p>
        ) : null}

        {step === 0 ? (
          <div className="max-w-xl">
            {needsCredential ? (
              <>
                <h2 className="text-sm font-semibold text-ink-900">Paste your {connector.name} API key</h2>
                <p className="mt-1 text-sm text-ink-500">
                  Find it under the platform&apos;s developer or integrations settings. It is stored encrypted
                  and only used for scheduled reads.
                </p>
                <input
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  placeholder="pk_live_…"
                  className="mt-4 h-10 w-full rounded-lg border border-ink-200 px-3 font-mono text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <p className="mt-2 text-xs text-ink-400">
                  Demo build: any value works, nothing is sent to {connector.name}.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-ink-900">Authorise access</h2>
                <p className="mt-1 text-sm text-ink-500">
                  You will be sent to {connector.name} to approve read-only access to reporting data.
                  AdsConnect never writes to your account or changes campaigns.
                </p>
                <ul className="mt-4 space-y-2 rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm text-ink-700">
                  <li>· Read campaign, ad group and ad level reporting</li>
                  <li>· Read account and billing currency</li>
                  <li>· No write access requested</li>
                </ul>
              </>
            )}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={needsCredential && credential.trim().length < 3}
                className={buttonClass("primary")}
              >
                {needsCredential ? "Validate key" : "Authorise with " + connector.name}
              </button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Choose the accounts to sync</h2>
            <p className="mt-1 text-sm text-ink-500">
              Each account becomes its own connection, so you can pause them independently.
            </p>
            <ul className="mt-4 divide-y divide-ink-200 overflow-hidden rounded-lg border border-ink-200">
              {accounts.map((account) => (
                <li key={account.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-ink-50">
                    <input
                      type="checkbox"
                      checked={selected.includes(account.id)}
                      onChange={() => toggle(account.id)}
                      className="h-4 w-4 rounded border-ink-200"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink-900">{account.name}</span>
                      <span className="block text-xs text-ink-400">
                        {account.id} · {account.currency}
                      </span>
                    </span>
                    <span className="text-xs tabular-nums text-ink-500">{account.spend30d} last 30d</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => setStep(0)} className={buttonClass("secondary")}>
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!selected.length}
                className={buttonClass("primary")}
              >
                Continue with {selected.length} account{selected.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="max-w-xl">
            <h2 className="text-sm font-semibold text-ink-900">Sync settings</h2>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Refresh frequency</span>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily (recommended)</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Historical backfill</span>
                <select
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400"
                >
                  <option value="3">Last 3 months</option>
                  <option value="12">Last 12 months</option>
                  <option value="24">Last 24 months</option>
                  <option value="all">Everything the API allows</option>
                </select>
              </label>
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => setStep(1)} className={buttonClass("secondary")}>
                Back
              </button>
              <button type="button" onClick={finish} disabled={pending} className={buttonClass("primary")}>
                {pending ? "Connecting…" : "Finish and start first sync"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
