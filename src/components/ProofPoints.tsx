
import React from 'react';

const STATS = [
  { value: "64%", label: "Enterprises Transitioning to Cloud Engineering" },
  { value: "40%", label: "Reduction in Prototype Cycle Times" },
  { value: "73.8%", label: "Fewer Engineering Change Orders (ECOs)" },
  { value: "1000x", label: "Faster Simulation via AI-Physics Fusion" }
];

export const ProofPoints: React.FC = () => {
  return (
    <section className="py-24 px-6 bg-charcoal border-y border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-xs font-mono text-electricTeal uppercase tracking-[0.5em] mb-4">By The Numbers</h2>
          <h3 className="text-4xl font-bold tracking-tight">Data-Backed Credibility</h3>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <div key={i} className="text-center p-8 border-r last:border-none border-white/5">
              <div className="text-5xl font-bold text-white mb-2 tracking-tighter">
                {s.value}
              </div>
              <p className="text-white/40 text-xs uppercase tracking-widest leading-loose">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
