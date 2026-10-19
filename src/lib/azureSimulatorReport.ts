import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  deriveSimulatorFindings,
  environmentProfiles,
  getRelevantControls,
  getTargetComponentIds,
  simulatorComponents,
  simulatorReferenceNote,
  summarizeSimulator,
  workloadProfiles,
  type Boundary,
  type SimulatorRelationship,
  type SimulatorState,
} from "@/lib/azureSimulator";
import { capabilityCatalogSources, capabilityCatalogVersion, licenseOptions } from "@/lib/m365SecurityData";
import { iconPathFor } from "@/lib/architectureIconRegistry";

const boundaryOrder: Boundary[] = ["Identity", "Governance", "Network", "Workload", "Data", "Collaboration", "Endpoint", "Compliance", "Operations"];
const platformName = (platform: SimulatorState["platform"]) => platform === "m365" ? "Microsoft 365 Security" : platform === "combined" ? "Azure + Microsoft 365 Security" : "Azure Security";
const environmentName = (id: string) => environmentProfiles.find((item) => item.id === id)?.name ?? id;
const componentName = (id: string) => simulatorComponents.find((item) => item.id === id)?.name ?? id;
const workloadNames = (ids: string[]) => ids.map((id) => workloadProfiles.find((item) => item.id === id)?.name ?? id);
const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
const reportedAnswer = (state: SimulatorState, id: string) => state.statuses[id] !== "unknown" && state.statuses[id] ? state.statuses[id] : state.skippedQuestions?.includes(id) ? "Skipped / unassessed" : state.unsureQuestions?.includes(id) ? "Not sure / unassessed" : "Unanswered / unassessed";

async function loadReportIcons(ids: string[]) {
  const result: Record<string, string> = {};
  await Promise.all(ids.map(async (id) => {
    const item = simulatorComponents.find((component) => component.id === id);
    const path = iconPathFor(id, item?.icon);
    if (!path || typeof window === "undefined") return;
    try {
      const response = await fetch(`/architecture-icons/${path}`);
      if (!response.ok) return;
      const svg = await response.text();
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 96; canvas.height = 96;
        const context = canvas.getContext("2d");
        context?.drawImage(image, 0, 0, 96, 96);
        if (context) result[id] = canvas.toDataURL("image/png");
      } finally { URL.revokeObjectURL(url); }
    } catch { /* Keep readable text if an icon cannot be embedded. */ }
  }));
  return result;
}

