import { jsPDF } from "jspdf";
import {
  initialSimulatorState,
  normalizeSimulatorState,
  simulatorComponents,
  type SimulatorState,
} from "./azureSimulator.ts";

export type ArchitectureDocument = {
  format: "meiai-architecture";
  version: 1;
  exportedAt: string;
  state: Pick<SimulatorState, "platform" | "environment" | "workloads" | "components" | "relationships">;
};

const esc = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const filename = (format: string) => `meiai-architecture-${new Date().toISOString().slice(0, 10)}.${format}`;

export function architectureDocument(state: SimulatorState): ArchitectureDocument {
  return {
    format: "meiai-architecture", version: 1, exportedAt: new Date().toISOString(),
    state: { platform: state.platform ?? "azure", environment: state.environment, workloads: [...state.workloads], components: [...state.components], relationships: (state.relationships ?? []).map(({ id, from, to, kind }) => ({ id, from, to, kind })) },
  };
}

export function validateArchitectureImport(raw: string): SimulatorState {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("This file is not valid JSON."); }
  if (!parsed || typeof parsed !== "object") throw new Error("The file must contain a MeiAI architecture object.");
  const document = parsed as Partial<ArchitectureDocument>;
  if (document.format !== "meiai-architecture" || document.version !== 1 || !document.state || typeof document.state !== "object") {
    throw new Error("Unsupported architecture file. Import a MeiAI architecture JSON version 1 file.");
  }
  const candidate = document.state as Partial<SimulatorState>;
  if (!Array.isArray(candidate.components) || !candidate.components.every((id) => typeof id === "string" && simulatorComponents.some((item) => item.id === id))) {
    throw new Error("The file contains a component ID this version of MeiAI does not recognize.");
  }
  if (!Array.isArray(candidate.relationships ?? [])) throw new Error("Relationships must be a list.");
  const componentSet = new Set(candidate.components);
  for (const edge of candidate.relationships ?? []) {
    if (!edge || typeof edge !== "object" || typeof edge.from !== "string" || typeof edge.to !== "string" || !componentSet.has(edge.from) || !componentSet.has(edge.to)) {
      throw new Error("Every relationship must connect two components included in this design.");
    }
  }
  // Rebuild from the explicit allowlist. Assessment answers, licenses and other fields in
  // an imported file are intentionally discarded; this file only carries design intent.
  const clean = normalizeSimulatorState({ ...initialSimulatorState, platform: candidate.platform, environment: candidate.environment, workloads: candidate.workloads, components: candidate.components, relationships: candidate.relationships });
  if (clean.components.length !== candidate.components.length) throw new Error("Some architecture components could not be imported.");
  if (clean.relationships?.length !== (candidate.relationships ?? []).length) throw new Error("Some relationships are invalid or unsupported.");
  return clean;
}

