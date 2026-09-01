import { NextRequest, NextResponse } from "next/server";
import { verifyTikTokPullUrl } from "@/lib/tiktok-media-url";

export const runtime = "nodejs";
export const maxDuration = 60;

async function proxyMedia(req: NextRequest, headOnly = false) {
  const source = req.nextUrl.searchParams.get("source");
  const signature = req.nextUrl.searchParams.get("signature");
  if (!source || !signature || !verifyTikTokPullUrl(source, signature)) {
    return NextResponse.json({ error: "Link media invalid" }, { status: 403 });
  }

  const sourceUrl = new URL(source);
  if (sourceUrl.protocol !== "https:" || !sourceUrl.hostname.endsWith(".public.blob.vercel-storage.com")) {
    return NextResponse.json({ error: "Sursă media nepermisă" }, { status: 400 });
  }

  const upstream = await fetch(sourceUrl, { method: headOnly ? "HEAD" : "GET", cache: "no-store" });
  if (!upstream.ok) return NextResponse.json({ error: "Media indisponibilă" }, { status: 502 });
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") || "video/mp4",
    "Cache-Control": "public, max-age=3600",
    "Accept-Ranges": "bytes",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new NextResponse(headOnly ? null : upstream.body, { status: 200, headers });
}

export async function GET(req: NextRequest) {
  return proxyMedia(req);
}

export async function HEAD(req: NextRequest) {
  return proxyMedia(req, true);
}
