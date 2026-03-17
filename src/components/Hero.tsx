import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { geminiService, GraphData, GraphNode } from '../services/geminiService';
import { KnowledgeGraph } from './KnowledgeGraph';

// ─────────────────────────────────────────────────────────────────────────────
// Three.js particle system
// renderer.domElement is appended directly to document.body — no wrapper div needed
// ─────────────────────────────────────────────────────────────────────────────
function useThreeParticles(sectionRef: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    /* Scene */
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // transparent — body bg shows through

    /* Style the canvas and drop it straight into <body> */
    const { domElement } = renderer;
    domElement.style.position = 'fixed';
    domElement.style.top      = '0';
    domElement.style.left     = '0';
    domElement.style.width    = '100vw';
    domElement.style.height   = '100vh';
    domElement.style.pointerEvents = 'none';
    domElement.style.zIndex   = '0';
    document.body.appendChild(domElement);

    /* Geometry */
    const COUNT     = 8000;
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);
    const sizes     = new Float32Array(COUNT);
    const initY     = new Float32Array(COUNT);
    const initZ     = new Float32Array(COUNT);

    const c1 = new THREE.Color('#00c4ff');
    const c2 = new THREE.Color('#00f5d4');

    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 8;
      const z = (Math.random() - 0.5) * 8;

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      initY[i] = y;
      initZ[i] = z;

      const mixed = c1.clone().lerp(c2, Math.random());
      colors[i * 3]     = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;

      sizes[i] = Math.random() * 0.05 + 0.03;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
    geometry.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

    const material = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    scene.add(new THREE.Points(geometry, material));
    camera.position.z = 15;

    /* Turbulence */
    let turbulence       = 0;
    let targetTurbulence = 0;

    /* Animation loop */
    let rafId = 0;
    const t0  = performance.now();

    const animate = (): void => {
      rafId = requestAnimationFrame(animate);
      const time = (performance.now() - t0) / 1000;

      turbulence += (targetTurbulence - turbulence) * 0.05;

      const pos = geometry.getAttribute('position') as THREE.BufferAttribute;

      for (let i = 0; i < COUNT; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        x += 0.04 + turbulence * 0.06;
        if (x > 20) x = -20;

        let tY = initY[i] + Math.sin(x * 0.3 + time * 0.5) * 0.2;
        let tZ = initZ[i] + Math.cos(x * 0.3 + time * 0.5) * 0.2;

        if (turbulence > 0.001) {
          const ns = 0.5;
          const nf = time * (1.5 + turbulence * 2);
          tY += Math.sin(x * ns + nf) * Math.cos(z * ns * 0.5 + nf) * turbulence * 5;
          tZ += Math.cos(x * ns + nf) * Math.sin(y * ns * 0.5 + nf) * turbulence * 5;
          tY += Math.sin(time * turbulence * 2 + i) * turbulence * 1.5;
          tZ += Math.cos(time * turbulence * 2 + i) * turbulence * 1.5;
        }

        y += (tY - y) * 0.1;
        z += (tZ - z) * 0.1;
        pos.setXYZ(i, x, y, z);
      }

      pos.needsUpdate = true;
      renderer.render(scene, camera);
    };

    animate();

    /* Section hover / click */
    const section = sectionRef.current;
    const onEnter = (): void => { targetTurbulence = 0.35; };
    const onLeave = (): void => { targetTurbulence = 0; };
    const onClick = (): void => {
      targetTurbulence = 1.0;
      setTimeout(() => { targetTurbulence = 0; }, 1400);
    };

    section?.addEventListener('mouseenter', onEnter);
    section?.addEventListener('mouseleave', onLeave);
    section?.addEventListener('click',      onClick);

    /* Resize */
    const onResize = (): void => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    /* Cleanup */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      section?.removeEventListener('mouseenter', onEnter);
      section?.removeEventListener('mouseleave', onLeave);
      section?.removeEventListener('click',      onClick);
      document.body.removeChild(domElement);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ─── Feature buttons data ──────────────────────────────────────────────── */
