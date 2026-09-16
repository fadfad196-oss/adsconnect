"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";

const PLANS = [
  { id: "free", label: "Free", detail: "1 source, daily refresh" },
  { id: "basic", label: "Basic", detail: "5 sources, daily refresh" },
  { id: "standard", label: "Standard", detail: "Unlimited sources, hourly refresh, API" },
  { id: "enterprise", label: "Enterprise", detail: "Multi-workspace, SSO, SLA" },
];

export default function SettingsForm({
  name,
  company,
  plan,
}: {
  name: string;
  company: string;
  plan: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [form, setForm] = useState({ name, company, plan });
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setPending(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium text-ink-700">Your name</span>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="mt-1.5 h-10 w-full max-w-sm rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink-700">Workspace name</span>
        <input
          value={form.company}
          onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          className="mt-1.5 h-10 w-full max-w-sm rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </label>

      <fieldset>
        <legend className="text-sm font-medium text-ink-700">Plan</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {PLANS.map((item) => (
            <label
              key={item.id}
              className={
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 " +
                (form.plan === item.id ? "border-brand-500 bg-brand-50" : "border-ink-200 bg-white")
              }
            >
              <input
                type="radio"
                name="plan"
                value={item.id}
                checked={form.plan === item.id}
                onChange={() => setForm((f) => ({ ...f, plan: item.id }))}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-ink-900">{item.label}</span>
                <span className="block text-xs text-ink-500">{item.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        {saved ? <span className="text-sm text-[var(--status-good)]">Saved</span> : null}
      </div>
    </form>
  );
}
