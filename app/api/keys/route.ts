import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  return NextResponse.json({ data: listApiKeys(user.id) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const key = createApiKey(user.id, String(body.name ?? "New key").slice(0, 60));
  return NextResponse.json({ data: key }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  revokeApiKey(user.id, id);
  return NextResponse.json({ ok: true });
}
