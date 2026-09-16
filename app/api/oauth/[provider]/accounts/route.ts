import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { PROVIDERS_BY_SLUG, ProviderError, withFreshAuth, type ProviderAuth } from "@/lib/providers";
import { decryptJson } from "@/lib/secrets";
import { getAuthSession } from "@/lib/store";

export const runtime = "nodejs";

/** Lists the accounts the freshly authorised grant can actually read. */
export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { provider: slug } = await context.params;
  const provider = PROVIDERS_BY_SLUG[slug];
  if (!provider) return NextResponse.json({ error: "Unknown provider: " + slug }, { status: 404 });

  const authId = new URL(request.url).searchParams.get("auth");
  if (!authId) return NextResponse.json({ error: "Missing auth session." }, { status: 400 });

  const session = getAuthSession(user.id, authId);
  if (!session) {
    return NextResponse.json({ error: "That authorisation expired. Connect again." }, { status: 410 });
  }

  const stored = decryptJson<ProviderAuth>(session.credentials);
  if (!stored) {
    return NextResponse.json({ error: "Stored credentials could not be read." }, { status: 500 });
  }

  try {
    const auth = await withFreshAuth(provider, stored);
    const accounts = await provider.listAccounts(auth);
    return NextResponse.json({ data: accounts, connector: session.connector });
  } catch (error) {
    const providerError = error as ProviderError;
    return NextResponse.json(
      { error: providerError.message ?? "Could not list accounts.", reauthorize: providerError.reauthorize },
      { status: providerError.status && providerError.status < 600 ? providerError.status : 502 },
    );
  }
}
