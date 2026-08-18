import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit({ key: `login:${ip}`, limit: 8, windowMs: 15 * 60 * 1000 });
    if (!allowed) {
      return NextResponse.json({ error: "Prea multe încercări. Așteaptă câteva minute." }, { status: 429 });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Completează email și parolă" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Email sau parolă incorectă" }, { status: 401 });
    }

    const token = await createSessionToken({ userId: user.id, email: user.email, name: user.name });

    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("Eroare la login:", err);
    return NextResponse.json(
      { error: "Nu am putut procesa autentificarea. Încearcă din nou în câteva momente." },
      { status: 500 }
    );
  }
}
