import { adformProvider } from "./adform";
import { ga4Provider } from "./ga4";
import { googleAdsProvider } from "./google-ads";
import { linkedinProvider } from "./linkedin";
import { metaProvider } from "./meta";
import { tiktokProvider } from "./tiktok";
import { ProviderError, type Provider, type ProviderAuth } from "./types";

export * from "./types";

export const PROVIDERS: Provider[] = [
  googleAdsProvider,
  metaProvider,
  tiktokProvider,
  linkedinProvider,
  adformProvider,
  ga4Provider,
];

export const PROVIDERS_BY_SLUG: Record<string, Provider> = Object.fromEntries(
  PROVIDERS.map((provider) => [provider.slug, provider]),
);

/** Connector slug in the catalogue -> the provider that can fetch it live. */
const BY_CONNECTOR: Record<string, Provider> = Object.fromEntries(
  PROVIDERS.flatMap((provider) => provider.connectors.map((connector) => [connector, provider])),
);

export function providerForConnector(connector: string): Provider | undefined {
  return BY_CONNECTOR[connector];
}

export function providerStatus(connector: string) {
  const provider = providerForConnector(connector);
  if (!provider) return { supported: false as const };
  return {
    supported: true as const,
    provider,
    configured: provider.isConfigured(),
    missingEnv: provider.requiredEnv.filter((name) => !process.env[name]),
  };
}

/** Access tokens near expiry are refreshed before use, and the caller persists them. */
export async function withFreshAuth(
  provider: Provider,
  auth: ProviderAuth,
  onTokens?: (next: ProviderAuth) => void,
): Promise<ProviderAuth> {
  const expiringSoon = auth.expiresAt !== undefined && auth.expiresAt - Date.now() < 120_000;
  if (!expiringSoon) return auth;

  if (provider.kind === "client_credentials" && provider.authenticate) {
    const next = { ...(await provider.authenticate()), extra: auth.extra };
    onTokens?.(next);
    return next;
  }

  if (!provider.refresh) {
    throw new ProviderError(provider.slug, "The stored token expired. Reconnect the account.", 401, true);
  }

  const next = await provider.refresh(auth);
  onTokens?.(next);
  return next;
}
