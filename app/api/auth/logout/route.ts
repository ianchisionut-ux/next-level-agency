import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return res;
  } catch (err) {
    console.error("Eroare la logout:", err);
    return NextResponse.json({ error: "Nu am putut finaliza delogarea" }, { status: 500 });
  }
}
