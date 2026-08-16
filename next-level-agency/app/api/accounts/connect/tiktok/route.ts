import { NextRequest, NextResponse } from "next/server";
import { getTikTokAuthUrl } from "@/lib/oauth/tiktok";
import { getActiveWorkspace } from "@/lib/session";

export async function GET(req: NextRequest) {
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const state = Buffer.from(JSON.stringify({ workspaceId: workspace.id })).toString("base64url");
  return NextResponse.redirect(getTikTokAuthUrl(state));
}
