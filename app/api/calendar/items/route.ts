import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureInternalCalendarSchema } from "@/lib/internal-calendar-schema";
import { getActiveWorkspace, getCurrentUser } from "@/lib/session";

const TYPES = new Set(["NOTE", "TASK", "MEETING", "DEADLINE"]);
const PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"]);

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const workspace = await getActiveWorkspace();
  if (!user || !workspace) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  await ensureInternalCalendarSchema();
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  const items = await prisma.internalCalendarItem.findMany({
    where: {
      workspaceId: workspace.id,
      ...(start && end ? { startAt: { gte: new Date(start), lte: new Date(end) } } : {}),
    },
    include: { author: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
    orderBy: [{ startAt: "asc" }, { priority: "desc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const workspace = await getActiveWorkspace();
  if (!user || !workspace) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  await ensureInternalCalendarSchema();
  const body = await req.json();
  const title = String(body.title || "").trim();
  const startAt = new Date(body.startAt);
  if (!title || Number.isNaN(startAt.getTime())) return NextResponse.json({ error: "Titlul și data sunt obligatorii." }, { status: 400 });
  let assigneeId = body.assigneeId ? String(body.assigneeId) : null;
  if (assigneeId) {
    const member = await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: assigneeId, workspaceId: workspace.id } } });
    if (!member) assigneeId = null;
  }
  const item = await prisma.internalCalendarItem.create({
    data: {
      workspaceId: workspace.id,
      authorId: user.userId,
      assigneeId,
      title,
      notes: String(body.notes || "").trim() || null,
      type: TYPES.has(body.type) ? body.type : "NOTE",
      priority: PRIORITIES.has(body.priority) ? body.priority : "MEDIUM",
      startAt,
      endAt: body.endAt ? new Date(body.endAt) : null,
      allDay: Boolean(body.allDay),
    },
    include: { author: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
  });
  return NextResponse.json(item, { status: 201 });
}