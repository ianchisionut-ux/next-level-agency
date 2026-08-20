import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 ora

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit({ key: `forgot-password:${ip}`, limit: 4, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: "Prea multe cereri. Încearcă mai târziu." }, { status: 429 });
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email obligatoriu" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Raspundem la fel indiferent daca userul exista, ca sa nu dezvaluim ce email-uri au cont
  if (user && user.email) {
    const token = crypto.randomBytes(24).toString("base64url");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    });

    const resetUrl = new URL(`/reset-password/${token}`, req.url).toString();
    try {
      await sendPasswordResetEmail({ to: user.email, resetUrl });
    } catch {
      // fara RESEND_API_KEY configurat, cel putin logam link-ul ca sa poata fi testat local
      console.log("Link resetare parola (email nu a putut fi trimis):", resetUrl);
    }
  }

  return NextResponse.json({
    success: true,
    message: "Dacă există un cont cu acest email, ai primit instrucțiuni de resetare.",
  });
}
