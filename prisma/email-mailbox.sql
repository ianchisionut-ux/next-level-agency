-- Mailbox metadata only. This migration does not touch invoicing ledgers or
-- store provider secrets. Draft bodies/attachments and signatures are encrypted.
CREATE TABLE IF NOT EXISTS nextlevel_mailbox_operations (
  id UUID PRIMARY KEY,
  mailbox TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('SEND','REPLY','FORWARD')),
  status TEXT NOT NULL CHECK (status IN ('RESERVED','SENT','UNCERTAIN','FAILED')),
  "draftId" TEXT,
  result JSONB,
  "errorCode" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nextlevel_mailbox_operations_status_idx ON nextlevel_mailbox_operations (mailbox,status,"createdAt");
CREATE TABLE IF NOT EXISTS nextlevel_mailbox_drafts (
  id UUID PRIMARY KEY, mailbox TEXT NOT NULL, payload TEXT NOT NULL, summary TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nextlevel_mailbox_drafts_mailbox_idx ON nextlevel_mailbox_drafts (mailbox,"updatedAt" DESC);
CREATE TABLE IF NOT EXISTS nextlevel_mailbox_preferences (
  mailbox TEXT PRIMARY KEY, signature TEXT NOT NULL, "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
