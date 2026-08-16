import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendInvitationEmail } from "@/lib/email";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

  const { workspaceId, email, role } = await req.json();
  if (!workspaceId || !email) {
    return NextResponse.json({ error: "workspaceId și email sunt obligatorii" }, { status: 400 });
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.userId, workspaceId } },
    include: { workspace: true },
  });
  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Doar proprietarul poate invita membri" }, { status: 403 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: existingUser.id, workspaceId } },
    });
    if (alreadyMember) {
      return NextResponse.json({ error: "Acest utilizator e deja membru" }, { status: 409 });
    }
  }

  const token = crypto.randomBytes(24).toString("base64url");

  const invitation = await prisma.workspaceInvitation.create({
    data: {
      workspaceId,
      email: normalizedEmail,
      role: role === "VIEWER" || role === "EDITOR" ? role : "EDITOR",
      token,
      invitedByName: user.name,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    },
  });

  const acceptUrl = new URL(`/invite/${token}`, req.url).toString();

  try {
    await sendInvitationEmail({
      to: normalizedEmail,
      workspaceName: membership.workspace.name,
      inviterName: user.name,
      acceptUrl,
    });
  } catch (err) {
    // invitatia tot exista in DB, doar email-ul a esuat - util pt dezvoltare fara RESEND_API_KEY
    return NextResponse.json({
      invitation,
      warning: "Invitația a fost creată dar emailul nu a putut fi trimis. Link direct: " + acceptUrl,
    });
  }

  return NextResponse.json({ invitation });
}
