"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const projects = [
  { label: "Azure Cloud Security", href: "/labs/azure-security-journey" },
  { label: "AI Security Lab", href: "/lab" },
  { label: "Detection & SOC Lab", href: "/detection-soc" },
  { label: "Multi-Cloud Security Architecture", href: "/multicloud" },
];

const destinations = [
  { label: "Home", href: "/" },
  ...projects,
  { label: "Security Recommendations", href: "/security-recommendations" },
  { label: "Methodology", href: "/methodology" },
];

export default function SiteNavigation({ theme = "light", action, skipTarget = "#page-main" }: { theme?: "light" | "dark"; action?: ReactNode; skipTarget?: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const projectsTrigger = useRef<HTMLButtonElement>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const projectIsCurrent = (href: string) => current(href) || (href === "/labs/azure-security-journey" && pathname === "/cloud-security");
  const activeProject = projects.some((project) => projectIsCurrent(project.href));
  const isDark = theme === "dark";

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (projectsOpen) projectsTrigger.current?.focus();
        if (mobileOpen) mobileTrigger.current?.focus();
        setMobileOpen(false);
        setProjectsOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, projectsOpen]);

  function current(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const linkColor = isDark ? "text-slate-300 hover:text-white" : "text-stone-600 hover:text-stone-950";
  const activeColor = isDark ? "text-white" : "text-stone-950";

  return (
    <>
    <a className="site-skip-link" href={skipTarget}>Skip to main content</a>
    <header className={`site-header ${isDark ? "site-header-dark" : ""}`}>
      <div className="header-inner">
        <Link className="wordmark" href="/" aria-label="MeiAI home">
          mei<span>ai</span><i aria-hidden="true">.</i>
        </Link>
        <nav className={`desktop-nav ${isDark ? "!text-slate-300" : ""}`} aria-label="Main navigation">
          <Link href="/" aria-current={current("/") ? "page" : undefined} className={current("/") ? activeColor : linkColor}>Home</Link>
          <div className="nav-projects">
            <button ref={projectsTrigger} type="button" aria-expanded={projectsOpen} aria-controls="projects-navigation" onClick={() => setProjectsOpen((open) => !open)} className={`${activeProject ? activeColor : linkColor} inline-flex items-center gap-1`}>
              Projects <span aria-hidden="true">⌄</span>
            </button>
            <div id="projects-navigation" hidden={!projectsOpen} className={`nav-projects-menu ${isDark ? "nav-projects-menu-dark" : ""}`}>
              {projects.map((project) => <Link key={project.href} href={project.href} aria-current={projectIsCurrent(project.href) ? "page" : undefined} onClick={() => setProjectsOpen(false)} className={projectIsCurrent(project.href) ? "nav-link-active" : ""}>{project.label}</Link>)}
            </div>
          </div>
          <Link href="/security-recommendations" aria-current={current("/security-recommendations") ? "page" : undefined} className={current("/security-recommendations") ? activeColor : linkColor}>Recommendations</Link>
          <Link href="/methodology" aria-current={current("/methodology") ? "page" : undefined} className={current("/methodology") ? activeColor : linkColor}>Methodology</Link>
        </nav>
        <div className="header-actions">
          {action}
          <a className="github-link" href="https://github.com/praveen2728/meiai-website" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
          <button ref={mobileTrigger} type="button" className="mobile-menu-trigger" aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileOpen} aria-controls="site-mobile-navigation" onClick={() => setMobileOpen((open) => !open)}>
            <span></span><span></span>
          </button>
        </div>
      </div>
      <nav id="site-mobile-navigation" hidden={!mobileOpen} className={`site-mobile-navigation ${isDark ? "site-mobile-navigation-dark" : ""}`} aria-label="Mobile navigation">
        {destinations.map((item) => <Link key={item.href} href={item.href} aria-current={current(item.href) ? "page" : undefined} onClick={() => setMobileOpen(false)} className={current(item.href) ? "nav-link-active" : ""}>{item.label}</Link>)}
        <a href="https://github.com/praveen2728/meiai-website" target="_blank" rel="noreferrer" onClick={() => setMobileOpen(false)}>GitHub ↗</a>
      </nav>
    </header>
    </>
  );
}
