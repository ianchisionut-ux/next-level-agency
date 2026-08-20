import { NextResponse } from "next/server";
import { Resend } from "resend";
import { siteConfig } from "@/lib/data";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY lipseste din .env");
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM || "Next Level <onboarding@resend.dev>";

// Rând simplu "etichetă: valoare" în tabelul emailului. Sare peste câmpurile goale.
function row(label: string, value: string | string[] | undefined) {
  if (!value || (Array.isArray(value) && value.length === 0)) return "";
  const display = Array.isArray(value) ? value.join(", ") : value;
  return `
    <tr>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#0a0f1e;border-bottom:1px solid #e5e9f2;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:10px 14px;font-size:13px;color:#334155;border-bottom:1px solid #e5e9f2;">${display}</td>
    </tr>`;
}

function sectionHeader(title: string) {
  return `
    <tr>
      <td colspan="2" style="padding:18px 14px 8px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#3b82f6;">${title}</td>
    </tr>`;
}

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

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:#0a0f1e;padding:24px 28px;border-radius:12px 12px 0 0;">
          <p style="margin:0;color:#60a5fa;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">Chestionar &amp; Audit</p>
          <h1 style="margin:6px 0 0;color:#ffffff;font-size:20px;">Proiect Site Web — ${companyName}</h1>
        </div>
        <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e9f2;border-top:none;border-radius:0 0 12px 12px;overflow:hidden;">
          <tbody>
            ${sectionHeader("Afacerea ta &amp; brand")}
            ${row("Firmă / activitate", `${companyName}${activity ? " — " + activity : ""}`)}
            ${row("Identitate de brand", brandIdentity)}
            ${row("Ce vrea vizitatorul să facă", ctaGoals)}
            ${row("Campanie de marketing legată", linkedCampaign)}

            ${sectionHeader("Domeniu &amp; Hosting")}
            ${row("Domeniu", hasDomain === "Da, îl am deja" ? `Da — ${domainName || "(nespecificat)"}` : hasDomain)}
            ${row("Hosting", hasHosting === "Da, la o firmă existentă" ? `Da — ${hostingProvider || "(nespecificat)"}` : hasHosting)}
            ${row("Adrese e-mail profesionale", needsEmail)}
            ${row("SSL &amp; monitorizare uptime", wantsSSL)}

            ${sectionHeader("Structură &amp; conținut")}
            ${row("Pagini dorite", [...(pages || []), pagesOther].filter(Boolean))}
            ${row("Text / poze / logo", hasContent)}
            ${row("Limbi", languages === "Română + altă limbă" ? `Română + ${otherLanguage || "?"}` : languages)}
            ${row("Testimoniale", wantsTestimonials)}

            ${sectionHeader("Design &amp; funcționalități")}
            ${row("Site-uri de referință", [likedSite1, likedSite2].filter(Boolean))}
            ${row("Stil vizual", visualStyle)}
            ${row("Contact rapid", contactElements)}
            ${row("Integrare social media pe site", wantsSocialIntegration)}
            ${row("Mentenanță post-lansare", maintenance)}

            ${sectionHeader("Marketing &amp; social media")}
            ${row("Conturi active", [...(socialAccounts || []), socialOther].filter(Boolean))}
            ${row("Vor management social media", wantsSocialManagement)}
            ${row("Buget lunar ads", adBudget)}

            ${sectionHeader("Termen, buget &amp; contact")}
            ${row("Lansare dorită", launchDate)}
            ${row("Buget orientativ", budget)}
            ${row("Nume", contactName)}
            ${row("Telefon", contactPhone)}
            ${row("Email", contactEmail)}
          </tbody>
        </table>
        <p style="margin:16px 4px;color:#94a3b8;font-size:11px;">
          Trimis automat din formularul de audit de pe nextlevel-agency.ro.
        </p>
      </div>
    `;

    const resend = getResend();
    await resend.emails.send({
      from: FROM,
      to: siteConfig.email,
      replyTo: contactEmail || undefined,
      subject: `Chestionar Audit Site Web — ${companyName}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("audit route error:", err);
    return NextResponse.json({ error: "send-failed" }, { status: 500 });
  }
}
