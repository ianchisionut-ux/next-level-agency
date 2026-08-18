import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/oauth/google";
import { getActiveWorkspace } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const workspace = await getActiveWorkspace();
    if (!workspace) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      const redirectBase = new URL("/dashboard/accounts", req.url);
      redirectBase.searchParams.set(
        "error",
        "Google Business nu este configurat încă. Lipsesc variabilele de mediu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI."
      );
      return NextResponse.redirect(redirectBase);
    }

    const state = Buffer.from(JSON.stringify({ workspaceId: workspace.id })).toString("base64url");
    return NextResponse.redirect(getGoogleAuthUrl(state));
  } catch (err) {
    const redirectBase = new URL("/dashboard/accounts", req.url);
    redirectBase.searchParams.set("error", err instanceof Error ? err.message : "Eroare la conectare");
    return NextResponse.redirect(redirectBase);
  }
}
