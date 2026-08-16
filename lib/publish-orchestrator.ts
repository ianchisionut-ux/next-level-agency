import { prisma } from "@/lib/prisma";
import { ensureFreshToken } from "@/lib/token-refresh";
import { publishToFacebook, publishToInstagram } from "@/lib/publishers/meta";
import { publishToTikTok } from "@/lib/publishers/tiktok";
import { publishToGoogleBusiness } from "@/lib/publishers/google-business";
import type { Platform } from "@prisma/client";

const MAX_RETRIES = 3;

/**
 * Preia toate variantele PENDING programate pana acum si incearca sa le publice.
 * Se apeleaza din cron (vezi app/api/cron/publish/route.ts).
 */
export async function processScheduledVariants() {
  const now = new Date();

  const duePosts = await prisma.post.findMany({
    where: {
      status: { in: ["SCHEDULED"] },
      scheduledAt: { lte: now },
    },
    include: {
      variants: { include: { account: true } },
    },
  });

  const results: Array<{ postId: string; variantId: string; success: boolean }> = [];

  for (const post of duePosts) {
    await prisma.post.update({ where: { id: post.id }, data: { status: "PUBLISHING" } });

    for (const variant of post.variants) {
      if (variant.status !== "PENDING") continue;

      const dueTime = variant.scheduledAt ?? post.scheduledAt;
      if (dueTime && dueTime > now) continue; // override per-platforma inca nu a ajuns

      const result = await publishVariant(variant.id);
      results.push({ postId: post.id, variantId: variant.id, success: result.success });
    }

    // Recalculeaza statusul global al Post-ului dupa ce toate variantele au fost incercate
    await recomputePostStatus(post.id);
  }

  return results;
}

async function publishVariant(variantId: string) {
  const variant = await prisma.postVariant.findUniqueOrThrow({
    where: { id: variantId },
    include: { account: true },
  });

  await prisma.postVariant.update({
    where: { id: variantId },
    data: { status: "PUBLISHING" },
  });

  const accessToken = await ensureFreshToken(variant.account);
  let result: { success: boolean; externalPostId?: string; error?: string };

  try {
    result = await dispatchToPlatform(variant.platform, {
      accessToken,
      externalId: variant.account.externalId,
      content: variant.content,
      mediaUrls: variant.mediaUrls,
    });
  } catch (err) {
    result = { success: false, error: err instanceof Error ? err.message : "Eroare necunoscuta" };
  }

  if (result.success) {
    await prisma.postVariant.update({
      where: { id: variantId },
      data: {
        status: "PUBLISHED",
        externalPostId: result.externalPostId,
        publishedAt: new Date(),
        errorLog: null,
      },
    });
  } else {
    const shouldRetry = variant.retryCount < MAX_RETRIES;
    await prisma.postVariant.update({
      where: { id: variantId },
      data: {
        status: shouldRetry ? "PENDING" : "FAILED",
        errorLog: result.error,
        retryCount: { increment: 1 },
      },
    });
  }

  return result;
}

async function dispatchToPlatform(
  platform: Platform,
  params: { accessToken: string; externalId: string; content: string; mediaUrls: string[] }
) {
  switch (platform) {
    case "FACEBOOK":
      return publishToFacebook({
        pageId: params.externalId,
        accessToken: params.accessToken,
        content: params.content,
        mediaUrls: params.mediaUrls,
      });

    case "INSTAGRAM":
      return publishToInstagram({
        igUserId: params.externalId,
        accessToken: params.accessToken,
        content: params.content,
        mediaUrls: params.mediaUrls,
      });

    case "TIKTOK":
      if (params.mediaUrls.length === 0) {
        return { success: false, error: "TikTok necesita un video" };
      }
      return publishToTikTok({
        accessToken: params.accessToken,
        videoUrl: params.mediaUrls[0],
        caption: params.content,
      });

    case "GOOGLE_BUSINESS":
      return publishToGoogleBusiness({
        locationName: params.externalId,
        accessToken: params.accessToken,
        content: params.content,
        mediaUrls: params.mediaUrls,
      });

    default:
      return { success: false, error: `Platforma necunoscuta: ${platform}` };
  }
}

async function recomputePostStatus(postId: string) {
  const variants = await prisma.postVariant.findMany({ where: { postId } });

  const allDone = variants.every((v) => v.status === "PUBLISHED" || v.status === "FAILED");
  if (!allDone) return; // mai sunt variante PENDING/PUBLISHING (retry in asteptare)

  const allPublished = variants.every((v) => v.status === "PUBLISHED");
  const allFailed = variants.every((v) => v.status === "FAILED");

  const status = allPublished ? "PUBLISHED" : allFailed ? "FAILED" : "PARTIALLY_PUBLISHED";
  await prisma.post.update({ where: { id: postId }, data: { status } });
}
