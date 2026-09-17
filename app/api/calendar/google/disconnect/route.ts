import { NextResponse } from "next/server";
import { ensureInternalCalendarSchema } from "@/lib/internal-calendar-schema";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  await ensureInternalCalendarSchema();
  await prisma.googleCalendarConnection.deleteMany({ where: { userId: user.userId } });
  return NextResponse.json({ ok: true });
}
