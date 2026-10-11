import type { SecurityScope } from "@/lib/azureSecurityContent";

export type OrganizationSize = "small" | "medium" | "enterprise";
export type BaselineChoice = "unknown" | "none" | "E3" | "E5" | "E7" | "other";
export type Entitlement = "bundle" | "additional" | "consumption" | "optional" | "na";
export type CostComponent = {
  id: string; label: string; detail: string; scopes: SecurityScope[]; category: "License" | "Consumption" | "Optional";
  unit: string; defaultQuantity: (users:number,endpoints:number,servers:number,subscriptions:number,gb:number)=>number;
  initialEntitlement: Entitlement; note: string;
};

export const orgPresets: Record<OrganizationSize,{label:string;users:number;endpoints:number;servers:number;subscriptions:number;sentinelGb:number}> = {
  small:{label:"Small organization",users:100,endpoints:100,servers:10,subscriptions:1,sentinelGb:50},
  medium:{label:"Medium organization",users:1000,endpoints:1000,servers:100,subscriptions:5,sentinelGb:200},
  enterprise:{label:"Large enterprise",users:10000,endpoints:10000,servers:500,subscriptions:20,sentinelGb:500},
};

export const costComponents: CostComponent[] = [
  {id:"m365E3",label:"Microsoft 365 E3 plan uplift",detail:"Illustrative US commercial annual-commit list price; compare selected target license with the current baseline.",scopes:["m365","combined"],category:"License",unit:"per user/month",defaultQuantity:(u)=>u,initialEntitlement:"additional",note:"E3 target list price uses current US official price; no-Teams SKUs, region, taxes and agreement pricing differ."},
  {id:"m365E5",label:"Microsoft 365 E5 plan uplift",detail:"Illustrative US commercial annual-commit list price; compare selected target license with the current baseline.",scopes:["m365","combined"],category:"License",unit:"per user/month",defaultQuantity:(u)=>u,initialEntitlement:"additional",note:"E5 may bundle some security capabilities; do not add standalone license rates for features verified as included."},
  {id:"m365E7",label:"Microsoft 365 E7 plan uplift",detail:"Illustrative US annual-commit list price for the Microsoft 365 E7 Frontier Suite. Use the M365 comparison link to confirm current SKU and terms.",scopes:["m365","combined"],category:"License",unit:"per user/month",defaultQuantity:(u)=>u,initialEntitlement:"additional",note:"USD $99 with Teams; Microsoft also lists $90.45 without Teams. E7 bundles E5, Microsoft 365 Copilot, Microsoft Entra Suite and Agent 365. Do not double-count features included in the purchased SKU; validate user eligibility and terms."},
  {id:"identity",label:"Identity protection / governance add-on",detail:"Only include incremental users or features not already covered by the selected suite.",scopes:["azure","m365","combined"],category:"License",unit:"per user/month",defaultQuantity:(u)=>u,initialEntitlement:"optional",note:"Entra entitlement varies by plan, user eligibility and feature."},
  {id:"defenderOffice",label:"Defender for Office 365",detail:"Email and collaboration protection plan or add-on for covered users.",scopes:["m365","combined"],category:"License",unit:"per user/month",defaultQuantity:(u)=>u,initialEntitlement:"optional",note:"Check plan 1/2 features and any suite inclusion before entering a price."},
  {id:"defenderEndpoint",label:"Defender for Endpoint",detail:"Endpoint protection, detection and response; server and user licensing differ.",scopes:["m365","combined"],category:"License",unit:"per endpoint/month",defaultQuantity:(_u,e)=>e,initialEntitlement:"optional",note:"Verify endpoint/server product, device eligibility and suite coverage."},
  {id:"defenderIdentity",label:"Defender for Identity",detail:"Identity threat detection for supported identity infrastructure.",scopes:["m365","combined"],category:"License",unit:"per user/month",defaultQuantity:(u)=>u,initialEntitlement:"optional",note:"Feature coverage may be bundled in selected Microsoft 365 plans."},
  {id:"defenderCloudApps",label:"Defender for Cloud Apps",detail:"Cloud app discovery, OAuth governance and supported session controls.",scopes:["m365","combined"],category:"License",unit:"per user/month",defaultQuantity:(u)=>u,initialEntitlement:"optional",note:"Check standalone and Microsoft 365 suite entitlements."},
  {id:"intune",label:"Intune / device management",detail:"Device enrollment, compliance and endpoint management capabilities.",scopes:["m365","combined"],category:"License",unit:"per user/month",defaultQuantity:(u)=>u,initialEntitlement:"optional",note:"Entitlements vary by M365/EMS plan and platform."},
  {id:"purview",label:"Microsoft Purview incremental capabilities",detail:"User-based or pay-as-you-go information protection, DLP, records and compliance features.",scopes:["m365","combined"],category:"License",unit:"per user/month",defaultQuantity:(u)=>u,initialEntitlement:"optional",note:"Avoid double-counting included features; some source features use pay-as-you-go meters."},
  {id:"defenderCloud",label:"Defender for Cloud workload plans",detail:"Selected CSPM/CWPP workload plan by covered resource type.",scopes:["azure","combined"],category:"Consumption",unit:"per covered resource/month",defaultQuantity:(_u,_e,s)=>s,initialEntitlement:"optional",note:"Resource-type plan coverage and unit pricing differ; model by actual plan and resource."},
  {id:"firewall",label:"Azure Firewall / WAF / network security",detail:"Firewall hours, capacity, WAF, DDoS, NAT, bandwidth and private networking.",scopes:["azure","combined"],category:"Consumption",unit:"monthly estimate",defaultQuantity:()=>1,initialEntitlement:"optional",note:"Enter an estimate based on region, size, hours, throughput and data transfer."},
  {id:"keyvault",label:"Key Vault / managed HSM",detail:"Operations, key type, HSM and private networking costs.",scopes:["azure","combined"],category:"Consumption",unit:"monthly estimate",defaultQuantity:()=>1,initialEntitlement:"optional",note:"Meter depends on key type, transactions and selected service."},
  {id:"azureMonitor",label:"Azure Monitor / Log Analytics",detail:"Platform and workload telemetry, table plan, retention, search and restore.",scopes:["azure","combined"],category:"Consumption",unit:"monthly estimate",defaultQuantity:()=>1,initialEntitlement:"consumption",note:"Estimate from measured source volume and destination table plans."},
  {id:"sentinel",label:"Microsoft Sentinel ingestion and retention",detail:"Starting volume is illustrative. Enter a region/tier effective rate and account for commitment, free allowances, retention and data lake.",scopes:["azure","combined"],category:"Consumption",unit:"per GB/day × 30.4 days",defaultQuantity:(_u,_e,_s,_sub,gb)=>gb*30.4,initialEntitlement:"consumption",note:"The default GB/day is a scenario assumption, not an organization average or quote."},
  {id:"backup",label:"Backup and recovery",detail:"Protected instances, storage growth, redundancy, replication and restore operations.",scopes:["azure","combined"],category:"Consumption",unit:"monthly estimate",defaultQuantity:()=>1,initialEntitlement:"optional",note:"Model by workload, retention, redundancy and recovery requirements."},
  {id:"ai",label:"AI model, search and application usage",detail:"Inference, retrieval, hosting, evaluation and runtime monitoring.",scopes:["azure","combined"],category:"Consumption",unit:"monthly estimate",defaultQuantity:()=>1,initialEntitlement:"optional",note:"Price depends on model, region, input/output mix, capacity and usage."},
  {id:"sentinelM365",label:"Sentinel integration for Microsoft 365 signals",detail:"SIEM ingestion, analytics, retention and automation for selected Microsoft 365 signals.",scopes:["m365","combined"],category:"Consumption",unit:"monthly estimate",defaultQuantity:()=>1,initialEntitlement:"consumption",note:"Do not assume Microsoft 365 data is free to ingest; confirm connector, data tier and current billing."},
  {id:"securityCopilot",label:"Security Copilot capacity or included SCUs",detail:"Capacity is available only under qualifying plans and terms; estimate provisioned units/usage separately.",scopes:["m365","combined"],category:"Optional",unit:"monthly estimate",defaultQuantity:()=>1,initialEntitlement:"optional",note:"Confirm tenant eligibility, included capacity, provisioned hours and overage in current documentation."},
  {id:"securityAgents",label:"Security agents and add-ons",detail:"Optional product agents, incident automation or other AI-assisted security capabilities.",scopes:["azure","m365","combined"],category:"Optional",unit:"monthly estimate",defaultQuantity:()=>1,initialEntitlement:"optional",note:"Agent entitlements and consumption vary; verify individual product terms."},
  {id:"thirdParty",label:"Third-party integrations and tools",detail:"External CSPM, backup, identity, SIEM, vulnerability and integration services.",scopes:["azure","m365","combined"],category:"Optional",unit:"monthly estimate",defaultQuantity:()=>1,initialEntitlement:"optional",note:"Enter only costs not already included in another line item."},
];

