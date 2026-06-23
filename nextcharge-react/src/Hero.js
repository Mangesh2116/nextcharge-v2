import React from 'react';
import { MagneticButton } from './Navbar';
import { useApp } from './context';

/* ─── Floating ambient blobs ──────────────────────────────────────────────── */
function AmbientBlobs({ isDark }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Main orange glow */}
      <div style={{
        position: 'absolute', right: '-5%', top: '10%',
        width: 600, height: 600,
        background: isDark
          ? 'radial-gradient(circle, rgba(255,107,0,0.12) 0%, rgba(255,107,0,0.04) 40%, transparent 70%)'
          : 'radial-gradient(circle, rgba(255,107,0,0.08) 0%, rgba(255,107,0,0.02) 40%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        animation: 'float2 12s ease-in-out infinite',
      }} />
      {/* Secondary blue glow */}
      <div style={{
        position: 'absolute', left: '-8%', bottom: '15%',
        width: 400, height: 400,
        background: isDark
          ? 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 60%)'
          : 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 60%)',
        borderRadius: '50%',
        filter: 'blur(30px)',
        animation: 'float1 10s ease-in-out infinite 2s',
      }} />
      {/* Top accent */}
      <div style={{
        position: 'absolute', left: '30%', top: '-5%',
        width: 300, height: 300,
        background: isDark
          ? 'radial-gradient(circle, rgba(255,140,56,0.06) 0%, transparent 60%)'
          : 'radial-gradient(circle, rgba(255,107,0,0.04) 0%, transparent 60%)',
        borderRadius: '50%',
        filter: 'blur(25px)',
        animation: 'float3 8s ease-in-out infinite 1s',
      }} />
    </div>
  );
}

/* ─── Electric grid dot overlay ───────────────────────────────────────────── */
function DotGrid({ isDark }) {
  const opacity = isDark ? 0.10 : 0.06;
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: `radial-gradient(circle, rgba(255,107,0,${opacity}) 1px, transparent 1px)`,
      backgroundSize: '28px 28px',
      WebkitMaskImage: 'radial-gradient(ellipse 85% 70% at 50% 50%, black 10%, transparent 100%)',
      maskImage: 'radial-gradient(ellipse 85% 70% at 50% 50%, black 10%, transparent 100%)',
    }} />
  );
}

