import { m365Components, m365Controls } from "./m365SecurityData.ts";
import { selectApplicableQuestions } from "./securityAssessmentEngine.ts";

export type EnvironmentProfile = "startup" | "landing-zone" | "hybrid" | "multi-subscription";
export type WorkloadProfile = "web-app" | "data-analytics" | "containers" | "identity-centric" | "hybrid-workloads";
export type PlatformScope = "azure" | "m365" | "combined";
export type ProductPlatform = "azure" | "m365" | "shared";
export type ControlStatus = "implemented" | "partial" | "missing" | "unknown" | "na";
export type AssessmentDepth = "quick" | "detailed";
export type Severity = "High" | "Medium" | "Low";
export type Boundary = "Identity" | "Governance" | "Network" | "Workload" | "Data" | "Operations" | "Collaboration" | "Endpoint" | "Compliance";
export type RelationshipKind = "Identity access" | "Network path" | "Data access" | "Telemetry";

export interface SimulatorRelationship {
  id: string;
  from: string;
  to: string;
  kind: RelationshipKind;
}

export interface SimulatorControl {
  id: string;
  name: string;
  domain: string;
  question: string;
  risk: string;
  baseSeverity: Severity;
  workloads: WorkloadProfile[] | "all";
  components: string[];
  affectedComponents: string[];
  targetComponents: string[];
  remediation: string;
  validation: string;
  frameworks: string[];
  references: { label: string; url: string }[];
  platform?: ProductPlatform;
  capability?: string;
  dependsOn?: { controlId: string; statuses: ControlStatus[] };
  whyAsked?: string;
  questionVersion?: string;
}

export interface SimulatorComponent {
  id: string;
  name: string;
  boundary: Boundary;
  description: string;
  controls: string[];
  workloads: WorkloadProfile[] | "all";
  platform?: ProductPlatform;
  icon?: string;
}

export interface SimulatorState {
  platform?: PlatformScope;
  assessmentDepth?: AssessmentDepth;
  environment: EnvironmentProfile;
  workloads: WorkloadProfile[];
  components: string[];
  statuses: Record<string, ControlStatus>;
  relationships?: SimulatorRelationship[];
  licenses?: string[];
  licensePopulations?: Record<string, number>;
  unsureQuestions?: string[];
  skippedQuestions?: string[];
}

export interface SimulatorFinding {
  id: string;
  controlId: string;
  title: string;
  domain: string;
  severity: Severity;
  priority: "Immediate" | "Near-term" | "Planned";
  reason: string;
  reportedStatus: ControlStatus;
  affectedComponents: string[];
  impact: string;
  remediation: string;
  validation: string;
  frameworks: string[];
  references: SimulatorControl["references"];
  targetComponents: string[];
}

export const environmentProfiles: { id: EnvironmentProfile; name: string; detail: string }[] = [
  { id: "startup", name: "Startup or small Azure environment", detail: "A compact subscription and workload footprint with a small platform team." },
  { id: "landing-zone", name: "Enterprise Azure landing zone", detail: "A governed platform with shared identity, networking, policy and security operations." },
  { id: "hybrid", name: "Hybrid environment", detail: "Azure workloads connected to on-premises services or another network boundary." },
  { id: "multi-subscription", name: "Multi-subscription enterprise", detail: "Multiple subscriptions with central governance and delegated workload ownership." },
];

export const workloadProfiles: { id: WorkloadProfile; name: string; detail: string }[] = [
  { id: "web-app", name: "Web application and database", detail: "Internet-facing application components and a data service." },
  { id: "data-analytics", name: "Data and analytics platform", detail: "Storage, data processing and analytics services." },
  { id: "containers", name: "Containerized application", detail: "Container images, orchestration and workload identities." },
  { id: "identity-centric", name: "Identity-centric workloads", detail: "Workforce, administrator and application access paths." },
  { id: "hybrid-workloads", name: "Hybrid enterprise workloads", detail: "Azure and on-premises systems with shared operational dependencies." },
];

