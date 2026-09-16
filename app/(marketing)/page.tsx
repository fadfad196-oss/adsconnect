import Link from "next/link";
import DashboardPreview from "@/components/marketing/DashboardPreview";
import SourceMarquee from "@/components/marketing/SourceMarquee";
import { Badge, ButtonLink, ConnectorMark, Section } from "@/components/ui";
import { CATEGORIES, CONNECTORS, DESTINATIONS, TOTAL_SOURCE_COUNT } from "@/lib/catalog";

const POPULAR = CONNECTORS.filter((c) => c.popular);

const STEPS = [
  {
    title: "Connect your sources",
    body: "Authorise Google Ads, Meta, TikTok, Klaviyo, Shopify and the rest in a couple of clicks. No API keys to babysit, no scripts to maintain.",
  },
  {
    title: "Map fields once",
    body: "Pick the metrics and dimensions you actually report on. We normalise naming across platforms so spend is spend everywhere.",
  },
  {
    title: "Send it anywhere",
    body: "Stream to Looker Studio, Sheets, BigQuery, Power BI or your warehouse on a schedule, or pull it live from one REST endpoint.",
  },
];

const FEATURES = [
  {
    title: "Blended reporting",
    body: "One table across every channel, with consistent currency, timezone and naming, so you can compare like for like.",
  },
  {
    title: "Multi-touch attribution",
    body: "First click, last click, linear, time decay, position based and a Markov data-driven model computed on your own paths.",
  },
  {
    title: "Full historical backfill",
    body: "We pull everything the platform API will give us, not just the last 30 days, so year-over-year works from day one.",
  },
  {
    title: "Schema that does not break",
    body: "Platforms rename fields constantly. We absorb that upstream so your dashboards and warehouse tables keep working.",
  },
  {
    title: "Hourly refresh",
    body: "Daily is the default. Move to hourly for the campaigns where a day of lag costs real money.",
  },
  {
    title: "Your own REST API",
    body: "Every connected source behind a single authenticated endpoint that returns JSON or CSV.",
  },
];

