import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/session";

const VALID_STATUSES = ["NEW", "CONTACTED", "QUOTED", "ACCEPTED", "REJECTED", "ARCHIVED"];

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (!(await isSuperAdmin(user.userId))) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireSuperAdmin();
  if (check.error) return check.error;

  const { id } = await params;
  const { status } = await req.json();

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "invalid-status" }, { status: 400 });
  }

  await prisma.websiteBrief.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireSuperAdmin();
  if (check.error) return check.error;

  const { id } = await params;

  await prisma.websiteBrief.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