/* ─── Floating EV car SVG illustration ───────────────────────────────────── */
function EVCarIllustration({ isDark }) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 580,
      margin: '0 auto',
      animation: 'carFloat 5s ease-in-out infinite',
    }}>
      {/* Glow underneath */}
      <div style={{
        position: 'absolute', bottom: -20, left: '50%',
        transform: 'translateX(-50%)',
        width: '75%', height: 40,
        background: 'rgba(255,107,0,0.2)',
        borderRadius: '50%',
        filter: 'blur(20px)',
        animation: 'glowPulse 5s ease-in-out infinite',
      }} />

      {/* Car SVG */}
      <svg
        viewBox="0 0 580 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', position: 'relative', zIndex: 1, filter: isDark ? 'drop-shadow(0 0 40px rgba(255,107,0,0.3))' : 'drop-shadow(0 8px 32px rgba(0,0,0,0.18))' }}
        role="img"
        aria-label="Electric vehicle charging illustration"
      >
        {/* Road/ground */}
        <ellipse cx="290" cy="245" rx="260" ry="12" fill={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'} />

        {/* Car body — main shell */}
        <path d="M80 180 C80 180 90 120 140 100 L200 80 L380 80 L440 100 C490 120 500 180 500 180 Z"
          fill={isDark ? '#1E2A3A' : '#F0F4F8'}
          stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
          strokeWidth="1.5"
        />
        {/* Car roof / cabin */}
        <path d="M180 80 C190 55 210 42 240 38 L340 38 C370 38 390 55 400 80 Z"
          fill={isDark ? '#263244' : '#E2EAF4'}
          stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
          strokeWidth="1"
        />
        {/* Windshield */}
        <path d="M195 80 L215 45 L340 45 L365 80 Z"
          fill={isDark ? 'rgba(100,180,255,0.15)' : 'rgba(100,180,255,0.3)'}
          stroke={isDark ? 'rgba(100,180,255,0.25)' : 'rgba(100,180,255,0.4)'}
          strokeWidth="1.5"
        />
        {/* Rear window */}
        <path d="M165 80 L185 50 L200 50 L185 80 Z"
          fill={isDark ? 'rgba(100,180,255,0.10)' : 'rgba(100,180,255,0.2)'}
        />

        {/* Car base / undercarriage */}
        <rect x="70" y="178" width="440" height="22" rx="6"
          fill={isDark ? '#151C2C' : '#D8E2EE'}
        />
        <rect x="70" y="194" width="440" height="8" rx="4"
          fill={isDark ? '#101828' : '#C8D5E5'}
        />

        {/* Front headlight — orange LED strip */}
        <path d="M485 155 L500 160 L500 170 L485 168 Z" fill="#FF6B00" opacity="0.9" />
        <path d="M490 157 L498 160 L498 168 L490 166 Z" fill="#FFD4A0" opacity="0.7" />
        {/* Headlight glow */}
        <ellipse cx="502" cy="163" rx="12" ry="6" fill="rgba(255,107,0,0.3)" filter="url(#glow)" />

        {/* Rear light — red strip */}
        <path d="M80 155 L95 158 L95 170 L80 168 Z" fill="#EF4444" opacity="0.8" />

        {/* Side door lines */}
        <line x1="280" y1="82" x2="280" y2="178" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth="1.5" />

        {/* Charging port — left side with glow */}
        <rect x="105" y="148" width="16" height="12" rx="3"
          fill={isDark ? '#263244' : '#D0DDF0'}
          stroke="#FF6B00" strokeWidth="1.5"
        />
        <rect x="108" y="151" width="10" height="6" rx="2" fill="#FF6B00" opacity="0.8" />
        {/* Port glow */}
        <circle cx="113" cy="154" r="8" fill="rgba(255,107,0,0.25)" />

        {/* Wheel arches */}
        <ellipse cx="170" cy="200" rx="52" ry="18" fill={isDark ? '#0D1220' : '#B8C8DC'} />
        <ellipse cx="410" cy="200" rx="52" ry="18" fill={isDark ? '#0D1220' : '#B8C8DC'} />

        {/* Wheels */}
        {[170, 410].map(cx => (
          <g key={cx}>
            <circle cx={cx} cy="200" r="44" fill={isDark ? '#0B101C' : '#1A2440'} />
            <circle cx={cx} cy="200" r="36" fill={isDark ? '#111828' : '#222E50'} />
            <circle cx={cx} cy="200" r="26" fill={isDark ? '#0D1520' : '#1A2440'} />
            {/* Rim spokes */}
            {[0,60,120,180,240,300].map(angle => (
              <line key={angle}
                x1={cx + 8 * Math.cos(angle * Math.PI / 180)}
                y1={200 + 8 * Math.sin(angle * Math.PI / 180)}
                x2={cx + 24 * Math.cos(angle * Math.PI / 180)}
                y2={200 + 24 * Math.sin(angle * Math.PI / 180)}
                stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ))}
            <circle cx={cx} cy="200" r="8" fill={isDark ? '#1E2A3A' : '#2C3A60'} />
            {/* Hub accent — orange */}
            <circle cx={cx} cy="200" r="4" fill="#FF6B00" />
          </g>
        ))}

        {/* Lightning bolt charging indicator */}
        <g transform="translate(240, 10)">
          <rect width="100" height="36" rx="18" fill={isDark ? 'rgba(255,107,0,0.12)' : 'rgba(255,107,0,0.08)'} stroke="rgba(255,107,0,0.3)" strokeWidth="1" />
          <text x="18" y="23" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill="#FF6B00">⚡ Charging</text>
        </g>

        {/* Battery level bar */}
        <g transform="translate(128, 120)">
          <rect width="72" height="22" rx="6" fill={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)'} stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} strokeWidth="1" />
          <rect width="54" height="22" rx="5" fill="rgba(16,185,129,0.85)" />
          <rect x="72" y="8" width="5" height="6" rx="2" fill={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} />
          <text x="10" y="15" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="700" fill="#ffffff">78%</text>
        </g>

        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      </svg>

      {/* Floating stats cards */}
      <FloatingStatCard
        value="150 kW"
        label="Fast DC Charging"
        icon="⚡"
        style={{ position: 'absolute', top: '8%', right: '-5%', animation: 'float3 6s ease-in-out infinite 0.5s' }}
        isDark={isDark}
      />
      <FloatingStatCard
        value="4,200+"
        label="Charge Points"
        icon="📍"
        style={{ position: 'absolute', bottom: '12%', left: '-6%', animation: 'float1 7s ease-in-out infinite 1s' }}
        isDark={isDark}
      />
    </div>
  );
}

