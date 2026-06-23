import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from './context';
import { useMagnetic, useIsTouchDevice } from './hooks';

export default function Navbar() {
  const { user, setAuthModal, logout, backendOnline, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isTouch = useIsTouchDevice();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const scrollTo = id => {
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
    setMenuOpen(false);
  };

  const navStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: scrolled ? '0.65rem 5%' : '0.9rem 5%',
    background: scrolled ? 'var(--nav-bg-scroll)' : 'var(--nav-bg)',
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    borderBottom: scrolled ? '1px solid var(--nav-border-scroll)' : '1px solid transparent',
    transition: 'all 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
    boxShadow: scrolled ? 'var(--nav-shadow-scroll)' : 'none',
  };

  return (
    <>
      <nav style={navStyle} role="navigation" aria-label="Main navigation">
        {/* Logo */}
        <div
          onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}
          aria-label="NextCharge Home"
        >
          <img
            src="/logo.png"
            alt="NextCharge — EV Charging Network India"
            style={{ height: 36, width: 36, objectFit: 'contain', borderRadius: 8 }}
            loading="eager"
          />
          <span style={{
            fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, var(--text) 0%, var(--text-secondary) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            next<span style={{
              background: 'linear-gradient(135deg, #FF6B00, #FF8C38)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>charge</span>
          </span>
          {backendOnline !== null && (
            <span
              title={backendOnline ? 'All systems live' : 'Demo mode active'}
              style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: backendOnline ? '#10B981' : '#F59E0B',
                marginLeft: 2,
                boxShadow: backendOnline ? '0 0 6px #10B981' : '0 0 6px #F59E0B',
                animation: 'pulseDot 2.5s ease-in-out infinite',
              }}
            />
          )}
        </div>

        {/* Desktop Nav */}
        <ul className="desktop-nav" style={{ display: 'flex', gap: '0.2rem', listStyle: 'none', margin: 0, padding: 0, alignItems: 'center' }}>
          <NavLink onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} label="Home" isTouch={isTouch} />
          <NavLink onClick={() => scrollTo('find')} label="Find Chargers" isTouch={isTouch} />
          <NavDropdown label="Business" items={[
            { label: 'For Fleets', action: () => scrollTo('find') },
            { label: 'Station Operators', action: () => scrollTo('find') },
            { label: 'Partner with Us', action: () => scrollTo('find') },
          ]} />
          <NavDropdown label="About Us" items={[
            { label: 'Our Mission', action: () => scrollTo('how') },
            { label: 'Team & Careers', action: () => {} },
            { label: 'Press & Media', action: () => {} },
            { label: 'Contact Us', action: () => {} },
          ]} />
          <NavLink onClick={() => navigate('/news')} label="Resources" isTouch={isTouch} />
        </ul>

        {/* Desktop CTA */}
        <div className="desktop-nav" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          {user ? (
            <UserBadge user={user} logout={logout} />
          ) : (
            <>
              <button
                id="nav-login-btn"
                onClick={() => setAuthModal('login')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  padding: '0.5rem 1.1rem',
                  borderRadius: 50,
                  cursor: 'pointer',
                  transition: 'all 0.22s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text)'; }}
              >
                Log In
              </button>
              <button
                id="nav-signup-btn"
                onClick={() => setAuthModal('signup')}
                style={{
                  background: 'linear-gradient(135deg, #FF6B00, #FF8C38)',
                  border: 'none',
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  padding: '0.5rem 1.3rem',
                  borderRadius: 50,
                  cursor: 'pointer',
                  transition: 'all 0.22s ease',
                  boxShadow: '0 2px 12px rgba(255,107,0,0.3)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,107,0,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(255,107,0,0.3)'; }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          className="hamburger-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          style={{
            display: 'none', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: '1px solid var(--glass-border)', borderRadius: 10,
            width: 40, height: 40, cursor: 'pointer', flexDirection: 'column', gap: 5, padding: 10
          }}
        >
          <span style={{ width: 18, height: 2, background: 'var(--text)', borderRadius: 2, display: 'block' }} />
          <span style={{ width: 18, height: 2, background: 'var(--text)', borderRadius: 2, display: 'block' }} />
          <span style={{ width: 12, height: 2, background: 'var(--orange)', borderRadius: 2, display: 'block', alignSelf: 'flex-start' }} />
        </button>
      </nav>

      {/* Mobile drawer */}
      <div className={`mobile-nav-backdrop ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
      {menuOpen && (
        <div className="mobile-nav-drawer" role="dialog" aria-label="Mobile navigation">
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu" style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--muted)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

          {/* Mobile Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
            <img src="/logo.png" alt="NextCharge" style={{ height: 32, width: 32, objectFit: 'contain', borderRadius: 6 }} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>next<span style={{ color: 'var(--orange)' }}>charge</span></span>
          </div>

          {[
            ['Home', () => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }],
            ['Find Chargers', () => scrollTo('find')],
            ['Book a Slot', () => scrollTo('booking')],
            ['How It Works', () => scrollTo('how')],
            ['News & Resources', () => { navigate('/news'); setMenuOpen(false); }],
            ['About Us', () => scrollTo('how')],
          ].map(([label, action]) => (
            <button key={label} onClick={action} style={{
              background: 'none', border: 'none', textAlign: 'left',
              padding: '0.85rem 0.5rem', fontSize: '1rem', fontWeight: 500,
              cursor: 'pointer', color: 'var(--text)', borderBottom: '1px solid var(--border)',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--orange)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
            >
              {label}
            </button>
          ))}

          <div style={{ padding: '0.8rem 0' }}>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: '1rem' }}>
            {user ? (
              <UserBadge user={user} logout={logout} />
            ) : (
              <>
                <button onClick={() => { setAuthModal('login'); setMenuOpen(false); }} style={mobileBtn('outline')}>Log In</button>
                <button onClick={() => { setAuthModal('signup'); setMenuOpen(false); }} style={mobileBtn('primary')}>Sign Up Free</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function mobileBtn(v) {
  const base = {
    fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer',
    borderRadius: 50, fontSize: '0.95rem', padding: '0.75rem',
    display: 'block', width: '100%', textAlign: 'center', transition: 'all 0.2s',
  };
  if (v === 'primary') return { ...base, background: 'linear-gradient(135deg, #FF6B00, #FF8C38)', border: 'none', color: '#fff', boxShadow: '0 2px 12px rgba(255,107,0,0.3)' };
  return { ...base, background: 'transparent', border: '1.5px solid var(--orange)', color: 'var(--orange)' };
}

function NavLink({ onClick, label, isTouch }) {
  const mag = useMagnetic(0.2, 80);
  const [hov, setHov] = useState(false);
  return (
    <li ref={isTouch ? null : mag.ref}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: 'none', border: 'none',
          color: hov ? 'var(--orange)' : 'var(--muted)',
          fontSize: '0.88rem', fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
          padding: '0.4rem 0.75rem', borderRadius: 8,
          transition: 'color 0.2s',
          ...(isTouch ? {} : mag.style)
        }}
      >
        {label}
      </button>
    </li>
  );
}

function NavDropdown({ label, items }) {
  return (
    <li className="nav-dropdown" style={{ listStyle: 'none' }}>
      <button type="button" style={{
        background: 'none', border: 'none',
        color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 500,
        cursor: 'pointer', fontFamily: 'inherit',
        padding: '0.4rem 0.75rem', borderRadius: 8,
        transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {label}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginTop: 1 }}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="nav-dropdown-menu">
        {items.map(item => (
          <button key={item.label} onClick={item.action} className="nav-dropdown-item" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
            {item.label}
          </button>
        ))}
      </div>
    </li>
  );
}

function UserBadge({ user, logout }) {
  const { setAuthModal, setArticleEditorModal } = useApp();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--orange-light)', border: '1px solid var(--border-accent)', borderRadius: 50, padding: '0.35rem 0.9rem' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--orange-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: 'var(--orange)' }}>
        {user.name?.[0] || 'U'}
      </div>
      <span style={{ color: 'var(--orange)', fontWeight: 700, fontSize: '0.83rem' }}>{user.name?.split(' ')[0]}</span>
      {user.role === 'admin' && (
        <>
          <button type="button" onClick={() => setArticleEditorModal(true)} style={{ background: 'rgba(59,130,246,0.1)', border: 'none', color: '#3B82F6', borderRadius: 20, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>Articles</button>
          <button type="button" onClick={() => setAuthModal('admin_dashboard')} style={{ background: 'var(--orange)', border: 'none', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>Admin</button>
        </>
      )}
      <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.76rem', fontFamily: 'inherit' }}>Sign out</button>
    </div>
  );
}

function ThemeToggle({ theme, toggleTheme }) {
  const [hov, setHov] = useState(false);
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        background: hov ? 'var(--orange-light)' : 'var(--glass-bg)',
        border: '1px solid ' + (hov ? 'var(--border-accent)' : 'var(--glass-border)'),
        borderRadius: 10, width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontSize: '1rem',
        transition: 'all 0.3s ease',
        transform: hov ? 'scale(1.1) rotate(12deg)' : 'scale(1)',
        outline: 'none', flexShrink: 0,
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

export function btnBase(v, extra = {}) {
  const base = {
    fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', border: 'none',
    borderRadius: 50, fontSize: '0.9rem',
    transition: 'all 0.25s cubic-bezier(0.23, 1, 0.32, 1)',
    padding: '0.7rem 1.5rem',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8
  };
  const variants = {
    primary: { background: 'linear-gradient(135deg, #FF6B00, #FF8C38)', color: '#ffffff', fontWeight: 700, boxShadow: '0 2px 16px rgba(255,107,0,0.3)' },
    outline: { background: 'transparent', color: 'var(--orange)', border: '1.5px solid var(--orange)', boxShadow: 'none' },
    ghost: { background: 'var(--glass-bg)', color: 'var(--text)', border: '1.5px solid var(--glass-border)' },
    white: { background: 'var(--glass-bg)', color: 'var(--orange)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border)' },
  };
  return { ...base, ...(variants[v] || {}), ...extra };
}

export function MagneticButton({ children, variant = 'primary', size, onClick, disabled, style: extraStyle = {} }) {
  const mag = useMagnetic(0.25, 100);
  const [hov, setHov] = useState(false);
  const sizeStyles = size === 'sm' ? { fontSize: '0.83rem', padding: '0.5rem 1.1rem' } : size === 'lg' ? { fontSize: '1rem', padding: '0.9rem 2.2rem' } : {};
  const hoverScale = hov && !disabled ? 'scale(1.04)' : 'scale(1)';

  return (
    <button
      ref={mag.ref}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...btnBase(variant, sizeStyles),
        transform: `${mag.style.transform} ${hoverScale}`,
        transition: 'all 0.25s cubic-bezier(0.23, 1, 0.32, 1)',
        opacity: disabled ? 0.6 : 1,
        ...(hov && variant === 'primary' ? { boxShadow: '0 4px 24px rgba(255,107,0,0.45)' } : {}),
        ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}
