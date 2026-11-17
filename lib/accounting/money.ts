/**
 * Exact decimal arithmetic for invoices. Numbers are interpreted as their
 * decimal String(value), never multiplied as binary floating-point values.
 * Monetary results use cents and round halves away from zero, including storno.
 * Keep this module dependency-free: the same calculator runs in the form and API.
 */
export type DecimalInput = number | string;

type Decimal = { numerator: bigint; denominator: bigint; scale: number };
export const MAX_MONEY = 999_999_999_999.99;
export const MAX_INVOICE_ITEMS = 1000;
const MAX_CENTS = 99_999_999_999_999n;
const TAX_CATEGORIES = new Set(["S", "Z", "E", "AE", "K", "G", "O"]);

function absolute(value: bigint) { return value < 0n ? -value : value; }
function power10(exponent: number) { return 10n ** BigInt(exponent); }

function decimal(value: DecimalInput, label = "Valoarea"): Decimal {
  if ((typeof value !== "number" && typeof value !== "string") ||
      (typeof value === "number" && !Number.isFinite(value))) {
    throw new Error(`${label} trebuie să fie un număr finit.`);
  }
  const source = String(value).trim();
  if (!source || source.length > 128) throw new Error(`${label} nu este validă.`);
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(source);
  if (!match) throw new Error(`${label} nu este validă.`);
  const exponent = Number(match[4] || 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 100) {
    throw new Error(`${label} depășește precizia acceptată.`);
  }
  let scale = (match[3] || "").length - exponent;
  let numerator = BigInt(match[2] + (match[3] || ""));
  if (scale < 0) { numerator *= power10(-scale); scale = 0; }
  while (scale > 0 && numerator % 10n === 0n) { numerator /= 10n; scale--; }
  if (match[1] === "-") numerator = -numerator;
  return { numerator, denominator: power10(scale), scale };
}

function divideRounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error("Împărțirea la zero nu este permisă.");
  if (denominator < 0n) { numerator = -numerator; denominator = -denominator; }
  const sign = numerator < 0n ? -1n : 1n;
  const magnitude = absolute(numerator);
  const quotient = magnitude / denominator;
  return sign * (quotient + ((magnitude % denominator) * 2n >= denominator ? 1n : 0n));
}

function checkedCents(cents: bigint): bigint {
  if (absolute(cents) > MAX_CENTS) throw new Error("Suma depășește limita de 999.999.999.999,99.");
  return cents;
}

function fromCents(cents: bigint): number {
  checkedCents(cents);
  // MAX_CENTS is below Number.MAX_SAFE_INTEGER. Conversion is only at the API
  // boundary; subsequent arithmetic must return through the decimal helpers.
  const result = Number(cents) / 100;
  return Object.is(result, -0) ? 0 : result;
}

function toCents(value: DecimalInput): bigint {
  const amount = decimal(value);
  return checkedCents(divideRounded(amount.numerator * 100n, amount.denominator));
}

export function roundMoney(value: DecimalInput): number { return fromCents(toCents(value)); }

export function addMoney(...values: DecimalInput[]): number {
  return fromCents(values.reduce((sum, value) => sum + toCents(value), 0n));
}

export function subtractMoney(left: DecimalInput, right: DecimalInput): number {
  return fromCents(toCents(left) - toCents(right));
}

/** Exact amount × numerator / denominator, rounded once to cents. */
export function prorateMoney(amount: DecimalInput, numerator: DecimalInput, denominator: DecimalInput): number {
  const a = decimal(amount), n = decimal(numerator), d = decimal(denominator);
  return fromCents(divideRounded(a.numerator * n.numerator * d.denominator * 100n,
    a.denominator * n.denominator * d.numerator));
}

export function convertMoney(amount: DecimalInput, exchangeRate: DecimalInput): number {
  const rate = boundedDecimal(exchangeRate, "Cursul de schimb", 1_000_000n, 9, true);
  const a = decimal(amount);
  return fromCents(divideRounded(a.numerator * rate.numerator * 100n,
    a.denominator * rate.denominator));
}

function boundedDecimal(value: DecimalInput, label: string, limit: bigint, precision: number, positive: boolean): Decimal {
  const parsed = decimal(value, label);
  if ((positive && parsed.numerator <= 0n) || absolute(parsed.numerator) > limit * parsed.denominator) {
    throw new Error(`${label} nu se încadrează în limitele acceptate.`);
  }
  if (parsed.scale > precision) throw new Error(`${label} acceptă maximum ${precision} zecimale.`);
  return parsed;
}

