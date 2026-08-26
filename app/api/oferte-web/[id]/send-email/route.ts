import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/session";
import { estimateWebsiteBrief } from "@/lib/pricing";
import { normalizeWebOffer, webOfferTotals } from "@/lib/web-offer";
import { webOfferEmailHtml, webOfferText } from "@/lib/web-offer-message";
import { sendWebsiteOfferEmail } from "@/lib/email";

export const runtime = "nodejs";

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
  if (!offerData.customerEmail) return NextResponse.json({ error: "Completează adresa de e-mail a beneficiarului." }, { status: 400 });

  try {
    await sendWebsiteOfferEmail({
      to: offerData.customerEmail,
      subject: `Propunere Next Level ${offerData.offerNumber} – ${offerData.projectTitle}`,
      html: webOfferEmailHtml(offerData),
      text: webOfferText(offerData),
    });
  } catch (error) {
    console.error("Website offer delivery failed", error);
    return NextResponse.json({ error: "E-mailul nu a putut fi trimis. Verifică RESEND_API_KEY și domeniul expeditorului." }, { status: 502 });
  }

  const totals = webOfferTotals(offerData);
  const sentAt = new Date();
  await prisma.websiteBrief.update({ where: { id }, data: { offerData, estimatedValue: totals.net, status: "QUOTED", offerSentAt: sentAt, offerEmailSentAt: sentAt } });
  revalidatePath("/dashboard/oferte-web");
  revalidatePath(`/dashboard/oferte-web/${id}`);
  return NextResponse.json({ sent: true, offerData });
}

