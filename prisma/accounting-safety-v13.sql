-- Transactional storage upgrade: retain issued decimal values, never recompute invoices.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "issuanceKey" TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "issuanceHash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_issuance_key ON invoices ("issuanceKey") WHERE "issuanceKey" IS NOT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "operationKey" TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "operationHash" TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS "operationKey" TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS "operationHash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS payments_operation_key ON payments ("operationKey") WHERE "operationKey" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS receipts_operation_key ON receipts ("operationKey") WHERE "operationKey" IS NOT NULL;

DO $$
DECLARE spec record; col text;
BEGIN
  FOR spec IN SELECT * FROM (VALUES
    ('products', ARRAY['price','cost','vatRate']),
    ('invoices', ARRAY['paidAmount','subtotal','vatTotal','total','discountPercent','exchangeRate']),
    ('invoice_items', ARRAY['qty','unitPrice','vatRate','valoare','vatValue']),
    ('payments', ARRAY['amount']),
    ('receipts', ARRAY['amount'])
  ) AS specs(tab, cols)
  LOOP
    FOREACH col IN ARRAY spec.cols LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=spec.tab AND column_name=col AND data_type='double precision') THEN
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE NUMERIC USING %I::text::numeric', spec.tab, col, col);
      END IF;
    END LOOP;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invoices_financial_invariants') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_financial_invariants CHECK (
      "invoiceType" IN ('STANDARD','STORNO') AND status IN ('issued','partial','paid','storno','stornoed','canceled')
      AND subtotal BETWEEN -999999999999.99 AND 999999999999.99
      AND "vatTotal" BETWEEN -999999999999.99 AND 999999999999.99
      AND total BETWEEN -999999999999.99 AND 999999999999.99
      AND total = subtotal + "vatTotal"
      AND subtotal=round(subtotal,2) AND "vatTotal"=round("vatTotal",2) AND total=round(total,2)
      AND "paidAmount" BETWEEN 0 AND abs(total) AND "paidAmount"=round("paidAmount",2)
      AND "discountPercent" BETWEEN 0 AND 100 AND "exchangeRate">0 AND "exchangeRate"<1000000
    ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invoice_items_financial_bounds') THEN
    ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_financial_bounds CHECK (
      qty>0 AND qty<=1000000000 AND "unitPrice" BETWEEN -1000000000 AND 1000000000
      AND "vatRate" BETWEEN 0 AND 100
      AND valoare BETWEEN -999999999999.99 AND 999999999999.99
      AND "vatValue" BETWEEN -999999999999.99 AND 999999999999.99
      AND valoare=round(valoare,2) AND "vatValue"=round("vatValue",2)
    ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='payments_financial_bounds') THEN
    ALTER TABLE payments ADD CONSTRAINT payments_financial_bounds CHECK (amount<>0 AND amount BETWEEN -999999999999.99 AND 999999999999.99 AND amount=round(amount,2)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='receipts_financial_bounds') THEN
    ALTER TABLE receipts ADD CONSTRAINT receipts_financial_bounds CHECK (amount>0 AND amount<=999999999999.99 AND amount=round(amount,2)) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS accounting_audit_events (
  id BIGSERIAL PRIMARY KEY,
  "eventType" TEXT NOT NULL,
  "invoiceId" INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounting_audit_invoice_idx ON accounting_audit_events ("invoiceId", id DESC);
CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx ON invoice_items ("invoiceId");
CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments ("invoiceId");
CREATE INDEX IF NOT EXISTS receipts_invoice_idx ON receipts ("invoiceId");
CREATE INDEX IF NOT EXISTS invoices_queue_idx ON invoices ("anafApprovedEnvironment", "anafSendAfter", id) WHERE "autoEfactura"=1;
CREATE INDEX IF NOT EXISTS invoices_issue_date_idx ON invoices ("issueDate" DESC,id DESC);

ALTER TABLE efactura_submissions ADD COLUMN IF NOT EXISTS "archiveZip" BYTEA;
ALTER TABLE efactura_submissions ADD COLUMN IF NOT EXISTS "archiveSha256" TEXT;
ALTER TABLE efactura_submissions ADD COLUMN IF NOT EXISTS "archiveDownloadedAt" TIMESTAMPTZ;
ALTER TABLE efactura_submissions ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMPTZ;
ALTER TABLE efactura_messages ADD COLUMN IF NOT EXISTS "archiveZip" BYTEA;
ALTER TABLE efactura_messages ADD COLUMN IF NOT EXISTS "archiveSha256" TEXT;
ALTER TABLE efactura_messages ADD COLUMN IF NOT EXISTS "archiveDownloadedAt" TIMESTAMPTZ;
ALTER TABLE efactura_automation_state ADD COLUMN IF NOT EXISTS pending INTEGER NOT NULL DEFAULT 0;
ALTER TABLE efactura_automation_state ADD COLUMN IF NOT EXISTS blocked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE efactura_automation_state ADD COLUMN IF NOT EXISTS overdue INTEGER NOT NULL DEFAULT 0;
ALTER TABLE efactura_automation_state ADD COLUMN IF NOT EXISTS "oldestIssueDate" TEXT;
ALTER TABLE efactura_automation_state ADD COLUMN IF NOT EXISTS "earliestDueDate" TEXT;
