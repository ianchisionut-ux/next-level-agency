import { accountingApi } from '@/lib/accounting/access'
import { NextRequest, NextResponse } from "next/server";
import { createReceipt, getInvoice, getInvoiceFull } from "@/lib/accounting/repo";
import { bucharestDate } from "@/lib/accounting/date";
import { publicOperationKey } from "@/lib/accounting/invoice-input";

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await req.json();
    if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.amount !== "number" || !Number.isFinite(data.amount) || (data.issueDate !== undefined && typeof data.issueDate !== "string") || (data.cashier !== undefined && (typeof data.cashier !== "string" || data.cashier.length > 200))) throw new Error("Date de chitanță invalide.");
    const operationKey = publicOperationKey(data);
    const invoice = await getInvoice(Number(id));
    if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });
    const amount = Number(data.amount ?? invoice.total);
    const issueDate = data.issueDate ?? bucharestDate();
    await createReceipt(Number(id), issueDate, amount, data.cashier ?? "", operationKey);
    return NextResponse.json(await getInvoiceFull(Number(id)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chitanța nu a putut fi emisă." }, { status: 400 });
  }
}

export const POST = accountingApi(POSTHandler)
