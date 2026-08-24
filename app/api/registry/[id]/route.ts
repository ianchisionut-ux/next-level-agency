import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Registrul e editabil de ORICE user autentificat din Signal, nu doar de
// super admin - e un registru de lucru comun pentru toata echipa.
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Neautentificat" }, { status: 401 }) };
  return { user };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAuth();
  if (check.error) return check.error;

  const { id } = await params;
  const body = await req.json();

  const data: { isPaid?: boolean; projectName?: string; amount?: number } = {};
  if (typeof body.isPaid === "boolean") data.isPaid = body.isPaid;
  if (typeof body.projectName === "string" && body.projectName.trim()) data.projectName = body.projectName.trim();
  if (body.amount !== undefined) {
    const amountNum = Number(body.amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      return NextResponse.json({ error: "Suma trebuie să fie un număr valid" }, { status: 400 });
    }
    data.amount = amountNum;
  }

  const entry = await prisma.registryEntry.update({ where: { id }, data });

  return NextResponse.json({
    entry: {
      id: entry.id,
      orderNumber: entry.orderNumber,
      projectName: entry.projectName,
      amount: entry.amount.toString(),
      isPaid: entry.isPaid,
      createdAt: entry.createdAt.toISOString(),
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAuth();
  if (check.error) return check.error;

  const { id } = await params;
  await prisma.registryEntry.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
