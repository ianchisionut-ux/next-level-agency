export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "12px",
        background: "#00122E",
        color: "#fff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
        padding: "24px",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="Signal" width={64} height={64} style={{ borderRadius: 14 }} />
      <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Fără conexiune la internet</h1>
      <p style={{ fontSize: 14, color: "#9FB4D6", maxWidth: 320, margin: 0 }}>
        Signal are nevoie de internet ca să încarce datele la zi. Reconectează-te și încearcă din nou.
      </p>
    </div>
  );
}
