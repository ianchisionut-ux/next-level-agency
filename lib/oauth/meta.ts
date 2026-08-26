const GRAPH_VERSION = "v21.0";

export const META_OAUTH_SCOPES = [
  "pages_manage_posts",
  "pages_read_engagement",
  "pages_show_list",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
] as const;

export const META_ANALYTICS_SCOPES = [
  "pages_read_engagement",
  "read_insights",
  "instagram_basic",
  "instagram_manage_insights",
] as const;

type MetaErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

function metaError(context: string, status: number, data: MetaErrorPayload) {
  const error = data.error;
  const details = [
    error?.code != null ? `code ${error.code}` : null,
    error?.error_subcode != null ? `subcode ${error.error_subcode}` : null,
    error?.type ?? null,
    error?.fbtrace_id ? `trace ${error.fbtrace_id}` : null,
  ].filter(Boolean);
  return new Error(
    `${context}: ${error?.message || `HTTP ${status}`}${details.length ? ` (${details.join(", ")})` : ""}`
  );
}

export function getMetaAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: process.env.META_REDIRECT_URI!,
    state,
    scope: META_OAUTH_SCOPES.join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params}`;
}

export async function exchangeMetaCode(code: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: process.env.META_REDIRECT_URI!,
    code,
  });
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${params}`);
  const data = await res.json();
  if (!res.ok) throw metaError("Schimbul codului OAuth Meta a eșuat", res.status, data);
  return data as { access_token: string; token_type: string; expires_in?: number };
}

// Token-urile short-lived (~1-2h) trebuie schimbate cu unul long-lived (~60 zile)
export async function getLongLivedToken(shortLivedToken: string) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${params}`);
  const data = await res.json();
  if (!res.ok) throw metaError("Extinderea token-ului Meta a eșuat", res.status, data);
  return data as { access_token: string; expires_in?: number };
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

// Returneaza toate paginile de Facebook la care userul are acces,
// impreuna cu contul de Instagram Business conectat (daca exista)
export async function getManagedPages(userAccessToken: string): Promise<FacebookPage[]> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`
  );
  const data = await res.json();
  if (!res.ok) throw metaError("Preluarea paginilor Meta a eșuat", res.status, data);
  return Array.isArray(data.data) ? (data.data as FacebookPage[]) : [];
}

export async function getInstagramUsername(igUserId: string, accessToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}?fields=username&access_token=${accessToken}`
  );
  const data = await res.json();
  if (!res.ok) throw metaError("Preluarea contului Instagram a eșuat", res.status, data);
  return data.username as string;
}

export async function inspectMetaToken(accessToken: string) {
  const appAccessToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
  const params = new URLSearchParams({ input_token: accessToken, access_token: appAccessToken });
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/debug_token?${params}`);
  const payload = await res.json();
  if (!res.ok || payload.error) {
    throw metaError("Validarea token-ului Meta a eșuat", res.status, payload);
  }

  const data = payload.data ?? {};
  const scopes: string[] = data.scopes ?? [];
  // inspectMetaToken este folosit pentru System User Token. Scope-urile de
  // login ale utilizatorului (ex. pages_show_list) nu sunt obligatorii aici.
  const missingScopes = META_ANALYTICS_SCOPES.filter((scope) => !scopes.includes(scope));
  return {
    isValid: Boolean(data.is_valid),
    type: data.type ?? null,
    appIdMatches: !data.app_id || data.app_id === process.env.META_APP_ID,
    expiresAt: data.expires_at ? new Date(data.expires_at * 1000).toISOString() : null,
    scopes,
    missingScopes,
  };
}
