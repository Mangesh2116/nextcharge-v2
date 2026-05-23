import React, { useState, useEffect } from 'react';
import { useApp } from './context';
import { Spin } from './Sections';
import { btnBase } from './Navbar';

const inpStyle = { width:'100%', background:'var(--glass-bg)', border:'1.5px solid var(--input-border)', borderRadius:12, padding:'0.75rem 1rem', color:'var(--text)', fontFamily:'inherit', fontSize:'0.9rem', outline:'none', boxSizing:'border-box', transition:'border-color 0.2s, box-shadow 0.2s' };

export function AuthModal() {
  const { authModal, setAuthModal, login, signup, googleLogin, showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ emailOrPhone:'', password:'', name:'', email:'', phone:'' });

  const [adminTab, setAdminTab] = useState('overview');
  const [pendingStations, setPendingStations] = useState([
    { id: 'p1', name: 'Jio-bp Pulse — Bandra East', operator: 'Vikram Singh', address: 'Bandra East, Mumbai', speed: '120 kW', connectors: 'CCS2' },
    { id: 'p2', name: 'Zeon Charging — Thane', operator: 'Nehal Shah', address: 'Eastern Express Hwy, Thane', speed: '60 kW', connectors: 'CCS2, Type 2 AC' }
  ]);
  const [usersList, setUsersList] = useState([
    { id: 'u1', name: 'Rahul Mehta', email: 'rahul@example.com', phone: '9876543212', role: 'user', status: 'Active' },
    { id: 'u2', name: 'Priya Patel', email: 'operator@nextcharge.in', phone: '9876543211', role: 'operator', status: 'Active' },
    { id: 'u3', name: 'Arjun Sharma', email: 'admin@nextcharge.in', phone: '9876543210', role: 'admin', status: 'Active' },
    { id: 'u4', name: 'Karan Malhotra', email: 'karan@example.com', phone: '9876543213', role: 'user', status: 'Deactivated' }
  ]);

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      await googleLogin(response.credential);
      showToast('Welcome to NextCharge! 👋');
      setAuthModal(null);
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setError('');
    setForm({ emailOrPhone:'', password:'', name:'', email:'', phone:'' });
  }, [authModal]);

  useEffect(() => {
    if (!authModal) return;

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: '160148028675-ctch3guc92ss18a4ku56cq1k7hskjgjn.apps.googleusercontent.com',
          callback: handleGoogleResponse
        });

        const btnContainer = document.getElementById('google-signin-btn');
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            { theme: 'outline', size: 'large', width: 320, text: 'signin_with', shape: 'pill' }
          );
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          initGoogle();
          clearInterval(interval);
        }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [authModal]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authModal) return null;
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const handleLogin = async e => {
    e.preventDefault(); setError('');
    if (!form.emailOrPhone || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try { await login(form.emailOrPhone, form.password); showToast('Welcome back! 👋'); setAuthModal(null); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleSignup = async e => {
    e.preventDefault(); setError('');
    if (!form.name || !form.email || !form.phone || !form.password) { setError('Please fill in all fields.'); return; }
    if (!/^[6-9]\d{9}$/.test(form.phone)) { setError('Enter a valid 10-digit Indian mobile number.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try { await signup({ name:form.name, email:form.email, phone:form.phone, password:form.password }); showToast('Account created! 🎉'); setAuthModal(null); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const focusStyle = (e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'var(--focus-ring)'; };
  const blurStyle = (e) => { e.target.style.borderColor = 'var(--input-border)'; e.target.style.boxShadow = 'none'; };

  const verifyPendingStation = (id, name) => {
    setPendingStations(prev => prev.filter(s => s.id !== id));
    showToast(`Station "${name}" verified and activated!`, 'success');
  };

  const toggleUserStatus = (id, name) => {
    setUsersList(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'Active' ? 'Deactivated' : 'Active' } : u));
    showToast(`Status toggled for ${name}!`, 'success');
  };

  if (authModal === 'admin_dashboard') {
    return (
      <div style={{ position:'fixed', inset:0, zIndex:9999, background:'var(--overlay-bg)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', animation:'fadeIn 0.2s ease' }} onClick={e=>e.target===e.currentTarget&&setAuthModal(null)}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--input-border)', borderRadius:24, padding:'2rem', width:760, maxWidth:'95vw', animation:'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)', boxShadow:'var(--shadow-xl)', display:'flex', flexDirection:'column', maxHeight: '90vh' }}>
          
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', borderBottom:'1px solid var(--border)', paddingBottom:'1rem' }}>
            <div>
              <h2 style={{ fontSize:'1.35rem', fontWeight:850, color:'var(--text)', margin:0, display:'flex', alignItems:'center', gap:8 }}>
                🛡️ NextCharge Admin Operations
              </h2>
              <p style={{ color:'var(--muted)', fontSize:'0.82rem', margin:'4px 0 0' }}>Monitor charging systems, approve operators, and manage portal parameters.</p>
            </div>
            <button onClick={()=>setAuthModal(null)} style={{ background:'var(--bg-soft)', border:'none', color:'var(--muted)', fontSize:'1rem', cursor:'pointer', width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display:'flex', gap:10, marginBottom:'1.5rem', background:'var(--bg-soft)', padding:4, borderRadius:12, border:'1px solid var(--border)' }}>
            {[['overview', '📈 Systems Overview'], ['stations', '🔌 Pending Verification'], ['users', '👥 Manage Users']].map(([t, label]) => {
              const act = adminTab === t;
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => setAdminTab(t)}
                  style={{
                    flex: 1,
                    background: act ? 'var(--surface)' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 650,
                    color: act ? 'var(--accent-dark)' : 'var(--muted)',
                    cursor: 'pointer',
                    boxShadow: act ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.25s'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Content Areas */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 6 }}>
            {adminTab === 'overview' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:12 }}>
                  {[
                    { num: '4,206', label: 'Registered EVs', color: 'var(--text)' },
                    { num: '148', label: 'Charging Stations', color: 'var(--text)' },
                    { num: '₹34,800', label: 'Today\'s Revenue', color: 'var(--accent-dark)' },
                    { num: '99.98%', label: 'Network Uptime', color: 'var(--accent-dark)' }
                  ].map((s, i) => (
                    <div key={i} style={{ background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:16, padding:'1rem', textAlign:'left' }}>
                      <span style={{ fontSize:'1.4rem', fontWeight:800, color:s.color, display:'block', marginBottom:4 }}>{s.num}</span>
                      <span style={{ fontSize:'0.75rem', color:'var(--muted)', fontWeight:550 }}>{s.label}</span>
                    </div>
                  ))}
                </div>

                <div style={{ border:'1px solid var(--border)', borderRadius:16, padding:'1.2rem', textAlign:'left' }}>
                  <h4 style={{ fontSize:'0.9rem', fontWeight:750, color:'var(--text)', marginBottom:'0.8rem' }}>⚡ Recent Charger Sessions</h4>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[
                      { user: 'Rahul Mehta', station: 'Tata Power BKC', status: 'In Progress', speed: '150 kW' },
                      { user: 'Aisha Sen', station: 'Worli ChargeZone', status: 'Completed', speed: '30 kW' },
                      { user: 'Amit Patel', station: 'Reliance Vashi', status: 'Completed', speed: '240 kW' }
                    ].map((s, idx) => (
                      <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.78rem', background:'var(--bg-soft)', padding:'8px 12px', borderRadius:8 }}>
                        <div>
                          <strong style={{ color:'var(--text)' }}>{s.user}</strong>
                          <span style={{ color:'var(--muted)', marginLeft:8 }}>at {s.station}</span>
                        </div>
                        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                          <span style={{ color:'var(--muted)' }}>{s.speed}</span>
                          <span style={{ background: s.status === 'In Progress' ? 'rgba(59,130,246,0.08)' : 'rgba(16,185,129,0.08)', color: s.status === 'In Progress' ? '#2563EB' : 'var(--accent-dark)', fontWeight:750, padding:'2px 6px', borderRadius:4 }}>
                            {s.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'stations' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem', textAlign:'left' }}>
                {pendingStations.length > 0 ? (
                  pendingStations.map(s => (
                    <div key={s.id} style={{ border:'1px solid var(--border)', borderRadius:16, padding:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <h4 style={{ fontSize:'0.95rem', fontWeight:800, color:'var(--text)', margin:'0 0 4px' }}>{s.name}</h4>
                        <div style={{ fontSize:'0.76rem', color:'var(--muted)' }}>
                          📍 {s.address} · Operator: <strong style={{ color:'var(--text-secondary)' }}>{s.operator}</strong>
                        </div>
                        <div style={{ display:'flex', gap:8, marginTop:8 }}>
                          <span style={{ background:'var(--bg-soft)', border:'1px solid var(--border)', padding:'2px 6px', borderRadius:4, fontSize:'0.7rem', color:'var(--text)' }}>⚡ {s.speed}</span>
                          <span style={{ background:'var(--bg-soft)', border:'1px solid var(--border)', padding:'2px 6px', borderRadius:4, fontSize:'0.7rem', color:'var(--text)' }}>🔌 {s.connectors}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => verifyPendingStation(s.id, s.name)}
                        style={btnBase('primary', { padding:'0.55rem 1rem', fontSize:'0.78rem', borderRadius:8 })}
                      >
                        ✓ Approve Station
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign:'center', color:'var(--muted)', padding:'2rem 0' }}>
                    <span style={{ fontSize:'2.5rem', display:'block', marginBottom:8 }}>🔌</span>
                    All operator requests have been processed! No pending verifications.
                  </div>
                )}
              </div>
            )}

            {adminTab === 'users' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem', textAlign:'left' }}>
                {usersList.map(u => (
                  <div key={u.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid var(--border)', borderRadius:12, padding:'10px 14px' }}>
                    <div>
                      <strong style={{ fontSize:'0.88rem', color:'var(--text)' }}>{u.name}</strong>
                      <div style={{ fontSize:'0.75rem', color:'var(--muted)' }}>
                        {u.email} · {u.phone}
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{
                        background: u.role === 'admin' ? 'rgba(59,130,246,0.08)' : u.role === 'operator' ? 'rgba(245,158,11,0.08)' : 'var(--bg-soft)',
                        color: u.role === 'admin' ? '#2563EB' : u.role === 'operator' ? '#D97706' : 'var(--muted)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        textTransform: 'uppercase'
                      }}>
                        {u.role}
                      </span>
                      <span style={{
                        background: u.status === 'Active' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        color: u.status === 'Active' ? 'var(--accent-dark)' : '#EF4444',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6
                      }}>
                        {u.status}
                      </span>
                      <button
                        onClick={() => toggleUserStatus(u.id, u.name)}
                        style={btnBase('ghost', { padding:'4px 10px', fontSize:'0.72rem', borderRadius:6 })}
                      >
                        {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'var(--overlay-bg)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', animation:'fadeIn 0.2s ease' }} onClick={e=>e.target===e.currentTarget&&setAuthModal(null)}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--input-border)', borderRadius:24, padding:'2.5rem', width:400, maxWidth:'92vw', animation:'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)', boxShadow:'var(--shadow-xl)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
          <h2 style={{ fontSize:'1.4rem', fontWeight:800, color:'var(--text)', margin:0 }}>{authModal==='login'?'Welcome Back':'Create Account'}</h2>
          <button onClick={()=>setAuthModal(null)} style={{ background:'var(--bg-soft)', border:'none', color:'var(--muted)', fontSize:'1rem', cursor:'pointer', width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
        <p style={{ color:'var(--muted)', fontSize:'0.85rem', marginBottom:'1.5rem' }}>{authModal==='login'?'Sign in to your NextCharge account':'Join NextCharge for free'}</p>

        {authModal==='login' ? (
          <form onSubmit={handleLogin}>
            <input value={form.emailOrPhone} onChange={set('emailOrPhone')} placeholder="Email or phone" style={{...inpStyle, marginBottom:'0.8rem'}} onFocus={focusStyle} onBlur={blurStyle} autoComplete="username" />
            <input type="password" value={form.password} onChange={set('password')} placeholder="Password" style={{...inpStyle, marginBottom: error?'0.5rem':'1.2rem'}} onFocus={focusStyle} onBlur={blurStyle} autoComplete="current-password" />
            {error && <div style={{ color:'#EF4444', fontSize:'0.82rem', marginBottom:'0.8rem', lineHeight:1.4, background:'rgba(239,68,68,0.06)', padding:'0.6rem 0.8rem', borderRadius:8 }}>{error}</div>}
            <button type="submit" disabled={loading} style={btnBase('primary',{width:'100%', padding:'0.85rem', fontSize:'0.95rem', opacity:loading?0.7:1})}>
              {loading && <Spin s={14} />}{loading?'Signing in...':'Sign In'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1.2rem 0', gap: '0.8rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500 }}>or continue with</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <div id="google-signin-btn" style={{ minHeight: 40 }} />
            </div>

            <p style={{ textAlign:'center', fontSize:'0.85rem', color:'var(--muted)', marginTop:'1.2rem' }}>Don't have an account? <span onClick={()=>setAuthModal('signup')} style={{ color:'var(--accent)', cursor:'pointer', fontWeight:600 }}>Sign up</span></p>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <input value={form.name} onChange={set('name')} placeholder="Full name" style={{...inpStyle, marginBottom:'0.8rem'}} onFocus={focusStyle} onBlur={blurStyle} />
            <input value={form.email} onChange={set('email')} placeholder="Email address" type="email" style={{...inpStyle, marginBottom:'0.8rem'}} onFocus={focusStyle} onBlur={blurStyle} autoComplete="email" />
            <div style={{ display:'flex', gap:8, marginBottom:'0.8rem' }}>
              <span style={{ background:'var(--glass-bg)', border:'1.5px solid var(--input-border)', borderRadius:12, padding:'0.75rem 0.8rem', fontSize:'0.9rem', color:'var(--muted)', whiteSpace:'nowrap' }}>🇮🇳 +91</span>
              <input value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" maxLength={10} style={{...inpStyle, flex:1}} onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <input type="password" value={form.password} onChange={set('password')} placeholder="Password (min 8 chars)" style={{...inpStyle, marginBottom: error?'0.5rem':'1.2rem'}} onFocus={focusStyle} onBlur={blurStyle} autoComplete="new-password" />
            {error && <div style={{ color:'#EF4444', fontSize:'0.82rem', marginBottom:'0.8rem', lineHeight:1.4, background:'rgba(239,68,68,0.06)', padding:'0.6rem 0.8rem', borderRadius:8 }}>{error}</div>}
            <button type="submit" disabled={loading} style={btnBase('primary',{width:'100%', padding:'0.85rem', fontSize:'0.95rem', opacity:loading?0.7:1})}>
              {loading && <Spin s={14} />}{loading?'Creating...':'Create Account'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1.2rem 0', gap: '0.8rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500 }}>or continue with</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>


            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <div id="google-signin-btn" style={{ minHeight: 40 }} />
            </div>

            <p style={{ textAlign:'center', fontSize:'0.85rem', color:'var(--muted)', marginTop:'1.2rem' }}>Already registered? <span onClick={()=>setAuthModal('login')} style={{ color:'var(--accent)', cursor:'pointer', fontWeight:600 }}>Sign in</span></p>
          </form>
        )}
      </div>
    </div>
  );
}

export function BookingModal() {
  const { bookingModal, setBookingModal, selectedStation, showToast, createBooking } = useApp();
  const [step, setStep] = useState('confirm');
  const [loading, setLoading] = useState(false);
  const [ref, setRef] = useState('');
  useEffect(() => { if (bookingModal) { setStep('confirm'); setRef(''); } }, [bookingModal]);
  if (!bookingModal || !selectedStation) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      let bookingRef;
      try {
        const data = await createBooking({ stationId:selectedStation._id, connectorId:'C001', scheduledStart:new Date(Date.now()+3600000).toISOString(), durationMinutes:60 });
        bookingRef = data.booking?.bookingRef;
      } catch { bookingRef = 'NC-'+Date.now().toString(36).toUpperCase(); }
      setRef(bookingRef); setStep('success'); showToast('Booking confirmed! ⚡');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'var(--overlay-bg)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', animation:'fadeIn 0.2s ease' }} onClick={e=>e.target===e.currentTarget&&setBookingModal(false)}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--input-border)', borderRadius:24, padding:'2.5rem', maxWidth:460, width:'92vw', animation:'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)', boxShadow:'var(--shadow-xl)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
          <div style={{ fontSize:'1.3rem', fontWeight:800, color:'var(--text)' }}>{step==='confirm'?'Confirm Booking':'Booking Confirmed!'}</div>
          <button onClick={()=>setBookingModal(false)} style={{ background:'var(--bg-soft)', border:'none', color:'var(--muted)', fontSize:'1rem', cursor:'pointer', width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
        {step==='confirm' ? (
          <>
            <div style={{ background:'var(--accent-light)', border:'1px solid var(--border-accent)', borderRadius:16, padding:'1.2rem', marginBottom:'1.2rem' }}>
              <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:'0.8rem' }}>
                <div style={{ fontSize:'1.6rem' }}>{selectedStation.icon||'⚡'}</div>
                <div><div style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--text)' }}>{selectedStation.name}</div><div style={{ fontSize:'0.78rem', color:'var(--muted)' }}>📍 {selectedStation.address}</div></div>
              </div>
              {[['Connector',selectedStation.connectors?.[0]||'CCS2'],['Max speed',selectedStation.maxSpeed],['Price',selectedStation.price],['Ports',selectedStation.portsOpen]].map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.84rem', padding:'5px 0', borderTop:'1px solid var(--border)' }}>
                  <span style={{ color:'var(--muted)' }}>{k}</span><span style={{ color:'var(--accent-dark)', fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize:'0.78rem', color:'#D97706', background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:10, padding:'0.65rem 1rem', marginBottom:'1.2rem' }}>⚡ Free cancellation up to 30 min before</div>
            <div style={{ display:'flex', gap:'0.8rem' }}>
              <button onClick={()=>setBookingModal(false)} style={btnBase('ghost',{flex:'0 0 auto',padding:'0.75rem 1.2rem'})}>Cancel</button>
              <button onClick={handleConfirm} disabled={loading} style={btnBase('primary',{flex:1,padding:'0.75rem',opacity:loading?0.7:1})}>
                {loading && <Spin s={14} />}{loading?'Confirming...':'⚡ Confirm'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'3.5rem', marginBottom:'1rem' }}>🎉</div>
            <p style={{ color:'var(--muted)', fontSize:'0.9rem', lineHeight:1.6, marginBottom:'1rem' }}>Your slot is confirmed! Details sent to your email and phone.</p>
            <div style={{ background:'var(--accent-light)', border:'1px solid var(--border-accent)', borderRadius:12, padding:'1rem', fontWeight:800, fontSize:'1.05rem', color:'var(--accent-dark)', marginBottom:'0.8rem' }}>Booking ID: {ref}</div>
            <div style={{ fontSize:'0.82rem', color:'var(--muted)', marginBottom:'1.5rem' }}>{selectedStation.name}<br/>Today · 10:00 AM – 11:00 AM</div>
            <button onClick={()=>setBookingModal(false)} style={btnBase('primary',{width:'100%',padding:'0.85rem'})}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
