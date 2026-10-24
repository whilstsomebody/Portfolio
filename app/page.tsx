"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Mail, Phone } from "lucide-react";
import { ResumePortal } from "@/components/resume-portal";

type Branch = { id: string; label: string; detail: string; description?: string; stack?: string; skills?: Array<{ label: string; items: string }>; role?: string; company?: string; date?: string; workProduct?: string; href?: string; hideAction?: boolean; side: "left" | "right"; x: number; y: number };
type SectionConfig = { id: string; title: string; eyebrow: string; intro: string; nodeY: number; branches: Branch[] };
type ResumePhase = "closed" | "opening" | "open" | "closing";

const mainPoints = [
  { x: 690, y: 120 }, { x: 930, y: 465 }, { x: 390, y: 810 },
  { x: 850, y: 1155 }, { x: 350, y: 1500 }, { x: 850, y: 1845 }, { x: 620, y: 2190 },
];
const branchOffsets: Record<string, Array<{ x: number; y: number; side: "left" | "right" }>> = {
  systems: [{x:-115,y:-100,side:"left"},{x:115,y:-100,side:"right"},{x:-115,y:100,side:"left"},{x:115,y:100,side:"right"}],
  about: [{x:-105,y:-78,side:"left"},{x:105,y:-78,side:"right"},{x:0,y:105,side:"right"}],
  experience: [{x:-105,y:-78,side:"left"},{x:105,y:-78,side:"right"},{x:-105,y:78,side:"left"}],
  projects: [{x:-105,y:-78,side:"left"},{x:105,y:-78,side:"right"},{x:-105,y:78,side:"left"}],
  profiles: [{x:-115,y:-112,side:"left"},{x:115,y:-112,side:"right"},{x:-130,y:-38,side:"left"},{x:130,y:-38,side:"right"},{x:-115,y:38,side:"left"},{x:115,y:38,side:"right"}],
};

