"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  simulatorControls,
  simulatorReferenceNote,
  summarizeSimulator,
  workloadProfiles,
  type ControlStatus,
  type EnvironmentProfile,
  type RelationshipKind,
  type SimulatorComponent,
  type SimulatorFinding,
  type SimulatorState,
  type WorkloadProfile,
} from "@/lib/azureSimulator";
import { downloadSimulatorHtmlReport, downloadSimulatorPdfReport } from "@/lib/azureSimulatorReport";
import SecurityArchitectureBuilder from "@/components/SecurityArchitectureBuilder";
import { capabilityCatalogSources, capabilityCatalogVersion, capabilityLicenseStatus, licenseOptions } from "@/lib/m365SecurityData";
import { clearInapplicableDependentAnswers } from "@/lib/securityAssessmentEngine";
import Link from "next/link";
import { learnArticleByQuestion } from "@/lib/learnContent";

type Step = 1 | 2 | 3;
type ComponentCategory = "Identity" | "Network" | "Applications" | "Data" | "Security & monitoring" | "Collaboration" | "Endpoint & compliance";
const CORE_CONTROL_IDS = ["IAM-01", "IAM-02", "NET-02", "NET-03", "DATA-03", "POST-01", "LOG-01", "GOV-01", "M365-IAM-01", "M365-ADM-01", "M365-EXO-01", "M365-SPO-01", "M365-END-01", "M365-DATA-01", "M365-XDR-01"];
const COMPONENT_CATEGORIES: { name: ComponentCategory; ids: string[] }[] = [
  { name: "Identity", ids: ["entra"] },
  { name: "Network", ids: ["vnet", "nsg", "firewall", "waf", "private-endpoint"] },
  { name: "Applications", ids: ["app-service", "virtual-machines", "aks"] },
  { name: "Data", ids: ["sql", "storage", "key-vault"] },
  { name: "Security & monitoring", ids: ["management-groups", "azure-policy", "defender", "log-analytics", "sentinel"] },
  { name: "Collaboration", ids: ["m365-tenant", "exchange-online", "sharepoint-online", "onedrive", "teams"] },
  { name: "Endpoint & compliance", ids: ["defender-xdr", "defender-office", "defender-endpoint", "defender-identity", "cloud-apps", "purview", "intune", "entra-ca"] },
];
const CORE_CATEGORIES = ["Identity and access", "Network security", "Data protection", "Security monitoring", "Cloud governance", "Email and collaboration", "Collaboration and data", "Endpoint security"];
const QUICK_QUESTIONS: Record<string, string> = {
  "IAM-01": "Is MFA enforced for privileged accounts?",
  "IAM-02": "Are administrator permissions limited and reviewed?",
  "NET-02": "Are inbound and outbound network paths restricted?",
  "NET-03": "Are sensitive data services protected from unnecessary public access?",
  "DATA-03": "Are application secrets stored securely?",
  "POST-01": "Is Defender for Cloud configured for this environment?",
  "LOG-01": "Are security-relevant logs collected centrally?",
  "GOV-01": "Are Azure Policy and security standards applied?",
};
const SIMPLE_ANSWERS: { status: ControlStatus; label: string }[] = [
  { status: "implemented", label: "Yes" },
  { status: "partial", label: "Partially" },
  { status: "missing", label: "No" },
  { status: "unknown", label: "Not sure" },
];
const iconFor: Record<string, string> = {
  entra: "ID", "management-groups": "MG", "azure-policy": "P", vnet: "VN", nsg: "NSG", firewall: "FW", waf: "WAF",
  "app-service": "APP", "virtual-machines": "VM", aks: "AKS", sql: "SQL", storage: "ST", "key-vault": "KV",
  "private-endpoint": "PE", defender: "DC", "log-analytics": "LA", sentinel: "SIEM",
};
const quickCategory = (id: string) => id.startsWith("M365-IAM") || id.startsWith("M365-ADM") ? "Identity and access" : id.startsWith("M365-EXO") ? "Email and collaboration" : id.startsWith("M365-SPO") || id.startsWith("M365-OD") || id.startsWith("M365-TEAM") ? "Collaboration and data" : id.startsWith("M365-END") ? "Endpoint security" : id.startsWith("M365-DATA") || id.startsWith("M365-DLP") || id.startsWith("M365-AUD") ? "Data protection" : id.startsWith("M365-XDR") || id.startsWith("M365-CAS") || id.startsWith("M365-ID") || id.startsWith("M365-IR") ? "Security monitoring" : id.startsWith("M365") ? "Cloud governance" : id.startsWith("IAM") ? "Identity and access" : id.startsWith("NET") ? "Network security" : id.startsWith("DATA") ? "Data protection" : id.startsWith("LOG") || id.startsWith("POST") ? "Security monitoring" : "Cloud governance";
const environmentLabel: Record<EnvironmentProfile, string> = {
  startup: "Small Azure environment", "landing-zone": "Enterprise landing zone", hybrid: "Hybrid environment", "multi-subscription": "Multi-subscription environment",
};
const workloadLabel: Record<WorkloadProfile, string> = {
  "web-app": "Web application", "data-analytics": "Data platform", containers: "Containerized application", "identity-centric": "Enterprise workloads", "hybrid-workloads": "Hybrid workloads",
};
const boundaryGroups: { label: ComponentCategory; boundaries: string[] }[] = [
  { label: "Identity", boundaries: ["Identity"] },
  { label: "Network", boundaries: ["Network"] },
  { label: "Applications", boundaries: ["Workload"] },
  { label: "Data", boundaries: ["Data"] },
  { label: "Security & monitoring", boundaries: ["Governance", "Operations"] },
  { label: "Collaboration", boundaries: ["Collaboration"] },
  { label: "Endpoint & compliance", boundaries: ["Endpoint", "Compliance"] },
];
const statusNames: Record<ControlStatus, string> = { implemented: "Reported yes", partial: "Partially", missing: "Reported no", unknown: "Not sure / not assessed", na: "Not applicable" };
const responseLabel = (state: SimulatorState, id: string) => !id ? "No mapped assessment status" : state.statuses[id] && state.statuses[id] !== "unknown" ? statusNames[state.statuses[id]!] : state.skippedQuestions?.includes(id) ? "Skipped · unassessed" : state.unsureQuestions?.includes(id) ? "Not sure · unverified" : "Unanswered · unassessed";

