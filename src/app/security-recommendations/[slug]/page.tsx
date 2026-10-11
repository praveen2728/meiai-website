import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RecommendationMarkdown from "@/components/RecommendationMarkdown";
import SiteNavigation from "@/components/SiteNavigation";
import { getRecommendation, recommendationArticles, type RecommendationArticle } from "@/lib/securityRecommendations";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return recommendationArticles.filter((article) => article.status === "Published").map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getRecommendation(slug);
  if (!article || article.status !== "Published") return { title: "Recommendation not found | MeiAI", robots: { index: false, follow: false } };
  return {
    title: `${article.title} | MeiAI Recommendations`,
    description: article.summary,
    alternates: { canonical: `/security-recommendations/${article.slug}` },
    openGraph: { title: article.title, description: article.summary, type: "article", publishedTime: article.publishedAt, modifiedTime: article.lastReviewedAt, tags: article.tags },
  };
}

export default async function RecommendationArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getRecommendation(slug);
  if (!article || article.status !== "Published") notFound();
  const related = article.relatedSlugs.map(getRecommendation).filter((item): item is RecommendationArticle => Boolean(item && item.status === "Published"));

  return <main id="page-main" tabIndex={-1} className="min-h-screen bg-[#f7f8f5] text-stone-950">
    <SiteNavigation />
    <article>
      <header className="border-b border-stone-200 bg-[#eef1eb]">
        <div className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16"><Link href="/security-recommendations" className="text-sm font-medium text-emerald-950 underline underline-offset-4">← All recommendations</Link><p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900">{article.category}</p><h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{article.title}</h1><p className="mt-5 text-lg leading-8 text-stone-600">{article.summary}</p><div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600"><span>Published <time dateTime={article.publishedAt}>{new Date(`${article.publishedAt}T12:00:00`).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</time></span><span>Last reviewed <time dateTime={article.lastReviewedAt}>{new Date(`${article.lastReviewedAt}T12:00:00`).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</time></span></div><div className="mt-5 flex flex-wrap gap-2">{article.tags.map((tag) => <span key={tag} className="rounded-full border border-stone-300 bg-white/70 px-3 py-1.5 text-xs text-stone-700">{tag}</span>)}</div></div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-9 px-5 py-10 md:grid-cols-[minmax(0,1fr)_270px] md:px-8 md:py-14">
        <div className="rounded-[24px] border border-stone-200 bg-white p-6 sm:p-9"><RecommendationMarkdown content={article.body} /><div className="mt-10 border-t border-stone-200 pt-7"><h2 className="text-xl font-semibold">References</h2><ul className="mt-3 space-y-3">{article.references.map((reference) => <li key={reference.url}><a href={reference.url} target="_blank" rel="noreferrer" className="text-base leading-7 text-emerald-950 underline decoration-emerald-800/40 underline-offset-4 hover:decoration-emerald-900">{reference.label} ↗</a></li>)}</ul><p className="mt-5 text-sm leading-6 text-stone-500">References checked {new Date(`${article.lastReviewedAt}T12:00:00`).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}. Product behavior and service terms can change; use the current official documentation.</p></div></div>
        <aside className="space-y-5"><section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">Related MeiAI projects</h2><ul className="mt-3 space-y-3">{article.relatedProjects.map((project) => <li key={project.href}><Link className="text-sm leading-6 text-emerald-950 underline underline-offset-4" href={project.href}>{project.label} ↗</Link></li>)}</ul></section>{related.length > 0 && <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">Related recommendations</h2><ul className="mt-3 space-y-3">{related.map((item) => <li key={item.slug}><Link className="text-sm leading-6 text-stone-700 underline decoration-stone-400 underline-offset-4 hover:text-emerald-950" href={`/security-recommendations/${item.slug}`}>{item.title}</Link></li>)}</ul></section>}<p className="rounded-2xl bg-[#eef1eb] p-5 text-sm leading-6 text-stone-600">This article is general guidance, not an assessment of a live customer environment. Validate changes under your authorization and change process.</p></aside>
      </div>
    </article>
    <footer className="border-t border-stone-200 px-5 py-7 text-center text-sm text-stone-500">MeiAI · Technical guidance for review and adaptation</footer>
  </main>;
}
