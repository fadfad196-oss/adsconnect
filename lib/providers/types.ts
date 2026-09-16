import type { Row } from "../metrics";

/** Tokens held for one connection. Refresh fields are absent where a provider has none. */
export interface ProviderAuth {
  accessToken: string;
  refreshToken?: string;
  /** Epoch millis. Absent means "no known expiry". */
  expiresAt?: number;
  /** Provider-specific extras, e.g. the Google Ads login customer id. */
  extra?: Record<string, string>;
}

export interface AccountRef {
  id: string;
  name: string;
  currency?: string;
}

export interface FetchParams {
  accountId: string;
  from: string;
  to: string;
  /** Campaign level is what every dashboard in the app needs; ad level is opt-in. */
  granularity: "campaign" | "adgroup" | "ad";
  currency?: string;
}

export interface ProviderContext {
  /** Called when a refresh produced new tokens, so the caller can persist them. */
  onTokens?: (auth: ProviderAuth) => void;
}

export type ProviderKind = "oauth" | "client_credentials";

export interface Provider {
  slug: string;
  label: string;
  kind: ProviderKind;
  /** Connector slugs this provider serves. */
  connectors: string[];
  /** Env vars that must be set before the provider can be used. */
  requiredEnv: string[];
  docsUrl: string;
  /** What the user has to do on the platform side before this works. */
  accessNote: string;
  scopes?: string[];

  isConfigured(): boolean;
  authorizeUrl?(state: string, redirectUri: string): string;
  exchangeCode?(code: string, redirectUri: string): Promise<ProviderAuth>;
  /** Client-credentials providers mint a token without a user round trip. */
  authenticate?(): Promise<ProviderAuth>;
  refresh?(auth: ProviderAuth): Promise<ProviderAuth>;
  listAccounts(auth: ProviderAuth, ctx?: ProviderContext): Promise<AccountRef[]>;
  fetchRows(auth: ProviderAuth, params: FetchParams, ctx?: ProviderContext): Promise<Row[]>;
}

export class ProviderError extends Error {
  status: number;
  provider: string;
  /** True when reconnecting is the fix, e.g. a revoked or expired grant. */
  reauthorize: boolean;

  constructor(provider: string, message: string, status = 502, reauthorize = false) {
    super(message);
    this.provider = provider;
    this.status = status;
    this.reauthorize = reauthorize;
  }
}

export function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function requireEnv(provider: string, name: string): string {
  const value = env(name);
  if (!value) throw new ProviderError(provider, "Missing environment variable " + name + ".", 500);
  return value;
}