const azureSimulatorComponents: SimulatorComponent[] = [
  { id: "entra", name: "Microsoft Entra ID", boundary: "Identity", description: "Provide workforce and workload identity with explicit authentication and authorization decisions.", controls: ["IAM-01", "IAM-02", "IAM-03", "IAM-04"], workloads: "all" },
  { id: "management-groups", name: "Management groups", boundary: "Governance", description: "Group subscriptions under an agreed policy and ownership hierarchy.", controls: ["GOV-01"], workloads: "all" },
  { id: "azure-policy", name: "Azure Policy", boundary: "Governance", description: "Audit or enforce approved resource configuration at the chosen scope.", controls: ["GOV-01"], workloads: "all" },
  { id: "vnet", name: "Virtual network", boundary: "Network", description: "Provide workload network boundaries and explicit connectivity paths.", controls: ["NET-01", "NET-02"], workloads: "all" },
  { id: "nsg", name: "Network security groups", boundary: "Network", description: "Filter supported subnet and network-interface traffic.", controls: ["NET-01", "NET-02"], workloads: "all" },
  { id: "firewall", name: "Azure Firewall", boundary: "Network", description: "Centralize network filtering where the traffic model justifies it.", controls: ["NET-02"], workloads: "all" },
  { id: "waf", name: "Application Gateway / Front Door WAF", boundary: "Network", description: "Apply web request protections at a selected application ingress.", controls: ["NET-04"], workloads: ["web-app"] },
  { id: "app-service", name: "Azure App Service", boundary: "Workload", description: "Host an application on a managed Azure platform.", controls: ["APP-01", "IAM-04", "NET-03"], workloads: ["web-app", "hybrid-workloads"] },
  { id: "virtual-machines", name: "Virtual machines", boundary: "Workload", description: "Run workloads where operating-system ownership and patching are explicit.", controls: ["APP-01", "IAM-04", "NET-03"], workloads: ["web-app", "data-analytics", "hybrid-workloads"] },
  { id: "aks", name: "Azure Kubernetes Service", boundary: "Workload", description: "Run container orchestration with cluster, node and workload identity controls.", controls: ["APP-01", "IAM-04", "NET-02"], workloads: ["containers"] },
  { id: "sql", name: "Azure SQL Database", boundary: "Data", description: "Store relational application data with explicit identity and network boundaries.", controls: ["DATA-02", "DATA-03", "DATA-04", "NET-03", "LOG-02"], workloads: ["web-app", "data-analytics", "hybrid-workloads"] },
  { id: "storage", name: "Storage account", boundary: "Data", description: "Store objects or files with account-level access and network decisions.", controls: ["DATA-01", "DATA-02", "DATA-03", "DATA-04", "NET-03", "LOG-02"], workloads: ["web-app", "data-analytics", "containers", "hybrid-workloads"] },
  { id: "key-vault", name: "Azure Key Vault", boundary: "Data", description: "Store application secrets and keys under scoped access and audit policies.", controls: ["DATA-03", "IAM-04", "LOG-02"], workloads: "all" },
  { id: "private-endpoint", name: "Private Endpoint", boundary: "Network", description: "Provide private connectivity for supported services; DNS and routing must also be designed.", controls: ["NET-03"], workloads: ["web-app", "data-analytics", "containers", "hybrid-workloads"] },
  { id: "defender", name: "Defender for Cloud", boundary: "Operations", description: "Posture and workload protection capabilities depend on selected plans and licensing.", controls: ["POST-01"], workloads: "all" },
  { id: "log-analytics", name: "Log Analytics workspace", boundary: "Operations", description: "Collect selected Azure logs; ingestion and retention affect cost.", controls: ["LOG-01", "LOG-02", "LOG-03"], workloads: "all" },
  { id: "sentinel", name: "Microsoft Sentinel", boundary: "Operations", description: "Build SIEM detections and response workflows over selected telemetry.", controls: ["LOG-01", "LOG-03"], workloads: "all" },
  { id: "subscriptions", name: "Azure subscriptions", boundary: "Governance", description: "Separate billing, policy, access and workload ownership boundaries within a tenant.", controls: ["GOV-01", "IAM-03"], workloads: "all" },
  { id: "managed-identity", name: "Managed identities", boundary: "Identity", description: "Provide Azure-hosted workloads with Microsoft Entra identities without storing application secrets.", controls: ["IAM-04"], workloads: ["web-app", "data-analytics", "containers", "hybrid-workloads"] },
  { id: "functions", name: "Azure Functions", boundary: "Workload", description: "Run event-driven code with explicit identity, network, dependency and logging decisions.", controls: ["APP-01", "IAM-04", "LOG-02"], workloads: ["web-app", "data-analytics"] },
  { id: "container-apps", name: "Azure Container Apps", boundary: "Workload", description: "Run containerized applications on a managed platform; image, identity and ingress controls still apply.", controls: ["APP-01", "IAM-04", "NET-02"], workloads: ["containers", "web-app"] },
  { id: "container-registry", name: "Azure Container Registry", boundary: "Workload", description: "Store container images with access, image provenance, scanning and deployment controls.", controls: ["APP-01", "IAM-03"], workloads: ["containers"] },
  { id: "api-management", name: "Azure API Management", boundary: "Workload", description: "Publish and govern APIs; authentication, authorization, exposure and backend paths require design.", controls: ["APP-01", "NET-04", "LOG-02"], workloads: ["web-app", "hybrid-workloads"] },
  { id: "private-dns", name: "Private DNS zones", boundary: "Network", description: "Resolve private endpoint names from intended network locations; links and forwarding must be planned.", controls: ["NET-03"], workloads: ["web-app", "data-analytics", "containers", "hybrid-workloads"] },
  { id: "vpn-gateway", name: "VPN Gateway", boundary: "Network", description: "Connect Azure virtual networks and remote networks using an explicitly managed tunnel design.", controls: ["NET-02"], workloads: ["hybrid-workloads"] },
  { id: "front-door", name: "Azure Front Door with WAF", boundary: "Network", description: "Provide global application entry and web application firewall capabilities when the traffic architecture fits.", controls: ["NET-04"], workloads: ["web-app"] },
  { id: "cosmos-db", name: "Azure Cosmos DB", boundary: "Data", description: "Store globally distributed data with explicit identity, network, backup and consistency decisions.", controls: ["DATA-02", "DATA-03", "NET-03", "LOG-02"], workloads: ["web-app", "data-analytics"] },
  { id: "sql-managed-instance", name: "Azure SQL Managed Instance", boundary: "Data", description: "Run managed SQL workloads with network, identity, auditing and migration dependencies.", controls: ["DATA-02", "DATA-03", "NET-03", "LOG-02"], workloads: ["web-app", "hybrid-workloads"] },
  { id: "azure-monitor", name: "Azure Monitor", boundary: "Operations", description: "Collect and route selected platform and application telemetry; retention and ingestion affect cost.", controls: ["LOG-01", "LOG-02"], workloads: "all" },
  { id: "activity-logs", name: "Azure Activity Logs", boundary: "Operations", description: "Record subscription-level control-plane events and route them to appropriate retention and monitoring destinations.", controls: ["LOG-01"], workloads: "all" },
  { id: "azure-backup", name: "Azure Backup", boundary: "Operations", description: "Protect selected workloads with recovery points; immutability, access and restore testing need separate validation.", controls: [], workloads: "all" },
  { id: "devops-pipeline", name: "CI/CD pipeline", boundary: "Operations", description: "Automate builds and deployments with reviewed identities, protected branches, artifact checks and approvals.", controls: ["APP-01"], workloads: "all" },
];

