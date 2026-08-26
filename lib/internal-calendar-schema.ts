import { prisma } from "@/lib/prisma";

declare global {
  var __internalCalendarSchemaReady: Promise<void> | undefined;
}

async function createInternalCalendarSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "InternalCalendarItem" (
      "id" TEXT NOT NULL,
      "workspaceId" TEXT NOT NULL,
      "authorId" TEXT NOT NULL,
      "assigneeId" TEXT,
      "title" TEXT NOT NULL,
      "notes" TEXT,
      "type" TEXT NOT NULL DEFAULT 'NOTE',
      "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
      "status" TEXT NOT NULL DEFAULT 'TODO',
      "startAt" TIMESTAMP(3) NOT NULL,
      "endAt" TIMESTAMP(3),
      "allDay" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "InternalCalendarItem_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "InternalCalendarItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "InternalCalendarItem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "InternalCalendarItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InternalCalendarItem_workspaceId_startAt_idx" ON "InternalCalendarItem"("workspaceId", "startAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InternalCalendarItem_assigneeId_status_idx" ON "InternalCalendarItem"("assigneeId", "status")`);
}

export async function ensureInternalCalendarSchema() {
  if (!global.__internalCalendarSchemaReady) {
    global.__internalCalendarSchemaReady = createInternalCalendarSchema().catch((error) => {
      global.__internalCalendarSchemaReady = undefined;
      throw error;
    });
  }
  await global.__internalCalendarSchemaReady;
}