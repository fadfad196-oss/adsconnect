import type { Metadata } from "next";
import Link from "next/link";
import { PROVIDERS } from "@/lib/providers";
import { StatusDot } from "@/components/ui";

export const metadata: Metadata = {
  title: "Connecting real ad accounts",
  description:
    "How to get Google Ads, Meta, TikTok, LinkedIn, Adform and GA4 reading live data: credentials, scopes, redirect URIs and the approval each platform requires.",
};

interface Setup {
  slug: string;
  steps: string[];
  env: { name: string; note: string }[];
  approval: string;
  approvalTone: "good" | "warn" | "bad";
}

const SETUP: Setup[] = [
  {
    slug: "google-ads",
    steps: [
      "Create a Google Cloud project and enable the Google Ads API.",
      "Create an OAuth client of type Web application and add the redirect URI below.",
      "In a Google Ads manager (MCC) account, open API Center and request a developer token.",
      "Set GOOGLE_ADS_LOGIN_CUSTOMER_ID to the manager account id when you reach accounts through an MCC.",
    ],
    env: [
      { name: "GOOGLE_ADS_CLIENT_ID", note: "OAuth client id" },
      { name: "GOOGLE_ADS_CLIENT_SECRET", note: "OAuth client secret" },
      { name: "GOOGLE_ADS_DEVELOPER_TOKEN", note: "From the manager account API Center" },
      { name: "GOOGLE_ADS_LOGIN_CUSTOMER_ID", note: "Optional, manager account id without dashes" },
      { name: "GOOGLE_ADS_API_VERSION", note: "Optional, defaults to v25" },
    ],
    approval:
      "A new developer token starts at test access and can only read test accounts. Basic access needs an application to Google and usually takes a few working days.",
    approvalTone: "warn",
  },
  {
    slug: "meta-ads",
    steps: [
      "Create a Business type app at developers.facebook.com and add the Marketing API product.",
      "Add the redirect URI below under Facebook Login settings.",
      "Request the ads_read permission. Standard access covers ad accounts your own login administers.",
      "For other businesses' accounts, complete business verification and App Review for ads_read.",
    ],
    env: [
      { name: "META_APP_ID", note: "App id" },
      { name: "META_APP_SECRET", note: "App secret" },
      { name: "META_API_VERSION", note: "Optional, defaults to v26.0" },
    ],
    approval:
      "Your own accounts work immediately in development mode. Reading clients' accounts needs App Review plus business verification.",
    approvalTone: "warn",
  },
  {
    slug: "tiktok-ads",
    steps: [
      "Register a developer app in TikTok for Business, under Tools then Developers.",
      "Add the redirect URI below and request the Ads Management and Reporting scopes.",
      "Submit the app for review; advertiser authorisation only works once it is approved.",
      "Set TIKTOK_REVENUE_METRIC only if your account tracks a purchase value metric you want in the revenue column.",
    ],
    env: [
      { name: "TIKTOK_APP_ID", note: "Developer app id" },
      { name: "TIKTOK_APP_SECRET", note: "Developer app secret" },
      { name: "TIKTOK_REVENUE_METRIC", note: "Optional, e.g. a purchase value metric your account reports" },
    ],
    approval: "TikTok reviews the app before it can read live advertiser data. Budget a few days.",
    approvalTone: "warn",
  },
  {
    slug: "linkedin-ads",
    steps: [
      "Create an app at linkedin.com/developers linked to your company page.",
      "Apply for the Marketing Developer Platform. This is the gate, and it is the slowest of the six.",
      "Once granted, add the r_ads and r_ads_reporting scopes and the redirect URI below.",
      "Pin LINKEDIN_API_VERSION to the YYYYMM version you tested against; LinkedIn does not default to the newest.",
    ],
    env: [
      { name: "LINKEDIN_CLIENT_ID", note: "App client id" },
      { name: "LINKEDIN_CLIENT_SECRET", note: "App client secret" },
      { name: "LINKEDIN_API_VERSION", note: "Optional, defaults to 202608" },
    ],
    approval:
      "Marketing Developer Platform access is reviewed by LinkedIn and can take a couple of weeks. Apply before you need it.",
    approvalTone: "bad",
  },
  {
    slug: "adform",
    steps: [
      "Ask your Adform account manager, or technical@adform.com, for API client credentials.",
      "Request the reporting scopes for the clients you need to read.",
      "Set the credentials below. Adform uses client credentials, so there is no user redirect.",
      "If your contract reports net rather than gross cost, set ADFORM_COST_SPEC to match.",
    ],
    env: [
      { name: "ADFORM_CLIENT_ID", note: "Issued by Adform" },
      { name: "ADFORM_CLIENT_SECRET", note: "Issued by Adform" },
      { name: "ADFORM_SCOPE", note: "Optional, space separated scope list" },
      { name: "ADFORM_COST_SPEC", note: "Optional cost specifier, defaults to gross" },
    ],
    approval: "No self-serve portal. Adform issues credentials manually, so allow for a support ticket.",
    approvalTone: "warn",
  },
  {
    slug: "google-analytics-4",
    steps: [
      "In a Google Cloud project, enable the Google Analytics Data API and the Admin API.",
      "Create an OAuth client of type Web application and add the redirect URI below.",
      "Authorise with a Google account that has at least Viewer on the GA4 property.",
      "The same OAuth client can serve Google Ads; set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to share one.",
    ],
    env: [
      { name: "GOOGLE_ANALYTICS_CLIENT_ID", note: "OAuth client id" },
      { name: "GOOGLE_ANALYTICS_CLIENT_SECRET", note: "OAuth client secret" },
    ],
    approval: "No approval queue. This one works as soon as the API is enabled.",
    approvalTone: "good",
  },
];

