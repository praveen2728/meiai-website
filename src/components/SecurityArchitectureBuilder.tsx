"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  simulatorComponents,
  simulatorControls,
  type ControlStatus,
  type PlatformScope,
  type RelationshipKind,
  type SimulatorComponent,
  type SimulatorFinding,
  type SimulatorState,
  type WorkloadProfile,
} from "@/lib/azureSimulator";
import { capabilityLicenseStatus } from "@/lib/m365SecurityData";
import { iconPathFor } from "@/lib/architectureIconRegistry";
import { downloadArchitectureJson, downloadArchitecturePdf, downloadArchitecturePng, downloadArchitectureSvg, validateArchitectureImport } from "@/lib/architectureExport";
import { learnArticleByComponent, learnArticleByQuestion } from "@/lib/learnContent";
import Link from "next/link";
import { isCompatibleRelationship } from "@/lib/architectureRelationshipRules";

type View = "current" | "target" | "changes";
const profileLabels: Record<WorkloadProfile, string> = { "web-app": "Web application", "data-analytics": "Data platform", containers: "Containers", "identity-centric": "Identity-centric", "hybrid-workloads": "Hybrid workloads" };
const fallbackLabels: Record<string, string> = { "m365-tenant": "M365", "exchange-online": "EXO", "sharepoint-online": "SPO", onedrive: "OD", teams: "Teams", "defender-xdr": "XDR", "defender-office": "MDO", "defender-endpoint": "MDE", "defender-identity": "MDI", "cloud-apps": "CAS", purview: "MP", "entra-ca": "CA", entra: "ID", "virtual-machines": "VM" };

