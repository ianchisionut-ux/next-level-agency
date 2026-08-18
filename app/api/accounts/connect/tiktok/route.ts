import { NextRequest, NextResponse } from "next/server";
import { getTikTokAuthUrl } from "@/lib/oauth/tiktok";
import { getActiveWorkspace } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const workspace = await getActiveWorkspace();
    if (!workspace) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET || !process.env.TIKTOK_REDIRECT_URI) {
      const redirectBase = new URL("/dashboard/accounts", req.url);
      redirectBase.searchParams.set(
        "error",
        "TikTok nu este configurat încă. Lipsesc variabilele de mediu TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_REDIRECT_URI."
      );
      return NextResponse.redirect(redirectBase);
    }

    const state = Buffer.from(JSON.stringify({ workspaceId: workspace.id })).toString("base64url");
    return NextResponse.redirect(getTikTokAuthUrl(state));
  } catch (err) {
    const redirectBase = new URL("/dashboard/accounts", req.url);
    redirectBase.searchParams.set("error", err instanceof Error ? err.message : "Eroare la conectare");
    return NextResponse.redirect(redirectBase);
  }
}
