import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import WhatsAppButton from "@/components/WhatsAppButton";
import CookieConsent from "@/components/CookieConsent";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

const inter = Inter({ subsets: ["latin", "latin-ext"], display: "optional", variable: "--font-nextlevel-inter", preload: false });
const displayFont = Space_Grotesk({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-nextlevel-display", preload: false });
const monoFont = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-nextlevel-mono", preload: false });

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
    <html lang="ro" data-scroll-behavior="smooth" className={`${inter.variable} ${displayFont.variable} ${monoFont.variable}`}>
      <body className="antialiased">
        {children}
        <WhatsAppButton />
        <CookieConsent />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
