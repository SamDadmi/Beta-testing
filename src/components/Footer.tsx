import React, { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Skeuomorphic Footer Link
// ─────────────────────────────────────────────────────────────────────────────
interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
}

const FooterLink: React.FC<FooterLinkProps> = ({ href, children }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        color: hovered ? '#00f5d4' : 'rgba(255,255,255,0.42)',
        fontSize: 13,
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        display: 'inline-block',
        transform: hovered ? 'translateX(4px)' : 'translateX(0)',
        textShadow: hovered ? '0 0 16px rgba(0,245,212,0.5)' : 'none',
      }}
    >
      {children}
    </a>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeuomorphic Social Icon
// ─────────────────────────────────────────────────────────────────────────────
interface SocialIconProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

const SocialIcon: React.FC<SocialIconProps> = ({ href, icon, label }) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <a
      href={href}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 38,
        height: 38,
        borderRadius: 10,
        textDecoration: 'none',
        transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        background: pressed
          ? 'linear-gradient(180deg,rgba(8,12,26,0.98) 0%,rgba(14,20,38,0.95) 100%)'
          : hovered
          ? 'linear-gradient(180deg,rgba(18,26,52,1) 0%,rgba(12,18,38,0.98) 100%)'
          : 'linear-gradient(180deg,rgba(12,18,38,0.85) 0%,rgba(8,12,26,0.8) 100%)',
        border: hovered ? '1px solid rgba(0,245,212,0.4)' : '1px solid rgba(255,255,255,0.08)',
        transform: pressed ? 'translateY(2px) scale(0.96)' : hovered ? 'translateY(-3px) scale(1.05)' : 'translateY(0) scale(1)',
        boxShadow: pressed
          ? '0 1px 0 rgba(255,255,255,0.05) inset,0 2px 10px rgba(0,0,0,0.7)'
          : hovered
          ? '0 1px 0 rgba(255,255,255,0.1) inset,0 -3px 0 rgba(0,0,0,0.5) inset,0 10px 32px rgba(0,0,0,0.6),0 0 24px rgba(0,245,212,0.25)'
          : '0 1px 0 rgba(255,255,255,0.06) inset,0 -2px 0 rgba(0,0,0,0.4) inset,0 5px 18px rgba(0,0,0,0.45)',
        color: hovered ? '#00f5d4' : 'rgba(255,255,255,0.45)',
        fontSize: 16,
      }}
    >
      {icon}
    </a>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeuomorphic AI Button
// ─────────────────────────────────────────────────────────────────────────────
const SkeuomorphicButton: React.FC = () => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        position: 'relative',
        width: 32,
        height: 32,
        flexShrink: 0,
        cursor: 'pointer',
      }}
    >
      {/* Outer glow */}
      {hovered && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: 10,
            background: 'radial-gradient(circle,rgba(37,99,235,0.4),transparent 70%)',
            filter: 'blur(8px)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}
      
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: 9,
          background: pressed
            ? 'linear-gradient(135deg,#1e40af 0%,#1e3a8a 100%)'
            : hovered
            ? 'linear-gradient(135deg,#3b82f6 0%,#2563eb 100%)'
            : 'linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: pressed ? 'translateY(2px)' : hovered ? 'translateY(-1px)' : 'translateY(0)',
          transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: pressed
            ? '0 2px 0 rgba(255,255,255,0.15) inset,0 -1px 0 rgba(0,0,0,0.5) inset,0 2px 8px rgba(0,0,0,0.6)'
            : hovered
            ? '0 3px 0 rgba(255,255,255,0.25) inset,0 -4px 0 rgba(0,0,0,0.4) inset,0 0 0 1px rgba(59,130,246,0.5),0 8px 20px rgba(37,99,235,0.5),0 0 40px rgba(37,99,235,0.3)'
            : '0 2px 0 rgba(255,255,255,0.2) inset,0 -3px 0 rgba(0,0,0,0.35) inset,0 0 0 1px rgba(37,99,235,0.3),0 6px 16px rgba(37,99,235,0.4)',
        }}
      >
        {/* Sparkle effect */}
        {hovered && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 4,
              height: 4,
              background: 'white',
              borderRadius: '50%',
              boxShadow: '0 0 8px rgba(255,255,255,0.8)',
              animation: 'sparkle 1.5s ease-in-out infinite',
            }}
          />
        )}
        
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="white"
          stroke="none"
          style={{
            filter: hovered ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' : 'none',
            transition: 'filter 0.2s',
          }}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeuomorphic Pill Button
