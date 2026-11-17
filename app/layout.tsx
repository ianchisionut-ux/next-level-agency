import type { Metadata, Viewport } from "next";
import "./globals.css";
import WhatsAppButton from "@/components/WhatsAppButton";
import CookieConsent from "@/components/CookieConsent";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Marketing digital și web design Zalău | Next Level",
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/logo-mark.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Signal",
  },
  openGraph: {
    type: "website", locale: "ro_RO", siteName: SITE_NAME,
    title: "Marketing digital și web design Zalău | Next Level",
    description: DEFAULT_DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", images: ["/opengraph-image"] },
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
