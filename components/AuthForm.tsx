"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { buttonClass } from "@/components/ui";

function Form({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/auth/" + mode, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, source: params.get("source") ?? "" }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Something went wrong." }));
      setError(body.error ?? "Something went wrong.");
      setPending(false);
      return;
    }

    router.push(mode === "signup" ? "/app/connectors?welcome=1" : "/app");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {mode === "signup" ? (
        <>
          <Field label="Full name" name="name" placeholder="Alex Rivera" autoComplete="name" />
          <Field label="Company" name="company" placeholder="Acme Commerce" autoComplete="organization" />
        </>
      ) : null}

      <Field
        label="Work email"
        name="email"
        type="email"
        placeholder={mode === "login" ? "demo@adsconnect.io" : "you@company.com"}
        autoComplete="email"
        required
        defaultValue={mode === "login" ? "demo@adsconnect.io" : undefined}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        placeholder={mode === "login" ? "demo1234" : "At least 8 characters"}
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        required
        defaultValue={mode === "login" ? "demo1234" : undefined}
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <button type="submit" disabled={pending} className={buttonClass("primary", "md") + " w-full"}>
        {pending ? "Working…" : mode === "login" ? "Log in" : "Create account"}
      </button>

      {mode === "signup" ? (
        <p className="text-xs leading-relaxed text-ink-400">
          By creating an account you agree to the terms of service. This is a demo build, so use a throwaway
          password.
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  name,
  ...rest
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-700">{label}</span>
      <input
        name={name}
        className="mt-1.5 h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        {...rest}
      />
    </label>
  );
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  return (
    <Suspense fallback={<div className="mt-6 h-64" />}>
      <Form mode={mode} />
    </Suspense>
  );
}
