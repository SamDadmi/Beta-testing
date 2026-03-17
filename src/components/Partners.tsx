import React, { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE SETUP GUIDE
// ─────────────────────────────────────────────────────────────────────────────
// Put all partner logos inside:   public/partners/
//
// Naming convention (use exactly these filenames):
//   public/partners/digital-incubation-center.png
//   public/partners/qatar-science-tech-park.png
//   public/partners/ministry-comms-it.png
//   public/partners/king-saud-university.png
//   public/partners/kaust.png
//   public/partners/dubai-future-labs.png
//   public/partners/qatar-foundation.png
//   public/partners/uae-space-agency.png
//   public/partners/stem-excellence.png
//   public/partners/global-stem-alliance.png
//
// In JSX, reference them as:  src="/partners/digital-incubation-center.png"
// Vite serves everything inside /public/ at the root path automatically.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Partner data ────────────────────────────────────────────────────────────
interface Partner {
  id: string;
  name: string;
  type: string;
  description: string;
  logo: string;       // path relative to /public  e.g. "/partners/kaust.png"
  emoji: string;      // fallback if image missing
  accent: string;
  featured?: boolean;
}

const PARTNERS: Partner[] = [
  // ── Featured (strategic) partners — shown large at top ──
  {
    id: 'king-saud',
    name: 'King Saud University',
    type: 'Education Partner',
    description: 'Leading research university advancing STEM education across the Middle East through innovative technology integration.',
    logo: '/partners/king-saud-university.png',
    emoji: '🎓',
    accent: '#00f5d4',
    featured: true,
  },
  {
    id: 'kaust',
    name: 'KAUST Innovation',
    type: 'Technology Partner',
    description: 'Pioneering research institution driving scientific discovery through cutting-edge simulation technology.',
    logo: '/partners/kaust.png',
    emoji: '🔬',
    accent: '#00c4ff',
    featured: true,
  },

  // ── Regular partners ──
  {
    id: 'digital-incubation',
    name: 'Digital Incubation Center',
    type: 'Innovation Partner',
    description: 'Fostering startup ecosystems and supporting digital transformation of educational institutions.',
    logo: '/partners/digital-incubation-center.png',
    emoji: '🚀',
    accent: '#fbbf24',
  },
  {
    id: 'qatar-science',
    name: 'Qatar Science & Technology Park',
    type: 'Research Partner',
    description: 'Connecting industry and academia to accelerate the development of a knowledge-based economy.',
    logo: '/partners/qatar-science-tech-park.png',
    emoji: '🌐',
    accent: '#a78bfa',
  },
  {
    id: 'ministry-comms',
    name: 'Ministry of Communications & IT',
    type: 'Government Partner',
    description: 'Supporting nationwide STEM curriculum development and digital transformation initiatives.',
    logo: '/partners/ministry-comms-it.png',
    emoji: '🏛️',
    accent: '#00f5d4',
  },
];

const STATS = [
  { val: '50+',   lbl: 'Partner Institutions' },
  { val: '15',    lbl: 'Countries Reached'    },
  { val: '200K+', lbl: 'Students Impacted'   },
  { val: '1000+', lbl: 'Educators Trained'   },
] as const;

// ─── Keyframes ────────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes pFadeUp {
    from { opacity:0; transform:translateY(28px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes pGlow {
    0%,100% { opacity:0.5; }
    50%      { opacity:1; }
  }
  @keyframes pScanline {
    from { transform:translateX(-100%); }
    to   { transform:translateX(400%); }
  }
  @keyframes pShimmer {
    from { background-position:-200% center; }
    to   { background-position: 200% center; }
  }
  @keyframes pCountUp {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
  }
`;

// ─── Logo image with emoji fallback ──────────────────────────────────────────
const PartnerLogo: React.FC<{ src: string; emoji: string; name: string; size?: number }> = ({
  src, emoji, name, size = 80,
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span style={{ fontSize: size * 0.7, lineHeight: 1 }}>{emoji}</span>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      style={{
        maxWidth: size * 1.8,
        maxHeight: size,
        objectFit: 'contain',
        filter: 'brightness(1) saturate(1)',
        transition: 'filter 0.3s',
      }}
    />
  );
};

// ─── Featured partner card ────────────────────────────────────────────────────
const FeaturedCard: React.FC<{ partner: Partner; delay: number }> = ({ partner, delay }) => {
  const [hov, setHov] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        borderRadius: 18,
        padding: '52px 40px',
        textAlign: 'center',
        overflow: 'hidden',
        cursor: 'default',
        opacity: visible ? 1 : 0,
        animation: visible ? `pFadeUp 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s both` : 'none',
        transform: hov ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s',
        background: hov
          ? 'linear-gradient(160deg,rgba(20,28,55,0.98) 0%,rgba(12,16,36,0.98) 100%)'
          : 'linear-gradient(160deg,rgba(14,20,44,0.96) 0%,rgba(8,12,28,0.96) 100%)',
        border: `1px solid ${hov ? partner.accent + '44' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hov
          ? `0 1px 0 rgba(255,255,255,0.06) inset, 0 -2px 0 rgba(0,0,0,0.4) inset, 0 24px 64px rgba(0,0,0,0.6), 0 0 40px ${partner.accent}12`
          : '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${partner.accent}, transparent)`,
        opacity: hov ? 1 : 0.4,
        transition: 'opacity 0.3s',
      }} />

      {/* Scanline on hover */}
      {hov && (
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '35%',
            background: `linear-gradient(90deg,transparent,${partner.accent}0a,transparent)`,
            animation: 'pScanline 1.4s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* Corner accents */}
      {hov && <>
        <span style={{ position:'absolute',top:8,left:8,width:8,height:8,borderTop:`1px solid ${partner.accent}88`,borderLeft:`1px solid ${partner.accent}88`,animation:'pGlow 2s infinite' }} />
        <span style={{ position:'absolute',top:8,right:8,width:8,height:8,borderTop:`1px solid ${partner.accent}88`,borderRight:`1px solid ${partner.accent}88`,animation:'pGlow 2s infinite 0.5s' }} />
        <span style={{ position:'absolute',bottom:8,left:8,width:8,height:8,borderBottom:`1px solid ${partner.accent}88`,borderLeft:`1px solid ${partner.accent}88`,animation:'pGlow 2s infinite 1s' }} />
        <span style={{ position:'absolute',bottom:8,right:8,width:8,height:8,borderBottom:`1px solid ${partner.accent}88`,borderRight:`1px solid ${partner.accent}88`,animation:'pGlow 2s infinite 1.5s' }} />
      </>}

      {/* Logo */}
      <div style={{
        height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
        transform: hov ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        filter: hov ? `drop-shadow(0 0 12px ${partner.accent}55)` : 'none',
      }}>
        <PartnerLogo src={partner.logo} emoji={partner.emoji} name={partner.name} size={90} />
      </div>

      {/* Type badge */}
      <div style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 100,
        background: `${partner.accent}14`,
        border: `1px solid ${partner.accent}33`,
        color: partner.accent,
        fontSize: 10, fontWeight: 700,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        {partner.type}
      </div>

      <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.3px' }}>
        {partner.name}
      </h3>

      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.7, maxWidth: 380, margin: '0 auto 24px' }}>
        {partner.description}
      </p>

      <a
        href="#"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: partner.accent, fontSize: 13, fontWeight: 700,
          textDecoration: 'none', letterSpacing: '0.04em',
          transition: 'gap 0.2s',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.gap = '12px')}
        onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.gap = '6px')}
      >
        Learn more
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5l7 7-7 7"/>
        </svg>
      </a>
    </div>
  );
};