export type FinancialItemInput = {
  qty: DecimalInput;
  unitPrice: DecimalInput;
  vatRate: DecimalInput;
  vatCategoryCode?: string;
};

function fiscalGroup(item: FinancialItemInput) {
  const rate = boundedDecimal(item.vatRate, "Cota TVA", 100n, 4, false);
  if (rate.numerator < 0n) throw new Error("Cota TVA nu poate fi negativă.");
  const category = String(item.vatCategoryCode || (rate.numerator === 0n ? "Z" : "S")).trim().toUpperCase();
  if (!TAX_CATEGORIES.has(category)) throw new Error("Categoria TVA nu este acceptată.");
  if ((category === "S" && rate.numerator <= 0n) || (category !== "S" && rate.numerator !== 0n)) {
    throw new Error("Categoria TVA și cota selectată nu corespund.");
  }
  return { rate, category, key: `${category}|${rate.numerator}/${rate.denominator}` };
}

type VatGroup = { indexes: number[]; base: bigint; rate: Decimal };

export function calculateInvoiceTotals<T extends FinancialItemInput>(items: readonly T[], discountPercent: DecimalInput = 0) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_INVOICE_ITEMS) {
    throw new Error(`Factura trebuie să conțină între 1 și ${MAX_INVOICE_ITEMS} de poziții.`);
  }
  const discount = boundedDecimal(discountPercent, "Discountul", 100n, 6, false);
  if (discount.numerator < 0n) throw new Error("Discountul trebuie să fie între 0% și 100%.");
  const factorNumerator = 100n * discount.denominator - discount.numerator;
  const factorDenominator = 100n * discount.denominator;
  const bases: bigint[] = [];
  const taxes = items.map(() => 0n);
  const groups = new Map<string, VatGroup>();
  let direction = 0n;
  items.forEach((item, index) => {
    const qty = boundedDecimal(item.qty, `Poziția ${index + 1}: cantitatea`, 1_000_000_000n, 6, true);
    const price = boundedDecimal(item.unitPrice, `Poziția ${index + 1}: prețul`, 1_000_000_000n, 9, false);
    const sign = price.numerator < 0n ? -1n : price.numerator > 0n ? 1n : 0n;
    if (direction !== 0n && sign !== 0n && direction !== sign) {
      throw new Error("Pozițiile pozitive și negative nu pot fi amestecate în același document.");
    }
    if (sign !== 0n) direction = sign;
    const base = checkedCents(divideRounded(qty.numerator * price.numerator * factorNumerator * 100n,
      qty.denominator * price.denominator * factorDenominator));
    bases.push(base);
    const fiscal = fiscalGroup(item);
    const group = groups.get(fiscal.key) || { indexes: [], base: 0n, rate: fiscal.rate };
    group.indexes.push(index);
    group.base += base;
    checkedCents(group.base);
    groups.set(fiscal.key, group);
  });

  for (const group of groups.values()) {
    const sign = group.base < 0n ? -1n : 1n;
    const divisor = group.rate.denominator * 100n;
    const target = divideRounded(absolute(group.base) * group.rate.numerator, divisor);
    const portions = group.indexes.map(index => {
      const numerator = absolute(bases[index]) * group.rate.numerator;
      return { index, cents: numerator / divisor, remainder: numerator % divisor };
    });
    let remaining = target - portions.reduce((sum, portion) => sum + portion.cents, 0n);
    portions.sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
    for (const portion of portions) {
      const extra = remaining > 0n ? 1n : 0n;
      taxes[portion.index] = sign * (portion.cents + extra);
      remaining -= extra;
    }
    if (remaining !== 0n) throw new Error("Repartizarea TVA nu a putut fi încheiată.");
  }
  const subtotal = bases.reduce((sum, base) => sum + base, 0n);
  const vatTotal = taxes.reduce((sum, tax) => sum + tax, 0n);
  return {
    computed: items.map((item, index) => ({ ...item, valoare: fromCents(bases[index]), vatValue: fromCents(taxes[index]) })),
    subtotal: fromCents(subtotal),
    vatTotal: fromCents(vatTotal),
    total: fromCents(subtotal + vatTotal),
  };
}