const sections: SectionConfig[] = [
  { id: "home", title: "Hi! I'm\nAman Vishwakarma", eyebrow: "", intro: "I have been selected as a Google Summer of Code (GSoC) contributor with Zulip twice and have over 2 years of experience in backend development and DevOps.", nodeY: 92, branches: [] },
  { id: "systems", title: "Systems", eyebrow: "", intro: "I use these tools to build, run, and improve reliable systems.", nodeY: 225, branches: [
    { id: "backend", label: "BACKEND", detail: "", skills: [{ label: "Backend", items: "Go/Golang, System Design, REST APIs, CI/CD, Node.js, Express.js, Microservices" }], hideAction: true, side: "left", x: 245, y: 177 },
    { id: "infra", label: "INFRA", detail: "", skills: [{ label: "Cloud & Infrastructure", items: "AWS, Docker, Git, Linux, Distributed Systems" }], hideAction: true, side: "right", x: 755, y: 192 },
    { id: "data", label: "DATA", detail: "", skills: [{ label: "Databases", items: "PostgreSQL, MySQL, Redis, MongoDB" }, { label: "Languages", items: "JavaScript, TypeScript, Go/Golang, C++, C, Python, SQL, Bash" }], hideAction: true, side: "left", x: 205, y: 272 },
    { id: "reliability", label: "RELIABILITY", detail: "", skills: [{ label: "Security & Observability", items: "Prometheus, Grafana, JWT, RBAC, Rate Limiting, Alerting, Anomaly Detection" }, { label: "Academic Coursework", items: "Computer Networks, Object Oriented Programming, Operating System, DBMS, DSA, Software Engineering" }], hideAction: true, side: "right", x: 800, y: 275 },
  ] },
  { id: "about", title: "About", eyebrow: "", intro: "I am a backend and DevOps engineer focused on building dependable systems.", nodeY: 358, branches: [
    { id: "location", label: "LOCATION", detail: "Lucknow, Uttar Pradesh, India", hideAction: true, side: "left", x: 250, y: 322 }, { id: "education", label: "EDUCATION", detail: "BTech (IT), Indian Institute of Information Technology, Lucknow (IIIT Lucknow)", hideAction: true, side: "right", x: 750, y: 348 }, { id: "focus", label: "FOCUS", detail: "Backend Development and DevOps", hideAction: true, side: "left", x: 235, y: 405 },
  ] },
  { id: "experience", title: "Experience", eyebrow: "", intro: "I have over 2 years of industry experience in backend development and DevOps.", nodeY: 491, branches: [
    { id: "e1", label: "GOOGLE SUMMER OF CODE 2026", detail: "", role: "Contributor", company: "Zulip", date: "May 2026 to Sept 2026", workProduct: "https://gist.github.com/whilstsomebody/a9492927442883073ccf11580028a5fb", href: "https://gist.github.com/whilstsomebody/a9492927442883073ccf11580028a5fb", side: "left", x: 230, y: 452 },
    { id: "e2", label: "GOOGLE SUMMER OF CODE 2025", detail: "", role: "Contributor", company: "Zulip", date: "May 2025 to Sept 2025", workProduct: "https://gist.github.com/whilstsomebody/153e3e402293801c7fdcfb7dda684171", href: "https://gist.github.com/whilstsomebody/153e3e402293801c7fdcfb7dda684171", side: "right", x: 770, y: 488 },
    { id: "e3", label: "DEVOPS ENGINEER", detail: "", role: "Intern", company: "Shinpo Engineering PTE LTD, Singapore", date: "Oct 2025 to March 2026", workProduct: "Coming soon", side: "left", x: 255, y: 533 },
  ] },
  { id: "projects", title: "Projects", eyebrow: "", intro: "I build practical systems, from the first problem to the architecture and delivery.", nodeY: 624, branches: [
    { id: "p1", label: "SECUREGATE", detail: "", description: "SecureGate is a lightweight, cloud-native reverse proxy and API gateway written in Go. It delivers bounded connection concurrency, zero-downtime routing reloads, backend load balancing with active health checks, circuit breakers, and native TLS termination.", stack: "Go, Redis, Prometheus, Grafana, Docker Compose", href: "https://github.com/whilstsomebody/SecureGate", side: "right", x: 760, y: 580 },
    { id: "p2", label: "HOURMEET", detail: "", description: "Welcome to HourMeet, a video meeting and scheduling platform like Google Meet and Zoom. The server can handle 1000+ users at a time with no charges.", stack: "Clerk, Next.js, Node.js, TypeScript, Tailwind CSS", href: "https://github.com/whilstsomebody/HourMeet", side: "left", x: 210, y: 623 },
    { id: "p3", label: "RUSTYESTATE", detail: "", description: "StoreHUB is a collaborative platform that transforms how developers share, discover, and integrate reusable code components. Powered by React, Go, and MySQL, it offers a seamless ecosystem with features like a diverse component library, multi-framework support, secure authentication, and community-driven collaboration.", stack: "React, Vite, Tailwind CSS, Go, MySQL, Redis, Docker", href: "https://github.com/whilstsomebody/StoreHUB", side: "right", x: 770, y: 669 },
  ] },
  { id: "profiles", title: "Profiles", eyebrow: "", intro: "Professional and competitive programming profiles.", nodeY: 757, branches: [
    { id: "github", label: "GITHUB", detail: "https://github.com/whilstsomebody", href: "https://github.com/whilstsomebody", side: "right", x: 795, y: 710 }, { id: "gsoc2026", label: "GSOC 2026", detail: "https://gist.github.com/whilstsomebody/a9492927442883073ccf11580028a5fb", href: "https://gist.github.com/whilstsomebody/a9492927442883073ccf11580028a5fb", side: "left", x: 205, y: 675 }, { id: "gsoc2025", label: "GSOC 2025", detail: "https://gist.github.com/whilstsomebody/153e3e402293801c7fdcfb7dda684171", href: "https://gist.github.com/whilstsomebody/153e3e402293801c7fdcfb7dda684171", side: "left", x: 205, y: 745 }, { id: "leetcode", label: "LEETCODE", detail: "https://leetcode.com/u/amanvish27/", href: "https://leetcode.com/u/amanvish27/", side: "right", x: 795, y: 780 }, { id: "codeforces", label: "CODEFORCES", detail: "https://codeforces.com/profile/AMANVISHWAKARMA27", href: "https://codeforces.com/profile/AMANVISHWAKARMA27", side: "left", x: 205, y: 815 }, { id: "codechef", label: "CODECHEF", detail: "https://www.codechef.com/users/amanvish27", href: "https://www.codechef.com/users/amanvish27", side: "right", x: 795, y: 850 },
  ] },
  { id: "contact", title: "Have a system to build?", eyebrow: "", intro: "", nodeY: 890, branches: [] },
];