export const simulatorComponents: SimulatorComponent[] = [...azureSimulatorComponents.map((item) => ({ ...item, platform: item.id === "entra" ? "shared" as const : "azure" as const })), ...m365Components];

const refs = {
  mfa: { label: "Microsoft Entra MFA", url: "https://learn.microsoft.com/en-us/entra/identity/authentication/concept-mfa-howitworks" },
  pim: { label: "Microsoft Entra Privileged Identity Management", url: "https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure" },
  rbac: { label: "Azure RBAC best practices", url: "https://learn.microsoft.com/en-us/azure/role-based-access-control/best-practices" },
  managed: { label: "Managed identities for Azure resources", url: "https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview" },
  network: { label: "Azure network security groups", url: "https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview" },
  private: { label: "Azure Private Link overview", url: "https://learn.microsoft.com/en-us/azure/private-link/private-link-overview" },
  storage: { label: "Authorize access to blob data", url: "https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-access-azure-active-directory" },
  keyvault: { label: "Azure Key Vault security", url: "https://learn.microsoft.com/en-us/azure/key-vault/general/security-features" },
  defender: { label: "Defender for Cloud overview", url: "https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-cloud-introduction" },
  activity: { label: "Azure Activity Log", url: "https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/activity-log" },
  diagnostic: { label: "Azure Monitor diagnostic settings", url: "https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings" },
  sentinel: { label: "Microsoft Sentinel overview", url: "https://learn.microsoft.com/en-us/azure/sentinel/overview" },
  policy: { label: "Azure Policy overview", url: "https://learn.microsoft.com/en-us/azure/governance/policy/overview" },
  waf: { label: "Azure Web Application Firewall", url: "https://learn.microsoft.com/en-us/azure/web-application-firewall/overview" },
  backup: { label: "Azure Backup overview", url: "https://learn.microsoft.com/en-us/azure/backup/backup-overview" },
  patch: { label: "Azure Update Manager", url: "https://learn.microsoft.com/en-us/azure/update-manager/overview" },
  mcsb: { label: "Microsoft Cloud Security Benchmark v1", url: "https://learn.microsoft.com/en-us/security/benchmark/azure/overview-mcsb-v1" },
  caf: { label: "Azure landing zones", url: "https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/" },
};

