/** Local official SVG assets; other Microsoft 365 services intentionally use a neutral labelled fallback. */
export const architectureIconRegistry: Record<string, { path: string; source: string }> = {
  "management-groups": { path: "management-groups.svg", source: "Azure_Public_Service_Icons_V24" },
  "azure-policy": { path: "azure-policy.svg", source: "Azure_Public_Service_Icons_V24" },
  vnet: { path: "vnet.svg", source: "Azure_Public_Service_Icons_V24" },
  nsg: { path: "nsg.svg", source: "Azure_Public_Service_Icons_V24" },
  firewall: { path: "firewall.svg", source: "Azure_Public_Service_Icons_V24" },
  waf: { path: "waf.svg", source: "Azure_Public_Service_Icons_V24" },
  "app-service": { path: "app-service.svg", source: "Azure_Public_Service_Icons_V24" },
  aks: { path: "aks.svg", source: "Azure_Public_Service_Icons_V24" },
  sql: { path: "sql.svg", source: "Azure_Public_Service_Icons_V24" },
  storage: { path: "storage.svg", source: "Azure_Public_Service_Icons_V24" },
  "key-vault": { path: "key-vault.svg", source: "Azure_Public_Service_Icons_V24" },
  "private-endpoint": { path: "private-endpoint.svg", source: "Azure_Public_Service_Icons_V24" },
  defender: { path: "defender.svg", source: "Azure_Public_Service_Icons_V24" },
  "log-analytics": { path: "log-analytics.svg", source: "Azure_Public_Service_Icons_V24" },
  sentinel: { path: "sentinel.svg", source: "Azure_Public_Service_Icons_V24" },
  intune: { path: "intune.svg", source: "Azure_Public_Service_Icons_V24" },
};

export function iconPathFor(componentId: string, icon?: string) {
  return architectureIconRegistry[icon ?? componentId]?.path;
}