const getBranchPoint = (sectionIndex: number, branchId: string) => {
  const section = sections[sectionIndex];
  const branchIndex = section.branches.findIndex((branch) => branch.id === branchId);
  const offset = branchOffsets[section.id]?.[branchIndex] ?? { x: 0, y: 100, side: "right" as const };
  const parent = mainPoints[sectionIndex];
  return { x: parent.x + offset.x, y: parent.y + offset.y };
};

export default function Home() {
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [resumePhase, setResumePhase] = useState<ResumePhase>("closed");
  const [resumeOrigin, setResumeOrigin] = useState({ x: 0, y: 0 });
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const resumeButton = useRef<HTMLButtonElement>(null);
  const graphInner = useRef<SVGGElement>(null); const routeRefs = useRef<SVGPathElement[]>([]); const rails = useRef<Record<string, HTMLDivElement | null>>({}); const reduced = useRef(false);
  const moveCamera = (index: number, branch?: Branch) => { const point = branch ? getBranchPoint(index, branch.id) : mainPoints[index]; if (graphInner.current) gsap.to(graphInner.current, { attr: { transform: `translate(${760 - point.x} ${450 - point.y})` }, duration: reduced.current ? 0 : .65, ease: "power3.out", overwrite: true }); };
  const selectMain = (index: number) => { const sectionId = sections[index].id; selectedRef.current = { ...selectedRef.current, [sectionId]: "" }; setActive(index); setSelected((old) => ({ ...old, [sectionId]: "" })); document.getElementById(sectionId)?.scrollIntoView({ behavior: reduced.current ? "auto" : "smooth", block: "start" }); };
  const selectBranch = (index: number, branch: Branch, navigate = false) => { const section = sections[index]; selectedRef.current = { ...selectedRef.current, [section.id]: branch.id }; setActive(index); setSelected((old) => ({ ...old, [section.id]: branch.id })); if (navigate) document.getElementById(section.id)?.scrollIntoView({ behavior: reduced.current ? "auto" : "smooth", block: "start" }); moveCamera(index, branch); };
  const openResume = () => {
    const bounds = resumeButton.current?.getBoundingClientRect();
    if (bounds) setResumeOrigin({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
    setResumePhase("opening");
  };
  const closeResume = useCallback(() => setResumePhase("closing"), []);
  const finishResumeOpen = useCallback(() => setResumePhase("open"), []);
  const finishResumeClose = useCallback(() => {
    setResumePhase("closed");
    requestAnimationFrame(() => resumeButton.current?.focus());
  }, []);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const updateGraph = () => {
      const scrollY = window.scrollY;
      const sectionTops = sections.map((section) => {
        const element = document.getElementById(section.id);
        return element ? element.getBoundingClientRect().top + scrollY : 0;
      });
      let segment = 0;
      while (segment < sectionTops.length - 2 && scrollY >= sectionTops[segment + 1]) segment++;
      const span = Math.max(1, sectionTops[segment + 1] - sectionTops[segment]);
      const fraction = Math.max(0, Math.min(1, (scrollY - sectionTops[segment]) / span));
      const atEnd = scrollY >= sectionTops[sectionTops.length - 1] - 1;
      const currentNode = atEnd ? sections.length - 1 : segment;
      const routeSegment = atEnd ? mainPoints.length - 2 : segment;
      const routeFraction = atEnd ? 1 : fraction;
      const currentSection = sections[currentNode];
      if (currentSection.branches.length && !selectedRef.current[currentSection.id]) {
        const firstBranch = currentSection.branches[0];
        selectedRef.current = { ...selectedRef.current, [currentSection.id]: firstBranch.id };
        setSelected((previous) => previous[currentSection.id] ? previous : { ...previous, [currentSection.id]: firstBranch.id });
      }
      setActive((previous) => previous === currentNode ? previous : currentNode);
      graphInner.current?.querySelectorAll(".main-node").forEach((node, index) => node.classList.toggle("is-active", index === currentNode));
      const path = routeRefs.current[routeSegment];
      let cameraPoint = mainPoints[routeSegment];
      if (path && !atEnd) cameraPoint = path.getPointAtLength(path.getTotalLength() * routeFraction);
      if (atEnd) cameraPoint = mainPoints[mainPoints.length - 1];
      routeRefs.current.forEach((edge, index) => {
        const complete = atEnd || index < routeSegment;
        const current = !atEnd && index === routeSegment;
        // Non-scaling strokes measure dashes in screen pixels, while
        // getTotalLength() returns SVG units. Mixing them repeats the lit
        // dash near the next node whenever the responsive SVG is enlarged.
        const matrix = edge.getScreenCTM();
        const scale = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
        const length = edge.getTotalLength() * scale;
        const progress = complete ? 1 : current ? routeFraction : 0;
        edge.classList.toggle("is-complete", complete);
        edge.classList.toggle("is-traveling", current);
        edge.style.strokeDasharray = `${length * progress} ${length + 1}`;
        edge.style.strokeDashoffset = "0";
        edge.style.stroke = "var(--green)";
        edge.style.visibility = progress > 0 ? "visible" : "hidden";
      });
      graphInner.current?.setAttribute("transform", `translate(${760 - cameraPoint.x} ${450 - cameraPoint.y})`);
    };
    const ctx = gsap.context(() => {
      ScrollTrigger.create({ trigger: "#route", start: "top top", end: "bottom bottom", onUpdate: updateGraph, onRefresh: updateGraph });
    });
    updateGraph();
    return () => ctx.revert();
  }, []);
  const syncRail = (index: number) => { const section = sections[index]; const rail = rails.current[section.id]; if (!rail) return; const buttons = Array.from(rail.querySelectorAll<HTMLButtonElement>("[data-branch]")); if (!buttons.length) return; const middle = rail.scrollLeft + rail.clientWidth / 2; const closest = buttons.reduce((winner, button) => Math.abs(button.offsetLeft + button.offsetWidth / 2 - middle) < Math.abs(winner.offsetLeft + winner.offsetWidth / 2 - middle) ? button : winner, buttons[0]); const branch = section.branches.find((item) => item.id === closest.dataset.branch); if (branch && selectedRef.current[section.id] !== branch.id) selectBranch(index, branch); };
  const graph = useMemo(() => <svg className="topology" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Interactive portfolio topology graph"><g ref={graphInner}>
    {sections.slice(0, -1).map((section, index) => { const a = mainPoints[index]; const b = mainPoints[index + 1]; const dx = b.x - a.x; const dy = b.y - a.y; const d = `M ${a.x} ${a.y} C ${a.x + dx * .42} ${a.y + dy * .48}, ${b.x - dx * .42} ${b.y - dy * .48}, ${b.x} ${b.y}`; return <g key={section.id}><path d={d} className="route-underlay" /><path ref={(element) => { if (element) routeRefs.current[index] = element; }} d={d} className="route-edge" /></g>; })}
    {sections.flatMap((section, index) => section.branches.map((branch, branchIndex) => { const parent = mainPoints[index]; const offset = branchOffsets[section.id]?.[branchIndex] ?? { x: 0, y: 100, side: branch.side }; const point = getBranchPoint(index, branch.id); const chosen = index === active && selected[section.id] === branch.id; const outward = offset.side === "left" ? -1 : 1; const labelX = point.x + outward * 31; return <g key={branch.id}><path d={`M ${parent.x} ${parent.y} C ${parent.x + offset.x * .35} ${parent.y + offset.y * .15}, ${point.x - outward * 60} ${point.y}, ${point.x - outward * 20} ${point.y}`} className={`branch-edge ${chosen ? "is-selected" : ""}`} /><g className={`graph-node branch-node ${chosen ? "is-selected" : ""}`} tabIndex={0} role="button" aria-label={`Open ${branch.label} details`} onClick={() => selectBranch(index, branch, true)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectBranch(index, branch, true); } }}><circle cx={point.x} cy={point.y} r="20" /><circle className="core" cx={point.x} cy={point.y} r="3" /><text className="branch-label" x={labelX} y={point.y + 4} textAnchor={offset.side === "left" ? "end" : "start"}>{branch.label}</text></g></g>; }))}
    {sections.map((section, index) => { const point = mainPoints[index]; return <g key={section.id} className={`graph-node main-node ${index === active ? "is-active" : ""}`} tabIndex={0} role="button" aria-label={`Navigate to ${section.id}`} onClick={() => selectMain(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectMain(index); } }}><circle cx={point.x} cy={point.y} r="24" /><circle cx={point.x} cy={point.y} r="17" className="inner" /><circle className="core" cx={point.x} cy={point.y} r="4" /><text className="main-label" x={point.x + 36} y={point.y + 4} textAnchor="start">{section.id.toUpperCase()}</text></g>; })}
  </g></svg>, [selected, active]);
  return (
    <main id="route">
      <div className="scan-grid" aria-hidden="true" />
      <div className="graph-stage">{graph}</div>
      <div className="content-layer">
        {sections.map((section, index) => (
          <section id={section.id} key={section.id} className={`content-section ${section.id === "home" ? "home-section" : ""}`} aria-labelledby={`${section.id}-heading`}>
            <div className="section-content">
              {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
              <h1 id={`${section.id}-heading`}>{section.title}</h1>
              {section.id !== "contact" && <p className="intro">{section.id === "home" ? <>I was selected as a <span className="intro-emphasis">Google Summer of Code (GSoC)</span> contributor with Zulip twice and have over <span className="intro-emphasis">2 years</span> of experience in <span className="intro-emphasis">backend development</span> and <span className="intro-emphasis">DevOps</span>.</> : section.intro}</p>}
              {section.id === "home" && <div className="home-actions"><button ref={resumeButton} className={`resume-launch ${resumePhase !== "closed" ? "is-opening" : ""}`} onClick={openResume} aria-label="View resume"><span className="resume-launch-mark">↗</span><span>VIEW RESUME</span></button></div>}
              {section.branches.length > 0 && <BranchRail section={section} sectionIndex={index} selected={selected[section.id]} railRef={(el) => { rails.current[section.id] = el; }} onSelect={selectBranch} onSync={syncRail} />}
              {section.id === "contact" && <ContactDetails />}
            </div>
          </section>
        ))}
      </div>
      {resumePhase !== "closed" && <ResumeOverlay phase={resumePhase} origin={resumeOrigin} onOpenComplete={finishResumeOpen} onClose={closeResume} onCloseComplete={finishResumeClose} />}
    </main>
  );
}

