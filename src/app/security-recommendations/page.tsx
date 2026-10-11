import type { Metadata } from "next";
import Link from "next/link";
import RecommendationsIndex from "@/components/RecommendationsIndex";
import SiteNavigation from "@/components/SiteNavigation";

export const metadata: Metadata = {
  title: "Security Recommendations | MeiAI",
  description: "Practical, source-linked security recommendations for cloud, AI, and security operations teams.",
  alternates: { canonical: "/security-recommendations" },
  openGraph: { title: "Security Recommendations | MeiAI", description: "Practical, source-linked security recommendations for cloud, AI, and security operations teams.", type: "website" },
};

export default function SecurityRecommendationsPage() {
  return <main id="page-main" tabIndex={-1} className="min-h-screen bg-[#f7f8f5] text-stone-950">
    <SiteNavigation />
    <section className="border-b border-stone-200 bg-[#eef1eb]">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20"><Link href="/" className="text-sm text-stone-600 underline underline-offset-4">← Home</Link><p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900">MeiAI / Recommendations</p><h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">Security recommendations, with the evidence in view.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">Practical implementation and investigation guidance with authoritative references, clear validation steps, and boundaries on what the recommendation can establish.</p></div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14" aria-label="Recommendation articles"><RecommendationsIndex /></section>
    <footer className="border-t border-stone-200 px-5 py-7 text-center text-sm text-stone-500">MeiAI · Technical guidance for review and adaptation</footer>
  </main>;
}
