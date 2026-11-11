export type RecommendationArticle = {
  title: string;
  slug: string;
  summary: string;
  publishedAt: string;
  lastReviewedAt: string;
  category: string;
  tags: string[];
  status: "Published" | "Draft";
  body: string;
  references: { label: string; url: string }[];
  relatedSlugs: string[];
  relatedProjects: { label: string; href: string }[];
};

export const recommendationArticles: RecommendationArticle[] = [
  {
    title: "Scope Azure role assignments to the resource that needs them",
    slug: "scope-azure-role-assignments",
    summary: "A practical review sequence for identifying broad Azure permissions and reducing scope without disrupting a workload.",
    publishedAt: "2026-10-11",
    lastReviewedAt: "2026-10-11",
    category: "Azure identity",
    tags: ["Azure RBAC", "least privilege", "managed identity"],
    status: "Published",
    body: `## Recommendation

Grant a principal only the permissions it needs, at the narrowest scope that supports its work. Azure role assignments combine a principal, role definition, and scope. A broader scope can make the same role apply to more resources than intended.

## A review sequence

1. Inventory role assignments at management-group, subscription, resource-group, and resource scopes. Record the principal, role, scope, owner, and business purpose.
2. Identify broad or privileged assignments and confirm whether the principal still needs them. Include users, groups, service principals, and managed identities.
3. Confirm the exact operations and resources the workload requires with its owner. Prefer an appropriate built-in role; use a custom role only when built-in roles do not fit and a responsible team can review the permissions.
4. Pilot a narrower assignment in a non-production scope or representative workload. Observe expected activity and investigate denied operations before removing the prior grant.
5. Remove superseded assignments through the normal change process. Record the approver, effective scope, validation evidence, and review date.

## What to validate

- The principal can perform its documented task against the intended resource.
- The principal cannot perform unrelated privileged tasks within the reviewed test scope.
- The role assignment uses the intended principal, role, and resource scope.
- Workload owners and responders know how to request and review access changes.

Treat a successful application workflow as one piece of evidence. It does not prove every permission path is least-privileged; review effective access and test relevant denied and allowed operations within an authorized scope.

## Common mistakes

- Keeping a subscription-wide grant because it was faster to set up.
- Choosing a role by its name without checking the permissions relevant to the task.
- Removing access before the workload owner has tested a realistic operation.
- Treating a list of assignments as proof that inherited or data-plane permissions were fully reviewed.

## Example access decision (illustrative)

\`\`\`text
Principal: named workload identity
Role: minimum role that supports the required operation
Scope: the specific resource or resource group
Owner: workload team
Review: after a material workload or permission change
\`\`\`

This is a review template, not an Azure command or a prescribed role assignment. Confirm the correct role and scope for the workload before applying changes.`,
    references: [
      { label: "Understand Azure role assignments", url: "https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments" },
      { label: "Best practices for Azure RBAC", url: "https://learn.microsoft.com/en-us/azure/role-based-access-control/best-practices" },
    ],
    relatedSlugs: ["scope-azure-role-assignments"],
    relatedProjects: [{ label: "Azure Cloud Security Journey", href: "/labs/azure-security-journey" }],
  },
  {
    title: "Investigate sign-in events with identity, client, and resource context",
    slug: "investigate-sign-in-events",
    summary: "Use the fields around a sign-in to guide investigation, preserve uncertainty, and avoid drawing conclusions from a single alert or location value.",
    publishedAt: "2026-10-11",
    lastReviewedAt: "2026-10-11",
    category: "Detection & response",
    tags: ["Microsoft Entra", "sign-in logs", "incident response"],
    status: "Published",
    body: `## Recommendation

Investigate a sign-in in context. Begin with who signed in, which client or application was used, and which resource was accessed. Add the authentication result, device, network, and relevant time window when those details are available.

## A review sequence

1. Confirm the alert or report timeframe and the identity involved. Preserve the relevant event identifiers and timestamps.
2. Review the sign-in details in Microsoft Entra. Check the client application and target resource alongside the result and authentication details.
3. Compare the event with nearby activity for the same identity, application, device, and resource. Look for corroborating evidence such as a user report, endpoint alert, or an unexpected access pattern.
4. Contact the identity owner through a trusted channel when appropriate. Do not assume that an unfamiliar location alone proves compromise.
5. Follow the organization’s incident-response policy if the evidence supports unauthorized access. Record what was observed, what remains unknown, actions taken, and who approved them.

## What to validate

- The investigation record identifies the relevant sign-in event and time range.
- The identity, client, target resource, and available authentication details were reviewed.
- Any containment action follows the approved procedure and is linked to the evidence that justified it.
- The conclusion distinguishes confirmed observations from hypotheses and missing telemetry.

## Common mistakes

- Treating a location or unfamiliar IP as a verdict without checking other context.
- Equating a failed sign-in with a successful compromise, or a successful sign-in with proof of a legitimate user.
- Closing an investigation without recording what evidence was unavailable.
- Enabling new log exports without checking access, retention, and consumption implications.

## Evidence note

Microsoft Entra sign-in logs contain fields that help administrators understand sign-in activity. Their meaning and availability depend on the event and tenant configuration. Use the official field reference when interpreting a particular record; do not infer hidden activity from a final status alone.`,
    references: [
      { label: "Learn about sign-in log activity details", url: "https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details" },
      { label: "Microsoft Entra monitoring and health documentation", url: "https://learn.microsoft.com/en-us/entra/identity/monitoring-health/" },
      { label: "Logs available for streaming from Microsoft Entra ID", url: "https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-diagnostic-settings-logs-options" },
    ],
    relatedSlugs: ["scope-azure-role-assignments", "investigate-sign-in-events"],
    relatedProjects: [{ label: "Detection & SOC Lab", href: "/detection-soc" }],
  },

  {
    title: "Replace long-lived AWS workload keys with scoped temporary credentials",
    slug: "aws-temporary-workload-credentials",
    summary: "Plan workload access around IAM roles, federation, short-lived credentials, and least-privilege policy review.",
    publishedAt: "2026-11-11",
    lastReviewedAt: "2026-11-11",
    category: "AWS identity",
    tags: ["AWS IAM", "workload identity", "temporary credentials"],
    status: "Published",
    body: `## Recommendation

Prefer short-lived role credentials for workloads over long-lived IAM user access keys. Scope each workload identity to the actions and resources it needs, and keep trust relationships explicit and reviewable.

## A review sequence

1. Inventory workloads, execution environments, resource access, owners, and any existing access keys. Do not rotate or remove a key until its dependency and recovery path are understood.
2. For AWS-hosted workloads, identify an IAM role delivery mechanism supported by the compute service. For external workloads, evaluate federation such as OIDC or SAML, IAM Roles Anywhere, or a service-specific integration that issues temporary credentials.
3. Define a narrow trust policy and permissions policy. Review principals, actions, resources, and conditions separately; avoid wildcard permissions unless a documented technical requirement justifies them.
4. Test the workload's intended operations and expected denials in a non-production environment. Check that the credential source is temporary and that the application does not fall back to a static key.
5. Remove an old key only after owner confirmation, usage review, deployment validation, and a rollback plan. Record exceptions with an owner and expiry.

## What to validate

- The workload assumes the intended role from an explicitly trusted principal.
- Credentials are temporary where supported and are not written to source, images, logs, or browser storage.
- The identity can perform the intended operations and is denied unrelated actions in representative tests.
- Access Analyzer findings, role trust, policy changes, and key exceptions receive owner review.

## Common failure modes and limitations

A role with an overly broad policy is still overprivileged. Federation trust conditions that are too broad can let an unintended workload assume a role. Removing keys without checking deployment dependencies can cause outages. Temporary credentials reduce key lifetime; they do not prevent a compromised authorized workload from misusing its active permissions.

## Scope

This is architecture and review guidance. It does not inspect an AWS account or certify that a role is configured correctly. Validate current IAM behavior and service integration in the target account before rollout.`,
    references: [
      { label: "Security best practices in IAM", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html" },
      { label: "IAM roles terms and concepts", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html" },
      { label: "IAM Access Analyzer", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html" },
    ],
    relatedSlugs: ["investigate-sign-in-events", "scope-azure-role-assignments"],
    relatedProjects: [{ label: "Architecture Studio", href: "/architecture-studio" }],
  },
  {
    title: "Build a governed Google Cloud resource hierarchy before onboarding workloads",
    slug: "gcp-governed-resource-hierarchy",
    summary: "Use organization, folder, project and policy boundaries to establish ownership and safe workload onboarding.",
    publishedAt: "2026-11-11",
    lastReviewedAt: "2026-11-11",
    category: "Google Cloud governance",
    tags: ["Google Cloud", "organization policy", "landing zone"],
    status: "Published",
    body: `## Recommendation

Design the Google Cloud resource hierarchy and shared platform foundations before teams deploy production workloads. Make project ownership, policy inheritance, network boundaries, logging, and security responsibilities explicit.

## A review sequence

1. Identify the organization boundary, identity source, platform owners, workload teams, and required environments. Decide how folders and projects will express lifecycle, ownership, and policy inheritance.
2. Define a small set of organization policies that express approved guardrails. Check the scope and inherited effects of each policy, and test exceptions before applying constraints broadly.
3. Establish project creation and ownership workflows, labels, billing responsibilities, network patterns, and privileged access. Separate shared platform services from workload resources where the operating model requires it.
4. Configure audit logging and central visibility for required projects and services. Define who can view, change, and retain logs, and verify that investigation queries can answer the priority use cases.
5. Onboard one representative workload. Validate inherited policies, access, network reachability, logging, and incident ownership before expanding the foundation.

## What to validate

- Every production project has an accountable owner, approved location and intended parent folder.
- Organization policies have documented scope, test results, exceptions and a review owner.
- Privileged access follows least privilege, and service identities have a workload owner and lifecycle.
- Required audit logs reach an appropriately protected destination and are available to responders.

## Trade-offs and limitations

A restrictive hierarchy can obstruct teams if policy intent and exception paths are unclear. A permissive hierarchy can allow inconsistent projects and unclear ownership. Google Cloud services and organization-policy constraints have different support and inheritance behavior, so verify each control against current service documentation rather than assuming uniform enforcement.

## Scope

This guidance describes design and review steps. MeiAI does not deploy a Google Cloud foundation or query an organization. Confirm applicability, permissions and change impact with the platform owners before implementation.`,
    references: [
      { label: "Enterprise foundations blueprint", url: "https://docs.cloud.google.com/architecture/blueprints/security-foundations" },
      { label: "Use IAM securely", url: "https://docs.cloud.google.com/iam/docs/using-iam-securely" },
      { label: "Organization Policy overview", url: "https://cloud.google.com/resource-manager/docs/organization-policy/overview" },
      { label: "Cloud Audit Logs overview", url: "https://cloud.google.com/logging/docs/audit" },
    ],
    relatedSlugs: ["scope-azure-role-assignments"],
    relatedProjects: [{ label: "Architecture Studio", href: "/architecture-studio" }],
  },

];

export function getRecommendation(slug: string) {
  return recommendationArticles.find((article) => article.slug === slug);
}
