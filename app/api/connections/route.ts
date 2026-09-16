import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { CONNECTORS_BY_SLUG } from "@/lib/catalog";
import { addConnection, listConnections, removeConnection, updateConnection } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  return NextResponse.json({ data: listConnections(user.id) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const connector = String(body.connector ?? "");
  if (!CONNECTORS_BY_SLUG[connector]) {
    return NextResponse.json({ error: "Unknown connector: " + connector }, { status: 400 });
  }

  const connection = addConnection({
    userId: user.id,
    connector,
    accountId: String(body.accountId ?? "act_" + Math.floor(Math.random() * 8999999 + 1000000)),
    accountName: String(body.accountName ?? user.company),
    frequency: body.frequency === "hourly" || body.frequency === "weekly" ? body.frequency : "daily",
  });

  return NextResponse.json({ data: connection }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const connectionId = String(body.id ?? "");
  const patch: Record<string, unknown> = {};

  if (body.action === "sync") {
    patch.lastSyncAt = new Date().toISOString();
    patch.status = "connected";
  }
  if (body.action === "pause") patch.status = "paused";
  if (body.action === "resume") patch.status = "connected";
  if (body.frequency) patch.frequency = body.frequency;

  const updated = updateConnection(user.id, connectionId, patch);
  if (!updated) return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  removeConnection(user.id, id);
  return NextResponse.json({ ok: true });
}
