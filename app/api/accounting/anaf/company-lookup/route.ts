import { NextRequest, NextResponse } from "next/server";
import { accountingApi } from "@/lib/accounting/access";

async function GETHandler(req: NextRequest) {
  const cui = (req.nextUrl.searchParams.get("cui") || "").replace(/\D/g, "");
  if (!cui) return NextResponse.json({ error: "Introdu un CUI valid." }, { status: 400 });

  try {
    const response = await fetch("https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ cui: Number(cui), data: new Date().toISOString().slice(0, 10) }]),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    const found = data.found?.[0];
    if (!response.ok || !found) {
      return NextResponse.json({ error: "Firma nu a fost găsită în registrul ANAF." }, { status: 404 });
    }

    const general = found.date_generale || {};
    const sediu = found.adresa_sediu_social || {};
    const tva = found.inregistrare_scop_Tva || {};
    const inactive = found.stare_inactiv || {};
    return NextResponse.json({
      cui: String(general.cui || cui),
      name: general.denumire || "",
      address: general.adresa || "",
      regCom: general.nrRegCom || "",
      phone: general.telefon || "",
      postalCode: general.codPostal || sediu.scod_Postal || "",
      judet: sediu.sdenumire_Judet || "",
      city: sediu.sdenumire_Localitate || "",
      vatPayer: Boolean(tva.scpTVA),
      vatStart: tva.perioade_TVA?.[0]?.data_inceput_ScpTVA || "",
      status: inactive.statusInactivi ? "inactiv" : "activ",
    });
  } catch {
    return NextResponse.json({ error: "Serviciul public ANAF nu răspunde momentan. Încearcă din nou." }, { status: 502 });
  }
}

export const GET = accountingApi(GETHandler);