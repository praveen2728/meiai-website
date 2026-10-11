"use client";

import Link from "next/link";
import { useState } from "react";
import type { UseCase } from "@/lib/useCases";
import SiteNavigation from "@/components/SiteNavigation";

export default function UseCaseDemo({ useCase }: { useCase: UseCase }) {
  const [selected, setSelected] = useState(useCase.scenarios[0].id);
  const [showFinding, setShowFinding] = useState(false);
  const scenario = useCase.scenarios.find((item) => item.id === selected) ?? useCase.scenarios[0];

  return (
    <main id="page-main" tabIndex={-1} className="min-h-screen bg-[#080d18] text-white">
      <SiteNavigation theme="dark" />
      <section className="border-b border-white/5 bg-[radial-gradient(ellipse_at_75%_0%,rgba(34,211,238,.09),transparent_50%)]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
          <Link href="/#labs" className="text-xs text-cyan-200/80 hover:text-white">← All projects</Link>
          <p className="mt-9 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">{useCase.number} / {useCase.category}</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">{useCase.title}</h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-slate-400">{useCase.summary}</p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/[0.05] px-3 py-2 text-xs text-amber-100/80"><span className="h-1.5 w-1.5 rounded-full bg-amber-300"/>Synthetic demonstration · no cloud or SIEM connection</div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-14 md:grid-cols-[.8fr_1.2fr] md:px-8 md:py-20">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">What this demonstrates</p><h2 className="mt-3 text-2xl font-semibold">{useCase.accent}</h2><p className="mt-4 text-sm leading-6 text-slate-400">{useCase.objective}</p><ol className="mt-7 space-y-4">{useCase.workflow.map((step, index) => <li key={step} className="flex gap-4 text-sm text-slate-300"><span className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</span>{step}</li>)}</ol>
          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.025] p-4"><p className="text-xs font-semibold text-slate-200">Where this can go next</p><p className="mt-2 text-xs leading-5 text-slate-400">Connect a read-only data source, define explicit scope, preserve source evidence, and require an owner to validate each finding before remediation.</p></div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1524] p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Interactive walkthrough</p><h2 className="mt-2 text-xl font-semibold">Choose a synthetic scenario</h2></div><span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-slate-500">DEMO DATA</span></div>
          <div className="mt-5 grid gap-2">{useCase.scenarios.map((item) => <button key={item.id} type="button" onClick={() => { setSelected(item.id); setShowFinding(false); }} className={`rounded-xl border p-4 text-left transition ${selected === item.id ? "border-cyan-300/35 bg-cyan-300/[0.06]" : "border-white/10 hover:border-white/20"}`}><span className="text-sm font-medium text-slate-100">{item.name}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{item.description}</span></button>)}</div>
          <button type="button" onClick={() => setShowFinding(true)} className="mt-4 w-full rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">Review sample evidence</button>
          {showFinding && <article aria-live="polite" className="mt-5 rounded-xl border border-white/10 bg-black/20 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Example finding · {scenario.id.toUpperCase()}</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${scenario.finding.severity === "Critical" || scenario.finding.severity === "High" ? "bg-red-300/10 text-red-200" : "bg-amber-200/10 text-amber-100"}`}>{scenario.finding.severity}</span></div><h3 className="mt-3 text-lg font-semibold">{scenario.finding.title}</h3><p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Observed in the fixture</p><p className="mt-2 text-sm leading-6 text-slate-300">{scenario.finding.evidence}</p><p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">Suggested next steps</p><p className="mt-2 text-sm leading-6 text-slate-300">{scenario.finding.recommendation}</p><p className="mt-4 border-t border-white/10 pt-3 text-[11px] leading-5 text-slate-500">Example only. Validate with authorized, current evidence before treating this as a finding.</p></article>}
        </div>
      </section>

      <section className="border-y border-white/5 bg-[#0a1220]"><div className="mx-auto grid max-w-7xl gap-4 px-5 py-10 md:grid-cols-[1fr_2fr] md:px-8"><h2 className="text-sm font-semibold text-slate-200">Scope and limitations</h2><p className="text-sm leading-6 text-slate-400">{useCase.limitations}</p></div></section>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-slate-500 md:px-8"><span>MeiAI · Security engineering demonstrations</span><Link href="/lab" className="text-cyan-200 hover:text-white">Explore the AI Security Lab →</Link></footer>
    </main>
  );
}