// ─── Regular partner card ─────────────────────────────────────────────────────
const PartnerCard: React.FC<{ partner: Partner; delay: number }> = ({ partner, delay }) => {
  const [hov, setHov] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        borderRadius: 14,
        padding: '32px 28px',
        textAlign: 'center',
        overflow: 'hidden',
        opacity: visible ? 1 : 0,
        animation: visible ? `pFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s both` : 'none',
        transform: hov ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s, border-color 0.28s',
        background: hov
          ? 'linear-gradient(180deg,rgba(20,26,50,0.98) 0%,rgba(12,16,36,0.96) 100%)'
          : 'linear-gradient(180deg,rgba(12,16,36,0.94) 0%,rgba(8,10,24,0.9) 100%)',
        border: `1px solid ${hov ? partner.accent + '33' : 'rgba(255,255,255,0.06)'}`,
        borderBottom: `1px solid ${hov ? partner.accent + '55' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: hov
          ? `0 1px 0 rgba(255,255,255,0.05) inset, 0 16px 48px rgba(0,0,0,0.55), 0 0 24px ${partner.accent}0d`
          : '0 1px 0 rgba(255,255,255,0.03) inset, 0 6px 20px rgba(0,0,0,0.35)',
      }}
    >
      {/* Bottom accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${partner.accent}, transparent)`,
        transformOrigin: 'center',
        transform: hov ? 'scaleX(1)' : 'scaleX(0)',
        transition: 'transform 0.3s ease',
      }} />

      {/* Logo area */}
      <div style={{
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18,
        transform: hov ? 'scale(1.07)' : 'scale(1)',
        transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        filter: hov ? `drop-shadow(0 0 8px ${partner.accent}44)` : 'none',
      }}>
        <PartnerLogo src={partner.logo} emoji={partner.emoji} name={partner.name} size={64} />
      </div>

      {/* Type badge */}
      <div style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 100,
        background: `${partner.accent}0f`,
        border: `1px solid ${partner.accent}28`,
        color: partner.accent,
        fontSize: 9, fontWeight: 700,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        {partner.type}
      </div>

      <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.2px' }}>
        {partner.name}
      </h3>

      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, lineHeight: 1.65, marginBottom: 16 }}>
        {partner.description}
      </p>

      <a
        href="#"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          color: partner.accent, fontSize: 12, fontWeight: 700,
          textDecoration: 'none', letterSpacing: '0.04em',
          transition: 'gap 0.2s',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.gap = '10px')}
        onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.gap = '5px')}
      >
        View partnership
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5l7 7-7 7"/>
        </svg>
      </a>
    </div>
  );
};

