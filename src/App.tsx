import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { AboutUs } from './components/AboutUs';
import ResourcePlaybook from './components/ResourcePlaybook';
import Partners from './components/Partners';
import { Footer } from './components/Footer';
import EffectualDashboard from './components/EffectualDashboard'; // Import the dashboard

type View = 'home' | 'about' | 'resources' | 'partners' | 'dashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Skeuomorphic ghost button
// ─────────────────────────────────────────────────────────────────────────────
interface GhostBtnProps {
  accent: string;
  shadowColor: string;
  bottomColor: string;
  onClick?: () => void;
  children: React.ReactNode;
}

const GhostBtn: React.FC<GhostBtnProps> = ({ accent, shadowColor, bottomColor, onClick, children }) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        padding: '16px 40px',
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'white',
        background: hovered
          ? `linear-gradient(180deg,${accent}22 0%,${accent}0a 100%)`
          : `linear-gradient(180deg,${accent}14 0%,${accent}06 100%)`,
        border: `1px solid ${hovered ? `${accent}55` : `${accent}30`}`,
        cursor: 'pointer',
        transform: pressed ? 'translateY(2px)' : hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.15s',
        boxShadow: pressed
          ? `0 1px 0 ${accent}15 inset,0 -1px 0 rgba(0,0,0,0.2) inset,0 1px 0 ${bottomColor}`
          : hovered
          ? `0 1px 0 ${accent}18 inset,0 -1px 0 rgba(0,0,0,0.25) inset,0 4px 0 ${bottomColor},0 10px 24px ${shadowColor}`
          : `0 1px 0 ${accent}15 inset,0 -1px 0 rgba(0,0,0,0.25) inset,0 4px 0 ${bottomColor},0 6px 18px ${shadowColor}`,
      }}
    >
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>('landing');

  // Apply dark mode class to <html>
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  const navigateToDashboard = () => {
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToLanding = () => {
    setCurrentView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (view: View) => {
    // If dashboard is clicked, navigate to dashboard view
    if (view === 'dashboard') {
      navigateToDashboard();
      return;
    }

    // Otherwise, ensure we're on landing page first
    if (currentView === 'dashboard') {
      navigateToLanding();
      // Wait for navigation to complete before scrolling
      setTimeout(() => {
        const sectionId = view === 'home' ? 'hero' : view;
        const element = document.getElementById(sectionId);
        if (element) {
          const offsetPosition = element.getBoundingClientRect().top + window.pageYOffset - 80;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }, 100);
    } else {
      // Already on landing, just scroll
      const sectionId = view === 'home' ? 'hero' : view;
      const element = document.getElementById(sectionId);
      if (element) {
        const offsetPosition = element.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: currentView === 'dashboard' ? '#05060f' : 'transparent' }}
    >
      <Navbar
        onNavigate={scrollToSection}
        isDark={isDark}
        toggleTheme={toggleTheme}
        onLogoClick={navigateToLanding}
      />

      {currentView === 'landing' ? (
        <>
          {/* Hero — Three.js particle canvas renders as fixed backdrop */}
          <div id="hero">
            <Hero />
          </div>

          {/* About */}
          <div id="about">
            <AboutUs />
          </div>

          {/* Resources */}
          <div id="resources">
            <ResourcePlaybook />
          </div>

          {/* Partners */}
          <div id="partners">
            <Partners />
          </div>

          {/* CTA / Waitlist */}
          <section
            id="pricing"
            className="py-28 px-6 text-center"
            style={{
              background: 'rgba(8,10,22,0.97)',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="max-w-3xl mx-auto">

              {/* Eyebrow badge */}
              <div
                className="inline-flex items-center gap-2 mb-6 rounded-full"
                style={{
                  padding: '6px 16px',
                  background: 'rgba(0,245,212,0.07)',
                  border: '1px solid rgba(0,245,212,0.2)',
                }}
              >
                <span
                  className="animate-pulse rounded-full"
                  style={{ display: 'inline-block', width: 6, height: 6, background: '#00f5d4' }}
                />
                <span style={{ color: '#00f5d4', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                  Early Access
                </span>
              </div>

              <h2
                className="font-black text-white mb-5 leading-tight"
                style={{ fontSize: 'clamp(32px,5vw,52px)', letterSpacing: '-1px' }}
              >
                Ready to start your journey?
              </h2>

              <p
                className="mb-12 mx-auto leading-relaxed"
                style={{ maxWidth: 480, color: 'rgba(255,255,255,0.45)', fontSize: 17 }}
              >
                Join thousands of learners and educators who are redefining STEM
                discovery with EffectuaL.
              </p>

              {/* Waitlist input */}
              <div
                className="flex mx-auto mb-10 rounded-xl overflow-hidden"
                style={{
                  maxWidth: 460,
                  background: 'rgba(13,16,36,0.92)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset,0 -1px 0 rgba(0,0,0,0.3) inset,0 20px 60px rgba(0,0,0,0.4)',
                }}
              >
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                  style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.75)', minWidth: 0 }}
                />
                <button
                  style={{
                    flexShrink: 0,
                    padding: '14px 24px',
                    fontSize: 11, fontWeight: 900,
                    letterSpacing: '0.15em', textTransform: 'uppercase',
                    color: '#05060f',
                    background: 'linear-gradient(180deg,#00ffd9 0%,#00b89e 100%)',
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 1px 0 rgba(255,255,255,0.35) inset,0 -2px 0 rgba(0,0,0,0.3) inset',
                  }}
                >
                  Join Waitlist
                </button>
              </div>

            </div>
          </section>

          <Footer />
        </>
      ) : (
        /* Dashboard View */
        <div style={{ paddingTop: 68 }}>
          <EffectualDashboard onHome={navigateToLanding} />
        </div>
      )}
    </div>
  );
};

export default App;