import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { MAILBOX_ADDRESS, MailboxError } from "./config";

declare global { var __nextlevelMailboxSchema: Promise<void> | undefined; }

type SendResult = { id: string; threadId: string | null; accepted: true; operationKey: string; sourceDraftId?: string };
type Operation = { id: string; requestHash: string; status: string; draftId: string | null; result: SendResult | null };

export async function mailboxSchema() {
  if (!globalThis.__nextlevelMailboxSchema) {
    globalThis.__nextlevelMailboxSchema = prisma.$transaction(async transaction => {
      await transaction.$executeRawUnsafe("SELECT pg_advisory_xact_lock(74000,1)");
      const sql = await readFile(path.join(process.cwd(), "prisma", "email-mailbox.sql"), "utf8");
      for (const statement of sql.split(";").map(value => value.trim()).filter(Boolean)) await transaction.$executeRawUnsafe(statement);
    }).catch(error => { globalThis.__nextlevelMailboxSchema = undefined; throw error; });
  }
  return globalThis.__nextlevelMailboxSchema;
}

export function requestHash(input: unknown) { return createHash("sha256").update(JSON.stringify(input)).digest("hex"); }

export async function reserveOperation(id: string, hash: string, kind: "SEND" | "REPLY" | "FORWARD") {
  await mailboxSchema();
  return prisma.$transaction(async transaction => {
    await transaction.$executeRawUnsafe("SELECT pg_advisory_xact_lock(74001,hashtext($1))", id);
    const rows = await transaction.$queryRawUnsafe<Operation[]>(`SELECT id,"requestHash",status,"draftId",result FROM nextlevel_mailbox_operations WHERE id=$1::uuid AND mailbox=$2 FOR UPDATE`, id, MAILBOX_ADDRESS);
    const existing = rows[0];
    if (existing) {
      if (existing.requestHash !== hash) throw new MailboxError("Această cheie a fost deja folosită pentru alt mesaj. Creează o nouă operațiune după verificarea mesajului.", 409, "IDEMPOTENCY_CONFLICT");
      if (existing.status === "SENT" && existing.result) return { result: existing.result, draftId: existing.draftId };
      if (["RESERVED", "UNCERTAIN"].includes(existing.status)) throw new MailboxError("Rezultatul acestei operațiuni este în curs sau necunoscut. Verifică mesajele trimise înainte de a crea o nouă trimitere; reîncercarea este blocată pentru a preveni duplicatele.", 409, "SEND_REQUIRES_REVIEW");
      await transaction.$executeRawUnsafe(`UPDATE nextlevel_mailbox_operations SET status='RESERVED',"errorCode"=NULL,"updatedAt"=now() WHERE id=$1::uuid`, id);
      return { result: null, draftId: existing.draftId };
    }
    await transaction.$executeRawUnsafe(`INSERT INTO nextlevel_mailbox_operations(id,mailbox,"requestHash",kind,status) VALUES ($1::uuid,$2,$3,$4,'RESERVED')`, id, MAILBOX_ADDRESS, hash, kind);
    return { result: null, draftId: null };
  });
}

export async function completedOperation(id: string) {
  await mailboxSchema();
  const rows = await prisma.$queryRawUnsafe<Array<{ result: SendResult | null }>>(`SELECT result FROM nextlevel_mailbox_operations WHERE id=$1::uuid AND mailbox=$2 AND status='SENT'`, id, MAILBOX_ADDRESS);
  return rows[0]?.result || null;
}

export async function rememberDraft(id: string, draftId: string) {
  await prisma.$executeRawUnsafe(`UPDATE nextlevel_mailbox_operations SET "draftId"=$2,"updatedAt"=now() WHERE id=$1::uuid AND mailbox=$3`, id, draftId, MAILBOX_ADDRESS);
}

export async function completeOperation(id: string, result: SendResult) {
  await prisma.$executeRawUnsafe(`UPDATE nextlevel_mailbox_operations SET status='SENT',result=$2::jsonb,"updatedAt"=now() WHERE id=$1::uuid AND mailbox=$3`, id, JSON.stringify(result), MAILBOX_ADDRESS);
}

export async function failOperation(id: string, uncertain: boolean, code: string) {
  await prisma.$executeRawUnsafe(`UPDATE nextlevel_mailbox_operations SET status=$2,"errorCode"=$3,"updatedAt"=now() WHERE id=$1::uuid AND mailbox=$4`, id, uncertain ? "UNCERTAIN" : "FAILED", code, MAILBOX_ADDRESS);
}
