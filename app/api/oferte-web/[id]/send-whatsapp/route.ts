import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/session";
import { estimateWebsiteBrief } from "@/lib/pricing";
import { normalizeWebOffer, webOfferTotals } from "@/lib/web-offer";
import { webOfferText } from "@/lib/web-offer-message";

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Neautorizat." }, { status: 401 }) };
  if (!(await isSuperAdmin(user.userId))) return { error: NextResponse.json({ error: "Acces interzis." }, { status: 403 }) };
  return { user };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin();
  if (access.error) return access.error;
  const { id } = await params;
  const brief = await prisma.websiteBrief.findUnique({ where: { id } });
  if (!brief) return NextResponse.json({ error: "Oferta nu există." }, { status: 404 });
  const estimate = estimateWebsiteBrief(brief);
  const offerData = normalizeWebOffer(await request.json(), brief, estimate);
  if (!offerData.customerPhone) return NextResponse.json({ error: "Completează telefonul beneficiarului." }, { status: 400 });

  const phone = offerData.customerPhone.replace(/[^0-9]/g, "").replace(/^0/, "40");
  if (phone.length < 10) return NextResponse.json({ error: "Numărul de telefon nu este valid." }, { status: 400 });
  const fallbackUrl = `https://wa.me/${phone}?text=${encodeURIComponent(webOfferText(offerData))}`;
  const totals = webOfferTotals(offerData);
  const sentAt = new Date();
  await prisma.websiteBrief.update({ where: { id }, data: { offerData, estimatedValue: totals.net, status: "QUOTED", offerSentAt: sentAt, offerWhatsappSentAt: sentAt } });
  revalidatePath("/dashboard/oferte-web");
  revalidatePath(`/dashboard/oferte-web/${id}`);
  return NextResponse.json({ sent: false, fallbackUrl, offerData });
}

