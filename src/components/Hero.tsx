
import React, { useState, useEffect } from 'react';
import { geminiService, GraphData, GraphNode } from '../services/geminiService';
import { KnowledgeGraph } from './KnowledgeGraph';

export const Hero: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  // Load graph from localStorage on mount
  useEffect(() => {
    const savedGraph = localStorage.getItem('effectual_knowledge_graph');
    if (savedGraph) {
      try {
        setGraphData(JSON.parse(savedGraph));
      } catch (e) {
        console.error("Failed to parse saved graph", e);
      }
    }
  }, []);

  // Save graph to localStorage whenever it changes
  useEffect(() => {
    if (graphData) {
      localStorage.setItem('effectual_knowledge_graph', JSON.stringify(graphData));
    }
  }, [graphData]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const data = await geminiService.generateKnowledgeGraph(searchQuery);
      setGraphData(data);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNodeClick = async (node: GraphNode) => {
    if (!graphData) return;

    setIsExpanding(true);
    try {
      const existingNodeIds = graphData.nodes.map(n => n.id);
      const newData = await geminiService.generateKnowledgeGraph(node.label, existingNodeIds);

      // Merge new nodes and edges, avoiding duplicates
      const mergedNodes = [...graphData.nodes];
      newData.nodes.forEach(newNode => {
        if (!mergedNodes.find(n => n.id === newNode.id)) {
          mergedNodes.push(newNode);
        }
      });

      const mergedEdges = [...graphData.edges];
      newData.edges.forEach(newEdge => {
        if (!mergedEdges.find(e => e.source === newEdge.source && e.target === newEdge.target)) {
          mergedEdges.push(newEdge);
        }
      });

      setGraphData({ nodes: mergedNodes, edges: mergedEdges });
    } catch (error) {
      console.error("Expansion failed", error);
    } finally {
      setIsExpanding(false);
    }
  };

  const clearGraph = () => {
    setGraphData(null);
    localStorage.removeItem('effectual_knowledge_graph');
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-6 overflow-hidden bg-charcoal">
      {/* Background Grid */}
      <div className="absolute inset-0 grid-bg opacity-20"></div>

      {/* Radial Gradient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brandTeal/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl w-full text-center">
        {!graphData ? (
          <>
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 mb-8 px-4 py-1.5 bg-brandTeal/10 border border-brandTeal/20 rounded-full">
              <div className="w-2 h-2 bg-brandTeal rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-brandTeal uppercase tracking-[0.2em]">Next-Gen Learning</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-6xl md:text-8xl font-bold mb-8 tracking-tight text-white">
              Learn & Explore <br />
              <span className="bg-gradient-to-r from-brandTeal to-brandYellow bg-clip-text text-transparent">STEM Visually</span>
            </h1>

            {/* Subtext */}
            <p className="text-lg md:text-xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed">
              Conceptualize complex concepts & build your personal knowledge graph with our high-fidelity interactive engine.
            </p>
          </>
        ) : (
          <div className="mb-8 flex items-center justify-between">
            <div className="text-left">
              <h2 className="text-2xl font-bold text-white">Knowledge Explorer</h2>
              <p className="text-white/40 text-sm">Click nodes to expand your understanding</p>
            </div>
            <button
              onClick={clearGraph}
              className="px-4 py-2 text-xs font-bold text-white/40 hover:text-white border border-white/10 rounded-lg transition-colors"
            >
              Reset Graph
            </button>
          </div>
        )}

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-12">
          <div className="absolute inset-0 bg-brandTeal/10 blur-xl rounded-xl"></div>
          <div className="relative flex items-center bg-slate900/80 border border-white/10 rounded-xl p-2 backdrop-blur-sm">
            <div className="flex items-center px-4 space-x-3 flex-1">
              <span className="text-brandTeal text-xl">✨</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Connect with Abstract. Ask anything (e.g. Quantum Mechanics)"
                className="bg-transparent border-none outline-none text-white/80 placeholder:text-white/30 w-full text-sm"
                disabled={isSearching}
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-3 bg-brandBlue/80 hover:bg-brandBlue disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all text-sm flex items-center space-x-2"
            >
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Search AI</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Graph Display */}
        {graphData ? (
          <div className="mb-20">
            <KnowledgeGraph
              data={graphData}
              onNodeClick={handleNodeClick}
              isLoading={isExpanding}
            />
          </div>
        ) : (
          <>
            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
              {/* Knowledge Graph */}
              <div className="group relative bg-slate900/40 border border-white/5 rounded-xl p-10 transition-all hover:bg-slate900/60 overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-brandTeal transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                <div className="w-12 h-12 bg-brandTeal/20 rounded-full flex items-center justify-center mx-auto mb-6 text-brandTeal text-2xl group-hover:scale-110 transition-transform">
                  🕸️
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Knowledge Graph</h3>
              </div>

              {/* Visual Learning */}
              <div className="group relative bg-slate900/40 border border-white/5 rounded-xl p-10 transition-all hover:bg-slate900/60 overflow-hidden border-b-brandTeal/50 border-b-2">
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-brandTeal/60"></div>
                <div className="w-12 h-12 bg-brandTeal/20 rounded-full flex items-center justify-center mx-auto mb-6 text-brandTeal text-2xl group-hover:scale-110 transition-transform">
                  👁️
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Visual Learning</h3>
              </div>

              {/* Virtual Lab */}
              <div className="group relative bg-slate900/40 border border-white/5 rounded-xl p-10 transition-all hover:bg-slate900/60 overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-brandYellow transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                <div className="w-12 h-12 bg-brandYellow/20 rounded-full flex items-center justify-center mx-auto mb-6 text-brandYellow text-2xl group-hover:scale-110 transition-transform">
                  🧪
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Virtual Lab</h3>
              </div>
            </div>
          </>
        )}

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-white/5">
          <div className="text-left">
            <div className="text-4xl font-bold text-white mb-1">5,000+</div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Interactive Models</div>
          </div>
          <div className="text-left">
            <div className="text-4xl font-bold text-white mb-1">1.2M</div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Data Nodes</div>
          </div>
          <div className="text-left">
            <div className="text-4xl font-bold text-white mb-1">50k+</div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Active Learners</div>
          </div>
          <div className="text-left">
            <div className="text-4xl font-bold text-white mb-1">98%</div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Success Rate</div>
          </div>
        </div>
      </div>
    </section>
  );
};