export default function AzureSecuritySimulator({ initialControl, initialComponent }: { initialControl?: string | string[]; initialComponent?: string | string[] }) {
  const [state, setState] = useState<SimulatorState>(initialSimulatorState);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [view, setView] = useState<"current" | "target">("current");
  const [componentCategory, setComponentCategory] = useState<ComponentCategory>("Applications");
  const [activeCategory, setActiveCategory] = useState(CORE_CATEGORIES[0]);
  const [showAdvancedQuestions, setShowAdvancedQuestions] = useState(false);
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState("entra");
  const [relationshipFrom, setRelationshipFrom] = useState("");
  const [relationshipTo, setRelationshipTo] = useState("");
  const [relationshipKind, setRelationshipKind] = useState<RelationshipKind>("Data access");
  const [focusControl, setFocusControl] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderStartOpen, setBuilderStartOpen] = useState(false);
  const [builderDraft, setBuilderDraft] = useState<SimulatorState | null>(null);
  const handledInitialLink = useRef(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("meiai-azure-simulator-v1");
        if (saved) setState(normalizeSimulatorState(JSON.parse(saved)));
        const savedArchitecture = localStorage.getItem("meiai-architecture-draft-v1");
        if (savedArchitecture) setBuilderDraft(normalizeSimulatorState(JSON.parse(savedArchitecture)));
      } catch { /* Ignore a malformed local draft. */ }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem("meiai-azure-simulator-v1", JSON.stringify(state));
  }, [hydrated, state]);
  useEffect(() => {
    if (hydrated && builderDraft) localStorage.setItem("meiai-architecture-draft-v1", JSON.stringify(builderDraft));
  }, [builderDraft, hydrated]);
  useEffect(() => {
    if (!hydrated || handledInitialLink.current) return;
    handledInitialLink.current = true;
    const controlId = Array.isArray(initialControl) ? initialControl[0] : initialControl;
    const componentId = Array.isArray(initialComponent) ? initialComponent[0] : initialComponent;
    window.requestAnimationFrame(() => {
      if (controlId && simulatorControls.some((item) => item.id === controlId)) {
        setStep(2); setShowAdvancedQuestions(true); setFocusControl(controlId);
        setActiveCategory(controlId === "APP-01" ? "Applications and workload security" : quickCategory(controlId));
        window.setTimeout(() => scrollTo(`quick-${controlId}`), 100);
      } else if (componentId && simulatorComponents.some((item) => item.id === componentId)) {
        const component = simulatorComponents.find((item) => item.id === componentId)!;
        const base = builderDraft ?? state;
        const platform = component.platform === "m365" ? "m365" : component.platform === "shared" ? base.platform ?? "azure" : "azure";
        const draft = { ...base, platform, components: [...new Set([...base.components, componentId])] };
        setBuilderDraft(draft); setSelectedComponent(componentId); setBuilderOpen(true);
      }
    });
  }, [hydrated, initialControl, initialComponent, state, builderDraft]);

  const controls = useMemo(() => getRelevantControls(state), [state]);
  const coreControls = useMemo(() => controls.filter((item) => CORE_CONTROL_IDS.includes(item.id)), [controls]);
  const showAllQuestions = showAdvancedQuestions || state.assessmentDepth === "detailed";
  const assessmentControls = state.assessmentDepth === "detailed" ? controls : coreControls;
  const findings = useMemo(() => deriveSimulatorFindings(state), [state]);
  const unknownControls = useMemo(() => getUnknownControls(state), [state]);
  const targetIds = useMemo(() => getTargetComponentIds(state, findings), [state, findings]);
  const summary = useMemo(() => summarizeSimulator(state), [state]);
  const coreIds = new Set(coreControls.map((item) => item.id));
  const coreFindings = findings.filter((item) => coreIds.has(item.controlId));
  const unsureIds = new Set(state.unsureQuestions ?? []);
  const skippedIds = new Set(state.skippedQuestions ?? []);
  const answeredCore = assessmentControls.filter((item) => (state.statuses[item.id] ?? "unknown") !== "unknown" || unsureIds.has(item.id)).length;
  const unknownCore = assessmentControls.filter((item) => (state.statuses[item.id] ?? "unknown") === "unknown" && !unsureIds.has(item.id) && !skippedIds.has(item.id));
  const unsureCore = assessmentControls.filter((item) => unsureIds.has(item.id));
  const skippedCore = assessmentControls.filter((item) => skippedIds.has(item.id));
  const openCore = assessmentControls.filter((item) => (state.statuses[item.id] ?? "unknown") === "unknown");
  const postureLabel = coreFindings.some((item) => item.severity === "High")
    ? "Needs attention"
    : coreFindings.length ? "Improvements recommended"
      : openCore.length ? "Questions still open" : "No gaps reported in answered controls";
  const currentIds = state.components;
  const currentComponent = simulatorComponents.find((item) => item.id === selectedComponent);
  const relatedControls = controls.filter((item) => item.affectedComponents.includes(selectedComponent));
  const relatedFindings = findings.filter((item) => item.affectedComponents.includes(selectedComponent));
  const availableCategories = showAllQuestions
    ? [...new Set([...CORE_CATEGORIES, ...controls.map((item) => item.id === "APP-01" ? "Applications and workload security" : quickCategory(item.id))])]
    : CORE_CATEGORIES;
  const currentCategory = availableCategories.includes(activeCategory) ? activeCategory : availableCategories[0];
  const categoryControls = controls.filter((item) => showAllQuestions || CORE_CONTROL_IDS.includes(item.id)).filter((item) => (item.id === "APP-01" ? "Applications and workload security" : quickCategory(item.id)) === currentCategory);
  const dashboardFindings = showAllFindings ? findings : findings.slice(0, 3);
  const proposedComponents = targetIds.filter((id) => !state.components.includes(id));
  const platformTitle = state.platform === "m365" ? "Microsoft 365 Security" : state.platform === "combined" ? "Azure + Microsoft 365 Security" : "Azure Security";

  function change(patch: Partial<SimulatorState>) { setState((current) => ({ ...current, ...patch })); }
  function toggleWorkload(id: WorkloadProfile) {
    const workloads = state.workloads.includes(id) ? state.workloads.filter((item) => item !== id) : [...state.workloads, id];
    change({ workloads });
  }
  function toggleComponent(id: string) {
    const components = state.components.includes(id) ? state.components.filter((item) => item !== id) : [...state.components, id];
    const relationships = (state.relationships ?? []).filter((item) => components.includes(item.from) && components.includes(item.to));
    change({ components, relationships });
    setSelectedComponent(id);
  }
  function setPlatform(platform: NonNullable<SimulatorState["platform"]>) {
    const azureDefaults = ["entra", "vnet", "nsg", "waf", "app-service", "sql", "storage", "key-vault", "private-endpoint", "defender", "log-analytics"];
    const m365Defaults = ["entra", "m365-tenant", "exchange-online", "sharepoint-online", "onedrive", "teams"];
    const components = platform === "azure" ? azureDefaults : platform === "m365" ? m365Defaults : [...new Set([...azureDefaults, ...m365Defaults])];
    change({ platform, components, relationships: (state.relationships ?? []).filter((item) => components.includes(item.from) && components.includes(item.to)) });
    if (!components.includes(selectedComponent)) setSelectedComponent(components[0] ?? "entra");
    const firstQuestion = platform === "m365" ? "M365-IAM-01" : "IAM-01";
    setActiveCategory(quickCategory(firstQuestion));
    setComponentCategory(platform === "m365" ? "Collaboration" : "Applications");
  }
  function toggleLicense(id: string) {
    const licenses = state.licenses ?? [];
    const next = licenses.includes(id) ? licenses.filter((license) => license !== id) : [...licenses.filter((license) => license !== "unknown" && license !== "custom"), id];
    change({ licenses: next });
  }
  function updateLicensePopulation(id: string, count: number) { change({ licensePopulations: { ...state.licensePopulations, [id]: count } }); }
  function setAnswer(id: string, status: ControlStatus) {
    setState((current) => {
      const next: SimulatorState = { ...current, statuses: { ...current.statuses, [id]: status }, unsureQuestions: status === "unknown" ? [...new Set([...(current.unsureQuestions ?? []).filter((questionId) => questionId !== id), id])] : (current.unsureQuestions ?? []).filter((questionId) => questionId !== id), skippedQuestions: (current.skippedQuestions ?? []).filter((questionId) => questionId !== id) };
      clearInapplicableDependentAnswers(simulatorControls, id, next);
      return next;
    });
  }
  function skipQuestion(id: string) {
    setState((current) => {
      const next: SimulatorState = { ...current, statuses: { ...current.statuses, [id]: "unknown" }, unsureQuestions: (current.unsureQuestions ?? []).filter((questionId) => questionId !== id), skippedQuestions: [...new Set([...(current.skippedQuestions ?? []), id])] };
      clearInapplicableDependentAnswers(simulatorControls, id, next);
      return next;
    });
  }
  function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function begin(mode: "assess" | "build") {
    setStep(1);
    if (mode === "build") { setBuilderStartOpen(true); return; }
    window.setTimeout(() => scrollTo("environment-picker"), 40);
  }
  function startBuilder(mode: "blank" | "assessment" | "resume") {
    const base = mode === "resume" && builderDraft ? structuredClone(builderDraft) : structuredClone(state);
    const draft: SimulatorState = mode === "blank"
      ? { ...base, components: [], relationships: [], statuses: {}, licenses: [], licensePopulations: {}, unsureQuestions: [], skippedQuestions: [] }
      : base;
    setBuilderDraft(draft);
    setSelectedComponent(mode === "blank" ? "" : draft.components[0] ?? "");
    setBuilderOpen(true);
    setBuilderStartOpen(false);
  }
  function updateBuilder(patch: Partial<SimulatorState>) { setBuilderDraft((current) => ({ ...(current ?? state), ...patch })); }
  function addRelationship() {
    if (!relationshipFrom || !relationshipTo || relationshipFrom === relationshipTo) return;
    const relationship = { id: `${relationshipFrom}-${relationshipKind}-${relationshipTo}-${Date.now()}`, from: relationshipFrom, to: relationshipTo, kind: relationshipKind };
    change({ relationships: [...(state.relationships ?? []), relationship] });
  }

  if (builderOpen && builderDraft) {
    const builderFindings = deriveSimulatorFindings(builderDraft);
    return <SecurityArchitectureBuilder state={builderDraft} findings={builderFindings} targetIds={getTargetComponentIds(builderDraft, builderFindings)} selected={selectedComponent} onSelect={setSelectedComponent} onUpdate={updateBuilder} onClose={() => setBuilderOpen(false)} onStartAssessment={(draft) => { setState(draft); setBuilderOpen(false); setStep(2); setActiveCategory(CORE_CATEGORIES.find((item) => getRelevantControls(draft).some((control) => CORE_CONTROL_IDS.includes(control.id) && quickCategory(control.id) === item)) ?? CORE_CATEGORIES[0]); }} onReset={() => { if (window.confirm("Clear this architecture canvas? Your security assessment draft stays unchanged.")) updateBuilder({ components: [], relationships: [] }); }} />;
  }

  return <main className="min-h-screen bg-[#f4f6f3] text-[#14221b]">
    <SiteNavigation />
    <div className="mx-auto max-w-7xl px-5 pb-8 pt-10 md:px-8 md:pt-16">
      <div className="grid items-end gap-8 lg:grid-cols-[1fr_.8fr]">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-800">MeiAI · Cloud security lab</p><h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">Azure + Microsoft 365<br className="hidden sm:block" /> Security Simulator</h1><p className="mt-4 max-w-2xl text-lg leading-7 text-slate-600">Explore your architecture, assess relevant security controls, and compare your reported state with a proposed target.</p>
          <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => begin("assess")} className="rounded-full bg-[#163e2e] px-6 py-3 font-semibold text-white hover:bg-[#245a41]">Assess My Security</button><button onClick={() => begin("build")} className="rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 hover:border-slate-500">Design My Security Architecture</button></div>
          <p className="mt-3 text-xs text-slate-500">Self-assessment from your answers. No Azure or Microsoft 365 tenant connection or live scan.</p>
        </div>
        <ol className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3"><li><span className="text-xs font-bold text-emerald-800">01</span><b className="mt-1 block text-sm">Describe your environment</b></li><li><span className="text-xs font-bold text-emerald-800">02</span><b className="mt-1 block text-sm">Review your posture</b></li><li><span className="text-xs font-bold text-emerald-800">03</span><b className="mt-1 block text-sm">Explore recommended design</b></li></ol>
      </div>
      <div className="mt-10 flex gap-2 overflow-x-auto border-b border-slate-200 pb-3" aria-label="Assessment steps">
        {([[1, "Build your environment"], [2, "Check your controls"], [3, "Security overview"]] as const).map(([number, label]) => <button key={number} disabled={number > step} onClick={() => setStep(number)} aria-current={step === number ? "step" : undefined} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold disabled:cursor-default ${step === number ? "bg-[#163e2e] text-white" : step > number ? "bg-emerald-100 text-emerald-900" : "bg-white text-slate-400"}`}>{number}. {label}</button>)}
      </div>
    </div>

    {step === 1 && <section id="step-content" className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-6">
          <section id="environment-picker" className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 md:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Step 1 / Scope</p><h2 className="mt-2 text-2xl font-semibold">What environment do you want to assess?</h2><p className="mt-2 text-slate-600">The selected platform shapes your service catalogue, licensing assumptions and assessment questions.</p></div><span className="text-xs text-slate-500">{hydrated ? "Draft saved in this browser" : "Loading local draft…"}</span></div>
            <fieldset className="mt-5"><legend className="sr-only">Assessment platform</legend><div className="grid gap-2 sm:grid-cols-3">{([{ id: "azure", name: "Azure", detail: "Cloud infrastructure, workloads and operations." }, { id: "m365", name: "Microsoft 365", detail: "Identity, email, collaboration, devices and data." }, { id: "combined", name: "Azure + Microsoft 365", detail: "An integrated cloud and productivity security view." }] as const).map((option) => <label key={option.id} className={`cursor-pointer rounded-xl border p-3 ${state.platform === option.id ? "border-emerald-700 bg-emerald-50" : "border-slate-200 hover:border-slate-400"}`}><span className="flex items-start gap-2.5"><input type="radio" name="platform" checked={(state.platform ?? "azure") === option.id} onChange={() => setPlatform(option.id)} className="mt-1 accent-emerald-800"/><span><b className="block text-sm">{option.name}</b><span className="mt-1 block text-xs leading-5 text-slate-600">{option.detail}</span></span></span></label>)}</div></fieldset>
            {state.platform !== "m365" && <fieldset className="mt-6"><legend className="text-sm font-semibold">Azure environment profile</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{environmentProfiles.map((item) => <label key={item.id} className={`cursor-pointer rounded-xl border p-3 ${state.environment === item.id ? "border-emerald-700 bg-emerald-50" : "border-slate-200 hover:border-slate-400"}`}><span className="flex items-start gap-2.5"><input type="radio" name="environment" checked={state.environment === item.id} onChange={() => change({ environment: item.id })} className="mt-1 accent-emerald-800"/><span><b className="block text-sm">{environmentLabel[item.id]}</b><span className="mt-1 block text-xs leading-5 text-slate-600">{item.detail}</span></span></span></label>)}</div></fieldset>}
            {(state.platform === "m365" || state.platform === "combined") && <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">Microsoft 365 license and population profile</h3><p className="mt-1 text-xs leading-5 text-slate-600">Choose all suites and add-ons represented in your organization. Mixed users are supported; population counts are approximate and editable.</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">Catalog {capabilityCatalogVersion}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{licenseOptions.map((license) => { const selected = (state.licenses ?? []).includes(license.id); return <label key={license.id} className={`rounded-xl border bg-white p-3 ${selected ? "border-emerald-700" : "border-slate-200"}`}><span className="flex items-start gap-2"><input type="checkbox" checked={selected} onChange={() => toggleLicense(license.id)} className="mt-1 accent-emerald-800"/><span className="min-w-0 flex-1"><b className="block text-xs">{license.name}</b><span className="mt-1 block text-[10px] leading-4 text-slate-500">{license.detail}</span></span></span>{selected && <label className="mt-2 block text-[10px] font-semibold text-slate-600">Approx. users <input type="number" min="0" value={state.licensePopulations?.[license.id] ?? ""} onChange={(event) => updateLicensePopulation(license.id, Math.max(0, Number(event.target.value) || 0))} placeholder="Unknown" className="ml-2 w-24 rounded border border-slate-300 px-2 py-1 text-xs font-normal"/></label>}</label>; })}</div><div className="mt-4 rounded-xl bg-white p-3"><h4 className="text-xs font-bold">Capability signals (not proof of entitlement)</h4><div className="mt-2 grid gap-2 sm:grid-cols-2">{[{ id: "conditional-access", name: "Conditional Access" }, { id: "defender-office-p2", name: "Defender for Office 365 Plan 2" }, { id: "defender-endpoint", name: "Defender for Endpoint" }, { id: "purview-dlp", name: "Purview DLP" }].map((capability) => { const status = capabilityLicenseStatus(capability.id, state.licenses ?? []); return <p key={capability.id} className="text-[10px] leading-4 text-slate-600"><b>{capability.name}:</b> {status === "potentially-entitled" ? "potentially entitled; verify assignment, population and service plan" : status === "verify-add-on" ? "not shown in this reported baseline; verify add-on or alternative" : "license not reported; confirm before tailoring"}</p>; })}</div></div><p className="mt-3 text-[10px] leading-4 text-slate-500">Suites, add-ons, user eligibility and features change. Verify exact rights in your agreement and admin center. {capabilityCatalogSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="ml-2 font-semibold text-emerald-800 underline">{source.label} ↗</a>)}</p></section>}
            <fieldset className="mt-6"><legend className="text-sm font-semibold">Workloads in scope</legend><div className="mt-3 flex flex-wrap gap-2">{workloadProfiles.map((item) => <label key={item.id} className={`cursor-pointer rounded-full border px-3 py-2 text-sm ${state.workloads.includes(item.id) ? "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}><input type="checkbox" checked={state.workloads.includes(item.id)} onChange={() => toggleWorkload(item.id)} className="sr-only"/><span>{state.workloads.includes(item.id) ? "✓ " : "+ "}{workloadLabel[item.id]}</span></label>)}</div></fieldset>
          </section>
          <section id="component-picker" className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 md:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Architecture builder</p><h2 className="mt-2 text-xl font-semibold">Choose your services</h2><p className="mt-1 text-sm text-slate-600">Select a relevant service or open the full workspace to arrange components and define paths.</p></div><div className="flex flex-wrap items-center gap-3"><button onClick={() => setBuilderOpen(true)} className="rounded-full bg-[#163e2e] px-4 py-2 text-sm font-semibold text-white">Open architecture workspace</button><button onClick={() => change({ components: suggestedComponents(state.workloads, state.environment, state.platform ?? "azure"), relationships: [] })} className="text-sm font-semibold text-emerald-800 underline">Use suggested components</button></div></div>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Component categories">{componentCategoriesFor(state.platform ?? "azure").map((category) => <button key={category.name} role="tab" aria-selected={componentCategory === category.name} onClick={() => setComponentCategory(category.name)} className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold ${componentCategory === category.name ? "bg-[#163e2e] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{category.name}</button>)}</div>
            <div role="tabpanel" className="mt-3 grid gap-2 sm:grid-cols-2">{componentOptions(state.workloads, componentCategory, state.platform ?? "azure").map((item) => <ComponentChoice key={item.id} item={item} selected={state.components.includes(item.id)} onClick={() => toggleComponent(item.id)} />)}{componentOptions(state.workloads, componentCategory, state.platform ?? "azure").length === 0 && <p className="col-span-full rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No components match this category and platform.</p>}</div>
            <RelationshipEditor state={state} onChange={(relationships) => change({ relationships })} from={relationshipFrom} to={relationshipTo} kind={relationshipKind} setFrom={setRelationshipFrom} setTo={setRelationshipTo} setKind={setRelationshipKind} onAdd={addRelationship} />
          </section>
        </div>
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 xl:sticky xl:top-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Live preview</p><h2 className="mt-1 text-lg font-semibold">Your architecture</h2><p className="mt-1 text-xs text-slate-500">{state.platform === "m365" ? "Microsoft 365 tenant" : state.platform === "combined" ? environmentLabel[state.environment] + " + Microsoft 365" : environmentLabel[state.environment]} · {state.components.length} components</p></div><span aria-hidden="true" className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900">Draft</span></div><ArchitectureMini state={state} onSelect={setSelectedComponent} /><p className="mt-3 text-xs leading-5 text-slate-500">Conceptual selection only. No tenant configuration or connectivity has been discovered.</p></aside>
      </div>
      <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center"><span className="text-xs text-slate-500">You can change these selections later.</span><button onClick={() => { setStep(2); setActiveCategory(CORE_CATEGORIES[0]); scrollTo("step-content"); }} className="rounded-full bg-[#163e2e] px-6 py-3 font-semibold text-white hover:bg-[#245a41]">Continue to Security Check <span aria-hidden="true">→</span></button></div>
    </section>}

    {step === 2 && <section id="step-content" className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
      <div className="grid gap-6 xl:grid-cols-[.68fr_1.32fr]">
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Step 2 / {state.assessmentDepth === "detailed" ? "Detailed assessment" : "Quick check"}</p><h2 className="mt-2 text-2xl font-semibold">How well is your environment protected?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Choose a quick control set or review all currently applicable questions. “Not sure” remains unverified.</p><div className="mt-5 rounded-xl bg-slate-50 p-4"><div className="flex justify-between text-sm"><b>{answeredCore} of {assessmentControls.length} responses recorded</b><span>{assessmentControls.length ? Math.round(answeredCore / assessmentControls.length * 100) : 0}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${assessmentControls.length ? answeredCore / assessmentControls.length * 100 : 0}%` }} /></div><p className="mt-2 text-xs leading-5 text-slate-600">{unsureCore.length} not sure · {skippedCore.length} skipped · {unknownCore.length} unanswered. Not sure responses remain unverified.</p></div><nav aria-label="Security question categories" className="mt-5 space-y-1">{availableCategories.filter((category) => controls.some((item) => (item.id === "APP-01" ? "Applications and workload security" : quickCategory(item.id)) === category && (showAllQuestions || CORE_CONTROL_IDS.includes(item.id)))).map((category) => { const items = controls.filter((item) => (item.id === "APP-01" ? "Applications and workload security" : quickCategory(item.id)) === category && (showAllQuestions || CORE_CONTROL_IDS.includes(item.id))); const answered = items.filter((item) => (state.statuses[item.id] ?? "unknown") !== "unknown" || unsureIds.has(item.id)).length; const skipped = items.filter((item) => skippedIds.has(item.id)).length; return <button key={category} onClick={() => setActiveCategory(category)} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left text-sm ${currentCategory === category ? "bg-emerald-50 font-semibold text-emerald-950" : "text-slate-700 hover:bg-slate-50"}`}><span>{category}</span><span className="text-right text-xs text-slate-500">{answered}/{items.length}{skipped ? ` · ${skipped} skipped` : ""}</span></button>; })}</nav><button onClick={() => { const next = state.assessmentDepth !== "detailed"; change({ assessmentDepth: next ? "detailed" : "quick" }); setShowAdvancedQuestions(false); }} aria-expanded={showAllQuestions} className="mt-5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{state.assessmentDepth === "detailed" ? "Switch to quick check" : "Open detailed assessment"}</button><p className="mt-3 text-xs leading-5 text-slate-500">Follow-up questions appear only when their platform, selected services, license signal, and parent answer make them relevant. If a parent changes, answers on hidden branches are cleared.</p></aside>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">{currentCategory}</p><h2 className="mt-2 text-2xl font-semibold">A few things to check</h2><p className="mt-2 text-sm text-slate-600">Answer Yes, Partially, No, or Not sure. Choose “Skip for now” to leave it unanswered.</p></div><button onClick={() => setStep(1)} className="text-sm font-semibold text-emerald-800 underline">Edit environment</button></div>
          <div className="mt-5 divide-y divide-slate-100">{categoryControls.map((item) => <article key={item.id} id={`quick-${item.id}`} className={`scroll-mt-4 py-5 first:pt-0 ${focusControl === item.id ? "rounded-xl bg-amber-50 px-4" : ""}`}><p className="text-xs font-semibold text-slate-500">{item.id}</p><h3 className="mt-1 text-base font-semibold">{QUICK_QUESTIONS[item.id] ?? item.question}</h3><div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Answer: ${item.name}`}>{SIMPLE_ANSWERS.map((answer) => <button key={answer.status} onClick={() => setAnswer(item.id, answer.status)} aria-pressed={answer.status === "unknown" ? unsureIds.has(item.id) : (state.statuses[item.id] ?? "unknown") === answer.status} className={`rounded-full border px-3.5 py-2 text-sm font-medium ${(answer.status === "unknown" ? unsureIds.has(item.id) : (state.statuses[item.id] ?? "unknown") === answer.status) ? answerClass(answer.status) : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}>{answer.label}</button>)}</div><button onClick={() => skipQuestion(item.id)} aria-pressed={skippedIds.has(item.id)} className={`mt-2 rounded-full px-3 py-1.5 text-xs font-semibold ${skippedIds.has(item.id) ? "bg-slate-200 text-slate-900" : "text-slate-600 underline"}`}>Skip for now</button>{skippedIds.has(item.id) && <span className="ml-2 text-xs text-slate-500">Skipped · still unassessed</span>}<details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold text-emerald-800">Why this matters</summary><div className="mt-2 space-y-2 leading-6 text-slate-600"><p>{item.whyAsked ?? "This answer helps determine which controls and recommendations apply."}</p><p><b className="text-slate-800">Why it matters:</b> {item.risk}</p><p><b className="text-slate-800">Possible next step:</b> {item.remediation}</p><p><b className="text-slate-800">How to validate:</b> {item.validation}</p>{learnArticleByQuestion[item.id] && <Link href={`/learn/${learnArticleByQuestion[item.id]}`} className="inline-block font-semibold text-emerald-800 underline">Open the implementation guide →</Link>}</div></details>{showAllQuestions && <p className="mt-2 text-[11px] text-slate-500">{item.domain} · {item.frameworks.join(" · ")}</p>}</article>)}{categoryControls.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No questions match this category and selected architecture.</p>}</div>
          <div className="mt-5 flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center"><button onClick={() => setStep(1)} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold">Back</button><button onClick={() => { setStep(3); scrollTo("step-content"); }} className="rounded-full bg-[#163e2e] px-6 py-3 font-semibold text-white hover:bg-[#245a41]">Review results from these answers <span aria-hidden="true">→</span></button></div>
        </div>
      </div>
    </section>}

    {step === 3 && <section id="step-content" className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-7"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Step 3 / Results</p><h2 className="mt-2 text-3xl font-semibold">Your {platformTitle} Overview</h2><p className="mt-2 text-sm text-slate-600">{state.platform !== "m365" ? `${environmentLabel[state.environment]} · ` : ""}{state.workloads.map((id) => workloadLabel[id]).join(", ") || "No workload selected"}</p></div><div className="flex gap-2"><button onClick={() => setStep(1)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">Edit environment</button><button onClick={() => setStep(2)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">Edit answers</button></div></div>
        <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-[#163e2e] p-5 text-white md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Your {platformTitle} Posture</p><h3 className="mt-1 text-2xl font-semibold">{postureLabel}</h3><p className="mt-1 text-sm text-emerald-50/80">Based on your answers. Not a live {state.platform === "m365" ? "Microsoft 365" : state.platform === "combined" ? "Azure or Microsoft 365" : "Azure"} assessment.</p></div><div className="grid grid-cols-3 gap-3 text-center"><SummaryMetric value={`${answeredCore}/${coreControls.length}`} label="Responses incl. not sure" /><SummaryMetric value={String(coreFindings.length)} label="Need attention" /><SummaryMetric value={String(skippedCore.length)} label="Skipped for now" /></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border border-slate-200 p-4"><b className="text-lg">{summary.total}</b><p className="mt-1 text-xs text-slate-500">Applicable controls</p></div><div className="rounded-xl border border-slate-200 p-4"><b className="text-lg">{summary.counts.implemented + summary.counts.partial + summary.counts.missing + summary.counts.unsure + summary.counts.na}</b><p className="mt-1 text-xs text-slate-500">Responses recorded, including not sure</p></div><div className="rounded-xl border border-slate-200 p-4"><b className="text-lg">{summary.counts.skipped}</b><p className="mt-1 text-xs text-slate-500">Skipped, still unassessed</p></div><div className="rounded-xl border border-slate-200 p-4"><b className="text-lg">{summary.counts.unknown}</b><p className="mt-1 text-xs text-slate-500">Unanswered, not counted as passes</p></div></div>
      </div>

      <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 md:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Architecture canvas</p><h3 className="mt-2 text-2xl font-semibold">Your environment, at a glance</h3><p className="mt-2 text-sm text-slate-600">Conceptual architecture based on your selections — not discovered Azure configuration.</p></div><div className="flex rounded-full border border-slate-300 p-1"><button onClick={() => setView("current")} aria-pressed={view === "current"} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === "current" ? "bg-[#163e2e] text-white" : "text-slate-600"}`}>Current State</button><button onClick={() => setView("target")} aria-pressed={view === "target"} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === "target" ? "bg-[#163e2e] text-white" : "text-slate-600"}`}>Recommended State</button></div></div>
        {view === "target" && <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950"><b>Recommended changes:</b> {proposedComponents.length ? `Consider adding ${proposedComponents.map((id) => componentById(id)?.name ?? id).join(", ")}.` : coreFindings.length ? "Review the reported controls and configuration; the component list does not show a required addition." : "No component changes are suggested by your reported answers."} This is a proposal, not a deployed or verified configuration.</div>}
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_.62fr]"><ArchitectureCanvas ids={view === "current" ? currentIds : targetIds} currentIds={currentIds} state={state} controls={controls} findings={findings} selected={selectedComponent} onSelect={setSelectedComponent} /><ComponentDetails component={currentComponent} state={state} controls={relatedControls} findings={relatedFindings} onControl={(id) => { setStep(2); setActiveCategory(CORE_CONTROL_IDS.includes(id) ? quickCategory(id) : "Applications and workload security"); setFocusControl(id); window.setTimeout(() => scrollTo(`quick-${id}`), 80); }} /></div>
        {view === "target" && proposedComponents.length > 0 && <p className="mt-4 text-xs leading-5 text-slate-500">Added nodes are proposals only. Existing relationships are shown only when you described them. No new connection or trust path is inferred from a component being present.</p>}
      </div>

      <div className="mt-7 grid gap-7 xl:grid-cols-[1.15fr_.85fr]"><section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-7"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Potential gaps</p><h3 className="mt-2 text-xl font-semibold">What to look at first</h3></div><span className="text-sm text-slate-500">{findings.length} total</span></div>{findings.length ? <div className="mt-4 space-y-3">{dashboardFindings.map((item) => <FindingCard key={item.id} item={item} onHighlight={() => { setSelectedComponent(item.affectedComponents[0] ?? "entra"); scrollTo("architecture-canvas"); }} />)}</div> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">No findings were triggered by answers marked No or Partially. Confirm the unknown answers and validate applicable settings before drawing conclusions.</p>}{findings.length > 3 && <button onClick={() => setShowAllFindings((value) => !value)} className="mt-4 text-sm font-semibold text-emerald-800 underline">{showAllFindings ? "Show top three" : `View all ${findings.length} findings`}</button>}</section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Still to confirm</p><h3 className="mt-2 text-xl font-semibold">Questions still open</h3><p className="mt-2 text-sm leading-6 text-slate-600">Not sure, skipped and unanswered items remain unassessed. They are not findings or passes. Confirm them before making a security decision.</p><div className="mt-4 space-y-2">{openCore.slice(0, 5).map((item) => <button key={item.id} onClick={() => { setStep(2); setActiveCategory(quickCategory(item.id)); window.setTimeout(() => scrollTo(`quick-${item.id}`), 80); }} className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-left text-sm hover:bg-amber-50"><span>{QUICK_QUESTIONS[item.id] ?? item.question}</span><span className="shrink-0 text-xs text-slate-500">{skippedIds.has(item.id) ? "Skipped · review →" : unsureIds.has(item.id) ? "Not sure · review →" : "Answer →"}</span></button>)}{openCore.length === 0 && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">All core questions have a response. Advanced controls may still be unassessed.</p>}{openCore.length > 5 && <button onClick={() => setStep(2)} className="text-sm font-semibold text-emerald-800 underline">Review all {openCore.length} open questions</button>}</div><details className="mt-4 border-t border-slate-200 pt-3"><summary className="cursor-pointer text-sm font-semibold">Show unassessed advanced controls ({unknownControls.filter((item) => !coreIds.has(item.id)).length})</summary><div className="mt-3 space-y-2">{unknownControls.filter((item) => !coreIds.has(item.id)).map((item) => <p key={item.id} className="text-sm text-slate-600"><b>{item.id}</b> · {item.name}</p>)}</div></details></section></div>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Remediation roadmap</p><h3 className="mt-2 text-2xl font-semibold">What to improve next</h3><p className="mt-2 text-sm text-slate-600">Priorities are based on reported answers and the simulator’s deterministic rules.</p><div className="mt-5 grid gap-4 lg:grid-cols-3">{(["Immediate", "Near-term", "Planned"] as const).map((priority) => { const list = findings.filter((item) => item.priority === priority); return <div key={priority} className="rounded-2xl bg-slate-50 p-4"><h4 className="font-semibold">{priority === "Immediate" ? "Fix first" : priority === "Near-term" ? "Improve next" : "Plan ahead"}</h4><div className="mt-3 space-y-3">{list.length ? list.map((item) => <RoadmapItem key={item.id} item={item} />) : <p className="text-sm leading-6 text-slate-500">No reported control gap falls into this group.</p>}</div></div>; })}</div><p className="mt-4 text-xs leading-5 text-slate-500">Validate licensing, cost, service fit, ownership, change windows and dependencies before implementing recommendations.</p></section>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 md:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Detailed assessment and report</p><h3 className="mt-2 text-2xl font-semibold">Technical details when you need them</h3><details className="mt-4 rounded-xl border border-slate-200"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Inspect all applicable controls and framework references ({controls.length})</summary><div className="divide-y divide-slate-100 px-4">{controls.map((item) => <article key={item.id} className="py-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="text-xs text-slate-500">{item.id} · {item.domain}</p><h4 className="mt-1 font-semibold">{QUICK_QUESTIONS[item.id] ?? item.name}</h4><p className="mt-1 text-sm leading-6 text-slate-600">{item.question}</p></div><label className="shrink-0 text-xs font-semibold">Reported answer<select value={state.statuses[item.id] ?? "unknown"} onChange={(event) => setAnswer(item.id, event.target.value as ControlStatus)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">{controlStatuses.filter((option) => option.id !== "na" || state.statuses[item.id] === "na").map((option) => <option key={option.id} value={option.id}>{statusNames[option.id]}</option>)}</select></label></div><details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold text-emerald-800">Implementation and validation details</summary><div className="mt-2 space-y-2 leading-6 text-slate-600"><p><b className="text-slate-800">Risk considered:</b> {item.risk}</p><p><b className="text-slate-800">Suggested remediation:</b> {item.remediation}</p><p><b className="text-slate-800">Validation:</b> {item.validation}</p><p><b className="text-slate-800">Framework topic references:</b> {item.frameworks.join(" · ")}. {simulatorReferenceNote}</p><p className="flex flex-wrap gap-3">{item.references.map((ref) => <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer" className="font-medium text-emerald-800 underline">{ref.label} ↗</a>)}</p></div></details></article>)}</div></details>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5"><p className="max-w-2xl text-xs leading-5 text-slate-500">Reports include the detailed checklist, unknown answers, findings, user-described relationships, recommendations and proposed architecture. Self-assessment only; no tenant queried.</p><div className="flex gap-2"><button onClick={() => setShowReportOptions(true)} className="rounded-full bg-[#163e2e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#245a41]">Download Assessment Report</button><button onClick={() => { if (window.confirm("Clear this browser's simulator draft and restore the example environment?")) { localStorage.removeItem("meiai-azure-simulator-v1"); setState(initialSimulatorState); setStep(1); setShowAdvancedQuestions(false); } }} className="rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">Reset</button></div></div>
      </section>
    </section>}

    {showReportOptions && <div role="presentation" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onClick={(event) => { if (event.target === event.currentTarget) setShowReportOptions(false); }}><section role="dialog" aria-modal="true" aria-labelledby="report-dialog-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Export</p><h2 id="report-dialog-title" className="mt-1 text-xl font-semibold">Download your assessment</h2><p className="mt-2 text-sm leading-6 text-slate-600">Choose a detailed PDF or HTML report from the current answers.</p></div><button aria-label="Close report options" onClick={() => setShowReportOptions(false)} className="h-9 w-9 rounded-full bg-slate-100 text-slate-700">×</button></div><div className="mt-5 space-y-2"><button onClick={() => { downloadSimulatorPdfReport(state); setShowReportOptions(false); }} className="w-full rounded-xl bg-[#163e2e] px-4 py-3 text-left font-semibold text-white">Download PDF report <span className="float-right" aria-hidden="true">↓</span></button><button onClick={() => { downloadSimulatorHtmlReport(state); setShowReportOptions(false); }} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-left font-semibold text-slate-800">Download HTML report <span className="float-right" aria-hidden="true">↓</span></button></div></section></div>}
    {builderStartOpen && <div role="presentation" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onClick={(event) => { if (event.target === event.currentTarget) setBuilderStartOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="builder-start-title" className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Separate architecture workflow</p><h2 id="builder-start-title" className="mt-2 text-2xl font-semibold">How would you like to start?</h2><p className="mt-2 text-sm leading-6 text-slate-600">You can design without completing an assessment. The builder saves its own browser draft; your assessment answers stay separate.</p><div className="mt-5 grid gap-3"><button onClick={() => startBuilder("blank")} className="rounded-2xl bg-[#163e2e] p-4 text-left text-white"><b className="block">Start with a blank canvas</b><span className="mt-1 block text-sm text-emerald-50/90">Choose Azure, Microsoft 365 or combined, then add your own components.</span></button>{builderDraft && <button onClick={() => startBuilder("resume")} className="rounded-2xl border border-slate-300 p-4 text-left"><b className="block">Resume saved architecture draft</b><span className="mt-1 block text-sm text-slate-600">Continue editing the design saved in this browser.</span></button>}<button onClick={() => startBuilder("assessment")} className="rounded-2xl border border-slate-300 p-4 text-left"><b className="block">Start from my assessment design</b><span className="mt-1 block text-sm text-slate-600">Copy the current platform, selected components and reported answers into the builder. The assessment stays unchanged.</span></button></div><button onClick={() => setBuilderStartOpen(false)} className="mt-4 text-sm font-semibold text-slate-600 underline">Cancel</button></section></div>}
    <footer className="border-t border-slate-200 bg-white px-5 py-5 text-center text-xs text-slate-500">MeiAI · Conceptual self-assessment · No Azure credentials or live tenant access required.</footer>
  </main>;
}

function componentCategoriesFor(platform: NonNullable<SimulatorState["platform"]>) {
  return COMPONENT_CATEGORIES.filter((category) => category.ids.some((id) => { const component = simulatorComponents.find((item) => item.id === id); return component && (platform === "combined" || component.platform === "shared" || (component.platform ?? "azure") === platform); }));
}

function componentOptions(workloads: WorkloadProfile[], category: ComponentCategory, platform: NonNullable<SimulatorState["platform"]>) {
  const group = COMPONENT_CATEGORIES.find((item) => item.name === category);
  return simulatorComponents.filter((item) => group?.ids.includes(item.id) && (platform === "combined" || item.platform === "shared" || (item.platform ?? "azure") === platform) && (item.workloads === "all" || item.workloads.some((workload) => workloads.includes(workload))));
}

function suggestedComponents(workloads: WorkloadProfile[], environment: EnvironmentProfile, platform: NonNullable<SimulatorState["platform"]>): string[] {
  const selected = new Set(["entra", "vnet", "nsg", "defender", "log-analytics"]);
  if (workloads.includes("web-app")) ["waf", "app-service", "sql", "storage", "key-vault", "private-endpoint"].forEach((id) => selected.add(id));
  if (workloads.includes("data-analytics")) ["storage", "virtual-machines", "sql", "key-vault", "private-endpoint"].forEach((id) => selected.add(id));
  if (workloads.includes("containers")) ["aks", "storage", "key-vault", "private-endpoint"].forEach((id) => selected.add(id));
  if (workloads.includes("hybrid-workloads")) ["virtual-machines", "storage", "key-vault", "private-endpoint", "azure-policy"].forEach((id) => selected.add(id));
  if (["landing-zone", "multi-subscription"].includes(environment)) ["management-groups", "azure-policy"].forEach((id) => selected.add(id));
  if (platform === "m365" || platform === "combined") ["m365-tenant", "exchange-online", "sharepoint-online", "onedrive", "teams"].forEach((id) => selected.add(id));
  if (platform === "m365") ["vnet", "nsg", "defender", "log-analytics", "waf", "app-service", "sql", "storage", "key-vault", "private-endpoint"].forEach((id) => selected.delete(id));
  if (platform === "combined") ["defender-xdr", "intune"].forEach((id) => selected.add(id));
  return simulatorComponents.filter((item) => selected.has(item.id) && (item.workloads === "all" || item.workloads.some((workload) => workloads.includes(workload)))).map((item) => item.id);
}

function answerClass(status: ControlStatus) {
  if (status === "implemented") return "border-emerald-700 bg-emerald-50 text-emerald-950";
  if (status === "partial") return "border-amber-500 bg-amber-50 text-amber-950";
  if (status === "missing") return "border-rose-600 bg-rose-50 text-rose-900";
  return "border-slate-400 bg-slate-100 text-slate-800";
}

function ComponentChoice({ item, selected, onClick }: { item: SimulatorComponent; selected: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-emerald-700 bg-emerald-50" : "border-slate-200 hover:border-slate-400"}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[10px] font-extrabold ${selected ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-700"}`}>{iconFor[item.id] ?? "AZ"}</span><span><b className="block text-sm">{item.name}</b><span className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</span></span><span className="ml-auto text-sm font-bold text-emerald-800">{selected ? "✓" : "+"}</span></button>;
}

function RelationshipEditor({ state, onChange, from, to, kind, setFrom, setTo, setKind, onAdd }: {
  state: SimulatorState; onChange: (relationships: NonNullable<SimulatorState["relationships"]>) => void;
  from: string; to: string; kind: RelationshipKind; setFrom: (value: string) => void; setTo: (value: string) => void;
  setKind: (value: RelationshipKind) => void; onAdd: () => void;
}) {
  const selected = simulatorComponents.filter((item) => state.components.includes(item.id));
  return <details className="mt-5 rounded-xl border border-slate-200"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Describe relationships (optional)</summary><div className="border-t border-slate-200 p-4"><p className="text-xs leading-5 text-slate-600">Only add a path you intend to exist. This records your design description; it does not verify connectivity.</p>{selected.length >= 2 ? <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold">From<select value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">{selected.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-semibold">To<select value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">{selected.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-semibold">Relationship type<select value={kind} onChange={(event) => setKind(event.target.value as RelationshipKind)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">{(["Identity access", "Network path", "Data access", "Telemetry"] as const).map((item) => <option key={item}>{item}</option>)}</select></label><button onClick={onAdd} disabled={!from || !to || from === to} className="self-end rounded-lg bg-[#163e2e] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Add relationship</button></div> : <p className="mt-3 text-sm text-slate-500">Select at least two components to describe a relationship.</p>}
      {(state.relationships ?? []).length > 0 && <ul className="mt-4 space-y-2">{state.relationships!.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span><b>{componentById(item.from)?.name}</b> <span className="text-slate-500">— {item.kind} →</span> <b>{componentById(item.to)?.name}</b></span><button onClick={() => onChange(state.relationships!.filter((relationship) => relationship.id !== item.id))} className="text-xs font-semibold text-rose-700 underline">Remove</button></li>)}</ul>}
    </div></details>;
}

function ArchitectureMini({ state, onSelect }: { state: SimulatorState; onSelect: (id: string) => void }) {
  return <div className="mt-5 space-y-2">{boundaryGroups.map((group) => { const items = simulatorComponents.filter((item) => group.boundaries.includes(item.boundary) && state.components.includes(item.id)); return <div key={group.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{group.label}</h3><div className="mt-2 flex flex-wrap gap-1.5">{items.length ? items.map((item) => <button key={item.id} onClick={() => onSelect(item.id)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs hover:border-emerald-600">{item.name}</button>) : <span className="text-xs text-slate-400">No component selected</span>}</div></div>; })}{(state.relationships ?? []).length > 0 && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Relationships you described</h3>{state.relationships!.map((item) => <p key={item.id} className="mt-1 text-xs text-emerald-950">{componentById(item.from)?.name} → {componentById(item.to)?.name}</p>)}</div>}</div>;
}

function ArchitectureCanvas({ ids, currentIds, state, controls, findings, selected, onSelect }: {
  ids: string[]; currentIds: string[]; state: SimulatorState; controls: ReturnType<typeof getRelevantControls>;
  findings: SimulatorFinding[]; selected: string; onSelect: (id: string) => void;
}) {
  const relationships = (state.relationships ?? []).filter((item) => ids.includes(item.from) && ids.includes(item.to));
  return <div id="architecture-canvas" className="scroll-mt-4 rounded-2xl border border-slate-200 bg-[#f8faf8] p-4 md:p-6"><div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600"><StatusLegend color="bg-emerald-600" label="Reported yes" /><StatusLegend color="bg-amber-500" label="Partial" /><StatusLegend color="bg-rose-600" label="Reported no / rule triggered" /><StatusLegend color="bg-slate-400" label="Unknown" /></div><div className="mt-4 space-y-3">{boundaryGroups.map((group) => { const items = simulatorComponents.filter((item) => group.boundaries.includes(item.boundary) && ids.includes(item.id)); return <section key={group.label} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-2"><h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">{group.label} boundary</h4><span className="text-[10px] text-slate-400">{items.length} selected</span></div><div className="mt-2 flex flex-wrap gap-2">{items.length ? items.map((item) => { const status = componentStatus(item, state, controls, findings); const proposed = !currentIds.includes(item.id); return <button key={item.id} aria-pressed={selected === item.id} onClick={() => onSelect(item.id)} className={`relative flex min-w-36 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${selected === item.id ? "border-emerald-700 ring-1 ring-emerald-700" : "border-slate-200 hover:border-slate-400"} ${proposed ? "border-dashed bg-emerald-50/50" : "bg-white"}`}><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDot(status)}`} /><span><b className="block">{item.name}</b>{proposed && <span className="text-[10px] font-semibold text-emerald-800">Proposed</span>}</span></button>; }) : <p className="py-1 text-xs text-slate-400">No selected components</p>}</div></section>; })}</div>
    <section className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-3"><h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Relationships described by you</h4><p className="mt-1 text-[11px] text-slate-500">Component selection alone does not imply a connection.</p>{relationships.length ? <div className="mt-2 flex flex-wrap gap-2">{relationships.map((item) => <span key={item.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs"><b>{componentById(item.from)?.name}</b> — {item.kind} → <b>{componentById(item.to)?.name}</b></span>)}</div> : <p className="mt-2 text-xs text-slate-500">No relationships described yet. Add them under Build My Architecture.</p>}</section>
    <p className="mt-3 text-[11px] leading-5 text-slate-500">Component nodes are grouped for readability. The diagram does not infer routing, trust, public exposure, or control effectiveness from a selected service.</p>
  </div>;
}

