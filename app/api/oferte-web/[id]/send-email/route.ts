import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { estimateWebsiteBrief } from "@/lib/pricing";
import { normalizeWebOffer, webOfferTotals } from "@/lib/web-offer";
import { webOfferEmailHtml, webOfferText } from "@/lib/web-offer-message";
import { mailboxApi } from "@/lib/mailbox/access";
import { operationId, readJson } from "@/lib/mailbox/config";
import { sendMessage } from "@/lib/mailbox/send";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = mailboxApi(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const input = await readJson(request);
  const operationKey = operationId(input && typeof input === "object" ? (input as Record<string, unknown>).operationKey : undefined);
  const { id } = await params;
  const brief = await prisma.websiteBrief.findUnique({ where: { id } });
  if (!brief) return NextResponse.json({ error: "Oferta nu există." }, { status: 404 });
  const estimate = estimateWebsiteBrief(brief);
  const offerData = normalizeWebOffer(input, brief, estimate);
  if (!offerData.customerEmail) return NextResponse.json({ error: "Completează adresa de e-mail a beneficiarului." }, { status: 400 });

  const sent = await sendMessage({
      operationKey,
      to: offerData.customerEmail,
      subject: `Propunere Next Level ${offerData.offerNumber} – ${offerData.projectTitle}`,
      html: webOfferEmailHtml(offerData),
      text: webOfferText(offerData),
  });

  const totals = webOfferTotals(offerData);
  const sentAt = new Date();
  await prisma.websiteBrief.update({ where: { id }, data: { offerData, estimatedValue: totals.net, status: "QUOTED", offerSentAt: sentAt, offerEmailSentAt: sentAt } });
  revalidatePath("/dashboard/oferte-web");
  revalidatePath(`/dashboard/oferte-web/${id}`);
  revalidatePath("/dashboard/email");
  return NextResponse.json({ sent: true, accepted: true, emailId: sent.id, operationKey, offerData });
});