const control = (data: Omit<SimulatorControl, "workloads"> & { workloads?: SimulatorControl["workloads"] }): SimulatorControl => ({ platform: "azure", workloads: "all", questionVersion: "1.0", ...data });

const azureSimulatorControls: SimulatorControl[] = [
  control({ id: "IAM-01", name: "Require strong MFA for privileged access", domain: "Identity and privileged access", question: "Are administrator accounts protected by MFA with monitored emergency-access exclusions?", risk: "A stolen administrator credential may bypass a password-only boundary.", baseSeverity: "High", components: ["entra"], affectedComponents: ["entra"], targetComponents: ["entra"], remediation: "Require phishing-resistant MFA for privileged roles where supported. Pilot Conditional Access in report-only mode, document break-glass controls, then phase enforcement.", validation: "Review sign-in logs and policy results for administrator accounts; test emergency access and confirm alerts.", frameworks: ["MCSB v1 topic: identity and access", "Zero Trust: verify explicitly"], references: [refs.mfa, refs.mcsb] }),
  control({ id: "IAM-02", name: "Use time-bound privileged access", domain: "Identity and privileged access", question: "Are privileged Azure roles assigned only at the required scope and activated just in time where appropriate?", risk: "Standing or broadly scoped privilege increases the impact of account compromise.", baseSeverity: "High", components: ["entra"], affectedComponents: ["entra", "management-groups"], targetComponents: ["management-groups"], remediation: "Inventory role assignments, remove stale grants, scope roles narrowly and use PIM-eligible access with approval and expiry where licensed and justified.", validation: "Export role assignments at management-group, subscription and resource scopes; verify activation, approval and audit history.", frameworks: ["MCSB v1 topic: identity and access"], references: [refs.pim, refs.rbac, refs.mcsb] }),
  control({ id: "IAM-03", name: "Scope Azure RBAC to least privilege", domain: "Identity and privileged access", question: "Are workload and human role assignments limited to the permissions and resource scope they need?", risk: "Broad roles such as Owner or Contributor can allow unnecessary changes across resources.", baseSeverity: "High", components: ["entra", "management-groups"], affectedComponents: ["entra", "management-groups"], targetComponents: ["management-groups"], remediation: "Replace broad built-in roles with narrower built-in or reviewed custom roles and assign at the smallest practical scope.", validation: "Test expected read/write tasks and denied cross-scope tasks; inspect role assignment change logs.", frameworks: ["MCSB v1 topic: identity and access"], references: [refs.rbac, refs.mcsb] }),
  control({ id: "IAM-04", name: "Prefer managed identities for workloads", domain: "Identity and privileged access", question: "Do supported Azure workloads use managed identities or federation instead of stored long-lived credentials?", risk: "Stored credentials can be copied, reused or left unrotated.", baseSeverity: "Medium", workloads: ["web-app", "data-analytics", "containers", "hybrid-workloads"], components: ["app-service", "virtual-machines", "aks", "key-vault"], affectedComponents: ["app-service", "virtual-machines", "aks", "key-vault"], targetComponents: ["key-vault"], remediation: "Enable a workload identity supported by the service and grant only required data-plane roles; remove obsolete secrets after validation.", validation: "Confirm the workload obtains tokens for the intended audience and that unrelated resources deny access.", frameworks: ["MCSB v1 topic: workload identity"], references: [refs.managed, refs.mcsb] }),
  control({ id: "NET-01", name: "Separate workload network paths", domain: "Network security", question: "Are workload, data and management paths separated with intentional subnet and routing boundaries?", risk: "Unnecessary east-west connectivity can increase lateral movement opportunities.", baseSeverity: "Medium", components: ["vnet", "nsg"], affectedComponents: ["vnet", "nsg"], targetComponents: ["vnet", "nsg"], remediation: "Document required flows, separate trust zones where useful and avoid assuming that a VNet alone provides workload authorization.", validation: "Test allowed and denied paths from each relevant subnet and review effective routes and security rules.", frameworks: ["MCSB v1 topic: network security"], references: [refs.network, refs.mcsb] }),
  control({ id: "NET-02", name: "Restrict inbound and outbound traffic", domain: "Network security", question: "Do network rules permit only documented ingress, egress and administration paths?", risk: "Unrestricted traffic can expose management or application services and enable unneeded outbound communication.", baseSeverity: "Medium", components: ["vnet", "nsg", "firewall", "aks"], affectedComponents: ["vnet", "nsg", "firewall", "aks"], targetComponents: ["nsg"], remediation: "Review NSGs, firewall rules and service-specific controls against a flow inventory. Keep management interfaces off unrestricted public paths.", validation: "Test required connections and representative denied paths; review effective security rules and firewall logs.", frameworks: ["MCSB v1 topic: network security"], references: [refs.network, refs.mcsb] }),
  control({ id: "NET-03", name: "Constrain public reachability for data services", domain: "Network security", question: "Is public network access restricted for sensitive data services when private connectivity is appropriate?", risk: "Public network reachability expands the path to a data service; it does not by itself prove anonymous access or data exposure.", baseSeverity: "High", workloads: ["web-app", "data-analytics", "containers", "hybrid-workloads"], components: ["sql", "storage", "app-service", "virtual-machines", "private-endpoint"], affectedComponents: ["sql", "storage", "private-endpoint"], targetComponents: ["private-endpoint", "vnet"], remediation: "Review service firewall settings and intended consumers. Consider Private Link for supported services, with DNS, routing and failover designed and tested.", validation: "From an untrusted network, verify the intended connection is denied; from an authorized workload, verify private DNS resolution and access.", frameworks: ["MCSB v1 topic: network security"], references: [refs.private, refs.mcsb] }),
  control({ id: "NET-04", name: "Protect internet-facing web ingress", domain: "Network security", question: "If this workload is internet-facing, is ingress protected by an appropriately configured WAF or equivalent edge control?", risk: "A public application endpoint without a suitable edge protection and monitoring strategy may face avoidable web attack traffic.", baseSeverity: "Medium", workloads: ["web-app"], components: ["waf", "app-service"], affectedComponents: ["waf", "app-service"], targetComponents: ["waf"], remediation: "Choose Front Door or Application Gateway based on traffic and availability needs, tune managed rules in detection mode, and plan application security testing. A WAF does not replace secure code or authorization.", validation: "Review WAF policy mode, exclusions, logs and a safe test request; verify the application remains protected if the edge is bypassed.", frameworks: ["MCSB v1 topic: network security", "Well-Architected Framework: security"], references: [refs.waf, refs.mcsb] }),
  control({ id: "DATA-01", name: "Disable anonymous blob access", domain: "Data protection", question: "Is anonymous public blob access disabled unless a documented, approved use case requires it?", risk: "Anonymous object access can expose data if a container is configured for public reads. Network reachability and anonymous authorization are separate settings.", baseSeverity: "High", workloads: ["web-app", "data-analytics", "containers", "hybrid-workloads"], components: ["storage"], affectedComponents: ["storage"], targetComponents: ["storage"], remediation: "Disable account-level public blob access and review container access levels. Use Microsoft Entra authorization and scoped data roles for workloads.", validation: "Attempt an unauthenticated read of a synthetic test object and confirm denial; verify authorized workload access and logs.", frameworks: ["MCSB v1 topic: data protection"], references: [refs.storage, refs.mcsb] }),
  control({ id: "DATA-02", name: "Encrypt data and review key ownership", domain: "Data protection", question: "Is data encrypted in transit and at rest with key ownership aligned to the documented risk and regulatory needs?", risk: "Weak transport or key governance may expose data or reduce control over cryptographic access.", baseSeverity: "Medium", workloads: ["web-app", "data-analytics", "containers", "hybrid-workloads"], components: ["sql", "storage", "key-vault"], affectedComponents: ["sql", "storage", "key-vault"], targetComponents: ["key-vault"], remediation: "Confirm service encryption defaults, enforce secure transport, and use customer-managed keys only where a clear control objective and operational model justify them.", validation: "Inspect service configuration and TLS endpoints; verify key rotation, access and recovery processes where customer-managed keys are used.", frameworks: ["MCSB v1 topic: data protection", "NIST CSF 2.0 related data-protection outcome"], references: [refs.keyvault, refs.mcsb] }),
  control({ id: "DATA-03", name: "Manage secrets in a controlled store", domain: "Data protection", question: "Are application secrets kept out of code and images, stored in Key Vault where appropriate, and accessed through scoped identities?", risk: "Embedded or widely shared secrets can persist beyond their intended use and permit unauthorized access.", baseSeverity: "Medium", components: ["key-vault", "app-service", "virtual-machines", "aks"], affectedComponents: ["key-vault", "app-service", "virtual-machines", "aks"], targetComponents: ["key-vault"], remediation: "Move secrets to an approved managed store, scope access per workload identity and define rotation, recovery and audit ownership.", validation: "Scan repositories and build artifacts; test that the workload can read only its intended secret and that access is logged.", frameworks: ["MCSB v1 topic: data protection and identity"], references: [refs.keyvault, refs.managed, refs.mcsb] }),
  control({ id: "DATA-04", name: "Test backup and recovery paths", domain: "Data protection", question: "Are critical data and workloads backed up with a recent restore test against documented recovery objectives?", risk: "A configured backup without a tested restore may not support recovery from deletion, corruption or ransomware.", baseSeverity: "Medium", workloads: ["web-app", "data-analytics", "containers", "hybrid-workloads"], components: ["sql", "storage", "virtual-machines", "aks"], affectedComponents: ["sql", "storage", "virtual-machines", "aks"], targetComponents: [], remediation: "Define RPO/RTO with service owners, protect backup administration, and schedule restore tests for representative workloads.", validation: "Restore to an isolated target, record elapsed time and data integrity, and confirm the result meets approved objectives.", frameworks: ["MCSB v1 topic: backup and recovery", "NIST CSF 2.0 related recovery outcome"], references: [refs.backup, refs.mcsb] }),
  control({ id: "POST-01", name: "Review Defender for Cloud posture coverage", domain: "Cloud posture management", question: "Is Defender for Cloud configured for the intended subscriptions, and have applicable plans and recommendations been reviewed?", risk: "Without a defined posture review, configuration drift and workload-specific protection gaps may remain unnoticed.", baseSeverity: "Medium", components: ["defender"], affectedComponents: ["defender"], targetComponents: ["defender"], remediation: "Confirm subscription scope, review free foundational CSPM separately from paid workload plans, and assign owners to relevant recommendations.", validation: "Review subscription settings, selected plans, recommendation ownership and a recent sample of resolved/accepted recommendations.", frameworks: ["MCSB v1 topic: security posture management"], references: [refs.defender, refs.mcsb] }),
  control({ id: "LOG-01", name: "Collect Activity Logs centrally", domain: "Logging and threat detection", question: "Are Azure Activity Logs sent to a centrally owned destination with retention appropriate to investigation and audit needs?", risk: "Without centralized control-plane records, responders may have less context about resource and role changes.", baseSeverity: "Medium", components: ["log-analytics", "sentinel"], affectedComponents: ["log-analytics", "sentinel"], targetComponents: ["log-analytics"], remediation: "Create diagnostic settings at the agreed scope, route required categories to the approved destination, and set retention based on policy and cost.", validation: "Generate a benign resource change and confirm actor, operation, target and time are queryable at the central destination.", frameworks: ["MCSB v1 topic: logging and threat detection", "NIST CSF 2.0 related detection outcome"], references: [refs.activity, refs.diagnostic, refs.mcsb] }),
  control({ id: "LOG-02", name: "Route workload diagnostic logs", domain: "Logging and threat detection", question: "Do critical data and workload services send security-relevant diagnostics to an owned destination?", risk: "Missing resource-level audit events can hinder access investigation and incident reconstruction.", baseSeverity: "Medium", workloads: ["web-app", "data-analytics", "containers", "hybrid-workloads"], components: ["sql", "storage", "key-vault", "log-analytics"], affectedComponents: ["sql", "storage", "key-vault", "log-analytics"], targetComponents: ["log-analytics"], remediation: "Select diagnostic categories based on use cases, route them to an approved workspace or supported destination, and review volume before broad rollout.", validation: "Perform a benign service access, confirm expected fields arrive, and verify retention, access and alert ownership.", frameworks: ["MCSB v1 topic: logging and threat detection"], references: [refs.diagnostic, refs.mcsb] }),
  control({ id: "LOG-03", name: "Build detections and response ownership", domain: "Logging and threat detection", question: "Are priority threat scenarios mapped to tested detections, responders and response procedures?", risk: "Telemetry without detection ownership may not lead to timely investigation or containment.", baseSeverity: "Low", components: ["sentinel", "log-analytics"], affectedComponents: ["sentinel", "log-analytics"], targetComponents: ["sentinel"], remediation: "Choose a small set of threat scenarios, document required telemetry, build and tune detections, and assign an on-call response owner.", validation: "Replay a safe test event, confirm alert context and routing, and exercise the response playbook.", frameworks: ["MCSB v1 topic: logging and threat detection"], references: [refs.sentinel, refs.mcsb] }),
  control({ id: "GOV-01", name: "Apply Azure Policy and ownership standards", domain: "Governance and compliance", question: "Are policy assignments and resource ownership standards applied at suitable management-group or subscription scopes?", risk: "Inconsistent configuration and unclear ownership make drift and exceptions harder to manage.", baseSeverity: "Medium", components: ["azure-policy", "management-groups"], affectedComponents: ["azure-policy", "management-groups"], targetComponents: ["azure-policy", "management-groups"], remediation: "Define a small baseline, apply audit effects before enforcement, document exceptions and require an owner and expiry for each exception.", validation: "Deploy a safe test resource that violates an audit policy and confirm the finding, owner and remediation workflow.", frameworks: ["MCSB v1 topic: governance", "Cloud Adoption Framework: governance"], references: [refs.policy, refs.caf, refs.mcsb] }),
  control({ id: "APP-01", name: "Patch and scan workload components", domain: "Workload and application security", question: "Are operating systems, container images, runtimes and application dependencies scanned and patched on an owned schedule?", risk: "Known vulnerable components may remain exploitable when ownership and update windows are unclear.", baseSeverity: "Medium", workloads: ["web-app", "data-analytics", "containers", "hybrid-workloads"], components: ["app-service", "virtual-machines", "aks"], affectedComponents: ["app-service", "virtual-machines", "aks"], targetComponents: [], remediation: "Assign patch ownership per service, define severity-based remediation windows and test updates through a representative deployment path.", validation: "Review a recent patch or image scan, confirm remediation tracking and test application health after an update.", frameworks: ["MCSB v1 topic: workload security"], references: [refs.patch, refs.mcsb] }),
];

