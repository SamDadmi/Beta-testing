import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode } from '../services/geminiService';

interface KnowledgeGraphProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
  isLoading?: boolean;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data, onNodeClick, isLoading }) => {
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // ── draw() is called once we know the real pixel dimensions ──────────────
  const draw = useCallback((width: number, height: number) => {
    if (!svgRef.current || !data.nodes.length) return;

    const PADDING = 60;
    const NODE_R  = 8;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width',   width)
      .attr('height',  height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // arrowhead marker
    svg.append('defs').append('marker')
      .attr('id',           'kg-arrow')
      .attr('viewBox',      '-0 -5 10 10')
      .attr('refX',         22)
      .attr('refY',         0)
      .attr('orient',       'auto')
      .attr('markerWidth',  5)
      .attr('markerHeight', 5)
      .append('svg:path')
      .attr('d',    'M 0,-5 L 10,0 L 0,5')
      .attr('fill', 'rgba(255,255,255,0.22)');

    const g = svg.append('g');

    // zoom / pan
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on('zoom', e => g.attr('transform', e.transform))
    );

    // clone so d3 can mutate freely
    const nodes: any[] = data.nodes.map(n => ({ ...n }));
    const edges: any[] = data.edges.map(e => ({ ...e }));

    const sim = d3.forceSimulation(nodes)
      .force('link',      d3.forceLink(edges).id((d: any) => d.id).distance(110).strength(0.55))
      .force('charge',    d3.forceManyBody().strength(-320))
      .force('center',    d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(NODE_R + 28))
      .force('x',         d3.forceX(width  / 2).strength(0.07))
      .force('y',         d3.forceY(height / 2).strength(0.07));

    const link = g.append('g')
      .selectAll<SVGLineElement, any>('line')
      .data(edges).join('line')
      .attr('stroke', 'rgba(255,255,255,0.1)')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#kg-arrow)');

    const node = g.append('g')
      .selectAll<SVGGElement, any>('g')
      .data(nodes).join('g')
      .attr('cursor', 'pointer')
      .on('click', (_, d) => { setSelectedNode(d); onNodeClick(d); })
      .call(
        d3.drag<any, any>()
          .on('start', e => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            e.subject.fx = e.subject.x;
            e.subject.fy = e.subject.y;
          })
          .on('drag', e => {
            e.subject.fx = Math.max(PADDING, Math.min(width  - PADDING, e.x));
            e.subject.fy = Math.max(PADDING, Math.min(height - PADDING, e.y));
          })
          .on('end', e => {
            if (!e.active) sim.alphaTarget(0);
            e.subject.fx = null;
            e.subject.fy = null;
          })
      );

    const nodeColor = (cat: string) =>
      cat === 'Theory' ? '#00f5ff' : cat === 'Equation' ? '#f59e0b' : '#3b6fd4';

    // outer glow ring
    node.append('circle')
      .attr('r', NODE_R + 5)
      .attr('fill', 'none')
      .attr('stroke', (d: any) => {
        const c = nodeColor(d.category);
        return c + '28'; // ~16% opacity
      })
      .attr('stroke-width', 2);

    // main dot
    node.append('circle')
      .attr('r', NODE_R)
      .attr('fill', (d: any) => nodeColor(d.category))
      .attr('stroke', 'rgba(255,255,255,0.18)')
      .attr('stroke-width', 1.5);

    // label
    node.append('text')
      .attr('x', 13).attr('y', 4)
      .text((d: any) => d.label)
      .attr('fill', 'rgba(255,255,255,0.82)')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')
      .attr('user-select', 'none');

    sim.on('tick', () => {
      // clamp every node inside the visible area
      nodes.forEach((d: any) => {
        d.x = Math.max(PADDING, Math.min(width  - PADDING, d.x));
        d.y = Math.max(PADDING, Math.min(height - PADDING, d.y));
      });
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // store cleanup fn on the svg element so we can call it from the observer
    (svgRef.current as any).__simStop = () => sim.stop();
  }, [data, onNodeClick]);

  // ── ResizeObserver: fires AFTER the browser has actually laid out the div ─
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) draw(width, height);
      }
    });

    ro.observe(el);

    return () => {
      ro.disconnect();
      const stop = (svgRef.current as any)?.__simStop;
      if (stop) stop();
    };
  }, [draw]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const nodeColor = (cat?: string) =>
    cat === 'Theory' ? '#00f5ff' : cat === 'Equation' ? '#f59e0b' : '#3b6fd4';

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: 520,
               borderRadius: 16, overflow: 'hidden',
               border: '1px solid rgba(255,255,255,0.06)',
               background: 'rgba(5,6,15,0.55)',
               backdropFilter: 'blur(12px)' }}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid rgba(0,245,212,0.2)',
            borderTop: '3px solid #00f5d4',
            animation: 'spin 0.9s linear infinite',
          }} />
          <span style={{ color: '#00f5d4', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            Expanding Knowledge…
          </span>
        </div>
      )}

      {/* D3 canvas */}
      <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* Selected node card — compact bottom-left */}
      {selectedNode && (
        <div style={{
          position: 'absolute', bottom: 14, left: 14, width: 210, zIndex: 10,
          background: 'rgba(5,6,20,0.96)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 12,
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {/* accent bar */}
          <div style={{ height: 3, background: nodeColor(selectedNode.category) }} />

          <div style={{ padding: '10px 12px' }}>
            {/* title row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 6 }}>
              <span style={{ color: nodeColor(selectedNode.category), fontSize: 12, fontWeight: 700, lineHeight: 1.3, flex: 1 }}>
                {selectedNode.label}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)')}
              >✕</button>
            </div>

            {/* description */}
            <p style={{
              color: 'rgba(255,255,255,0.45)', fontSize: 10.5, lineHeight: 1.6,
              margin: '0 0 10px',
              display: '-webkit-box', WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {selectedNode.description}
            </p>

            {/* footer row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
                {selectedNode.category || 'Concept'}
              </span>
              <button
                onClick={() => onNodeClick(selectedNode)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                  color: nodeColor(selectedNode.category),
                  background: nodeColor(selectedNode.category) + '18',
                  border: `1px solid ${nodeColor(selectedNode.category)}30`,
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = nodeColor(selectedNode.category) + '30')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = nodeColor(selectedNode.category) + '18')}
              >
                Explore <span style={{ fontSize: 9 }}>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend — top right */}
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[
          { color: '#00f5ff', label: 'Theory' },
          { color: '#f59e0b', label: 'Equation' },
          { color: '#3b6fd4', label: 'Other' },
        ].map(({ color, label }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 8px', borderRadius: 100,
            background: 'rgba(5,6,20,0.7)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* spin keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};