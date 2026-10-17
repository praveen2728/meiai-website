"use client";

import { useEffect, useMemo, useState } from "react";
import SiteNavigation from "@/components/SiteNavigation";
import {
  controlStatuses,
  deriveSimulatorFindings,
  environmentProfiles,
  getRelevantControls,
  getTargetComponentIds,
  getUnknownControls,
  initialSimulatorState,
  normalizeSimulatorState,
  simulatorComponents,
  simulatorReferenceNote,
  summarizeSimulator,
  workloadProfiles,
  type ControlStatus,
  type SimulatorComponent,
  type SimulatorState,
} from "@/lib/azureSimulator";
import { downloadSimulatorHtmlReport, downloadSimulatorPdfReport } from "@/lib/azureSimulatorReport";

const statusStyle: Record<ControlStatus, string> = {
  implemented: "border-emerald-300 bg-emerald-50 text-emerald-800",
  partial: "border-amber-300 bg-amber-50 text-amber-800",
  missing: "border-rose-300 bg-rose-50 text-rose-800",
  unknown: "border-slate-300 bg-slate-50 text-slate-700",
  na: "border-slate-200 bg-white text-slate-500",
};
const boundaryOrder = ["Identity", "Governance", "Network", "Workload", "Data", "Operations"] as const;
const componentById = (id: string) => simulatorComponents.find((item) => item.id === id);

