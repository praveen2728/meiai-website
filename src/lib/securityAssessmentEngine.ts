import type { SimulatorControl, SimulatorState } from "./azureSimulator";
import { capabilityLicenseStatus } from "./m365SecurityData.ts";

/** Resolve platform, workload, selected-service, license, and answer-dependent question applicability. */
export function selectApplicableQuestions(questions: SimulatorControl[], state: SimulatorState): SimulatorControl[] {
  const platform = state.platform ?? "azure";
  return questions.filter((question) => {
    const questionPlatform = question.platform ?? "azure";
    const platformMatches = platform === "combined" || questionPlatform === "shared" || questionPlatform === platform;
    const workloadMatches = question.workloads === "all" || question.workloads.some((id) => state.workloads.includes(id));
    const componentMatches = question.components.length === 0 || question.components.some((id) => state.components.includes(id));
    const parentStatus = question.dependsOn ? state.statuses[question.dependsOn.controlId] ?? "unknown" : undefined;
    const branchMatches = !question.dependsOn || question.dependsOn.statuses.includes(parentStatus!);
    const licenseMatches = !question.capability || capabilityLicenseStatus(question.capability, state.licenses ?? []) !== "verify-add-on";
    return platformMatches && workloadMatches && componentMatches && branchMatches && licenseMatches;
  });
}

/** Report missing references and cycles before the question library grows. */
export function validateQuestionDependencies(questions: Pick<SimulatorControl, "id" | "dependsOn">[]) {
  const ids = new Set(questions.map((question) => question.id));
  const issues: string[] = [];
  const parents = new Map(questions.map((question) => [question.id, question.dependsOn?.controlId]));
  for (const question of questions) {
    const parent = question.dependsOn?.controlId;
    if (parent && !ids.has(parent)) issues.push(`${question.id} depends on missing question ${parent}`);
  }
  for (const question of questions) {
    const chain: string[] = [];
    const seen = new Map<string, number>();
    let current: string | undefined = question.id;
    while (current) {
      const cycleStart = seen.get(current);
      if (cycleStart !== undefined) {
        const signature = chain.slice(cycleStart).sort().join(", ");
        issues.push(`Circular dependency involving ${signature}`);
        break;
      }
      seen.set(current, chain.length);
      chain.push(current);
      current = parents.get(current);
    }
  }
  return [...new Set(issues)];
}

/** Clear saved follow-up responses when the changed parent makes that branch inapplicable. */
export function clearInapplicableDependentAnswers(questions: SimulatorControl[], changedQuestionId: string, nextState: SimulatorState) {
  const children = new Map<string, SimulatorControl[]>();
  for (const question of questions) {
    const parent = question.dependsOn?.controlId;
    if (parent) children.set(parent, [...(children.get(parent) ?? []), question]);
  }
  const cleared = new Set<string>();
  const visited = new Set<string>();
  const queue = [changedQuestionId];
  while (queue.length) {
    const parentId = queue.shift()!;
    if (visited.has(parentId)) continue;
    visited.add(parentId);
    const parentStatus = nextState.statuses[parentId] ?? "unknown";
    for (const child of children.get(parentId) ?? []) {
      if (!child.dependsOn!.statuses.includes(parentStatus)) {
        delete nextState.statuses[child.id];
        cleared.add(child.id);
      }
      queue.push(child.id);
    }
  }
  nextState.unsureQuestions = (nextState.unsureQuestions ?? []).filter((id) => !cleared.has(id));
  nextState.skippedQuestions = (nextState.skippedQuestions ?? []).filter((id) => !cleared.has(id));
  return [...cleared];
}
