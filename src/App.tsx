import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { AboutUs } from './components/AboutUs';
import ResourcePlaybook from './components/ResourcePlaybook'
import { Footer } from './components/Footer';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'about' | 'resources'>('home');

  if (currentView === 'about') {
    return <AboutUs />;
  }

  if (currentView === 'resources') {
    return <ResourcePlaybook />;
  }

  return (
    <div className="min-h-screen bg-charcoal text-white selection:bg-brandTeal/30">
      <Navbar />
      <Hero />

      <section className="py-24 px-6 bg-slate900/50 text-center border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">Ready to start your journey?</h2>
          <p className="text-white/50 text-lg mb-10">
            Join thousands of learners and educators who are redefining STEM discovery with Effectual.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button className="px-12 py-5 bg-brandBlue/80 hover:bg-brandBlue text-white font-extrabold rounded-lg shadow-xl transition-all transform hover:scale-105 uppercase tracking-[0.2em] text-sm">
              Get Started Today
            </button>
            <button 
              onClick={() => setCurrentView('about')}
              className="px-12 py-5 bg-brandTeal/20 hover:bg-brandTeal/30 border border-brandTeal/40 text-white font-extrabold rounded-lg shadow-xl transition-all transform hover:scale-105 uppercase tracking-[0.2em] text-sm"
            >
              About Us
            </button>
            <button 
              onClick={() => setCurrentView('resources')}
              className="px-12 py-5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-white font-extrabold rounded-lg shadow-xl transition-all transform hover:scale-105 uppercase tracking-[0.2em] text-sm"
            >
              Resources
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default App;