import { NextRequest, NextResponse } from "next/server";
import { getMetaAuthUrl } from "@/lib/oauth/meta";
import { getActiveWorkspace } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const workspace = await getActiveWorkspace();
    if (!workspace) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET || !process.env.META_REDIRECT_URI) {
      const redirectBase = new URL("/dashboard/accounts", req.url);
      redirectBase.searchParams.set(
        "error",
        "Meta (Facebook/Instagram) nu este configurat încă. Lipsesc variabilele de mediu META_APP_ID / META_APP_SECRET / META_REDIRECT_URI."
      );
      return NextResponse.redirect(redirectBase);
    }

    // state codifica workspaceId, ca sa stim la callback pentru cine conectam contul
    const state = Buffer.from(JSON.stringify({ workspaceId: workspace.id })).toString("base64url");

    return NextResponse.redirect(getMetaAuthUrl(state));
  } catch (err) {
    const redirectBase = new URL("/dashboard/accounts", req.url);
    redirectBase.searchParams.set("error", err instanceof Error ? err.message : "Eroare la conectare");
    return NextResponse.redirect(redirectBase);
  }
}
