import type { ConnectedAccount } from "@prisma/client";
import { ensureFreshToken } from "@/lib/token-refresh";

const METRICS = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "BUSINESS_DIRECTION_REQUESTS",
  "CALL_CLICKS",
  "WEBSITE_CLICKS",
] as const;

type Metric = (typeof METRICS)[number];
type GooglePerformanceResponse = {
  multiDailyMetricTimeSeries?: {
    dailyMetricTimeSeries?: {
      dailyMetric?: Metric;
      timeSeries?: { datedValues?: { value?: string }[] };
    }[];
  }[];
};

export async function getBusinessPerformance(account: ConnectedAccount) {
  const locationId = account.externalId.match(/(?:^|\/)locations\/([^/]+)$/)?.[1];
  if (!locationId) throw new Error("Identificatorul locației Google Business este invalid.");

  const token = await ensureFreshToken(account);
  // Google reports completed days; today may be partial or unavailable.
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  const query = new URLSearchParams();
  for (const metric of METRICS) query.append("dailyMetrics", metric);
  for (const [prefix, date] of [["start_date", start], ["end_date", end]] as const) {
    query.set(`dailyRange.${prefix}.year`, String(date.getUTCFullYear()));
    query.set(`dailyRange.${prefix}.month`, String(date.getUTCMonth() + 1));
    query.set(`dailyRange.${prefix}.day`, String(date.getUTCDate()));
  }
  const response = await fetch(
    `https://businessprofileperformance.googleapis.com/v1/locations/${encodeURIComponent(locationId)}:fetchMultiDailyMetricsTimeSeries?${query}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  const data = (await response.json()) as GooglePerformanceResponse & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || `Google Business a răspuns cu ${response.status}.`);

  const totals = Object.fromEntries(METRICS.map((metric) => [metric, 0])) as Record<Metric, number>;
  for (const group of data.multiDailyMetricTimeSeries || []) {
    for (const series of group.dailyMetricTimeSeries || []) {
      if (!series.dailyMetric || !METRICS.includes(series.dailyMetric)) continue;
      totals[series.dailyMetric] += (series.timeSeries?.datedValues || []).reduce(
        (sum, point) => sum + (Number(point.value) || 0), 0
      );
    }
  }
  return {
    accountId: account.id,
    name: account.accountName,
    impressions: totals.BUSINESS_IMPRESSIONS_DESKTOP_MAPS + totals.BUSINESS_IMPRESSIONS_MOBILE_MAPS +
      totals.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH + totals.BUSINESS_IMPRESSIONS_MOBILE_SEARCH,
    directions: totals.BUSINESS_DIRECTION_REQUESTS,
    calls: totals.CALL_CLICKS,
    websiteClicks: totals.WEBSITE_CLICKS,
  };
}
