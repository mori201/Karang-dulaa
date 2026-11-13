import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/enseignant", "/tableau-de-bord", "/profil", "/api", "/certificats/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