export default function AzureSecuritySimulator() {
  const [state, setState] = useState<SimulatorState>(initialSimulatorState);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<"current" | "target">("current");
  const [selectedComponent, setSelectedComponent] = useState<string>("entra");
  const [domainFilter, setDomainFilter] = useState("All domains");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [focusControl, setFocusControl] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("meiai-azure-simulator-v1");
        if (saved) setState(normalizeSimulatorState(JSON.parse(saved)));
      } catch { /* A malformed local draft falls back to the safe default. */ }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem("meiai-azure-simulator-v1", JSON.stringify(state));
  }, [hydrated, state]);

  const controls = useMemo(() => getRelevantControls(state), [state]);
  const findings = useMemo(() => deriveSimulatorFindings(state), [state]);
  const unknowns = useMemo(() => getUnknownControls(state), [state]);
  const targetIds = useMemo(() => getTargetComponentIds(state, findings), [state, findings]);
  const summary = useMemo(() => summarizeSimulator(state), [state]);
  const domains = [...new Set(controls.map((item) => item.domain))];
  const filteredControls = controls.filter((item) => domainFilter === "All domains" || item.domain === domainFilter);
  const filteredFindings = findings.filter((item) => (domainFilter === "All domains" || item.domain === domainFilter) && (priorityFilter === "All priorities" || item.priority === priorityFilter));
  const architectureIds = view === "current" ? state.components : targetIds;
  const flowPaths: { label: string; nodes: { id: string; name: string; external?: boolean }[] }[] = [];
  if (architectureIds.includes("entra")) flowPaths.push({ label: "Identity access", nodes: [{ id: "users", name: "Users / admins", external: true }, { id: "entra", name: "Microsoft Entra ID" }] });
  if (architectureIds.includes("app-service") || architectureIds.includes("virtual-machines") || architectureIds.includes("aks")) {
    const workloadId = ["app-service", "aks", "virtual-machines"].find((id) => architectureIds.includes(id))!;
    const hasIngress = architectureIds.includes("waf") && workloadId === "app-service";
    flowPaths.push({ label: "Application access", nodes: [{ id: "internet", name: "Internet", external: true }, ...(hasIngress ? [{ id: "waf", name: "WAF" }] : []), { id: workloadId, name: componentById(workloadId)?.name ?? workloadId }] });
  }
  const workloadForData = ["app-service", "aks", "virtual-machines"].find((id) => architectureIds.includes(id));
  const dataComponent = ["sql", "storage"].find((id) => architectureIds.includes(id));
  if (workloadForData && dataComponent) flowPaths.push({ label: "Workload data access", nodes: [{ id: workloadForData, name: componentById(workloadForData)?.name ?? workloadForData }, { id: dataComponent, name: componentById(dataComponent)?.name ?? dataComponent }] });
  if (workloadForData && architectureIds.includes("key-vault")) flowPaths.push({ label: "Secret retrieval", nodes: [{ id: workloadForData, name: componentById(workloadForData)?.name ?? workloadForData }, { id: "key-vault", name: "Key Vault" }] });
  if (architectureIds.includes("log-analytics")) flowPaths.push({ label: "Selected telemetry destination", nodes: [{ id: dataComponent ?? workloadForData ?? "entra", name: componentById(dataComponent ?? workloadForData ?? "entra")?.name ?? "Microsoft Entra ID" }, { id: "log-analytics", name: "Log Analytics" }, ...(architectureIds.includes("sentinel") ? [{ id: "sentinel", name: "Microsoft Sentinel" }] : [])] });
  const activeComponent = componentById(selectedComponent);
  const linkedControls = activeComponent ? controls.filter((item) => item.affectedComponents.includes(activeComponent.id) || item.components.includes(activeComponent.id)) : [];
  const linkedFindings = findings.filter((item) => item.affectedComponents.includes(selectedComponent));

  function update(patch: Partial<SimulatorState>) { setState((current) => ({ ...current, ...patch })); }
  function toggleWorkload(id: SimulatorState["workloads"][number]) {
    const workloads = state.workloads.includes(id) ? state.workloads.filter((item) => item !== id) : [...state.workloads, id];
    update({ workloads });
  }
  function toggleComponent(id: string) {
    update({ components: state.components.includes(id) ? state.components.filter((item) => item !== id) : [...state.components, id] });
    setSelectedComponent(id);
  }
  function goTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }

  return <main className="min-h-screen bg-[#f4f6f3] text-[#14221b]">
    <SiteNavigation />
    <section className="mx-auto max-w-7xl px-5 pb-12 pt-14 md:px-8 md:pt-20">
      <div className="max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-800">MeiAI · Azure Security Engineering</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Azure Security<br className="hidden sm:block" /> Simulator</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Shape a conceptual Azure environment, assess the controls you report, and compare it with a proposed target architecture.</p>
        <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><b>Simulation boundary:</b> This assessment uses your selections and transparent rules. It does not connect to an Azure tenant or verify configuration. Findings are potential gaps for review, not discovered vulnerabilities or compliance results.</div>
        <div className="mt-7 flex flex-wrap gap-3">
          <button onClick={() => goTo("simulator-configuration")} className="rounded-full bg-[#163e2e] px-6 py-3 text-sm font-semibold text-white hover:bg-[#245a41]">Start Security Assessment <span aria-hidden="true">↓</span></button>
          <button onClick={() => goTo("simulator-architecture")} className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold hover:border-slate-500">Build an Azure Architecture <span aria-hidden="true">↓</span></button>
          <span className="self-center text-sm text-slate-500">Draft saved in this browser{hydrated ? " · ready" : ""}</span>
        </div>
      </div>
      <nav aria-label="Simulator progress" className="mt-11 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4 text-sm md:grid-cols-5">
        {[["01", "Environment", "simulator-configuration"], ["02", "Controls", "simulator-controls"], ["03", "Architecture", "simulator-architecture"], ["04", "Findings", "simulator-findings"], ["05", "Report", "simulator-report"]].map(([n, label, id]) => <button key={id} onClick={() => goTo(id)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-slate-600 hover:bg-white"><b className="text-emerald-800">{n}</b>{label}</button>)}
      </nav>
    </section>

    <section id="simulator-configuration" className="scroll-mt-8 border-y border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[.72fr_1.28fr] md:px-8 md:py-16">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-800">01 / Environment and architecture</p><h2 className="mt-3 text-3xl font-semibold">Describe the system</h2><p className="mt-3 leading-7 text-slate-600">Choose the closest environment and workload types. The checklist and diagram respond to these choices.</p></div>
        <div className="space-y-8">
          <fieldset><legend className="text-lg font-semibold">Environment profile</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{environmentProfiles.map((item) => <label key={item.id} className={`cursor-pointer rounded-2xl border p-4 transition ${state.environment === item.id ? "border-emerald-700 bg-emerald-50" : "border-slate-200 hover:border-slate-400"}`}><span className="flex items-start gap-3"><input type="radio" name="environment" checked={state.environment === item.id} onChange={() => update({ environment: item.id })} className="mt-1 accent-emerald-800"/><span><b className="block">{item.name}</b><span className="mt-1 block text-sm leading-5 text-slate-600">{item.detail}</span></span></span></label>)}</div></fieldset>
          <fieldset><legend className="text-lg font-semibold">Workload profiles</legend><p className="mt-1 text-sm text-slate-600">Choose all that apply. This determines which assessment questions appear.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{workloadProfiles.map((item) => <label key={item.id} className={`cursor-pointer rounded-2xl border p-4 ${state.workloads.includes(item.id) ? "border-emerald-700 bg-emerald-50" : "border-slate-200 hover:border-slate-400"}`}><span className="flex items-start gap-3"><input type="checkbox" checked={state.workloads.includes(item.id)} onChange={() => toggleWorkload(item.id)} className="mt-1 accent-emerald-800"/><span><b className="block">{item.name}</b><span className="mt-1 block text-sm leading-5 text-slate-600">{item.detail}</span></span></span></label>)}</div></fieldset>
          <div><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-lg font-semibold">Architecture builder</h3><p className="mt-1 text-sm text-slate-600">Select conceptual components in your environment. Components do not deploy resources.</p></div><button onClick={() => update({ components: [...initialSimulatorState.components] })} className="text-sm font-semibold text-emerald-800 underline">Reset components</button></div>
            <div className="mt-4 space-y-5">{boundaryOrder.map((boundary) => {
              const items = simulatorComponents.filter((item) => item.boundary === boundary && (item.workloads === "all" || item.workloads.some((id) => state.workloads.includes(id))));
              if (!items.length) return null;
              return <div key={boundary}><h4 className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">{boundary}</h4><div className="mt-2 flex flex-wrap gap-2">{items.map((item) => <ComponentChip key={item.id} item={item} selected={state.components.includes(item.id)} onClick={() => toggleComponent(item.id)} />)}</div></div>;
            })}</div>
          </div>
        </div>
      </div>
    </section>

    <section id="simulator-controls" className="scroll-mt-8 mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-800">02 / Posture checklist</p><h2 className="mt-3 text-3xl font-semibold">Report the controls you have</h2><p className="mt-3 max-w-3xl leading-7 text-slate-600">Answer what you know. Unknown is not a pass; not applicable is excluded from the summary. Each answer can be changed at any time.</p></div><select aria-label="Filter checklist domain" value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-3"><option>All domains</option>{domains.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-5">{[["implemented", "Reported implemented"], ["partial", "Partial"], ["missing", "Not implemented"], ["unknown", "Unknown / not assessed"], ["na", "Not applicable"]].map(([key, label]) => <div key={key} className="rounded-xl border border-slate-200 bg-white p-4"><strong className="block text-2xl">{summary.counts[key as ControlStatus]}</strong><span className="text-xs text-slate-600">{label}</span></div>)}</div>
      <div className="mt-7 space-y-6">{domains.filter((domain) => domainFilter === "All domains" || domain === domainFilter).map((domain) => <div key={domain} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h3 className="font-semibold">{domain}</h3></div><div className="divide-y divide-slate-100">{filteredControls.filter((item) => item.domain === domain).map((item) => <article key={item.id} id={`control-${item.id}`} className={`scroll-mt-5 px-5 py-5 ${focusControl === item.id ? "bg-amber-50" : ""}`}><div className="flex flex-col justify-between gap-4 lg:flex-row"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.id} · {item.domain}</p><h4 className="mt-1 text-lg font-semibold">{item.name}</h4><p className="mt-2 text-sm leading-6 text-slate-700">{item.question}</p><details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold text-emerald-800">Risk, remediation and validation</summary><div className="mt-3 space-y-3 leading-6 text-slate-600"><p><b className="text-slate-800">Risk considered:</b> {item.risk}</p><p><b className="text-slate-800">Suggested action:</b> {item.remediation}</p><p><b className="text-slate-800">Validation idea:</b> {item.validation}</p><p><b className="text-slate-800">Framework references:</b> {item.frameworks.join(" · ")}. {simulatorReferenceNote}</p><p className="flex flex-wrap gap-3">{item.references.map((ref) => <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer" className="font-medium text-emerald-800 underline">{ref.label} ↗</a>)}</p></div></details></div><label className="shrink-0 text-sm font-semibold">Reported status<select aria-label={`${item.id}: reported status`} value={state.statuses[item.id] ?? "unknown"} onChange={(event) => update({ statuses: { ...state.statuses, [item.id]: event.target.value as ControlStatus } })} className={`mt-2 block w-full rounded-xl border px-3 py-2.5 ${statusStyle[state.statuses[item.id] ?? "unknown"]}`}>{controlStatuses.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label></div></article>)}</div></div>)}</div>
    </section>

    <section id="simulator-architecture" className="scroll-mt-8 border-y border-slate-200 bg-[#eaf0eb]">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-800">03 / Visual architecture</p><h2 className="mt-3 text-3xl font-semibold">See the boundaries and paths</h2><p className="mt-3 max-w-3xl leading-7 text-slate-600">Select a node to inspect its purpose, related controls and reported gaps. Current and target views share this model.</p></div><div className="flex rounded-full border border-slate-300 bg-white p-1"><button onClick={() => setView("current")} aria-pressed={view === "current"} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === "current" ? "bg-[#163e2e] text-white" : "text-slate-700"}`}>Current state</button><button onClick={() => setView("target")} aria-pressed={view === "target"} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === "target" ? "bg-[#163e2e] text-white" : "text-slate-700"}`}>Proposed target</button></div></div>
        <p className="mt-3 text-sm text-slate-600">{view === "target" ? "Proposed additions respond to reported missing or partial controls and environment profile. They are not deployed or marked implemented." : "Current state reflects selected components and self-reported control statuses."}</p>
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 md:p-6"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Conceptual architecture · {view === "current" ? "current" : "proposed"}</p><span className="text-xs text-slate-500">Select a component</span></div><div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3"><p className="text-xs font-bold uppercase tracking-wider text-emerald-900">Illustrative relationships · not discovered routes</p>{flowPaths.length ? <div className="mt-3 space-y-2">{flowPaths.map((flow) => <div key={flow.label} className="flex flex-col gap-2 rounded-xl bg-white/80 p-3 sm:flex-row sm:items-center"><b className="min-w-40 text-xs text-slate-600">{flow.label}</b><div className="flex flex-wrap items-center gap-2">{flow.nodes.map((node, index) => <span key={`${flow.label}-${node.id}`} className="contents">{index > 0 && <span aria-hidden="true" className="text-emerald-800">→</span>}{node.external ? <span className="rounded-lg border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-600">{node.name}</span> : <button onClick={() => setSelectedComponent(node.id)} className={`rounded-lg border px-2 py-1 text-xs font-medium ${selectedComponent === node.id ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700"}`}>{node.name}</button>}</span>)}</div></div>)}</div> : <p className="mt-2 text-sm text-slate-600">Select relevant components to display illustrative relationships.</p>}</div><div className="mt-4 space-y-3">
            {boundaryOrder.map((boundary, index) => {
              const items = architectureIds.map(componentById).filter((item): item is SimulatorComponent => item?.boundary === boundary);
              if (!items.length && boundary !== "Workload") return null;
              return <div key={boundary} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-3 md:p-4"><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-[.14em] text-slate-600">{boundary} boundary</h3>{index < boundaryOrder.length - 1 && <span className="hidden text-xs text-slate-400 md:block">↓ trust and telemetry flows</span>}</div>{boundary === "Workload" && <div className="mb-2 inline-flex rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">External users / administrators → workload</div>}<div className="flex flex-wrap gap-2">{items.length ? items.map((item) => <ComponentChip key={item.id} item={item} selected={selectedComponent === item.id} status={statusForComponent(item, state, controls)} onClick={() => setSelectedComponent(item.id)} />) : <span className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">No workload component selected</span>}</div></div>;
            })}
          </div><div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600">Flow is conceptual: identity supports access, network boundaries shape connectivity, workloads access data services, and selected operations components collect telemetry. Actual paths depend on DNS, routing, service settings and tenant configuration.</div></div>
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6" aria-live="polite"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Selected node</p><h3 className="mt-2 text-xl font-semibold">{activeComponent?.name ?? "Select a component"}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{activeComponent?.description ?? "Choose a node in the architecture to see its details."}</p>{activeComponent && <><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Related controls</p><div className="mt-2 space-y-2">{linkedControls.length ? linkedControls.map((item) => <button key={item.id} onClick={() => { setFocusControl(item.id); goTo(`control-${item.id}`); }} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"><span><b className="text-sm">{item.id} · {item.name}</b><span className="mt-1 block text-xs text-slate-500">{item.domain}</span></span><span className={`rounded-full border px-2 py-1 text-[11px] ${statusStyle[state.statuses[item.id] ?? "unknown"]}`}>{controlStatuses.find((option) => option.id === (state.statuses[item.id] ?? "unknown"))?.label}</span></button>) : <p className="text-sm text-slate-500">No current checklist control is directly linked to this component.</p>}</div>{linkedFindings.length > 0 && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3"><b className="text-sm text-rose-900">Potential gap prompts</b>{linkedFindings.map((item) => <p key={item.id} className="mt-1 text-xs leading-5 text-rose-900">{item.severity} · {item.title}</p>)}</div>}<p className="mt-4 text-xs leading-5 text-slate-500">{view === "target" && !state.components.includes(activeComponent.id) ? "Proposed component: not present in your reported current architecture." : "Current-state component selected by you; this is not tenant evidence."}</p></>}</aside>
        </div>
      </div>
    </section>

    <section id="simulator-findings" className="scroll-mt-8 mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-800">04 / Potential gaps and roadmap</p><h2 className="mt-3 text-3xl font-semibold">Turn answers into next actions</h2><p className="mt-3 max-w-3xl leading-7 text-slate-600">Rules flag controls you report as partial or not implemented. Unknown answers appear separately for follow-up, not as findings or passes.</p></div><label className="text-sm font-semibold">Priority<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="ml-2 rounded-xl border border-slate-300 bg-white px-3 py-2"><option>All priorities</option><option>Immediate</option><option>Near-term</option><option>Planned</option></select></label></div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_.62fr]"><div><h3 className="mb-3 text-lg font-semibold">Rule-triggered potential gaps <span className="text-sm font-normal text-slate-500">({filteredFindings.length})</span></h3>{filteredFindings.length ? <div className="space-y-3">{filteredFindings.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.id} · {item.domain}</p><h4 className="mt-1 text-lg font-semibold">{item.title}</h4></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.severity === "High" ? "bg-rose-100 text-rose-800" : item.severity === "Medium" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{item.severity} · {item.priority}</span></div><p className="mt-3 text-sm leading-6 text-slate-700"><b>Rule:</b> {item.reason}</p><p className="mt-2 text-sm leading-6 text-slate-600"><b>Potential impact:</b> {item.impact}</p><p className="mt-2 text-sm leading-6 text-slate-700"><b>Recommended action:</b> {item.remediation}</p><p className="mt-2 text-sm leading-6 text-slate-600"><b>Validate:</b> {item.validation}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">{item.affectedComponents.map((id) => componentById(id)?.name ?? id).join(" · ") || "Review architecture boundary"}</span><button onClick={() => { setSelectedComponent(item.affectedComponents[0] ?? "entra"); setView("current"); goTo("simulator-architecture"); }} className="text-sm font-semibold text-emerald-800 underline">Highlight affected component</button></div><p className="mt-3 text-xs text-slate-500">References: {item.frameworks.join(" · ")} · {simulatorReferenceNote}</p><div className="mt-2 flex flex-wrap gap-3">{item.references.map((ref) => <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-emerald-800 underline">{ref.label} ↗</a>)}</div></article>)}</div> : <div className="rounded-2xl border border-slate-200 bg-white p-6"><h4 className="font-semibold">No reported partial or missing control matches the selected filters.</h4><p className="mt-2 text-sm leading-6 text-slate-600">This is not a pass result. Confirm that relevant controls were assessed and validate each item against configuration and evidence.</p></div>}</div>
        <aside className="space-y-5"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-semibold">Needs assessment</h3><p className="mt-1 text-sm leading-6 text-slate-600">{unknowns.length} applicable controls remain unknown. Confirm scope and collect evidence before concluding.</p><div className="mt-4 space-y-2">{unknowns.slice(0, 8).map((item) => <button key={item.id} onClick={() => { setFocusControl(item.id); goTo(`control-${item.id}`); }} className="block w-full rounded-lg bg-slate-50 px-3 py-2 text-left text-sm hover:bg-amber-50"><b>{item.id}</b> · {item.name}</button>)}{unknowns.length > 8 && <p className="text-xs text-slate-500">+ {unknowns.length - 8} more in the checklist</p>}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-semibold">Suggested sequence</h3><ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600"><li><b className="text-slate-900">Immediate:</b> validate High items and protect privileged access or sensitive exposure paths first.</li><li><b className="text-slate-900">Near term:</b> confirm ownership, network boundaries, data access and centralized activity logging.</li><li><b className="text-slate-900">Planned:</b> improve workload hardening, resilience and detection coverage; agree operational owners.</li></ol><p className="mt-3 text-xs text-slate-500">Priorities are deterministic guidance from the rule set, not an Azure risk score. Consider dependencies, change windows and cost.</p></div></aside></div>
    </section>

    <section className="border-y border-slate-200 bg-[#163e2e] text-white"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-2 md:px-8 md:py-16"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-200">05 / State comparison</p><h2 className="mt-3 text-3xl font-semibold">Current versus proposed</h2><p className="mt-3 leading-7 text-emerald-50/80">The target view adds components suggested by the triggered controls and selected environment. It remains a design proposal until you implement and validate it.</p></div><div className="grid gap-4 sm:grid-cols-2"><ArchitectureSummary title="Current state" ids={state.components} onClick={() => { setView("current"); goTo("simulator-architecture"); }} /><ArchitectureSummary title="Proposed target" ids={targetIds} onClick={() => { setView("target"); goTo("simulator-architecture"); }} /></div></div></section>

    <section id="simulator-report" className="scroll-mt-8 mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16"><div className="grid gap-8 md:grid-cols-[1fr_.8fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-800">06 / Export and references</p><h2 className="mt-3 text-3xl font-semibold">Take the assessment with you</h2><p className="mt-3 max-w-2xl leading-7 text-slate-600">Generate reports from the current browser draft. The report includes answers, potential findings, the proposed architecture, remediation guidance and Microsoft references.</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={() => downloadSimulatorHtmlReport(state)} className="rounded-full bg-[#163e2e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#245a41]">Download HTML report</button><button onClick={() => downloadSimulatorPdfReport(state)} className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold hover:border-slate-500">Download PDF report</button><button onClick={() => { if (window.confirm("Clear this browser's Azure Simulator draft and restore the default example architecture?")) { localStorage.removeItem("meiai-azure-simulator-v1"); setState(initialSimulatorState); setDomainFilter("All domains"); setPriorityFilter("All priorities"); } }} className="rounded-full border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-50">Reset assessment</button></div><p className="mt-3 text-xs text-slate-500">The HTML report can also be printed or saved as PDF in your browser. PDF export uses the existing project PDF libraries.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-semibold">Official references</h3><p className="mt-2 text-sm leading-6 text-slate-600">Use these sources to validate implementation details and current guidance. Framework mappings are indicative topic references only.</p><ul className="mt-4 space-y-3">{[
          ["Azure landing zones · Cloud Adoption Framework", "https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/"],
          ["Azure Well-Architected Framework · Security", "https://learn.microsoft.com/en-us/azure/well-architected/security/"],
          ["Microsoft Cloud Security Benchmark v1", "https://learn.microsoft.com/en-us/security/benchmark/azure/overview-mcsb-v1"],
          ["CIS Microsoft Azure Foundations Benchmark", "https://www.cisecurity.org/benchmark/azure"],
          ["NIST Cybersecurity Framework 2.0", "https://www.nist.gov/cyberframework"],
        ].map(([label, url]) => <li key={url}><a target="_blank" rel="noreferrer" href={url} className="font-medium text-emerald-800 underline">{label} ↗</a></li>)}</ul><p className="mt-4 text-xs leading-5 text-slate-500">A small self-assessment cannot establish conformity, certification or control effectiveness. Confirm the applicable framework version and control text with the publisher.</p></div></div></section>
    <footer className="border-t border-slate-200 bg-white px-5 py-6 text-center text-xs text-slate-500">MeiAI Azure Security Simulator · Local, user-reported simulation · No Azure credentials or tenant access required.</footer>
  </main>;
}