function FloatingStatCard({ value, label, icon, style: extraStyle, isDark }) {
  return (
    <div style={{
      background: isDark ? 'rgba(21,28,44,0.9)' : 'rgba(255,255,255,0.95)',
      border: `1px solid ${isDark ? 'rgba(255,107,0,0.2)' : 'rgba(255,107,0,0.15)'}`,
      borderRadius: 14,
      padding: '0.7rem 1rem',
      backdropFilter: 'blur(12px)',
      boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)',
      minWidth: 130,
      ...extraStyle,
    }}>
      <div style={{ fontSize: '1.1rem', marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--orange)', letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

/* ─── Partner logo bar ─────────────────────────────────────────────────────── */
function PartnerLogos() {
  const partners = [
    { name: 'TATA', svg: <svg viewBox="0 0 80 30" width="60" height="22" aria-label="Tata"><text x="0" y="22" fontFamily="Arial" fontWeight="900" fontSize="22" fill="currentColor">TATA</text></svg> },
    { name: 'Mahindra', svg: <svg viewBox="0 0 110 30" width="90" height="22" aria-label="Mahindra"><text x="0" y="22" fontFamily="Arial" fontWeight="800" fontSize="16" fill="currentColor">Mahindra</text></svg> },
    { name: 'Ather', svg: <svg viewBox="0 0 70 30" width="55" height="22" aria-label="Ather"><text x="0" y="22" fontFamily="Arial" fontWeight="900" fontSize="18" fill="currentColor">Ather</text></svg> },
    { name: 'Hyundai', svg: <svg viewBox="0 0 100 30" width="80" height="22" aria-label="Hyundai"><text x="0" y="22" fontFamily="Arial" fontWeight="800" fontSize="17" fill="currentColor">Hyundai</text></svg> },
    { name: 'TVS', svg: <svg viewBox="0 0 60 30" width="48" height="22" aria-label="TVS"><text x="0" y="22" fontFamily="Arial" fontWeight="900" fontSize="22" fill="currentColor">TVS</text></svg> },
    { name: 'BPCL', svg: <svg viewBox="0 0 70 30" width="55" height="22" aria-label="BPCL"><text x="0" y="22" fontFamily="Arial" fontWeight="900" fontSize="18" fill="currentColor">BPCL</text></svg> },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap', justifyContent: 'center', color: 'var(--muted)', opacity: 0.65 }}>
      {partners.map(p => (
        <div key={p.name} title={p.name} style={{ display: 'flex', alignItems: 'center' }}>
          {p.svg}
        </div>
      ))}
    </div>
  );
}

/* ─── Trust badges row ─────────────────────────────────────────────────────── */
function TrustBadges() {
  const badges = [
    { icon: '🛡️', title: 'Reliable Network', sub: '99.1% uptime' },
    { icon: '⚡', title: 'Fast Charging', sub: 'Up to 150kW' },
    { icon: '🌿', title: 'Sustainable Future', sub: 'Lower emissions' },
  ];
  return (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '2.2rem' }}>
      {badges.map(b => (
        <div key={b.title} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>{b.icon}</span>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{b.title}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.3 }}>{b.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Hero component ─────────────────────────────────────────────────── */
export default function Hero() {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section
      id="hero"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '7rem 5% 4rem',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--hero-gradient)',
        transition: 'background 0.4s ease',
      }}
      aria-label="NextCharge — Find EV Charging Stations"
    >
      {/* Background effects */}
      <DotGrid isDark={isDark} />
      <AmbientBlobs isDark={isDark} />

      {/* Horizontal accent line */}
      <div style={{
        position: 'absolute', top: '38%', left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 0%, rgba(255,107,0,0.08) 30%, rgba(255,107,0,0.15) 50%, rgba(255,107,0,0.08) 70%, transparent 100%)`,
        pointerEvents: 'none',
      }} />

      {/* ── Main grid: left content + right visual ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.1fr)',
        gap: '3rem',
        alignItems: 'center',
        maxWidth: 1280,
        margin: '0 auto',
        width: '100%',
        position: 'relative',
        zIndex: 2,
      }}
        className="hero-grid"
      >
        {/* LEFT: Text content */}
        <div>
          {/* Tag badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            border: '1px solid rgba(255,107,0,0.25)',
            background: 'rgba(255,107,0,0.08)',
            borderRadius: 50, padding: '0.42rem 1rem',
            fontSize: '0.76rem', color: 'var(--orange)',
            fontWeight: 600, marginBottom: '1.5rem',
            animation: 'fadeInDown 0.6s ease 0.2s both',
            boxShadow: isDark ? '0 0 20px rgba(255,107,0,0.1)' : 'none',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)', animation: 'pulseDot 2s infinite', boxShadow: isDark ? '0 0 8px rgba(255,107,0,0.8)' : 'none', display: 'inline-block' }} />
            Powering the Future, Together.
          </div>

          {/* H1 Headline */}
          <h1 style={{
            fontSize: 'clamp(2.6rem, 5.5vw, 4.2rem)',
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
            marginBottom: '1.2rem',
            color: 'var(--text)',
            animation: 'fadeInUp 0.7s ease 0.3s both',
            fontFamily: "'Outfit', 'Inter', sans-serif",
          }}>
            Charge Smarter.<br />
            <span className="electric-text">Drive Further.</span>
          </h1>

          {/* Description */}
          <p style={{
            color: 'var(--muted)',
            fontSize: 'clamp(0.95rem, 1.8vw, 1.08rem)',
            maxWidth: 480,
            marginBottom: '2.2rem',
            lineHeight: 1.75,
            animation: 'fadeInUp 0.7s ease 0.45s both',
          }}>
            NextCharge makes EV charging simple, reliable and accessible wherever the road takes you.
            Find real-time available stations, book a slot in seconds, and charge with confidence.
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex', gap: '0.9rem', flexWrap: 'wrap',
            animation: 'fadeInUp 0.7s ease 0.6s both',
            marginBottom: '0.5rem',
          }}>
            <MagneticButton
              id="hero-find-btn"
              variant="primary"
              size="lg"
              onClick={() => scrollTo('find')}
              style={{ gap: 8 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              Find Chargers
            </MagneticButton>
            <MagneticButton
              variant="ghost"
              size="lg"
              onClick={() => scrollTo('app')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" />
              </svg>
              Get the App
            </MagneticButton>
          </div>

          {/* Trust badges */}
          <div style={{ animation: 'fadeInUp 0.7s ease 0.75s both' }}>
            <TrustBadges />
          </div>
        </div>

        {/* RIGHT: EV car visual */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 1s ease 0.4s both',
          position: 'relative',
        }}>
          <EVCarIllustration isDark={isDark} />
        </div>
      </div>

      {/* ── Partner logos bar ── */}
      <div style={{
        maxWidth: 1280, margin: '4rem auto 0', width: '100%',
        position: 'relative', zIndex: 2,
        animation: 'fadeInUp 0.8s ease 0.9s both',
      }}>
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '2.5rem',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Trusted by forward-thinking partners
          </p>
          <PartnerLogos />
        </div>
      </div>

      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
        background: 'linear-gradient(to top, var(--bg) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .hero-grid > div:last-child {
            order: -1;
            max-height: 260px;
            overflow: hidden;
          }
        }
      `}</style>
    </section>
  );
}
