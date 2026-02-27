
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-charcoal pt-24 pb-12 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between mb-20">
          <div className="max-w-sm mb-12 md:mb-0">
             <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-brandTeal rounded flex items-center justify-center">
                <span className="text-charcoal font-bold text-sm">EL</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                EFFECTUAL<span className="text-brandTeal/60 text-xs ml-0.5">L</span>
              </span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">
              Conceptualizing the next generation of STEM learning through high-fidelity interactive engines and personal knowledge graphs.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-6">Resources</h4>
              <ul className="space-y-4 text-white/40 text-sm">
                <li><a href="#" className="hover:text-brandTeal transition-colors">Knowledge Base</a></li>
                <li><a href="#" className="hover:text-brandTeal transition-colors">Learning Paths</a></li>
                <li><a href="#" className="hover:text-brandTeal transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-6">Platform</h4>
              <ul className="space-y-4 text-white/40 text-sm">
                <li><a href="#" className="hover:text-brandTeal transition-colors">Virtual Lab</a></li>
                <li><a href="#" className="hover:text-brandTeal transition-colors">AI Search</a></li>
                <li><a href="#" className="hover:text-brandTeal transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-6">Legal</h4>
              <ul className="space-y-4 text-white/40 text-sm">
                <li><a href="#" className="hover:text-brandTeal transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-brandTeal transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-brandTeal transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">
          <div>© 2025 Effectual. All rights reserved.</div>
          <div className="flex space-x-8">
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">X / Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
