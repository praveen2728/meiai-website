import type { RelationshipKind, SimulatorComponent } from "@/lib/azureSimulator";

/** Directional design-intent rules. These validate modeled relationships only, not live network paths. */
export function isCompatibleRelationship(kind: RelationshipKind, from: SimulatorComponent, to: SimulatorComponent): boolean {
  if (from.id === to.id) return false;
  if (kind === "Identity access") return from.boundary === "Identity" && to.boundary !== "Identity";
  if (kind === "Network path") return from.boundary === "Network" && ["Network", "Workload", "Data"].includes(to.boundary);
  if (kind === "Data access") return ["Identity", "Workload"].includes(from.boundary) && to.boundary === "Data";
  return ["Workload", "Data", "Collaboration", "Endpoint"].includes(from.boundary) && ["Operations", "Compliance"].includes(to.boundary);
}
