import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, ConnectorMark } from "@/components/ui";
import { CONNECTORS, DESTINATIONS, DESTINATIONS_BY_SLUG } from "@/lib/catalog";

export function generateStaticParams() {
  return DESTINATIONS.map((destination) => ({ slug: destination.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const destination = DESTINATIONS_BY_SLUG[slug];
  if (!destination) return { title: "Destination" };
  return { title: destination.name + " destination", description: destination.tagline };
}

const SETUP_STEPS: Record<string, string[]> = {
  pull: [
    "Create a pipeline and pick the sources and fields you want exposed.",
    "Copy the connector URL and API key from the destination settings.",
    "Paste it into the BI tool and authorise. The tool queries AdsConnect directly on every refresh.",
  ],
  push: [
    "Create a pipeline and pick the sources and fields you want written.",
    "Point it at the target table, tab or bucket and choose append or replace.",
    "Set the schedule. Hourly, daily or weekly, with backfill on the first run.",
  ],
};

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = DESTINATIONS_BY_SLUG[slug];
  if (!destination) notFound();

  const popular = CONNECTORS.filter((c) => c.popular).slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-14">
      <nav className="mb-8 flex items-center gap-2 text-sm text-ink-400">
        <Link href="/destinations" className="hover:text-brand-600">
          Destinations
        </Link>
        <span>/</span>
        <span className="text-ink-700">{destination.name}</span>
      </nav>

      <div className="flex items-center gap-4">
        <ConnectorMark name={destination.name} color={destination.color} size={52} />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-900">
            Marketing data in {destination.name}
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            {destination.delivery === "push" ? "Scheduled push" : "Live pull"} destination
          </p>
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-500">{destination.tagline}</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Setup</h2>
          <ol className="mt-4 space-y-4">
            {SETUP_STEPS[destination.delivery].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-ink-500">{step}</p>
              </li>
            ))}
          </ol>

          {destination.setupFields.length ? (
            <>
              <h2 className="mt-10 text-lg font-semibold text-ink-900">What you will need</h2>
              <ul className="mt-4 space-y-2">
                {destination.setupFields.map((field) => (
                  <li key={field.key} className="rounded-lg border border-ink-200 px-4 py-3">
                    <div className="text-sm font-medium text-ink-900">{field.label}</div>
                    <div className="mt-0.5 font-mono text-xs text-ink-400">{field.placeholder}</div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h2 className="mt-10 text-lg font-semibold text-ink-900">Popular sources for this destination</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {popular.map((connector) => (
              <Link
                key={connector.slug}
                href={"/connectors/" + connector.slug}
                className="flex items-center gap-3 rounded-lg border border-ink-200 px-4 py-3 text-sm text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                <ConnectorMark name={connector.name} color={connector.color} size={26} />
                {connector.name}
              </Link>
            ))}
          </div>
        </div>

        <aside>
          <div className="rounded-xl border border-ink-200 bg-ink-50 p-6">
            <h3 className="text-sm font-semibold text-ink-900">Send data to {destination.name}</h3>
            <p className="mt-2 text-sm text-ink-500">
              Build the pipeline in the app, pick a schedule and let it run.
            </p>
            <ButtonLink href="/signup" className="mt-4 w-full">
              Start free trial
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" className="mt-2 w-full">
              Open demo workspace
            </ButtonLink>
          </div>

          <div className="mt-6 rounded-xl border border-ink-200 p-6">
            <h3 className="text-sm font-semibold text-ink-900">Other destinations</h3>
            <ul className="mt-3 space-y-2">
              {DESTINATIONS.filter((d) => d.slug !== destination.slug)
                .slice(0, 7)
                .map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={"/destinations/" + item.slug}
                      className="flex items-center gap-2.5 text-sm text-ink-500 hover:text-brand-600"
                    >
                      <ConnectorMark name={item.name} color={item.color} size={22} />
                      {item.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