export async function downloadSimulatorHtmlReport(state: SimulatorState) {
  const findings = deriveSimulatorFindings(state);
  const controls = getRelevantControls(state);
  const summary = summarizeSimulator(state);
  const target = getTargetComponentIds(state, findings);
  const runId = `AZSIM-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const date = new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
  const iconData = await loadReportIcons([...new Set([...state.components, ...target])]);
  const renderArchitecture = (ids: string[]) => boundaryOrder.map((boundary) => {
    const components = ids.map((id) => simulatorComponents.find((item) => item.id === id)).filter((item) => item?.boundary === boundary);
    if (!components.length) return "";
    return `<tr><th>${escape(boundary)}</th><td><div class="nodes">${components.map((item) => `<span class="node">${iconData[item!.id] ? `<img alt="" src="${iconData[item!.id]}">` : ""}${escape(item!.name)}</span>`).join("")}</div></td></tr>`;
  }).join("");
  const currentRows = renderArchitecture(state.components);
  const targetRows = renderArchitecture(target);
  const relationshipRows = (state.relationships ?? []).map((item) => `<tr><td>${escape(componentName(item.from))}</td><td>${escape(item.kind)}</td><td>${escape(componentName(item.to))}</td></tr>`).join("");
  const controlRows = controls.map((item) => `<tr><td>${escape(item.id)}</td><td>${escape(item.name)}</td><td>${escape(item.domain)}</td><td>${escape(item.question)}</td><td>${escape(reportedAnswer(state, item.id))}</td></tr>`).join("");
  const unknownRows = controls.filter((item) => !state.statuses[item.id] || state.statuses[item.id] === "unknown").map((item) => `<tr><td>${escape(item.id)}</td><td>${escape(item.name)}</td><td>${escape(item.question)}</td><td>${escape(reportedAnswer(state, item.id))}</td></tr>`).join("");
  const findingRows = findings.length ? findings.map((item) => `<article class="finding"><h3>${escape(item.id)} · ${escape(item.title)}</h3><p><b>${escape(item.severity)} / ${escape(item.priority)}</b> — ${escape(item.domain)}</p><p><b>Why:</b> ${escape(item.reason)}</p><p><b>Potential impact:</b> ${escape(item.impact)}</p><p><b>Recommended action:</b> ${escape(item.remediation)}</p><p><b>Validation:</b> ${escape(item.validation)}</p><p><b>Framework references:</b> ${escape(item.frameworks.join(" · "))}</p><p>${item.references.map((ref) => `<a href="${escape(ref.url)}">${escape(ref.label)}</a>`).join(" · ")}</p></article>`).join("") : "<p>No rules matched a reported partial or missing control. Unknown controls remain unassessed and are not counted as passes.</p>";
  const links = new Set([...controls.flatMap((item) => item.references), ...(state.licenses?.length ? capabilityCatalogSources : [])]);
  const licenseRows = (state.licenses ?? []).map((id) => { const item = licenseOptions.find((license) => license.id === id); return `<tr><td>${escape(item?.name ?? id)}</td><td>${escape(item?.detail ?? "User reported")}</td><td>${escape(state.licensePopulations?.[id] ?? "Not specified")}</td></tr>`; }).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MeiAI ${escape(platformName(state.platform))} Report</title><style>
    :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f3f5f2;color:#17231d;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.page{max-width:1040px;margin:40px auto;padding:48px;background:white;border:1px solid #dce4dd;border-radius:24px;box-shadow:0 12px 40px #17231d12}header{border-bottom:1px solid #dce4dd;padding-bottom:28px}header small,.eyebrow{color:#25684d;font-weight:700;letter-spacing:.13em;text-transform:uppercase}h1{font-size:38px;line-height:1.1;margin:12px 0}h2{font-size:25px;margin:38px 0 14px}h3{font-size:18px;margin:0 0 8px}p{margin:8px 0}.notice{background:#fff8e8;border:1px solid #ead8a8;padding:16px;border-radius:12px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}.metric{background:#f4f6f2;border-radius:12px;padding:16px}.metric b{display:block;font-size:26px}.architecture{width:100%;border-collapse:collapse}.architecture th{width:145px;text-align:left;background:#edf3ed}.architecture td,.architecture th{border:1px solid #dce4dd;padding:12px}.nodes{display:flex;flex-wrap:wrap;gap:8px}.node{display:inline-flex;align-items:center;gap:6px;border:1px solid #dce4dd;border-radius:9px;padding:6px 9px}.node img{width:24px;height:24px;object-fit:contain}.finding{border:1px solid #dce4dd;border-left:5px solid #d38b25;border-radius:12px;padding:18px;margin:12px 0;break-inside:avoid}.finding a,a{color:#146b4a}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #dce4dd;text-align:left;padding:10px;vertical-align:top}th{background:#f4f6f2}footer{border-top:1px solid #dce4dd;margin-top:40px;padding-top:16px;color:#5b6a61;font-size:13px}@media print{body{background:white}.page{margin:0 auto;border:0;box-shadow:none;padding:24px}.finding,table tr{break-inside:avoid}}@media(max-width:700px){.page{margin:0;padding:24px;border-radius:0}.metrics{grid-template-columns:repeat(2,1fr)}h1{font-size:32px}}
    </style></head><body><main class="page"><header><small>MEIAI / CLOUD &amp; AI SECURITY</small><h1>${escape(platformName(state.platform))} Simulator</h1><p>Posture and architecture report · ${escape(runId)}</p><p>Generated ${escape(date)}</p></header>
    <section><h2>Scope and limitations</h2><p><b>Platform:</b> ${escape(platformName(state.platform))}</p><p><b>Environment:</b> ${escape(environmentName(state.environment))}</p><p><b>Workloads:</b> ${escape(workloadNames(state.workloads).join(", ") || "None selected")}</p><p class="notice">This simulation uses user-reported selections and deterministic rules. No Microsoft 365 or Azure tenant was queried. Findings are potential risks or validation prompts, not verified vulnerabilities. ${escape(simulatorReferenceNote)}</p>${state.licenses?.length ? `<h3>Reported license assumptions</h3><table><thead><tr><th>Plan</th><th>Catalog note</th><th>User population</th></tr></thead><tbody>${licenseRows}</tbody></table><p>Catalog snapshot ${escape(capabilityCatalogVersion)}; suite match means potentially entitled, not assigned, activated, configured, or technically validated.</p>` : ""}</section>
    <section><h2>Posture summary</h2><div class="metrics"><div class="metric"><b>${summary.counts.implemented}</b>Reported implemented</div><div class="metric"><b>${summary.counts.partial}</b>Reported partial</div><div class="metric"><b>${summary.counts.missing}</b>Reported missing</div><div class="metric"><b>${summary.counts.unsure}</b>Not sure</div><div class="metric"><b>${summary.counts.skipped}</b>Skipped</div><div class="metric"><b>${summary.counts.unknown}</b>Unanswered</div></div><p>Not sure, skipped, unanswered and not-applicable items are distinct; none are treated as passes. No aggregate security score is calculated.</p></section>
    <section><h2>Current-state architecture</h2><table class="architecture"><tbody>${currentRows || "<tr><td>No components selected.</td></tr>"}</tbody></table><p>Component choices are conceptual. Statuses reflect your answers and do not represent collected tenant evidence.</p><h3>Self-reported design relationships</h3><table><thead><tr><th>From</th><th>Relationship</th><th>To</th></tr></thead><tbody>${relationshipRows || "<tr><td colspan='3'>No relationships supplied.</td></tr>"}</tbody></table><p>Relationships are user-described conceptual design paths, not discovered or verified routes.</p></section>
    <section><h2>Security checklist</h2><table><thead><tr><th>ID</th><th>Control</th><th>Domain</th><th>Assessment question</th><th>Reported status</th></tr></thead><tbody>${controlRows}</tbody></table></section>
    <section><h2>Still to confirm</h2><p>Not sure, skipped and unanswered entries are unassessed. They are not findings, passes or evidence of a vulnerability.</p><table><thead><tr><th>ID</th><th>Control</th><th>Question</th><th>Response state</th></tr></thead><tbody>${unknownRows || "<tr><td colspan='4'>No unknown answers in applicable controls.</td></tr>"}</tbody></table></section>
    <section><h2>Potential gaps and recommendations</h2>${findingRows}</section>
    <section><h2>Recommended target-state architecture</h2><table class="architecture"><tbody>${targetRows || "<tr><td>No components selected.</td></tr>"}</tbody></table><p>Target-state additions are proposals only. They are not deployed or marked as implemented. Review workload fit, DNS, routing, identity and operating costs before implementation.</p></section>
    <section><h2>Framework references</h2><p>${escape(simulatorReferenceNote)}</p><ul>${[...links].map((ref) => `<li><a href="${escape(ref.url)}">${escape(ref.label)}</a></li>`).join("")}</ul></section>
    <footer>MeiAI · Generated from this browser’s simulator state. Keep the report with your own assessment records; no state is sent to MeiAI.</footer></main></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `meiai-${(state.platform ?? "azure")}-simulator-${runId.toLowerCase()}.html`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function addFlowPage(doc: jsPDF, title: string, componentIds: string[], relationships: SimulatorRelationship[] = [], iconData: Record<string, string> = {}) {
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(24, 50, 38);
  doc.text(title, 16, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(87, 101, 92);
  doc.text("Conceptual component flow · not a deployed Azure diagram", 16, 31);
  const entries = boundaryOrder.map((boundary) => {
    const components = componentIds.map((id) => simulatorComponents.find((item) => item.id === id)).filter((item) => item?.boundary === boundary);
    return { boundary, components };
  }).filter((group) => group.components.length);
  let y = 44;
  entries.forEach((group, index) => {
    const content = doc.splitTextToSize(group.components.map((item) => item!.name).join("  ·  "), 164) as string[];
    const height = Math.max(21, content.length * 4.4 + 10);
    doc.setDrawColor(198, 211, 200);
    doc.setFillColor(index % 2 === 0 ? 244 : 249, index % 2 === 0 ? 247 : 250, index % 2 === 0 ? 244 : 247);
    doc.roundedRect(16, y, 178, height, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(26, 83, 58);
    doc.text(group.boundary, 21, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(49, 65, 55);
    doc.text(content, 21, y + 15);
    group.components.forEach((item, i) => { const icon = iconData[item!.id]; if (icon) { try { doc.addImage(icon, "PNG", 21 + Math.min(i * 12, 156), y + 1.5, 8, 8); } catch { /* Keep the component label if PDF embedding fails. */ } } });
    y += height + 4;
    if (index < entries.length - 1 && y < 270) {
      doc.setDrawColor(37, 104, 77);
      doc.line(105, y - 3, 105, y + 1);
      doc.line(103, y - 1, 105, y + 1);
      doc.line(107, y - 1, 105, y + 1);
      y += 4;
    }
  });
  const inScope = relationships.filter((item) => componentIds.includes(item.from) && componentIds.includes(item.to));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 83, 58);
  doc.text("User-described relationships", 16, Math.min(y + 6, 257));
  const rows = inScope.map((item) => [componentName(item.from), item.kind, componentName(item.to)]);
  autoTable(doc, {
    head: [["From", "Relationship", "To"]],
    body: rows.length ? rows : [["No relationships supplied", "—", "—"]],
    startY: Math.min(y + 10, 262),
    margin: { left: 16, right: 16, bottom: 18 },
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [31, 77, 55] },
  });
}

export async function downloadSimulatorPdfReport(state: SimulatorState) {
  const findings = deriveSimulatorFindings(state);
  const controls = getRelevantControls(state);
  const targetIds = getTargetComponentIds(state, findings);
  const iconData = await loadReportIcons([...new Set([...state.components, ...targetIds])]);
  const runId = `AZSIM-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: true });
  doc.setFillColor(241, 245, 241);
  doc.rect(0, 0, 210, 297, "F");
  doc.setTextColor(24, 50, 38);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("MEIAI / CLOUD & AI SECURITY", 16, 25);
  doc.setFontSize(27);
  doc.text(platformName(state.platform), 16, 72, { maxWidth: 178 });
  doc.text("Simulator", 16, 84);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(77, 92, 81);
  doc.text("User-reported posture, potential gaps, and target architecture", 16, 99, { maxWidth: 176 });
  doc.setDrawColor(189, 204, 190);
  doc.line(16, 114, 194, 114);
  doc.setFontSize(10);
  doc.text(`Environment: ${environmentName(state.environment)}`, 16, 128);
  const coverLicenses = (state.licenses ?? []).map((id) => `${licenseOptions.find((item) => item.id === id)?.name ?? id}${state.licensePopulations?.[id] != null ? ` (~${state.licensePopulations[id]} users)` : ""}`).join(", ") || "Not reported";
  doc.text(`License assumptions: ${coverLicenses}`, 16, 144, { maxWidth: 178 });
  doc.text(`Workloads: ${workloadNames(state.workloads).join(", ") || "None selected"}`, 16, 136, { maxWidth: 178 });
  doc.text(`Run ID: ${runId}`, 16, 154);
  doc.text(`Generated: ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}`, 16, 162);
  doc.setFontSize(9);
  doc.setTextColor(96, 108, 98);
  doc.text(doc.splitTextToSize(`Simulation only: user-reported selections and deterministic rules. No Azure or Microsoft 365 tenant was queried. A potential gap is not a verified vulnerability, compliance result, or Microsoft Secure Score. License catalog snapshot ${capabilityCatalogVersion}; verify exact entitlements and assignment.`, 176) as string[], 16, 180);

  addFlowPage(doc, "Current-state architecture", state.components, state.relationships ?? [], iconData);
  autoTable(doc, {
    head: [["ID", "Control and assessment question", "Reported status"]],
    body: controls.map((item) => [item.id, `${item.name}\n${item.question}`, reportedAnswer(state, item.id)]),
    startY: 42,
    margin: { left: 16, right: 16, bottom: 18 },
    styles: { fontSize: 8, cellPadding: 2.2, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [31, 77, 55] },
    rowPageBreak: "avoid",
    didDrawPage: (data) => { if (data.pageNumber === 1) { doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(24, 50, 38); doc.text("Security checklist", 16, 25); } },
  });
  if (state.licenses?.length) {
    doc.addPage();
    doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(24, 50, 38);
    doc.text("License assumptions and verification", 16, 25);
    autoTable(doc, {
      head: [["Reported plan", "Approx. users", "Catalog note"]],
      body: state.licenses.map((id) => [licenseOptions.find((item) => item.id === id)?.name ?? id, state.licensePopulations?.[id] ?? "Not specified", licenseOptions.find((item) => item.id === id)?.detail ?? "User reported"]),
      startY: 34, margin: { left: 16, right: 16, bottom: 18 },
      styles: { fontSize: 8, cellPadding: 2.2, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [31, 77, 55] }, rowPageBreak: "avoid",
    });
    const refs = capabilityCatalogSources.map((item) => `${item.label}: ${item.url}`);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(70, 82, 74);
    const sourcesY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 42;
    doc.text(doc.splitTextToSize(`Capability catalog ${capabilityCatalogVersion}. A suite match indicates potential entitlement only. Confirm contract terms, eligible user population, assigned service plans, configuration and effective coverage. Sources: ${refs.join("; ")}`, 176) as string[], 16, Math.min(sourcesY + 10, 260));
  }
  const unknownControls = controls.filter((item) => !state.statuses[item.id] || state.statuses[item.id] === "unknown");
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(24, 50, 38);
  doc.text("Still to confirm", 16, 25);
  autoTable(doc, {
    head: [["ID", "Control", "Question", "Response state"]],
    body: unknownControls.length ? unknownControls.map((item) => [item.id, item.name, item.question, reportedAnswer(state, item.id)]) : [["—", "No unknown answers", "No applicable controls remain unassessed in the saved draft.", "—"]],
    startY: 34,
    margin: { left: 16, right: 16, bottom: 18 },
    styles: { fontSize: 8, cellPadding: 2.2, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [31, 77, 55] },
    rowPageBreak: "avoid",
  });
  doc.addPage();
  autoTable(doc, {
    head: [["Finding", "Priority and reason", "Action and validation"]],
    body: findings.length ? findings.map((item) => [`${item.id}\n${item.title}\n${item.domain}`, `${item.severity} · ${item.priority}\n${item.reason}\nPotential impact: ${item.impact}`, `Remediation: ${item.remediation}\nValidation: ${item.validation}\nFrameworks: ${item.frameworks.join(", ")}`]) : [["No rule-triggered gaps", "No applicable control was reported missing or partial.", "Unknown controls remain unassessed and are not counted as passes."]],
    startY: 42,
    margin: { left: 16, right: 16, bottom: 18 },
    styles: { fontSize: 7.5, cellPadding: 2.3, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [31, 77, 55] },
    columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 65 }, 2: { cellWidth: 71 } },
    rowPageBreak: "avoid",
    didDrawPage: (data) => { if (data.pageNumber === 1) { doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(24, 50, 38); doc.text("Potential gaps and remediation", 16, 25); } },
  });
  addFlowPage(doc, "Recommended target state (proposal)", targetIds, state.relationships ?? [], iconData);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(82, 96, 85);
  const targetPage = doc.getNumberOfPages();
  doc.setPage(targetPage);
  doc.text(doc.splitTextToSize("Proposed components are not deployed or treated as implemented. Validate workload fit, identity scope, private DNS, routing, licensing, cost and operational ownership before implementing.", 176) as string[], 16, 273);
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    if (page > 1) {
      doc.setDrawColor(220, 227, 220);
      doc.line(16, 284, 194, 284);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(116, 127, 118);
      doc.text("MeiAI · Simulation based on user input · Verify Microsoft documentation", 16, 289);
      doc.text(`${page} / ${total}`, 194, 289, { align: "right" });
    }
  }
  doc.save(`meiai-azure-simulator-${runId.toLowerCase()}.pdf`);
}
