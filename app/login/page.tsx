import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import Logo from "@/components/Logo";
import { currentUser } from "@/lib/auth";
import { DEMO_PASSWORD } from "@/lib/store";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/app");

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-5 py-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <Logo />
          <h1 className="mt-10 text-2xl font-semibold tracking-tight text-ink-900">Log in to AdsConnect</h1>
          <p className="mt-2 text-sm text-ink-500">
            New here?{" "}
            <Link href="/signup" className="font-medium text-brand-600 hover:text-brand-700">
              Create an account
            </Link>
          </p>

          <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            <p className="font-medium">Demo workspace</p>
            <p className="mt-1 text-brand-700">
              demo@adsconnect.io / {DEMO_PASSWORD} — seven sources already connected.
            </p>
          </div>

          <AuthForm mode="login" />
        </div>
      </div>

      <div className="relative hidden w-1/2 border-l border-ink-200 bg-ink-50 lg:block">
        <div className="absolute inset-0 grid-bg opacity-60" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-center px-14">
          <blockquote className="max-w-md">
            <p className="text-xl leading-relaxed text-ink-700">
              “We were rebuilding the same five-channel spreadsheet every Monday morning. Now it refreshes at
              6am and the argument is about the numbers, not where they came from.”
            </p>
            <footer className="mt-5 text-sm text-ink-500">
              Head of Growth, mid-market e-commerce brand
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