export const simulatorControls: SimulatorControl[] = [...azureSimulatorControls, ...m365Controls];

export const controlStatuses: { id: ControlStatus; label: string }[] = [
  { id: "implemented", label: "Implemented" },
  { id: "partial", label: "Partially implemented" },
  { id: "missing", label: "Not implemented" },
  { id: "unknown", label: "Unknown / not assessed" },
  { id: "na", label: "Not applicable" },
];

export const simulatorReferences = [
  refs.caf,
  { label: "Microsoft Azure Well-Architected Framework: Security", url: "https://learn.microsoft.com/en-us/azure/well-architected/security/" },
  refs.mcsb,
  { label: "CIS Microsoft Azure Foundations Benchmark", url: "https://www.cisecurity.org/benchmark/azure" },
  { label: "NIST Cybersecurity Framework 2.0", url: "https://www.nist.gov/cyberframework" },
];

export const simulatorReferenceNote = "Framework labels identify related topic areas, not clause-level mappings. They do not imply compliance, certification or proof that controls are effective.";

export const initialSimulatorState: SimulatorState = {
  platform: "azure",
  assessmentDepth: "quick",
  environment: "startup",
  workloads: ["web-app"],
  components: ["entra", "vnet", "nsg", "waf", "app-service", "sql", "storage", "key-vault", "private-endpoint", "defender", "log-analytics"],
  statuses: {},
  relationships: [],
  licenses: [],
  licensePopulations: {},
  unsureQuestions: [],
  skippedQuestions: [],
};