export function architectureSvg(state: SimulatorState): string {
  const components = state.components.map((id) => simulatorComponents.find((item) => item.id === id)).filter((item): item is (typeof simulatorComponents)[number] => Boolean(item));
  const groups = [...new Set(components.map((item) => item.boundary))];
  const colWidth = 250;
  const width = Math.max(1200, 80 + groups.length * colWidth);
  const positions = new Map<string, { x: number; y: number }>();
  groups.forEach((group, column) => components.filter((item) => item.boundary === group).forEach((item, row) => positions.set(item.id, { x: 40 + column * colWidth, y: 135 + row * 100 })));
  const height = Math.max(380, 170 + Math.max(1, ...groups.map((group) => components.filter((item) => item.boundary === group).length)) * 100);
  const edges = (state.relationships ?? []).flatMap((edge) => {
    const from = positions.get(edge.from); const to = positions.get(edge.to);
    if (!from || !to) return [];
    return [`<path d="M ${from.x + 180} ${from.y + 28} C ${from.x + 230} ${from.y + 28}, ${to.x - 50} ${to.y + 28}, ${to.x} ${to.y + 28}" fill="none" stroke="#52836e" stroke-width="2" marker-end="url(#arrow)"/><text x="${(from.x + to.x + 180) / 2}" y="${(from.y + to.y + 56) / 2}" class="edge">${esc(edge.kind)}</text>`];
  }).join("");
  const nodes = groups.map((group, column) => {
    const x = 40 + column * colWidth;
    const cards = components.filter((item) => item.boundary === group).map((item) => {
      const pos = positions.get(item.id)!;
      return `<g><rect x="${pos.x}" y="${pos.y}" width="180" height="56" rx="12" fill="#fff" stroke="#b8c9c0"/><text x="${pos.x + 12}" y="${pos.y + 24}" class="name">${esc(item.name)}</text><text x="${pos.x + 12}" y="${pos.y + 42}" class="small">${esc(item.id)}</text></g>`;
    }).join("");
    return `<text x="${x}" y="112" class="group">${esc(group)}</text>${cards}`;
  }).join("");
  const title = state.platform === "m365" ? "Microsoft 365 Security" : state.platform === "combined" ? "Azure + Microsoft 365 Security" : "Azure Security";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#52836e"/></marker></defs><style>text{font-family:Arial,sans-serif;fill:#14221b}.title{font-size:24px;font-weight:700}.sub{font-size:13px;fill:#56665e}.group{font-size:14px;font-weight:700}.name{font-size:13px;font-weight:600}.small,.edge{font-size:10px;fill:#56665e}</style><rect width="100%" height="100%" fill="#f4f7f5"/><text x="40" y="42" class="title">${esc(title)} architecture</text><text x="40" y="68" class="sub">Conceptual design · not deployed or technically validated · exported ${new Date().toLocaleDateString()}</text><text x="40" y="90" class="sub">Environment: ${esc(state.environment)} · Workloads: ${esc(state.workloads.join(", ") || "not specified")}</text>${edges}${nodes}</svg>`;
}

function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function downloadArchitectureSvg(state: SimulatorState) { download(new Blob([architectureSvg(state)], { type: "image/svg+xml;charset=utf-8" }), filename("svg")); }
export function downloadArchitectureJson(state: SimulatorState) { download(new Blob([JSON.stringify(architectureDocument(state), null, 2)], { type: "application/json" }), filename("json")); }

async function svgCanvas(state: SimulatorState) {
  const source = architectureSvg(state);
  const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image(); image.src = url;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Could not render the architecture diagram.")); });
    const canvas = document.createElement("canvas"); canvas.width = 1800; canvas.height = Math.round(1800 * image.height / image.width);
    const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas rendering is unavailable.");
    context.fillStyle = "#f4f7f5"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height); return canvas;
  } finally { URL.revokeObjectURL(url); }
}

export async function downloadArchitecturePng(state: SimulatorState) { const canvas = await svgCanvas(state); const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not create PNG.")), "image/png")); download(blob, filename("png")); }
export async function downloadArchitecturePdf(state: SimulatorState) {
  const canvas = await svgCanvas(state); const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  doc.setFontSize(16); doc.text("MeiAI · Security Architecture", 14, 15); doc.setFontSize(8); doc.text("Conceptual design only · not deployed or technically validated", 14, 21);
  const scale = Math.min(400 / canvas.width, 260 / canvas.height);
  const imageWidth = canvas.width * scale; const imageHeight = canvas.height * scale;
  doc.addImage(canvas.toDataURL("image/png"), "PNG", 10, 26, imageWidth, imageHeight);
  doc.addPage(); doc.setFontSize(16); doc.text("Architecture inventory", 14, 18); doc.setFontSize(9);
  let y = 28;
  const items = state.components.map((id) => simulatorComponents.find((item) => item.id === id)).filter((item): item is (typeof simulatorComponents)[number] => Boolean(item));
  for (const item of items) { const lines = doc.splitTextToSize(`${item.boundary} · ${item.name} (${item.id}) — ${item.description}`, 380); if (y + lines.length * 5 > 275) { doc.addPage(); y = 18; } doc.text(lines, 14, y); y += lines.length * 5 + 3; }
  doc.save(filename("pdf"));
}
