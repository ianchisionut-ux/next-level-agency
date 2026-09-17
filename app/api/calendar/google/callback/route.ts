import { NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import {
  exchangeGoogleCalendarCode,
  getGoogleAccountEmail,
  GOOGLE_CALENDAR_STATE_COOKIE,
  syncGoogleCalendarForUser,
} from "@/lib/google-calendar";
import { ensureInternalCalendarSchema } from "@/lib/internal-calendar-schema";
import { prisma } from "@/lib/prisma";
import { getActiveWorkspace, getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const target = new URL("/dashboard/calendar", req.url);
  const user = await getCurrentUser();
  const workspace = await getActiveWorkspace();
  if (!user || !workspace) return NextResponse.redirect(new URL("/login", req.url));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateContextRaw = req.cookies.get(GOOGLE_CALENDAR_STATE_COOKIE)?.value;
  const oauthError = req.nextUrl.searchParams.get("error");
  let stateContext: { state?: string; userId?: string; workspaceId?: string } = {};
  try {
    stateContext = stateContextRaw
      ? JSON.parse(Buffer.from(stateContextRaw, "base64url").toString())
      : {};
  } catch {
    stateContext = {};
  }

  if (oauthError) {
    target.searchParams.set("googleError", oauthError);
  } else if (
    !code ||
    !state ||
    state !== stateContext.state ||
    user.userId !== stateContext.userId ||
    workspace.id !== stateContext.workspaceId
  ) {
    target.searchParams.set("googleError", "Răspunsul OAuth Google este invalid sau a expirat.");
  } else {
    try {
      await ensureInternalCalendarSchema();
      const tokens = await exchangeGoogleCalendarCode(code);
      const existing = await prisma.googleCalendarConnection.findUnique({ where: { userId: user.userId } });
      if (!tokens.refresh_token && !existing?.refreshToken) {
        throw new Error("Google nu a returnat un refresh token. Elimină accesul aplicației din contul Google și reconectează-l.");
      }
      const email = await getGoogleAccountEmail(tokens.access_token);
      await prisma.googleCalendarConnection.upsert({
        where: { userId: user.userId },
        update: {
          accountEmail: email,
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : existing?.refreshToken,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          syncToken: null,
        },
        create: {
          userId: user.userId,
          accountEmail: email,
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
      const result = await syncGoogleCalendarForUser(user.userId, workspace.id, true);
      target.searchParams.set("googleConnected", email || "1");
      target.searchParams.set("googleImported", String(result.created + result.updated));
    } catch (error) {
      target.searchParams.set(
        "googleError",
        error instanceof Error ? error.message : "Conectarea Google Calendar a eșuat."
      );
    }
  }

  const response = NextResponse.redirect(target);
  response.cookies.delete(GOOGLE_CALENDAR_STATE_COOKIE);
  return response;
}
