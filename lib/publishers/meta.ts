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

export interface DemographicBreakdown {
  dimension: "age" | "gender" | "country" | "city";
  label: string;
  percentage: number;
}

/**
 * Demografia audienței pentru un cont Instagram Business, via metrica
 * follower_demographics (Meta Graph API). Necesita minim ~100 urmaritori,
 * altfel Meta nu returneaza date (limitare de confidentialitate impusa de ei,
 * nu de noi) - functia intoarce un array gol in acest caz, nu o eroare.
 * Docs: https://developers.facebook.com/docs/instagram-api/guides/insights
 */
export async function getInstagramAudienceDemographics(params: {
  igUserId: string;
  accessToken: string;
}): Promise<DemographicBreakdown[]> {
  const { igUserId, accessToken } = params;

  const res = await fetch(
    `${GRAPH_BASE}/${igUserId}/insights` +
      `?metric=follower_demographics` +
      `&period=lifetime` +
      `&metric_type=total_value` +
      `&breakdown=age,city,country,gender` +
      `&access_token=${accessToken}`
  );

  if (!res.ok) {
    // Cel mai frecvent motiv: cont sub pragul minim de urmăritori pentru
    // date demografice, sau permisiune lipsă - nu tratăm ca eroare fatală.
    return [];
  }

  const data = await res.json();
  const results: DemographicBreakdown[] = [];

  for (const metric of data.data ?? []) {
    for (const totalValue of metric.total_value?.breakdowns ?? []) {
      const dimensionKeys: string[] = totalValue.dimension_keys ?? [];
      const dimension = dimensionKeys[0] as DemographicBreakdown["dimension"] | undefined;
      if (!dimension) continue;

      const results_raw = totalValue.results ?? [];
      const total = results_raw.reduce((sum: number, r: any) => sum + (r.value ?? 0), 0);
      if (total === 0) continue;

      for (const r of results_raw) {
        const label = Array.isArray(r.dimension_values) ? r.dimension_values[0] : String(r.dimension_values);
        results.push({
          dimension: dimension === "age" ? "age" : dimension === "gender" ? "gender" : dimension === "country" ? "country" : "city",
          label,
          percentage: Math.round((r.value / total) * 1000) / 10,
        });
      }
    }
  }

  return results;
}
