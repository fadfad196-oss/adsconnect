import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { CONNECTORS_BY_SLUG } from "@/lib/catalog";
import { PROVIDERS_BY_SLUG, providerForConnector } from "@/lib/providers";
import { redirectUriFor } from "@/lib/oauth";
import { encryptJson, signState } from "@/lib/secrets";
import { createAuthSession } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { provider: slug } = await context.params;
  const url = new URL(request.url);
  const connector = url.searchParams.get("connector") ?? slug;

  const provider = PROVIDERS_BY_SLUG[slug] ?? providerForConnector(connector);
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider: " + slug }, { status: 404 });
  }
  if (!CONNECTORS_BY_SLUG[connector]) {
    return NextResponse.json({ error: "Unknown connector: " + connector }, { status: 404 });
  }
  if (!provider.isConfigured()) {
    return NextResponse.redirect(new URL("/app/connectors/" + connector + "?setup=1", request.url));
  }

  // Client-credentials providers have no user consent screen to visit.
  if (provider.kind === "client_credentials" && provider.authenticate) {
    try {
      const auth = await provider.authenticate();
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
      const message = encodeURIComponent((error as Error).message ?? "Authentication failed.");
      return NextResponse.redirect(
        new URL("/app/connectors/" + connector + "?error=" + message, request.url),
      );
    }
  }

  if (!provider.authorizeUrl) {
    return NextResponse.json({ error: "This provider has no authorisation flow." }, { status: 400 });
  }

  const state = signState({ userId: user.id, provider: provider.slug, connector });
  return NextResponse.redirect(provider.authorizeUrl(state, redirectUriFor(request, provider.slug)));
}
