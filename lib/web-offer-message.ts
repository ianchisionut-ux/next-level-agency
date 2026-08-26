import type { WebOfferData } from "@/lib/web-offer";
import { formatLei, webOfferTotals } from "@/lib/web-offer";
import { siteConfig } from "@/lib/data";

export function escapeOfferHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

export function webOfferText(data: WebOfferData) {
  const totals = webOfferTotals(data);
  return [
    "*OFERTĂ NEXT LEVEL ADVERTISING AGENCY*",
    `Nr. ${data.offerNumber} · ${new Date(data.offerDate).toLocaleDateString("ro-RO")}`,
    "",
    `Bună ziua, ${data.customerName}!`,
    `Vă transmitem propunerea pentru ${data.projectTitle}.`,
    "",
    ...data.items.map((item) => `• ${item.description}: ${formatLei(item.quantity * item.unitPrice)} + TVA`),
    "",
    `*Total cu TVA (${data.vatRate}%): ${formatLei(totals.gross)}*`,
    `Valabilitate: ${data.validity}`,
    `Termen de livrare: ${data.deliveryTerm}`,
    `Condiții de plată: ${data.paymentTerms}`,
    data.notes ? `Observații: ${data.notes}` : "",
    "",
    "Pentru acceptare sau clarificări, ne puteți răspunde direct la acest mesaj.",
    `— ${siteConfig.name} ${siteConfig.tagline} · ${siteConfig.phone}`,
  ].filter((line, index, all) => line || all[index - 1] !== "").join("\n").slice(0, 7000);
}

export function webOfferEmailHtml(data: WebOfferData) {
  const totals = webOfferTotals(data);
  const rows = data.items.map((item, index) => `<tr><td style="padding:13px;border-bottom:1px solid #e5e9f2;color:#64748b">${index + 1}</td><td style="padding:13px;border-bottom:1px solid #e5e9f2"><strong>${escapeOfferHtml(item.description)}</strong>${item.details ? `<br><span style="font-size:12px;color:#64748b">${escapeOfferHtml(item.details)}</span>` : ""}</td><td style="padding:13px;border-bottom:1px solid #e5e9f2;text-align:right;font-weight:700">${escapeOfferHtml(formatLei(item.quantity * item.unitPrice))}</td></tr>`).join("");
  const included = data.included.map((item) => `<li style="margin:7px 0">${escapeOfferHtml(item)}</li>`).join("");

  return `<div style="background:#f5f7fb;padding:32px;font-family:Arial,sans-serif;color:#0a0f1e"><div style="max-width:760px;margin:auto;background:white;border-radius:20px;overflow:hidden;border:1px solid #e5e9f2"><div style="padding:30px;background:linear-gradient(135deg,#0a0f1e,#1d4ed8);color:white"><div style="font-size:12px;letter-spacing:2px;color:#93c5fd">NEXT LEVEL ADVERTISING AGENCY</div><h1 style="margin:12px 0 4px;font-size:30px">Propunere comercială</h1><p style="margin:0;color:#bfdbfe">Ofertă ${escapeOfferHtml(data.offerNumber)} · ${new Date(data.offerDate).toLocaleDateString("ro-RO")}</p></div><div style="padding:30px"><p>Bună ziua, <strong>${escapeOfferHtml(data.customerName)}</strong>,</p><p>Vă transmitem propunerea personalizată pentru <strong>${escapeOfferHtml(data.projectTitle)}</strong>.</p><p style="line-height:1.6;color:#475569">${escapeOfferHtml(data.projectSummary)}</p><table style="width:100%;border-collapse:collapse;margin:24px 0"><thead><tr style="background:#0a0f1e;color:white"><th style="padding:12px;text-align:left">#</th><th style="padding:12px;text-align:left">Serviciu</th><th style="padding:12px;text-align:right">Valoare fără TVA</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="2" style="padding:16px;background:#eff6ff;font-weight:800">TOTAL CU TVA (${data.vatRate}%)</td><td style="padding:16px;background:#eff6ff;text-align:right;font-size:19px;font-weight:900;color:#1d4ed8">${escapeOfferHtml(formatLei(totals.gross))}</td></tr></tfoot></table><h3>Inclus în proiect</h3><ul style="padding-left:20px;color:#475569">${included}</ul><p><strong>Valabilitate:</strong> ${escapeOfferHtml(data.validity)}<br><strong>Termen:</strong> ${escapeOfferHtml(data.deliveryTerm)}<br><strong>Plată:</strong> ${escapeOfferHtml(data.paymentTerms)}</p>${data.notes ? `<p><strong>Observații:</strong> ${escapeOfferHtml(data.notes)}</p>` : ""}<p style="margin-top:28px">Cu stimă,<br><strong>${siteConfig.legalName}</strong><br>${siteConfig.phone} · ${siteConfig.email}</p></div></div></div>`;
}