function ContactDetails() {
  return <div className="contact-details" aria-label="Contact details">
    <a href="mailto:developer.aman.2864@gmail.com"><Mail aria-hidden="true" /> <span>developer.aman.2864@gmail.com</span></a>
    <a href="https://www.linkedin.com/in/aman-vishwakarma-3b788828a/" target="_blank" rel="noreferrer"><LinkedInIcon /> <span>LinkedIn</span></a>
    <a href="https://discord.gg/fdzWdk8a" target="_blank" rel="noreferrer"><DiscordIcon /> <span>Discord</span></a>
    <a href="tel:+918957175307"><Phone aria-hidden="true" /> <span>+91 8957175307</span></a>
  </div>;
}

function DiscordIcon() {
  return <svg className="discord-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.3 4.8A16.5 16.5 0 0 0 16.2 3l-.5 1a15 15 0 0 0-7.4 0l-.5-1a16.5 16.5 0 0 0-4.1 1.8C1.1 8.7.4 12.5.8 16.2a16.3 16.3 0 0 0 5 2.5l1.2-1.6a9.9 9.9 0 0 1-1.9-.9l.5-.4c3.8 1.8 9.1 1.8 12.9 0l.5.4c-.6.4-1.3.7-1.9.9l1.2 1.6a16.3 16.3 0 0 0 5-2.5c.5-4.4-.8-8.1-3-11.4ZM8.8 13.8c-1.1 0-2-1-2-2.3 0-1.2.9-2.2 2-2.2s2 1 2 2.2c0 1.3-.9 2.3-2 2.3Zm6.4 0c-1.1 0-2-1-2-2.3 0-1.2.9-2.2 2-2.2s2 1 2 2.2c0 1.3-.9 2.3-2 2.3Z" /></svg>;
}

function LinkedInIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.2 3A2.2 2.2 0 1 0 5.2 7.4 2.2 2.2 0 0 0 5.2 3ZM3.4 8.9h3.7V21H3.4V8.9Zm6 0H13v1.7h.1c.5-1 1.8-2.1 3.8-2.1 4 0 4.7 2.6 4.7 6.1V21h-3.7v-5.7c0-1.4 0-3.1-1.9-3.1-1.9 0-2.2 1.5-2.2 3V21H10V8.9Z" /></svg>;
}

function BranchRail({ section, sectionIndex, selected, railRef, onSelect, onSync }: { section: SectionConfig; sectionIndex: number; selected?: string; railRef: (el: HTMLDivElement | null) => void; onSelect: (index: number, branch: Branch) => void; onSync: (index: number) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (dir: number) => rail.current?.scrollBy({ left: dir * Math.max(1, rail.current.clientWidth), behavior: "smooth" });
  useEffect(() => {
    const container = rail.current;
    const item = container?.querySelector<HTMLElement>(`[data-branch="${selected}"]`);
    if (!container || !item) return;
    const itemStart = item.offsetLeft;
    const itemEnd = itemStart + item.offsetWidth;
    if (itemEnd <= container.scrollLeft || itemStart >= container.scrollLeft + container.clientWidth) {
      container.scrollLeft = itemStart - Math.max(0, (container.clientWidth - item.offsetWidth) / 2);
    }
  }, [selected]);
  return <div className="rail-area">
    <div className="branch-rail" ref={(el) => { rail.current = el; railRef(el); }} tabIndex={0} role="region" aria-label={`${section.title} branch details`} onWheel={(event) => { if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) { event.preventDefault(); event.currentTarget.scrollLeft += event.deltaY; } }} onScroll={() => onSync(sectionIndex)} onKeyDown={(event) => { if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); } if (event.key === "ArrowRight") { event.preventDefault(); move(1); } }}>
      {section.branches.map((branch) => <button type="button" data-branch={branch.id} aria-current={selected === branch.id ? "true" : undefined} className={`rail-node ${selected === branch.id ? "is-selected" : ""}`} key={branch.id} onClick={() => { onSelect(sectionIndex, branch); if (branch.href) window.open(branch.href, "_blank", "noopener,noreferrer"); }}><span className="branch-name">{branch.label}</span>{branch.description ? <span className="project-tile-details"><span><b>Description</b>{branch.description}</span><span><b>Stack</b>{branch.stack}</span><span><b>Link</b>{branch.href}</span></span> : branch.role ? <span className="experience-tile-details"><span><b>Role</b>{branch.role}</span><span><b>Company</b>{branch.company}</span><span><b>Date</b>{branch.date}</span><span><b>Work Product</b>{branch.workProduct}</span></span> : branch.skills ? <span className="skills-tile-details">{branch.skills.map((skill) => <span key={skill.label}><b>{skill.label}</b>{skill.items}</span>)}</span> : <span className="branch-detail">{branch.detail}</span>}{!branch.hideAction && <small>{branch.href ? "CLICK TILE TO OPEN" : branch.role ? "WORK PRODUCT COMING SOON" : "OPEN NODE ↗"}</small>}</button>)}
    </div>
  </div>;
}

