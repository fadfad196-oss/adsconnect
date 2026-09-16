import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { DESTINATIONS_BY_SLUG } from "@/lib/catalog";
import { addDestination, listDestinations, removeDestination, updateDestination } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  return NextResponse.json({ data: listDestinations(user.id) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const destination = String(body.destination ?? "");
  if (!DESTINATIONS_BY_SLUG[destination]) {
    return NextResponse.json({ error: "Unknown destination: " + destination }, { status: 400 });
  }
  const connectors = Array.isArray(body.connectors) ? body.connectors.map(String) : [];
  const fields = Array.isArray(body.fields) ? body.fields.map(String) : [];
  if (!connectors.length) {
    return NextResponse.json({ error: "Pick at least one source." }, { status: 400 });
  }
  if (!fields.length) {
    return NextResponse.json({ error: "Pick at least one field." }, { status: 400 });
  }

  const created = addDestination({
    userId: user.id,
    destination,
    name: String(body.name ?? DESTINATIONS_BY_SLUG[destination].name + " pipeline"),
    config: typeof body.config === "object" && body.config ? body.config : {},
    connectors,
    fields,
    schedule: body.schedule === "hourly" || body.schedule === "weekly" ? body.schedule : "daily",
  });

  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (body.action === "run") patch.lastRunAt = new Date().toISOString();
  if (body.action === "pause") patch.status = "paused";
  if (body.action === "resume") patch.status = "active";
  if (body.schedule) patch.schedule = body.schedule;

  const updated = updateDestination(user.id, String(body.id ?? ""), patch);
  if (!updated) return NextResponse.json({ error: "Pipeline not found." }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  removeDestination(user.id, id);
  return NextResponse.json({ ok: true });
}