// ─────────────────────────────────────────────────────────────────────────────
interface SkeuomorphicPillProps {
  label: string;
}

const SkeuomorphicPill: React.FC<SkeuomorphicPillProps> = ({ label }) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        position: 'relative',
        padding: '7px 16px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: hovered ? '#00f5d4' : 'rgba(255,255,255,0.5)',
        background: pressed
          ? 'linear-gradient(180deg,rgba(8,12,24,0.95) 0%,rgba(5,8,16,0.98) 100%)'
          : hovered
          ? 'linear-gradient(180deg,rgba(16,24,48,0.92) 0%,rgba(12,18,36,0.95) 100%)'
          : 'linear-gradient(180deg,rgba(12,18,36,0.85) 0%,rgba(8,12,24,0.9) 100%)',
        border: hovered ? '1px solid rgba(0,245,212,0.35)' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 9,
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        transform: pressed ? 'translateY(2px) scale(0.97)' : hovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: pressed
          ? '0 1px 0 rgba(255,255,255,0.06) inset,0 -2px 0 rgba(0,0,0,0.4) inset,0 2px 8px rgba(0,0,0,0.6)'
          : hovered
          ? '0 2px 0 rgba(255,255,255,0.08) inset,0 -3px 0 rgba(0,0,0,0.35) inset,0 6px 20px rgba(0,0,0,0.5),0 0 20px rgba(0,245,212,0.2)'
          : '0 1px 0 rgba(255,255,255,0.06) inset,0 -2px 0 rgba(0,0,0,0.3) inset,0 4px 12px rgba(0,0,0,0.45)',
        textShadow: hovered ? '0 0 12px rgba(0,245,212,0.6)' : 'none',
      }}
    >
      {/* Top highlight shine */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: 1,
          background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)',
          opacity: hovered ? 1 : 0.5,
          transition: 'opacity 0.2s',
        }}
      />
      {label}
    </button>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────────
