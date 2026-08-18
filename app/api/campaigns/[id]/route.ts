import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function assertAccess(userId: string, campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { error: NextResponse.json({ error: "Campanie inexistentă" }, { status: 404 }) };

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: campaign.workspaceId } },
  });
  if (!member) return { error: NextResponse.json({ error: "Nu ai acces la această campanie" }, { status: 403 }) };

  return { campaign };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { campaign, error } = await assertAccess(user.userId, id);
    if (error) return error;

    const posts = await prisma.post.findMany({
      where: { campaignId: id },
      include: { variants: { include: { account: true, insights: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ campaign, posts });
  } catch (err) {
    console.error("Eroare la incarcarea campaniei:", err);
    return NextResponse.json({ error: "Nu am putut încărca campania" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { error } = await assertAccess(user.userId, id);
    if (error) return error;

    const body = await req.json();
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        description: body.description?.trim() || null,
        goal: body.goal !== undefined ? (body.goal ? Number(body.goal) : null) : undefined,
        startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : undefined,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
      },
    });

    return NextResponse.json({ campaign });
  } catch (err) {
    console.error("Eroare la editarea campaniei:", err);
    return NextResponse.json({ error: "Nu am putut edita campania" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const { error } = await assertAccess(user.userId, id);
    if (error) return error;

    // Nu stergem postarile - doar le "desprindem" din campanie
    await prisma.post.updateMany({ where: { campaignId: id }, data: { campaignId: null } });
    await prisma.campaign.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Eroare la stergerea campaniei:", err);
    return NextResponse.json({ error: "Nu am putut șterge campania" }, { status: 500 });
  }
}
