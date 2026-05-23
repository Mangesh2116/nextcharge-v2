import { useState, useEffect, useCallback, useRef } from 'react';

// Global cursor position tracker
export function useCursorPosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  return pos;
}

// Magnetic pull effect — element subtly moves toward cursor
export function useMagnetic(strength = 0.3, radius = 150) {
  const ref = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf;
    const handler = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        const pull = (1 - dist / radius) * strength;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => setOffset({ x: dx * pull, y: dy * pull }));
      } else {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => setOffset({ x: 0, y: 0 }));
      }
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => { window.removeEventListener('mousemove', handler); cancelAnimationFrame(raf); };
  }, [strength, radius]);

  return { ref, offset, style: { transform: `translate(${offset.x}px, ${offset.y}px)`, transition: 'transform 0.25s cubic-bezier(0.23, 1, 0.32, 1)' } };
}

// 3D tilt card effect
export function useTiltCard(maxTilt = 8) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * maxTilt, y: px * maxTilt });
  }, [maxTilt]);

  const handleLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  return {
    ref,
    handlers: { onMouseMove: handleMove, onMouseLeave: handleLeave },
    style: {
      transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      transition: 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
    },
  };
}

// Scroll reveal using IntersectionObserver
export function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// Counter animation for stats
export function useCountUp(target, duration = 2000, startOnVisible = true) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(!startOnVisible);
  const ref = useRef(null);

  useEffect(() => {
    if (!startOnVisible) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.unobserve(el); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [startOnVisible]);

  useEffect(() => {
    if (!started) return;
    const num = parseInt(target.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) { setCount(target); return; }
    let start = 0;
    const step = num / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= num) { setCount(num); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  const suffix = target.replace(/[0-9,.]/g, '');
  const formatted = typeof count === 'number' ? count.toLocaleString() + suffix : count;
  return { ref, formatted };
}

// Detect if touch device
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);
  return isTouch;
}
