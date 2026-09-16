"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectorMark, buttonClass } from "@/components/ui";
import type { Connector } from "@/lib/catalog";

interface Account {
  id: string;
  name: string;
  currency?: string;
  detail?: string;
}

export interface ProviderInfo {
  slug: string;
  label: string;
  kind: "oauth" | "client_credentials";
  configured: boolean;
  missingEnv: string[];
  requiredEnv: string[];
  docsUrl: string;
  accessNote: string;
}

interface Props {
  connector: Connector;
  provider: ProviderInfo | null;
  sampleAccounts: Account[];
  alreadyConnected: boolean;
  authId?: string;
  initialError?: string;
  showSetup?: boolean;
}

const STEPS = ["Authorise", "Choose accounts", "Sync settings"];

export default function ConnectFlow({
  connector,
  provider,
  sampleAccounts,
  alreadyConnected,
  authId,
  initialError,
  showSetup,
}: Props) {
  const router = useRouter();
  const live = Boolean(authId);

  const [step, setStep] = useState(authId ? 1 : 0);
  const [accounts, setAccounts] = useState<Account[]>(live ? [] : sampleAccounts);
  const [selected, setSelected] = useState<string[]>(live ? [] : [sampleAccounts[0]?.id].filter(Boolean) as string[]);
  const [frequency, setFrequency] = useState("daily");
  const [history, setHistory] = useState("24");
  const [loadingAccounts, setLoadingAccounts] = useState(live);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  // After the platform redirect, ask it which accounts this grant can read.
  useEffect(() => {
    if (!authId || !provider) return;
    let cancelled = false;
    setLoadingAccounts(true);
    fetch("/api/oauth/" + provider.slug + "/accounts?auth=" + encodeURIComponent(authId))
      .then(async (response) => {
        const body = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(body.error ?? "Could not list accounts.");
          setAccounts([]);
          return;
        }
        setAccounts(body.data ?? []);
        setSelected(body.data?.length ? [body.data[0].id] : []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not reach the platform.");
      })
      .finally(() => {
        if (!cancelled) setLoadingAccounts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authId, provider]);

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
          currency: account?.currency,
          frequency,
          authId,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Could not connect." }));
        setError(body.error);
        setPending(false);
        return;
      }
    }

    // The stored grant has been copied onto the connections; drop the short-lived copy.
    if (authId) {
      await fetch("/api/connections", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ authId }),
      });
    }

    router.push("/app/connectors");
    router.refresh();
  }

  const startHref =
    provider && provider.configured
      ? "/api/oauth/" + provider.slug + "/start?connector=" + connector.slug
      : null;

  return (
    <div className="rounded-xl border border-ink-200 bg-white">
      <div className="flex items-center gap-4 border-b border-ink-200 px-6 py-5">
        <ConnectorMark name={connector.name} color={connector.color} size={44} />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-ink-900">Connect {connector.name}</h1>
          <p className="text-sm text-ink-500">{connector.tagline}</p>
        </div>
        {provider ? (
          <span
            className={
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " +
              (provider.configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")
            }
          >
            {provider.configured ? "Live API ready" : "Needs setup"}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600">
            Sample data
          </span>
        )}
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
            independently, and reconnecting the same account just refreshes its credentials.
          </p>
        ) : null}

        {error ? (
          <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        {step === 0 ? (
          <div className="max-w-2xl">
            {provider && (provider.configured || showSetup) ? (
              <>
                <h2 className="text-sm font-semibold text-ink-900">Authorise access</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">
                  {provider.kind === "oauth"
                    ? "You will be sent to " +
                      provider.label +
                      " to approve read-only reporting access. AdsConnect never writes to your account."
                    : provider.label +
                      " authenticates the integration itself with the client credentials configured on this server."}
                </p>

                {provider.configured ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    <a href={startHref!} className={buttonClass("primary")}>
                      Continue with {provider.label}
                    </a>
                    <button type="button" onClick={() => setStep(1)} className={buttonClass("secondary")}>
                      Use sample data instead
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <h3 className="text-sm font-semibold text-amber-900">
                      Live access is not configured on this server yet
                    </h3>
                    <p className="mt-1.5 text-sm text-amber-800">{provider.accessNote}</p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-amber-900">
                      Missing environment variables
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {(provider.missingEnv.length ? provider.missingEnv : provider.requiredEnv).map((name) => (
                        <li key={name} className="rounded bg-white px-2 py-1 font-mono text-[12px] text-amber-900">
                          {name}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonClass("secondary", "sm")}
                      >
                        Platform API docs
                      </a>
                      <Link href="/docs/connectors" className={buttonClass("ghost", "sm")}>
                        Setup guide
                      </Link>
                      <button type="button" onClick={() => setStep(1)} className={buttonClass("primary", "sm")}>
                        Continue with sample data
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-ink-900">Sample connection</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">
                  This build ships a live API integration for Google Ads, Meta, TikTok, LinkedIn, Adform and
                  Google Analytics 4. {connector.name} connects with generated sample data that follows the
                  same schema, so dashboards and pipelines behave identically.
                </p>
                <div className="mt-6">
                  <button type="button" onClick={() => setStep(1)} className={buttonClass("primary")}>
                    Continue
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Choose the accounts to sync</h2>
            <p className="mt-1 text-sm text-ink-500">
              {live
                ? "These are the accounts the authorised login can actually read."
                : "Each account becomes its own connection, so you can pause them independently."}
            </p>

            {loadingAccounts ? (
              <p className="mt-6 text-sm text-ink-500">Asking {provider?.label} which accounts you can read…</p>
            ) : accounts.length ? (
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
                          {account.id}
                          {account.currency ? " · " + account.currency : ""}
                        </span>
                      </span>
                      {account.detail ? (
                        <span className="text-xs tabular-nums text-ink-500">{account.detail}</span>
                      ) : null}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 rounded-lg border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-500">
                No accounts came back from the platform. Check that the login you used has access, then try
                again.
              </p>
            )}

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
                <span className="mt-1 block text-xs text-ink-400">
                  Also sets how long fetched rows are cached before the platform is asked again.
                </span>
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

            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => setStep(1)} className={buttonClass("secondary")}>
                Back
              </button>
              <button type="button" onClick={finish} disabled={pending} className={buttonClass("primary")}>
                {pending ? "Connecting…" : live ? "Finish and read live data" : "Finish and start first sync"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