const FEATURES = [
  {
    id: 'knowledge-graph',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
        <line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/>
      </svg>
    ),
    label: 'Knowledge Graph', desc: 'Map your understanding', accent: '#00f5d4',
  },
  {
    id: 'visual-learning',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    label: 'Visual Learning', desc: 'See concepts in 3D', accent: '#00c4ff',
  },
  {
    id: 'virtual-lab',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-4 7h14l-4-7V3"/>
      </svg>
    ),
    label: 'Virtual Lab', desc: 'Simulate experiments', accent: '#fbbf24',
  },
  {
    id: 'ai-tutor',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    label: 'AI Tutor', desc: 'Guided conversations', accent: '#a78bfa',
  },
  {
    id: 'simulations',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
    label: '3D Simulations', desc: 'Physics & dynamics', accent: '#f472b6',
  },
] as const;

const STATS = [
  { val: '5,000+', lbl: 'Interactive Models' },
  { val: '1.2M',   lbl: 'Data Nodes'         },
  { val: '50k+',   lbl: 'Active Learners'    },
  { val: '98%',    lbl: 'Success Rate'       },
] as const;

/* ─── Skeuomorphic feature button ──────────────────────────────────────── */
interface FeatureBtnProps {
  icon: React.ReactNode; label: string; desc: string; accent: string;
}
// Replace the FeatureBtn component with this SOLID CYAN version:
/* ─── Skeuomorphic feature button ──────────────────────────────────────── */
interface FeatureBtnProps {
  icon: React.ReactNode; label: string; desc: string; accent: string;
}
const FeatureBtn: React.FC<FeatureBtnProps> = ({ icon, label, desc, accent }) => {
  const [hov,   setHov]   = useState(false);
  const [press, setPress] = useState(false);

  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', gap: 6, padding: '16px 18px',
        minWidth: 148, flex: '1 1 0', textAlign: 'left',
        borderRadius: 12, cursor: 'pointer',
        transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        background: press
          ? 'linear-gradient(180deg,rgba(10,14,30,0.95) 0%,rgba(16,22,45,0.9) 100%)'
          : hov
          ? 'linear-gradient(180deg,rgba(20,28,58,0.98) 0%,rgba(14,20,42,0.95) 100%)'
          : 'linear-gradient(180deg,rgba(14,20,42,0.95) 0%,rgba(10,14,30,0.9) 100%)',
        borderTop:   `1px solid ${hov ? accent + '55' : 'rgba(255,255,255,0.08)'}`,
        borderLeft:  `1px solid ${hov ? accent + '55' : 'rgba(255,255,255,0.08)'}`,
        borderRight: `1px solid ${hov ? accent + '55' : 'rgba(255,255,255,0.08)'}`,
        borderBottom:`1px solid ${accent}33`,
        transform: press ? 'translateY(2px) scale(0.98)' : hov ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: press
          ? `0 1px 0 rgba(255,255,255,0.04) inset,0 2px 8px rgba(0,0,0,0.6),0 0 0 1px ${accent}22`
          : hov
          ? `0 1px 0 rgba(255,255,255,0.07) inset,0 -2px 0 rgba(0,0,0,0.4) inset,0 8px 28px rgba(0,0,0,0.55),0 0 20px ${accent}18`
          : `0 1px 0 rgba(255,255,255,0.05) inset,0 -2px 0 rgba(0,0,0,0.35) inset,0 4px 16px rgba(0,0,0,0.4)`,
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 16, right: 16, height: 1,
        background: `linear-gradient(90deg,transparent,${accent}66,transparent)`,
        opacity: hov ? 1 : 0, transition: 'opacity 0.2s',
      }} />
      <div style={{
        color: hov ? accent : 'rgba(255,255,255,0.5)', display: 'flex',
        transition: 'color 0.2s',
        filter: hov ? `drop-shadow(0 0 6px ${accent}88)` : 'none',
      }}>{icon}</div>
      <div>
        <div style={{ color: hov ? '#fff' : 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 700, transition: 'color 0.2s' }}>{label}</div>
        <div style={{ color: hov ? accent : 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 500, marginTop: 2, transition: 'color 0.2s' }}>{desc}</div>
      </div>
      <div style={{
        position: 'absolute', right: 12, top: '50%',
        transform: `translateY(-50%) translateX(${hov ? '0' : '-4px'})`,
        opacity: hov ? 0.7 : 0, transition: 'all 0.2s', color: accent, fontSize: 14,
      }}>→</div>
    </button>
  );
};