// ─── Stat counter ─────────────────────────────────────────────────────────────
const StatItem: React.FC<{ val: string; lbl: string; delay: number }> = ({ val, lbl, delay }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      textAlign: 'center',
      opacity: visible ? 1 : 0,
      animation: visible ? `pCountUp 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s both` : 'none',
    }}>
      <div style={{
        fontSize: 'clamp(38px,5vw,58px)',
        fontWeight: 900,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        marginBottom: 8,
        background: 'linear-gradient(135deg,#00f5d4 0%,#00c4ff 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        {val}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 600,
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        {lbl}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Partners page
// ─────────────────────────────────────────────────────────────────────────────
const featured = PARTNERS.filter(p => p.featured);
const regular  = PARTNERS.filter(p => !p.featured);

interface PartnersProps {
  onBack?: () => void;
}

const Partners: React.FC<PartnersProps> = ({ onBack }) => {
  return (
    <>
      <style>{KEYFRAMES}</style>

      <div style={{
        minHeight: '100vh',
        background: '#05060f',
        color: '#fff',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        paddingTop: 68, // navbar height
      }}>

        {/* ── Radial glow bg ── */}
        <div aria-hidden style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%,rgba(0,196,255,0.05) 0%,transparent 60%)',
        }} />

        {/* ── Dot grid ── */}
        <div aria-hidden style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'radial-gradient(circle at 1.5px 1.5px,rgba(255,255,255,0.025) 1.5px,transparent 0)',
          backgroundSize: '40px 40px',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* ─── Hero ─────────────────────────────────────────────────────── */}
          <section style={{ padding: '80px 24px 60px', textAlign: 'center', maxWidth: 780, margin: '0 auto' }}>

            {/* Back button */}
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginBottom: 40,
                  color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  letterSpacing: '0.04em', transition: 'color 0.2s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#00f5d4')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M5 12l7 7M5 12l7-7"/>
                </svg>
                Back to Home
              </button>
            )}

            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px',
              background: 'rgba(0,245,212,0.06)',
              border: '1px solid rgba(0,245,212,0.2)',
              borderRadius: 100, marginBottom: 28,
              animation: 'pFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both',
            }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6,
                background: '#00f5d4', borderRadius: '50%',
                boxShadow: '0 0 8px #00f5d4',
              }} />
              <span style={{ color: '#00f5d4', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Trusted By Leaders
              </span>
            </div>

            {/* Heading */}
            <h1 style={{
              fontSize: 'clamp(44px,7vw,72px)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1.06,
              color: '#fff',
              marginBottom: 20,
              animation: 'pFadeUp 0.65s cubic-bezier(0.22,1,0.36,1) 0.1s both',
            }}>
              Our{' '}
              <span style={{
                background: 'linear-gradient(90deg,#00f5d4 0%,#00c4ff 50%,#fbbf24 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'pShimmer 4s linear infinite',
              }}>
                Partners
              </span>
            </h1>

            <p style={{
              fontSize: 17, lineHeight: 1.72,
              color: 'rgba(255,255,255,0.42)',
              maxWidth: 560, margin: '0 auto',
              animation: 'pFadeUp 0.65s cubic-bezier(0.22,1,0.36,1) 0.2s both',
            }}>
              Collaborating with world-class institutions and organizations across the
              Middle East to transform STEM education globally.
            </p>
          </section>

          {/* ─── Featured partners ────────────────────────────────────────── */}
          <section style={{ padding: '20px 24px 60px', maxWidth: 1160, margin: '0 auto' }}>
            <h2 style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
              textAlign: 'center', marginBottom: 36,
            }}>
              Strategic Partners
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))',
              gap: 24,
            }}>
              {featured.map((p, i) => (
                <FeaturedCard key={p.id} partner={p} delay={i * 0.12} />
              ))}
            </div>
          </section>

          {/* ─── Divider ─────────────────────────────────────────────────── */}
          <div style={{
            maxWidth: 1160, margin: '0 auto 60px',
            height: 1,
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)',
          }} />

          {/* ─── Regular partners ─────────────────────────────────────────── */}
          <section style={{ padding: '0 24px 80px', maxWidth: 1160, margin: '0 auto' }}>
            <h2 style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
              textAlign: 'center', marginBottom: 36,
            }}>
              Partner Network
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))',
              gap: 18,
            }}>
              {regular.map((p, i) => (
                <PartnerCard key={p.id} partner={p} delay={i * 0.08} />
              ))}
            </div>
          </section>

          {/* ─── Stats bar ───────────────────────────────────────────────── */}
          <section style={{
            background: 'rgba(8,10,22,0.9)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '64px 24px',
          }}>
            <div style={{
              maxWidth: 1000, margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
              gap: 48,
            }}>
              {STATS.map(({ val, lbl }, i) => (
                <StatItem key={lbl} val={val} lbl={lbl} delay={i * 0.1} />
              ))}
            </div>
          </section>

          {/* ─── CTA ─────────────────────────────────────────────────────── */}
          <section style={{ padding: '80px 24px 100px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
            <h2 style={{
              fontSize: 'clamp(28px,4.5vw,48px)',
              fontWeight: 900, letterSpacing: '-0.03em',
              color: '#fff', marginBottom: 16,
            }}>
              Become a Partner
            </h2>

            <p style={{
              fontSize: 16, lineHeight: 1.72,
              color: 'rgba(255,255,255,0.4)',
              maxWidth: 500, margin: '0 auto 40px',
            }}>
              Join our growing network of institutions transforming STEM education.
              Let's collaborate to create the future of learning.
            </p>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* Primary CTA — skeuomorphic teal */}
              <CtaBtn
                label="Partner With Us"
                accent="#00f5d4"
                textColor="#05060f"
                bg="linear-gradient(180deg,#00ffd9 0%,#00b8a0 100%)"
                depth="#007a6b"
              />
              {/* Secondary CTA — ghost */}
              <GhostCtaBtn label="Download Partnership Guide" />
            </div>
          </section>

        </div>
      </div>
    </>
  );
};

