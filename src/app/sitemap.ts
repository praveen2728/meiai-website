import type { MetadataRoute } from "next";
import { recommendationArticles } from "@/lib/securityRecommendations";
import { learnArticles } from "@/lib/learnContent";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.meiai.in";
  const routes = [
    ["/", "weekly", 1],
    ["/labs/azure-security-journey", "weekly", 0.9],
    ["/azure-security-simulator", "weekly", 0.9],
    ["/learn", "weekly", 0.8],
    ["/lab", "weekly", 0.9],
    ["/detection-soc", "monthly", 0.8],
    ["/multicloud", "monthly", 0.8],
    ["/cloud-security", "monthly", 0.8],
    ["/security-recommendations", "weekly", 0.8],
    ["/methodology", "monthly", 0.7],
  ] as const;
  return [
    ...routes.map(([path, changeFrequency, priority]) => ({ url: `${base}${path}`, changeFrequency, priority })),
    ...recommendationArticles.filter((article) => article.status === "Published").map((article) => ({ url: `${base}/security-recommendations/${article.slug}`, lastModified: new Date(`${article.lastReviewedAt}T12:00:00Z`), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...learnArticles.map((article) => ({ url: `${base}/learn/${article.slug}`, lastModified: new Date(`${article.verified}T12:00:00Z`), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
