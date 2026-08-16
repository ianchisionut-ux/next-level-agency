import { NextRequest, NextResponse } from "next/server";
import { getMetaAuthUrl } from "@/lib/oauth/meta";
import { getActiveWorkspace } from "@/lib/session";

export async function GET(req: NextRequest) {
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // state codifica workspaceId, ca sa stim la callback pentru cine conectam contul
  const state = Buffer.from(JSON.stringify({ workspaceId: workspace.id })).toString("base64url");

  return NextResponse.redirect(getMetaAuthUrl(state));
}