function componentStatus(item: SimulatorComponent, state: SimulatorState, controls: ReturnType<typeof getRelevantControls>, findings: SimulatorFinding[]): ControlStatus {
  const related = findings.filter((finding) => finding.affectedComponents.includes(item.id));
  if (related.some((finding) => finding.reportedStatus === "missing")) return "missing";
  if (related.some((finding) => finding.reportedStatus === "partial")) return "partial";
  const linked = controls.filter((control) => control.affectedComponents.includes(item.id));
  const statuses = linked.map((control) => state.statuses[control.id] ?? "unknown");
  if (statuses.length && statuses.every((status) => status === "implemented")) return "implemented";
  return "unknown";
}

function statusDot(status: ControlStatus) { return status === "implemented" ? "bg-emerald-600" : status === "partial" ? "bg-amber-500" : status === "missing" ? "bg-rose-600" : "bg-slate-400"; }
function StatusLegend({ color, label }: { color: string; label: string }) { return <span className="inline-flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${color}`} />{label}</span>; }

function ComponentDetails({ component, state, controls, findings, onControl }: { component?: SimulatorComponent; state: SimulatorState; controls: ReturnType<typeof getRelevantControls>; findings: SimulatorFinding[]; onControl: (id: string) => void }) {
  if (!component) return <aside className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Choose a component</h3><p className="mt-2 text-sm text-slate-600">Select an architecture node to see its current status and related controls.</p></aside>;
  const status = componentStatus(component, state, getRelevantControls(state), findings);
  return <aside aria-live="polite" className="h-fit rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Component details</p><h3 className="mt-2 text-xl font-semibold">{component.name}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{component.description}</p><p className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs"><i className={`h-2.5 w-2.5 rounded-full ${statusDot(status)}`} />{responseLabel(state, controls.find((item) => item.affectedComponents.includes(component.id))?.id ?? "")}</p>{!state.components.includes(component.id) && <p className="mt-2 text-xs font-semibold text-emerald-800">Proposed addition · not present in your reported current architecture</p>}<p className="mt-2 text-[11px] leading-5 text-slate-500">Status summarizes your related answers; it is not measured from Azure.</p>
    {findings.length > 0 && <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3"><b className="text-sm text-rose-900">Related potential gaps</b>{findings.map((item) => <p key={item.id} className="mt-1 text-xs leading-5 text-rose-900">{item.severity} · {item.title}</p>)}</div>}
    <div className="mt-4"><b className="text-xs uppercase tracking-wider text-slate-500">Related controls</b>{controls.length ? <ul className="mt-2 space-y-2">{controls.map((item) => <li key={item.id}><button onClick={() => onControl(item.id)} className="w-full rounded-lg bg-slate-50 p-2.5 text-left text-xs hover:bg-emerald-50"><b>{item.id} · {item.name}</b><span className="mt-1 block text-slate-500">{responseLabel(state, item.id)}</span></button></li>)}</ul> : <p className="mt-2 text-xs text-slate-500">No linked checklist controls for this component.</p>}</div>
    <details className="mt-4 border-t border-slate-200 pt-3 text-sm"><summary className="cursor-pointer font-semibold text-emerald-800">Technical notes</summary><div className="mt-2 space-y-2 leading-6 text-slate-600"><p>Review dependencies, identity scope, DNS, routing, service-specific settings, ownership and operational requirements before implementation.</p>{controls.map((item) => <div key={item.id} className="border-t border-slate-100 pt-2"><b>{item.id} · {item.name}</b><p>{item.risk}</p><p><b>Recommended:</b> {item.remediation}</p><p><b>Validate:</b> {item.validation}</p></div>)}</div></details>
  </aside>;
}

function SummaryMetric({ value, label }: { value: string; label: string }) { return <div className="min-w-[76px] rounded-xl bg-white/10 px-3 py-2"><b className="block text-xl">{value}</b><span className="text-[10px] leading-4 text-emerald-50/80">{label}</span></div>; }

function FindingCard({ item, onHighlight }: { item: SimulatorFinding; onHighlight: () => void }) {
  return <article className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.domain}</p><h4 className="mt-1 font-semibold">{friendlyFindingTitle(item)}</h4></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${item.severity === "High" ? "bg-rose-100 text-rose-900" : item.severity === "Medium" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{item.severity} · {item.priority}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p><p className="mt-2 text-sm leading-6"><b>Next:</b> {item.remediation}</p><p className="mt-2 text-xs text-slate-500">Affected: {item.affectedComponents.map((id) => componentById(id)?.name ?? id).join(", ") || "Review the relevant boundary"}</p><div className="mt-3 flex flex-wrap gap-4"><button onClick={onHighlight} className="text-xs font-semibold text-emerald-800 underline">Highlight in architecture</button>{learnArticleByQuestion[item.controlId] && <Link href={`/learn/${learnArticleByQuestion[item.controlId]}`} className="text-xs font-semibold text-emerald-800 underline">Implementation guide →</Link>}<details className="text-xs"><summary className="cursor-pointer font-semibold text-emerald-800">View details</summary><div className="mt-2 max-w-xl space-y-2 leading-5 text-slate-600"><p><b>Finding:</b> {item.id} · {item.title}</p><p><b>Trigger:</b> {item.reason}</p><p><b>Reported status:</b> {statusNames[item.reportedStatus]}</p><p><b>Potential impact:</b> {item.impact}</p><p><b>Validation:</b> {item.validation}</p><p><b>Framework topics:</b> {item.frameworks.join(" · ")}. {simulatorReferenceNote}</p><p className="flex flex-wrap gap-3">{item.references.map((ref) => <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer" className="underline">{ref.label} ↗</a>)}</p></div></details></div></article>;
}

function friendlyFindingTitle(item: SimulatorFinding) {
  const titles: Record<string, string> = { "IAM-01": "Privileged sign-in protection needs attention", "IAM-02": "Administrator access needs review", "NET-02": "Network paths need review", "NET-03": "Data-service reachability needs review", "DATA-03": "Application secrets need review", "POST-01": "Defender for Cloud coverage needs review", "LOG-01": "Central security logging needs review", "GOV-01": "Azure governance needs review" };
  return titles[item.controlId] ?? item.title;
}

function RoadmapItem({ item }: { item: SimulatorFinding }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-3"><h5 className="text-sm font-semibold">{friendlyFindingTitle(item)}</h5><p className="mt-1 text-xs leading-5 text-slate-600">{item.remediation}</p><p className="mt-1 text-[10px] text-slate-500">{item.affectedComponents.map((id) => componentById(id)?.name ?? id).join(", ")}</p><details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-emerald-800">Implementation and validation</summary><div className="mt-2 space-y-2 leading-5 text-slate-600"><p><b>Why:</b> {item.impact}</p><p><b>Validation:</b> {item.validation}</p><p><b>Dependencies:</b> Review service fit, DNS, roles, license and operational ownership as relevant.</p><p><b>Framework topics:</b> {item.frameworks.join(" · ")}</p></div></details></article>;
}

function componentById(id: string) { return simulatorComponents.find((item) => item.id === id); }
