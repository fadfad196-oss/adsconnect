import { NextResponse } from "next/server";
import {
  ATTRIBUTION_MODELS,
  attribute,
  attributionChannels,
  channelLabel,
  generateJourneys,
  topPaths,
  type AttributionModel,
} from "@/lib/attribution";
import { resolveRange } from "@/lib/metrics";
import { listConnections, userForApiKey } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const key = url.searchParams.get("api_key") ?? bearer;
  const user = key ? userForApiKey(key) : undefined;
  if (!user) return NextResponse.json({ error: "Missing or unknown api_key." }, { status: 401 });

  const model = (url.searchParams.get("model") ?? "last_click") as AttributionModel;
  if (!ATTRIBUTION_MODELS.some((m) => m.id === model)) {
    return NextResponse.json(
      { error: "Unknown model. Supported: " + ATTRIBUTION_MODELS.map((m) => m.id).join(", ") },
      { status: 400 },
    );
  }

  const { from, to } = resolveRange(
    url.searchParams.get("date_preset") ?? "last_30d",
    url.searchParams.get("date_from") ?? undefined,
    url.searchParams.get("date_to") ?? undefined,
  );

  const channels = attributionChannels(
    listConnections(user.id)
      .filter((c) => c.status !== "paused")
      .map((c) => c.connector),
  );

  if (channels.length < 2) {
    return NextResponse.json(
      { error: "Attribution needs at least two connected acquisition sources." },
      { status: 400 },
    );
  }

  const journeys = generateJourneys({ channels, from, to });
  const credits = attribute(journeys, model);

  return NextResponse.json({
    meta: {
      model,
      date_from: from,
      date_to: to,
      total_conversions: journeys.length,
      row_count: credits.length,
    },
    data: credits.map((credit) => ({
      channel: credit.channel,
      channel_name: channelLabel(credit.channel),
      conversions: credit.conversions,
      revenue: credit.revenue,
    })),
    top_paths: topPaths(journeys, 10).map((path) => ({
      path: path.path.map(channelLabel),
      conversions: path.conversions,
      revenue: path.revenue,
    })),
  });
}
