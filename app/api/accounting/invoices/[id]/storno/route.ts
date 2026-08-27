import { after, type NextRequest, NextResponse } from "next/server";
import { accountingApi } from "@/lib/accounting/access";
import { createStornoInvoice } from "@/lib/accounting/repo";
import { getAnafConnectionStatus, sendInvoiceToAnaf } from "@/lib/accounting/efactura";

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const reason = String(data.reason || "").trim();
    if (!reason) return NextResponse.json({ error: "Completează motivul stornării." }, { status: 400 });
    const stornoId = await createStornoInvoice({
      originalInvoiceId: Number(id),
      series: String(data.series || "STO"),
      issueDate: String(data.issueDate || new Date().toISOString().slice(0, 10)),
      reason,
    });
    after(async () => {
      try {
        const connection = await getAnafConnectionStatus();
        if (connection.configured && connection.connected) await sendInvoiceToAnaf(stornoId);
      } catch (error) {
        console.error(`Trimiterea automată e-Factura pentru storno ${stornoId} a eșuat:`, error);
      }
    });
    return NextResponse.json({ id: stornoId, eFactura: { status: "PENDING" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Factura nu a putut fi stornată." }, { status: 400 });
  }
}

export const POST = accountingApi(POSTHandler);
