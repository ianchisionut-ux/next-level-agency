CREATE TABLE IF NOT EXISTS nextlevel_mailbox_archive_threads (
  inbox_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (inbox_id,thread_id)
);
ALTER TABLE nextlevel_mailbox_archive_threads ADD COLUMN IF NOT EXISTS summary_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS nextlevel_mailbox_archive_emails (
  inbox_id TEXT NOT NULL,
  email_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  encrypted_payload TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  received_at TIMESTAMPTZ NOT NULL,
  body_sha256 TEXT NOT NULL,
  attachments_complete BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (inbox_id,email_id)
);
CREATE INDEX IF NOT EXISTS nextlevel_mailbox_archive_thread_emails ON nextlevel_mailbox_archive_emails(inbox_id,thread_id,received_at,email_id);
CREATE TABLE IF NOT EXISTS nextlevel_mailbox_archive_attachments (
  inbox_id TEXT NOT NULL,
  email_id TEXT NOT NULL,
  attachment_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  content_id TEXT,
  content_disposition TEXT,
  byte_size INTEGER NOT NULL CHECK (byte_size>=0 AND byte_size<=41943040),
  content BYTEA NOT NULL,
  sha256 TEXT NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (inbox_id,email_id,attachment_id),
  FOREIGN KEY (inbox_id,email_id) REFERENCES nextlevel_mailbox_archive_emails(inbox_id,email_id) ON DELETE CASCADE,
  CHECK (octet_length(content)>0)
);
CREATE TABLE IF NOT EXISTS nextlevel_mailbox_archive_jobs (
  inbox_id TEXT NOT NULL,
  email_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','DONE')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_until TIMESTAMPTZ,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (inbox_id,email_id)
);
CREATE INDEX IF NOT EXISTS nextlevel_mailbox_archive_jobs_due ON nextlevel_mailbox_archive_jobs(next_attempt_at,created_at) WHERE status<>'DONE';
CREATE TABLE IF NOT EXISTS nextlevel_mailbox_webhook_events (
  event_id TEXT PRIMARY KEY,
  payload_sha256 TEXT NOT NULL,
  event_type TEXT NOT NULL,
  inbox_id TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS nextlevel_mailbox_archive_scans (
  inbox_id TEXT NOT NULL,
  folder TEXT NOT NULL CHECK (folder IN ('inbox','sent','archive')),
  after_cursor TEXT,
  next_cursor TEXT,
  thread_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(thread_ids)='array'),
  email_cursor TEXT,
  completed_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision>=0),
  lease_token UUID,
  lease_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (inbox_id,folder),
  CHECK (jsonb_array_length(thread_ids)>0 OR email_cursor IS NULL)
);
