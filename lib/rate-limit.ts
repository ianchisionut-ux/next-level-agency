/**
 * Rate limiter simplu, in-memory, per IP + endpoint.
 *
 * LIMITARE IMPORTANTA: functiile serverless Vercel nu impart memorie intre
 * instante, deci in productie cu trafic mare acest limiter e "best effort"
 * (fiecare instanta isi tine propriul contor). Pentru garantii stricte la
 * scara mare, inlocuieste cu Upstash Redis (@upstash/ratelimit) - e un
 * schimb de 10 minute, pastreaza aceeasi interfata `checkRateLimit`.
 *
 * Suficient insa ca sa opreasca bot-urile simple de brute-force pe login
 * si spam pe signup/forgot-password.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// curata periodic bucket-urile expirate ca sa nu creasca memoria la nesfarsit
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export function checkRateLimit(params: {
  key: string; // de obicei `${ip}:${endpoint}`
  limit: number;
  windowMs: number;
}): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const existing = buckets.get(params.key);

  if (!existing || existing.resetAt < now) {
    buckets.set(params.key, { count: 1, resetAt: now + params.windowMs });
    return { allowed: true, remaining: params.limit - 1 };
  }

  if (existing.count >= params.limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count++;
  return { allowed: true, remaining: params.limit - existing.count };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
