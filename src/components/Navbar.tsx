
import React from 'react';

export const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-charcoal/40 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-brandTeal rounded flex items-center justify-center">
            <span className="text-charcoal font-bold text-lg">EL</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white flex items-center">
            EFFECTUAL<span className="text-brandTeal/60 text-sm ml-0.5">L</span>
          </span>
        </div>
        
        <div className="hidden lg:flex items-center space-x-10 text-sm font-medium text-white/60">
          <a href="#" className="hover:text-white transition-colors">Partners</a>
          <a href="#" className="hover:text-white transition-colors">Knowledge Graph</a>
          <a href="#" className="hover:text-white transition-colors">Virtual Lab</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
        </div>

        <div className="flex items-center space-x-6">
          <button className="text-sm font-semibold text-white hover:text-brandTeal transition-colors">
            Sign In
          </button>
          <button className="px-6 py-2.5 bg-brandBlue/80 hover:bg-brandBlue text-white font-bold rounded-md transition-all text-sm">
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
};
