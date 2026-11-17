import { ready } from "./db";

/**
 * Aggregate diagnostics only. After the application's normal schema readiness
 * check, this executes one SELECT, with one consistent PostgreSQL snapshot.
 * Never return documents, parties, invoice identifiers, amounts or credentials.
 */
export async function getAccountingHealth() {
  const pool = await ready();
  const { rows } = await pool.query(`
    WITH expected_numeric(table_name,column_name) AS (VALUES
      ('products','price'),('products','cost'),('products','vatRate'),
      ('invoices','paidAmount'),('invoices','subtotal'),('invoices','vatTotal'),
      ('invoices','total'),('invoices','discountPercent'),('invoices','exchangeRate'),
      ('invoice_items','qty'),('invoice_items','unitPrice'),('invoice_items','vatRate'),
      ('invoice_items','valoare'),('invoice_items','vatValue'),
      ('payments','amount'),('receipts','amount')
    ), expected_constraints(table_name,constraint_name) AS (VALUES
      ('invoices','invoices_financial_invariants'),
      ('invoice_items','invoice_items_financial_bounds'),
      ('payments','payments_financial_bounds'),
      ('receipts','receipts_financial_bounds')
    ), expected_indexes(table_name,index_name,column_name) AS (VALUES
      ('invoices','invoices_issuance_key','issuanceKey'),
      ('payments','payments_operation_key','operationKey'),
      ('receipts','receipts_operation_key','operationKey')
    ), schema_state AS (
      SELECT
        COALESCE((SELECT version FROM accounting_schema_meta WHERE id=1),0)::int AS version,
        (SELECT COUNT(*)::int FROM expected_numeric e
          JOIN information_schema.columns c ON c.table_schema='public'
            AND c.table_name=e.table_name AND c.column_name=e.column_name
          WHERE c.data_type='numeric') AS "numericColumns",
        (SELECT COUNT(*)::int FROM expected_constraints e
          JOIN pg_namespace n ON n.nspname='public'
          JOIN pg_class t ON t.relnamespace=n.oid AND t.relname=e.table_name
          JOIN pg_constraint c ON c.conrelid=t.oid AND c.conname=e.constraint_name
          WHERE c.contype='c') AS "checkConstraints",
        (SELECT COUNT(*)::int FROM expected_indexes e
          JOIN pg_namespace n ON n.nspname='public'
          JOIN pg_class t ON t.relnamespace=n.oid AND t.relname=e.table_name
          JOIN pg_class ix ON ix.relnamespace=n.oid AND ix.relname=e.index_name
          JOIN pg_index i ON i.indrelid=t.oid AND i.indexrelid=ix.oid
          JOIN pg_attribute a ON a.attrelid=t.oid AND a.attname=e.column_name
          WHERE i.indisunique AND i.indisvalid AND i.indisready
            AND i.indnkeyatts=1 AND i.indkey[0]=a.attnum
            AND (i.indpred IS NULL OR pg_get_expr(i.indpred,i.indrelid)='(' || quote_ident(e.column_name) || ' IS NOT NULL)')) AS "uniqueValidIndexes"
    ), line_totals AS (
      SELECT "invoiceId", COUNT(*) AS "lineCount", SUM(valoare::numeric) AS base,
        SUM("vatValue"::numeric) AS tax,
        BOOL_OR(NOT (qty::numeric>0 AND qty::numeric<=1000000000)
          OR qty::numeric<>round(qty::numeric,6)
          OR NOT ("unitPrice"::numeric BETWEEN -1000000000 AND 1000000000)
          OR "unitPrice"::numeric<>round("unitPrice"::numeric,9)
          OR NOT ("vatRate"::numeric BETWEEN 0 AND 100)
          OR "vatRate"::numeric<>round("vatRate"::numeric,4)
          OR NOT (valoare::numeric BETWEEN -999999999999.99 AND 999999999999.99)
          OR NOT ("vatValue"::numeric BETWEEN -999999999999.99 AND 999999999999.99)
          OR valoare::numeric<>round(valoare::numeric,2)
          OR "vatValue"::numeric<>round("vatValue"::numeric,2)) AS invalid,
        BOOL_OR("unitPrice"::numeric<0 OR valoare::numeric<0 OR "vatValue"::numeric<0) AS "negativeLine",
        BOOL_OR("unitPrice"::numeric>0 OR valoare::numeric>0 OR "vatValue"::numeric>0) AS "positiveLine"
      FROM invoice_items GROUP BY "invoiceId"
    ), payment_totals AS (
      SELECT "invoiceId", SUM(amount::numeric) AS paid,
        BOOL_OR(amount::numeric=0 OR NOT (amount::numeric BETWEEN -999999999999.99 AND 999999999999.99)
          OR amount::numeric<>round(amount::numeric,2)) AS invalid
      FROM payments GROUP BY "invoiceId"
    ), receipt_values AS (
      SELECT "invoiceId", BOOL_OR(NOT (amount::numeric>0 AND amount::numeric<=999999999999.99)
        OR amount::numeric<>round(amount::numeric,2)) AS invalid
      FROM receipts GROUP BY "invoiceId"
    ), vat_groups AS (
      SELECT "invoiceId",
        COALESCE(NULLIF(upper(btrim("vatCategoryCode")),''),CASE WHEN "vatRate"::numeric=0 THEN 'Z' ELSE 'S' END) AS category,
        "vatRate"::numeric AS rate, SUM(valoare::numeric) AS base,
        SUM("vatValue"::numeric) AS tax
      FROM invoice_items GROUP BY "invoiceId",2,3
    ), vat_errors AS (
      SELECT "invoiceId", BOOL_OR(category NOT IN ('S','Z','E','AE','K','G','O')
        OR (category='S' AND rate<=0) OR (category<>'S' AND rate<>0)
        OR tax IS DISTINCT FROM round(base*rate/100,2))
        OR (BOOL_OR(category='O') AND BOOL_OR(category<>'O')) AS invalid
      FROM vat_groups GROUP BY "invoiceId"
    ), invoice_flags AS (
      SELECT i.id,
        (i.subtotal::numeric IS DISTINCT FROM COALESCE(l.base,0)
          OR i."vatTotal"::numeric IS DISTINCT FROM COALESCE(l.tax,0)) AS "lineTotalsMismatch",
        (i.total::numeric IS DISTINCT FROM i.subtotal::numeric+i."vatTotal"::numeric) AS "headerTotalsMismatch",
        (i."paidAmount"::numeric IS DISTINCT FROM COALESCE(p.paid,0)) AS "paymentBalanceMismatch",
        COALESCE(v.invalid,false) AS "vatCategoryMismatch",
        (i."invoiceType" NOT IN ('STANDARD','STORNO')
          OR i.status NOT IN ('issued','partial','paid','storno','stornoed','canceled')
          OR i."invoiceTypeCode" IS DISTINCT FROM CASE WHEN i."invoiceType"='STORNO' THEN '381' ELSE '380' END
          OR NOT (i.subtotal::numeric BETWEEN -999999999999.99 AND 999999999999.99)
          OR NOT (i."vatTotal"::numeric BETWEEN -999999999999.99 AND 999999999999.99)
          OR NOT (i.total::numeric BETWEEN -999999999999.99 AND 999999999999.99)
          OR i.subtotal::numeric<>round(i.subtotal::numeric,2)
          OR i."vatTotal"::numeric<>round(i."vatTotal"::numeric,2)
          OR i.total::numeric<>round(i.total::numeric,2)
          OR NOT (i."paidAmount"::numeric BETWEEN 0 AND abs(i.total::numeric))
          OR i."paidAmount"::numeric<>round(i."paidAmount"::numeric,2)
          OR NOT (i."discountPercent"::numeric BETWEEN 0 AND 100)
          OR NOT (i."exchangeRate"::numeric>0 AND i."exchangeRate"::numeric<1000000)
          OR i."exchangeRate"::numeric<>round(i."exchangeRate"::numeric,9)
          OR (i.currency='RON' AND i."exchangeRate"::numeric<>1)
          OR COALESCE(l."lineCount",0) NOT BETWEEN 1 AND 1000
          OR COALESCE(l.invalid,false) OR COALESCE(p.invalid,false) OR COALESCE(r.invalid,false)
          OR CASE WHEN i."invoiceType"='STORNO'
            THEN i.total::numeric>=0 OR i."paidAmount"::numeric<>0 OR COALESCE(l."positiveLine",false)
            ELSE i.total::numeric<=0 OR COALESCE(l."negativeLine",false) END) AS "invalidStoredValues"
      FROM invoices i LEFT JOIN line_totals l ON l."invoiceId"=i.id
      LEFT JOIN payment_totals p ON p."invoiceId"=i.id
      LEFT JOIN receipt_values r ON r."invoiceId"=i.id
      LEFT JOIN vat_errors v ON v."invoiceId"=i.id
    ), financial_summary AS (
      SELECT COUNT(*) FILTER (WHERE "lineTotalsMismatch" OR "headerTotalsMismatch"
          OR "paymentBalanceMismatch" OR "vatCategoryMismatch" OR "invalidStoredValues") AS "invoicesWithErrors",
        COUNT(*) FILTER (WHERE "lineTotalsMismatch") AS "lineTotalsMismatches",
        COUNT(*) FILTER (WHERE "headerTotalsMismatch") AS "headerTotalsMismatches",
        COUNT(*) FILTER (WHERE "paymentBalanceMismatch") AS "paymentBalanceMismatches",
        COUNT(*) FILTER (WHERE "vatCategoryMismatch") AS "vatCategoryMismatches",
        COUNT(*) FILTER (WHERE "invalidStoredValues") AS "invalidStoredValues"
      FROM invoice_flags
    )
    SELECT s.*, f.*,
      (SELECT COUNT(*) FROM invoices) AS invoices,
      (SELECT COUNT(*) FROM invoice_items) AS items,
      (SELECT COUNT(*) FROM payments) AS payments,
      (SELECT COUNT(*) FROM receipts) AS receipts,
      (SELECT COUNT(*) FROM invoice_items x WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id=x."invoiceId")) AS "orphanItems",
      (SELECT COUNT(*) FROM payments x WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id=x."invoiceId")) AS "orphanPayments",
      (SELECT COUNT(*) FROM receipts x WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id=x."invoiceId")) AS "orphanReceipts"
    FROM schema_state s CROSS JOIN financial_summary f
  `);
  const row = rows[0];
  const count = (key: string): number => {
    const value = Number(row?.[key]);
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("Accounting diagnostics could not be completed.");
    return value;
  };
  const schema = {
    version: count("version"), numericColumns: count("numericColumns"), requiredNumericColumns: 16,
    checkConstraints: count("checkConstraints"), requiredCheckConstraints: 4,
    uniqueValidIndexes: count("uniqueValidIndexes"), requiredUniqueValidIndexes: 3,
  };
  const counts = { invoices: count("invoices"), items: count("items"), payments: count("payments"), receipts: count("receipts") };
  const financial = {
    invoicesWithErrors: count("invoicesWithErrors"), lineTotalsMismatches: count("lineTotalsMismatches"),
    headerTotalsMismatches: count("headerTotalsMismatches"), paymentBalanceMismatches: count("paymentBalanceMismatches"),
    vatCategoryMismatches: count("vatCategoryMismatches"), invalidStoredValues: count("invalidStoredValues"),
    orphanItems: count("orphanItems"), orphanPayments: count("orphanPayments"), orphanReceipts: count("orphanReceipts"),
  };
  return {
    ok: schema.version === 13 && schema.numericColumns === 16 && schema.checkConstraints === 4
      && schema.uniqueValidIndexes === 3 && Object.values(financial).every(value => value === 0),
    environment: process.env.ANAF_ENVIRONMENT === "production" ? "production" : "test",
    schema, counts, financial,
  };
}
