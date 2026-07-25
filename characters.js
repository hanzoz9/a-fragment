/* ═══════════════════════════════════════════════
   FRAGMENT FALL — CHARACTERS PAGE SCRIPT
   Verified against the original characters.html inline script;
   only change is the reduced-motion gate on the particle loop
   (marked "New" above).
═══════════════════════════════════════════════ */

'use strict';

/* ── Particles ── */
(() => {
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], raf;
  const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
  const make = (anywhere) => ({
    x: Math.random() * (window.innerWidth || 800),
    y: anywhere ? Math.random() * (window.innerHeight || 600) : -10,
    vx: (Math.random() - 0.5) * 0.3,
    vy: Math.random() * 0.5 + 0.2,
    size: Math.random() * 2.2 + 0.4,
    opacity: Math.random() * 0.35 + 0.05,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: (Math.random() - 0.5) * 0.02,
    color: Math.random() > 0.8 ? '#8b1a1a' : '#3d3535',
  });
  resize();
  particles = Array.from({ length: 70 }, () => make(true));
  const loop = () => {
    raf = requestAnimationFrame(loop);
    ctx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * 0.2;
      p.y += p.vy;
      if (p.y > H + 10) { particles[i] = make(false); continue; }
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  // New — canvas animation isn't reached by CSS prefers-reduced-motion;
  // paint one static frame instead of animating forever.
  const drawFrame = () => {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    drawFrame();
  } else {
    loop();
  }
  window.addEventListener('resize', resize);
})();

/* ── Reveal on scroll ── */
(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();
