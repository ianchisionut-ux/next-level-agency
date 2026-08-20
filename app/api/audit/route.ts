import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint public (fara autentificare) apelat din formularul de pe
// nextlevel-agency.ro/chestionar-audit. Salveaza direct in baza de date -
// nu se mai trimite niciun email. Rezultatul apare instant in Signal,
// la tab-ul "Oferte Web".
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      companyName, activity, brandIdentity, ctaGoals, linkedCampaign,
      hasDomain, domainName, hasHosting, hostingProvider, needsEmail, wantsSSL,
      pages, pagesOther, hasContent, languages, otherLanguage, wantsTestimonials,
      likedSite1, likedSite2, visualStyle, contactElements, wantsSocialIntegration, maintenance,
      socialAccounts, socialOther, wantsSocialManagement, adBudget,
      launchDate, budget, contactName, contactPhone, contactEmail,
    } = body || {};

    if (!companyName || !contactName || (!contactPhone && !contactEmail)) {
      return NextResponse.json({ error: "missing-required-fields" }, { status: 400 });
    }

    const brief = await prisma.websiteBrief.create({
      data: {
        companyName,
        activity: activity || null,
        brandIdentity: brandIdentity || null,
        ctaGoals: Array.isArray(ctaGoals) ? ctaGoals : [],
        linkedCampaign: linkedCampaign || null,

        hasDomain: hasDomain || null,
        domainName: domainName || null,
        hasHosting: hasHosting || null,
        hostingProvider: hostingProvider || null,
        needsEmail: needsEmail || null,
        wantsSSL: wantsSSL || null,

        pages: Array.isArray(pages) ? pages : [],
        pagesOther: pagesOther || null,
        hasContent: hasContent || null,
        languages: languages || null,
        otherLanguage: otherLanguage || null,
        wantsTestimonials: wantsTestimonials || null,

        likedSite1: likedSite1 || null,
        likedSite2: likedSite2 || null,
        visualStyle: visualStyle || null,
        contactElements: Array.isArray(contactElements) ? contactElements : [],
        wantsSocialIntegration: wantsSocialIntegration || null,
        maintenance: maintenance || null,

        socialAccounts: Array.isArray(socialAccounts) ? socialAccounts : [],
        socialOther: socialOther || null,
        wantsSocialManagement: wantsSocialManagement || null,
        adBudget: adBudget || null,

        launchDate: launchDate || null,
        budget: budget || null,
        contactName,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
      },
    });

    return NextResponse.json({ ok: true, id: brief.id });
  } catch (err) {
    console.error("audit route error:", err);
    return NextResponse.json({ error: "save-failed" }, { status: 500 });
  }
}
