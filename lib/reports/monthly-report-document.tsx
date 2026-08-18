import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 10, color: "#12141A" },
  header: { marginBottom: 20, borderBottom: "2 solid #3B66F6", paddingBottom: 12 },
  brand: { fontSize: 16, fontWeight: 700, color: "#3B66F6" },
  title: { fontSize: 20, fontWeight: 700, marginTop: 8 },
  subtitle: { fontSize: 10, color: "#6B7280", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statBox: { flex: 1, border: "1 solid #E5E7EB", borderRadius: 8, padding: 10 },
  statLabel: { fontSize: 8, color: "#6B7280", textTransform: "uppercase" },
  statValue: { fontSize: 16, fontWeight: 700, marginTop: 4, color: "#3B66F6" },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8, marginTop: 16 },
  table: { border: "1 solid #E5E7EB", borderRadius: 6 },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #E5E7EB", paddingVertical: 6, paddingHorizontal: 8 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#F7F8FA", paddingVertical: 6, paddingHorizontal: 8 },
  colRank: { width: 24, fontSize: 8, color: "#6B7280" },
  colTitle: { flex: 1, fontSize: 9 },
  colPlatform: { width: 70, fontSize: 8, color: "#6B7280" },
  colNumber: { width: 70, fontSize: 9, textAlign: "right" },
  headerCell: { fontSize: 8, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 8, color: "#9CA3AF", textAlign: "center" },
});

export interface ReportData {
  clientName: string;
  periodLabel: string;
  totalImpressions: number;
  totalEngagement: number;
  totalClicks: number;
  engagementRate: string;
  platformBreakdown: { platform: string; engagement: number }[];
  topPosts: { title: string; platform: string; impressions: number; engagementRate: string }[];
  generatedAt: string;
}

export function MonthlyReportDocument({ data }: { data: ReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>NEXT LEVEL — Raport de performanță</Text>
          <Text style={styles.title}>{data.clientName}</Text>
          <Text style={styles.subtitle}>{data.periodLabel}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Afișări totale</Text>
            <Text style={styles.statValue}>{data.totalImpressions.toLocaleString("ro-RO")}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Interacțiuni</Text>
            <Text style={styles.statValue}>{data.totalEngagement.toLocaleString("ro-RO")}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Click-uri</Text>
            <Text style={styles.statValue}>{data.totalClicks.toLocaleString("ro-RO")}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Rată interacțiune</Text>
            <Text style={styles.statValue}>{data.engagementRate}%</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Distribuție pe canale</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.headerCell, { flex: 1 }]}>Platformă</Text>
            <Text style={[styles.headerCell, styles.colNumber]}>Interacțiuni</Text>
          </View>
          {data.platformBreakdown.map((p) => (
            <View key={p.platform} style={styles.tableRow}>
              <Text style={{ flex: 1, fontSize: 9 }}>{p.platform}</Text>
              <Text style={styles.colNumber}>{p.engagement.toLocaleString("ro-RO")}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Top postări</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.headerCell, styles.colRank]}>#</Text>
            <Text style={[styles.headerCell, styles.colTitle]}>Postare</Text>
            <Text style={[styles.headerCell, styles.colPlatform]}>Canal</Text>
            <Text style={[styles.headerCell, styles.colNumber]}>Afișări</Text>
            <Text style={[styles.headerCell, styles.colNumber]}>Rată</Text>
          </View>
          {data.topPosts.map((p, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colRank}>{idx + 1}</Text>
              <Text style={styles.colTitle}>{p.title}</Text>
              <Text style={styles.colPlatform}>{p.platform}</Text>
              <Text style={styles.colNumber}>{p.impressions.toLocaleString("ro-RO")}</Text>
              <Text style={styles.colNumber}>{p.engagementRate}%</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Generat automat de Next Level Advertising Agency · {data.generatedAt}
        </Text>
      </Page>
    </Document>
  );
}