const FAQ = [
  {
    q: "How long does setup actually take?",
    a: "A first pipeline from a connected ad account into Looker Studio or Sheets takes a few minutes. The slow part is usually deciding which fields you want, not the connection itself.",
  },
  {
    q: "Do you store our raw data?",
    a: "Data is cached so reports load fast and so historical rows survive platform retention limits. You can purge a source at any time from the connection settings.",
  },
  {
    q: "What happens when a platform changes its API?",
    a: "That is the work you are paying for. Field mappings are maintained upstream, so a rename on the platform side does not break your dashboard.",
  },
  {
    q: "Can we use our own warehouse?",
    a: "Yes. BigQuery, Snowflake, Redshift, Postgres and S3 are push destinations, with append or replace and schema evolution handled for you.",
  },
  {
    q: "How is attribution calculated?",
    a: "Touchpoints are stitched into paths per converting visitor, then each model redistributes the credit. The data-driven model uses removal effect on a Markov chain built from your paths, not a fixed rule.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-ink-200">
        <div className="absolute inset-0 grid-bg opacity-70" aria-hidden="true" />
        <div className="absolute inset-0 hero-glow" aria-hidden="true" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div className="max-w-xl">
            <Badge tone="brand">{TOTAL_SOURCE_COUNT}+ marketing data sources</Badge>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
              All your marketing data, in one place, on a schedule
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-500">
              AdsConnect pulls campaign, web, email and revenue data from every platform you run, normalises
              it, and delivers it to the dashboard, spreadsheet or warehouse your team already uses.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" size="lg">
                Start 30-day free trial
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" size="lg">
                Try the live demo
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-ink-400">
              No credit card required · Cancel any time · Demo login on the sign-in page
            </p>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-ink-200 pt-6">
              <Stat value={TOTAL_SOURCE_COUNT + "+"} label="Data sources" />
              <Stat value={DESTINATIONS.length + ""} label="Destinations" />
              <Stat value="7" label="Attribution models" />
            </dl>
          </div>

          <div className="lg:pl-4">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- marquee */}
      <div className="border-b border-ink-200 bg-white py-8">
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-widest text-ink-400">
          Connect the platforms you already run
        </p>
        <SourceMarquee />
      </div>

      {/* ----------------------------------------------------------- steps */}
      <Section
        eyebrow="How it works"
        title="Three steps, no engineering ticket"
        body="The whole point is that a marketer can do this without waiting on a data team."
      >
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-ink-200 bg-white p-6">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">
                {i + 1}
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ------------------------------------------------------- connectors */}
      <section className="border-y border-ink-200 bg-ink-50">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                Every source your reporting touches
              </h2>
              <p className="mt-3 text-base text-ink-500">
                Ad platforms, analytics, e-commerce, CRM, email, SEO and call tracking, all landing in the
                same shape.
              </p>
            </div>
            <ButtonLink href="/connectors" variant="secondary">
              Browse all {TOTAL_SOURCE_COUNT}+ sources
            </ButtonLink>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {POPULAR.map((connector) => (
              <Link
                key={connector.slug}
                href={"/connectors/" + connector.slug}
                className="group flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <ConnectorMark name={connector.name} color={connector.color} />
                <span>
                  <span className="block text-sm font-medium text-ink-900 group-hover:text-brand-700">
                    {connector.name}
                  </span>
                  <span className="block text-xs text-ink-400">{connector.category}</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Link
                key={category}
                href={"/connectors?category=" + encodeURIComponent(category)}
                className="rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ destinations */}
      <Section
        eyebrow="Destinations"
        title="Land the data where the decisions happen"
        body="Push on a schedule into a warehouse or spreadsheet, or let the BI tool pull it live."
      >
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map((destination) => (
            <Link
              key={destination.slug}
              href={"/destinations/" + destination.slug}
              className="group rounded-xl border border-ink-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <ConnectorMark name={destination.name} color={destination.color} size={32} />
                <h3 className="text-sm font-semibold text-ink-900 group-hover:text-brand-700">
                  {destination.name}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-500">{destination.tagline}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-400">
                {destination.delivery === "push" ? "Scheduled push" : "Live pull"}
              </p>
            </Link>
          ))}
        </div>
      </Section>

      {/* -------------------------------------------------------- features */}
      <section className="border-y border-ink-200 bg-ink-50">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-ink-900">
            Built for the boring parts that break reporting
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-ink-200 bg-white p-6">
                <h3 className="text-base font-semibold text-ink-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- api */}
      <Section
        eyebrow="Developer friendly"
        title="One endpoint for every connected platform"
        body="Same query shape whatever the source. Ask for the fields you want, get JSON or CSV back."
      >
        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-xl border border-ink-200 bg-ink-900">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <span className="text-xs font-medium text-white/60">GET request</span>
            <span className="text-xs text-white/40">200 OK · application/json</span>
          </div>
          <pre className="overflow-x-auto px-4 py-4 text-[13px] leading-relaxed text-white/90 scrollbar-thin">
            <code>{`curl "https://api.adsconnect.io/v1/all?api_key=ac_live_xxx\\
  &date_preset=last_30d\\
  &fields=date,source,campaign,spend,clicks,conversions,revenue,roas"

{
  "data": [
    {
      "date": "2026-09-01",
      "source": "Google Ads",
      "campaign": "GOO | Brand Search",
      "spend": 412.87,
      "clicks": 264,
      "conversions": 19,
      "revenue": 2180.44,
      "roas": 5.28
    }
  ]
}`}</code>
          </pre>
        </div>
        <div className="mt-6 text-center">
          <ButtonLink href="/docs" variant="secondary">
            Read the API docs
          </ButtonLink>
        </div>
      </Section>

      {/* ------------------------------------------------------------- faq */}
      <section className="border-t border-ink-200 bg-ink-50">
        <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-900">Questions worth asking</h2>
          <div className="mt-8 divide-y divide-ink-200 border-y border-ink-200">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-ink-900">
                  {item.q}
                  <span className="text-ink-400 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-500">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- cta */}
      <section className="bg-ink-900">
        <div className="mx-auto w-full max-w-4xl px-5 py-16 text-center sm:py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Stop rebuilding the same spreadsheet every Monday
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
            Connect a source, pick a destination, and let the refresh run itself.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/signup" size="lg">
              Start free trial
            </ButtonLink>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 px-6 text-base font-medium text-white transition-colors hover:bg-white/10"
            >
              Open the demo workspace
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-2xl font-semibold tabular-nums text-ink-900">{value}</dt>
      <dd className="mt-1 text-xs text-ink-500">{label}</dd>
    </div>
  );
}