export const Footer: React.FC = () => {
  return (
    <>
      <style>{`
        @keyframes footerPulse {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.28; }
        }
        @keyframes iconGlow {
          0%, 100% { box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset,0 -2px 0 rgba(0,0,0,0.4) inset,0 5px 18px rgba(0,0,0,0.45); }
          50% { box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset,0 -2px 0 rgba(0,0,0,0.4) inset,0 5px 18px rgba(0,0,0,0.45),0 0 16px rgba(0,245,212,0.15); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.5); }
        }
      `}</style>

      <footer
        style={{
          position: 'relative',
          background: '#050812',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '88px 40px 40px',
          overflow: 'hidden',
          zIndex: 100, // Above the Three.js canvas
        }}
      >
        {/* Solid blocking layer to prevent particles bleeding through */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, #050812 0%, #030408 100%)',
            zIndex: 0,
          }}
        />

        {/* Animated top accent line */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '45%',
            height: 1.5,
            background: 'linear-gradient(90deg,transparent,rgba(0,245,212,0.4),rgba(0,196,255,0.3),transparent)',
            animation: 'footerPulse 5s ease-in-out infinite',
            zIndex: 1,
          }}
        />

        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', zIndex: 10 }}>
          {/* Main grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.8fr 1fr 1fr 1fr 1fr',
              gap: 56,
              marginBottom: 72,
            }}
          >
            {/* Brand section */}
            <div style={{ maxWidth: 420 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg,#00f5d4 0%,#00c4ff 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 12,
                    color: '#05060f',
                    boxShadow: '0 2px 0 rgba(255,255,255,0.35) inset,0 -2px 0 rgba(0,0,0,0.3) inset,0 6px 20px rgba(0,245,212,0.4)',
                  }}
                >
                  ✦
                </div>
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 900,
                    letterSpacing: '0.01em',
                    color: 'white',
                  }}
                >
                  EffectualL
                </span>
              </div>
              <p
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 14,
                  lineHeight: 1.7,
                  fontWeight: 500,
                  marginBottom: 18,
                }}
              >
                Engage & Map STEM visually
              </p>
              <p
                style={{
                  color: 'rgba(255,255,255,0.32)',
                  fontSize: 13,
                  lineHeight: 1.72,
                  fontWeight: 400,
                  marginBottom: 24,
                }}
              >
                Understanding complex topics, mechanisms &amp; concepts,connections
                through high-fidelity simulations and personalized visual engines.
              </p>

              {/* Chatbot Input */}
              <div
                style={{
                  position: 'relative',
                  marginBottom: 14,
                }}
              >
                {/* Outer glow effect */}
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: -2,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg,rgba(0,245,212,0.1),rgba(37,99,235,0.1))',
                    filter: 'blur(8px)',
                    opacity: 0.6,
                    pointerEvents: 'none',
                  }}
                />
                
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '11px 12px',
                    background: 'linear-gradient(180deg,rgba(12,18,35,0.95) 0%,rgba(8,12,24,0.98) 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 11,
                    boxShadow: '0 2px 0 rgba(255,255,255,0.05) inset,0 -3px 0 rgba(0,0,0,0.4) inset,0 8px 24px rgba(0,0,0,0.6)',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Let the application begin"
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: 12.5,
                      fontWeight: 500,
                    }}
                  />
                  <SkeuomorphicButton />
                </div>
              </div>

              {/* Quick Action Pills */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['3D Model', 'Learn', 'Explore'].map((label) => (
                  <SkeuomorphicPill key={label} label={label} />
                ))}
              </div>
            </div>

            {/* PRODUCT */}
            <div>
              <h4
                style={{
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  marginBottom: 22,
                  opacity: 0.85,
                }}
              >
                PRODUCT
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <FooterLink href="#hero">3D Models</FooterLink>
                <FooterLink href="#hero">Learn</FooterLink>
                <FooterLink href="#hero">Explore</FooterLink>
                <FooterLink href="#about">Pricing</FooterLink>
              </div>
            </div>

            {/* FOR SCHOOLS */}
            <div>
              <h4
                style={{
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  marginBottom: 22,
                  opacity: 0.85,
                }}
              >
                FOR SCHOOLS
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <FooterLink href="#about">Subscription</FooterLink>
                <FooterLink href="#about">Interactive Models</FooterLink>
                <FooterLink href="#about">Curriculums Library</FooterLink>
                <FooterLink href="#about">Request Support</FooterLink>
              </div>
            </div>

            {/* RESOURCES */}
            <div>
              <h4
                style={{
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  marginBottom: 22,
                  opacity: 0.85,
                }}
              >
                RESOURCES
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <FooterLink href="#resources">Documentation</FooterLink>
                <FooterLink href="#resources">Teacher Training</FooterLink>
                <FooterLink href="#resources">Technical Support</FooterLink>
                <FooterLink href="#resources">Blog</FooterLink>
                <FooterLink href="#resources">Request Demo</FooterLink>
                <FooterLink href="#resources">FAQ</FooterLink>
              </div>
            </div>

            {/* COMPANY */}
            <div>
              <h4
                style={{
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  marginBottom: 22,
                  opacity: 0.85,
                }}
              >
                COMPANY
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <FooterLink href="#about">About Us</FooterLink>
                <FooterLink href="#about">Careers</FooterLink>
                <FooterLink href="#about">Partners</FooterLink>
                <FooterLink href="#about">Contact</FooterLink>
                <FooterLink href="#">Press Kit</FooterLink>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              paddingTop: 40,
              borderTop: '1px solid rgba(255,255,255,0.055)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
            }}
          >
            {/* Left: Copyright */}
            <div
              style={{
                color: 'rgba(255,255,255,0.22)',
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: '0.08em',
              }}
            >
              © 2025 EffectualL. All rights reserved
            </div>

            {/* Center: Social Icons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <SocialIcon
                href="https://linkedin.com"
                label="LinkedIn"
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                    <rect x="2" y="9" width="4" height="12"/>
                    <circle cx="4" cy="4" r="2"/>
                  </svg>
                }
              />
              <SocialIcon
                href="https://instagram.com"
                label="Instagram"
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                }
              />
              <SocialIcon
                href="https://twitter.com"
                label="X / Twitter"
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4l11.733 16h4.267l-11.733 -16z"/>
                    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/>
                  </svg>
                }
              />
              <SocialIcon
                href="https://youtube.com"
                label="YouTube"
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
                  </svg>
                }
              />
            </div>

            {/* Right: Legal links */}
            <div style={{ display: 'flex', gap: 28 }}>
              <a
                href="#"
                style={{
                  color: 'rgba(255,255,255,0.24)',
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#00f5d4')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.24)')}
              >
                Privacy Policy
              </a>
              <a
                href="#"
                style={{
                  color: 'rgba(255,255,255,0.24)',
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#00f5d4')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.24)')}
              >
                Terms of Service
              </a>
              <a
                href="#"
                style={{
                  color: 'rgba(255,255,255,0.24)',
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#00f5d4')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.24)')}
              >
                Accessibility
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;