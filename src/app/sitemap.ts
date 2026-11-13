import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/academie", "/dictionnaire", "/prononciation", "/bibliotheque", "/sources", "/a-propos", "/inscription"].map((p) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: "weekly",
  }));
}
