import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type PdfTest = {
  test_id: string;
  test_name: string;
  category: string;
  attack: string;
  status: string;
  severity: string;
  evidence: Record<string, unknown>;
  verdict: {
    finding: string;
    observed_behavior: string;
    expected_behavior: string;
    root_cause: string;
    impact: string;
    recommendation: string;
    retest_criteria: string[];
  };
};

export type PdfAssessment = {
  title: string;
  assessment_id: string;
  created_at: string;
  agent: string;
  scope: string;
  overall_status: string;
  risk_level: string;
  summary: Record<string, number>;
  tests: PdfTest[];
  limitations: string[];
  exclusions: string[];
};

const clean = (value: unknown) =>
  String(value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/→/g, "->")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");

function addPageFurniture(doc: jsPDF, pageLabel: string) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(31, 52, 75);
    doc.line(15, 14, 195, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(22, 119, 145);
    doc.text("MEIAI  /  AI SECURITY ASSESSMENT", 15, 10);
    doc.setDrawColor(31, 52, 75);
    doc.line(15, 282, 195, 282);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(clean(pageLabel), 15, 288);
    doc.text(`Page ${page} of ${pageCount}`, 195, 288, { align: "right" });
  }
}

export function downloadAssessmentPdf(report: PdfAssessment) {
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 30;
  let y = 25;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text("AI Security Assessment", 15, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(clean(`Built-in MeiAI Lab target: ${report.agent}`), 15, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Assessment", "Run date", "Result", "Confirmed risk"]],
    body: [[
      clean(report.assessment_id),
      clean(new Date(report.created_at).toLocaleString()),
      clean(report.overall_status),
      clean(report.risk_level || "UNASSESSED"),
    ]],
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
    headStyles: { fillColor: [14, 48, 68], textColor: [226, 248, 255] },
    columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 50 }, 2: { cellWidth: 30 }, 3: { cellWidth: 42 } },
    margin: { left: 15, right: 15 },
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  const section = (title: string, text: string) => {
    if (y > 258) { doc.addPage(); y = 24; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(14, 48, 68);
    doc.text(clean(title), 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(clean(text), contentWidth) as string[];
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 24; }
      doc.text(line, 15, y);
      y += 4.4;
    }
    y += 4;
  };

  section("Executive summary", `${report.agent} returned ${report.overall_status}. Confirmed risk level: ${report.risk_level || "UNASSESSED"}. Risk reflects observed FAIL findings; inconclusive or errored tests are not treated as passes.`);
  section("Scope", report.scope);
  section("Status totals", Object.entries(report.summary).map(([status, count]) => `${status}: ${count}`).join("   |   "));

  autoTable(doc, {
    startY: y,
    theme: "striped",
    head: [["Test", "Status / severity", "Finding"]],
    body: report.tests.map((test) => [
      `${clean(test.test_id)}\n${clean(test.test_name)}`,
      `${clean(test.status)}\n${clean(test.severity)}`,
      clean(test.verdict.finding),
    ]),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [14, 48, 68], textColor: [226, 248, 255] },
    columnStyles: { 0: { cellWidth: 64 }, 1: { cellWidth: 31 }, 2: { cellWidth: 85 } },
    margin: { left: 15, right: 15 },
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  for (const test of report.tests) {
    if (y > 248) { doc.addPage(); y = 24; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(clean(`${test.test_id}  |  ${test.status}  |  ${test.severity}`), 15, y);
    y += 6;
    section("Test and category", `${test.test_name} - ${test.category}`);
    section("Attack input", test.attack);
    section("Observed behavior", test.verdict.observed_behavior);
    section("Expected behavior", test.verdict.expected_behavior);
    section("Impact", test.verdict.impact);
    section("Root cause", test.verdict.root_cause);
    section("Recommendation", test.verdict.recommendation);
    const evidenceJson = JSON.stringify(test.evidence, null, 2);
    section("Evidence", evidenceJson.length > 5000 ? `${evidenceJson.slice(0, 5000)}\n[Evidence excerpt truncated at 5,000 characters.]` : evidenceJson);
    if (test.verdict.retest_criteria?.length) section("Retest criteria", test.verdict.retest_criteria.map((item) => `- ${item}`).join("\n"));
  }

  if (report.limitations?.length) section("Limitations", report.limitations.map((item) => `- ${item}`).join("\n"));
  if (report.exclusions?.length) section("Exclusions", report.exclusions.map((item) => `- ${item}`).join("\n"));
  section("Use limitation", "This report covers synthetic MeiAI lab fixtures only. It is not a certification or compliance attestation. Alfred, Jarvis, and TARS include intentionally vulnerable, bounded scenarios; no real customer data or infrastructure is accessed.");

  addPageFurniture(doc, `${report.agent} | ${report.assessment_id}`);
  doc.save(`meiai-${clean(report.agent).toLowerCase()}-${report.assessment_id.slice(0, 8)}.pdf`);
}
