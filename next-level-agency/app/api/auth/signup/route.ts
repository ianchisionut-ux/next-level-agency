import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit({ key: `signup:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: "Prea multe conturi create recent. Încearcă mai târziu." }, { status: 429 });
  }

  const { email, password, name, workspaceName } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Completează toate câmpurile" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Parola trebuie să aibă minim 8 caractere" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Există deja un cont cu acest email" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      memberships: {
        create: {
          role: "OWNER",
          workspace: {
            create: { name: workspaceName || `Spațiul lui ${name}` },
          },
        },
      },
    },
  });

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
}
