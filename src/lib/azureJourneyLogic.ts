import { guideDependencies, type Playbook, type SecurityScope } from "./azureSecurityContent.ts";

export type JourneyAnswers = Record<string, string>;
export type JourneyPlan = {
  guides: Playbook[];
  domains: string[];
  changes: string[];
  issues: string[];
};

const scenarioDomains: Record<string, string[]> = {
  greenfield: ["governance", "identity", "privileged", "network", "workload", "secrets", "data", "logging", "posture", "recovery"],
  migration: ["governance", "identity", "privileged", "network", "workload", "secrets", "data", "posture", "logging", "siem", "recovery"],
  improve: ["posture", "cnapp", "vulnerability", "identity", "logging", "siem", "response", "recovery"],
  m365: ["m365identity", "identity", "privileged", "email", "endpoint", "device", "saas", "purview", "logging", "siem", "response"],
  ai: ["identity", "privileged", "data", "secrets", "ai", "devsecops", "logging", "posture", "cnapp", "siem", "response"],
};

const workloadDomains: Record<string, string[]> = {
  "Virtual machines": ["workload", "network", "posture", "cnapp", "vulnerability", "logging", "recovery"],
  "Containers / Kubernetes": ["containers", "network", "posture", "cnapp", "vulnerability", "logging", "response"],
  "PaaS applications": ["workload", "network", "secrets", "logging", "vulnerability"],
  "AI workloads": ["ai", "identity", "privileged", "data", "secrets", "devsecops", "posture", "logging", "siem", "response"],
};

const phaseRank: Record<string, number> = { Foundation: 10, "Microsoft 365": 20, Workloads: 30, Data: 40, Posture: 50, AI: 60, Delivery: 70, Operations: 80, "All phases": 90 };

export function guideSearchText(guide: Playbook): string {
  return [guide.id, guide.domain, guide.subdomain, guide.objective, guide.applicability, guide.products.join(" "), guide.workloads.join(" "), guide.prerequisites.join(" "), guide.decisions.join(" "), guide.steps.flatMap((step) => [step.title, step.configure, step.location, step.decision, step.avoid, step.outcome]).join(" "), guide.validation.flatMap((check) => [check.action, check.expected, check.evidence]).join(" "), guide.keywords?.join(" ") ?? ""].join(" ").toLocaleLowerCase();
}

export function filterGuides(guides: Playbook[], query: string, domainId: string): Playbook[] {
  const normalized = query.trim().toLocaleLowerCase();
  return guides.filter((guide) => (domainId === "all" || guide.domainId === domainId) && (!normalized || guideSearchText(guide).includes(normalized)));
}

export function orderGuides(guides: Playbook[]): { guides: Playbook[]; issues: string[] } {
  const byId = new Map(guides.map((guide) => [guide.id, guide]));
  const prerequisitesById = new Map(guides.map((guide) => [guide.id, guide.prerequisiteControlIds ?? guideDependencies[guide.id] ?? []]));
  const issues: string[] = [];
  for (const guide of guides) {
    for (const dependency of prerequisitesById.get(guide.id) ?? []) {
      if (!byId.has(dependency)) issues.push(`${guide.id} requires ${dependency}, which is outside the selected scope.`);
    }
  }
  const pending = new Set(byId.keys());
  const ordered: Playbook[] = [];
  const compare = (a: Playbook, b: Playbook) => (phaseRank[a.phase] ?? 99) - (phaseRank[b.phase] ?? 99) || a.sequence - b.sequence || a.id.localeCompare(b.id);
  while (pending.size) {
    const ready = [...pending].map((id) => byId.get(id)!).filter((guide) => (prerequisitesById.get(guide.id) ?? []).every((id) => !pending.has(id))).sort(compare);
    if (!ready.length) {
      issues.push(`Dependency cycle detected among: ${[...pending].sort().join(", ")}.`);
      break;
    }
    for (const guide of ready) {
      ordered.push(guide);
      pending.delete(guide.id);
    }
  }
  return { guides: ordered, issues };
}