type StoredItem = FinancialItemInput & { valoare: DecimalInput; vatValue: DecimalInput };
type StoredInvoice = {
  subtotal: DecimalInput; vatTotal: DecimalInput; total: DecimalInput;
  paidAmount?: DecimalInput; invoiceType?: string; invoiceTypeCode?: string;
};

/** Validate persisted values; never repair or recalculate issued documents. */
export function financialValidationErrors(full: { invoice: StoredInvoice; items: readonly StoredItem[] }): string[] {
  const errors: string[] = [];
  const { invoice, items } = full;
  const credit = invoice.invoiceType === "STORNO" || invoice.invoiceTypeCode === "381";
  const money = (value: DecimalInput, label: string): bigint | null => {
    try {
      const parsed = decimal(value, label);
      if ((parsed.numerator * 100n) % parsed.denominator !== 0n) {
        errors.push(`${label}: suma trebuie să aibă maximum două zecimale.`);
        return null;
      }
      return toCents(value);
    } catch (error) { errors.push(error instanceof Error ? `${label}: ${error.message}` : `${label}: valoare invalidă.`); return null; }
  };
  const subtotal = money(invoice.subtotal, "Subtotal");
  const vatTotal = money(invoice.vatTotal, "TVA total");
  const total = money(invoice.total, "Total");
  const paid = money(invoice.paidAmount ?? 0, "Suma achitată");
  if (!Array.isArray(items) || !items.length || items.length > MAX_INVOICE_ITEMS) {
    errors.push(`Factura trebuie să conțină între 1 și ${MAX_INVOICE_ITEMS} de poziții.`);
    return errors;
  }
  if (total !== null && (credit ? total >= 0n : total <= 0n)) errors.push("Semnul sau valoarea totalului nu corespunde tipului facturii.");
  if (paid !== null && total !== null && (paid < 0n || paid > absolute(total) || (credit && paid !== 0n))) errors.push("Suma achitată este în afara limitelor facturii.");
  let lineBase = 0n, lineTax = 0n, validLines = true;
  const groups = new Map<string, { base: bigint; tax: bigint; rate: Decimal }>();
  items.forEach((item, index) => {
    const label = `Poziția ${index + 1}`;
    const base = money(item.valoare, `${label}: valoare`);
    const tax = money(item.vatValue, `${label}: TVA`);
    try {
      boundedDecimal(item.qty, `${label}: cantitate`, 1_000_000_000n, 6, true);
      const price = boundedDecimal(item.unitPrice, `${label}: preț`, 1_000_000_000n, 9, false);
      if (credit ? price.numerator > 0n : price.numerator < 0n) errors.push(`${label}: semnul prețului nu corespunde documentului.`);
      const fiscal = fiscalGroup(item);
      if (base === null || tax === null) { validLines = false; return; }
      if (credit ? base > 0n || tax > 0n : base < 0n || tax < 0n) errors.push(`${label}: semnul valorilor nu corespunde documentului.`);
      const group = groups.get(fiscal.key) || { base: 0n, tax: 0n, rate: fiscal.rate };
      group.base += base; group.tax += tax;
      groups.set(fiscal.key, group);
      lineBase += base; lineTax += tax;
    } catch (error) { validLines = false; errors.push(error instanceof Error ? error.message : `${label}: valori invalide.`); }
  });
  if (validLines && subtotal !== null && lineBase !== subtotal) errors.push("Subtotalul nu este egal cu suma valorilor pozițiilor.");
  if (validLines && vatTotal !== null && lineTax !== vatTotal) errors.push("TVA-ul total nu este egal cu suma TVA-ului pozițiilor.");
  if (subtotal !== null && vatTotal !== null && total !== null && subtotal + vatTotal !== total) errors.push("Totalul nu este egal cu subtotalul plus TVA.");
  for (const group of groups.values()) {
    const expected = divideRounded(group.base * group.rate.numerator, group.rate.denominator * 100n);
    if (expected !== group.tax) errors.push("TVA-ul pe categorie și cotă nu corespunde bazei impozabile agregate.");
  }
  return errors;
}

export function assertInvoiceArithmetic(full: { invoice: StoredInvoice; items: readonly StoredItem[] }): void {
  const errors = financialValidationErrors(full);
  if (errors.length) throw new Error(errors.join("\n"));
}
