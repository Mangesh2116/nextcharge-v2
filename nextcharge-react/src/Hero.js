import React, { useState, useRef, useEffect } from 'react';
import { useCursorPosition, useIsTouchDevice } from './hooks';
import { MagneticButton } from './Navbar';
import { useApp } from './context';

// Floating shapes that respond to cursor
function FloatingShapes({ cursorPos, accentRgb }) {
  const [r, g, b] = accentRgb;
  const shapes = [
    { size: 80, color: `rgba(${r},${g},${b},0.06)`, top: '15%', left: '8%', anim: 'float1', dur: '8s' },
    { size: 120, color: `rgba(${r},${g},${b},0.04)`, top: '25%', right: '12%', anim: 'float2', dur: '10s' },
    { size: 50, color: `rgba(${r},${g},${b},0.07)`, top: '60%', left: '15%', anim: 'float3', dur: '7s' },
    { size: 60, color: `rgba(${r},${g},${b},0.05)`, bottom: '20%', right: '20%', anim: 'float1', dur: '9s' },
    { size: 40, color: 'rgba(59,130,246,0.05)', top: '40%', left: '70%', anim: 'float2', dur: '11s' },
    { size: 90, color: `rgba(${r},${g},${b},0.03)`, top: '70%', right: '5%', anim: 'float3', dur: '12s' },
    { size: 70, color: `rgba(${r},${g},${b},0.05)`, top: '5%', right: '35%', anim: 'float2', dur: '9.5s' },
    { size: 45, color: `rgba(${r},${g},${b},0.06)`, bottom: '12%', left: '30%', anim: 'float1', dur: '8.5s' },
    { size: 110, color: 'rgba(59,130,246,0.03)', bottom: '35%', left: '45%', anim: 'float3', dur: '13s' },
    { size: 55, color: `rgba(${r},${g},${b},0.04)`, top: '45%', right: '45%', anim: 'float1', dur: '7.5s' },
    { size: 75, color: `rgba(${r},${g},${b},0.05)`, top: '55%', left: '5%', anim: 'float2', dur: '10.5s' },
    { size: 35, color: 'rgba(139,92,246,0.04)', bottom: '8%', right: '40%', anim: 'float3', dur: '8s' },
  ];

  return (
    <>
      {shapes.map((s, i) => {
        const parallaxX = cursorPos.x ? (cursorPos.x - window.innerWidth / 2) * (0.01 + i * 0.005) : 0;
        const parallaxY = cursorPos.y ? (cursorPos.y - window.innerHeight / 2) * (0.01 + i * 0.005) : 0;
        return (
          <div key={i} style={{
            position: 'absolute', width: s.size, height: s.size,
            background: s.color, borderRadius: '50%',
            top: s.top, left: s.left, right: s.right, bottom: s.bottom,
            animation: `${s.anim} ${s.dur} ease-in-out infinite`,
            transform: `translate(${parallaxX}px, ${parallaxY}px)`,
            transition: 'transform 0.4s ease-out',
            pointerEvents: 'none', filter: 'blur(1px)',
          }} />
        );
      })}
    </>
  );
}

// Electric bolt SVG that flashes in the background — REDUCED SIZE & SUBTLE OPACITY
function ElectricBoltBackground({ accentRgb }) {
  const color = `rgb(${accentRgb.join(',')})`;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Top Left Bolt */}
      <svg viewBox="0 0 100 200" style={{ position: 'absolute', left: '8%', top: '15%', width: 50, height: 100, opacity: 0.018, animation: 'boltFlash 7s ease-in-out infinite' }}>
        <path d="M60 0 L25 85 L45 85 L20 200 L80 100 L55 100 L85 0 Z" fill={color} />
      </svg>
      {/* Top Right Bolt */}
      <svg viewBox="0 0 100 200" style={{ position: 'absolute', right: '12%', top: '22%', width: 40, height: 80, opacity: 0.015, animation: 'boltFlash 9s ease-in-out infinite 2.5s' }}>
        <path d="M60 0 L25 85 L45 85 L20 200 L80 100 L55 100 L85 0 Z" fill={color} />
      </svg>
      {/* Lower Left Bolt */}
      <svg viewBox="0 0 100 200" style={{ position: 'absolute', left: '28%', bottom: '22%', width: 30, height: 60, opacity: 0.012, animation: 'boltFlash 8s ease-in-out infinite 4.5s' }}>
        <path d="M60 0 L25 85 L45 85 L20 200 L80 100 L55 100 L85 0 Z" fill={color} />
      </svg>
    </div>
  );
}