// ─── CTA button helpers ───────────────────────────────────────────────────────
const CtaBtn: React.FC<{
  label: string; accent: string; textColor: string; bg: string; depth: string;
}> = ({ label, accent, textColor, bg, depth }) => {
  const [hov, setHov] = useState(false);
  const [press, setPress] = useState(false);

  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        padding: '14px 36px', borderRadius: 10, fontSize: 13,
        fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: textColor, background: bg, border: 'none', cursor: 'pointer',
        transform: press ? 'translateY(3px)' : hov ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.14s',
        boxShadow: press
          ? `0 1px 0 rgba(255,255,255,0.2) inset,0 0px 0 ${depth},0 2px 8px ${accent}30`
          : hov
          ? `0 1px 0 rgba(255,255,255,0.45) inset,0 -2px 0 rgba(0,0,0,0.3) inset,0 5px 0 ${depth},0 10px 28px ${accent}50`
          : `0 1px 0 rgba(255,255,255,0.4) inset,0 -2px 0 rgba(0,0,0,0.25) inset,0 4px 0 ${depth},0 6px 18px ${accent}38`,
      }}
    >
      {label}
    </button>
  );
};

const GhostCtaBtn: React.FC<{ label: string }> = ({ label }) => {
  const [hov, setHov] = useState(false);
  const [press, setPress] = useState(false);

  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        padding: '14px 36px', borderRadius: 10, fontSize: 13,
        fontWeight: 700, letterSpacing: '0.08em',
        color: hov ? '#fff' : 'rgba(255,255,255,0.65)',
        background: hov ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: `1px solid ${hov ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)'}`,
        cursor: 'pointer',
        transform: press ? 'translateY(1px)' : hov ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 0.15s',
        boxShadow: hov ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      {label}
    </button>
  );
};

export default Partners;