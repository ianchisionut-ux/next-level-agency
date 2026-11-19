import type { MetadataRoute } from "next";
import { posts } from "@/lib/blog";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/servicii", "/portofoliu", "/despre-noi", "/contact", "/blog", "/chestionar-audit", "/chestionar-site-prezentare", "/politica-de-confidentialitate", "/politica-de-cookies", "/termeni-si-conditii", "/declaratie-de-accesibilitate"];
  // Significant public-content updates, not the build date or shared footer.
  const updatedPages = new Set(["/", "/despre-noi", "/servicii", "/portofoliu", "/blog", "/chestionar-audit"]);
  return [
    ...pages.map(path => ({ url: new URL(path, SITE_URL).toString(), ...(["/", "/chestionar-site-prezentare"].includes(path) ? { lastModified: "2026-11-19" } : updatedPages.has(path) ? { lastModified: "2026-11-18" } : {}) })),
    ...posts.map(post => ({ url: `${SITE_URL}/blog/${post.slug}`, lastModified: post.updatedAt ?? post.publishedAt })),
  ];
}
