import { NextRequest, NextResponse } from "next/server";
import { accountingApi } from "@/lib/accounting/access";
import { AnafLookupError, lookupAnafCompany } from "@/lib/accounting/anaf-company";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

async function GETHandler(req: NextRequest) {
  const limit = checkRateLimit({
    key: `${getClientIp(req)}:accounting-anaf-company`,
    limit: 6,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Prea multe căutări ANAF. Așteaptă un minut și încearcă din nou." },
      { status: 429 },
    );
  }
  try {
    return NextResponse.json({
      source: "ANAF",
      company: await lookupAnafCompany(req.nextUrl.searchParams.get("cui") || ""),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Căutarea ANAF a eșuat." },
      { status: error instanceof AnafLookupError ? error.status : 503 },
    );
  }
}

export const GET = accountingApi(GETHandler);
