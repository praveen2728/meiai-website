export type DemoFinding = {
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  evidence: string;
  recommendation: string;
};

export type UseCase = {
  slug: string;
  number: string;
  category: string;
  title: string;
  accent: string;
  summary: string;
  objective: string;
  workflow: string[];
  scenarios: { id: string; name: string; description: string; finding: DemoFinding }[];
  limitations: string;
};

export const useCases: UseCase[] = [
  {
    slug: "cloud-security",
    number: "02",
    category: "Cloud security · Azure",
    title: "Find the cloud paths that put data at risk.",
    accent: "Azure posture review",
    summary: "A practical review of identity, network exposure, storage, and configuration signals, with findings tied to evidence and next actions.",
    objective: "Show how a cloud security review turns configuration signals into an understandable risk story and a prioritized remediation plan.",
    workflow: ["Define scope and subscriptions", "Review identity and resource signals", "Trace exposure and privilege paths", "Prioritize by impact and reachability", "Record owner, fix, and retest evidence"],
    scenarios: [
      { id: "storage", name: "Public storage exposure", description: "A synthetic storage account allows anonymous blob access and contains a demo-only marker file.", finding: { title: "Anonymous read access on a storage container", severity: "High", evidence: "Fixture: storage account `mei-demo-docs` has public access enabled. A synthetic marker object is readable without authentication.", recommendation: "Disable anonymous access at the account level, remove public container ACLs, review access logs, and retest using an unauthenticated request." } },
      { id: "identity", name: "Over-privileged workload identity", description: "A synthetic application identity has broad subscription-level contributor access.", finding: { title: "Workload identity has unnecessary subscription-wide privilege", severity: "Medium", evidence: "Fixture: `demo-reporting-app` is assigned Contributor at the subscription scope despite requiring read-only access to one resource group.", recommendation: "Replace broad scope with a least-privilege custom or built-in role at the resource-group scope; validate the application's required operations before removing the old assignment." } },
      { id: "network", name: "Management port exposed", description: "A synthetic network security group permits internet-originated access to a management port.", finding: { title: "Administrative service reachable from the internet", severity: "High", evidence: "Fixture: inbound rule allows TCP/22 from `0.0.0.0/0` to a demo subnet. No live network was queried.", recommendation: "Remove the public rule. Use a managed jump path or private connectivity, restrict source ranges, and confirm the effective rules no longer expose the port." } },
    ],
    limitations: "This walkthrough uses a fixed synthetic Azure snapshot. It does not connect to Azure, inspect a tenant, or verify remediation. A production assessment would require an explicitly authorized, read-only connector and evidence from the target subscription.",
  },
  {
    slug: "detection-soc",
    number: "03",
    category: "Detection engineering · SOC",
    title: "Turn security signals into a response you can explain.",
    accent: "Detection and triage",
    summary: "Walk through alert context, investigation pivots, detection logic, and response decisions without claiming that a real SIEM or endpoint was queried.",
    objective: "Demonstrate the analyst path from a synthetic alert to a defensible disposition, useful query, and follow-up action.",
    workflow: ["Ingest a normalized alert", "Enrich identity, host, and network context", "Build a short event timeline", "Evaluate detection logic and blind spots", "Document disposition and response steps"],
    scenarios: [
      { id: "signin", name: "Unusual sign-in sequence", description: "A demo user signs in from two distant regions shortly after a suspicious authentication failure burst.", finding: { title: "Possible account compromise needs identity verification", severity: "High", evidence: "Synthetic events: 14 failed sign-ins, then a success from a new country 6 minutes later; no MFA detail is present in the fixture.", recommendation: "Verify the sign-in with the user, inspect MFA and token events, revoke sessions if unauthorized, and tune correlation to include user, IP reputation, device, and MFA outcome." } },
      { id: "endpoint", name: "Suspicious script execution", description: "A demo endpoint runs an encoded PowerShell command followed by an unusual outbound connection.", finding: { title: "Encoded script and outbound connection require investigation", severity: "Medium", evidence: "Synthetic timeline: encoded PowerShell from a user-writable directory followed by a new outbound destination. No process tree or payload is available.", recommendation: "Collect the process tree and command line, isolate only under the incident-response policy, inspect destination reputation, and add a detection correlation for encoded script plus unusual egress." } },
      { id: "ransomware", name: "Rapid file-change burst", description: "A lab endpoint produces a rapid sequence of file rename and write events in a synthetic telemetry stream.", finding: { title: "High-rate file changes resemble destructive activity", severity: "Critical", evidence: "Synthetic stream: one process modifies 420 files in 90 seconds and renames 83 files. Encryption is not confirmed by this fixture.", recommendation: "Follow the containment runbook, preserve endpoint telemetry, check backup health, and validate the alert with process and file evidence before declaring ransomware." } },
    ],
    limitations: "The alert stream and investigation details are synthetic examples. No Sentinel workspace, Defender tenant, endpoint, or user account is queried or changed. The KQL-style examples are illustrative and need validation against your schema before use.",
  },
  {
    slug: "multicloud",
    number: "04",
    category: "Multi-cloud architecture",
    title: "Make security boundaries visible across clouds.",
    accent: "Architecture review",
    summary: "Explore a shared security model for identity, governance, logging, and response across Azure, AWS, and Google Cloud.",
    objective: "Show how architecture decisions affect blast radius, visibility, and response when teams operate across multiple cloud providers.",
    workflow: ["Map accounts, subscriptions, and projects", "Identify identity trust and admin paths", "Trace logging and alert coverage", "Compare policy ownership and exceptions", "Define common controls and provider-specific tests"],
    scenarios: [
      { id: "identity", name: "Federated identity trust", description: "A sample organization uses workforce federation across three cloud providers, but one trust is broadly scoped.", finding: { title: "Federated role trust exceeds the intended workload boundary", severity: "High", evidence: "Architecture fixture: a shared external identity can assume an admin-like role across all demo accounts without workload-specific conditions.", recommendation: "Use separate workload identities, narrow subject and audience conditions, remove standing admin access, and validate trust with provider-native policy simulation." } },
      { id: "logging", name: "Central audit coverage", description: "A sample platform centralizes some logs, while one provider's audit trail is incomplete.", finding: { title: "Audit events are not consistently available to the central response team", severity: "Medium", evidence: "Architecture fixture: Azure and AWS audit streams reach the central workspace; the demo Google Cloud project has no configured export path.", recommendation: "Enable organization-level audit logging and a managed export, define retention and access controls, then verify an innocuous test event arrives with source and actor fields intact." } },
      { id: "keys", name: "Key ownership and rotation", description: "A sample design mixes provider-managed and customer-managed keys without clear ownership or rotation evidence.", finding: { title: "Encryption key lifecycle ownership is unclear across providers", severity: "Medium", evidence: "Architecture fixture: key owner, rotation evidence, and break-glass process are missing for one demo workload in each provider.", recommendation: "Assign service and business owners, document rotation and recovery requirements per provider, test key access boundaries, and record recovery evidence." } },
    ],
    limitations: "This is an architecture review using a synthetic topology. It does not connect to Azure, AWS, or Google Cloud or evaluate real policies. Provider-specific controls and names should be checked against the target environment and its current configuration.",
  },
];

export function getUseCase(slug: string) {
  return useCases.find((useCase) => useCase.slug === slug);
}
