import { NextResponse } from "next/server";
import { accountingApi } from "@/lib/accounting/access";
import { getInvoiceFull } from "@/lib/accounting/repo";
import { anafTransmissionDeadline, getAnafConnectionStatus, validateEFactura, latestSubmission } from "@/lib/accounting/efactura";

async function GETHandler(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await getInvoiceFull(Number(id));
  if (!full?.client) return NextResponse.json({ error: "Factura nu există." }, { status: 404 });
  // This endpoint performs local validation and database reads only. It must
  // never refresh tokens, call the external validator, or send an invoice.
  const errors = validateEFactura(full);
  const [connection, submission] = await Promise.all([getAnafConnectionStatus(), latestSubmission(Number(id))]);
  let deadline: string | null = null;
  try { deadline = anafTransmissionDeadline(full.invoice.issueDate); } catch {}
  return NextResponse.json({
    valid: errors.length === 0, errors, environment: connection.environment,
    autoEfactura: Boolean(full.invoice.autoEfactura), submission, deadline,
    connection: { configured: connection.configured, connected: connection.connected, canAttempt: connection.canAttempt, needsReconnect: connection.needsReconnect, tokenStatus: connection.tokenStatus },
  });
}
export const GET = accountingApi(GETHandler);
