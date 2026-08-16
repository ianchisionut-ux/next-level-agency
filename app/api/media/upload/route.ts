import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Niciun fișier primit" }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Tip de fișier neacceptat" }, { status: 400 });
  }

  try {
    const blob = await put(`media/${Date.now()}-${file.name}`, file, {
      access: "public",
    });
    return NextResponse.json({ url: blob.url, type: file.type });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Eroare la upload" },
      { status: 500 }
    );
  }
}
