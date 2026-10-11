"use client";

import { FormEvent, useEffect, useState } from "react";
import { downloadAssessmentPdf } from "@/lib/assessmentPdf";
import SiteNavigation from "@/components/SiteNavigation";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type Report = { title: string; assessment_id: string; created_at: string; target: string; overall_status: string; summary: Record<string, number>; tests: { test_id: string; test_name: string; status: string; severity: string; finding: string; observed_behavior: string; recommendation: string }[]; limitations: string[] };

function saveReport(report: Report) {
  downloadAssessmentPdf({
    title: report.title,
    assessment_id: report.assessment_id,
    created_at: report.created_at,
    agent: report.target,
    scope: "Authorized external endpoint; response-only assessment scope.",
    overall_status: report.overall_status,
    risk_level: report.overall_status === "FAIL" ? "FINDING OBSERVED" : report.overall_status,
    summary: report.summary,
    tests: report.tests.map((test) => ({
      ...test,
      category: "Black-box endpoint assessment",
      attack: "Prompt from MeiAI's controlled assessment suite (see evidence and observed behavior).",
      evidence: { observed_behavior: test.observed_behavior },
      verdict: {
        finding: test.finding,
        observed_behavior: test.observed_behavior,
        expected_behavior: "The authorized endpoint should not reveal protected information or follow unsafe instructions.",
        root_cause: "The external target's internal implementation is not observable through this connector.",
        impact: test.status === "FAIL" ? "The response matched an unsafe behavior indicator." : "No confirmed unsafe behavior was established by this response-only check.",
        recommendation: test.recommendation,
        retest_criteria: [],
      },
    })),
    limitations: report.limitations,
    exclusions: ["Only the authorized endpoint response was observed; hidden tools, retrieval, and internal authorization were not inspected."],
  });
}

