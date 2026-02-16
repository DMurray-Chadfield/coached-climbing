import type { MetadataRoute } from "next";

const BASE_URL = "https://coachedclimbing.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date()
    }
  ];
}