export type CostState = {
  scope: SecurityScope; size: OrganizationSize; currency:"USD"|"INR"|"GBP"|"EUR"|"CAD"; users:number; endpoints:number; servers:number; subscriptions:number; sentinelGb:number; implementationDays:number; operationsHoursMonthly:number; implementationDayRate:number|null; operationsHourRate:number|null;
  currentM365:BaselineChoice; targetM365:BaselineChoice; hasStandaloneDefender:boolean; hasSentinel:boolean; hasDefenderCloud:boolean; hasCopilot:boolean;
  entitlement:Record<string,Entitlement>; enabled:Record<string,boolean>; rates:Record<string,number|null>; compare:boolean;
};

export const createCostState = ():CostState => {
  const size = orgPresets.small;
  const entitlement = Object.fromEntries(costComponents.map(c=>[c.id,c.initialEntitlement])) as Record<string,Entitlement>;
  const enabled = Object.fromEntries(costComponents.map(c=>[c.id,false])) as Record<string,boolean>;
  const rates = Object.fromEntries(costComponents.map(c=>[c.id,null])) as Record<string,number|null>;
  rates.m365E3 = 39; rates.m365E5 = 60; rates.m365E7 = 99;
  enabled.sentinel = true; enabled.sentinelM365 = true;
  return {scope:"azure",size:"small",currency:"USD",users:size.users,endpoints:size.endpoints,servers:size.servers,subscriptions:size.subscriptions,sentinelGb:size.sentinelGb,implementationDays:20,operationsHoursMonthly:0,implementationDayRate:null,operationsHourRate:null,currentM365:"unknown",targetM365:"unknown",hasStandaloneDefender:false,hasSentinel:false,hasDefenderCloud:false,hasCopilot:false,entitlement,enabled,rates,compare:false};
};

