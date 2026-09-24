import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Search result pages carry no standalone value; keep them out of crawl.
        disallow: ["/search"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