/* ─── Skeuomorphic search button ────────────────────────────────────────── */
/* ─── Skeuomorphic search button ────────────────────────────────────────── */
const SearchBtn: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const [hov,   setHov]   = useState(false);
  const [press, setPress] = useState(false);

  return (
    <button
      type="submit" disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px 16px', borderRadius: 10, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.38 : 1,
        fontSize: 13, fontWeight: 700, color: '#0a3635',
        transition: 'all 0.14s',
        transform: press ? 'translateY(1px)' : 'translateY(0)',
        background: press
          ? 'linear-gradient(180deg,#5da5a4 0%,#4a8382 100%)'
          : hov
          ? 'linear-gradient(180deg,#8ed5d4 0%,#5fb3b2 100%)'
          : 'linear-gradient(180deg,#7CC9C8 0%,#5aabaa 100%)',
        boxShadow: press
          ? '0 1px 0 rgba(255,255,255,0.15) inset,0 1px 4px rgba(0,0,0,0.5)'
          : hov
          ? '0 1px 0 rgba(255,255,255,0.25) inset,0 -2px 0 rgba(0,0,0,0.4) inset,0 4px 0 #4a8988,0 6px 20px rgba(124,201,200,0.55)'
          : '0 1px 0 rgba(255,255,255,0.2) inset,0 -2px 0 rgba(0,0,0,0.35) inset,0 3px 0 #4d8b8a,0 5px 16px rgba(124,201,200,0.45)',
      }}
    >
      <svg 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        style={{
          transition: 'transform 0.3s',
          transform: hov ? 'rotate(90deg) scale(1.1)' : 'rotate(0deg) scale(1)',
        }}
      >
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
        <path d="M11 8l-2 3h4l-2 3"/>
      </svg>
    </button>
  );
};
/* ─── Hero ──────────────────────────────────────────────────────────────── */
export const Hero: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  useThreeParticles(sectionRef);

  const [searchQuery,  setSearchQuery]  = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [graphData,    setGraphData]    = useState<GraphData | null>(null);
  const [isSearching,  setIsSearching]  = useState(false);
  const [isExpanding,  setIsExpanding]  = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('effectual_knowledge_graph');
    if (!saved) return;
    try { setGraphData(JSON.parse(saved) as GraphData); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (graphData) localStorage.setItem('effectual_knowledge_graph', JSON.stringify(graphData));
  }, [graphData]);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try { setGraphData(await geminiService.generateKnowledgeGraph(searchQuery)); }
    catch (err) { console.error('Search failed', err); }
    finally { setIsSearching(false); }
  }, [searchQuery]);

  const handleNodeClick = useCallback(async (node: GraphNode) => {
    if (!graphData) return;
    setIsExpanding(true);
    try {
      const next = await geminiService.generateKnowledgeGraph(node.label, graphData.nodes.map(n => n.id));
      const mergedNodes = [...graphData.nodes];
      next.nodes.forEach(n => { if (!mergedNodes.find(m => m.id === n.id)) mergedNodes.push(n); });
      const mergedEdges = [...graphData.edges];
      next.edges.forEach(e => { if (!mergedEdges.find(m => m.source === e.source && m.target === e.target)) mergedEdges.push(e); });
      setGraphData({ nodes: mergedNodes, edges: mergedEdges });
    } catch (err) { console.error('Expansion failed', err); }
    finally { setIsExpanding(false); }
  }, [graphData]);

  const clearGraph = useCallback(() => {
    setGraphData(null);
    localStorage.removeItem('effectual_knowledge_graph');
  }, []);

  return (
    <>
      <style>{`
        @keyframes badgePulse {
          0%,100% { box-shadow:0 0 0 0 rgba(0,245,212,0.6); }
          50%      { box-shadow:0 0 0 6px rgba(0,245,212,0); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes shimmer {
          from { background-position:-200% center; }
          to   { background-position: 200% center; }
        }
        .h-f1 { animation:fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.10s both; }
        .h-f2 { animation:fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
        .h-f3 { animation:fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.40s both; }
        .h-f4 { animation:fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.55s both; }
        .h-f5 { animation:fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.70s both; }
        .search-input::placeholder { color:rgba(255,255,255,0.28); }
        .search-input:focus { outline:none; }
      `}</style>

      <section
        ref={sectionRef}
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 24px 80px',
          overflow: 'hidden',
          background: 'transparent', // body bg (#05060f) shows through, Three.js renders on top
          cursor: 'default',
        }}
      >
        {/* Dot grid — z-index 1 so it sits above the fixed Three.js canvas */}
        <div aria-hidden style={{
          position:'absolute', inset:0, pointerEvents:'none', zIndex:1,
          backgroundImage:'radial-gradient(circle at 1.5px 1.5px,rgba(255,255,255,0.03) 1.5px,transparent 0)',
          backgroundSize:'40px 40px',
        }} />

        {/* Centre radial glow */}
        <div aria-hidden style={{
          position:'absolute', top:'45%', left:'50%',
          transform:'translate(-50%,-50%)',
          width:820, height:820, pointerEvents:'none', zIndex:1,
          background:'radial-gradient(circle,rgba(0,196,255,0.07) 0%,rgba(0,245,212,0.03) 40%,transparent 70%)',
        }} />

        {/* Bottom page fade */}
        <div aria-hidden style={{
          position:'absolute', bottom:0, left:0, right:0, height:200,
          background:'linear-gradient(to top,#05060f,transparent)',
          pointerEvents:'none', zIndex:1,
        }} />

        {/* Content */}
        <div style={{
          position:'relative', zIndex:10,
          width:'100%', maxWidth:780,
          display:'flex', flexDirection:'column',
          alignItems:'center', textAlign:'center',
        }}>

          {graphData ? (
            /* Graph mode header */
            <div className="h-f1" style={{
              width:'100%', display:'flex',
              alignItems:'center', justifyContent:'space-between',
              textAlign:'left', marginBottom:24,
            }}>
              <div>
                <h2 style={{ color:'#fff', fontSize:22, fontWeight:700, margin:0 }}>Knowledge Explorer</h2>
                <p style={{ color:'rgba(255,255,255,0.38)', fontSize:13, margin:'4px 0 0' }}>
                  Click any node to expand your understanding
                </p>
              </div>
              <button
                onClick={clearGraph}
                style={{
                  padding:'8px 16px', fontSize:11, fontWeight:700,
                  color:'rgba(255,255,255,0.38)', background:'transparent',
                  border:'1px solid rgba(255,255,255,0.1)', borderRadius:8,
                  cursor:'pointer', transition:'color 0.2s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'white')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.38)')}
              >
                Reset Graph
              </button>
            </div>
          ) : (
            <>
              {/* Badge */}
              <div className="h-f1" style={{
                display:'inline-flex', alignItems:'center', gap:8,
                padding:'6px 14px',
                background:'rgba(0,245,212,0.06)',
                border:'1px solid rgba(0,245,212,0.2)',
                borderRadius:100, marginBottom:28,
              }}>
                <span style={{
                  display:'inline-block', width:6, height:6,
                  background:'#00f5d4', borderRadius:'50%',
                  boxShadow:'0 0 8px #00f5d4',
                  animation:'badgePulse 2.4s ease-in-out infinite',
                }} />
                <span style={{ color:'#00f5d4', fontSize:10, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase' }}>
                  Next-Gen STEM Learning
                </span>
              </div>

              {/* Headline */}
              <h1 className="h-f2" style={{
                fontSize:'clamp(42px,6.5vw,76px)',
                fontWeight:900, lineHeight:1.06,
                letterSpacing:'-0.03em', color:'#fff', marginBottom:20,
              }}>
                Learn &amp; Explore
                <br />
                <span style={{
                  background:'linear-gradient(90deg,#00f5d4 0%,#00c4ff 40%,#fbbf24 100%)',
                  backgroundSize:'200% auto',
                  WebkitBackgroundClip:'text',
                  WebkitTextFillColor:'transparent',
                  backgroundClip:'text',
                  animation:'shimmer 4s linear infinite',
                }}>
                  STEM Visually
                </span>
              </h1>

              {/* Sub */}
              <p className="h-f3" style={{
                fontSize:16, lineHeight:1.72,
                color:'rgba(255,255,255,0.42)', maxWidth:500, marginBottom:40,
              }}>
                Conceptualize complex concepts &amp; build your personal knowledge
                graph with our high-fidelity interactive engine.
              </p>
            </>
          )}

          {/* Search bar */}
          <form onSubmit={handleSearch} className="h-f4"
            style={{ width:'100%', maxWidth:620, marginBottom:40, position:'relative' }}
          >
            <div aria-hidden style={{
              position:'absolute', inset:-3, borderRadius:16, pointerEvents:'none',
              background: inputFocused
                ? 'linear-gradient(90deg,rgba(0,245,212,0.35),rgba(0,196,255,0.35))'
                : 'linear-gradient(90deg,rgba(0,245,212,0.12),rgba(0,102,255,0.12))',
              filter:'blur(16px)', transition:'background 0.4s',
            }} />
            <div style={{
              position:'relative', display:'flex', alignItems:'center', padding:5,
              background:'rgba(8,12,26,0.93)',
              border: inputFocused ? '1px solid rgba(0,245,212,0.35)' : '1px solid rgba(255,255,255,0.07)',
              borderRadius:14, backdropFilter:'blur(24px)',
              boxShadow:'0 1px 0 rgba(255,255,255,0.04) inset,0 24px 60px rgba(0,0,0,0.5)',
              transition:'border-color 0.3s',
            }}>
              <span style={{
                fontSize:18, paddingLeft:12, paddingRight:10, flexShrink:0,
                color: inputFocused ? '#00f5d4' : 'rgba(255,255,255,0.3)',
                transition:'color 0.3s',
              }}>✦</span>
              <input
                type="text"
                className="search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                disabled={isSearching}
                placeholder="Ask anything — e.g. Quantum Mechanics, Cell Biology…"
                style={{
                  flex:1, minWidth:0, background:'transparent', border:'none',
                  color:'rgba(255,255,255,0.8)', fontSize:14, fontWeight:400,
                }}
              />
              <SearchBtn disabled={isSearching || !searchQuery.trim()} />
            </div>
          </form>

          {/* KnowledgeGraph or feature buttons */}
          {graphData ? (
            <div className="h-f4" style={{ 
              width: '100vw',
              marginLeft: 'calc(-50vw + 50%)',
              marginBottom: 48,
              paddingLeft: '60px',
              paddingRight: '60px',
              boxSizing: 'border-box'
            }}>
              <KnowledgeGraph data={graphData} onNodeClick={handleNodeClick} isLoading={isExpanding} />
            </div>
          ) : (
            <div className="h-f5" style={{
              display:'flex', flexWrap:'wrap', gap:10,
              justifyContent:'center', width:'100%', marginBottom:64,
            }}>
              {FEATURES.map(f => (
                <FeatureBtn key={f.id} icon={f.icon} label={f.label} desc={f.desc} accent={f.accent} />
              ))}
            </div>
          )}

          {/* Stats */}
          <div style={{
            width:'100%', display:'grid',
            gridTemplateColumns:'repeat(4,1fr)', gap:24,
            paddingTop:32, borderTop:'1px solid rgba(255,255,255,0.055)',
          }}>
            {STATS.map(({ val, lbl }) => (
              <div key={lbl} style={{ textAlign:'left' }}>
                <div style={{ fontSize:'clamp(26px,3.5vw,38px)', fontWeight:900, color:'#fff', letterSpacing:'-0.03em', lineHeight:1, marginBottom:6 }}>{val}</div>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)' }}>{lbl}</div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </>
  );
};

export default Hero;