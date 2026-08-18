import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token și parolă obligatorii" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Parola trebuie să aibă minim 8 caractere" }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!resetToken) return NextResponse.json({ error: "Link invalid" }, { status: 404 });
    if (resetToken.usedAt) return NextResponse.json({ error: "Link deja folosit" }, { status: 409 });
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link expirat. Cere unul nou." }, { status: 410 });
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Eroare la resetarea parolei:", err);
    return NextResponse.json(
      { error: "Nu am putut reseta parola. Încearcă din nou." },
      { status: 500 }
    );
  }
}
