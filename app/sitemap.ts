import type { MetadataRoute } from "next";
import { posts } from "@/lib/blog";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/servicii", "/portofoliu", "/despre-noi", "/contact", "/blog", "/chestionar-audit", "/chestionar-site-prezentare", "/politica-de-confidentialitate", "/politica-de-cookies", "/termeni-si-conditii", "/declaratie-de-accesibilitate"];
  return [
    ...pages.map(path => ({ url: new URL(path, SITE_URL).toString() })),
    ...posts.map(post => ({ url: `${SITE_URL}/blog/${post.slug}`, lastModified: post.publishedAt })),
  ];
}
