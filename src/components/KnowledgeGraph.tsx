import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphEdge } from '../services/geminiService';

interface KnowledgeGraphProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
  isLoading?: boolean;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data, onNodeClick, isLoading }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    const container = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    const simulation = d3.forceSimulation<any>(data.nodes)
      .force("link", d3.forceLink<any, any>(data.edges).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    // Arrow markers
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("xoverflow", "visible")
      .append("svg:path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "rgba(255, 255, 255, 0.2)")
      .style("stroke", "none");

    const link = container.append("g")
      .attr("stroke", "rgba(255, 255, 255, 0.1)")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.edges)
      .join("line")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)");

    const node = container.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedNode(d);
        onNodeClick(d);
      })
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("circle")
      .attr("r", 8)
      .attr("fill", (d: any) => d.category === 'Theory' ? '#00f5ff' : d.category === 'Equation' ? '#f59e0b' : '#1e3a8a')
      .attr("stroke", "rgba(255, 255, 255, 0.2)")
      .attr("stroke-width", 2)
      .attr("class", "transition-all duration-300 hover:r-12");

    node.append("text")
      .attr("x", 12)
      .attr("y", 4)
      .text((d: any) => d.label)
      .attr("fill", "white")
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("class", "pointer-events-none select-none drop-shadow-md");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data, onNodeClick]);

  return (
    <div className="relative w-full h-[600px] bg-slate900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-brandTeal border-t-transparent rounded-full animate-spin"></div>
            <span className="text-brandTeal font-bold text-sm uppercase tracking-widest">Expanding Knowledge...</span>
          </div>
        </div>
      )}
      
      <svg ref={svgRef} className="w-full h-full" />

      {selectedNode && (
        <div className="absolute bottom-6 left-6 right-6 md:right-auto md:w-80 p-6 bg-slate900/90 border border-white/10 rounded-xl backdrop-blur-md z-10 animate-in fade-in slide-in-from-bottom-4">
          <button 
            onClick={() => setSelectedNode(null)}
            className="absolute top-4 right-4 text-white/40 hover:text-white"
          >
            ✕
          </button>
          <h4 className="text-brandTeal font-bold text-lg mb-2">{selectedNode.label}</h4>
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            {selectedNode.description}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
              {selectedNode.category || 'Concept'}
            </span>
            <button 
              onClick={() => onNodeClick(selectedNode)}
              className="text-xs font-bold text-brandTeal hover:underline"
            >
              Explore Further →
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-6 right-6 flex flex-col space-y-2">
        <div className="flex items-center space-x-2 bg-slate900/60 px-3 py-1.5 rounded-full border border-white/5">
          <div className="w-2 h-2 bg-brandTeal rounded-full"></div>
          <span className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Theory</span>
        </div>
        <div className="flex items-center space-x-2 bg-slate900/60 px-3 py-1.5 rounded-full border border-white/5">
          <div className="w-2 h-2 bg-brandYellow rounded-full"></div>
          <span className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Equation</span>
        </div>
        <div className="flex items-center space-x-2 bg-slate900/60 px-3 py-1.5 rounded-full border border-white/5">
          <div className="w-2 h-2 bg-brandBlue rounded-full"></div>
          <span className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Other</span>
        </div>
      </div>
    </div>
  );
};
