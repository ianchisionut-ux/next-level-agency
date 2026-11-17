import type { Metadata } from "next";
import { siteConfig } from "@/lib/data";

export const SITE_URL = "https://www.nextlevel-agency.ro";
export const SITE_NAME = "Next Level Advertising Agency";
export const DEFAULT_DESCRIPTION = "Agenție de marketing digital în Zalău, Sălaj: web design, SEO, branding, reclame Google și Meta, automatizări pentru afaceri din România.";

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const url = new URL(path, SITE_URL).toString();
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website", locale: "ro_RO", siteName: SITE_NAME, title, description, url,
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${SITE_URL}/opengraph-image`] },
  };
}

export const businessSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfessionalService",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      legalName: siteConfig.legalName,
      url: SITE_URL,
      logo: `${SITE_URL}/brand/logo-full.png`,
      image: `${SITE_URL}/opengraph-image`,
      description: DEFAULT_DESCRIPTION,
      telephone: siteConfig.phone,
      email: siteConfig.email,
      taxID: siteConfig.cui,
      address: {
        "@type": "PostalAddress", streetAddress: "Str. Fundătura nr. 1A",
        addressLocality: "Mirșid", addressRegion: "Sălaj", addressCountry: "RO",
      },
      areaServed: [{ "@type": "Country", name: "România" }],
      sameAs: Object.values(siteConfig.socials).filter(Boolean),
    },
    {
      "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL,
      name: SITE_NAME, inLanguage: "ro-RO", publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem", position: index + 1, name: item.name, item: new URL(item.path, SITE_URL).toString(),
    })),
  };
}
