import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { randomBytes } from "crypto";

async function assertAccess(userId: string, campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { error: NextResponse.json({ error: "Campanie inexistentă" }, { status: 404 }) };

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: campaign.workspaceId } },
  });
  if (!member) return { error: NextResponse.json({ error: "Nu ai acces la această campanie" }, { status: 403 }) };

  return { campaign };
}

// Genereaza (sau regenereaza) link-ul public de partajare
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { error } = await assertAccess(user.userId, id);
    if (error) return error;

    const shareToken = randomBytes(16).toString("hex");
    await prisma.campaign.update({ where: { id }, data: { shareToken } });

    return NextResponse.json({ shareToken });
  } catch (err) {
    console.error("Eroare la generarea link-ului de partajare:", err);
    return NextResponse.json({ error: "Nu am putut genera link-ul" }, { status: 500 });
  }
}

// Revoca link-ul public existent
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { error } = await assertAccess(user.userId, id);
    if (error) return error;

    await prisma.campaign.update({ where: { id }, data: { shareToken: null } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Eroare la revocarea link-ului:", err);
    return NextResponse.json({ error: "Nu am putut revoca link-ul" }, { status: 500 });
  }
}
