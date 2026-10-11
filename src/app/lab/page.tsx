"use client";

import { useEffect, useState } from "react";
import { downloadAssessmentPdf } from "@/lib/assessmentPdf";
import SiteNavigation from "@/components/SiteNavigation";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

type Agent = {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  status: "available" | "building";
};

type ChatMessage = { role: "user" | "assistant"; content: string };
type AssessmentTestOption = {
  id: string;
  name: string;
  category: string;
  description: string;
};

type AssessmentTest = {
  test_id: string;
  test_name: string;
  category: string;
  attack: string;
  status: "PASS" | "FAIL" | "INCONCLUSIVE" | "ERROR" | "NOT APPLICABLE";
  severity: string;
  evidence: Record<string, unknown>;
  verdict: {
    priority: string;
    finding: string;
    observed_behavior: string;
    expected_behavior: string;
    root_cause: string;
    impact: string;
    recommendation: string;
    recommendations: { priority: string; title: string; action: string; reason: string }[];
    retest_criteria: string[];
  };
};

type AssessmentReport = {
  title: string;
  assessment_id: string;
  created_at: string;
  agent: string;
  scope: string;
  overall_status: string;
  risk_level: string;
  summary: Record<string, number>;
  tests: AssessmentTest[];
  limitations: string[];
  exclusions: string[];
};

const fallbackAgents: Agent[] = [
  {
    id: "alfred",
    name: "Alfred",
    role: "Enterprise Support",
    description: "Synthetic customer support with an intentionally vulnerable legacy bulk-lookup path.",
    capabilities: ["Customer lookup", "Tool calling", "Access control"],
    status: "available",
  },
  {
    id: "jarvis",
    name: "Jarvis",
    role: "Knowledge Assistant",
    description: "Synthetic enterprise retrieval with an intentionally vulnerable direct-ID permission path.",
    capabilities: ["RAG", "Document permissions", "Prompt injection"],
    status: "available",
  },
  {
    id: "tars",
    name: "TARS",
    role: "IT Operations",
    description: "Synthetic IT operations with a simulated restart approval-bypass scenario.",
    capabilities: ["Simulated tools", "Approvals", "Validation"],
    status: "building",
  },
  {
    id: "athena",
    name: "Athena",
    role: "Multi-Agent Research",
    description: "A researcher, analyst, and reviewer pipeline with explicit handoff evidence.",
    capabilities: ["Delegation", "Shared context", "Handoff inspection"],
    status: "building",
  },
  {
    id: "kala",
    name: "kaala",
    role: "Hardened Enterprise Agent",
    description: "A stricter support target with server-side permissions, validation, and audit evidence.",
    capabilities: ["Tool allowlist", "Authorization", "Validation"],
    status: "building",
  },
];

