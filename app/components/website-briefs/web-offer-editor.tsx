'use client';

import { useEffect, useMemo, useState } from "react";
import { Check, FileDown, Loader2, Mail, MessageCircle, Plus, Save, Trash2, X } from "lucide-react";
import { defaultWebOffer, formatLei, webOfferTotals, type WebOfferData, type WebsiteBriefOfferSource } from "@/lib/web-offer";

type EditorProps = {
  brief: WebsiteBriefOfferSource & { offerData?: WebOfferData | null };
  estimate: { priceMin: number; tier: string };
  onClose: () => void;
  onSaved?: () => void;
};

export function WebOfferEditor({ brief, estimate, onClose, onSaved }: EditorProps) {
  const [data, setData] = useState<WebOfferData>(() => brief.offerData || defaultWebOffer(brief, estimate));
  const [busy, setBusy] = useState<"save" | "email" | "whatsapp" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const totals = useMemo(() => webOfferTotals(data), [data]);

  useEffect(() => () => {
    document.body.classList.remove("web-offer-printing");
    document.getElementById("web-offer-page-style")?.remove();
  }, []);

  function update<K extends keyof WebOfferData>(key: K, value: WebOfferData[K]) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function updateItem(index: number, key: "description" | "details" | "quantity" | "unit" | "unitPrice", value: string | number) {
    setData((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  }

  function addItem() {
    setData((current) => ({ ...current, items: [...current.items, { id: `item-${Date.now()}`, description: "Serviciu nou", details: "", quantity: 1, unit: "pachet", unitPrice: 0 }] }));
  }

  function removeItem(index: number) {
    setData((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function updateIncluded(index: number, value: string) {
    setData((current) => ({ ...current, included: current.included.map((item, itemIndex) => itemIndex === index ? value : item) }));
  }

  async function call(action: "sheet" | "send-email" | "send-whatsapp") {
    const mode = action === "sheet" ? "save" : action === "send-email" ? "email" : "whatsapp";
    setBusy(mode);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/oferte-web/${brief.id}/${action}`, {
        method: action === "sheet" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Operațiunea nu a reușit.");
      if (result.offerData) setData(result.offerData);
      if (action === "send-whatsapp" && result.fallbackUrl) {
        window.open(result.fallbackUrl, "_blank", "noopener,noreferrer");
        setNotice("Am deschis WhatsApp cu oferta completată. Verifică mesajul și apasă Trimite.");
      } else {
        setNotice(action === "sheet" ? "Oferta a fost salvată." : "Oferta a fost trimisă prin e-mail.");
      }
      onSaved?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Operațiunea nu a reușit.");
    } finally {
      setBusy(null);
    }
  }

  function printOffer() {
    document.getElementById("web-offer-page-style")?.remove();
    const style = document.createElement("style");
    style.id = "web-offer-page-style";
    style.textContent = "@page { size: A4; margin: 0; }";
    document.head.appendChild(style);
    document.body.classList.add("web-offer-printing");
    const cleanup = () => {
      document.body.classList.remove("web-offer-printing");
      document.getElementById("web-offer-page-style")?.remove();
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 3000);
  }

  return (
    <div className="web-offer-overlay" role="dialog" aria-modal="true" aria-label="Editor ofertă web">
      <div className="web-offer-shell">
        <header className="web-offer-toolbar no-print">
          <div>
            <p>OFERTĂ WEB · {data.offerNumber}</p>
            <h2>{data.customerCompany || brief.companyName}</h2>
          </div>
          <div className="web-offer-toolbar-actions">
            <button className="web-offer-button secondary" onClick={() => call("sheet")} disabled={!!busy}>{busy === "save" ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Salvează</button>
            <button className="web-offer-button secondary" onClick={printOffer}><FileDown size={16} /> Print / PDF</button>
            <button className="web-offer-button whatsapp" onClick={() => call("send-whatsapp")} disabled={!!busy}>{busy === "whatsapp" ? <Loader2 className="animate-spin" size={16} /> : <MessageCircle size={16} />} WhatsApp</button>
            <button className="web-offer-button primary" onClick={() => call("send-email")} disabled={!!busy}>{busy === "email" ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />} Trimite e-mail</button>
            <button className="web-offer-close" onClick={onClose} aria-label="Închide"><X size={18} /></button>
          </div>
        </header>

        {(notice || error) && <div className={`no-print web-offer-notice ${error ? "error" : ""}`}>{error ? <X size={16} /> : <Check size={16} />}{error || notice}</div>}

        <div className="web-offer-grid">
          <section className="web-offer-fields no-print">
            <div className="web-offer-hint"><strong>Estimare automată: {estimate.tier}</strong><span>Pornire de la {formatLei(estimate.priceMin)}. Ajustează serviciile și valorile înainte de trimitere.</span></div>

            <h3>Date ofertă și client</h3>
            <div className="web-offer-form-grid">
              <Field label="Număr ofertă" value={data.offerNumber} onChange={(value) => update("offerNumber", value)} />
              <Field label="Data" type="date" value={data.offerDate} onChange={(value) => update("offerDate", value)} />
              <Field label="Beneficiar" value={data.customerName} onChange={(value) => update("customerName", value)} />
              <Field label="Companie" value={data.customerCompany} onChange={(value) => update("customerCompany", value)} />
              <Field label="Telefon" value={data.customerPhone} onChange={(value) => update("customerPhone", value)} />
              <Field label="E-mail" type="email" value={data.customerEmail} onChange={(value) => update("customerEmail", value)} />
            </div>
            <Field label="Titlul proiectului" value={data.projectTitle} onChange={(value) => update("projectTitle", value)} />
            <Area label="Rezumatul propunerii" value={data.projectSummary} onChange={(value) => update("projectSummary", value)} />

            <div className="web-offer-section-head"><h3>Servicii și valori</h3><button type="button" onClick={addItem}><Plus size={14} /> Adaugă</button></div>
            <div className="web-offer-items">
              {data.items.map((item, index) => (
                <div className="web-offer-item" key={item.id}>
                  <div className="web-offer-item-head"><strong>{index + 1}. {item.description || "Serviciu"}</strong><button type="button" onClick={() => removeItem(index)} disabled={data.items.length === 1} aria-label="Șterge serviciul"><Trash2 size={14} /></button></div>
                  <Field label="Denumire" value={item.description} onChange={(value) => updateItem(index, "description", value)} />
                  <Field label="Detalii" value={item.details} onChange={(value) => updateItem(index, "details", value)} />
                  <div className="web-offer-item-values">
                    <NumberField label="Cantitate" value={item.quantity} step="1" onChange={(value) => updateItem(index, "quantity", value)} />
                    <Field label="Unitate" value={item.unit} onChange={(value) => updateItem(index, "unit", value)} />
                    <NumberField label="Preț unitar (lei)" value={item.unitPrice} onChange={(value) => updateItem(index, "unitPrice", value)} />
                  </div>
                </div>
              ))}
            </div>

            <h3>Condiții comerciale</h3>
            <div className="web-offer-form-grid">
              <NumberField label="TVA (%)" value={data.vatRate} step="1" onChange={(value) => update("vatRate", value)} />
              <Field label="Valabilitate" value={data.validity} onChange={(value) => update("validity", value)} />
            </div>
            <Field label="Termen de livrare" value={data.deliveryTerm} onChange={(value) => update("deliveryTerm", value)} />
            <Field label="Condiții de plată" value={data.paymentTerms} onChange={(value) => update("paymentTerms", value)} />

            <h3>Incluse și observații</h3>
            {data.included.map((item, index) => <Field key={index} label={`Beneficiu ${index + 1}`} value={item} onChange={(value) => updateIncluded(index, value)} />)}
            <Area label="Observații" value={data.notes} onChange={(value) => update("notes", value)} />
          </section>

          <OfferPaper data={data} totals={totals} />
        </div>
      </div>
    </div>
  );
}

function OfferPaper({ data, totals }: { data: WebOfferData; totals: ReturnType<typeof webOfferTotals> }) {
  return (
    <article className="web-offer-paper">
      <header className="web-offer-paper-header">
        <div className="web-offer-logo"><img src="/brand/logo-mark.png" alt="Next Level" /><span><strong>NEXT LEVEL</strong><small>ADVERTISING AGENCY</small></span></div>
        <div><b>PROPUNERE COMERCIALĂ</b><span>Nr. {data.offerNumber}</span><small>{new Date(data.offerDate).toLocaleDateString("ro-RO")}</small></div>
      </header>
      <div className="web-offer-paper-band"><small>STRATEGIE · DESIGN · DEZVOLTARE</small><h1>{data.projectTitle}</h1><p>O soluție construită pentru următorul nivel al brandului tău.</p></div>
      <section className="web-offer-paper-client"><div><small>PREGĂTITĂ PENTRU</small><strong>{data.customerName || "—"}</strong><span>{data.customerCompany || "—"}</span></div><div><small>CONTACT</small><strong>{data.customerPhone || "—"}</strong><span>{data.customerEmail || "—"}</span></div></section>
      <section><h2>Context și obiectiv</h2><p>{data.projectSummary || "Propunere personalizată pentru dezvoltarea prezenței digitale."}</p></section>
      <section><h2>Investiția propusă</h2><table className="web-offer-table"><thead><tr><th>#</th><th>Serviciu</th><th>Cant.</th><th>Preț unitar</th><th>Total</th></tr></thead><tbody>{data.items.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td><strong>{item.description}</strong>{item.details && <small>{item.details}</small>}</td><td>{item.quantity} {item.unit}</td><td>{formatLei(item.unitPrice)}</td><td>{formatLei(item.quantity * item.unitPrice)}</td></tr>)}</tbody><tfoot><tr><td colSpan={4}>Subtotal</td><td>{formatLei(totals.net)}</td></tr><tr><td colSpan={4}>TVA ({data.vatRate}%)</td><td>{formatLei(totals.vat)}</td></tr><tr className="grand-total"><td colSpan={4}>TOTAL INVESTIȚIE</td><td>{formatLei(totals.gross)}</td></tr></tfoot></table></section>
      <section className="web-offer-included"><h2>Ce este inclus</h2><div>{data.included.filter(Boolean).map((item, index) => <p key={index}><span>✓</span>{item}</p>)}</div></section>
      <section className="web-offer-conditions"><h2>Condiții comerciale</h2><div><p><small>VALABILITATE</small>{data.validity}</p><p><small>TERMEN</small>{data.deliveryTerm}</p><p><small>PLATĂ</small>{data.paymentTerms}</p></div></section>
      {data.notes && <section><h2>Observații</h2><div className="web-offer-paper-note">{data.notes}</div></section>}
      <footer className="web-offer-paper-footer"><div><img src="/brand/logo-mark.png" alt="" /><span><strong>NEXTLEVEL AUTOMATION S.R.L.</strong><small>CUI 55476878 · Zalău, Sălaj</small><small>+40 740 565 663 · nextlevel.zalau@gmail.com</small></span></div><div><span>Acceptat beneficiar,</span><strong>________________________</strong></div></footer>
    </article>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="web-offer-field">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
function NumberField({ label, value, onChange, step = "50" }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
  return <label className="web-offer-field">{label}<input type="number" min="0" step={step} value={value || ""} onChange={(event) => onChange(Number(event.target.value) || 0)} /></label>;
}
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="web-offer-field">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