export function estimateCost(state:CostState) {
  const lines = costComponents.filter(c=>c.scopes.includes(state.scope)).map(component=>{
    const status=state.entitlement[component.id] ?? component.initialEntitlement;
    const enabled=state.enabled[component.id] ?? false;
    const quantity=component.defaultQuantity(state.users,state.endpoints,state.servers,state.subscriptions,state.sentinelGb);
    const planName=component.id==="m365E3"?"E3":component.id==="m365E5"?"E5":component.id==="m365E7"?"E7":null;
    const isTargetPlan=Boolean(planName&&state.targetM365===planName);
    const isCurrentPlan=Boolean(planName&&state.currentM365===planName);
    const targetRate=state.rates[component.id];
    let amount:number|null=0;
    let treatment="Excluded: enable only if applicable.";
    if (isTargetPlan) { amount=targetRate===null?null:quantity*targetRate; treatment="Target plan list-price estimate."; }
    else if (isCurrentPlan) { amount=0; treatment="Existing baseline; excluded from incremental cost."; }
    else if (enabled && status==="bundle") { amount=0; treatment="Marked included in current entitlement; verify SKU and eligible users."; }
    else if (enabled && status==="additional") { amount=targetRate===null?null:quantity*targetRate; treatment="Additional license estimate."; }
    else if (enabled && status==="consumption") { amount=targetRate===null?null:quantity*targetRate; treatment="Consumption estimate; enter effective regional rate."; }
    else if (enabled && status==="optional") { amount=targetRate===null?null:quantity*targetRate; treatment="Optional capability; not included in current subtotal until priced."; }
    else if (status==="na") { amount=0; treatment="Marked not applicable."; }
    return {component,quantity,amount,treatment,status,enabled};
  });
  const planRates:Record<string,number|null>={E3:state.rates.m365E3,E5:state.rates.m365E5,E7:state.rates.m365E7};
  const currentM365Rate=state.currentM365==="none"?0:planRates[state.currentM365]??null;
  const targetM365Rate=state.targetM365==="none"?0:planRates[state.targetM365]??null;
  const currentM365Cost=currentM365Rate===null?null:currentM365Rate*state.users;
  const targetM365Cost=targetM365Rate===null?null:targetM365Rate*state.users;
  const m365Uplift=currentM365Cost===null||targetM365Cost===null?null:Math.max(0,targetM365Cost-currentM365Cost);
  const pricedLines=lines.filter(l=>l.enabled && l.amount!==null && !["m365E3","m365E5","m365E7"].includes(l.component.id));
  const knownMonthly=(m365Uplift??0)+pricedLines.reduce((sum,l)=>sum+(l.amount??0),0);
  const missing=lines.filter(l=>l.enabled && l.amount===null).map(l=>l.component.label);
  const currentBaselineMissing=state.currentM365!=="none" && state.currentM365!=="other" && state.currentM365!=="unknown" && currentM365Cost===null;
  const targetMissing=state.targetM365!=="none" && state.targetM365!=="other" && state.targetM365!=="unknown" && targetM365Cost===null;
  if (currentBaselineMissing) missing.push("Current Microsoft 365 plan price/baseline");
  if (targetMissing) missing.push("Target Microsoft 365 plan price");
  if(state.scope!=="azure"&&state.targetM365!=="none"&&(state.currentM365==="unknown"||state.currentM365==="other"||state.targetM365==="unknown"||state.targetM365==="other")) missing.push("Microsoft 365 license delta (current or target plan is not confirmed)");
  const implementationCost=state.implementationDayRate===null?null:state.implementationDays*state.implementationDayRate;
  const operationalCost=state.operationsHoursMonthly===0?0:state.operationsHourRate===null?null:state.operationsHoursMonthly*state.operationsHourRate;
  if(implementationCost===null&&state.implementationDays>0) missing.push("One-time implementation day rate");
  if(operationalCost===null) missing.push("Monthly operational effort rate");
  return {lines,knownMonthly,knownAnnual:knownMonthly*12,m365Uplift,currentM365Cost,targetM365Cost,implementationCost,operationalCost,missing,hasUnknown:missing.length>0};
}

