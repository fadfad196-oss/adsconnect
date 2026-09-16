/** Redirect URIs must match the platform app registration exactly. */
export function redirectUriFor(request: Request, providerSlug: string): string {
  const base = process.env.APP_URL || new URL(request.url).origin;
  return base.replace(/\/$/, "") + "/api/oauth/" + providerSlug + "/callback";
}
