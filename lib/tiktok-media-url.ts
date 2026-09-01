import { createHmac, timingSafeEqual } from "crypto";

function signatureFor(source: string) {
  return createHmac("sha256", process.env.AUTH_SECRET!).update(source).digest("hex");
}

export function createTikTokPullUrl(source: string) {
  const url = new URL("https://www.nextlevel-agency.ro/api/media/tiktok-pull");
  url.searchParams.set("source", source);
  url.searchParams.set("signature", signatureFor(source));
  return url.toString();
}

export function verifyTikTokPullUrl(source: string, signature: string) {
  const expected = Buffer.from(signatureFor(source));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
