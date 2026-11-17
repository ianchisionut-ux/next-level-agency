import { accountingApi } from '@/lib/accounting/access'
import { NextRequest, NextResponse } from "next/server";
import { addPayment, getInvoiceFull } from "@/lib/accounting/repo";
import { publicOperationKey } from "@/lib/accounting/invoice-input";

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await req.json();
    if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.amount !== "number" || !Number.isFinite(data.amount) || typeof data.date !== "string" || typeof data.method !== "string" || data.method.length > 30 || (data.notes !== undefined && (typeof data.notes !== "string" || data.notes.length > 2000)) || (data.refund !== undefined && typeof data.refund !== "boolean")) throw new Error("Date de încasare invalide.");
    const operationKey = publicOperationKey(data);
    await addPayment(
      Number(id),
      Number(data.amount),
      data.date,
      data.method ?? "numerar",
      data.notes ?? "",
      data.refund === true,
      operationKey,
    );
    return NextResponse.json(await getInvoiceFull(Number(id)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Plata nu a putut fi înregistrată." }, { status: 400 });
  }
}

export const POST = accountingApi(POSTHandler)