export function normalizeSimulatorState(value: unknown): SimulatorState {
  if (!value || typeof value !== "object") return structuredClone(initialSimulatorState);
  const input = value as Partial<SimulatorState>;
  const validEnvironments = environmentProfiles.map((item) => item.id);
  const validPlatforms = new Set(["azure", "m365", "combined"]);
  const validWorkloads = workloadProfiles.map((item) => item.id);
  const validComponents = new Set(simulatorComponents.map((item) => item.id));
  const validStatus = new Set<ControlStatus>(controlStatuses.map((item) => item.id));
  const validControlIds = new Set(simulatorControls.map((item) => item.id));
  const validRelationshipKinds = new Set<RelationshipKind>(["Identity access", "Network path", "Data access", "Telemetry"]);
  const statuses: Record<string, ControlStatus> = {};
  for (const controlItem of simulatorControls) {
    const value = input.statuses?.[controlItem.id];
    if (value && validStatus.has(value)) statuses[controlItem.id] = value;
  }
  const components = Array.isArray(input.components) ? [...new Set(input.components.filter((item): item is string => typeof item === "string" && validComponents.has(item)))] : [...initialSimulatorState.components];
  return {
    platform: validPlatforms.has(input.platform ?? "azure") ? input.platform ?? "azure" : "azure",
    assessmentDepth: input.assessmentDepth === "detailed" ? "detailed" : "quick",
    environment: validEnvironments.includes(input.environment as EnvironmentProfile) ? input.environment as EnvironmentProfile : initialSimulatorState.environment,
    workloads: Array.isArray(input.workloads) ? [...new Set(input.workloads.filter((item): item is WorkloadProfile => validWorkloads.includes(item as WorkloadProfile)))] : [...initialSimulatorState.workloads],
    components,
    statuses,
    relationships: Array.isArray(input.relationships) ? input.relationships.filter((relationship): relationship is SimulatorRelationship => Boolean(
      relationship && typeof relationship === "object" && typeof relationship.id === "string" &&
      typeof relationship.from === "string" && components.includes(relationship.from) &&
      typeof relationship.to === "string" && components.includes(relationship.to) &&
      relationship.from !== relationship.to && validRelationshipKinds.has(relationship.kind),
    )).map((relationship) => ({ ...relationship })) : [],
    licenses: Array.isArray(input.licenses) ? [...new Set(input.licenses.filter((id): id is string => typeof id === "string" && ["m365-e3", "m365-e5", "m365-e7", "o365-e3", "o365-e5", "business-premium", "defender-suite", "purview-suite", "entra-suite", "intune-suite", "custom", "unknown"].includes(id)))] : [],
    licensePopulations: input.licensePopulations && typeof input.licensePopulations === "object" ? Object.fromEntries(Object.entries(input.licensePopulations).filter(([key, value]) => typeof key === "string" && typeof value === "number" && Number.isFinite(value) && value >= 0).slice(0, 20)) : {},
    unsureQuestions: Array.isArray(input.unsureQuestions) ? [...new Set(input.unsureQuestions.filter((id): id is string => typeof id === "string" && validControlIds.has(id) && statuses[id] === "unknown"))] : [],
    skippedQuestions: Array.isArray(input.skippedQuestions) ? [...new Set(input.skippedQuestions.filter((id): id is string => typeof id === "string" && validControlIds.has(id) && statuses[id] === "unknown"))] : [],
  };
}

