const GRAPH_VERSION = "v21.0";

export function getMetaAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: process.env.META_REDIRECT_URI!,
    state,
    scope: [
      "pages_manage_posts",
      "pages_read_engagement",
      "pages_show_list",
      "instagram_basic",
      "instagram_content_publish",
      "business_management",
      "publish_video", // necesar pentru Reels Publishing API (Facebook)
    ].join(","),
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
  if (!res.ok) throw new Error(data.error?.message || "Eroare la schimbul codului OAuth");
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
  if (!res.ok) throw new Error(data.error?.message || "Eroare la extinderea token-ului");
  return data as { access_token: string; expires_in: number };
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
  if (!res.ok) throw new Error(data.error?.message || "Eroare la preluarea paginilor");
  return data.data as FacebookPage[];
}

export async function getInstagramUsername(igUserId: string, accessToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}?fields=username&access_token=${accessToken}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Eroare la preluarea username-ului IG");
  return data.username as string;
}
