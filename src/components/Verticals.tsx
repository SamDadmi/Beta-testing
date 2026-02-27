
import React from 'react';

const VERTICALS = [
  { name: 'Aerospace', focus: 'Aero-drag optimization', img: 'https://picsum.photos/seed/aero-v/600/400' },
  { name: 'Automotive', focus: 'Electrification & Safety', img: 'https://picsum.photos/seed/auto-v/600/400' },
  { name: 'Energy', focus: 'Grid & Turbine optimization', img: 'https://picsum.photos/seed/energy-v/600/400' },
  { name: 'Life Sciences', focus: 'Virtual Medical Testing', img: 'https://picsum.photos/seed/life-v/600/400' },
];

export const Verticals: React.FC = () => {
  return (
    <section id="verticals" className="py-24 px-6 bg-slate900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">Targeted Industry Verticals</h2>
          <p className="text-white/60 text-lg">Specialized modules engineered for specific mission-critical domains.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {VERTICALS.map((v, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl group">
              <img src={v.img} alt={v.name} className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6">
                <h3 className="text-2xl font-bold text-white mb-1 uppercase tracking-tight">{v.name}</h3>
                <p className="text-electricTeal font-mono text-[10px] uppercase tracking-widest">{v.focus}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
