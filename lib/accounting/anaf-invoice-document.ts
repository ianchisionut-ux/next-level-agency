import { strFromU8, unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

export type AnafParty = {
  name: string;
  companyId: string;
  vatId: string;
  address: string;
  city: string;
  county: string;
  postalCode: string;
  countryCode: string;
  contactName: string;
  phone: string;
  email: string;
};

export type AnafInvoiceDocument = {
  kind: "invoice" | "credit-note";
  id: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  invoiceTypeCode: string;
  notes: string[];
  supplier: AnafParty;
  customer: AnafParty;
  paymentMeansCode: string;
  paymentAccount: string;
  subtotal: number;
  vatTotal: number;
  total: number;
  payable: number;
  lines: Array<{
    id: string;
    name: string;
    unitCode: string;
    quantity: number;
    unitPrice: number;
    lineAmount: number;
    vatRate: number;
  }>;
  sourceFileName: string;
  signatureIncluded: boolean;
};

type XmlValue =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | null
  | undefined;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
});

function object(input: unknown): Record<string, XmlValue> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, XmlValue>;
}

function list<T>(input: T | T[] | null | undefined): T[] {
  if (input == null) return [];
  return Array.isArray(input) ? input : [input];
}

function value(input: unknown): string {
  if (input == null) return "";
  if (typeof input === "string" || typeof input === "number") {
    return String(input).trim();
  }
  const item = object(input);
  return item["#text"] == null ? "" : String(item["#text"]).trim();
}

function numberValue(input: unknown): number {
  const parsed = Number(value(input).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstObject(input: XmlValue): Record<string, XmlValue> {
  return object(Array.isArray(input) ? input[0] : input);
}

function parseParty(input: XmlValue): AnafParty {
  const wrapper = object(input);
  const party = object(wrapper.Party ?? wrapper);
  const address = object(party.PostalAddress);
  const country = object(address.Country);
  const legal = firstObject(party.PartyLegalEntity);
  const tax = firstObject(party.PartyTaxScheme);
  const contact = object(party.Contact);
  const legalId = value(legal.CompanyID);
  const taxId = value(tax.CompanyID);
  return {
    name: value(legal.RegistrationName) || value(party.Name),
    companyId: legalId || taxId,
    vatId: taxId,
    address: value(address.StreetName),
    city: value(address.CityName),
    county: value(address.CountrySubentity),
    postalCode: value(address.PostalZone),
    countryCode: value(country.IdentificationCode),
    contactName: value(contact.Name),
    phone: value(contact.Telephone),
    email: value(contact.ElectronicMail),
  };
}

function looksLikeZip(bytes: Uint8Array) {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export function extractAnafInvoiceXml(buffer: Buffer | Uint8Array) {
  const bytes =
    buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const files = looksLikeZip(bytes)
    ? unzipSync(bytes)
    : { "eFactura.xml": bytes };
  const xmlFiles = Object.entries(files).filter(([name]) =>
    name.toLowerCase().endsWith(".xml"),
  );
  const invoiceFile = xmlFiles.find(([name, contents]) => {
    if (name.toLowerCase().includes("semnatura")) return false;
    return /<(?:\w+:)?(?:Invoice|CreditNote)\b/i.test(strFromU8(contents));
  });
  if (!invoiceFile) {
    throw new Error(
      "Arhiva ANAF nu contine un XML de factura CIUS-RO recunoscut.",
    );
  }
  return {
    fileName: invoiceFile[0],
    xml: strFromU8(invoiceFile[1]),
    signatureIncluded: xmlFiles.some(([name]) =>
      name.toLowerCase().includes("semnatura"),
    ),
  };
}

export function parseAnafInvoiceArchive(
  buffer: Buffer | Uint8Array,
): AnafInvoiceDocument {
  const extracted = extractAnafInvoiceXml(buffer);
  const parsed = object(parser.parse(extracted.xml));
  const kind = parsed.CreditNote ? "credit-note" : "invoice";
  const root = object(
    kind === "credit-note" ? parsed.CreditNote : parsed.Invoice,
  );
  if (!Object.keys(root).length) {
    throw new Error(
      "XML-ul ANAF nu contine o factura sau o nota de credit valida.",
    );
  }

  const monetary = object(root.LegalMonetaryTotal);
  const taxTotal = firstObject(root.TaxTotal);
  const rawLines = list(
    kind === "credit-note" ? root.CreditNoteLine : root.InvoiceLine,
  );
  const lines = rawLines.map((raw, index) => {
    const line = object(raw);
    const item = object(line.Item);
    const taxCategory = firstObject(item.ClassifiedTaxCategory);
    const quantityValue =
      kind === "credit-note"
        ? line.CreditedQuantity
        : line.InvoicedQuantity;
    const quantityObject = object(quantityValue);
    const price = object(line.Price);
    return {
      id: value(line.ID) || String(index + 1),
      name:
        value(item.Name) ||
        value(item.Description) ||
        "Pozitie fara denumire",
      unitCode: value(quantityObject["@unitCode"]) || "-",
      quantity: numberValue(quantityValue),
      unitPrice: numberValue(price.PriceAmount),
      lineAmount: numberValue(line.LineExtensionAmount),
      vatRate: numberValue(taxCategory.Percent),
    };
  });

  return {
    kind,
    id: value(root.ID),
    issueDate: value(root.IssueDate),
    dueDate: value(root.DueDate),
    currency: value(root.DocumentCurrencyCode) || "RON",
    invoiceTypeCode: value(
      kind === "credit-note"
        ? root.CreditNoteTypeCode
        : root.InvoiceTypeCode,
    ),
    notes: list(root.Note).map(value).filter(Boolean),
    supplier: parseParty(root.AccountingSupplierParty),
    customer: parseParty(root.AccountingCustomerParty),
    paymentMeansCode: value(
      object(root.PaymentMeans).PaymentMeansCode,
    ),
    paymentAccount: value(
      object(object(root.PaymentMeans).PayeeFinancialAccount).ID,
    ),
    subtotal: numberValue(
      monetary.TaxExclusiveAmount ?? monetary.LineExtensionAmount,
    ),
    vatTotal: numberValue(taxTotal.TaxAmount),
    total: numberValue(monetary.TaxInclusiveAmount),
    payable: numberValue(
      monetary.PayableAmount ?? monetary.TaxInclusiveAmount,
    ),
    lines,
    sourceFileName: extracted.fileName,
    signatureIncluded: extracted.signatureIncluded,
  };
}
