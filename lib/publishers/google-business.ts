/**
 * Publisher pentru Google Business Profile (postari tip "Update"/"Offer"/"Event").
 * Docs: https://developers.google.com/my-business/content/posts-data
 *
 * externalId = numele complet al locatiei, format:
 *   accounts/{accountId}/locations/{locationId}
 */

const GBP_API_BASE = "https://mybusiness.googleapis.com/v4";

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
}

export async function publishToGoogleBusiness(params: {
  locationName: string; // accounts/{accountId}/locations/{locationId}
  accessToken: string;
  content: string;
  mediaUrls: string[];
}): Promise<PublishResult> {
  const { locationName, accessToken, content, mediaUrls } = params;

  try {
    const body: Record<string, unknown> = {
      languageCode: "ro",
      summary: content,
      topicType: "STANDARD",
    };

    if (mediaUrls.length > 0) {
      body.media = mediaUrls.map((url) => ({
        mediaFormat: "PHOTO",
        sourceUrl: url,
      }));
    }

    const res = await fetch(`${GBP_API_BASE}/${locationName}/localPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Eroare necunoscuta");

    return { success: true, externalPostId: data.name };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Eroare necunoscuta" };
  }
}

/**
 * Search Console - pentru keyword tracking (impressions, clicks, position)
 * Docs: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
 */
export async function fetchSearchConsoleKeywords(params: {
  siteUrl: string;
  accessToken: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
}) {
  const { siteUrl, accessToken, startDate, endDate } = params;

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      siteUrl
    )}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 100,
      }),
    }
  );

  if (!res.ok) throw new Error("Nu s-au putut prelua datele din Search Console");
  return res.json();
}
