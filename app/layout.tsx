import type { Metadata, Viewport } from "next";
import "./globals.css";
import WhatsAppButton from "@/components/WhatsAppButton";
import CookieConsent from "@/components/CookieConsent";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  // TODO: înlocuiește cu domeniul real odată ce e cumpărat și conectat.
  metadataBase: new URL("https://nextlevelagency.ro"),
  title: "Next Level Advertising Agency | Marketing digital, Branding & Web Design",
  description:
    "Transformăm afaceri în branduri puternice și generăm rezultate reale prin marketing digital, design și automatizări inteligente.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Signal",
  },
  openGraph: {
    title: "Next Level Advertising Agency",
    description:
      "Marketing digital, branding și web design care generează rezultate reale.",
    images: ["/brand/logo-full.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00122E",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ro">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
        <WhatsAppButton />
        <CookieConsent />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
