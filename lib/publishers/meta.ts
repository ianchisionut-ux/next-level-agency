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

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v)(\?|$)/i.test(url);
}

export async function publishToFacebook(params: {
  pageId: string;
  accessToken: string;
  content: string;
  mediaUrls: string[];
  /** Unix timestamp (secunde) - daca e furnizat, folosim programarea NATIVA
   * Meta (published: false + scheduled_publish_time), in loc sa publicam
   * imediat. Util mai ales pentru video, caruia Meta ii ia timp sa il
   * proceseze - il urcam din timp, iar Meta il publica exact la ora fixata. */
  scheduledPublishTime?: number;
}): Promise<PublishResult> {
  const { pageId, accessToken, content, mediaUrls, scheduledPublishTime } = params;

  try {
    // Fara media -> postare simpla pe /feed
    if (mediaUrls.length === 0) {
      const body: Record<string, unknown> = { message: content, access_token: accessToken };
      if (scheduledPublishTime) {
        body.published = false;
        body.scheduled_publish_time = scheduledPublishTime;
      }
      const res = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Eroare necunoscuta");
      return { success: true, externalPostId: data.id };
    }

    const firstUrl = mediaUrls[0];

    // Video -> endpoint dedicat /videos, cu file_url (Meta descarca singur
    // de la URL-ul public din Vercel Blob - nu trecem binarul prin server).
    if (isVideoUrl(firstUrl)) {
      const body: Record<string, unknown> = {
        file_url: firstUrl,
        description: content,
        access_token: accessToken,
      };
      if (scheduledPublishTime) {
        body.published = false;
        body.scheduled_publish_time = scheduledPublishTime;
      }
      const res = await fetch(`${GRAPH_BASE}/${pageId}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Eroare la publicarea video");
      return { success: true, externalPostId: data.id };
    }

    // Poza -> /photos (prima imagine ca postare simpla)
    const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: firstUrl,
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

  const firstUrl = mediaUrls[0];
  const isVideo = isVideoUrl(firstUrl);

  try {
    // Pas 1: creeaza media container. Pentru video (Reels), Instagram
    // proceseaza asincron - containerul nu e gata instant ca la poze.
    const containerBody: Record<string, unknown> = {
      caption: content,
      access_token: accessToken,
    };
    if (isVideo) {
      containerBody.media_type = "REELS";
      containerBody.video_url = firstUrl;
    } else {
      containerBody.image_url = firstUrl;
    }

    const containerRes = await fetch(`${GRAPH_BASE}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    });
    const containerData = await containerRes.json();
    if (!containerRes.ok) {
      throw new Error(containerData.error?.message || "Eroare la crearea containerului");
    }

    // Pentru video, asteptam ca Instagram sa termine procesarea (status_code
    // FINISHED) inainte sa publicam - de obicei dureaza intre 10-60s.
    if (isVideo) {
      const ready = await waitForContainerReady(containerData.id, accessToken);
      if (!ready) {
        return {
          success: false,
          error: "Instagram nu a terminat procesarea video-ului la timp. Va fi reîncercat automat.",
        };
      }
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

/** Interogheaza periodic statusul containerului de media Instagram, pana
 * cand Meta termina procesarea video-ului (sau pana la limita de asteptare). */
async function waitForContainerReady(
  containerId: string,
  accessToken: string,
  maxWaitMs = 45_000,
  intervalMs = 3_000
): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await fetch(
      `${GRAPH_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const data = await res.json();
    if (data.status_code === "FINISHED") return true;
    if (data.status_code === "ERROR") return false;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
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

/**
 * Preia textul comentariilor de la o postare de Facebook sau media de
 * Instagram (max 100 cele mai recente), folosite ulterior pentru clasificarea
 * de sentiment. Returneaza doar array de string-uri (textul), fara alte
 * date personale ale comentatorilor (nume, poza etc.) - pastram doar minimul
 * necesar pentru scorul agregat.
 */
export async function getPostComments(params: {
  postId: string;
  accessToken: string;
}): Promise<string[]> {
  const { postId, accessToken } = params;
  const res = await fetch(
    `${GRAPH_BASE}/${postId}/comments?fields=message&limit=100&access_token=${accessToken}`
  );
  if (!res.ok) return []; // permisiune lipsa sau postare fara comentarii - nu blocam colectarea
  const data = await res.json();
  return (data.data ?? [])
    .map((c: { message?: string }) => c.message)
    .filter((m: string | undefined): m is string => Boolean(m && m.trim()));
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
