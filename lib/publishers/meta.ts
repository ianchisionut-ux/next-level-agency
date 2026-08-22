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

/**
 * Publica un video pe Facebook ca REEL, folosind API-ul dedicat Reels
 * (diferit de /videos obisnuit - acela posteaza pe Feed, nu apare in tab-ul
 * Reels). Flux in 3 pasi, documentat de Meta:
 *   1. upload_phase=start  -> returneaza video_id + upload_url
 *   2. upload catre upload_url, cu header file_url (Meta descarca singur
 *      de la Vercel Blob, nu trecem binarul prin serverul nostru)
 *   3. upload_phase=finish -> ataseaza descrierea si publica (sau programeaza)
 * Docs: https://developers.facebook.com/docs/video-api/guides/reels-publishing
 */
async function publishFacebookReel(params: {
  pageId: string;
  accessToken: string;
  content: string;
  videoUrl: string;
  scheduledPublishTime?: number;
}): Promise<PublishResult> {
  const { pageId, accessToken, content, videoUrl, scheduledPublishTime } = params;

  try {
    // Pas 1: initializeaza sesiunea de upload
    const startRes = await fetch(
      `${GRAPH_BASE}/${pageId}/video_reels?upload_phase=start&access_token=${accessToken}`,
      { method: "POST" }
    );
    const startData = await startRes.json();
    if (!startRes.ok) {
      throw new Error(startData.error?.message || "Eroare la inițializarea Reels-ului");
    }
    const { video_id: videoId, upload_url: uploadUrl } = startData;

    // Pas 2: Meta prelucreaza video-ul direct de la URL-ul public (Vercel Blob)
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${accessToken}`,
        file_url: videoUrl,
      },
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || uploadData.success === false) {
      throw new Error("Eroare la încărcarea video-ului pentru Reels");
    }

    // Pas 3: finalizeaza - publica imediat sau programeaza
    const finishParams = new URLSearchParams({
      upload_phase: "finish",
      video_id: videoId,
      description: content,
      access_token: accessToken,
    });
    if (scheduledPublishTime) {
      finishParams.set("video_state", "SCHEDULED");
      finishParams.set("scheduled_publish_time", String(scheduledPublishTime));
    } else {
      finishParams.set("video_state", "PUBLISHED");
    }

    const finishRes = await fetch(`${GRAPH_BASE}/${pageId}/video_reels?${finishParams.toString()}`, {
      method: "POST",
    });
    const finishData = await finishRes.json();
    if (!finishRes.ok || finishData.success === false) {
      throw new Error(finishData.error?.message || "Eroare la finalizarea Reels-ului");
    }

    return { success: true, externalPostId: videoId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Eroare necunoscuta" };
  }
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
  /** Buton explicit din Composer: daca e video si postAsReel=true (implicit),
   * publicam prin API-ul de Reels. Daca e false, publicam ca video normal
   * pe Feed (/videos), la fel ca o poza - nu apare in tab-ul Reels. */
  postAsReel?: boolean;
}): Promise<PublishResult> {
  const { pageId, accessToken, content, mediaUrls, scheduledPublishTime, postAsReel = true } = params;

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

    if (isVideoUrl(firstUrl)) {
      // Buton "Postează ca Reel" bifat (implicit) -> API dedicat Reels, apare
      // in tab-ul Reels de pe pagina.
      if (postAsReel) {
        return await publishFacebookReel({ pageId, accessToken, content, videoUrl: firstUrl, scheduledPublishTime });
      }

      // Debifat -> video normal pe Feed, ca inainte de introducerea Reels.
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
  /** Buton explicit din Composer: daca e video si postAsReel=true (implicit),
   * media_type=REELS. Daca e false, media_type=VIDEO (postare video normala
   * pe grid/feed, nu in tab-ul Reels). */
  postAsReel?: boolean;
}): Promise<PublishResult> {
  const { igUserId, accessToken, content, mediaUrls, postAsReel = true } = params;

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
      containerBody.media_type = postAsReel ? "REELS" : "VIDEO";
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

/**
 * Cere o singura metrica de insights pentru o postare/media, izolat. Meta
 * respinge intreg request-ul daca oricare metrica dintr-o lista batch e
 * invalida (eroare #100) - iar metricile astea se schimba des. Returneaza
 * null pe orice eroare (metrica invalida, postare stearsa, permisiune
 * lipsa) - apelantul decide ce face cu lipsa valorii.
 */
async function fetchSinglePostMetric(
  objectId: string,
  metric: string,
  accessToken: string
): Promise<{ value: number; metric: string } | null> {
  try {
    const res = await fetch(`${GRAPH_BASE}/${objectId}/insights?metric=${metric}&access_token=${accessToken}`);
    if (!res.ok) return null;
    const data = await res.json();
    const value = data.data?.[0]?.values?.[0]?.value;
    return typeof value === "number" ? { value, metric } : null;
  } catch {
    return null;
  }
}

export interface PostInsightsResult {
  data: { name: string; values: { value: number }[] }[];
  failedMetrics: string[];
}

export async function getFacebookInsights(params: {
  postId: string;
  accessToken: string;
}): Promise<PostInsightsResult> {
  const { postId, accessToken } = params;
  // post_impressions a fost dezactivat de Meta (15 noiembrie 2025) - inlocuit
  // cu post_media_view. Fiecare metrica se cere separat (nu grupat), ca o
  // eventuala metrica invalida/schimbata de Meta sa nu strice tot raspunsul -
  // doar acea valoare lipseste.
  const metricNames = ["post_media_view", "post_engaged_users", "post_clicks"];
  const results = await Promise.all(metricNames.map((m) => fetchSinglePostMetric(postId, m, accessToken)));

  const data: PostInsightsResult["data"] = [];
  const failedMetrics: string[] = [];
  results.forEach((r, i) => {
    if (r) data.push({ name: r.metric, values: [{ value: r.value }] });
    else failedMetrics.push(metricNames[i]);
  });

  if (data.length === 0) {
    throw new Error(
      failedMetrics.length === metricNames.length
        ? "Nicio metrică nu a putut fi preluată (postare ștearsă, permisiune lipsă, sau token expirat)"
        : "Nu s-au putut prelua insights de Facebook"
    );
  }

  return { data, failedMetrics };
}

export async function getInstagramInsights(params: {
  mediaId: string;
  accessToken: string;
}): Promise<PostInsightsResult> {
  const { mediaId, accessToken } = params;
  // "impressions" a fost dezactivata de Meta (21 aprilie 2025) - inlocuita cu
  // "views". Fiecare metrica separat, din acelasi motiv ca la Facebook.
  const metricNames = ["views", "reach", "likes", "comments", "saved", "shares"];
  const results = await Promise.all(metricNames.map((m) => fetchSinglePostMetric(mediaId, m, accessToken)));

  const data: PostInsightsResult["data"] = [];
  const failedMetrics: string[] = [];
  results.forEach((r, i) => {
    if (r) data.push({ name: r.metric, values: [{ value: r.value }] });
    else failedMetrics.push(metricNames[i]);
  });

  if (data.length === 0) {
    throw new Error(
      failedMetrics.length === metricNames.length
        ? "Nicio metrică nu a putut fi preluată (media ștearsă, permisiune lipsă, sau token expirat)"
        : "Nu s-au putut prelua insights de Instagram"
    );
  }

  return { data, failedMetrics };
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

export interface FacebookPageOverview {
  followersCount: number | null;
  fanCount: number | null;
  pictureUrl: string | null;
}

/**
 * Statistici generale (nume, poza, urmaritori) pentru o Pagina de Facebook,
 * cerute live din Graph API de fiecare data cand se afiseaza "Conturi conectate"
 * - nu se stocheaza in baza de date, deci sunt intotdeauna la zi.
 */
export async function getFacebookPageOverview(
  pageId: string,
  accessToken: string
): Promise<FacebookPageOverview | null> {
  const res = await fetch(
    `${GRAPH_BASE}/${pageId}?fields=followers_count,fan_count,picture{url}&access_token=${accessToken}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return {
    followersCount: data.followers_count ?? null,
    fanCount: data.fan_count ?? null,
    pictureUrl: data.picture?.data?.url ?? null,
  };
}

export interface InstagramAccountOverview {
  followersCount: number | null;
  mediaCount: number | null;
  pictureUrl: string | null;
}

/**
 * Statistici generale pentru un cont Instagram Business, la fel ca la
 * Facebook - live din Graph API, fara stocare locala.
 */
export async function getInstagramAccountOverview(
  igUserId: string,
  accessToken: string
): Promise<InstagramAccountOverview | null> {
  const res = await fetch(
    `${GRAPH_BASE}/${igUserId}?fields=followers_count,media_count,profile_picture_url&access_token=${accessToken}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return {
    followersCount: data.followers_count ?? null,
    mediaCount: data.media_count ?? null,
    pictureUrl: data.profile_picture_url ?? null,
  };
}

export interface PageStatsSnapshot {
  views: number | null;
  follows: number | null;
  visits: number | null;
  interactions: number | null;
  videoViews: number | null;
  unfollows: number | null;
  failedMetrics: string[];
}

/**
 * Cere o singura metrica Graph API, izolat. Meta respinge intreg request-ul
 * daca oricare metrica dintr-o lista batch e invalida (eroare #100) - iar
 * metricile de Page/Account Insights au fost schimbate de Meta de 3 ori in
 * ultimii 2 ani (nov 2023, apr 2025, nov 2025, iun 2026). Cerand fiecare
 * metrica separat, o eventuala metrica noua dezactivata NU mai strica
 * restul - doar acea valoare lipseste, restul tot se salveaza.
 */
async function fetchSingleMetric(
  objectId: string,
  metric: string,
  accessToken: string,
  period: "day" | "days_28" = "days_28"
): Promise<number | null> {
  try {
    const res = await fetch(
      `${GRAPH_BASE}/${objectId}/insights?metric=${metric}&period=${period}&access_token=${accessToken}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const values = data.data?.[0]?.values;
    if (!values || values.length === 0) return null;
    // Luam ultima valoare (cea mai recenta zi/perioada din raspuns)
    const last = values[values.length - 1]?.value;
    return typeof last === "number" ? last : null;
  } catch {
    return null;
  }
}

/**
 * Statisticile de tip "Prezentare generala" din Meta Business Suite -
 * Vizualizari / Urmariri / Vizite / Interactiuni - pentru o Pagina de
 * Facebook, pe ultimele 28 de zile. Candidatii de metrici de mai jos sunt
 * cei mai probabil valizi la data scrierii codului (august 2026); daca Meta
 * mai schimba ceva, doar campul respectiv devine null, restul tot merge -
 * verifica failedMetrics ca sa vezi exact ce anume a picat.
 */
export async function getFacebookPageOverviewStats(
  pageId: string,
  accessToken: string
): Promise<PageStatsSnapshot> {
  const candidates: Record<keyof Omit<PageStatsSnapshot, "failedMetrics">, string> = {
    views: "page_views_total",
    follows: "page_follows",
    visits: "page_views_total",
    interactions: "page_post_engagements",
    videoViews: "page_video_views",
    unfollows: "page_fan_removes",
  };

  const entries = Object.entries(candidates) as [keyof Omit<PageStatsSnapshot, "failedMetrics">, string][];
  const results = await Promise.all(
    entries.map(async ([key, metric]) => [key, metric, await fetchSingleMetric(pageId, metric, accessToken)] as const)
  );

  const snapshot: PageStatsSnapshot = {
    views: null,
    follows: null,
    visits: null,
    interactions: null,
    videoViews: null,
    unfollows: null,
    failedMetrics: [],
  };
  for (const [key, metric, value] of results) {
    snapshot[key] = value;
    if (value === null) snapshot.failedMetrics.push(metric);
  }
  return snapshot;
}

/**
 * Echivalentul pentru Instagram Business - Views/Reach/Vizite profil/Conturi
 * atinse, pe ultimele 28 de zile.
 */
export async function getInstagramAccountOverviewStats(
  igUserId: string,
  accessToken: string
): Promise<PageStatsSnapshot> {
  const candidates: Record<keyof Omit<PageStatsSnapshot, "failedMetrics">, string> = {
    views: "views",
    follows: "follower_count",
    visits: "profile_views",
    interactions: "accounts_engaged",
    videoViews: "video_views",
    unfollows: "unfollows",
  };

  const entries = Object.entries(candidates) as [keyof Omit<PageStatsSnapshot, "failedMetrics">, string][];
  const results = await Promise.all(
    entries.map(async ([key, metric]) => [key, metric, await fetchSingleMetric(igUserId, metric, accessToken)] as const)
  );

  const snapshot: PageStatsSnapshot = {
    views: null,
    follows: null,
    visits: null,
    interactions: null,
    videoViews: null,
    unfollows: null,
    failedMetrics: [],
  };
  for (const [key, metric, value] of results) {
    snapshot[key] = value;
    if (value === null) snapshot.failedMetrics.push(metric);
  }
  return snapshot;
}
