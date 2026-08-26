import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/session";
import { estimateWebsiteBrief } from "@/lib/pricing";
import { normalizeWebOffer, webOfferTotals } from "@/lib/web-offer";

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Neautorizat." }, { status: 401 }) };
  if (!(await isSuperAdmin(user.userId))) return { error: NextResponse.json({ error: "Acces interzis." }, { status: 403 }) };
  return { user };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin();
  if (access.error) return access.error;
  const { id } = await params;
  const brief = await prisma.websiteBrief.findUnique({ where: { id } });
  if (!brief) return NextResponse.json({ error: "Oferta nu există." }, { status: 404 });
  const estimate = estimateWebsiteBrief(brief);
  const offerData = normalizeWebOffer(await request.json(), brief, estimate);
  const totals = webOfferTotals(offerData);
  await prisma.websiteBrief.update({ where: { id }, data: { offerData, estimatedValue: totals.net } });
  revalidatePath("/dashboard/oferte-web");
  revalidatePath(`/dashboard/oferte-web/${id}`);
  return NextResponse.json({ success: true, offerData });
}

