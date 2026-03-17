import React, { useState, useEffect, useRef } from 'react';

type View = 'home' | 'about' | 'resources' | 'partners' | 'dashboard';

interface NavbarProps {
  onNavigate: (view: View) => void;
  isDark?: boolean;
  toggleTheme?: () => void;
  onLogoClick?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Global keyframes (injected once)
// ─────────────────────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes navGlowPulse {
    0%, 100% { box-shadow: 0 0 8px rgba(0,245,212,0.4), 0 0 20px rgba(0,245,212,0.1); }
    50%       { box-shadow: 0 0 16px rgba(0,245,212,0.7), 0 0 40px rgba(0,245,212,0.25); }
  }
  @keyframes scanline {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
  @keyframes cornerPulse {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1; }
  }
  @keyframes rippleOut {
    0%   { transform: scale(0); opacity: 0.6; }
    100% { transform: scale(3); opacity: 0; }
  }
  @keyframes logoGlow {
    0%, 100% { filter: drop-shadow(0 0 6px rgba(0,245,212,0.5)); }
    50%       { filter: drop-shadow(0 0 14px rgba(0,245,212,0.9)); }
  }
  @keyframes navLinkUnderline {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  @keyframes ctaBorderFlow {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// NavLink — futuristic underline + glow on hover
// ─────────────────────────────────────────────────────────────────────────────
const NavLink: React.FC<{
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  accent?: string;
}> = ({ href, onClick, children, accent = '#00f5d4' }) => {
  const [hov, setHov] = useState(false);
  const [ripple, setRipple] = useState(false);

  const handleClick = () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
    onClick?.();
  };

  const base: React.CSSProperties = {
    position: 'relative',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.04em',
    color: hov ? '#fff' : 'rgba(255,255,255,0.5)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 2px',
    font: 'inherit',
    textDecoration: 'none',
    transition: 'color 0.2s',
    overflow: 'visible',
  };

  const inner = (
    <>
      {children}

      {/* Animated underline */}
      <span style={{
        position: 'absolute',
        bottom: -1, left: 0, right: 0,
        height: 1,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        transformOrigin: 'center',
        transform: hov ? 'scaleX(1)' : 'scaleX(0)',
        transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: hov ? `0 0 8px ${accent}` : 'none',
      }} />

      {/* Glow halo on hover */}
      {hov && (
        <span style={{
          position: 'absolute',
          inset: '-6px -8px',
          borderRadius: 6,
          background: `radial-gradient(ellipse at center, ${accent}0d 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Click ripple */}
      {ripple && (
        <span style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: 20, height: 20,
          marginTop: -10, marginLeft: -10,
          borderRadius: '50%',
          background: accent,
          opacity: 0,
          animation: 'rippleOut 0.55s ease-out forwards',
          pointerEvents: 'none',
        }} />
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} style={base}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onClick={handleClick}
      >{inner}</a>
    );
  }

  return (
    <button style={base}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={handleClick}
    >{inner}</button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LogIn button — ghost futuristic, scanline sweep on hover
// ─────────────────────────────────────────────────────────────────────────────
const LoginBtn: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const [hov,   setHov]   = useState(false);
  const [press, setPress] = useState(false);
  const [ripple, setRipple] = useState(false);

  const handleClick = () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        position: 'relative',
        padding: '8px 18px',
        borderRadius: 7,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: hov ? '#00f5d4' : 'rgba(255,255,255,0.55)',
        background: hov
          ? 'rgba(0,245,212,0.06)'
          : 'transparent',
        border: `1px solid ${hov ? 'rgba(0,245,212,0.4)' : 'rgba(255,255,255,0.12)'}`,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all 0.2s',
        transform: press ? 'translateY(1px)' : 'translateY(0)',
        boxShadow: hov
          ? '0 0 12px rgba(0,245,212,0.15), 0 1px 0 rgba(255,255,255,0.06) inset'
          : '0 1px 0 rgba(255,255,255,0.04) inset',
      }}
    >
      {/* Scanline sweep */}
      {hov && (
        <span style={{
          position: 'absolute',
          top: 0, bottom: 0,
          width: '30%',
          background: 'linear-gradient(90deg, transparent, rgba(0,245,212,0.18), transparent)',
          animation: 'scanline 0.7s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Corner accents */}
      {hov && <>
        <span style={{ position:'absolute', top:2, left:2, width:5, height:5, borderTop:'1px solid #00f5d4', borderLeft:'1px solid #00f5d4', animation:'cornerPulse 1.5s ease-in-out infinite' }} />
        <span style={{ position:'absolute', top:2, right:2, width:5, height:5, borderTop:'1px solid #00f5d4', borderRight:'1px solid #00f5d4', animation:'cornerPulse 1.5s ease-in-out infinite 0.75s' }} />
        <span style={{ position:'absolute', bottom:2, left:2, width:5, height:5, borderBottom:'1px solid #00f5d4', borderLeft:'1px solid #00f5d4', animation:'cornerPulse 1.5s ease-in-out infinite 0.375s' }} />
        <span style={{ position:'absolute', bottom:2, right:2, width:5, height:5, borderBottom:'1px solid #00f5d4', borderRight:'1px solid #00f5d4', animation:'cornerPulse 1.5s ease-in-out infinite 1.125s' }} />
      </>}

      {/* Click ripple */}
      {ripple && (
        <span style={{
          position:'absolute', top:'50%', left:'50%',
          width:16, height:16, marginTop:-8, marginLeft:-8,
          borderRadius:'50%', background:'#00f5d4',
          animation:'rippleOut 0.55s ease-out forwards',
          pointerEvents:'none',
        }} />
      )}

      <span style={{ position: 'relative', zIndex: 1 }}>Log In</span>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GetStarted button — full skeuomorphic 3D + animated border flow + scanline
// ─────────────────────────────────────────────────────────────────────────────
const GetStartedBtn: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const [hov,    setHov]    = useState(false);
  const [press,  setPress]  = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setTimeout(() => setRipple(null), 700);
    }
    onClick?.();
  };

  const depth  = press ? '0px' : hov ? '5px' : '4px';
  const depthColor = '#007a6b';

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        position: 'relative',
        padding: '9px 22px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: press ? 'rgba(5,6,15,0.85)' : '#05060f',
        border: 'none',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'transform 0.1s, box-shadow 0.12s',
        transform: press
          ? `translateY(${depth})`
          : hov
          ? 'translateY(-2px)'
          : 'translateY(0)',
        background: press
          ? 'linear-gradient(180deg,#00c4ad 0%,#009e8a 100%)'
          : hov
          ? 'linear-gradient(180deg,#00ffe5 0%,#00d4b8 100%)'
          : 'linear-gradient(180deg,#00ffd9 0%,#00b8a0 100%)',
        boxShadow: press
          ? `0 1px 0 rgba(255,255,255,0.25) inset,
             0 -1px 0 rgba(0,0,0,0.25) inset,
             0 0px 0 ${depthColor},
             0 2px 8px rgba(0,245,212,0.2)`
          : hov
          ? `0 1px 0 rgba(255,255,255,0.5) inset,
             0 -2px 0 rgba(0,0,0,0.3) inset,
             0 ${depth} 0 ${depthColor},
             0 10px 30px rgba(0,245,212,0.55),
             0 2px 6px rgba(0,0,0,0.4)`
          : `0 1px 0 rgba(255,255,255,0.45) inset,
             0 -2px 0 rgba(0,0,0,0.3) inset,
             0 ${depth} 0 ${depthColor},
             0 6px 18px rgba(0,245,212,0.38),
             0 2px 4px rgba(0,0,0,0.35)`,
      }}
    >
      {/* Scanline sweep on hover */}
      {hov && !press && (
        <span style={{
          position: 'absolute',
          top: 0, bottom: 0, width: '40%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
          animation: 'scanline 0.9s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Top shine */}
      <span style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '45%',
        background: 'linear-gradient(180deg,rgba(255,255,255,0.22) 0%,transparent 100%)',
        borderRadius: '8px 8px 0 0',
        pointerEvents: 'none',
      }} />

      {/* Corner accents — futuristic HUD feel */}
      <span style={{ position:'absolute', top:1, left:1, width:4, height:4, borderTop:'1px solid rgba(255,255,255,0.6)', borderLeft:'1px solid rgba(255,255,255,0.6)', borderRadius:'2px 0 0 0' }} />
      <span style={{ position:'absolute', top:1, right:1, width:4, height:4, borderTop:'1px solid rgba(255,255,255,0.6)', borderRight:'1px solid rgba(255,255,255,0.6)', borderRadius:'0 2px 0 0' }} />
      <span style={{ position:'absolute', bottom: press ? 1 : 5, left:1, width:4, height:4, borderBottom:'1px solid rgba(0,0,0,0.3)', borderLeft:'1px solid rgba(0,0,0,0.3)' }} />
      <span style={{ position:'absolute', bottom: press ? 1 : 5, right:1, width:4, height:4, borderBottom:'1px solid rgba(0,0,0,0.3)', borderRight:'1px solid rgba(0,0,0,0.3)' }} />

      {/* Click ripple (mouse-position aware) */}
      {ripple && (
        <span style={{
          position: 'absolute',
          left: ripple.x, top: ripple.y,
          width: 10, height: 10,
          marginLeft: -5, marginTop: -5,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.7)',
          animation: 'rippleOut 0.65s ease-out forwards',
          pointerEvents: 'none',
        }} />
      )}

      {/* Animated glow pulse ring on hover */}
      {hov && (
        <span style={{
          position: 'absolute',
          inset: -3, borderRadius: 11,
          border: '1px solid rgba(0,245,212,0.5)',
          animation: 'navGlowPulse 1.8s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      <span style={{ position: 'relative', zIndex: 1 }}>Get Started</span>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────────────────────────────────────
export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  isDark: _isDark,
  toggleTheme: _toggleTheme,
  onLogoClick,
}) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <style>{KEYFRAMES}</style>

      <nav style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 50,
        height: 68,
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        background: scrolled ? 'rgba(5,6,15,0.92)' : 'rgba(5,6,15,0.35)',
        backdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${scrolled ? 'rgba(0,245,212,0.1)' : 'rgba(255,255,255,0.05)'}`,
        boxShadow: scrolled
          ? '0 4px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(0,245,212,0.06) inset'
          : 'none',
        transition: 'background 0.35s, box-shadow 0.35s, border-color 0.35s',
      }}>

        {/* Scrolled: subtle teal top-border accent */}
        {scrolled && (
          <span style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(0,245,212,0.5), transparent)',
            pointerEvents: 'none',
          }} />
        )}

        <div style={{
          maxWidth: 1280, width: '100%', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>

          {/* ── Logo ── */}
          <button
            onClick={() => { onLogoClick?.(); onNavigate('home'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <img
              src="/logo.png"
              alt="EffectuaL"
              style={{ height: 60, width: 'auto', objectFit: 'contain' }}
            />
          </button>

          {/* ── Nav links ── */}
          <div className="hidden lg:flex" style={{ alignItems:'center', gap:28 }}>
            <NavLink onClick={() => onNavigate('dashboard')} accent="#7c6cff">Dashboard</NavLink>
            <NavLink onClick={() => onNavigate('partners')} accent="#a78bfa">Partners</NavLink>
            <NavLink onClick={() => onNavigate('about')} accent="#00f5d4">About Us</NavLink>
            <NavLink href="#pricing">Pricing</NavLink>
            <NavLink onClick={() => onNavigate('resources')} accent="#fbbf24">Resources</NavLink>
            <NavLink href="#contact">Contact</NavLink>
          </div>

          {/* ── Actions ── */}
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <LoginBtn />
            <GetStartedBtn onClick={() => onNavigate('about')} />
          </div>

        </div>
      </nav>
    </>
  );
};