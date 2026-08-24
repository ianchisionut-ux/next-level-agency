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

export async function GET() {
  const check = await requireAuth();
  if (check.error) return check.error;

  const entries = await prisma.registryEntry.findMany({ orderBy: { orderNumber: "desc" } });
  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      orderNumber: e.orderNumber,
      projectName: e.projectName,
      amount: e.amount.toString(),
      isPaid: e.isPaid,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const check = await requireAuth();
  if (check.error) return check.error;

  const { projectName, amount } = await req.json();

  if (!projectName?.trim()) {
    return NextResponse.json({ error: "Denumirea proiectului este obligatorie" }, { status: 400 });
  }
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum < 0) {
    return NextResponse.json({ error: "Suma trebuie să fie un număr valid" }, { status: 400 });
  }

  const entry = await prisma.registryEntry.create({
    data: { projectName: projectName.trim(), amount: amountNum },
  });

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
