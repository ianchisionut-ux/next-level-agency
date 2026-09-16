import React from "react";
import path from "path";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  AnafInvoiceDocument,
  AnafParty,
} from "@/lib/accounting/anaf-invoice-document";

const BLUE = "#2563eb";
const NAVY = "#0f2747";
const TEXT = "#243b53";
const MUTED = "#64748b";
const LINE = "#d8e2ef";
const SOFT = "#f4f8fd";

const fontPath = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Geist-Regular.ttf",
);
Font.register({
  family: "Geist",
  fonts: [
    { src: fontPath, fontWeight: 400 },
    { src: fontPath, fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingHorizontal: 30,
    paddingBottom: 44,
    fontFamily: "Geist",
    fontSize: 8.2,
    color: TEXT,
  },
  topLine: {
    height: 5,
    borderRadius: 3,
    backgroundColor: BLUE,
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  title: { fontSize: 19, fontWeight: 700, color: NAVY },
  subtitle: { marginTop: 4, color: MUTED, fontSize: 8 },
  official: {
    width: 190,
    borderRadius: 8,
    padding: 10,
    color: "#ffffff",
    backgroundColor: NAVY,
  },
  officialLabel: {
    fontSize: 7,
    letterSpacing: 1,
    color: "#bfdbfe",
  },
  officialValue: { fontSize: 13, fontWeight: 700, marginTop: 3 },
  officialMeta: {
    fontSize: 7.5,
    lineHeight: 1.5,
    marginTop: 6,
    color: "#e5effb",
  },
  source: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#e8f2ff",
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    color: NAVY,
  },
  sourceStrong: { fontWeight: 700 },
  parties: { flexDirection: "row", gap: 10, marginBottom: 13 },
  party: {
    width: "50%",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 7,
    padding: 9,
  },
  partyCustomer: {
    width: "50%",
    borderWidth: 1,
    borderColor: BLUE,
    borderRadius: 7,
    padding: 9,
    backgroundColor: SOFT,
  },
  kicker: {
    color: BLUE,
    fontSize: 7,
    letterSpacing: 1,
    fontWeight: 700,
    marginBottom: 4,
  },
  partyName: {
    color: NAVY,
    fontSize: 10.5,
    fontWeight: 700,
    marginBottom: 4,
  },
  detail: { lineHeight: 1.45, fontSize: 7.5 },
  table: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 27,
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  rowAlt: { backgroundColor: SOFT },
  tableHead: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 5,
    backgroundColor: NAVY,
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 7,
  },
  cNo: { width: "6%" },
  cName: { width: "40%" },
  cUm: { width: "9%", textAlign: "center" },
  cQty: { width: "11%", textAlign: "right" },
  cPrice: { width: "14%", textAlign: "right" },
  cVat: { width: "8%", textAlign: "right" },
  cTotal: { width: "12%", textAlign: "right" },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  payment: {
    width: "55%",
    padding: 9,
    backgroundColor: SOFT,
    borderRadius: 6,
    lineHeight: 1.5,
  },
  paymentTitle: {
    fontWeight: 700,
    color: NAVY,
    marginBottom: 3,
  },
  totals: { width: "38%" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    padding: 8,
    borderRadius: 6,
    backgroundColor: BLUE,
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 700,
  },
  note: {
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    padding: 8,
    backgroundColor: SOFT,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    left: 30,
    right: 30,
    bottom: 22,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    color: MUTED,
    fontSize: 6.8,
  },
  footerText: { width: "83%" },
});