export default function PrivateAssessmentPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [method, setMethod] = useState("POST");
  const [headers, setHeaders] = useState("{}");
  const [requestTemplate, setRequestTemplate] = useState('{\n  "message": "{{message}}"\n}');
  const [responsePath, setResponsePath] = useState("response");
  const [timeout, setTimeoutValue] = useState("20");
  const [configured, setConfigured] = useState(false);
  const [targetLabel, setTargetLabel] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [report, setReport] = useState<Report | null>(null);

  async function api(path: string, init: RequestInit = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) { setAuthenticated(false); setToken(""); }
      throw new Error(body.detail ?? `Request failed (${response.status})`);
    }
    return body;
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`${API_URL}/private-assessment/target`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Owner session expired");
        return response.json();
      })
      .then((data) => { if (!cancelled) { setAuthenticated(true); setConfigured(data.configured); setTargetLabel(data.name ?? ""); } })
      .catch(() => { if (!cancelled) { setToken(""); setAuthenticated(false); } });
    return () => { cancelled = true; };
  }, [token]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`${API_URL}/owner/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail ?? "Login failed");
      setToken(body.session_token); setAuthenticated(true); setPassword("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not sign in"); }
    finally { setBusy(false); }
  }

  async function configure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setReport(null);
    try {
      const secretHeaders = JSON.parse(headers);
      const template = JSON.parse(requestTemplate);
      const data = await api("/private-assessment/target", { method: "POST", body: JSON.stringify({ name: agentName, endpoint, method, headers: secretHeaders, request_template: template, response_path: responsePath, timeout_seconds: Number(timeout) }) });
      setConfigured(true); setTargetLabel(data.name); setHeaders("{}");
      setNotice("Target configuration saved in backend process memory. Header credentials were cleared from this form.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Configuration failed"); }
    finally { setBusy(false); }
  }

  async function runAssessment() {
    setBusy(true); setError(""); setNotice(""); setReport(null);
    try {
      const result = await api("/private-assessment/run", { method: "POST", body: "{}" }) as Report;
      setReport(result); saveReport(result);
      setNotice("Assessment finished. Your private formatted PDF report was downloaded automatically.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Assessment failed"); }
    finally { setBusy(false); }
  }

  async function logout() {
    try {
      if (configured) await api("/private-assessment/target", { method: "DELETE" });
      await api("/owner/logout", { method: "POST" });
    } catch { /* The signed session expires independently. */ }
    setToken(""); setAuthenticated(false); setConfigured(false); setReport(null);
  }

  async function forgetTarget() {
    setBusy(true); setError(""); setNotice("");
    try {
      await api("/private-assessment/target", { method: "DELETE" });
      setConfigured(false); setTargetLabel(""); setReport(null);
      setNotice("Target settings and its credentials were cleared from backend memory.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not clear target"); }
    finally { setBusy(false); }
  }

  return (
    <main id="page-main" tabIndex={-1} className="min-h-screen bg-[#080d18] text-white">
      <SiteNavigation theme="dark" />
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Private · MeiAI owner only</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl font-semibold tracking-tight">Third-party assessment</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Configure an external HTTPS agent, run a small black-box prompt suite, and download a private evidence report.</p></div>{authenticated && <button onClick={logout} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Sign out</button>}</div>
        <div className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm leading-6 text-amber-100/80">Only assess endpoints you own or are explicitly authorized to test. MeiAI sends the listed prompts to the configured endpoint. Credentials are kept in backend process memory and are never included in reports.</div>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm text-red-200">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] p-4 text-sm text-emerald-100">{notice}</p>}

        {!authenticated ? <form onSubmit={login} className="mt-8 max-w-xl rounded-2xl border border-white/10 bg-white/[0.025] p-6"><h2 className="text-lg font-semibold">Owner sign in</h2><p className="mt-2 text-sm text-slate-400">Access is verified by the MeiAI API. The admin password is checked server-side.</p><label className="mt-6 block text-sm text-slate-300" htmlFor="owner-password">Admin password</label><input id="owner-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-cyan-300/40"/><button disabled={busy} className="mt-4 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button></form> : <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <form onSubmit={configure} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">01 · Target setup</p><h2 className="mt-2 text-xl font-semibold">HTTP agent connector</h2><p className="mt-2 text-sm leading-6 text-slate-400">The connector supports HTTPS GET query mappings or POST JSON mappings and a dotted response field path.</p></div>
            <label className="block text-sm text-slate-300">Agent name<input value={agentName} onChange={(event) => setAgentName(event.target.value)} required maxLength={80} placeholder="Support assistant" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-cyan-300/40"/></label>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]"><label className="block text-sm text-slate-300">HTTPS endpoint<input type="url" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} required placeholder="https://api.example.com/chat" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-cyan-300/40"/></label><label className="block text-sm text-slate-300">Method<select value={method} onChange={(event) => setMethod(event.target.value)} className="mt-2 rounded-xl border border-white/10 bg-[#111c2d] px-4 py-3 text-sm"><option>POST</option><option>GET</option></select></label></div>
            <label className="block text-sm text-slate-300">Headers JSON <span className="text-slate-500">(credentials held transiently by API)</span><textarea value={headers} onChange={(event) => setHeaders(event.target.value)} rows={3} spellCheck={false} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs outline-none focus:border-cyan-300/40"/></label>
            <label className="block text-sm text-slate-300">Request mapping JSON <textarea value={requestTemplate} onChange={(event) => setRequestTemplate(event.target.value)} rows={4} spellCheck={false} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs outline-none focus:border-cyan-300/40"/><span className="mt-1 block text-xs text-slate-500">Use <code>{"{{message}}"}</code> wherever the prompt belongs.</span></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-slate-300">Response text path<input value={responsePath} onChange={(event) => setResponsePath(event.target.value)} placeholder="choices.0.message.content" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs outline-none focus:border-cyan-300/40"/></label><label className="block text-sm text-slate-300">Timeout (seconds)<input type="number" min={3} max={30} value={timeout} onChange={(event) => setTimeoutValue(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-cyan-300/40"/></label></div>
            <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-xl border border-cyan-300/30 bg-cyan-300/[0.08] px-5 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-50">{busy ? "Saving…" : "Save target configuration"}</button>{configured && <button type="button" disabled={busy} onClick={forgetTarget} className="rounded-xl border border-red-300/20 px-5 py-3 text-sm text-red-200 hover:bg-red-300/[0.05] disabled:opacity-50">Clear target &amp; credentials</button>}</div>
          </form>
          <div className="space-y-5">
            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">02 · Assessment suite</p><h2 className="mt-2 text-xl font-semibold">Response-only probes</h2><p className="mt-2 text-sm leading-6 text-slate-400">Three prompts probe direct override, system instruction disclosure, and treatment of an untrusted instruction. Internal calls and decisions are not observable through a generic HTTP response.</p><ol className="mt-5 space-y-3 text-sm text-slate-300"><li className="flex gap-3"><span className="text-cyan-300">01</span>Direct instruction override</li><li className="flex gap-3"><span className="text-cyan-300">02</span>System instruction disclosure</li><li className="flex gap-3"><span className="text-cyan-300">03</span>Untrusted instruction handling</li></ol>
              <label className="mt-5 flex items-start gap-3 rounded-xl border border-white/5 bg-black/10 p-3 text-xs leading-5 text-slate-400"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} className="mt-1 accent-cyan-300"/>I own this endpoint or have explicit permission to assess it.</label>
              <button type="button" disabled={!configured || !authorized || busy} onClick={runAssessment} className="mt-4 w-full rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Running assessment…" : `Run assessment${configured ? ` · ${targetLabel}` : ""}`}</button>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#0d1524] p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Connector safeguards</p><ul className="mt-4 space-y-2 text-xs leading-5 text-slate-400"><li>• HTTPS endpoints only; DNS must resolve to public IPs.</li><li>• Redirects disabled, response size capped at 1 MB, timeout capped at 30 seconds.</li><li>• API credentials are not returned by status APIs or written into report evidence.</li><li>• Configuration is in-memory and clears when the backend restarts.</li><li>• Use hosting-level outbound network rules for defense against DNS rebinding.</li></ul></section>
          </div>
        </div>}

        {report && <section className="mt-8 rounded-2xl border border-white/10 bg-[#0d1524] p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">03 · Report</p><h2 className="mt-2 text-2xl font-semibold">{report.overall_status} · {report.target}</h2><p className="mt-2 text-xs text-slate-500">{report.assessment_id} · {new Date(report.created_at).toLocaleString()}</p></div><button onClick={() => saveReport(report)} className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">Download PDF again</button></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{report.tests.map((test) => <article key={test.test_id} className="rounded-xl border border-white/10 p-4"><p className="text-[10px] text-slate-500">{test.test_id} · {test.status}</p><h3 className="mt-2 text-sm font-semibold">{test.finding}</h3><p className="mt-2 text-xs leading-5 text-slate-400">{test.observed_behavior}</p><p className="mt-3 text-xs leading-5 text-cyan-100/70">{test.recommendation}</p></article>)}</div><p className="mt-5 text-xs leading-5 text-amber-100/70">{report.limitations.join(" ")}</p></section>}
      </section>
    </main>
  );
}
