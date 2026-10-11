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
    relatedSlugs: ["investigate-sign-in-events", "bound-ai-agent-permissions"],
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
    relatedSlugs: ["scope-azure-role-assignments", "bound-ai-agent-permissions"],
    relatedProjects: [{ label: "Detection & SOC Lab", href: "/detection-soc" }],
  },
  {
    title: "Keep AI agent identities and tools inside explicit boundaries",
    slug: "bound-ai-agent-permissions",
    summary: "Treat prompts, retrieved content, identities, and tool calls as separate security boundaries when planning an agent integration.",
    publishedAt: "2026-10-11",
    lastReviewedAt: "2026-10-11",
    category: "AI security",
    tags: ["AI agents", "tool permissions", "prompt injection"],
    status: "Published",
    body: `## Recommendation

Design an AI agent so that a model response cannot grant itself authority. Keep authorization in the application and tool layer, use an identity with narrowly scoped permissions, and make sensitive actions observable and reviewable.

## A review sequence

1. List each data source and tool the agent can reach. Record the identity used, permitted operations, data boundary, and accountable owner.
2. Give the agent or its calling service only the permissions required for the intended workflow. Enforce access in the service or tool, not only in a system prompt.
3. Treat user input and retrieved documents as untrusted content. Define how the application separates instructions from data and how it handles unsafe or irrelevant tool requests.
4. Add confirmation or a human approval step for consequential actions. Prefer read-only capability until the workflow and its authorization checks have been reviewed.
5. Capture the request, relevant retrieved-source identifiers, tool choice, authorization outcome, and action result where the system permits. Protect these logs as sensitive data.
6. Test expected use, unauthorized tool requests, cross-user data boundaries, and untrusted instructions in an isolated or synthetic environment. Retest after changes to tools, prompts, identity, or retrieval.

## What to validate

- Tool endpoints enforce the caller’s authorization independently of model-generated text.
- The agent cannot use another user’s data through a direct identifier or alternate tool path.
- Consequential actions require the expected approval and have an attributable result.
- The test record distinguishes attempted behavior from a tool action that actually executed.

## Common mistakes

- Assuming that a refusal proves a backend tool was never called.
- Giving an agent broad credentials because a prompt says it should act safely.
- Trusting retrieved documents as instructions or allowing them to silently change tool permissions.
- Logging secrets or personal data while trying to improve observability.

## Scope boundary

These recommendations are design and test guidance. A prompt-only test cannot establish the permissions, hidden tool calls, or data access of an agent that does not expose those traces. Report that evidence gap and test only systems for which you have authorization.`,
    references: [
      { label: "Microsoft AI agent shared responsibility model", url: "https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility-ai-agent" },
      { label: "OWASP Top 10 for LLM Applications", url: "https://genai.owasp.org/llm-top-10/" },
      { label: "MITRE ATLAS", url: "https://atlas.mitre.org/" },
    ],
    relatedSlugs: ["scope-azure-role-assignments", "investigate-sign-in-events"],
    relatedProjects: [{ label: "Azure Security Journey", href: "/labs/azure-security-journey" }, { label: "AI Security Lab", href: "/lab" }],
  },
];

export function getRecommendation(slug: string) {
  return recommendationArticles.find((article) => article.slug === slug);
}
