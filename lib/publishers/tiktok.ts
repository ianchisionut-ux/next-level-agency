import { createTikTokPullUrl } from "@/lib/tiktok-media-url";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

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
          disable_duet: creator.duet_disabled || !Boolean(settings.allowDuet),
          disable_comment: creator.comment_disabled || !Boolean(settings.allowComment),
          disable_stitch: creator.stitch_disabled || !Boolean(settings.allowStitch),
          brand_content_toggle: Boolean(settings.brandContentToggle),
          brand_organic_toggle: Boolean(settings.brandOrganicToggle),
          is_aigc: Boolean(settings.isAigc),
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: createTikTokPullUrl(videoUrl),
        },
      }),
    });

    const initData = await parseTikTokResponse(initRes);
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