export default function ConnectorSetupPage() {
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Setup</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink-900">Connecting real ad accounts</h1>
      <p className="mt-4 text-base leading-relaxed text-ink-500">
        Six platforms read live reporting data: Google Ads, Meta, TikTok, LinkedIn, Adform and Google
        Analytics 4. Each needs an app registered on the platform side. Five of them also need the platform
        to approve that app, which is the part no amount of code removes.
      </p>

      <div className="mt-8 rounded-xl border border-ink-200 bg-ink-50 p-5">
        <h2 className="text-sm font-semibold text-ink-900">Before any of them</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-600">
          <li>
            Set <Code>APP_URL</Code> to the public origin of this app. Redirect URIs are built from it and must
            match what you register, character for character.
          </li>
          <li>
            Set <Code>APP_SECRET</Code> to a long random string. Stored platform tokens are encrypted with a key
            derived from it, so changing it forces every source to reconnect.
          </li>
          <li>Restart the app after changing environment variables, then reconnect the source.</li>
        </ul>
      </div>

      {SETUP.map((setup) => {
        const provider = PROVIDERS.find((p) => p.slug === setup.slug);
        if (!provider) return null;
        const configured = provider.isConfigured();
        return (
          <section key={setup.slug} className="mt-12 border-t border-ink-200 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-ink-900">{provider.label}</h2>
              <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                <StatusDot tone={configured ? "good" : "warn"} />
                {configured ? "Configured on this server" : "Not configured on this server"}
              </span>
            </div>

            <ol className="mt-4 space-y-2.5">
              {setup.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed text-ink-600">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            {provider.kind === "oauth" ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">Redirect URI</p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-900 px-4 py-3 text-[13px] text-white/90 scrollbar-thin">
                  <code>{appUrl.replace(/\/$/, "") + "/api/oauth/" + provider.slug + "/callback"}</code>
                </pre>
              </div>
            ) : null}

            {provider.scopes?.length ? (
              <p className="mt-3 text-sm text-ink-500">
                Scopes requested: <Code>{provider.scopes.join(" ")}</Code>
              </p>
            ) : null}

            <div className="mt-4 overflow-x-auto rounded-xl border border-ink-200 scrollbar-thin">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Environment variable</th>
                    <th className="px-4 py-2.5 font-medium">What it is</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {setup.env.map((variable) => (
                    <tr key={variable.name}>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px] text-ink-900">
                        {variable.name}
                      </td>
                      <td className="px-4 py-2.5 text-ink-500">{variable.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p
              className={
                "mt-4 rounded-lg border px-4 py-3 text-sm " +
                (setup.approvalTone === "good"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : setup.approvalTone === "warn"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-red-200 bg-red-50 text-red-800")
              }
            >
              <strong className="font-semibold">Access: </strong>
              {setup.approval}
            </p>

            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Platform API reference →
            </a>
          </section>
        );
      })}

      <section className="mt-12 border-t border-ink-200 pt-8">
        <h2 className="text-xl font-semibold text-ink-900">What live mode changes</h2>
        <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-ink-600">
          <li>
            A connection is <strong>live</strong> when it holds platform credentials and the provider is
            configured. Anything else stays on sample data, so a half-approved workspace still renders.
          </li>
          <li>
            Fetched rows are cached per connection and date range, for an hour on hourly sources, six hours on
            daily, a day on weekly. <strong>Sync now</strong> clears that cache.
          </li>
          <li>
            A source that fails keeps its last error on the connection and shows a banner on the overview,
            rather than quietly returning fewer rows.
          </li>
          <li>
            Attribution still models conversion paths. Real multi-touch needs visitor-level touchpoints from a
            tracking script, which the ad platform APIs do not hand out.
          </li>
        </ul>
        <p className="mt-6">
          <Link href="/docs" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Back to the API documentation →
          </Link>
        </p>
      </section>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[13px] text-ink-800">{children}</code>;
}
