import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { CONNECTORS_BY_SLUG } from "@/lib/catalog";
import { invalidateCache } from "@/lib/sources";
import {
  addConnection,
  consumeAuthSession,
  getAuthSession,
  listConnections,
  removeConnection,
  updateConnection,
} from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  // Credentials never leave the server, not even to the workspace that owns them.
  const data = listConnections(user.id).map(({ credentials: _credentials, ...rest }) => rest);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const connector = String(body.connector ?? "");
  if (!CONNECTORS_BY_SLUG[connector]) {
    return NextResponse.json({ error: "Unknown connector: " + connector }, { status: 400 });
  }

  // An authId means the user just completed the platform authorisation flow.
  const authId = body.authId ? String(body.authId) : "";
  const session = authId ? getAuthSession(user.id, authId) : undefined;
  if (authId && !session) {
    return NextResponse.json({ error: "That authorisation expired. Connect again." }, { status: 410 });
  }
  if (session && session.connector !== connector) {
    return NextResponse.json({ error: "That authorisation belongs to another source." }, { status: 400 });
  }

  const connection = addConnection({
    userId: user.id,
    connector,
    accountId: String(body.accountId ?? "act_" + Math.floor(Math.random() * 8999999 + 1000000)),
    accountName: String(body.accountName ?? user.company),
    frequency: body.frequency === "hourly" || body.frequency === "weekly" ? body.frequency : "daily",
    mode: session ? "live" : "sample",
    credentials: session?.credentials,
    currency: body.currency ? String(body.currency) : undefined,
  });

  const { credentials: _credentials, ...safe } = connection;
  return NextResponse.json({ data: safe }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const connectionId = String(body.id ?? "");
  const patch: Record<string, unknown> = {};

  if (body.action === "sync") {
    // Live sources re-read the platform; cached rows would defeat the point.
    invalidateCache(connectionId);
    patch.lastSyncAt = new Date().toISOString();
    patch.status = "connected";
    patch.error = undefined;
  }
  if (body.action === "pause") patch.status = "paused";
  if (body.action === "resume") patch.status = "connected";
  if (body.frequency) patch.frequency = body.frequency;

  const updated = updateConnection(user.id, connectionId, patch);
  if (!updated) return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  const { credentials: _credentials, ...safe } = updated;
  return NextResponse.json({ data: safe });
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body.authId) consumeAuthSession(user.id, String(body.authId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  invalidateCache(id);
  removeConnection(user.id, id);
  return NextResponse.json({ ok: true });
}
