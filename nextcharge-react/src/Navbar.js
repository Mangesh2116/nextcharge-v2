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
    const h = () => setScrolled(window.scrollY > 30);
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
  const navLinks = [['find', 'Find Stations'], ['booking', 'Book Slot'], ['how', 'How it works'], ['news', 'News'], ['app', 'App']];

  const navStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: scrolled ? '0.7rem 5%' : '1rem 5%',
    background: scrolled ? 'var(--nav-bg-scroll)' : 'var(--nav-bg)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: scrolled ? '1px solid var(--nav-border-scroll)' : '1px solid transparent',
    transition: 'all 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
    boxShadow: scrolled ? 'var(--nav-shadow-scroll)' : 'none',
  };

  return (
    <>
      <nav style={navStyle}>
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', cursor: 'pointer' }}>
          Next<span style={{ color: 'var(--accent)' }}>Charge</span>
          {backendOnline !== null && <span title={backendOnline ? 'Backend connected' : 'Demo mode'} style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: backendOnline ? 'var(--accent)' : '#F59E0B', marginLeft: 8, verticalAlign: 'middle' }} />}
        </div>

        <ul className="desktop-nav" style={{ display: 'flex', gap: '2rem', listStyle: 'none', margin: 0, padding: 0 }}>
          {navLinks.map(([id, label]) => (
            <NavLink key={id} onClick={() => id === 'news' ? navigate('/news') : scrollTo(id)} label={label} isTouch={isTouch} />
          ))}
        </ul>

        <div className="desktop-nav" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          {user ? (
            <UserBadge user={user} logout={logout} />
          ) : (
            <>
              <MagneticButton onClick={() => setAuthModal('login')} variant="primary" size="sm">Login</MagneticButton>
              <MagneticButton onClick={() => setAuthModal('signup')} variant="outline" size="sm">Sign Up</MagneticButton>
            </>
          )}
        </div>

        <button className="hamburger-btn" onClick={() => setMenuOpen(true)} style={{ display: 'none', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid var(--glass-border)', borderRadius: 10, width: 42, height: 42, cursor: 'pointer', flexDirection: 'column', gap: 5, padding: 10 }}>
          <span style={{ width: 20, height: 2, background: 'var(--text)', borderRadius: 2, display: 'block' }} />
          <span style={{ width: 20, height: 2, background: 'var(--text)', borderRadius: 2, display: 'block' }} />
          <span style={{ width: 14, height: 2, background: 'var(--text)', borderRadius: 2, display: 'block', alignSelf: 'flex-start', marginLeft: 1 }} />
        </button>
      </nav>

      {/* Mobile drawer */}
      <div className={`mobile-nav-backdrop ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
      {menuOpen && (
        <div className="mobile-nav-drawer">
          <button onClick={() => setMenuOpen(false)} style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)', lineHeight: 1, width: 36, height: 36 }}>✕</button>
          {navLinks.map(([id, label]) => (
            <button key={id} onClick={() => id === 'news' ? (() => { navigate('/news'); setMenuOpen(false); })() : scrollTo(id)} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '0.9rem 0.5rem', fontSize: '1.05rem', fontWeight: 500, cursor: 'pointer', color: 'var(--text)', borderBottom: '1px solid var(--border)', fontFamily: 'inherit' }}>{label}</button>
          ))}
          <div style={{ padding: '0.5rem 0' }}>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {user ? (
              <UserBadge user={user} logout={logout} />
            ) : (
              <>
                <button onClick={() => { setAuthModal('login'); setMenuOpen(false); }} style={btnBase('primary')}>Login</button>
                <button onClick={() => { setAuthModal('signup'); setMenuOpen(false); }} style={btnBase('outline')}>Sign Up</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({ onClick, label, isTouch }) {
  const mag = useMagnetic(0.2, 80);
  const [hov, setHov] = useState(false);
  return (
    <li ref={isTouch ? null : mag.ref}>
      <button type="button" onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ background: 'none', border: 'none', color: hov ? 'var(--accent)' : 'var(--muted)', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '0.3rem 0', transition: 'color 0.2s', ...(isTouch ? {} : mag.style) }}>
        {label}
      </button>
    </li>
  );
}

function UserBadge({ user, logout }) {
  const { setAuthModal, setArticleEditorModal } = useApp();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-light)', border: '1px solid var(--border-accent)', borderRadius: 50, padding: '0.4rem 1rem' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>{user.name?.[0] || 'U'}</div>
      <span style={{ color: 'var(--accent-dark)', fontWeight: 600, fontSize: '0.85rem' }}>{user.name?.split(' ')[0]}</span>
      {user.role === 'admin' && (
        <>
          <button type="button" onClick={() => setArticleEditorModal(true)} style={{ background: 'rgba(59,130,246,0.1)', border: 'none', color: '#3B82F6', borderRadius: 20, padding: '3px 9px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', marginRight: 2, transition: 'transform 0.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>Articles</button>
          <button type="button" onClick={() => setAuthModal('admin_dashboard')} style={{ background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 20, padding: '3px 9px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', marginRight: 4, transition: 'transform 0.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>Admin</button>
        </>
      )}
      <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit' }}>Sign out</button>
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
      style={{
        background: hov ? 'var(--accent-light)' : 'var(--glass-bg)',
        border: '1px solid ' + (hov ? 'var(--border-accent)' : 'var(--glass-border)'),
        borderRadius: 10,
        width: 38,
        height: 38,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '1.1rem',
        transition: 'all 0.3s ease',
        transform: hov ? 'scale(1.08) rotate(15deg)' : 'scale(1)',
        outline: 'none',
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

export function btnBase(v, extra = {}) {
  const base = { fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: 50, fontSize: '0.9rem', transition: 'all 0.2s cubic-bezier(0.23, 1, 0.32, 1)', padding: '0.7rem 1.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  const variants = {
    primary: { background: 'var(--accent)', color: 'var(--btn-primary-text)', fontWeight: 700, boxShadow: 'var(--btn-primary-shadow)' },
    outline: { background: 'transparent', color: 'var(--accent)', border: '1.5px solid var(--accent)', boxShadow: 'var(--btn-outline-shadow)' },
    ghost: { background: 'var(--glass-bg)', color: 'var(--text)', border: '1.5px solid var(--glass-border)' },
    white: { background: 'var(--glass-bg)', color: 'var(--accent)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border)' },
  };
  return { ...base, ...(variants[v] || {}), ...extra };
}

export function MagneticButton({ children, variant = 'primary', size, onClick, disabled, style: extraStyle = {} }) {
  const mag = useMagnetic(0.25, 100);
  const [hov, setHov] = useState(false);
  const sizeStyles = size === 'sm' ? { fontSize: '0.85rem', padding: '0.55rem 1.2rem' } : size === 'lg' ? { fontSize: '1rem', padding: '0.9rem 2.2rem' } : {};
  const hoverScale = hov && !disabled ? 'scale(1.03)' : 'scale(1)';

  return (
    <button ref={mag.ref} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        ...btnBase(variant, sizeStyles),
        transform: `${mag.style.transform} ${hoverScale}`,
        transition: 'all 0.25s cubic-bezier(0.23, 1, 0.32, 1)',
        opacity: disabled ? 0.6 : 1,
        ...extraStyle,
      }}>
      {children}
    </button>
  );
}
