import { NextResponse } from "next/server";
import { CONNECTORS, CORE_DIMENSIONS, CORE_METRICS } from "@/lib/catalog";

export const runtime = "nodejs";

/** Public catalogue, so integrations can discover slugs and fields without a key. */
export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get("category");
  const data = CONNECTORS.filter((c) => !category || c.category === category).map((connector) => ({
    slug: connector.slug,
    name: connector.name,
    category: connector.category,
    auth: connector.auth,
    dimensions: [...CORE_DIMENSIONS, ...(connector.extraDimensions ?? [])],
    metrics: [...CORE_METRICS, ...(connector.extraMetrics ?? [])],
  }));

  return NextResponse.json({ meta: { row_count: data.length }, data });
}
