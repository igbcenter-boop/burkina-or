import type { MetadataRoute } from "next";

/** Manifeste de l'application installable (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Burkina Or · L'or accessible, en toute confiance",
    short_name: "Burkina Or",
    description: "Lingotins certifiés dès 1 gramme, bijoux d'artisans vérifiés, comptoirs agréés et livraison sécurisée.",
    lang: "fr",
    dir: "ltr",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#0E0E10",
    theme_color: "#0E0E10",
    categories: ["shopping", "finance", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Acheter un lingotin", short_name: "Lingotins", url: "/boutique-officielle", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Mes commandes", short_name: "Commandes", url: "/compte/commandes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Parler à un conseiller", short_name: "Conseil", url: "/conseil", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
