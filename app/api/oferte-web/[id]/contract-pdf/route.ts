import React from "react";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/session";
import { estimateWebsiteBrief } from "@/lib/pricing";
import { normalizeWebOffer, webOfferTotals } from "@/lib/web-offer";
import { WebContractPdf } from "@/components/website-briefs/WebContractPdf";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  if (!(await isSuperAdmin(user.userId))) return NextResponse.json({ error: "Acces interzis." }, { status: 403 });

  const { id } = await params;
  const brief = await prisma.websiteBrief.findUnique({ where: { id } });
  if (!brief) return NextResponse.json({ error: "Oferta nu există." }, { status: 404 });

  const offerData = normalizeWebOffer(await request.json(), brief, estimateWebsiteBrief(brief));
  if (!offerData.contractNumber.trim() || !offerData.contractDate) return NextResponse.json({ error: "Completează numărul și data contractului." }, { status: 400 });
  if (!offerData.customerCompany.trim() || !offerData.customerRepresentative.trim()) return NextResponse.json({ error: "Completează beneficiarul și reprezentantul său." }, { status: 400 });

  await prisma.websiteBrief.update({ where: { id }, data: { offerData, estimatedValue: webOfferTotals(offerData).net } });
  revalidatePath("/dashboard/oferte-web");
  revalidatePath(`/dashboard/oferte-web/${id}`);

  const element = React.createElement(WebContractPdf, { data: offerData });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);
  const safeNumber = offerData.contractNumber.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return new NextResponse(buffer as unknown as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Contract_${safeNumber}.pdf"`, "Cache-Control": "no-store" } });
}
