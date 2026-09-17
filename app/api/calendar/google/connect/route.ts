import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getActiveWorkspace, getCurrentUser } from "@/lib/session";
import {
  getGoogleCalendarAuthUrl,
  GOOGLE_CALENDAR_STATE_COOKIE,
  isGoogleCalendarConfigured,
} from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const workspace = await getActiveWorkspace();
  if (!user || !workspace) return NextResponse.redirect(new URL("/login", req.url));

  if (!isGoogleCalendarConfigured()) {
    const target = new URL("/dashboard/calendar", req.url);
    target.searchParams.set(
      "googleError",
      "Google Calendar nu este configurat. Adaugă GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET și GOOGLE_CALENDAR_REDIRECT_URI."
    );
    return NextResponse.redirect(target);
  }

  const state = crypto.randomBytes(32).toString("hex");
  const response = NextResponse.redirect(getGoogleCalendarAuthUrl(state));
  const stateContext = Buffer.from(
    JSON.stringify({ state, userId: user.userId, workspaceId: workspace.id })
  ).toString("base64url");
  response.cookies.set(GOOGLE_CALENDAR_STATE_COOKIE, stateContext, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
