import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  deriveSimulatorFindings,
  environmentProfiles,
  getRelevantControls,
  getTargetComponentIds,
  simulatorComponents,
  simulatorReferenceNote,
  workloadProfiles,
  type Boundary,
  type SimulatorState,
} from "@/lib/azureSimulator";

const boundaryOrder: Boundary[] = ["Identity", "Governance", "Network", "Workload", "Data", "Operations"];
const environmentName = (id: string) => environmentProfiles.find((item) => item.id === id)?.name ?? id;
const workloadNames = (ids: string[]) => ids.map((id) => workloadProfiles.find((item) => item.id === id)?.name ?? id);
const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

export function downloadSimulatorHtmlReport(state: SimulatorState) {
  const findings = deriveSimulatorFindings(state);
  const controls = getRelevantControls(state);
  const target = getTargetComponentIds(state, findings);
  const runId = `AZSIM-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const date = new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
  const grouped = (ids: string[]) => boundaryOrder.map((boundary) => ({ boundary, names: ids.map((id) => simulatorComponents.find((item) => item.id === id)).filter((item) => item?.boundary === boundary).map((item) => item!.name) })).filter((group) => group.names.length);
  const currentRows = grouped(state.components).map((group) => `<tr><th>${escape(group.boundary)}</th><td>${group.names.map(escape).join(" · ")}</td></tr>`).join("");
  const targetRows = grouped(target).map((group) => `<tr><th>${escape(group.boundary)}</th><td>${group.names.map(escape).join(" · ")}</td></tr>`).join("");
  const controlRows = controls.map((item) => `<tr><td>${escape(item.id)}</td><td>${escape(item.name)}</td><td>${escape(item.domain)}</td><td>${escape(item.question)}</td><td>${escape(state.statuses[item.id] ?? "unknown")}</td></tr>`).join("");
  const findingRows = findings.length ? findings.map((item) => `<article class="finding"><h3>${escape(item.id)} · ${escape(item.title)}</h3><p><b>${escape(item.severity)} / ${escape(item.priority)}</b> — ${escape(item.domain)}</p><p><b>Why:</b> ${escape(item.reason)}</p><p><b>Potential impact:</b> ${escape(item.impact)}</p><p><b>Recommended action:</b> ${escape(item.remediation)}</p><p><b>Validation:</b> ${escape(item.validation)}</p><p><b>Framework references:</b> ${escape(item.frameworks.join(" · "))}</p><p>${item.references.map((ref) => `<a href="${escape(ref.url)}">${escape(ref.label)}</a>`).join(" · ")}</p></article>`).join("") : "<p>No rules matched a reported partial or missing control. Unknown controls remain unassessed and are not counted as passes.</p>";
  const links = new Set(controls.flatMap((item) => item.references));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MeiAI Azure Security Simulator Report</title><style>
    :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f3f5f2;color:#17231d;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.page{max-width:1040px;margin:40px auto;padding:48px;background:white;border:1px solid #dce4dd;border-radius:24px;box-shadow:0 12px 40px #17231d12}header{border-bottom:1px solid #dce4dd;padding-bottom:28px}header small,.eyebrow{color:#25684d;font-weight:700;letter-spacing:.13em;text-transform:uppercase}h1{font-size:38px;line-height:1.1;margin:12px 0}h2{font-size:25px;margin:38px 0 14px}h3{font-size:18px;margin:0 0 8px}p{margin:8px 0}.notice{background:#fff8e8;border:1px solid #ead8a8;padding:16px;border-radius:12px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}.metric{background:#f4f6f2;border-radius:12px;padding:16px}.metric b{display:block;font-size:26px}.architecture{width:100%;border-collapse:collapse}.architecture th{width:145px;text-align:left;background:#edf3ed}.architecture td,.architecture th{border:1px solid #dce4dd;padding:12px}.finding{border:1px solid #dce4dd;border-left:5px solid #d38b25;border-radius:12px;padding:18px;margin:12px 0;break-inside:avoid}.finding a,a{color:#146b4a}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #dce4dd;text-align:left;padding:10px;vertical-align:top}th{background:#f4f6f2}footer{border-top:1px solid #dce4dd;margin-top:40px;padding-top:16px;color:#5b6a61;font-size:13px}@media print{body{background:white}.page{margin:0 auto;border:0;box-shadow:none;padding:24px}.finding,table tr{break-inside:avoid}}@media(max-width:700px){.page{margin:0;padding:24px;border-radius:0}.metrics{grid-template-columns:repeat(2,1fr)}h1{font-size:32px}}
    </style></head><body><main class="page"><header><small>MEIAI / CLOUD &amp; AI SECURITY</small><h1>Azure Security Simulator</h1><p>Posture and architecture report · ${escape(runId)}</p><p>Generated ${escape(date)}</p></header>
    <section><h2>Scope and limitations</h2><p><b>Environment:</b> ${escape(environmentName(state.environment))}</p><p><b>Workloads:</b> ${escape(workloadNames(state.workloads).join(", ") || "None selected")}</p><p class="notice">This simulation uses user-reported selections and deterministic rules. No Azure tenant was queried. Findings are potential risks or validation prompts, not verified vulnerabilities. ${escape(simulatorReferenceNote)}</p></section>
    <section><h2>Posture summary</h2><div class="metrics"><div class="metric"><b>${controls.filter((c) => state.statuses[c.id] === "implemented").length}</b>Reported implemented</div><div class="metric"><b>${controls.filter((c) => state.statuses[c.id] === "partial").length}</b>Reported partial</div><div class="metric"><b>${controls.filter((c) => state.statuses[c.id] === "missing").length}</b>Reported missing</div><div class="metric"><b>${controls.filter((c) => !state.statuses[c.id] || state.statuses[c.id] === "unknown").length}</b>Unknown / not assessed</div></div><p>Not-applicable answers are excluded from these four counts and are not treated as passes. No aggregate security score is calculated.</p></section>
    <section><h2>Current-state architecture</h2><table class="architecture"><tbody>${currentRows || "<tr><td>No optional Azure components selected.</td></tr>"}</tbody></table><p>Component choices are conceptual. Statuses reflect your answers and do not represent collected Azure evidence.</p></section>
    <section><h2>Security checklist</h2><table><thead><tr><th>ID</th><th>Control</th><th>Domain</th><th>Assessment question</th><th>Reported status</th></tr></thead><tbody>${controlRows}</tbody></table></section>
    <section><h2>Potential gaps and recommendations</h2>${findingRows}</section>
    <section><h2>Recommended target-state architecture</h2><table class="architecture"><tbody>${targetRows || "<tr><td>No components selected.</td></tr>"}</tbody></table><p>Target-state additions are proposals only. They are not deployed or marked as implemented. Review workload fit, DNS, routing, identity and operating costs before implementation.</p></section>
    <section><h2>Framework references</h2><p>${escape(simulatorReferenceNote)}</p><ul>${[...links].map((ref) => `<li><a href="${escape(ref.url)}">${escape(ref.label)}</a></li>`).join("")}</ul></section>
    <footer>MeiAI · Generated from this browser’s simulator state. Keep the report with your own assessment records; no state is sent to MeiAI.</footer></main></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `meiai-azure-simulator-${runId.toLowerCase()}.html`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function addFlowPage(doc: jsPDF, title: string, componentIds: string[]) {
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
    const names = componentIds.map((id) => simulatorComponents.find((item) => item.id === id)).filter((item) => item?.boundary === boundary).map((item) => item!.name);
    if (boundary === "Identity") names.unshift("Users and administrators", "Microsoft Entra ID");
    return { boundary, names };
  }).filter((group) => group.names.length);
  let y = 44;
  entries.forEach((group, index) => {
    const content = doc.splitTextToSize(group.names.join("  ·  "), 164) as string[];
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
    y += height + 4;
    if (index < entries.length - 1 && y < 270) {
      doc.setDrawColor(37, 104, 77);
      doc.line(105, y - 3, 105, y + 1);
      doc.line(103, y - 1, 105, y + 1);
      doc.line(107, y - 1, 105, y + 1);
      y += 4;
    }
  });
}

export function downloadSimulatorPdfReport(state: SimulatorState) {
  const findings = deriveSimulatorFindings(state);
  const controls = getRelevantControls(state);
  const targetIds = getTargetComponentIds(state, findings);
  const runId = `AZSIM-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: true });
  doc.setFillColor(241, 245, 241);
  doc.rect(0, 0, 210, 297, "F");
  doc.setTextColor(24, 50, 38);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("MEIAI / CLOUD & AI SECURITY", 16, 25);
  doc.setFontSize(27);
  doc.text("Azure Security", 16, 72);
  doc.text("Simulator", 16, 84);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(77, 92, 81);
  doc.text("User-reported posture, potential gaps, and target architecture", 16, 99, { maxWidth: 176 });
  doc.setDrawColor(189, 204, 190);
  doc.line(16, 114, 194, 114);
  doc.setFontSize(10);
  doc.text(`Environment: ${environmentName(state.environment)}`, 16, 128);
  doc.text(`Workloads: ${workloadNames(state.workloads).join(", ") || "None selected"}`, 16, 136, { maxWidth: 178 });
  doc.text(`Run ID: ${runId}`, 16, 149);
  doc.text(`Generated: ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}`, 16, 157);
  doc.setFontSize(9);
  doc.setTextColor(96, 108, 98);
  doc.text(doc.splitTextToSize("Simulation only: this report is based on user-reported selections and deterministic rules. No Azure tenant was queried. A potential gap is not a verified vulnerability, compliance result, or Microsoft Secure Score.", 176) as string[], 16, 175);

  addFlowPage(doc, "Current-state architecture", state.components);
  autoTable(doc, {
    head: [["ID", "Control and assessment question", "Reported status"]],
    body: controls.map((item) => [item.id, `${item.name}\n${item.question}`, state.statuses[item.id] ?? "Unknown / not assessed"]),
    startY: 42,
    margin: { left: 16, right: 16, bottom: 18 },
    styles: { fontSize: 8, cellPadding: 2.2, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [31, 77, 55] },
    rowPageBreak: "avoid",
    didDrawPage: (data) => { if (data.pageNumber === 1) { doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(24, 50, 38); doc.text("Security checklist", 16, 25); } },
  });
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
  addFlowPage(doc, "Recommended target state (proposal)", targetIds);
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
