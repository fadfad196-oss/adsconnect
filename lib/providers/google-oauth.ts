import { request } from "./http";
import { ProviderAuth, ProviderError, env } from "./types";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export function googleClient(provider: string) {
  // Both Google connectors can share one OAuth client, or use their own.
  const prefix = provider === "google-ads" ? "GOOGLE_ADS" : "GOOGLE_ANALYTICS";
  const clientId = env(prefix + "_CLIENT_ID") ?? env("GOOGLE_CLIENT_ID");
  const clientSecret = env(prefix + "_CLIENT_SECRET") ?? env("GOOGLE_CLIENT_SECRET");
  return { clientId, clientSecret };
}

export function googleAuthorizeUrl(
  provider: string,
  state: string,
  redirectUri: string,
  scopes: string[],
): string {
  const { clientId } = googleClient(provider);
  if (!clientId) throw new ProviderError(provider, "Google OAuth client is not configured.", 500);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    // offline + consent is what actually returns a refresh token on re-auth.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return AUTH_URL + "?" + params.toString();
}

export async function googleExchangeCode(
  provider: string,
  code: string,
  redirectUri: string,
): Promise<ProviderAuth> {
  const { clientId, clientSecret } = googleClient(provider);
  if (!clientId || !clientSecret) {
    throw new ProviderError(provider, "Google OAuth client is not configured.", 500);
  }
  const token = await request<TokenResponse>(provider, TOKEN_URL, {
    form: {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    },
  });
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
  };
}

export async function googleRefresh(provider: string, auth: ProviderAuth): Promise<ProviderAuth> {
  if (!auth.refreshToken) {
    throw new ProviderError(provider, "No refresh token stored. Reconnect the account.", 401, true);
  }
  const { clientId, clientSecret } = googleClient(provider);
  if (!clientId || !clientSecret) {
    throw new ProviderError(provider, "Google OAuth client is not configured.", 500);
  }
  const token = await request<TokenResponse>(provider, TOKEN_URL, {
    form: {
      refresh_token: auth.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    },
  });
  return {
    ...auth,
    accessToken: token.access_token,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
  };
}