export default function LabPage() {
  const [agents, setAgents] = useState(fallbackAgents);
  const [selectedAgent, setSelectedAgent] = useState(fallbackAgents[0]);
  const [tests, setTests] = useState<AssessmentTestOption[]>([]);
  const [testsAgentId, setTestsAgentId] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [assessment, setAssessment] = useState<AssessmentReport | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/agents`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Agent catalogue unavailable");
        return response.json();
      })
      .then((data: { agents: Agent[] }) => {
        if (cancelled || !data.agents?.length) return;
        setAgents(data.agents);
        setSelectedAgent((current) => data.agents.find((agent) => agent.id === current.id) ?? data.agents[0]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/assessments/tests?agent=${encodeURIComponent(selectedAgent.id)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Assessment tests unavailable");
        return response.json();
      })
      .then((data: { tests: AssessmentTestOption[] }) => {
        if (cancelled) return;
        setTests(data.tests ?? []);
        setSelectedTestId(data.tests?.[0]?.id ?? "");
        setTestsAgentId(selectedAgent.id);
      })
      .catch(() => {
        if (!cancelled) setAssessmentError("Assessment options could not be loaded. Check that the MeiAI API is available.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAgent.id]);

  const selectedTests = testsAgentId === selectedAgent.id ? tests : [];

  function selectAgent(agent: Agent) {
    setSelectedAgent(agent);
    setMessages([]);
    setInput("");
    setError("");
    setAssessment(null);
    setAssessmentError("");
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading || selectedAgent.status !== "available") return;

    setMessages((previous) => [...previous, { role: "user", content: message }]);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, agent: selectedAgent.id }),
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        throw new Error(problem.detail ?? `Request failed (${response.status})`);
      }
      const data = await response.json();
      setMessages((previous) => [...previous, { role: "assistant", content: data.response }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The agent request failed. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  async function runAssessment() {
    if (!selectedTestId || assessmentLoading || !selectedTests.length) return;
    setAssessment(null);
    setAssessmentError("");
    setAssessmentLoading(true);
    try {
      const response = await fetch(`${API_URL}/assessments/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: selectedAgent.id }),
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        throw new Error(problem.detail ?? `Assessment failed (${response.status})`);
      }
      const report = (await response.json()) as AssessmentReport;
      setAssessment(report);
      downloadAssessmentPdf(report);
    } catch (err) {
      setAssessmentError(err instanceof Error ? err.message : "The assessment could not be completed.");
    } finally {
      setAssessmentLoading(false);
    }
  }

  const available = selectedAgent.status === "available";

  return (
    <main id="page-main" tabIndex={-1} className="min-h-screen bg-[#080d18] text-white">
      <SiteNavigation theme="dark" />

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <div className="mb-9 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Controlled demonstration environment</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">AI Lab</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
              Interact with distinct agent architectures, run scoped security tests, and inspect the evidence behind each result.
            </p>
          </div>
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-4 py-3 text-xs leading-5 text-amber-100/75 md:max-w-sm">
            Synthetic data only. Alfred, Jarvis, and TARS include intentionally vulnerable lab scenarios; no real customer systems are connected. Prompts go to Google Gemini, where free-tier content may be used to improve its products. Do not enter real customer data.
          </div>
        </div>

        <div className="grid gap-7 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Agent catalogue</h2>
              <span className="text-xs text-slate-600">{agents.length} environments</span>
            </div>
            <div className="space-y-3">
              {agents.map((agent, index) => {
                const active = selectedAgent.id === agent.id;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => selectAgent(agent)}
                    disabled={loading || assessmentLoading}
                    className={`w-full rounded-xl border p-4 text-left transition ${active ? "border-cyan-300/40 bg-cyan-300/[0.08]" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-3 font-semibold">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs ${active ? "bg-cyan-300/15 text-cyan-200" : "bg-white/5 text-slate-400"}`}>0{index + 1}</span>
                        {agent.name}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wide ${agent.status === "available" ? "bg-emerald-300/10 text-emerald-200" : "bg-white/5 text-slate-500"}`}>
                        {agent.status === "available" ? "Live" : "Building"}
                      </span>
                    </div>
                    <p className="mt-2 pl-12 text-xs text-slate-400">{agent.role}</p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">{agent.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {agent.capabilities.slice(0, 3).map((capability) => (
                        <span key={capability} className="rounded-md border border-white/5 bg-black/10 px-2 py-1 text-[10px] text-slate-500">{capability}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="space-y-6">
            <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d1524]">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 p-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Agent interaction</p>
                  <h2 className="mt-1 text-lg font-semibold">{selectedAgent.name} <span className="font-normal text-slate-500">/ {selectedAgent.role}</span></h2>
                </div>
                <div className="hidden items-center gap-2 text-[10px] uppercase tracking-wider text-slate-600 sm:flex">
                  <span className="text-cyan-300">Interact</span><span>→</span><span>Observe</span><span>→</span><span>Assess</span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
                {!available ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-xl text-slate-400">◈</span>
                    <h3 className="text-lg font-medium">{selectedAgent.name} is being built</h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">This agent will have its own tools, controls, and assessment scenarios. It will become available when those behaviors are implemented and verified.</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] text-xl text-cyan-200">✦</span>
                    <h3 className="text-lg font-medium">Talk to {selectedAgent.name}</h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                      {selectedAgent.id === "alfred"
                        ? "Try: Can you fetch the details of Arun Kumar? Alfred can look up synthetic records; its server-side scope allows demo-user-a to access CUST-1001."
                        : "Try: What does the incident response runbook say? You can also ask for FIN-001 to see document-level access controls."}
                    </p>
                  </div>
                ) : messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-white/[0.04] text-slate-200"}`}>{message.content}</div>
                  </div>
                ))}
                {loading && <p className="text-sm text-slate-500">{selectedAgent.name} is working…</p>}
                {error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-300/[0.06] p-3 text-sm text-red-200">{error}</p>}
              </div>

              <div className="border-t border-white/10 p-4">
                <form onSubmit={sendMessage} className="flex gap-3">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    disabled={!available || loading}
                    placeholder={available ? `Ask ${selectedAgent.name}…` : "This agent is not available yet"}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-40"
                  />
                  <button type="submit" disabled={!available || loading || !input.trim()} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">
                    {loading ? "Working…" : "Send"}
                  </button>
                </form>
                <p className="mt-3 text-center text-[11px] text-slate-600">MeiAI Lab · Synthetic demonstration environment</p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0d1524] p-5 md:p-6">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div className="max-w-xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Assessment console</p>
                  <h2 className="mt-2 text-xl font-semibold">Test observable behavior</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Run the full test suite for this agent. Each case captures the attempted attack, observed evidence, verdict, and remediation guidance.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    aria-label="Assessment test preview"
                    value={selectedTestId}
                    onChange={(event) => setSelectedTestId(event.target.value)}
                    disabled={!available || assessmentLoading || selectedTests.length === 0}
                    className="min-w-56 rounded-xl border border-white/10 bg-[#111c2d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40 disabled:opacity-40"
                  >
                    {selectedTests.length === 0 ? <option value="">Loading assessment tests…</option> : selectedTests.map((test) => <option key={test.id} value={test.id}>{test.id} · {test.name}</option>)}
                  </select>
                  <button type="button" onClick={runAssessment} disabled={!available || !selectedTests.length || assessmentLoading} className="rounded-xl border border-cyan-300/30 bg-cyan-300/[0.08] px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.14] disabled:cursor-not-allowed disabled:opacity-40">
                    {assessmentLoading ? "Assessing…" : `Run full assessment · ${selectedTests.length || "…"} tests`}
                  </button>
                </div>
              </div>
              {selectedTests.length > 0 && <p className="mt-3 text-xs text-slate-600">Preview: {selectedTests.find((test) => test.id === selectedTestId)?.description} The preview does not limit the full-suite run.</p>}
              <p className="mt-3 text-xs text-amber-200/70">Controlled lab note: Alfred&apos;s bulk lookup, Jarvis&apos;s direct document-ID request, and TARS&apos;s simulated restart have intentionally vulnerable paths. All data and operations are synthetic; findings are restricted to this demonstration.</p>
              {assessmentError && <p role="alert" className="mt-4 rounded-xl border border-red-300/20 bg-red-300/[0.06] p-3 text-sm text-red-200">{assessmentError}</p>}

              {assessment && (
                <div className="mt-6 space-y-5 border-t border-white/10 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${assessment.overall_status === "FAIL" ? "bg-red-300/10 text-red-200" : assessment.overall_status === "PASS" ? "bg-emerald-300/10 text-emerald-200" : "bg-amber-300/10 text-amber-100"}`}>{assessment.overall_status}</span>
                      <span className="text-sm text-slate-400">{assessment.agent} · {assessment.tests.length} test</span>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-amber-100">Confirmed risk: {assessment.risk_level}</span>
                      <span className="text-xs text-slate-600">{assessment.assessment_id.slice(0, 8)} · {new Date(assessment.created_at).toLocaleString()}</span>
                    </div>
                    <button type="button" onClick={() => downloadAssessmentPdf(assessment)} className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-300/10">Download PDF report</button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {Object.entries(assessment.summary).map(([status, count]) => (
                      <div key={status} className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">{status}</p>
                        <p className="mt-1 text-xl font-semibold">{count}</p>
                      </div>
                    ))}
                  </div>

                  {assessment.tests.map((result) => (
                    <article key={result.test_id} className="rounded-xl border border-white/10 bg-black/10 p-4 md:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500">{result.test_id} · {result.category}</p>
                          <h3 className="mt-1 font-semibold">{result.verdict.finding}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">{result.status}</span>
                          <span className="text-xs text-slate-500">{result.severity}</span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{result.verdict.observed_behavior}</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500">Expected behavior</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">{result.verdict.expected_behavior}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500">Impact</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">{result.verdict.impact}</p>
                        </div>
                      </div>
                      <div className="mt-4 rounded-lg border border-cyan-300/10 bg-cyan-300/[0.025] p-3">
                        <p className="text-[10px] uppercase tracking-wider text-cyan-200/70">Recommendation · {result.verdict.priority}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{result.verdict.recommendation}</p>
                      </div>
                      <details className="mt-4">
                        <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">Evidence and retest details</summary>
                        <div className="mt-3 space-y-3">
                          <p className="text-xs leading-5 text-slate-400">Root cause: {result.verdict.root_cause}</p>
                          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-black/20 p-3 text-[11px] leading-5 text-slate-400">{JSON.stringify(result.evidence, null, 2)}</pre>
                          <ul className="list-disc space-y-1 pl-5 text-xs leading-5 text-slate-400">{result.verdict.retest_criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
                        </div>
                      </details>
                    </article>
                  ))}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-white/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Limitations</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-400">{assessment.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
                    </div>
                    <div className="rounded-xl border border-white/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Framework mappings</p>
                      <p className="mt-2 text-xs leading-5 text-slate-400">Mappings are planned and not claimed as validated. A MeiAI result does not imply compliance or certification.</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