function ResumeOverlay({ phase, origin, onOpenComplete, onClose, onCloseComplete }: { phase: Exclude<ResumePhase, "closed">; origin: { x: number; y: number }; onOpenComplete: () => void; onClose: () => void; onCloseComplete: () => void }) {
  const portalProgress = useRef({ value: 0 });
  const portalPose = useRef({ turn: 0, expand: 0 });
  const expansionTimeline = useRef<gsap.core.Timeline | null>(null);
  const restingBounds = useRef<DOMRect | null>(null);
  const expanded = useRef(false);
  const documentPanel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const reducedMotion = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const handleClose = useCallback(() => {
    expansionTimeline.current?.kill();
    if (document.fullscreenElement) {
      document.exitFullscreen().finally(onClose);
      return;
    }
    onClose();
  }, [onClose]);
  const toggleFullscreen = useCallback(() => {
    const panel = documentPanel.current;
    if (!panel) return;
    if (window.matchMedia("(max-width: 640px)").matches) {
      if (document.fullscreenElement === panel) void document.exitFullscreen().catch(() => {});
      else if (panel.requestFullscreen) void panel.requestFullscreen().catch(() => {});
      return;
    }
    expansionTimeline.current?.kill();
    const opening = !expanded.current;
    const current = panel.getBoundingClientRect();
    if (opening && !restingBounds.current) restingBounds.current = current;
    const target = restingBounds.current ?? current;
    expanded.current = opening;
    setIsFullscreen(opening);
    const duration = reducedMotion.current ? 0 : 1.25;
    gsap.set(panel, { top: current.top, left: current.left, right: 'auto', width: current.width, height: current.height, maxWidth: 'none', minHeight: 0, transform: 'none' });
    const timeline = gsap.timeline();
    expansionTimeline.current = timeline;
    timeline.to(portalPose.current, { turn: opening ? 1 : 0, expand: opening ? 1 : 0, duration, ease: 'power2.inOut' })
      .to(panel, { left: opening ? 0 : target.left, top: opening ? 0 : target.top, width: opening ? window.innerWidth : target.width, height: opening ? window.innerHeight : target.height, borderRadius: opening ? 0 : 12, duration, ease: 'power2.inOut' }, 0)
      .fromTo(panel, { opacity: .15 }, { opacity: 1, duration: duration * .5 }, duration * .5)
      .call(() => {
        if (!opening) {
          gsap.set(panel, { clearProps: 'left,top,right,width,height,maxWidth,minHeight,transform,borderRadius,opacity' });
          restingBounds.current = null;
        }
        else gsap.set(panel, { width: '100vw', height: '100dvh' });
      });
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    portalPose.current.turn = window.matchMedia("(max-width: 640px)").matches ? 1 : 0;
    return () => { expansionTimeline.current?.kill(); document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === documentPanel.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motion = reducedMotion.current;
    const duration = (seconds: number) => motion ? 0 : seconds;
    const panel = documentPanel.current;
    const shade = scrim.current;
    if (!panel || !shade) return;

    const timeline = gsap.timeline();
    const frontal = portalPose.current.turn > .5;
    const revealCenter = frontal ? '50% 50%' : '0% 50%';
    if (phase === "opening") {
      gsap.set(panel, { clipPath: `circle(0px at ${revealCenter})` });
      gsap.set(portalProgress.current, { value: 0 });
      gsap.set(shade, { autoAlpha: 0 });
      timeline.to(shade, { autoAlpha: 0.18, duration: duration(0.3), ease: "power1.out" })
        .to(portalProgress.current, { value: 1, duration: duration(1.45), ease: "power2.inOut" }, "<")
        .to(panel, { clipPath: `circle(150vmax at ${revealCenter})`, duration: duration(0.65), ease: "power3.out" })
        .call(onOpenComplete);
    } else if (phase === "open") {
      gsap.set(panel, { clipPath: "circle(150vmax at 0% 50%)" });
      gsap.set(portalProgress.current, { value: 1 });
      gsap.set(shade, { autoAlpha: 0.18 });
      closeButton.current?.focus();
    } else if (phase === "closing") {
      gsap.set(panel, { clipPath: "circle(150vmax at 0% 50%)" });
      gsap.set(portalProgress.current, { value: 1 });
      gsap.set(shade, { autoAlpha: 0.18 });
      const bounds = panel.getBoundingClientRect();
      const collapseCenter = frontal ? `${origin.x - bounds.left}px ${origin.y - bounds.top}px` : '0% 50%';
      gsap.set(panel, { clipPath: `circle(150vmax at ${collapseCenter})` });
      timeline.to(panel, { clipPath: `circle(0px at ${collapseCenter})`, opacity: 0, duration: duration(.65), ease: "power2.in" })
        .to(portalProgress.current, { value: 0, duration: duration(1.2), ease: "power2.inOut" })
        .to(shade, { autoAlpha: 0, duration: duration(0.24) }, motion ? ">" : "-=0.18")
        .call(onCloseComplete);
    }

    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && phase === "open") handleClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      timeline.kill();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [phase, onOpenComplete, handleClose, onCloseComplete, origin]);

  return <div className="resume-overlay" data-phase={phase} role="dialog" aria-modal="true" aria-label="Resume">
    <div className="resume-scrim" ref={scrim} />
    <ResumePortal origin={origin} progress={portalProgress} panel={documentPanel} pose={portalPose} />
    <div className="resume-document" ref={documentPanel}>
      <header className="resume-toolbar"><span className="resume-file"><b aria-hidden="true">▤</b> AMAN_VISHWAKARMA_RESUME.PDF</span><div className="resume-toolbar-actions"><a className="resume-download" href="/Aman_vishwakarma_resume.pdf" download>↓ &nbsp; DOWNLOAD PDF</a><button type="button" className="resume-fullscreen" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit full screen" : "View resume in full screen"}>{isFullscreen ? "↙" : "↗"}</button><button ref={closeButton} type="button" className="resume-close" onClick={handleClose} aria-label="Close resume"><span aria-hidden="true">×</span></button></div></header>
      <iframe className="resume-pdf" title="Aman Vishwakarma resume" src="/Aman_vishwakarma_resume.pdf#view=FitH" />
    </div>
  </div>;
}
