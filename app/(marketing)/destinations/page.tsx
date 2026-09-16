import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, ConnectorMark } from "@/components/ui";
import { DESTINATIONS } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Destinations",
  description:
    "Send blended marketing data to Looker Studio, Google Sheets, BigQuery, Snowflake, Power BI, Tableau, S3 or your own REST client.",
};

const GROUPS = [
  { kind: "bi", title: "BI and dashboards", body: "The tool pulls live, so a refresh in the report is a refresh of the data." },
  { kind: "spreadsheet", title: "Spreadsheets", body: "Scheduled writes into a tab, with the header row kept stable." },
  { kind: "warehouse", title: "Warehouses and databases", body: "Append or replace, partitioned by date, with schema evolution handled." },
  { kind: "storage", title: "Object storage", body: "CSV or Parquet drops on your schedule, into your bucket." },
  { kind: "api", title: "API and code", body: "One authenticated endpoint across every connected source." },
] as const;

export default function DestinationsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Destinations</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink-900">
          Your data, in the tool your team already opens
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-500">
          Nobody adopts a new dashboard because the pipeline vendor prefers it. Push into the warehouse, pull
          into the BI tool, or both.
        </p>
        <div className="mt-6">
          <ButtonLink href="/signup">Start free trial</ButtonLink>
        </div>
      </div>

      <div className="mt-14 space-y-12">
        {GROUPS.map((group) => {
          const items = DESTINATIONS.filter((d) => d.kind === group.kind);
          if (!items.length) return null;
          return (
            <section key={group.kind}>
              <h2 className="text-lg font-semibold text-ink-900">{group.title}</h2>
              <p className="mt-1 text-sm text-ink-500">{group.body}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((destination) => (
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
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
