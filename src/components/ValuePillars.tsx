
import React from 'react';

const PILLARS = [
  {
    title: "Remove Hardware Barriers",
    icon: "🏗️",
    description: "Instant access to unlimited HPC capacity from any device. Eliminate capital investments in local server farms and workstations."
  },
  {
    title: "AI-Physics Fusion",
    icon: "🧠",
    description: "Surrogate AI models run simulations 1,000x faster than traditional solvers while maintaining 99% engineering accuracy."
  },
  {
    title: "Collaborative Digital Twins",
    icon: "🌐",
    description: "Real-time model sharing and 360° holistic system simulation across global teams. Connect stakeholders seamlessly."
  }
];

export const ValuePillars: React.FC = () => {
  return (
    <section className="py-24 px-6 border-t border-white/5 bg-charcoal">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 tracking-tight uppercase">The Three Key Enablers</h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Orchestrate breakthroughs using the industry's most advanced cloud-native simulation engine.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {PILLARS.map((p, idx) => (
            <div key={idx} className="p-8 bg-slate850 border border-white/5 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 text-9xl opacity-5 grayscale group-hover:grayscale-0 group-hover:opacity-10 transition-all">
                {p.icon}
              </div>
              <div className="text-4xl mb-6">{p.icon}</div>
              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-electricTeal transition-colors">{p.title}</h3>
              <p className="text-white/60 leading-relaxed text-sm">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
