import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { bootstrapWorkspace, createSession, createUser, findUserByEmail } from "@/lib/store";
import { CONNECTORS_BY_SLUG } from "@/lib/catalog";

export const runtime = "nodejs";

const STARTER_SOURCES = ["google-ads", "facebook-ads", "google-analytics-4"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();
  const company = String(body.company ?? "").trim();
  const source = String(body.source ?? "").trim();

  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (findUserByEmail(email)) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const user = createUser({
    email,
    password,
    name: name || email.split("@")[0],
    company: company || "My workspace",
  });

  // New workspaces start with a couple of sources connected so the app is not empty.
  const starters = CONNECTORS_BY_SLUG[source]
    ? [source, ...STARTER_SOURCES.filter((s) => s !== source)].slice(0, 3)
    : STARTER_SOURCES;
  bootstrapWorkspace(user.id, starters);

  const session = createSession(user.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
