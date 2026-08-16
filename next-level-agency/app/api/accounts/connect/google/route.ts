import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/oauth/google";
import { getActiveWorkspace } from "@/lib/session";

export async function GET(req: NextRequest) {
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const state = Buffer.from(JSON.stringify({ workspaceId: workspace.id })).toString("base64url");
  return NextResponse.redirect(getGoogleAuthUrl(state));
}
