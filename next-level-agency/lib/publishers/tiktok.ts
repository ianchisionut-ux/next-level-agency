/**
 * Publisher pentru TikTok, via Content Posting API.
 * Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
 *
 * IMPORTANT: contul de developer incepe in modul "sandbox" - postarile
 * merg doar catre conturi de test pana TikTok aproba trecerea la productie.
 */

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
}

export async function publishToTikTok(params: {
  accessToken: string;
  videoUrl: string;
  caption: string;
}): Promise<PublishResult> {
  const { accessToken, videoUrl, caption } = params;

  try {
    // Pas 1: init upload (PULL_FROM_URL - TikTok descarca el videoul de la URL-ul dat)
    const initRes = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: videoUrl,
        },
      }),
    });

    const initData = await initRes.json();
    if (!initRes.ok || initData.error?.code !== "ok") {
      throw new Error(initData.error?.message || "Eroare la initializarea upload-ului");
    }

    return { success: true, externalPostId: initData.data?.publish_id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Eroare necunoscuta" };
  }
}

export async function getTikTokPublishStatus(params: {
  accessToken: string;
  publishId: string;
}) {
  const { accessToken, publishId } = params;
  const res = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publish_id: publishId }),
  });
  if (!res.ok) throw new Error("Nu s-a putut prelua statusul postarii TikTok");
  return res.json();
}
