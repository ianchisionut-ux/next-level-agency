import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Signal — Next Level Advertising Agency",
    short_name: "Signal",
    description: "Platforma de management social media Next Level - postează, programează și analizează, direct de pe telefon.",
    // Deschide direct in Signal (nu pe site-ul de prezentare) cand e instalat.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#00122E",
    theme_color: "#00122E",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Postare nouă",
        short_name: "Postează",
        description: "Deschide direct compunerea unei postări noi",
        url: "/dashboard/compose",
      },
    ],
  };
}