function amount(value: number, currency: string) {
  const formatted = Number(value || 0).toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

function date(value: string) {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("ro-RO");
}

function partyLines(party: AnafParty) {
  const companyId = party.vatId || party.companyId;
  const location = [
    party.address,
    party.postalCode,
    party.city,
    party.county,
    party.countryCode,
  ].filter(Boolean).join(", ");
  const contact = [
    party.contactName,
    party.phone,
    party.email,
  ].filter(Boolean).join(" | ");
  return [
    companyId && `CIF/CUI: ${companyId}`,
    location,
    contact,
  ].filter(Boolean) as string[];
}

function PartyCard({
  title,
  party,
  customer,
}: {
  title: string;
  party: AnafParty;
  customer?: boolean;
}) {
  return (
    <View style={customer ? styles.partyCustomer : styles.party}>
      <Text style={styles.kicker}>{title}</Text>
      <Text style={styles.partyName}>{party.name || "-"}</Text>
      {partyLines(party).map((line) => (
        <Text key={line} style={styles.detail}>{line}</Text>
      ))}
    </View>
  );
}

export function AnafInvoicePdf({
  document,
  downloadId,
}: {
  document: AnafInvoiceDocument;
  downloadId: string;
}) {
  const label =
    document.kind === "credit-note" ? "NOTA DE CREDIT" : "FACTURA";
  return (
    <Document
      title={`${label} ${document.id} - RO e-Factura`}
      author="NEXTLEVEL AUTOMATION SRL"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.topLine}/>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{label} RO e-Factura</Text>
            <Text style={styles.subtitle}>
              Vizualizare lizibila generata din XML-ul oficial din SPV
            </Text>
          </View>
          <View style={styles.official}>
            <Text style={styles.officialLabel}>DOCUMENT ANAF</Text>
            <Text style={styles.officialValue}>
              Nr. {document.id || "-"}
            </Text>
            <Text style={styles.officialMeta}>
              Emisa: {date(document.issueDate)}{"\n"}
              Scadenta: {date(document.dueDate)}{"\n"}
              Moneda: {document.currency}
            </Text>
          </View>
        </View>

        <View style={styles.source}>
          <Text>
            <Text style={styles.sourceStrong}>Sursa: </Text>
            {document.sourceFileName}
          </Text>
          <Text>
            <Text style={styles.sourceStrong}>ID ANAF: </Text>
            {downloadId}
          </Text>
          <Text>
            {document.signatureIncluded
              ? "Arhiva cu semnatura ANAF"
              : "Fara fisier separat de semnatura"}
          </Text>
        </View>

        <View style={styles.parties}>
          <PartyCard title="FURNIZOR" party={document.supplier}/>
          <PartyCard
            title="BENEFICIAR"
            party={document.customer}
            customer
          />
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={styles.cNo}>Nr.</Text>
            <Text style={styles.cName}>Produs / serviciu</Text>
            <Text style={styles.cUm}>U.M.</Text>
            <Text style={styles.cQty}>Cant.</Text>
            <Text style={styles.cPrice}>Pret unitar</Text>
            <Text style={styles.cVat}>TVA</Text>
            <Text style={styles.cTotal}>Valoare</Text>
          </View>
          {document.lines.map((line, index) => (
            <View
              key={`${line.id}-${index}`}
              wrap={false}
              style={[styles.row, index % 2 ? styles.rowAlt : {}]}
            >
              <Text style={styles.cNo}>{line.id}</Text>
              <Text style={styles.cName}>{line.name}</Text>
              <Text style={styles.cUm}>{line.unitCode}</Text>
              <Text style={styles.cQty}>
                {line.quantity.toLocaleString("ro-RO")}
              </Text>
              <Text style={styles.cPrice}>
                {amount(line.unitPrice, document.currency)}
              </Text>
              <Text style={styles.cVat}>{line.vatRate}%</Text>
              <Text style={styles.cTotal}>
                {amount(line.lineAmount, document.currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.summary} wrap={false}>
          <View style={styles.payment}>
            <Text style={styles.paymentTitle}>
              Plata si identificare
            </Text>
            <Text>
              Cod metoda plata: {document.paymentMeansCode || "-"}
            </Text>
            <Text>Cont: {document.paymentAccount || "-"}</Text>
            <Text>
              Tip document: {document.invoiceTypeCode || "-"}
            </Text>
          </View>
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text>{amount(document.subtotal, document.currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>TVA</Text>
              <Text>{amount(document.vatTotal, document.currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Total cu TVA</Text>
              <Text>{amount(document.total, document.currency)}</Text>
            </View>
            <View style={styles.grandTotal}>
              <Text>DE PLATA</Text>
              <Text>{amount(document.payable, document.currency)}</Text>
            </View>
          </View>
        </View>

        {document.notes.length > 0 && (
          <View style={styles.note}>
            <Text style={styles.paymentTitle}>Observatii</Text>
            {document.notes.map((note) => (
              <Text key={note}>{note}</Text>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Reprezentare PDF a XML-ului CIUS-RO. XML-ul si semnatura
            din arhiva ANAF raman documentele electronice originale.
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
