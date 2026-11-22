/** A print-only document using the same DOM and stylesheet as the offer preview. */
export const OFFER_PRINT_STYLE = `
@page{size:A4 portrait;margin:0}
html,body{width:210mm!important;height:296mm!important;margin:0!important;padding:0!important;background:#fff!important;color:#172033!important;overflow:hidden!important}
*,*::before,*::after{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
.web-offer-print-page{position:relative!important;box-sizing:border-box!important;width:210mm!important;height:296mm!important;margin:0!important;padding:0!important;overflow:hidden!important;background:white!important}
.web-offer-print-page .web-offer-paper{position:absolute!important;display:block!important;box-sizing:border-box!important;left:0;top:0;width:210mm!important;max-width:none!important;min-height:0!important;height:auto!important;margin:0!important;padding:13mm 14mm!important;box-shadow:none!important;transform-origin:top left!important}
`;

function escapeText(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function offerPrintGeometry(width: number, height: number, pageWidth: number, pageHeight: number) {
  if (![width, height, pageWidth, pageHeight].every(value => Number.isFinite(value) && value > 0)) throw new Error("Dimensiunile ofertei nu au putut fi măsurate.");
  // A small inset avoids an extra sheet caused by fractional print pixels.
  const scale = Math.min(1, (pageWidth - 4) / width, (pageHeight - 4) / height);
  if (scale < 0.72) throw new Error("Oferta este prea lungă pentru o singură pagină lizibilă. Scurtează descrierile sau observațiile înainte de Print / PDF.");
  return { scale, left: (pageWidth - width * scale) / 2, top: 2 };
}

export function offerPrintDocument(paperHtml: string, styles: string, origin: string, offerNumber: string) {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><base href="${escapeText(origin)}/"><title>${escapeText(`Oferta ${offerNumber}`)}</title>${styles}<style>${OFFER_PRINT_STYLE}</style></head><body><main class="web-offer-print-page">${paperHtml}</main></body></html>`;
}

function waitForAssets(printWindow: Window) {
  const doc = printWindow.document;
  const stylesheets = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map(link => link.sheet ? Promise.resolve() : new Promise<void>((resolve, reject) => {
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => reject(new Error("Stilurile ofertei nu s-au încărcat. Încearcă din nou Print / PDF.")), { once: true });
  }));
  const images = Array.from(doc.images).map(image => image.complete ? image.naturalWidth ? Promise.resolve() : Promise.reject(new Error("Sigla ofertei nu s-a încărcat. Încearcă din nou Print / PDF.")) : new Promise<void>((resolve, reject) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => reject(new Error("Sigla ofertei nu s-a încărcat. Încearcă din nou Print / PDF.")), { once: true });
  }));
  return Promise.all([...stylesheets, ...images, doc.fonts?.ready]);
}

export async function prepareOfferPrint(printWindow: Window) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      waitForAssets(printWindow),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Oferta nu s-a pregătit la timp. Încearcă din nou Print / PDF.")), 15_000); }),
    ]);
    const page = printWindow.document.querySelector<HTMLElement>(".web-offer-print-page");
    const paper = printWindow.document.querySelector<HTMLElement>(".web-offer-paper");
    if (!page || !paper || printWindow.closed) throw new Error("Fereastra ofertei a fost închisă înainte de tipărire.");
    const pageRect = page.getBoundingClientRect(), paperRect = paper.getBoundingClientRect();
    const fit = offerPrintGeometry(paperRect.width, Math.max(paperRect.height, paper.scrollHeight), pageRect.width, pageRect.height);
    paper.style.transform = `scale(${fit.scale})`;
    paper.style.left = `${fit.left}px`;
    paper.style.top = `${fit.top}px`;
    printWindow.focus();
    printWindow.print();
  } finally { if (timer) clearTimeout(timer); }
}