export default function SecurityArchitectureBuilder({ state, findings, targetIds, selected, onSelect, onUpdate, onClose, onStartAssessment, onReset }: {
  state: SimulatorState;
  findings: SimulatorFinding[];
  targetIds: string[];
  selected: string;
  onSelect: (id: string) => void;
  onUpdate: (patch: Partial<SimulatorState>) => void;
  onClose: () => void;
  onStartAssessment: (draft: SimulatorState) => void;
  onReset: () => void;
}) {
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<PlatformScope>(state.platform ?? "azure");
  const [view, setView] = useState<View>("current");
  const [connectFrom, setConnectFrom] = useState("");
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState("");
  const [reviewMode, setReviewMode] = useState(false);
  const [relationshipKind, setRelationshipKind] = useState<RelationshipKind>("Identity access");
  const [history, setHistory] = useState<SimulatorState[]>([]);
  const [importError, setImportError] = useState("");
  const availableComponents = useMemo(() => simulatorComponents.filter((item) => {
    const itemPlatform = item.platform ?? "azure";
    const matchesPlatform = platformFilter === "combined" || itemPlatform === platformFilter || itemPlatform === "shared";
    const matchesSearch = `${item.name} ${item.description} ${item.boundary}`.toLowerCase().includes(query.toLowerCase());
    return matchesPlatform && matchesSearch;
  }), [platformFilter, query]);
  const visibleIds = view === "current" ? state.components : view === "target" ? targetIds : targetIds.filter((id) => !state.components.includes(id));
  const visible = simulatorComponents.filter((item) => visibleIds.includes(item.id));
  const component = simulatorComponents.find((item) => item.id === selected);
  const related = simulatorControls.filter((item) => item.components.includes(selected) && (!item.platform || item.platform === "shared" || item.platform === (state.platform === "m365" ? "m365" : "azure")));
  const componentFindings = findings.filter((item) => item.affectedComponents.includes(selected));

  function commit(patch: Partial<SimulatorState>) {
    setHistory((current) => [...current.slice(-19), structuredClone(state)]);
    onUpdate(patch);
  }
  async function importArchitecture(file?: File) {
    if (!file) return;
    try {
      const imported = validateArchitectureImport(await file.text());
      commit(imported);
      setPlatformFilter(imported.platform ?? "azure");
      onSelect(imported.components[0] ?? "");
      setImportError("Architecture imported. Review the design before using it.");
    } catch (error) { setImportError(error instanceof Error ? error.message : "Could not import this architecture file."); }
  }
  function exportOptions() {
    return <div className="flex flex-wrap gap-2" aria-label="Download architecture">
      <button onClick={() => downloadArchitectureSvg(state)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">SVG</button>
      <button onClick={() => void downloadArchitecturePng(state).catch((error) => setImportError(error.message))} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">PNG</button>
      <button onClick={() => void downloadArchitecturePdf(state).catch((error) => setImportError(error.message))} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">PDF</button>
      <button onClick={() => downloadArchitectureJson(state)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">JSON</button>
      <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">Import JSON<input className="sr-only" type="file" accept="application/json,.json" onChange={(event) => { void importArchitecture(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
    </div>;
  }
  function switchPlatform(value: PlatformScope) {
    setPlatformFilter(value);
    const components = state.components.filter((id) => {
      const item = simulatorComponents.find((candidate) => candidate.id === id);
      const itemPlatform = item?.platform ?? "azure";
      return value === "combined" || itemPlatform === value || itemPlatform === "shared";
    });
    commit({ platform: value, components, relationships: (state.relationships ?? []).filter((item) => components.includes(item.from) && components.includes(item.to)) });
    if (!components.includes(selected)) onSelect(components[0] ?? "");
  }
  function toggleComponent(id: string) {
    const components = state.components.includes(id) ? state.components.filter((item) => item !== id) : [...state.components, id];
    commit({ components, relationships: (state.relationships ?? []).filter((item) => components.includes(item.from) && components.includes(item.to)) });
    onSelect(id);
  }
  function clickNode(id: string) {
    onSelect(id);
    if (!connectionMode) return;
    if (connectFrom && connectFrom !== id) {
      const from = simulatorComponents.find((item) => item.id === connectFrom);
      const to = simulatorComponents.find((item) => item.id === id);
      const compatible = from && to && isCompatibleRelationship(relationshipKind, from, to);
      if (!compatible) { setConnectionNotice(`That pair does not match “${relationshipKind}”. Choose another destination or change the relationship type.`); return; }
      const duplicate = (state.relationships ?? []).some((item) => item.from === connectFrom && item.to === id && item.kind === relationshipKind);
      if (!duplicate) commit({ relationships: [...(state.relationships ?? []), { id: `${connectFrom}-${relationshipKind}-${id}`, from: connectFrom, to: id, kind: relationshipKind }] });
      setConnectionNotice(duplicate ? "That relationship is already in the design." : "Relationship added. This records intent; it does not verify connectivity.");
      setConnectFrom("");
      setConnectionMode(false);
    } else { setConnectFrom(connectFrom === id ? "" : id); setConnectionNotice(`Source selected: ${simulatorComponents.find((item) => item.id === id)?.name}. Now select a destination.`); }
  }
  function licenseLabel(capability?: string) {
    if (!capability) return "No product license check";
    const status = capabilityLicenseStatus(capability, state.licenses ?? []);
    return status === "potentially-entitled" ? "Potentially entitled · verify assignment and service plan" : status === "verify-add-on" ? "Not in reported baseline · verify add-on or alternative" : "License not reported · confirm capability";
  }

  const groups = ["Identity", "Governance", "Network", "Workload", "Data", "Collaboration", "Endpoint", "Compliance", "Operations"];
  const selectedComponents = state.components.map((id) => simulatorComponents.find((item) => item.id === id)).filter((item): item is SimulatorComponent => Boolean(item));
  const targetOnly = targetIds.filter((id) => !state.components.includes(id));
  const relationshipComponentIds = new Set((state.relationships ?? []).flatMap((item) => [item.from, item.to]));
  const disconnectedComponents = selectedComponents.filter((item) => !relationshipComponentIds.has(item.id));
  if (reviewMode) return <main className="min-h-screen bg-[#f1f4f2] text-slate-900"><header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Architecture design · Step 2 of 2</p><h1 className="text-xl font-semibold">Review your security architecture</h1></div><div className="flex flex-wrap gap-2">{exportOptions()}<button onClick={() => setReviewMode(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">← Edit design</button><button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Save and return</button><button onClick={() => onStartAssessment(state)} className="rounded-lg bg-[#153e2e] px-4 py-2 text-sm font-semibold text-white">Use this design in assessment</button></div></div></header><section className="mx-auto max-w-6xl space-y-5 p-5 md:p-8">{importError && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{importError}</p>}<div className="rounded-3xl bg-white p-6"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">{platformFilter === "m365" ? "Microsoft 365" : platformFilter === "combined" ? "Azure + Microsoft 365" : "Azure"}</p><h2 className="mt-2 text-2xl font-semibold">Design summary</h2><p className="mt-2 text-sm leading-6 text-slate-600">{state.components.length} components · {(state.relationships ?? []).length} relationships you described. This is a conceptual design, not a deployed or validated configuration.</p><p className="mt-2 text-sm leading-6 text-slate-600">{disconnectedComponents.length ? `${disconnectedComponents.length} component${disconnectedComponents.length === 1 ? " has" : "s have"} no relationship described: ${disconnectedComponents.map((item) => item.name).join(", ")}.` : "Every selected component participates in a relationship you described."} No connectivity is inferred from proximity on the canvas.</p></div><div className="grid gap-5 lg:grid-cols-2"><section className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Current design</h2>{selectedComponents.length ? <div className="mt-4 space-y-4">{groups.map((group) => { const items = selectedComponents.filter((item) => item.boundary === group); return items.length ? <div key={group}><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{group}</h3><ul className="mt-2 space-y-2">{items.map((item) => <li key={item.id} className="rounded-lg bg-slate-50 p-3"><b className="text-sm">{item.name}</b><p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p><p className="mt-1 text-xs text-slate-500">Related controls: {item.controls.join(", ") || "None mapped"}</p></li>)}</ul></div> : null; })}</div> : <p className="mt-3 text-sm text-slate-600">No components selected. Return to the builder and add components from the catalogue.</p>}</section><section className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Security decisions and assumptions</h2>{targetOnly.length ? <><p className="mt-2 text-sm text-slate-600">Additional components suggested by the current environment and any assessment responses attached to this design:</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{targetOnly.map((id) => { const item = simulatorComponents.find((component) => component.id === id); const finding = findings.find((candidate) => candidate.targetComponents.includes(id)); return <li key={id} className="py-1"><div className="flex flex-wrap items-center justify-between gap-2"><span><b>{item?.name ?? id}</b>{finding && <span className="block text-xs text-slate-600">Addresses {finding.controlId}: {finding.reason}</span>}{learnArticleByComponent[id] && <Link className="text-xs text-emerald-800 underline" href={`/learn/${learnArticleByComponent[id]}`}>Read related guide →</Link>}</span><button onClick={() => commit({ components: [...new Set([...state.components, id])] })} className="rounded-lg border border-emerald-800 px-3 py-1.5 text-xs font-semibold text-emerald-900">Accept this change</button></div></li>; })}</ul></> : <p className="mt-2 text-sm leading-6 text-slate-600">No additional components are suggested by the current environment or attached answers. You can optionally use this design in the assessment to review applicable controls.</p>}<div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><b>Validation boundary:</b> Components, relationships, license signals and control mappings are user assumptions. They do not prove deployment, entitlement, configuration, effectiveness or compliance. Verify service prerequisites, identity and permissions, network routes, ownership and cost before implementation.</div>{(state.relationships ?? []).length > 0 && <div className="mt-4"><h3 className="font-semibold">Relationships you described</h3><ul className="mt-2 space-y-2 text-sm">{state.relationships!.map((item) => <li key={item.id} className="rounded-lg bg-slate-50 p-3">{simulatorComponents.find((component) => component.id === item.from)?.name} — {item.kind} → {simulatorComponents.find((component) => component.id === item.to)?.name}</li>)}</ul></div>}</section></div></section></main>;
  return <main className="min-h-screen bg-[#f1f4f2] text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6"><div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">← Simulator</button><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Architecture design · Step 1 of 2</p><h1 className="text-lg font-semibold">Design your security architecture</h1></div></div><div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="builder-platform">Platform</label><select id="builder-platform" value={platformFilter} onChange={(event) => switchPlatform(event.target.value as PlatformScope)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="azure">Azure</option><option value="m365">Microsoft 365</option><option value="combined">Azure + Microsoft 365</option></select><select aria-label="Workload profile" value={state.workloads[0] ?? "web-app"} onChange={(event) => commit({ workloads: [event.target.value as WorkloadProfile] })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{Object.entries(profileLabels).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select><button onClick={() => { const previous = history.at(-1); if (previous) { setHistory((items) => items.slice(0, -1)); setPlatformFilter(previous.platform ?? "azure"); onUpdate(previous); } }} disabled={!history.length} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">Undo</button><button onClick={onReset} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Reset</button><button onClick={() => setReviewMode(true)} className="rounded-lg bg-[#153e2e] px-4 py-2 text-sm font-semibold text-white">Review architecture →</button></div></div></header>
    <div className="mx-auto max-w-[1600px] px-4 pt-4 md:px-6">{exportOptions()}{importError && <p role="status" className="mt-2 text-sm text-rose-800">{importError}</p>}</div>
    <div className="mx-auto grid max-w-[1600px] gap-4 p-4 lg:grid-cols-[290px_minmax(0,1fr)_310px] md:p-6">
      <aside className="max-h-[calc(100vh-118px)] overflow-auto rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">Component catalogue</h2><span className="text-xs text-slate-500">{availableComponents.length}</span></div><input aria-label="Search components" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search services" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/><p className="mt-3 text-xs leading-5 text-slate-500">Search and add services to the conceptual canvas. The draft saves in this browser; components do not prove deployment.</p><div className="mt-4 space-y-4">{groups.map((group) => { const items = availableComponents.filter((item) => item.boundary === group); if (!items.length) return null; return <section key={group}><h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{group}</h3><div className="space-y-2">{items.map((item) => { const added = state.components.includes(item.id); return <button key={item.id} onClick={() => toggleComponent(item.id)} aria-pressed={added} className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left transition ${added ? "border-emerald-700 bg-emerald-50" : "border-slate-200 hover:border-slate-400"}`}><ServiceIcon item={item} size="small"/><span className="min-w-0 flex-1"><b className="block text-xs">{item.name}</b><span className="line-clamp-2 text-[10px] leading-4 text-slate-500">{item.description}</span></span><span className="font-bold text-emerald-800">{added ? "✓" : "+"}</span></button>; })}</div></section>; })}</div></aside>
      <section className="min-h-[70vh] rounded-2xl border border-slate-200 bg-white p-4 md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Interactive canvas</p><h2 className="mt-1 text-xl font-semibold">{platformFilter === "azure" ? "Azure environment" : platformFilter === "m365" ? "Microsoft 365 tenant" : "Integrated security architecture"}</h2><p className="mt-1 text-xs text-slate-500">Conceptual design · components and relationships are editable assumptions.</p></div><div className="flex rounded-xl bg-slate-100 p-1" aria-label="Architecture state">{(["current", "target", "changes"] as const).map((key) => <button key={key} aria-pressed={view === key} onClick={() => setView(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === key ? "bg-white shadow-sm" : "text-slate-600"}`}>{key === "current" ? "Current" : key === "target" ? "Recommended" : "Changes only"}</button>)}</div></div>
        <div className="mt-5 rounded-2xl bg-[#f6f8f6] p-3 md:p-5"><div className="flex flex-wrap gap-2 text-[10px] text-slate-500"><span>● Current selection</span><span>◇ Proposed addition</span><span>○ Unknown status</span><span>Connections are relationships you explicitly add</span></div><div className="mt-4 space-y-3">{groups.map((group) => { const items = visible.filter((item) => item.boundary === group); if (!items.length) return null; return <section key={group} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{group} boundary</h3><span className="text-[10px] text-slate-400">{items.length}</span></div><div className="mt-2 flex flex-wrap gap-2">{items.map((item) => { const isTarget = !state.components.includes(item.id); const finding = findings.find((entry) => entry.affectedComponents.includes(item.id)); const status: ControlStatus = finding?.reportedStatus ?? "unknown"; const active = selected === item.id; const connect = connectFrom === item.id; return <div key={item.id} className={`flex min-w-40 items-center gap-2 rounded-xl border p-2 ${active ? "border-emerald-700 ring-1 ring-emerald-700" : connect ? "border-blue-500 ring-1 ring-blue-300" : "border-slate-200"} ${isTarget ? "border-dashed bg-emerald-50" : "bg-white"}`}><button onClick={() => clickNode(item.id)} aria-pressed={active} title={connectionMode ? "Choose this node for the active connection" : "Select this component to inspect details"} className="flex min-w-0 flex-1 items-center gap-2 text-left"><ServiceIcon item={item}/><span className="min-w-0"><b className="block truncate text-xs">{item.name}</b><span className="block text-[10px] text-slate-500">{isTarget ? "Proposed addition" : status === "unknown" ? "Not assessed" : `Reported ${status}`}</span></span></button><button aria-label={`Remove ${item.name}`} onClick={() => toggleComponent(item.id)} className="rounded px-1.5 text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-700">×</button></div>; })}</div></section>; })}{!visible.length && <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="font-semibold text-slate-800">Add your first component from the catalogue.</h3><p className="mt-2 text-sm text-slate-500">Choose a platform above, then search or browse the catalogue on the left.</p></div>}</div>
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><b className="text-xs">Connect components</b><p className="mt-1 text-[10px] text-slate-500">Choose a relationship, then select a source node and a destination node.</p></div><button type="button" aria-pressed={connectionMode} onClick={() => { setConnectionMode((enabled) => !enabled); setConnectFrom(""); setConnectionNotice(connectionMode ? "Connection mode closed." : "Connection mode is on. Choose a source node, then a destination node."); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${connectionMode ? "bg-blue-700 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>{connectionMode ? "Cancel connection" : "Create connection"}</button><select aria-label="Relationship kind" value={relationshipKind} onChange={(event) => setRelationshipKind(event.target.value as RelationshipKind)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">{["Identity access", "Network path", "Data access", "Telemetry"].map((kind) => <option key={kind}>{kind}</option>)}</select></div>{connectionNotice && <p role="status" className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">{connectionNotice}</p>}{(state.relationships ?? []).filter((item) => visibleIds.includes(item.from) && visibleIds.includes(item.to)).map((item) => <div key={item.id} className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"><span>{simulatorComponents.find((entry) => entry.id === item.from)?.name} — {item.kind} → {simulatorComponents.find((entry) => entry.id === item.to)?.name}</span><button onClick={() => commit({ relationships: (state.relationships ?? []).filter((entry) => entry.id !== item.id) })} className="font-semibold text-rose-700">Remove</button></div>)}</div>
        </div><p className="mt-3 text-xs leading-5 text-slate-500">Microsoft service SVGs are used where a permitted official architecture icon is available. Other services use a clearly labelled neutral fallback. No routing, trust or deployment status is inferred from component selection.</p></section>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Properties</p>{component ? <><div className="mt-3 flex items-center gap-3"><ServiceIcon item={component}/><h2 className="text-lg font-semibold">{component.name}</h2></div><p className="mt-3 text-sm leading-6 text-slate-600">{component.description}</p><p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">{state.components.includes(component.id) ? "Included in reported design; configuration remains unverified." : "Proposed component; not part of reported current design."}</p>{learnArticleByComponent[component.id] && <Link href={`/learn/${learnArticleByComponent[component.id]}`} className="mt-3 inline-block text-xs font-semibold text-emerald-800 underline">Learn about {component.name} →</Link>}{componentFindings.length > 0 && <div className="mt-3 rounded-lg bg-amber-50 p-3"><b className="text-xs text-amber-950">Related potential gaps</b>{componentFindings.map((item) => <p key={item.id} className="mt-2 text-xs leading-5 text-amber-950">{item.title} · {item.severity}</p>)}</div>}<h3 className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Related controls</h3><div className="mt-2 space-y-2">{related.map((item) => <div key={item.id} className="rounded-lg border border-slate-200 p-2"><b className="text-xs">{item.id} · {item.name}</b><p className="mt-1 text-[10px] leading-4 text-slate-600">{item.question}</p>{learnArticleByQuestion[item.id] && <Link href={`/learn/${learnArticleByQuestion[item.id]}`} className="mt-1 inline-block text-[10px] font-semibold text-emerald-800 underline">Read implementation guide →</Link>}{item.capability && <p className="mt-1 text-[10px] text-slate-500">{licenseLabel(item.capability)}</p>}</div>)}{!related.length && <p className="text-xs text-slate-500">No control mapping for this component.</p>}</div></> : <p className="mt-3 text-sm leading-6 text-slate-500">Select a node to review its role, related controls and assumptions.</p>}<details className="mt-4 border-t border-slate-200 pt-3"><summary className="cursor-pointer text-xs font-semibold">License and configuration assumptions</summary><p className="mt-2 text-xs leading-5 text-slate-600">License signals are only potential entitlement. Confirm contract, service plan assignment, eligible users, configuration and operational effectiveness in the tenant.</p></details></aside>
    </div>
    <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-[10px] text-slate-500">Saved automatically in this browser · conceptual only · no tenant access or connectivity validation.</footer>
  </main>;
}

function ServiceIcon({ item, size = "normal" }: { item: SimulatorComponent; size?: "small" | "normal" }) {
  const path = iconPathFor(item.id, item.icon);
  const dimension = size === "small" ? "h-8 w-8" : "h-10 w-10";
  if (path) return <Image src={`/architecture-icons/${path}`} alt="" width={40} height={40} className={`${dimension} shrink-0 object-contain`} />;
  const fallback = fallbackLabels[item.icon ?? item.id] ?? item.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 3).toUpperCase();
  return <span title="Neutral fallback: official service icon not present in local registry" aria-label="Neutral Microsoft service icon fallback" className={`${dimension} grid shrink-0 place-items-center rounded-lg border border-slate-300 bg-slate-100 text-[9px] font-bold text-slate-700`}>{fallback}</span>;
}