export function compareCostStates(first:CostState,second:CostState){
  if(first.currency!==second.currency)return {sameCurrency:false,monthlyDifference:null as number|null,annualDifference:null as number|null,percentageDifference:null as number|null};
  const a=estimateCost(first);const b=estimateCost(second);const monthlyDifference=b.knownMonthly-a.knownMonthly;
  return {sameCurrency:true,monthlyDifference,annualDifference:monthlyDifference*12,percentageDifference:a.knownMonthly===0?null:monthlyDifference/a.knownMonthly*100};
}

export const pricingSources = [
  {label:"Microsoft 365 enterprise plans and pricing",url:"https://www.microsoft.com/en-us/microsoft-365/enterprise/microsoft-365-plans-and-pricing",checked:"2026-10-11",note:"US annual-commit list prices used as editable examples: E3 $39, E5 $60 and E7 $99 per user/month. Microsoft also lists E7 without Teams at $90.45. Confirm current SKU, region, term and agreement on Microsoft’s page."},
  {label:"Microsoft Sentinel billing",url:"https://learn.microsoft.com/en-us/azure/sentinel/billing",checked:"2026-10-11",note:"Consumption depends on region, data tier, commitment, retention and connected services."},
  {label:"Defender for Cloud pricing",url:"https://azure.microsoft.com/en-us/pricing/details/defender-for-cloud/",checked:"2026-10-11",note:"Plan and covered resource type drive workload protection pricing."},
  {label:"Microsoft Purview licensing",url:"https://learn.microsoft.com/en-us/purview/purview-licensing",checked:"2026-10-11",note:"Check feature-specific licensing and pay-as-you-go meters."},
  {label:"Security Copilot capacity and billing",url:"https://learn.microsoft.com/en-us/copilot/security/security-compute-units-capacity",checked:"2026-10-11",note:"Confirm current capacity, included SCUs and overage details."},
];
