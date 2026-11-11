import Link from "next/link";
import SiteNavigation from "@/components/SiteNavigation";

const stages = [
  ["01", "Define scope", "Select the cloud platforms, workloads and components that are actually in scope."],
  ["02", "Review applicable checks", "MeiAI filters its structured control questions against the scope you chose."],
  ["03", "Record answers and evidence", "Mark controls as implemented, partial, missing, unknown or not applicable, and preserve evidence references."],
  ["04", "Review potential findings", "Findings are derived from recorded answers. Prioritize them with your owners and business context."],
  ["05", "Validate changes", "Use the linked implementation guidance to verify a change in the target environment and record the result."],
];

export default function MethodologyPage() {
  return (
    <main id="main-content" tabIndex={-1} className="platform-page">
      <SiteNavigation />
      <section className="workspace-page-heading">
        <div>
          <p className="eyebrow-blue">MEIAI / ASSESSMENT METHOD</p>
          <h1>Make security claims traceable to evidence.</h1>
          <p>MeiAI helps organize a cloud security self-assessment. It does not connect to or scan a cloud tenant, and it does not certify compliance.</p>
        </div>
        <div className="heading-actions"><Link className="button-blue" href="/security-assessment">Open Security Assessment ↗</Link></div>
      </section>
      <section className="scope-notice"><strong>Assessment boundary</strong><span>Results reflect the scope and answers entered by the user in this browser. Unknown, skipped and unanswered checks are not passes. Confirm each conclusion against the actual environment and evidence.</span></section>
      <section className="workflow-strip">
        <p className="eyebrow-blue">A REPEATABLE REVIEW</p>
        <div className="method-stages">{stages.map(([number, title, text]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{text}</p></article>)}</div>
      </section>
      <section className="methodology-notes">
        <h2>How to interpret the results</h2>
        <ul>
          <li><strong>Coverage</strong> means a response state was recorded; it is not a technical validation.</li>
          <li><strong>Potential findings</strong> are prompts for review based on reported missing or partial controls.</li>
          <li><strong>Unknown and not assessed</strong> items remain visible so missing evidence is not hidden.</li>
          <li><strong>Framework references</strong> provide context only. They do not establish compliance or certification.</li>
          <li><strong>Tenant scanning</strong> is not available. No cloud credentials are requested or stored.</li>
        </ul>
      </section>
      <footer className="app-footer"><Link className="app-brand" href="/">Mei<span>AI</span><i>.</i></Link><p>Cloud security engineering guidance. Verify product capabilities and licensing with current vendor sources.</p><Link href="/learn">Browse Knowledge Centre</Link></footer>
    </main>
  );
}
