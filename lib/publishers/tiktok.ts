const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";
const MAX_SERVER_UPLOAD_BYTES = 128 * 1024 * 1024;

export interface TikTokCreatorInfo {
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec?: number;
}

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
}

async function parseTikTokResponse(res: Response) {
  const data = await res.json();
  if (!res.ok || data.error?.code !== "ok") {
    throw new Error(data.error?.message || data.error?.code || "TikTok API a returnat o eroare");
  }
  return data;
}

export async function getTikTokCreatorInfo(accessToken: string): Promise<TikTokCreatorInfo> {
  const res = await fetch(`${TIKTOK_API_BASE}/post/publish/creator_info/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });
  const data = await parseTikTokResponse(res);
  return data.data as TikTokCreatorInfo;
}

export async function publishToTikTok(params: {
  accessToken: string;
  videoUrl: string;
  caption: string;
  settings?: Record<string, unknown>;
}): Promise<PublishResult> {
  const { accessToken, videoUrl, caption } = params;
  const settings = params.settings ?? {};

  try {
    const creator = await getTikTokCreatorInfo(accessToken);
    const privacyLevel = typeof settings.privacyLevel === "string" ? settings.privacyLevel : undefined;
    if (!privacyLevel || !creator.privacy_level_options?.includes(privacyLevel)) {
      throw new Error("Nivelul de vizibilitate TikTok nu mai este disponibil. Reîncarcă editorul.");
    }

    const mediaRes = await fetch(videoUrl);
    if (!mediaRes.ok) throw new Error("Videoclipul nu a putut fi descărcat pentru TikTok");
    const video = await mediaRes.arrayBuffer();
    const videoSize = video.byteLength;
    if (!videoSize) throw new Error("Videoclipul este gol");
    if (videoSize > MAX_SERVER_UPLOAD_BYTES) {
      throw new Error("Videoclipul depășește limita de 128 MB pentru publicarea TikTok din Signal");
    }

    const initRes = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: privacyLevel,
          disable_duet: creator.duet_disabled || Boolean(settings.disableDuet),
          disable_comment: creator.comment_disabled || Boolean(settings.disableComment),
          disable_stitch: creator.stitch_disabled || Boolean(settings.disableStitch),
          brand_content_toggle: Boolean(settings.brandContentToggle),
          brand_organic_toggle: Boolean(settings.brandOrganicToggle),
          is_aigc: Boolean(settings.isAigc),
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoSize,
          chunk_size: videoSize,
          total_chunk_count: 1,
        },
      }),
    });

    const initData = await parseTikTokResponse(initRes);
    const uploadUrl = initData.data?.upload_url;
    if (!uploadUrl) throw new Error("TikTok nu a returnat URL-ul de upload");

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mediaRes.headers.get("content-type")?.split(";")[0] || "video/mp4",
        "Content-Length": String(videoSize),
        "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
      },
      body: video,
    });
    if (!uploadRes.ok) throw new Error(`TikTok a refuzat transferul videoclipului (${uploadRes.status})`);

    // TikTok procesează asincron; verificăm statusul real înainte să marcăm
    // varianta drept publicată și propagăm eventualul motiv de eșec.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusData = await getTikTokPublishStatus({ accessToken, publishId: initData.data.publish_id });
      const status = statusData.data?.status;
      if (status === "FAILED") {
        throw new Error(statusData.data?.fail_reason || "TikTok nu a putut procesa videoclipul");
      }
      if (status === "PUBLISH_COMPLETE") break;
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
  return parseTikTokResponse(res);
}
