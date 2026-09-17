import { NextResponse } from "next/server";
import { syncGoogleCalendarForUser } from "@/lib/google-calendar";
import { ensureInternalCalendarSchema } from "@/lib/internal-calendar-schema";
import { getActiveWorkspace, getCurrentUser } from "@/lib/session";

export async function POST() {
  const user = await getCurrentUser();
  const workspace = await getActiveWorkspace();
  if (!user || !workspace) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  try {
    await ensureInternalCalendarSchema();
    const result = await syncGoogleCalendarForUser(user.userId, workspace.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sincronizarea a eșuat." },
      { status: 500 }
    );
  }
}
