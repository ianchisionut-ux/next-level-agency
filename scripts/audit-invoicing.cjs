// Regression gate for the findings documented in audit-facturare-2026-11-17.txt.
// Every child suite uses mocked I/O or in-memory PostgreSQL, never production.
const { spawnSync } = require('node:child_process');
const suites = [
  'test-accounting-money.cjs',
  'test-invoicing-api-input.cjs',
  'test-accounting-ui-operations.cjs',
  'test-declaration-money.cjs',
  'test-invoicing-core.cjs',
  'test-invoicing-repository.cjs',
  'test-accounting-xml.cjs',
  'test-anaf-workflow.cjs',
  'test-anaf-safety.cjs',
  'test-accounting-postgres.cjs',
];
for (const suite of suites) {
  const result = spawnSync(process.execPath, [`scripts/${suite}`], { stdio: 'inherit', timeout: 90_000 });
  if (result.error) console.error(result.error.message);
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
console.log(`Accounting release gate passed: ${suites.length} isolated regression suites. No live invoices or ANAF uploads.`);