export function deriveJourney(guides: Playbook[], scope: SecurityScope, scenario: string, answers: JourneyAnswers): JourneyPlan {
  const allowedIds = new Set(guides.filter((guide) => scope === "combined" || guide.scope === "all" || guide.scope === scope).map((guide) => guide.id));
  const domains = new Set(scenarioDomains[scenario] ?? scenarioDomains.migration);
  const changes: string[] = [];
  const add = (ids: string[], reason: string) => {
    const applicable = ids.filter((id) => guides.some((guide) => guide.domainId === id) && (scope === "combined" || guides.some((guide) => guide.domainId === id && (guide.scope === "all" || guide.scope === scope))));
    const newIds = applicable.filter((id) => !domains.has(id));
    applicable.forEach((id) => domains.add(id));
    if (newIds.length) changes.push(`${reason}: added ${newIds.map((id) => guides.find((guide) => guide.domainId === id)?.domain ?? id).join(", ")}.`);
  };

  if (scope === "m365" || (scope === "combined" && ["Yes", "Some workloads"].includes(answers.m365Usage))) {
    add(["m365identity", "email", "endpoint", "device", "saas", "purview", "siem", "logging", "response"], "Microsoft 365 usage");
  }
  for (const workload of (answers.workloads ?? "").split(", ")) {
    if (workloadDomains[workload]) add(workloadDomains[workload], `Selected workload (${workload})`);
  }
  const tools = answers.securityTools ?? "";
  if (tools.includes("Microsoft Defender") || tools.includes("Both")) add(["posture", "cnapp", "vulnerability", ...(scope !== "azure" ? ["endpoint", "saas"] : [])], "Existing Defender coverage");
  if (tools.includes("Microsoft Sentinel") || tools.includes("Both")) add(["logging", "siem", "response"], "Existing Sentinel deployment");
  if (answers.requirements === "Yes" || answers.requirements === "Under review") add(["compliance", "data", "purview", "logging"], "Regulatory or data-protection requirements");
  if (answers.m365Usage === "Yes" && scope === "azure") changes.push("Microsoft 365 use was noted; choose the Microsoft 365 or combined scope to include its workload-specific guides.");

  const selected = guides.filter((guide) => allowedIds.has(guide.id) && domains.has(guide.domainId));
  // Add in-scope prerequisite controls recursively so the sequence is implementable.
  const ids = new Set(selected.map((guide) => guide.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const guide of [...selected]) {
      for (const dependency of guide.prerequisiteControlIds ?? guideDependencies[guide.id] ?? []) {
        const dependencyGuide = guides.find((candidate) => candidate.id === dependency);
        if (dependencyGuide && allowedIds.has(dependency) && !ids.has(dependency)) {
          ids.add(dependency);
          domains.add(dependencyGuide.domainId);
          selected.push(dependencyGuide);
          changes.push(`${guide.id} depends on ${dependency} (${dependencyGuide.domain}); it was added ahead of the selected work.`);
          changed = true;
        }
      }
    }
  }
  const ordered = orderGuides(selected);
  return { guides: ordered.guides, domains: [...domains].filter((id) => guides.some((guide) => guide.domainId === id && allowedIds.has(guide.id))), changes: [...new Set(changes)], issues: ordered.issues };
}

export function contextSummary(scope: SecurityScope, scenarioName: string, answers: JourneyAnswers): string[] {
  const items = [`Security scope: ${scope === "azure" ? "Azure Security" : scope === "m365" ? "Microsoft 365 Security" : "Azure + Microsoft 365"}`, `Starting scenario: ${scenarioName}`];
  const labels: Record<string, string> = { m365Usage: "Microsoft 365 use", workloads: "Selected workloads", securityTools: "Existing security tools", requirements: "Regulatory and data-protection requirements" };
  for (const [id, label] of Object.entries(labels)) {
    const value = answers[id];
    if (value && value !== "Skip for now") items.push(`${label}: ${value}`);
  }
  return items;
}
