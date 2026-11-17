import { accountingApi } from '@/lib/accounting/access'
import { after, type NextRequest, NextResponse } from "next/server";
import { listInvoices, createInvoice } from "@/lib/accounting/repo";
import { getAnafConnectionStatus, sendInvoiceToAnaf } from "@/lib/accounting/efactura";
import { publicInvoiceInput } from "@/lib/accounting/invoice-input";
import { ready } from "@/lib/accounting/db";

async function GETHandler(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("issuanceKey");
  if (key !== null) {
    if (!/^[a-zA-Z0-9:_-]{16,160}$/.test(key)) return NextResponse.json({ error: "Cheie de cerere invalidă." }, { status: 400 });
    const { rows } = await (await ready()).query(`SELECT id FROM invoices WHERE "issuanceKey"=$1`, [key]);
    return NextResponse.json({ id: rows[0]?.id ?? null }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(await listInvoices());
}

async function POSTHandler(req: NextRequest) {
  try {
    const data = await req.json();
    if (data.anafEnvironment !== (process.env.ANAF_ENVIRONMENT === 'production' ? 'production' : 'test')) return NextResponse.json({ error: 'Mediul ANAF s-a schimbat. Reîncarcă pagina și confirmă din nou.' }, { status: 409 });
    if (typeof data.sendToAnafNow !== "boolean") return NextResponse.json({ error: "Alege trimiterea la ANAF acum sau în ziua următoare." }, { status: 400 });
    const id = await createInvoice(publicInvoiceInput(data));
    if (data.sendToAnafNow) after(async () => {
      try {
        const connection = await getAnafConnectionStatus();
        if (connection.configured && connection.canAttempt) await sendInvoiceToAnaf(id);
      } catch (error) {
        console.error(`Trimiterea automată e-Factura pentru factura ${id} a eșuat:`, error);
      }
    });
    return NextResponse.json({ id, eFactura: { status: data.sendToAnafNow ? "PENDING" : "DEFERRED" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Factura nu a putut fi emisă." }, { status: 400 });
  }
}

export const GET = accountingApi(GETHandler)
export const POST = accountingApi(POSTHandler)
