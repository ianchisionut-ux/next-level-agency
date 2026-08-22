import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { publishVariantNow } from "@/lib/publish-orchestrator";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { id, variantId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

    const variant = await prisma.postVariant.findUnique({
      where: { id: variantId },
      include: { post: true },
    });
    if (!variant || variant.postId !== id) {
      return NextResponse.json({ error: "Varianta nu a fost găsită" }, { status: 404 });
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.userId, workspaceId: variant.post.workspaceId } },
    });
    if (!member) return NextResponse.json({ error: "Nu ai acces la această postare" }, { status: 403 });

    // "Publică acum" - disponibil atat pentru variante esuate, cat si pentru
    // cele in asteptare (programate dar inca neincercate, sau in reincercare
    // automata) - userul poate forta publicarea imediata in ambele cazuri.
    if (variant.status !== "FAILED" && variant.status !== "PENDING") {
      return NextResponse.json(
        { error: "Doar variantele eșuate sau în așteptare pot fi publicate manual" },
        { status: 409 }
      );
    }

    const result = await publishVariantNow(variantId);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Publicarea a eșuat" }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Eroare la publicarea manuala:", err);
    return NextResponse.json({ error: "Nu am putut publica postarea" }, { status: 500 });
  }
}
