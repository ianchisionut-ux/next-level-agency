import { NextResponse } from "next/server";
import { accountingApi } from "@/lib/accounting/access";
import { getAccountingHealth } from "@/lib/accounting/health";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" };

export const GET = accountingApi(async () => {
  try {
    const health = await getAccountingHealth();
    return NextResponse.json(health, { status: health.ok ? 200 : 503, headers });
  } catch {
    // A database error may contain private configuration or stored values.
    // Return no exception detail and perform no external requests or recovery.
    return NextResponse.json({ ok: false }, { status: 503, headers });
  }
});
