import { useState, useEffect, useRef } from "react";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  :root {
    --primary-orange: #ff6b35;
    --primary-dark: #0a0d14;
    --primary-darker: #050810;
    --surface: #141821;
    --surface-elevated: #1a1f2e;
    --surface-hover: #1f2533;
    --accent-muted: rgba(255, 107, 53, 0.08);
    --accent-border: rgba(255, 107, 53, 0.15);
    --accent-glow: rgba(255, 107, 53, 0.12);
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --border: rgba(255, 255, 255, 0.06);
    --border-strong: rgba(255, 255, 255, 0.1);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--primary-darker);
    color: var(--text-primary);
    line-height: 1.6;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }

  .bg-container {
    position: fixed;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(255, 107, 53, 0.03) 0%, transparent 50%),
      var(--primary-darker);
    pointer-events: none;
  }

  .bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 50px 50px;
    opacity: 0.5;
  }

  .bg-accent {
    position: absolute;
    top: 10%;
    right: 15%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(255, 107, 53, 0.06), transparent 70%);
    filter: blur(80px);
    animation: float 25s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(-40px, -30px); }
  }

  .nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(10, 13, 20, 0.85);
    backdrop-filter: blur(20px) saturate(120%);
    border-bottom: 1px solid var(--border);
    transition: all 0.3s;
  }

  .nav.scrolled {
    background: rgba(10, 13, 20, 0.95);
    border-bottom-color: var(--border-strong);
  }

  .nav-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.02em;
  }

  .logo-accent { color: var(--primary-orange); }

  .nav-links {
    display: flex;
    gap: 2rem;
    list-style: none;
    align-items: center;
  }

  .nav-links a {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
    transition: color 0.2s;
    position: relative;
  }

  .nav-links a::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 0;
    height: 1px;
    background: var(--primary-orange);
    transition: width 0.3s;
  }

  .nav-links a:hover { color: var(--text-primary); }
  .nav-links a:hover::after { width: 100%; }

  .btn-primary {
    padding: 0.625rem 1.5rem;
    background: linear-gradient(145deg, #ff7a4d, var(--primary-orange));
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    position: relative;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow:
      0 2px 4px rgba(255, 107, 53, 0.2),
      0 4px 8px rgba(255, 107, 53, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  }

  .btn-primary::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), transparent);
    opacity: 1;
    transition: opacity 0.3s;
  }

  .btn-primary:hover {
    background: linear-gradient(145deg, #ff8c5f, #ff7a4d);
    transform: translateY(-2px) translateZ(0);
    box-shadow:
      0 4px 8px rgba(255, 107, 53, 0.25),
      0 8px 16px rgba(255, 107, 53, 0.2),
      0 12px 24px rgba(255, 107, 53, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.25),
      inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  }

  .btn-primary:hover::before { opacity: 0.8; }

  .btn-primary:active {
    transform: translateY(0) translateZ(0);
    box-shadow:
      0 1px 2px rgba(255, 107, 53, 0.3),
      inset 0 2px 4px rgba(0, 0, 0, 0.15);
    transition: all 0.1s;
  }

  .hero {
    padding: 8rem 2rem 4rem;
    position: relative;
    z-index: 1;
  }

  .hero-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .hero-label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--accent-muted);
    border: 1px solid var(--accent-border);
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--primary-orange);
    margin-bottom: 1.5rem;
  }

  .hero h1 {
    font-size: clamp(2.5rem, 6vw, 4rem);
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 1.5rem;
    letter-spacing: -0.03em;
  }

  .hero-subtitle {
    font-size: 1.125rem;
    color: var(--text-secondary);
    line-height: 1.7;
    max-width: 600px;
  }

  .filters {
    padding: 2rem 2rem 1rem;
    max-width: 1400px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .filter-tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding-bottom: 2rem;
    border-bottom: 1px solid var(--border);
  }

  .filter-tab {
    padding: 0.625rem 1.25rem;
    background: linear-gradient(145deg, var(--surface), var(--surface-elevated));
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: inherit;
    position: relative;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  .filter-tab::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.05), transparent);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .filter-tab:hover {
    border-color: var(--border-strong);
    background: linear-gradient(145deg, var(--surface-hover), var(--surface-elevated));
    color: var(--text-primary);
    transform: translateY(-2px);
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.08),
      0 4px 8px rgba(0, 0, 0, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .filter-tab:hover::before { opacity: 1; }

  .filter-tab.active {
    background: linear-gradient(145deg, var(--accent-muted), var(--accent-glow));
    border-color: var(--accent-border);
    color: var(--primary-orange);
    box-shadow:
      0 2px 4px rgba(255, 107, 53, 0.15),
      0 4px 8px rgba(255, 107, 53, 0.1),
      inset 0 1px 0 rgba(255, 107, 53, 0.1),
      inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  }

  .filter-tab.active::before { opacity: 1; }
  .filter-tab:active { transform: translateY(0); transition: all 0.1s; }

  .playbook {
    padding: 3rem 2rem 4rem;
    max-width: 1400px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .resource-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1.5rem;
  }

  .resource-card {
    background: linear-gradient(145deg, var(--surface), var(--surface-elevated));
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    position: relative;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.1),
      0 8px 16px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  .resource-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 1px;
    background: linear-gradient(135deg, transparent, var(--accent-border), transparent);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.4s;
  }

  .resource-card::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    background: radial-gradient(
      600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
      rgba(255, 107, 53, 0.06),
      transparent 40%
    );
    opacity: 0;
    transition: opacity 0.4s;
    z-index: 0;
  }

  .resource-card:hover {
    transform: translateY(-8px) translateZ(0);
    border-color: var(--border-strong);
    background: linear-gradient(145deg, var(--surface-hover), var(--surface-elevated));
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.12),
      0 16px 32px rgba(0, 0, 0, 0.16),
      0 24px 48px rgba(255, 107, 53, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2);
  }

  .resource-card:hover::before { opacity: 1; }
  .resource-card:hover::after { opacity: 1; }
  .resource-card:active { transform: translateY(-4px) translateZ(0); transition: all 0.1s; }

  .card-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .card-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(145deg, var(--accent-muted), var(--accent-glow));
    border: 1px solid var(--accent-border);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.1),
      0 4px 8px rgba(255, 107, 53, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .card-icon::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), transparent);
    opacity: 0;
    transition: opacity 0.4s;
  }

  .resource-card:hover .card-icon {
    background: linear-gradient(145deg, var(--accent-glow), var(--accent-muted));
    border-color: var(--primary-orange);
    transform: translateY(-4px) scale(1.05) rotateZ(-5deg);
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.12),
      0 8px 16px rgba(255, 107, 53, 0.2),
      0 12px 24px rgba(255, 107, 53, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .resource-card:hover .card-icon::before { opacity: 1; }

  .card-icon svg {
    width: 24px;
    height: 24px;
    stroke: var(--primary-orange);
    fill: none;
    stroke-width: 2;
    transition: all 0.4s;
    filter: drop-shadow(0 2px 4px rgba(255, 107, 53, 0.3));
  }

  .resource-card:hover .card-icon svg {
    transform: scale(1.1);
    filter: drop-shadow(0 4px 8px rgba(255, 107, 53, 0.5));
  }

  .card-badge {
    padding: 0.375rem 0.75rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-muted);
    font-family: 'JetBrains Mono', monospace;
  }

  .card-body { padding: 1.5rem; }

  .card-title {
    font-size: 1.125rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    color: var(--text-primary);
  }

  .card-description {
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  .card-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .card-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .card-tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .tag {
    padding: 0.375rem 0.75rem;
    background: linear-gradient(145deg, var(--surface-elevated), var(--surface));
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--text-secondary);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  .tag:hover {
    background: linear-gradient(145deg, var(--surface-hover), var(--surface-elevated));
    border-color: var(--border-strong);
    color: var(--text-primary);
    transform: translateY(-1px);
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .card-action {
    color: var(--primary-orange);
    font-weight: 600;
    font-size: 0.875rem;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    background: linear-gradient(145deg, transparent, rgba(255, 107, 53, 0.03));
    border: 1px solid transparent;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .card-action::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 107, 53, 0.1), transparent);
    transform: translateX(-100%);
    transition: transform 0.6s;
  }

  .card-action:hover {
    gap: 0.75rem;
    background: linear-gradient(145deg, rgba(255, 107, 53, 0.08), rgba(255, 107, 53, 0.12));
    border-color: var(--accent-border);
    box-shadow:
      0 2px 4px rgba(255, 107, 53, 0.1),
      inset 0 1px 0 rgba(255, 107, 53, 0.05);
  }

  .card-action:hover::before { transform: translateX(100%); }
  .resource-card:hover .card-action { transform: translateX(4px); }

  .category-knowledge .card-icon { background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.2); }
  .category-knowledge .card-icon svg { stroke: #3b82f6; }

  .category-simulation .card-icon { background: rgba(168, 85, 247, 0.08); border-color: rgba(168, 85, 247, 0.2); }
  .category-simulation .card-icon svg { stroke: #a855f7; }

  .category-generator .card-icon { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.2); }
  .category-generator .card-icon svg { stroke: #10b981; }

  .category-tool .card-icon { background: rgba(251, 146, 60, 0.08); border-color: rgba(251, 146, 60, 0.2); }
  .category-tool .card-icon svg { stroke: #fb923c; }

  .category-template .card-icon { background: rgba(236, 72, 153, 0.08); border-color: rgba(236, 72, 153, 0.2); }
  .category-template .card-icon svg { stroke: #ec4899; }

  .footer {
    position: relative;
    z-index: 1;
    border-top: 1px solid var(--border);
    padding: 3rem 2rem 2rem;
    margin-top: 4rem;
    background: rgba(10, 13, 20, 0.5);
  }

  .footer-content {
    max-width: 1400px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 3rem;
    margin-bottom: 2rem;
  }

  .footer-brand h3 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.75rem; }
  .footer-brand p { color: var(--text-secondary); font-size: 0.875rem; line-height: 1.6; }

  .footer-column h4 {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
    color: var(--text-primary);
  }

  .footer-links { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; }
  .footer-links a { color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; transition: color 0.2s; }
  .footer-links a:hover { color: var(--primary-orange); }

  .footer-bottom {
    max-width: 1400px;
    margin: 0 auto;
    padding-top: 2rem;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .footer-links-inline { display: flex; gap: 2rem; }
  .footer-links-inline a { color: var(--text-muted); text-decoration: none; transition: color 0.2s; }
  .footer-links-inline a:hover { color: var(--primary-orange); }

  @media (max-width: 1024px) {
    .resource-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
    .footer-content { grid-template-columns: 1fr 1fr; }
  }

  @media (max-width: 768px) {
    .nav-links { display: none; }
    .hero { padding: 6rem 1.5rem 3rem; }
    .resource-grid { grid-template-columns: 1fr; }
    .footer-content { grid-template-columns: 1fr; }
    .footer-bottom { flex-direction: column; gap: 1rem; }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .fade-in { animation: fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }

  @keyframes float-gentle {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  @keyframes glow-pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
`;

type Category = "all" | "knowledge" | "simulation" | "generator" | "tool" | "template";

interface CardData {
  category: Exclude<Category, "all">;
  badge: string;
  title: string;
  description: string;
  meta: [string, string];
  tags: string[];
  action: string;
  icon: React.ReactNode;
}

const CARDS: CardData[] = [
  {
    category: "knowledge",
    badge: "Knowledge",
    title: "Interactive Node Graph Builder",
    description: "Create and manipulate complex knowledge networks with drag-and-drop nodes, custom relationships, and hierarchical structures.",
    meta: ["15.2K users", "★ 4.9"],
    tags: ["Interactive", "Real-time"],
    action: "Open →",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/>
        <circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>
        <line x1="12" y1="12" x2="6" y2="6"/><line x1="12" y1="12" x2="18" y2="6"/>
        <line x1="12" y1="12" x2="6" y2="18"/><line x1="12" y1="12" x2="18" y2="18"/>
      </svg>
    ),
  },
  {
    category: "knowledge",
    badge: "Knowledge",
    title: "Persistent Knowledge Graph Engine",
    description: "AI-powered semantic search and relationship mapping with persistent memory across sessions and collaborative features.",
    meta: ["12.8K users", "Enterprise"],
    tags: ["AI", "Semantic"],
    action: "Launch →",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
        <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      </svg>
    ),
  },
  {
    category: "generator",
    badge: "Generator",
    title: "Mathematical Graph Generator",
    description: "Generate mathematical graphs, plot functions, create visualizations from equations with LaTeX support and export capabilities.",
    meta: ["9.4K graphs", "Mathematics"],
    tags: ["Math", "LaTeX"],
    action: "Generate →",
    icon: <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    category: "simulation",
    badge: "Simulation",
    title: "Quantum Mechanics Simulator",
    description: "Real-time quantum physics simulations with wave function visualization, particle behavior, and probability distributions.",
    meta: ["8.7K runs", "Advanced"],
    tags: ["Physics", "3D"],
    action: "Simulate →",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    category: "simulation",
    badge: "Simulation",
    title: "Molecular Dynamics Engine",
    description: "Simulate molecular interactions with force field calculations, bond visualization, and thermodynamic analysis.",
    meta: ["6.9K simulations", "Chemistry"],
    tags: ["Chemistry", "Forces"],
    action: "Run →",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/>
        <circle cx="12" cy="6" r="2"/><circle cx="12" cy="18" r="2"/>
        <line x1="8" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="16" y2="12"/>
        <line x1="12" y1="8" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="16"/>
      </svg>
    ),
  },
  {
    category: "simulation",
    badge: "Simulation",
    title: "Electronic Circuit Simulator",
    description: "Design and simulate electronic circuits with component libraries, real-time analysis, and oscilloscope visualization.",
    meta: ["11.2K circuits", "Electronics"],
    tags: ["Electronics", "Live"],
    action: "Build →",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M5 12h14"/><circle cx="12" cy="12" r="7"/><path d="M12 8v8"/><path d="M8 12h8"/>
      </svg>
    ),
  },
  {
    category: "tool",
    badge: "Tool",
    title: "Statistical Analysis Suite",
    description: "Professional statistical analysis with ML integration, publication-ready visualizations, and export to multiple formats.",
    meta: ["7.3K projects", "Pro"],
    tags: ["Stats", "ML"],
    action: "Analyze →",
    icon: (
      <svg viewBox="0 0 24 24">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    category: "tool",
    badge: "Tool",
    title: "Neural Network Visualizer",
    description: "Visualize deep learning architectures, analyze layer activations, and optimize model performance with interactive tools.",
    meta: ["4.1K models", "AI/ML"],
    tags: ["AI", "Deep Learning"],
    action: "Visualize →",
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    category: "knowledge",
    badge: "Knowledge",
    title: "Concept Relationship Mapper",
    description: "Extract and visualize concept relationships with NLP-powered semantic analysis and hierarchical clustering algorithms.",
    meta: ["10.5K maps", "★ 4.8"],
    tags: ["NLP", "AI"],
    action: "Map →",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    ),
  },
  {
    category: "generator",
    badge: "Generator",
    title: "Advanced Equation Solver",
    description: "Solve complex mathematical equations, systems, differential equations with step-by-step solutions and graphing.",
    meta: ["18.6K solutions", "Mathematics"],
    tags: ["Calculus", "Algebra"],
    action: "Solve →",
    icon: <svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20M6 6l12 12M6 18L18 6"/></svg>,
  },
  {
    category: "simulation",
    badge: "Simulation",
    title: "Climate System Modeler",
    description: "Simulate atmospheric dynamics, ocean currents, and greenhouse gas effects for environmental research and analysis.",
    meta: ["3.8K models", "Environmental"],
    tags: ["Climate", "Research"],
    action: "Model →",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    category: "simulation",
    badge: "Simulation",
    title: "Protein Folding Simulator",
    description: "Predict protein structures, simulate folding pathways, and analyze biomolecular interactions with molecular visualization.",
    meta: ["2.1K folds", "Biology"],
    tags: ["Biology", "3D"],
    action: "Fold →",
    icon: <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  },
  {
    category: "template",
    badge: "Template",
    title: "IEEE Research Paper Template",
    description: "IEEE-standard template with automated citations, bibliography management, figure handling, and LaTeX export.",
    meta: ["5.2K downloads", "★ 4.9"],
    tags: ["IEEE", "LaTeX"],
    action: "Download →",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    category: "generator",
    badge: "Generator",
    title: "Lab Report Generator",
    description: "Generate professional lab reports from experimental data with automatic calculations, error analysis, and graph generation.",
    meta: ["7.8K reports", "Laboratory"],
    tags: ["Reports", "Auto"],
    action: "Create →",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
  },
  {
    category: "tool",
    badge: "Tool",
    title: "Scientific Code Formatter",
    description: "Format and optimize scientific computing code with syntax highlighting, documentation generation, and performance analysis.",
    meta: ["12.4K formats", "Development"],
    tags: ["Code", "Python"],
    action: "Format →",
    icon: (
      <svg viewBox="0 0 24 24">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
  {
    category: "knowledge",
    badge: "Knowledge",
    title: "Multi-Domain Knowledge Graph",
    description: "Cross-domain knowledge integration connecting physics, chemistry, biology, and mathematics with interdisciplinary relationships.",
    meta: ["6.7K graphs", "Enterprise"],
    tags: ["Multi-domain", "Advanced"],
    action: "Explore →",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
  {
    category: "template",
    badge: "Template",
    title: "Graduate Thesis Template",
    description: "Complete thesis template with chapters, bibliography, appendices, and university-compliant formatting for graduate research.",
    meta: ["2.9K downloads", "Graduate"],
    tags: ["Academic", "Research"],
    action: "Get →",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
  {
    category: "generator",
    badge: "Generator",
    title: "Scientific Presentation Builder",
    description: "Create professional scientific presentations with data visualization, equation rendering, and export to multiple formats.",
    meta: ["8.1K decks", "Presentations"],
    tags: ["Slides", "Export"],
    action: "Build →",
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    category: "tool",
    badge: "Tool",
    title: "Spectroscopy Data Analyzer",
    description: "Analyze spectroscopic data with peak detection, baseline correction, and automated compound identification.",
    meta: ["3.4K analyses", "Chemistry"],
    tags: ["Spectroscopy", "Auto-ID"],
    action: "Analyze →",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
      </svg>
    ),
  },
];

export default function ResourcePlaybook() {
  const [activeFilter, setActiveFilter] = useState<Category>("all");
  const [scrolled, setScrolled] = useState(false);
  const bgAccentRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Navbar scroll effect + parallax (matches original JS)
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.pageYOffset > 50);
      if (bgAccentRef.current) {
        bgAccentRef.current.style.transform = `translate(-40px, ${-30 + window.pageYOffset * 0.1}px)`;
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Intersection Observer for scroll fade-in (matches original JS exactly)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              const el = entry.target as HTMLElement;
              el.style.opacity = "1";
              el.style.transform = "translateY(0)";
            }, index * 100);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    cardRefs.current.forEach((el) => {
      if (el) {
        el.style.opacity = "0";
        el.style.transform = "translateY(20px)";
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [activeFilter]);

  // Filter with stagger animation (matches original JS exactly)
  const handleFilter = (filter: Category) => {
    // Reset card refs array for new set of cards
    cardRefs.current = [];
    setActiveFilter(filter);
  };

  // Mouse tracking for card glow (--mouse-x / --mouse-y)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    const card = cardRefs.current[idx];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  const visibleCards = CARDS.filter(
    (c) => activeFilter === "all" || c.category === activeFilter
  );

  const filterLabels: Record<Category, string> = {
    all: "All Resources",
    knowledge: "Knowledge Graphs",
    simulation: "Simulations",
    generator: "Generators",
    tool: "Analysis Tools",
    template: "Templates",
  };

  return (
    <>
      <style>{STYLES}</style>

      {/* Background */}
      <div className="bg-container">
        <div className="bg-grid"></div>
        <div className="bg-accent" ref={bgAccentRef}></div>
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-label">
            <span>Resource Playbook</span>
          </div>
          <h1>Professional STEM<br />Learning Resources</h1>
          <p className="hero-subtitle">Comprehensive collection of knowledge graphs, interactive simulations, generators, and research tools for advanced learners and professionals.</p>
        </div>
      </section>

      {/* Filters */}
      <section className="filters">
        <div className="filter-tabs">
          {(Object.keys(filterLabels) as Category[]).map((filter) => (
            <button
              key={filter}
              className={`filter-tab${activeFilter === filter ? " active" : ""}`}
              data-filter={filter}
              onClick={() => handleFilter(filter)}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>
      </section>

      {/* Resources */}
      <section className="playbook">
        <div className="resource-grid" id="resourceGrid">
          {visibleCards.map((card, idx) => (
            <div
              key={card.title}
              ref={(el) => { cardRefs.current[idx] = el; }}
              className={`resource-card category-${card.category} fade-in`}
              data-category={card.category}
              onMouseMove={(e) => handleMouseMove(e, idx)}
            >
              <div className="card-header">
                <div className="card-icon">
                  {card.icon}
                </div>
                <div className="card-badge">{card.badge}</div>
              </div>
              <div className="card-body">
                <h3 className="card-title">{card.title}</h3>
                <p className="card-description">{card.description}</p>
                <div className="card-meta">
                  <span>{card.meta[0]}</span>
                  <span>{card.meta[1]}</span>
                </div>
              </div>
              <div className="card-footer">
                <div className="card-tags">
                  {card.tags.map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
                <a href="#" className="card-action">{card.action}</a>
              </div>
            </div>
          ))}
        </div>
      </section>

    </>
  );
}