import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureInternalCalendarSchema } from "@/lib/internal-calendar-schema";
import { getActiveWorkspace, getCurrentUser } from "@/lib/session";

const STATUSES = new Set(["TODO", "IN_PROGRESS", "DONE"]);
const TYPES = new Set(["NOTE", "TASK", "MEETING", "DEADLINE"]);
const PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const workspace = await getActiveWorkspace();
  if (!user || !workspace) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  await ensureInternalCalendarSchema();
  const { id } = await params;
  const existing = await prisma.internalCalendarItem.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Elementul nu există." }, { status: 404 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.notes !== undefined) data.notes = String(body.notes).trim() || null;
  if (TYPES.has(body.type)) data.type = body.type;
  if (PRIORITIES.has(body.priority)) data.priority = body.priority;
  if (STATUSES.has(body.status)) data.status = body.status;
  if (body.startAt) data.startAt = new Date(body.startAt);
  if (body.endAt !== undefined) data.endAt = body.endAt ? new Date(body.endAt) : null;
  if (body.allDay !== undefined) data.allDay = Boolean(body.allDay);
  if (body.assigneeId !== undefined) {
    const assigneeId = body.assigneeId ? String(body.assigneeId) : null;
    const member = assigneeId ? await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: assigneeId, workspaceId: workspace.id } } }) : null;
    data.assigneeId = member ? assigneeId : null;
  }
  const item = await prisma.internalCalendarItem.update({
    where: { id }, data,
    include: { author: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const workspace = await getActiveWorkspace();
  if (!user || !workspace) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  await ensureInternalCalendarSchema();
  const { id } = await params;
  const existing = await prisma.internalCalendarItem.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Elementul nu există." }, { status: 404 });
  await prisma.internalCalendarItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}