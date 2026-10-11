import Link from "next/link";
import SiteNavigation from "@/components/SiteNavigation";

const agents = [
  ["01", "Alfred", "Enterprise support"],
  ["02", "Jarvis", "Knowledge assistant"],
  ["03", "TARS", "IT operations"],
  ["04", "Athena", "Multi-agent research"],
  ["05", "kaala", "Hardened comparison"],
];

const processSteps = [
  "Understand",
  "Threat model",
  "Test",
  "Collect evidence",
  "Assess risk",
  "Remediate",
  "Validate",
];

const azureTopics = [
  "Identity and access",
  "Network security",
  "Data protection",
  "Cloud posture",
  "Infrastructure as code",
];

const socTopics = [
  "Microsoft Sentinel",
  "Microsoft Defender XDR",
  "KQL",
  "MITRE ATT&CK",
  "Incident investigation",
];

const cloudTopics = [
  "Azure · AWS · Google Cloud",
  "Identity and governance",
  "CSPM and CNAPP",
  "Centralized visibility",
];

function Arrow() {
  return <span aria-hidden="true" className="arrow-mark">↗</span>;
}

export default function Home() {
  return (
    <main id="top" className="site-shell">
      <SiteNavigation skipTarget="#main-content" />

      <div id="main-content" tabIndex={-1}>
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-grid" aria-hidden="true"></div>
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="eyebrow eyebrow-light"><span className="status-dot"></span> Independent security engineering lab</p>
              <h1 id="hero-title">Security for<br />the age of <em>AI.</em></h1>
              <p className="hero-description">
                Engineering and assessing secure AI systems, cloud environments, and modern security operations.
              </p>
              <div className="hero-actions">
                <a className="button button-accent" href="#labs">Explore the labs <Arrow /></a>
                <a className="text-link text-link-light" href="https://github.com/praveen2728/meiai-website" target="_blank" rel="noreferrer">View GitHub <Arrow /></a>
              </div>
              <p className="hero-footnote">Four connected disciplines. One evidence-first approach.</p>
            </div>

            <figure className="boundary-figure">
              <div className="figure-topline"><span>SECURITY MODEL / 001</span><span>REQUEST → EVIDENCE</span></div>
              <svg className="boundary-svg" viewBox="0 0 560 390" role="img" aria-labelledby="diagram-title diagram-description">
                <title id="diagram-title">A request crossing an AI security boundary</title>
                <desc id="diagram-description">A user request reaches an AI agent, which may access a tool or data source. A policy boundary and evidence trail make the interaction inspectable.</desc>
                <defs>
                  <pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" fill="#71808a" opacity=".23" />
                  </pattern>
                  <marker id="arrow-head" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                    <path d="M1 1 6 4 1 7" fill="none" stroke="#87b9ae" strokeWidth="1.3" />
                  </marker>
                </defs>
                <rect x="1" y="1" width="558" height="388" rx="18" fill="url(#dot-grid)" />
                <path d="M86 120H218M302 120H433M260 158V250M302 286H430" fill="none" stroke="#87b9ae" strokeWidth="1.5" strokeDasharray="4 7" markerEnd="url(#arrow-head)" />
                <path d="M326 65V336" fill="none" stroke="#e2b872" strokeWidth="1" strokeDasharray="3 6" opacity=".75" />
                <text x="340" y="78" className="svg-boundary-label">POLICY BOUNDARY</text>
                <g className="diagram-node">
                  <rect x="25" y="87" width="112" height="66" rx="11" />
                  <text x="42" y="115" className="svg-kicker">01 / INPUT</text>
                  <text x="42" y="136" className="svg-label">User request</text>
                </g>
                <g className="diagram-node diagram-node-accent">
                  <rect x="190" y="87" width="128" height="66" rx="11" />
                  <text x="207" y="115" className="svg-kicker">02 / SYSTEM</text>
                  <text x="207" y="136" className="svg-label">AI agent</text>
                </g>
                <g className="diagram-node">
                  <rect x="412" y="87" width="122" height="66" rx="11" />
                  <text x="429" y="115" className="svg-kicker">03 / ACTION</text>
                  <text x="429" y="136" className="svg-label">Tools + data</text>
                </g>
                <g className="diagram-node diagram-node-evidence">
                  <rect x="190" y="252" width="128" height="66" rx="11" />
                  <text x="207" y="280" className="svg-kicker">04 / OBSERVE</text>
                  <text x="207" y="301" className="svg-label">Evidence trail</text>
                </g>
                <g className="diagram-node diagram-node-outcome">
                  <rect x="412" y="252" width="122" height="66" rx="11" />
                  <text x="429" y="280" className="svg-kicker">05 / OUTCOME</text>
                  <text x="429" y="301" className="svg-label">Risk + response</text>
                </g>
                <text x="25" y="359" className="svg-caption">A system is only as trustworthy as the boundaries we can verify.</text>
              </svg>
              <figcaption>Threat paths become useful when behavior can be observed and tested.</figcaption>
            </figure>
          </div>
          <a className="scroll-cue" href="#introduction"><span></span> Scroll to explore</a>
        </section>

        <section id="introduction" className="intro-section section-wrap">
          <p className="eyebrow">MeiAI / the lab</p>
          <div className="intro-content">
            <h2>From threat models to working assessments.</h2>
            <div>
              <p>MeiAI is an independent Cloud &amp; AI Security Engineering Lab exploring how modern systems fail, how those failures can be detected, and how they can be fixed.</p>
              <p className="muted-copy">The work connects architecture with hands-on testing: define the boundary, observe the behavior, preserve the evidence, and validate the fix.</p>
            </div>
          </div>
        </section>

        <section id="labs" className="projects-section" aria-labelledby="projects-title">
          <div className="section-wrap">
            <div className="section-heading">
              <div>
                <p className="eyebrow">01 — 04 / Areas of work</p>
                <h2 id="projects-title">Four labs. Connected by security.</h2>
              </div>
              <p>Each project examines a different part of the modern attack surface. Work is released as it becomes real, reviewable, and useful.</p>
            </div>

            <div className="project-row project-azure" id="azure-cloud-security">
              <div className="project-index">01<span> / AZURE CLOUD SECURITY</span></div>
              <div className="project-row-copy">
                <div className="project-status">INTERACTIVE REFERENCE · SYNTHETIC SCENARIOS</div>
                <h3>Cloud security,<br /><em>by design.</em></h3>
                <p>Explore Azure architecture, identity and workload security through a simulated journey, implementation guides, and synthetic assessment scenarios. It does not connect to a live tenant.</p>
                <a className="use-case-link" href="/labs/azure-security-journey">Start the Azure Security Journey <Arrow /></a>
                <a className="use-case-link" href="/cloud-security">Open the synthetic Azure walkthrough <Arrow /></a>
              </div>
              <div className="topic-rail"><p>AREAS OF FOCUS</p><ul>{azureTopics.map((topic) => <li key={topic}>{topic}</li>)}</ul></div>
            </div>

            <article className="project-ai" aria-labelledby="ai-title">
              <div className="project-ai-copy">
                <div className="project-meta"><span>02 / AI SECURITY</span><span className="availability"><i></i> Interactive lab</span></div>
                <h3 id="ai-title">AI Security<br /><em>Lab</em></h3>
                <p>Explore the security of AI agents, retrieval-augmented generation, tool execution, and multi-agent architectures.</p>
                <ul className="topic-list" aria-label="Assessment concepts">
                  <li>Prompt injection</li><li>Sensitive data exposure</li><li>Insecure tool use</li><li>Agent evaluation</li>
                </ul>
                <a className="button button-light" href="/lab">Explore AI Security <Arrow /></a>
              </div>
              <div className="agent-panel">
                <div className="agent-panel-heading"><span>THE TEST ENVIRONMENT</span><span>05 AGENTS</span></div>
                <p className="agent-panel-intro">Distinct systems. Different boundaries to examine.</p>
                <ul className="agent-list">
                  {agents.map(([number, name, role]) => (
                    <li key={name}><span className="agent-number">{number}</span><span className="agent-name">{name}</span><span className="agent-role">{role}</span><span className="agent-arrow" aria-hidden="true">↗</span></li>
                  ))}
                </ul>
                <p className="agent-note">Built-in targets use synthetic data. Results distinguish attempted attacks from observed behavior.</p>
              </div>
            </article>

            <div className="project-row project-soc" id="detection-soc">
              <div className="soc-art" aria-hidden="true">
                <div className="signal-line signal-one"></div><div className="signal-line signal-two"></div>
                <div className="signal-node signal-node-one"></div><div className="signal-node signal-node-two"></div><div className="signal-node signal-node-three"></div>
                <span className="signal-label">SIGNAL → CONTEXT → RESPONSE</span>
              </div>
              <div className="project-row-copy">
                <div className="project-index">03<span> / DETECTION &amp; SOC</span></div>
                <div className="project-status">AVAILABLE · SYNTHETIC WALKTHROUGH</div>
                <h3>From signal<br />to <em>response.</em></h3>
                <p>Explore detection engineering, security telemetry, incident investigation, and response workflows.</p>
                <ul className="inline-topics">{socTopics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
                <a className="use-case-link" href="/detection-soc">Explore detection walkthrough <Arrow /></a>
              </div>
            </div>

            <div className="project-row project-multicloud" id="architecture">
              <div className="project-row-copy">
                <div className="project-index">04<span> / MULTI-CLOUD ARCHITECTURE</span></div>
                <div className="project-status">AVAILABLE · SYNTHETIC WALKTHROUGH</div>
                <h3>Security across<br /><em>boundaries.</em></h3>
                <p>Explore identity, governance, and centralized visibility across Azure, AWS, and Google Cloud.</p>
                <a className="use-case-link" href="/multicloud">Explore multi-cloud walkthrough <Arrow /></a>
              </div>
              <div className="cloud-map" role="img" aria-label="Architecture concept connecting Azure, AWS, and Google Cloud through shared identity, governance, and monitoring">
                <div className="cloud-map-label">A SHARED SECURITY PLANE</div>
                <div className="cloud-connectors" aria-hidden="true"><span></span><span></span><span></span></div>
                <div className="cloud-nodes"><span>AZURE</span><span>AWS</span><span>GOOGLE CLOUD</span></div>
                <div className="cloud-core">Identity · Governance · Visibility</div>
                <ul className="cloud-topics">{cloudTopics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        <section className="approach-section" aria-labelledby="approach-title">
          <div className="section-wrap">
            <div className="approach-intro">
              <p className="eyebrow eyebrow-light">02 / Engineering approach</p>
              <h2 id="approach-title">A clear path from<br />question to <em>confidence.</em></h2>
              <p>Practical security engineering means knowing what was tested, what happened, and what changed after remediation.</p>
            </div>
            <ol className="process-line">
              {processSteps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>)}
            </ol>
            <div className="approach-foot"><span>REPEATABLE TESTING</span><span>EVIDENCE-BACKED FINDINGS</span><span>VALIDATED REMEDIATION</span></div>
          </div>
        </section>

        <section id="research" className="research-section section-wrap" aria-labelledby="research-title">
          <div className="research-heading">
            <p className="eyebrow">03 / Research &amp; architecture</p>
            <h2 id="research-title">Reason clearly.<br /><em>Build with evidence.</em></h2>
            <p>Read source-linked security recommendations, follow the assessment methodology, or inspect the implementation in the project repository.</p>
          </div>
          <div className="research-links">
            <Link className="research-link" href="/security-recommendations"><span className="research-index">01</span><span><strong>Security recommendations</strong><small>Source-linked implementation and investigation guidance</small></span><Arrow /></Link>
            <Link className="research-link" href="/methodology"><span className="research-index">02</span><span><strong>Assessment methodology</strong><small>Evidence lifecycle, coverage, and boundaries</small></span><Arrow /></Link>
            <a className="research-link" href="https://github.com/praveen2728/meiai-website" target="_blank" rel="noreferrer"><span className="research-index">03</span><span><strong>Project repository</strong><small>Source code and implementation details</small></span><Arrow /></a>
          </div>
        </section>

        <section id="about" className="about-section">
          <div className="section-wrap about-inner">
            <p className="eyebrow eyebrow-light">04 / About MeiAI</p>
            <div className="about-content">
              <h2>Independent work.<br /><em>Practical security.</em></h2>
              <div>
                <p>MeiAI is an engineering portfolio by Praveen Kumar, focused on cloud security architecture, Microsoft security technologies, AI security, and assessment and remediation.</p>
                <p className="about-secondary">The goal is to make architectural decisions and security behavior understandable through working examples, clear trade-offs, and verifiable evidence.</p>
                <a className="text-link text-link-light" href="https://github.com/praveen2728" target="_blank" rel="noreferrer">View the GitHub profile <Arrow /></a>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="site-footer">
        <div className="footer-main section-wrap">
          <div><Link className="wordmark wordmark-footer" href="/">mei<span>ai</span><i>.</i></Link><p>Cloud &amp; AI Security Engineering Lab</p></div>
          <nav aria-label="Footer navigation"><a href="#labs">Projects</a><a href="#research">Research</a><a href="#about">About</a><Link href="/security-recommendations">Security Recommendations</Link><Link href="/methodology">Methodology</Link></nav>
          <a className="footer-github" href="https://github.com/praveen2728/meiai-website" target="_blank" rel="noreferrer">GitHub <Arrow /></a>
        </div>
        <div className="footer-bottom section-wrap"><span>© {new Date().getFullYear()} MeiAI · Independent engineering portfolio</span><a href="#top">Back to top ↑</a></div>
      </footer>
    </main>
  );
}