export function getRelevantControls(state: SimulatorState): SimulatorControl[] {
  return selectApplicableQuestions(simulatorControls, state);
}

function severityFor(controlItem: SimulatorControl, status: ControlStatus): Severity {
  if (status !== "partial") return controlItem.baseSeverity;
  if (controlItem.baseSeverity === "High") return "Medium";
  return "Low";
}

export function deriveSimulatorFindings(state: SimulatorState): SimulatorFinding[] {
  return getRelevantControls(state)
    .filter((item) => ["missing", "partial"].includes(state.statuses[item.id] ?? "unknown"))
    .map((item) => {
      const status = state.statuses[item.id] ?? "unknown";
      const severity = severityFor(item, status);
      const priority: SimulatorFinding["priority"] = severity === "High" ? "Immediate" : severity === "Medium" ? "Near-term" : "Planned";
      return {
        id: `SIM-${item.id}`,
        controlId: item.id,
        title: item.name,
        domain: item.domain,
        severity,
        priority,
        reason: `You reported this control as ${status === "missing" ? "not implemented" : "partially implemented"}. No tenant configuration was queried.`,
        reportedStatus: status,
        affectedComponents: item.affectedComponents.filter((id) => state.components.includes(id) || id === "entra"),
        impact: item.risk,
        remediation: item.remediation,
        validation: item.validation,
        frameworks: item.frameworks,
        references: item.references,
        targetComponents: item.targetComponents,
      };
    })
    .sort((a, b) => ["High", "Medium", "Low"].indexOf(a.severity) - ["High", "Medium", "Low"].indexOf(b.severity) || a.title.localeCompare(b.title));
}

