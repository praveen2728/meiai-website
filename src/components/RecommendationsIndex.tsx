"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { recommendationArticles } from "@/lib/securityRecommendations";

export default function RecommendationsIndex() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All recommendations");
  const categories = ["All recommendations", ...Array.from(new Set(recommendationArticles.map((article) => article.category)))];
  const articles = useMemo(() => recommendationArticles.filter((article) => {
    const matchesCategory = category === "All recommendations" || article.category === category;
    const text = `${article.title} ${article.summary} ${article.category} ${article.tags.join(" ")}`.toLowerCase();
    return matchesCategory && text.includes(query.trim().toLowerCase());
  }), [category, query]);

  return <>
    <div className="mx-auto grid max-w-7xl gap-4 rounded-2xl border border-stone-200 bg-white p-4 md:grid-cols-[1fr_280px] md:p-5">
      <label className="text-sm font-semibold text-stone-700">Search recommendations<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics, products, or tags" className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 text-base font-normal outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/10" /></label>
      <label className="text-sm font-semibold text-stone-700">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base font-normal outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/10">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
    </div>
    <p className="mt-5 text-sm text-stone-600" aria-live="polite">{articles.length} {articles.length === 1 ? "article" : "articles"} found</p>
    {articles.length ? <div className="mt-3 grid gap-4 lg:grid-cols-2">{articles.map((article) => <article key={article.slug} className="flex flex-col rounded-[24px] border border-stone-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-lg hover:shadow-stone-900/5 sm:p-8">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-900"><span>{article.category}</span><span aria-hidden="true">·</span><time dateTime={article.publishedAt}>{new Date(`${article.publishedAt}T12:00:00`).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}</time></div>
      <h2 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-stone-950"><Link href={`/security-recommendations/${article.slug}`} className="rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800">{article.title}</Link></h2>
      <p className="mt-3 flex-1 text-base leading-7 text-stone-600">{article.summary}</p>
      <div className="mt-5 flex flex-wrap gap-2">{article.tags.map((tag) => <span key={tag} className="rounded-full bg-[#f1f3ef] px-3 py-1.5 text-xs text-stone-700">{tag}</span>)}</div>
      <Link href={`/security-recommendations/${article.slug}`} className="mt-6 inline-flex min-h-11 items-center font-semibold text-emerald-950 underline decoration-emerald-800/30 underline-offset-4 hover:decoration-emerald-900">Read recommendation <span aria-hidden="true" className="ml-2">↗</span></Link>
    </article>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-base text-stone-600">No articles match. Try another search or choose a different category.</div>}
    <p className="mt-8 text-sm leading-6 text-stone-500">Recommendations are starting points for authorized review. Confirm product capabilities, licensing, organizational policy, and current documentation before making changes.</p>
  </>;
}
