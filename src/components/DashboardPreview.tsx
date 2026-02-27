
import React, { useState } from 'react';
import { SimulationStatus, Module } from '../types';

const INITIAL_SIMULATIONS: SimulationStatus[] = [
  { id: '1', name: 'Aerofoil Lift Coefficient Test', status: 'Running', progress: 68, cpuUsage: 94, memoryUsage: '12.4 GB' },
  { id: '2', name: 'PCB Thermal Distribution', status: 'Completed', progress: 100, cpuUsage: 0, memoryUsage: '4.2 GB' },
  { id: '3', name: 'Electromagnetic Interference Fix', status: 'Initiating', progress: 12, cpuUsage: 14, memoryUsage: '2.1 GB' },
];

const MODULES: Module[] = [
  { id: 'm1', title: 'Wind Turbine Dynamics', category: 'Physics', description: 'Optimize lift-to-drag ratios for vertical axis designs.', thumbnail: 'https://picsum.photos/seed/turbine/400/225', difficulty: 'Intermediate' },
  { id: 'm2', title: 'Aero-Drag Optimization', category: 'Fluid Dynamics', description: 'Simulate vehicle aerodynamics at ultrasonic speeds.', thumbnail: 'https://picsum.photos/seed/aero/400/225', difficulty: 'Advanced' },
  { id: 'm3', title: 'HVAC Airflow', category: 'Thermodynamics', description: 'Analyze energy efficiency in multi-story structures.', thumbnail: 'https://picsum.photos/seed/hvac/400/225', difficulty: 'Basic' },
];

export const DashboardPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'library' | 'orchestration'>('orchestration');

  return (
    <section id="orchestration" className="py-24 px-6 bg-slate900">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h2 className="text-4xl font-bold mb-4 tracking-tight">The Digital Laboratory</h2>
            <p className="text-white/60 text-lg max-w-2xl">
              Monitor, manage, and scale your HPC workloads from a unified control plane.
            </p>
          </div>
          
          <div className="flex bg-slate850 p-1 rounded-lg mt-8 md:mt-0 border border-white/5">
            <button 
              onClick={() => setActiveTab('orchestration')}
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all uppercase tracking-wider ${activeTab === 'orchestration' ? 'bg-electricTeal text-charcoal' : 'text-white/60 hover:text-white'}`}
            >
              Cloud Orchestration
            </button>
            <button 
              onClick={() => setActiveTab('library')}
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all uppercase tracking-wider ${activeTab === 'library' ? 'bg-electricTeal text-charcoal' : 'text-white/60 hover:text-white'}`}
            >
              Agora Library
            </button>
          </div>
        </div>

        {activeTab === 'orchestration' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {INITIAL_SIMULATIONS.map(sim => (
                <div key={sim.id} className="bg-slate850 border border-white/10 rounded-xl p-6 hover:border-electricTeal/30 transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${sim.status === 'Completed' ? 'bg-green-500' : sim.status === 'Running' ? 'bg-electricTeal animate-pulse' : 'bg-yellow-500'}`}></div>
                      <h3 className="font-mono text-lg font-bold uppercase tracking-tight">{sim.name}</h3>
                    </div>
                    <span className="text-xs font-mono text-white/40">ID: {sim.id.padStart(6, '0')}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
                    <div>
                      <div className="text-[10px] text-white/40 uppercase mb-1">Status</div>
                      <div className="text-sm font-bold text-white/80 uppercase">{sim.status}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/40 uppercase mb-1">Progress</div>
                      <div className="text-sm font-bold text-white/80">{sim.progress}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/40 uppercase mb-1">CPU Usage</div>
                      <div className="text-sm font-bold text-white/80">{sim.cpuUsage}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/40 uppercase mb-1">VM Memory</div>
                      <div className="text-sm font-bold text-white/80">{sim.memoryUsage}</div>
                    </div>
                  </div>
                  
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-electricTeal transition-all duration-1000" style={{ width: `${sim.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-charcoal border border-white/10 rounded-xl p-8">
               <h4 className="font-mono text-electricTeal text-xs uppercase tracking-[0.2em] mb-6">Cluster Performance</h4>
               <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Active Nodes</span>
                    <span className="text-xl font-bold font-mono">12 / 64</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Compute Credits</span>
                    <span className="text-xl font-bold font-mono">8,442.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Data Throughput</span>
                    <span className="text-xl font-bold font-mono">1.2 GB/s</span>
                  </div>
                  <div className="pt-6 border-t border-white/5">
                    <button className="w-full py-4 border border-electricTeal text-electricTeal font-bold uppercase tracking-widest text-xs rounded hover:bg-electricTeal hover:text-charcoal transition-all">
                      Scale Infrastructure
                    </button>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {MODULES.map(mod => (
              <div key={mod.id} className="bg-slate850 border border-white/10 rounded-xl overflow-hidden hover:border-electricTeal transition-all group cursor-pointer">
                <div className="relative h-48 overflow-hidden">
                  <img src={mod.thumbnail} alt={mod.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-105 group-hover:scale-100" />
                  <div className="absolute top-4 left-4">
                    <span className="px-2 py-1 bg-charcoal/80 text-[10px] font-bold text-electricTeal uppercase tracking-widest rounded border border-electricTeal/20">
                      {mod.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold">{mod.title}</h3>
                    <span className="text-[10px] text-white/40 uppercase">{mod.difficulty}</span>
                  </div>
                  <p className="text-sm text-white/60 line-clamp-2">{mod.description}</p>
                  <button className="mt-6 flex items-center text-xs font-bold uppercase tracking-widest text-electricTeal group-hover:translate-x-2 transition-transform">
                    Initialize Module ➔
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
