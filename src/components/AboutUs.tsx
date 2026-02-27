import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface NodeData {
  id: string;
  color: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface LinkData {
  source: string | NodeData;
  target: string | NodeData;
}

interface BatchEntry {
  id: string;
  color: string;
  connects: string[];
}

export const AboutUs: React.FC = () => {
  const starsCanvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [typewriterText, setTypewriterText] = useState('');
  const [activeFeature, setActiveFeature] = useState(-1);
  const [currentPhase, setCurrentPhase] = useState('Initialising…');
  const [nodeCount, setNodeCount] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  const PHRASES = [
    'Persistent Knowledge Infrastructure',
    'Every question builds your graph.',
    'Learning that compounds over time.',
    'Your mind map, growing forever.',
  ];

  const PHASES_LIST = [
    'Phase 1: Concept Extraction',
    'Phase 2: Mapping Relationships',
    'Phase 3: Expanding Network',
    'Phase 4: Deep Connections',
    'System Synced. Restarting Cycle…',
  ];

  const BATCHES: BatchEntry[][] = [
    [
      { id: 'Core', color: '#22d3ee', connects: [] },
      { id: 'Memory', color: '#22d3ee', connects: ['Core'] },
      { id: 'Structure', color: '#22d3ee', connects: ['Core'] },
    ],
    [
      { id: 'Inference', color: '#fb923c', connects: ['Structure'] },
      { id: 'Persistence', color: '#fb923c', connects: ['Memory'] },
      { id: 'Graph', color: '#22d3ee', connects: ['Core', 'Persistence'] },
    ],
    [
      { id: 'Flow', color: '#22d3ee', connects: ['Graph'] },
      { id: 'Continuity', color: '#fb923c', connects: ['Memory', 'Flow'] },
      { id: 'Context', color: '#22d3ee', connects: ['Inference', 'Flow'] },
    ],
    [
      { id: 'Scale', color: '#fb923c', connects: ['Structure', 'Context'] },
      { id: 'Research', color: '#22d3ee', connects: ['Scale', 'Graph'] },
      { id: 'Network', color: '#fb923c', connects: ['Research', 'Persistence'] },
      { id: 'Depth', color: '#22d3ee', connects: ['Network', 'Core'] },
    ],
  ];

  // Star particle background
  useEffect(() => {
    const canvas = starsCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      speed: Math.random() * 0.008 + 0.003,
      phase: Math.random() * Math.PI * 2,
    }));

    let animationId: number;
    const drawStars = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        const alpha = 0.2 + 0.5 * Math.sin(s.phase + t * s.speed);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,220,255,${alpha})`;
        ctx.fill();
      });
      animationId = requestAnimationFrame(drawStars);
    };

    animationId = requestAnimationFrame(drawStars);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Typewriter effect
  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeoutId: NodeJS.Timeout;

    const typeStep = () => {
      const phrase = PHRASES[phraseIndex];
      if (!deleting) {
        setTypewriterText(phrase.slice(0, ++charIndex));
        if (charIndex === phrase.length) {
          deleting = true;
          timeoutId = setTimeout(typeStep, 2000);
          return;
        }
        timeoutId = setTimeout(typeStep, 45);
      } else {
        setTypewriterText(phrase.slice(0, --charIndex));
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % PHRASES.length;
          timeoutId = setTimeout(typeStep, 400);
          return;
        }
        timeoutId = setTimeout(typeStep, 22);
      }
    };

    timeoutId = setTimeout(typeStep, 800);
    return () => clearTimeout(timeoutId);
  }, []);

  // D3 Force Graph
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;

    const container = svg.node()?.parentElement;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    svg.selectAll('*').remove();

    const defs = svg.append('defs');

    // Teal gradient
    const tg = defs.append('linearGradient').attr('id', 'linkTeal');
    tg.append('stop').attr('offset', '0%').attr('stop-color', '#22d3ee').attr('stop-opacity', 0.6);
    tg.append('stop').attr('offset', '100%').attr('stop-color', '#2dd9b4').attr('stop-opacity', 0.2);

    // Orange gradient
    const og = defs.append('linearGradient').attr('id', 'linkOrange');
    og.append('stop').attr('offset', '0%').attr('stop-color', '#fb923c').attr('stop-opacity', 0.6);
    og.append('stop').attr('offset', '100%').attr('stop-color', '#f97316').attr('stop-opacity', 0.2);

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const linkG = svg.append('g').attr('class', 'links');
    const nodeG = svg.append('g').attr('class', 'nodes');

    let nodesData: NodeData[] = [];
    let linksData: LinkData[] = [];
    let totalNodes = 0;

    const simulation = d3
      .forceSimulation<NodeData>()
      .force('link', d3.forceLink<NodeData, LinkData>().id((d) => d.id).distance(100).strength(0.6))
      .force('charge', d3.forceManyBody<NodeData>().strength(-180))
      .force('center', d3.forceCenter(W / 2, H * 0.44))
      .force('collision', d3.forceCollide(26))
      .alphaDecay(0.022);

    simulation.on('tick', () => {
      linkG.selectAll('path.link').attr('d', (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.4;
        return `M${d.source.x},${d.source.y} A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      nodeG.selectAll('g.node-group').attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    const updateGraph = () => {
      linkG
        .selectAll('path.link')
        .data(linksData, (d: any) => `${d.source.id || d.source}-${d.target.id || d.target}`)
        .join((enter) => {
          const isTeal = (d: any) => {
            const s = nodesData.find((n) => n.id === (d.source.id || d.source));
            return !s || s.color === '#22d3ee';
          };
          return enter
            .append('path')
            .attr('class', 'link')
            .style('stroke', (d: any) => (isTeal(d) ? 'url(#linkTeal)' : 'url(#linkOrange)'))
            .style('stroke-width', '1.4px')
            .style('fill', 'none')
            .style('stroke-opacity', 0)
            .transition()
            .duration(600)
            .style('stroke-opacity', 1);
        });

      nodeG
        .selectAll('g.node-group')
        .data(nodesData, (d: any) => d.id)
        .join((enter) => {
          const g = enter.append('g').attr('class', 'node-group');

          g.append('circle')
            .attr('class', 'node-ring')
            .attr('r', 12)
            .style('stroke', (d) => d.color)
            .style('fill', 'none')
            .style('stroke-width', '1px')
            .style('opacity', 0)
            .style('animation', 'ringPulse 2s ease-out infinite')
            .style('animation-delay', () => `${Math.random() * 2}s`);

          g.append('circle')
            .attr('class', 'node-circle')
            .attr('r', 0)
            .attr('fill', (d) => d.color)
            .attr('stroke', (d) => (d.color === '#22d3ee' ? '#0e3a4a' : '#4a2010'))
            .style('stroke-width', '2.5px')
            .style('filter', 'url(#glow)')
            .style('cursor', 'pointer')
            .transition()
            .duration(500)
            .ease(d3.easeBackOut.overshoot(2.5))
            .attr('r', 9);

          g.append('circle')
            .attr('r', 3)
            .attr('fill', 'rgba(255,255,255,0.35)')
            .attr('cx', -3)
            .attr('cy', -3)
            .style('pointer-events', 'none');

          g.append('text')
            .attr('dy', 22)
            .attr('text-anchor', 'middle')
            .style('font-family', 'Inter, sans-serif')
            .style('font-size', '9px')
            .style('font-weight', '500')
            .style('fill', 'rgba(200,220,255,0.55)')
            .style('letter-spacing', '.04em')
            .style('opacity', 0)
            .text((d) => d.id)
            .transition()
            .delay(400)
            .duration(400)
            .style('opacity', 1);

          return g;
        });

      simulation.nodes(nodesData);
      simulation.force<d3.ForceLink<NodeData, LinkData>>('link')?.links(linksData);
      simulation.alpha(0.85).restart();
    };

    const TOTAL_NODES = BATCHES.flat().length;
    const NODE_DELAY = 850;
    const FEAT_GAP = 3400;
    const RESTART_GAP = 2600;

    const addEntry = (entry: BatchEntry) => {
      nodesData.push({ id: entry.id, color: entry.color });
      entry.connects.forEach((t) => {
        if (nodesData.find((n) => n.id === t)) {
          linksData.push({ source: entry.id, target: t });
        }
      });
      totalNodes++;
      setNodeCount(totalNodes);
      setBarWidth(Math.min((totalNodes / TOTAL_NODES) * 100, 100));
      updateGraph();
    };

    const runBatch = (bIdx: number) => {
      setActiveFeature(bIdx);
      setCurrentPhase(PHASES_LIST[Math.min(bIdx, 3)]);
      BATCHES[bIdx].forEach((e, i) => setTimeout(() => addEntry(e), i * NODE_DELAY));
    };

    const runCycle = () => {
      nodesData = [];
      linksData = [];
      totalNodes = 0;
      nodeG.selectAll('*').remove();
      linkG.selectAll('*').remove();
      setBarWidth(0);
      setNodeCount(0);
      setCurrentPhase('Initialising…');
      setActiveFeature(-1);

      let t = 500;
      BATCHES.forEach((batch, bIdx) => {
        setTimeout(() => runBatch(bIdx), t);
        t += batch.length * NODE_DELAY + FEAT_GAP;
      });

      setTimeout(() => {
        setCurrentPhase(PHASES_LIST[4]);
        setActiveFeature(-1);
      }, t);

      setTimeout(runCycle, t + RESTART_GAP);
    };

    runCycle();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07122a] text-[#f0f4ff] font-[Inter,sans-serif]">
      {/* Star background */}
      <canvas ref={starsCanvasRef} className="fixed inset-0 z-0 pointer-events-none" />

      {/* Radial glow background */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 15% 20%, rgba(45,217,180,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 85% 80%, rgba(251,146,60,0.06) 0%, transparent 70%),
            radial-gradient(circle at 50% 50%, #0c1d3a 0%, #07122a 70%)
          `,
        }}
      />

      {/* Main content */}
      <div className="relative z-[2] flex h-screen px-16 py-[52px] gap-12 items-center">
        {/* Left side */}
        <div className="flex-[0_0_46%] flex flex-col">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-[14px] py-[6px] rounded-[30px] bg-[rgba(45,217,180,0.07)] border border-[rgba(45,217,180,0.2)] text-[10px] tracking-[0.16em] uppercase text-[#2dd9b4] mb-[22px] w-fit backdrop-blur-[8px]">
            <div className="w-[6px] h-[6px] rounded-full bg-[#2dd9b4] shadow-[0_0_6px_#2dd9b4] animate-pulse" />
            The Future of Learning
          </div>

          {/* Logo */}
          <div className="font-[Syne,sans-serif] text-[clamp(42px,5vw,66px)] font-extrabold leading-none tracking-[-0.03em] mb-2">
            Effectual<span className="text-[#fb923c]">L</span>
          </div>

          {/* Typewriter */}
          <div className="text-[15px] font-light text-[#94a3b8] mb-9 min-h-[22px]">
            {typewriterText}
            <span className="inline-block w-[2px] h-[1em] bg-[#2dd9b4] ml-[2px] align-text-bottom animate-[blink_0.9s_step-end_infinite]" />
          </div>

          {/* Features */}
          <div className="flex flex-col gap-[2px]">
            {[
              { num: '01', title: 'Generate & Structure', desc: 'AI identifies key concepts and constructs an evolving visual knowledge graph from every question.' },
              { num: '02', title: 'Persistent Objects', desc: 'Interactions are saved as interactive Graph Objects. Your workspace grows as you learn.' },
              { num: '03', title: 'Continuity & Flow', desc: 'Resume exactly where you left off. Explore unexplored nodes and suggested connections daily.' },
              { num: '04', title: 'Scalable Complexity', desc: 'The same engine scales from school chapters to multi-layered research networks.' },
            ].map((feat, idx) => (
              <div
                key={idx}
                className={`
                  relative overflow-hidden p-4 pl-5 rounded-r-[10px] border-l-2 transition-all duration-[350ms]
                  ${activeFeature === idx
                    ? 'border-l-[#2dd9b4] bg-[linear-gradient(90deg,rgba(45,217,180,0.06),transparent)]'
                    : 'border-l-[rgba(255,255,255,0.05)]'
                  }
                `}
              >
                <div className={`text-[10px] font-semibold tracking-[0.14em] uppercase mb-[3px] transition-colors ${activeFeature === idx ? 'text-[#2dd9b4]' : 'text-[rgba(100,116,139,0.5)]'}`}>
                  {feat.num}
                </div>
                <div className={`font-[Syne,sans-serif] text-base font-bold mb-[3px] transition-colors ${activeFeature === idx ? 'text-white' : 'text-[#64748b]'}`}>
                  {feat.title}
                </div>
                <div
                  className={`text-[13px] font-light leading-[1.6] max-w-[380px] transition-all duration-400 ${
                    activeFeature === idx ? 'text-[#94a3b8] max-h-[60px] opacity-100' : 'text-transparent max-h-0 opacity-0'
                  }`}
                  style={{ overflow: 'hidden' }}
                >
                  {feat.desc}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-[14px] mt-7 items-center">
            <a
              href="#"
              className="relative inline-flex items-center gap-2 px-[26px] py-[13px] rounded-[10px] font-[Syne,sans-serif] text-[13px] font-bold tracking-[0.04em] text-white border-none bg-[linear-gradient(180deg,#ff9a5c_0%,#e8601a_100%)] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_-2px_0_rgba(0,0,0,0.3)_inset,0_6px_0_#a03d0a,0_8px_16px_rgba(251,146,60,0.35),0_2px_4px_rgba(0,0,0,0.4)] transition-all hover:bg-[linear-gradient(180deg,#ffaa72_0%,#f0701f_100%)] hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_-2px_0_rgba(0,0,0,0.3)_inset,0_6px_0_#b04515,0_10px_24px_rgba(251,146,60,0.5),0_2px_4px_rgba(0,0,0,0.4)] active:translate-y-1 active:shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_-1px_0_rgba(0,0,0,0.2)_inset,0_2px_0_#a03d0a,0_3px_8px_rgba(251,146,60,0.2),0_1px_2px_rgba(0,0,0,0.3)]"
            >
              Start Building Free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12,5 19,12 12,19" />
              </svg>
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-[7px] px-[22px] py-3 rounded-[10px] text-[13px] font-medium text-[#2dd9b4] bg-[rgba(45,217,180,0.06)] border border-[rgba(45,217,180,0.2)] backdrop-blur-[6px] transition-all hover:bg-[rgba(45,217,180,0.12)] hover:border-[rgba(45,217,180,0.4)] hover:shadow-[0_0_20px_rgba(45,217,180,0.15)]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              See it live
            </a>
          </div>
        </div>

        {/* Right side - Graph card */}
        <div className="flex-1 h-full flex items-center justify-center">
          <div className="relative w-full h-[90%] rounded-[26px] bg-[linear-gradient(155deg,#122540_0%,#0d1e35_40%,#091828_100%)] border border-[rgba(255,255,255,0.06)] overflow-hidden shadow-[0_48px_96px_rgba(0,0,0,0.7),0_16px_32px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.07)_inset,0_-1px_0_rgba(0,0,0,0.6)_inset,1px_0_0_rgba(255,255,255,0.03)_inset,-1px_0_0_rgba(255,255,255,0.03)_inset,0_0_60px_rgba(45,217,180,0.04)_inset] animate-[floatCard_7s_ease-in-out_infinite]">
            {/* Live pill */}
            <div className="absolute top-5 left-5 z-10 flex items-center gap-[7px] px-[14px] py-[6px] rounded-[20px] bg-[rgba(45,217,180,0.08)] border border-[rgba(45,217,180,0.22)] text-[10px] tracking-[0.14em] uppercase text-[#2dd9b4] backdrop-blur-[10px] shadow-[0_2px_12px_rgba(45,217,180,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="w-[6px] h-[6px] rounded-full bg-[#2dd9b4] shadow-[0_0_8px_#2dd9b4] animate-pulse" />
              Knowledge Graph Live
            </div>

            {/* Scanline */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(45,217,180,0.3),transparent)] z-[5] animate-[scan_4s_linear_infinite] pointer-events-none" />

            {/* SVG Graph */}
            <svg ref={svgRef} className="absolute inset-0 w-full h-full z-[2]" />

            {/* Progress card */}
            <div className="absolute bottom-5 left-5 right-5 z-10 p-4 px-5 rounded-2xl bg-[linear-gradient(145deg,rgba(16,34,56,0.95)_0%,rgba(10,24,40,0.95)_100%)] border border-[rgba(255,255,255,0.06)] shadow-[0_-1px_0_rgba(255,255,255,0.05)_inset,0_1px_0_rgba(0,0,0,0.4)_inset,0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(45,217,180,0.04)] backdrop-blur-2xl">
              <div className="flex justify-between items-end mb-[10px]">
                <div>
                  <div className="text-[9px] tracking-[0.16em] uppercase text-[#64748b] mb-1">Active Stream</div>
                  <div className="font-[Syne,sans-serif] text-[13px] font-bold text-[#22d3ee] min-h-[18px]">{currentPhase}</div>
                </div>
                <div>
                  <div className="text-[9px] tracking-[0.16em] uppercase text-[#64748b] mb-1 text-right">Persistence</div>
                  <div className="font-[Syne,sans-serif] text-sm font-bold text-white text-right">{nodeCount} Nodes</div>
                </div>
              </div>
              <div className="h-1 rounded-[10px] bg-[rgba(255,255,255,0.05)] overflow-visible relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                <div
                  className="h-full rounded-[10px] bg-[linear-gradient(90deg,#22d3ee,#2dd9b4_50%,#fb923c)] shadow-[0_0_12px_rgba(34,211,238,0.6),0_0_24px_rgba(34,211,238,0.2)] transition-[width] duration-[550ms] relative after:content-[''] after:absolute after:right-[-3px] after:top-[-3px] after:w-[10px] after:h-[10px] after:rounded-full after:bg-white after:shadow-[0_0_8px_#22d3ee,0_0_16px_rgba(34,211,238,0.6)] after:opacity-90"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>

            {/* Glass sheen */}
            <div className="absolute top-[-50%] left-[-30%] w-[160%] h-[200%] bg-[radial-gradient(ellipse_at_40%_30%,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.01)_30%,transparent_60%)] rotate-[20deg] pointer-events-none z-[1]" />

            {/* Bottom vignette */}
            <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-[linear-gradient(to_top,rgba(9,24,40,0.95)_0%,transparent_100%)] pointer-events-none z-[3]" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes floatCard {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-7px) rotate(0.2deg); }
          66% { transform: translateY(-4px) rotate(-0.1deg); }
        }
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes ringPulse {
          0% { r: 12px; opacity: 0.6; }
          100% { r: 28px; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
