import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/session";

const VALID_DIRECTIONS = new Set(["INCOMING", "OUTGOING", "INTERNAL"]);

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Neautentificat" }, { status: 401 }) };
  if (!(await isSuperAdmin(user.userId))) {
    return { error: NextResponse.json({ error: "Acces interzis" }, { status: 403 }) };
  }
  return { user };
}

function requiredText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) throw new Error(label + " este obligatoriu.");
  if (value.trim().length > maxLength) throw new Error(label + " este prea lung.");
  return value.trim();
}

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value.trim().length > maxLength) throw new Error("Un câmp este prea lung.");
  return value.trim();
}

function parseDate(value: unknown, required: boolean) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (required) throw new Error("Data de înregistrare este obligatorie.");
    return null;
  }
  const date = new Date(value + "T12:00:00.000Z");
  if (Number.isNaN(date.getTime())) throw new Error("Data nu este validă.");
  return date;
}

function serialize(document: {
  id: string;
  registrationNumber: number;
  registrationDate: Date;
  direction: string;
  documentType: string;
  documentNumber: string | null;
  documentDate: Date | null;
  partnerName: string;
  subject: string;
  notes: string | null;
  isCancelled: boolean;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...document,
    registrationDate: document.registrationDate.toISOString(),
    documentDate: document.documentDate?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireSuperAdmin();
  if (check.error) return check.error;
  const { id } = await params;

  try {
    const body = await req.json();
    if (typeof body.isCancelled === "boolean" && Object.keys(body).length === 1) {
      const document = await prisma.companyDocument.update({
        where: { id },
        data: { isCancelled: body.isCancelled },
      });
      return NextResponse.json({ document: serialize(document) });
    }

    if (!VALID_DIRECTIONS.has(body.direction)) {
      return NextResponse.json({ error: "Sensul documentului nu este valid." }, { status: 400 });
    }

    const document = await prisma.companyDocument.update({
      where: { id },
      data: {
        registrationDate: parseDate(body.registrationDate, true)!,
        direction: body.direction,
        documentType: requiredText(body.documentType, "Tipul actului", 120),
        documentNumber: optionalText(body.documentNumber, 100),
        documentDate: parseDate(body.documentDate, false),
        partnerName: requiredText(body.partnerName, "Expeditorul / destinatarul", 200),
        subject: requiredText(body.subject, "Obiectul documentului", 2000),
        notes: optionalText(body.notes, 4000),
      },
    });

    return NextResponse.json({ document: serialize(document) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut actualiza actul.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireSuperAdmin();
  if (check.error) return check.error;
  const { id } = await params;

  try {
    await prisma.companyDocument.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Înregistrarea nu există sau nu a putut fi ștearsă." }, { status: 404 });
  }
}
