import { ProviderError } from "./types";

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** Send the body as form encoding instead of JSON. */
  form?: Record<string, string>;
  /** Seconds before the request is abandoned. */
  timeout?: number;
  /** Return the raw Response instead of parsed JSON (for header-driven flows). */
  raw?: boolean;
}

const DEFAULT_TIMEOUT = 45;

/**
 * One HTTP path for every provider, so timeouts, retries on 429/5xx and error
 * shapes are consistent no matter which platform misbehaves.
 */
export async function request<T>(provider: string, url: string, options: RequestOptions = {}): Promise<T> {
  const attempts = 3;
  let lastError: ProviderError | undefined;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), (options.timeout ?? DEFAULT_TIMEOUT) * 1000);

    try {
      const headers: Record<string, string> = { accept: "application/json", ...options.headers };
      let body: string | undefined;

      if (options.form) {
        headers["content-type"] = "application/x-www-form-urlencoded";
        body = new URLSearchParams(options.form).toString();
      } else if (options.body !== undefined) {
        headers["content-type"] = "application/json";
        body = JSON.stringify(options.body);
      }

      const response = await fetch(url, {
        method: options.method ?? (body ? "POST" : "GET"),
        headers,
        body,
        signal: controller.signal,
      });

      if (response.status === 429 || response.status >= 500) {
        const text = await response.text().catch(() => "");
        lastError = new ProviderError(
          provider,
          "Upstream returned " + response.status + ". " + truncate(text),
          response.status === 429 ? 429 : 502,
        );
        if (attempt < attempts) {
          await sleep(500 * Math.pow(3, attempt - 1));
          continue;
        }
        throw lastError;
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const reauthorize = response.status === 401 || response.status === 403;
        throw new ProviderError(
          provider,
          describe(response.status, text),
          response.status,
          reauthorize,
        );
      }

      if (options.raw) return response as unknown as T;
      const text = await response.text();
      if (!text) return {} as T;
      return JSON.parse(text) as T;
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof ProviderError) {
        if (error.status === 429 || error.status === 502) {
          if (attempt < attempts) {
            await sleep(500 * Math.pow(3, attempt - 1));
            continue;
          }
        }
        throw error;
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new ProviderError(provider, "Request timed out.", 504);
        if (attempt < attempts) continue;
        throw lastError;
      }
      throw new ProviderError(provider, (error as Error).message ?? "Request failed.");
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new ProviderError(provider, "Request failed.");
}

function describe(status: number, text: string): string {
  const detail = extractMessage(text);
  if (status === 401) return "Authorisation was rejected. Reconnect the account. " + detail;
  if (status === 403) return "The account is not permitted to read this data. " + detail;
  if (status === 400) return "The platform rejected the query. " + detail;
  return "Upstream returned " + status + ". " + detail;
}

/** Providers bury the useful line in different places; try the common ones. */
function extractMessage(text: string): string {
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    const candidates = [
      (body.error as { message?: string } | undefined)?.message,
      body.message,
      body.error_description,
      body.errorMessage,
      (Array.isArray(body.errors) ? (body.errors[0] as { message?: string })?.message : undefined),
    ];
    const found = candidates.find((c) => typeof c === "string" && c);
    if (found) return truncate(String(found));
  } catch {
    // fall through to the raw text
  }
  return truncate(text);
}

function truncate(text: string, max = 300): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
