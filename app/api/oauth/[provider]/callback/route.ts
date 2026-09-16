import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { PROVIDERS_BY_SLUG } from "@/lib/providers";
import { encryptJson, verifyState } from "@/lib/secrets";
import { createAuthSession } from "@/lib/store";
import { redirectUriFor } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider: slug } = await context.params;
  const provider = PROVIDERS_BY_SLUG[slug];
  const url = new URL(request.url);

  const fail = (connector: string, message: string) =>
    NextResponse.redirect(
      new URL("/app/connectors/" + connector + "?error=" + encodeURIComponent(message), request.url),
    );

  if (!provider || !provider.exchangeCode) {
    return NextResponse.json({ error: "Unknown provider: " + slug }, { status: 404 });
  }

  // The platform reports user cancellation here, not as a failed exchange.
  const platformError =
    url.searchParams.get("error_description") ??
    url.searchParams.get("error_message") ??
    url.searchParams.get("error");

  const state = verifyState<{ userId: string; provider: string; connector: string }>(
    url.searchParams.get("state"),
  );
  const connector = state?.connector ?? provider.connectors[0];

  if (platformError) return fail(connector, platformError);
  if (!state) return fail(connector, "The authorisation link expired. Start the connection again.");

  const user = await currentUser();
  if (!user || user.id !== state.userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // TikTok returns auth_code; everyone else returns code.
  const code = url.searchParams.get("code") ?? url.searchParams.get("auth_code");
  if (!code) return fail(connector, "The platform did not return an authorisation code.");

  try {
    const auth = await provider.exchangeCode(code, redirectUriFor(request, provider.slug));
    const session = createAuthSession({
      userId: user.id,
      provider: provider.slug,
      connector,
      credentials: encryptJson(auth),
    });
    return NextResponse.redirect(
      new URL("/app/connectors/" + connector + "?auth=" + session.id, request.url),
    );
  } catch (error) {
    return fail(connector, (error as Error).message ?? "Token exchange failed.");
  }
}