export function getUnknownControls(state: SimulatorState): SimulatorControl[] {
  return getRelevantControls(state).filter((item) => (state.statuses[item.id] ?? "unknown") === "unknown");
}

export function getTargetComponentIds(state: SimulatorState, findings = deriveSimulatorFindings(state)): string[] {
  const target = new Set(state.components);
  for (const finding of findings) for (const componentId of finding.targetComponents) target.add(componentId);
  if (["landing-zone", "multi-subscription"].includes(state.environment)) {
    target.add("management-groups");
    target.add("azure-policy");
  }
  return simulatorComponents.filter((component) => target.has(component.id)).map((component) => component.id);
}

export function summarizeSimulator(state: SimulatorState) {
  const relevant = getRelevantControls(state);
  const unsure = new Set(state.unsureQuestions ?? []);
  const skipped = new Set(state.skippedQuestions ?? []);
  const counts = { implemented: 0, partial: 0, missing: 0, unknown: 0, unsure: 0, skipped: 0, na: 0 };
  for (const item of relevant) {
    const status = state.statuses[item.id] ?? "unknown";
    if (status !== "unknown") counts[status] += 1;
    else if (skipped.has(item.id)) counts.skipped += 1;
    else if (unsure.has(item.id)) counts.unsure += 1;
    else counts.unknown += 1;
  }
  return { total: relevant.length, counts, findings: deriveSimulatorFindings(state).length, unknown: counts.unknown };
}
