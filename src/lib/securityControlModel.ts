import { simulatorControls, simulatorComponents } from "@/lib/azureSimulator";
import { learnArticleByQuestion } from "@/lib/learnContent";

/** Canonical records bridge architecture components, assessment questions, findings and Learn pages. */
export type CanonicalSecurityControl = {
  id: string;
  name: string;
  platform: "Azure" | "Microsoft 365" | "Shared";
  domain: string;
  type: "Preventive" | "Detective" | "Responsive" | "Governance" | "Recovery";
  objective: string;
  architectureComponentIds: string[];
  dependencies: string[];
  licensingMetadata: string;
  questionIds: string[];
  applicability: string;
  remediation: string;
  validation: string;
  learnSlugs: string[];
  frameworkMappings: string[];
  officialDocumentation: { label: string; url: string }[];
  verificationMetadata: { questionVersion?: string; capability?: string };
};
const kindFor = (domain: string): CanonicalSecurityControl["type"] => /incident|response|recovery/i.test(domain) ? "Responsive" : /logging|monitoring|detection|posture|threat/i.test(domain) ? "Detective" : /governance|compliance|policy/i.test(domain) ? "Governance" : /backup|resilien/i.test(domain) ? "Recovery" : "Preventive";
export const canonicalSecurityControls: CanonicalSecurityControl[] = simulatorControls.map(control => ({
  id: control.id,
  name: control.name,
  platform: control.platform === "m365" ? "Microsoft 365" : control.platform === "shared" ? "Shared" : "Azure",
  domain: control.domain,
  type: kindFor(control.domain),
  objective: control.risk,
  architectureComponentIds: [...control.components],
  dependencies: control.dependsOn ? [control.dependsOn.controlId] : [],
  licensingMetadata: control.capability ? `Verify capability entitlement: ${control.capability}` : "Check applicable service plan and workload scope against current vendor terms.",
  questionIds: [control.id],
  applicability: `Platform, workload, component and answer dependencies are defined by the assessment rule for ${control.id}.`,
  remediation: control.remediation,
  validation: control.validation,
  learnSlugs: [learnArticleByQuestion[control.id]].filter((slug): slug is string => Boolean(slug)),
  frameworkMappings: [...control.frameworks],
  officialDocumentation: [...control.references],
  verificationMetadata: { questionVersion: control.questionVersion, capability: control.capability },
}));
const aliasByCatalogId: Record<string,string> = {
  "m365-entra":"entra", "m365-ca":"entra-ca", "m365-mfa":"entra-ca", "m365-pim":"entra-pim", "m365-idp":"identity-protection",
  "m365-intune":"intune", "defender-office":"defender-office", "defender-endpoint":"defender-endpoint", "defender-identity":"defender-identity", "defender-cloud-apps":"defender-cloud-apps", "defender-xdr":"defender-xdr",
  "azure-rbac":"azure-rbac", "private-endpoint":"private-endpoint", "appgw-waf":"waf", "frontdoor-waf":"waf", "vm":"virtual-machines", "acr":"container-registry", "defender-cloud":"defender", "defender-servers":"defender", "defender-containers":"defender", "defender-storage":"defender", "defender-sql":"defender", "azure-monitor":"log-analytics", "diagnostics":"log-analytics", "activity-logs":"log-analytics", "sentinel":"sentinel", "subscriptions":"subscriptions", "landing-zone":"management-groups", "resource-locks":"azure-policy", "managed-hsm":"key-vault", "cicd":"app-service", "iac-scan":"app-service", "secret-scan":"app-service", "image-scan":"container-registry",
};
export function controlsForCatalogResource(catalogId:string): CanonicalSecurityControl[] {
  const sourceId=aliasByCatalogId[catalogId]??catalogId;
  const knownComponent=simulatorComponents.some(c=>c.id===sourceId);
  if(!knownComponent)return [];
  return canonicalSecurityControls.filter(c=>c.architectureComponentIds.includes(sourceId));
}
export function learnSlugsForCatalogResource(catalogId:string):string[] { return [...new Set(controlsForCatalogResource(catalogId).flatMap(c=>c.learnSlugs))]; }
