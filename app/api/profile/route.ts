import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { updateUser } from "@/lib/store";

export const runtime = "nodejs";

const PLANS = ["free", "basic", "standard", "enterprise"] as const;

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const patch: { name?: string; company?: string; plan?: (typeof PLANS)[number] } = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 80);
  if (typeof body.company === "string" && body.company.trim()) patch.company = body.company.trim().slice(0, 80);
  if (PLANS.includes(body.plan)) patch.plan = body.plan;

  updateUser(user.id, patch);
  return NextResponse.json({ ok: true, data: patch });
}