function ComponentChip({ item, selected, status, onClick }: { item: SimulatorComponent; selected: boolean; status?: ControlStatus; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className={`rounded-xl border px-3 py-2 text-left text-sm transition ${selected ? "border-emerald-700 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-700" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}><span className="flex items-center gap-2"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${status ? status === "implemented" ? "bg-emerald-600" : status === "partial" ? "bg-amber-500" : status === "missing" ? "bg-rose-600" : "bg-slate-400" : "bg-emerald-700"}`} />{item.name}{status && <span className="sr-only">, {status}</span>}</span></button>;
}

function statusForComponent(item: SimulatorComponent, state: SimulatorState, controls: ReturnType<typeof getRelevantControls>): ControlStatus {
  const linked = controls.filter((control) => control.affectedComponents.includes(item.id));
  if (!linked.length) return "unknown";
  const statuses = linked.map((control) => state.statuses[control.id] ?? "unknown");
  if (statuses.includes("missing")) return "missing";
  if (statuses.includes("partial")) return "partial";
  if (statuses.every((status) => status === "implemented" || status === "na")) return "implemented";
  return "unknown";
}

function ArchitectureSummary({ title, ids, onClick }: { title: string; ids: string[]; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-2xl border border-white/20 bg-white/10 p-4 text-left hover:bg-white/15"><b>{title}</b><span className="mt-1 block text-xs text-emerald-50/70">{ids.length} conceptual components</span><span className="mt-3 block text-sm leading-6 text-white">{boundaryOrder.map((boundary) => ({ boundary, count: ids.map(componentById).filter((item) => item?.boundary === boundary).length })).filter((row) => row.count > 0).map((row) => `${row.boundary} ${row.count}`).join(" · ") || "No selected components"}</span></button>;
}
