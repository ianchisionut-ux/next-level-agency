/**
 * Publisher pentru Facebook Pages si Instagram Business, via Meta Graph API.
 * Docs: https://developers.facebook.com/docs/graph-api
 *
 * Necesita:
 * - accessToken cu permisiuni pages_manage_posts (FB) / instagram_content_publish (IG)
 * - externalId = page-id (FB) sau ig-user-id (IG)
 */

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
}

export async function publishToFacebook(params: {
  pageId: string;
  accessToken: string;
  content: string;
  mediaUrls: string[];
}): Promise<PublishResult> {
  const { pageId, accessToken, content, mediaUrls } = params;

  try {
    // Fara media -> postare simpla pe /feed
    if (mediaUrls.length === 0) {
      const res = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, access_token: accessToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Eroare necunoscuta");
      return { success: true, externalPostId: data.id };
    }

    // Cu media -> /photos (prima imagine ca postare simpla; pt carousel/video e alt flow)
    const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: mediaUrls[0],
        caption: content,
        access_token: accessToken,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Eroare necunoscuta");
    return { success: true, externalPostId: data.post_id || data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Eroare necunoscuta" };
  }
}

export async function publishToInstagram(params: {
  igUserId: string;
  accessToken: string;
  content: string;
  mediaUrls: string[];
}): Promise<PublishResult> {
  const { igUserId, accessToken, content, mediaUrls } = params;

  if (mediaUrls.length === 0) {
    return { success: false, error: "Instagram necesita cel putin o imagine sau un video" };
  }

  try {
    // Pas 1: creeaza media container
    const containerRes = await fetch(`${GRAPH_BASE}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: mediaUrls[0],
        caption: content,
        access_token: accessToken,
      }),
    });
    const containerData = await containerRes.json();
    if (!containerRes.ok) {
      throw new Error(containerData.error?.message || "Eroare la crearea containerului");
    }

    // Pas 2: publica containerul
    const publishRes = await fetch(`${GRAPH_BASE}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: accessToken,
      }),
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      throw new Error(publishData.error?.message || "Eroare la publicare");
    }

    return { success: true, externalPostId: publishData.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Eroare necunoscuta" };
  }
}

export async function getFacebookInsights(params: {
  postId: string;
  accessToken: string;
}) {
  const { postId, accessToken } = params;
  const metrics = "post_impressions,post_engaged_users,post_clicks";
  const res = await fetch(
    `${GRAPH_BASE}/${postId}/insights?metric=${metrics}&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error("Nu s-au putut prelua insights de Facebook");
  return res.json();
}

export async function getInstagramInsights(params: { mediaId: string; accessToken: string }) {
  const { mediaId, accessToken } = params;
  const metrics = "impressions,reach,likes,comments,saved,shares";
  const res = await fetch(
    `${GRAPH_BASE}/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error("Nu s-au putut prelua insights de Instagram");
  return res.json();
}
