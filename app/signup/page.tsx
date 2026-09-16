import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import Logo from "@/components/Logo";
import { currentUser } from "@/lib/auth";
import { TOTAL_SOURCE_COUNT } from "@/lib/catalog";

export const metadata: Metadata = { title: "Start your free trial" };

const POINTS = [
  "30 days free, no card, cancel in a click",
  TOTAL_SOURCE_COUNT + "+ sources and every destination on the trial",
  "Historical backfill on the first sync",
  "Attribution models included",
];

export default async function SignupPage() {
  if (await currentUser()) redirect("/app");

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-5 py-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <Logo />
          <h1 className="mt-10 text-2xl font-semibold tracking-tight text-ink-900">Start your free trial</h1>
          <p className="mt-2 text-sm text-ink-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Log in
            </Link>
          </p>
          <AuthForm mode="signup" />
        </div>
      </div>

      <div className="relative hidden w-1/2 border-l border-ink-200 bg-ink-50 lg:block">
        <div className="absolute inset-0 grid-bg opacity-60" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-center px-14">
          <h2 className="max-w-sm text-2xl font-semibold tracking-tight text-ink-900">
            Your first pipeline runs in about five minutes
          </h2>
          <ul className="mt-8 space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-sm text-ink-700">
                <svg className="mt-0.5 shrink-0 text-brand-600" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="m5 13 4 4L19 7" />
                </svg>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
