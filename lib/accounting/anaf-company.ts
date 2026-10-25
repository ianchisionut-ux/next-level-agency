import { bucharestDate } from "./date";

export class AnafLookupError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function normalizeCui(value: string) {
  const normalized = value.trim().toUpperCase().replace(/^RO\s*/, "");
  if (!/^\d{2,10}$/.test(normalized)) {
    throw new AnafLookupError("Introdu un CUI valid, cu sau fără prefixul RO.", 400);
  }
  const cui = String(Number(normalized));
  if (!/^\d{2,10}$/.test(cui)) throw new AnafLookupError("Introdu un CUI valid.", 400);
  return cui;
}

const text = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
const yes = (value: unknown) => value === true || value === 1 || value === "true" || value === "1";

export function companyFromAnaf(item: Record<string, any>, cui: string) {
  const general = item.date_generale || {};
  const social = item.adresa_sediu_social || {};
  const street = [text(social.sdenumire_Strada), text(social.snumar_Strada)].filter(Boolean).join(" ");
  const city = text(social.sdenumire_Localitate);
  const county = text(social.sdenumire_Judet);
  const address = street || text(social.sdetalii_Adresa)
    ? [street, text(social.sdetalii_Adresa), city, county].filter(Boolean).join(", ")
    : text(general.adresa);

  return {
    name: text(general.denumire),
    cif: cui,
    regCom: text(general.nrRegCom),
    address,
    judet: county,
    city,
    phone: text(general.telefon),
    postalCode: text(social.scod_Postal || general.codPostal),
    countryCode: "RO",
    vatPayer: yes(item.inregistrare_scop_Tva?.scpTVA) ? 1 : 0,
    vatIncasare: yes(item.inregistrare_RTVAI?.statusTvaIncasare) ? 1 : 0,
    inactive: yes(item.stare_inactiv?.statusInactivi),
    registrationStatus: text(general.stare_inregistrare),
  };
}

export async function lookupAnafCompany(value: string) {
  const cui = normalizeCui(value);
  try {
    const response = await fetch("https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify([{ cui: Number(cui), data: bucharestDate() }]),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error("ANAF unavailable");
    const payload = (await response.json()) as { found?: Array<Record<string, any>> };
    const item = payload.found?.find((entry) => String(entry.date_generale?.cui) === cui);
    if (!item) {
      throw new AnafLookupError("CUI-ul nu a fost găsit la ANAF. Poți completa datele manual.", 404);
    }
    return companyFromAnaf(item, cui);
  } catch (error) {
    if (error instanceof AnafLookupError) throw error;
    throw new AnafLookupError(
      "Serviciul ANAF nu răspunde momentan. Poți completa datele manual.",
      503,
    );
  }
}