// Particle system — DRAWN AS FLOATING GLOWING BUBBLES + VISIBILITY OPTIMIZED
function ParticleField({ cursorPos, accentRgb, isVisible }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animRef = useRef(null);
  const [r, g, b] = accentRgb;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    // Init particles — INCREASED COUNT for more dots/bubbles
    const count = Math.min(100, Math.floor(canvas.offsetWidth / 12));
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      size: Math.random() * 3 + 1.2, // Slightly larger particles for the bubble outline look
      alpha: Math.random() * 0.45 + 0.15,
    }));

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!isVisible) {
      // Pause drawing and loop when out of viewport (Performance Optimization!)
      cancelAnimationFrame(animRef.current);
      return;
    }
    const ctx = canvas.getContext('2d');
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      particlesRef.current.forEach(p => {
        // Antigravity: push away from cursor
        if (cursorPos.x && cursorPos.y) {
          const rect = canvas.getBoundingClientRect();
          const mx = cursorPos.x - rect.left;
          const my = cursorPos.y - rect.top;
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const force = (120 - dist) / 120 * 0.8;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        p.vx *= 0.98; p.vy *= 0.98;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;

        // Solid inner core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
        ctx.fill();

        // Bubble delicate ring outline (giving a bubble style!)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${p.alpha * 0.35})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Delicate outer glow halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha * 0.05})`;
        ctx.fill();
      });

      // Draw connections — neon lines
      const ps = particlesRef.current;
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x;
          const dy = ps[i].y - ps[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(ps[i].x, ps[i].y);
            ctx.lineTo(ps[j].x, ps[j].y);
            ctx.strokeStyle = `rgba(${r},${g},${b},${0.08 * (1 - dist / 90)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [cursorPos, r, g, b, isVisible]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

// Cursor glow
function CursorGlow({ cursorPos, accentRgb }) {
  if (!cursorPos.x) return null;
  const [r, g, b] = accentRgb;
  return (
    <div style={{
      position: 'absolute', pointerEvents: 'none', width: 500, height: 500, borderRadius: '50%',
      background: `radial-gradient(circle, rgba(${r},${g},${b},0.08) 0%, rgba(${r},${g},${b},0.02) 40%, transparent 70%)`,
      left: cursorPos.x - 250, top: cursorPos.y - 250,
      transition: 'left 0.15s ease-out, top 0.15s ease-out',
      zIndex: 0,
    }} />
  );
}

export default function Hero() {
  const cursorPos = useCursorPosition();
  const isTouch = useIsTouchDevice();
  const { theme } = useApp();
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const cp = isTouch ? { x: 0, y: 0 } : cursorPos;

  // VISIBILITY OPTIMIZATION: Stop canvas animation when hero is off-screen
  const heroRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { threshold: 0.05 });

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, []);

  const isDark = theme === 'dark';
  const accentRgb = isDark ? [0, 255, 136] : [16, 185, 129];
  const dotOpacity = isDark ? 0.12 : 0.08;
  const meshGreen = isDark ? 'rgba(0,255,136,0.04)' : 'rgba(16,185,129,0.03)';
  const meshBlue = isDark ? 'rgba(59,130,246,0.03)' : 'rgba(59,130,246,0.02)';
  const meshPurple = isDark ? 'rgba(139,92,246,0.02)' : 'rgba(139,92,246,0.01)';
  const lineColor1 = isDark ? 'rgba(0,255,136,0.12)' : 'rgba(16,185,129,0.06)';
  const lineColor2 = isDark ? 'rgba(0,255,136,0.06)' : 'rgba(16,185,129,0.03)';
  const lineColor1Edge = isDark ? 'rgba(0,255,136,0.06)' : 'rgba(16,185,129,0.03)';
  const lineColor2Edge = isDark ? 'rgba(0,255,136,0.04)' : 'rgba(16,185,129,0.02)';

  return (
    <section ref={heroRef} style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '8rem 5% 5rem', position: 'relative', overflow: 'hidden',
      background: 'var(--hero-gradient)',
      transition: 'background 0.4s ease',
    }}>
      {/* Gradient mesh overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${meshGreen} 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 20% 50%, ${meshBlue} 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 80% 60%, ${meshPurple} 0%, transparent 70%)`,
        transition: 'background 0.4s ease',
      }} />

      {/* Dot grid — DENSER: 20px grid instead of 32px for more dots */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle, rgba(${accentRgb.join(',')},${dotOpacity}) 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 45%, black 20%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 45%, black 20%, transparent 100%)',
      }} />

      {/* Horizontal energy line accents */}
      <div style={{
        position: 'absolute', top: '30%', left: 0, right: 0, height: 1, pointerEvents: 'none',
        background: `linear-gradient(90deg, transparent 0%, ${lineColor1Edge} 20%, ${lineColor1} 50%, ${lineColor1Edge} 80%, transparent 100%)`,
      }} />
      <div style={{
        position: 'absolute', top: '70%', left: 0, right: 0, height: 1, pointerEvents: 'none',
        background: `linear-gradient(90deg, transparent 0%, ${lineColor2Edge} 30%, ${lineColor2} 50%, ${lineColor2Edge} 70%, transparent 100%)`,
      }} />

      <ElectricBoltBackground accentRgb={accentRgb} />
      {!isTouch && <FloatingShapes cursorPos={cp} accentRgb={accentRgb} />}
      {!isTouch && <ParticleField cursorPos={cp} accentRgb={accentRgb} isVisible={isVisible} />}
      {!isTouch && <CursorGlow cursorPos={cp} accentRgb={accentRgb} />}

      {/* Badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        border: '1px solid var(--border-accent)', background: 'var(--accent-light)',
        borderRadius: 50, padding: '0.45rem 1.1rem', fontSize: '0.78rem',
        color: 'var(--accent)', marginBottom: '2rem', fontWeight: 600,
        position: 'relative', zIndex: 2, animation: 'fadeInDown 0.6s ease 0.2s both',
        boxShadow: isDark ? '0 0 15px rgba(0,255,136,0.1), inset 0 0 15px rgba(0,255,136,0.03)' : 'var(--shadow-sm)',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s infinite', boxShadow: isDark ? '0 0 8px rgba(0,255,136,0.6)' : 'none' }} />
        India's Fastest-Growing EV Network
      </div>

      {/* Heading */}
      <h1 style={{
        fontSize: 'clamp(2.5rem, 6.5vw, 5rem)', fontWeight: 800, lineHeight: 1.08,
        letterSpacing: '-0.04em', maxWidth: 800, marginBottom: '1.5rem',
        position: 'relative', zIndex: 2, color: 'var(--text)',
        animation: 'fadeInUp 0.7s ease 0.3s both',
      }}>
        Charge Smarter,<br />
        Drive{' '}
        <span className="electric-text">Further</span>
      </h1>

      {/* Subtitle */}
      <p style={{
        color: 'var(--muted)', fontSize: 'clamp(1rem, 2vw, 1.15rem)',
        maxWidth: 520, marginBottom: '2.5rem', lineHeight: 1.7,
        position: 'relative', zIndex: 2, animation: 'fadeInUp 0.7s ease 0.45s both',
      }}>
        Find, book, and charge at thousands of EV stations across India. Real-time availability. Zero wait time.
      </p>

      {/* CTA Buttons */}
      <div style={{
        display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center',
        position: 'relative', zIndex: 2, animation: 'fadeInUp 0.7s ease 0.6s both',
      }}>
        <MagneticButton variant="primary" size="lg" onClick={() => scrollTo('find')}>
          ⚡ Find a Station
        </MagneticButton>
        <MagneticButton variant="ghost" size="lg" onClick={() => scrollTo('booking')}>
          Book a Slot
        </MagneticButton>
      </div>

      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, pointerEvents: 'none',
        background: 'linear-gradient(to top, var(--bg) 0%, transparent 100%)',
      }} />

    </section>
  );
}
