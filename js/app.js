/* ═══════════════════════════════════════════════
   FRAGMENT FALL — APP LOGIC
   Loaded after js/chapters-data.js on index.html only.
   Verified against the original index.html's inline script;
   new additions (storage safety, SVG icons, reduced-motion-aware
   particles, auto-computed stats, continue-reading, read indicators
   on chapter cards) are commented "new" at each site.
═══════════════════════════════════════════════ */

/* ── SAFE STORAGE (new) ──
   Wraps localStorage in a try/catch with an in-memory fallback, so
   bookmarks/theme/reading-progress degrade gracefully instead of
   throwing if storage is ever blocked (private-browsing edge cases,
   sandboxed iframes) — the site still works, it just won't remember
   preferences for that session. */
const Store = (() => {
  let available = true;
  try {
    const probe = '__ff_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
  } catch (e) { available = false; }
  const memory = {};
  const get = (key) => {
    if (available) {
      try { return localStorage.getItem(key); } catch (e) { available = false; }
    }
    return key in memory ? memory[key] : null;
  };
  const set = (key, value) => {
    if (available) {
      try { localStorage.setItem(key, value); return; } catch (e) { available = false; }
    }
    memory[key] = value;
  };
  return { get, set };
})();

/* ── ICONS (new) ──
   Small inline SVG line icons, replacing the emoji (📖 ✍ 🔒 ✔ ℹ ✕ 🔖)
   used throughout for chapter meta, lock badges, and toasts — emoji
   render inconsistently across platforms and can't be themed or
   sized via CSS the way these can. */
const Icons = {
  book: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3a1 1 0 0 1 1-1h4v12H3a1 1 0 0 1-1-1V3Z"/><path d="M14 3a1 1 0 0 0-1-1H9v12h4a1 1 0 0 0 1-1V3Z"/></svg>',
  pen: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2l3 3-8 8-3.5 1L4 10.5 11 2Z"/></svg>',
  lock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7"/></svg>',
  check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 5"/></svg>',
  info: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="6.25"/><path d="M8 7.2v4.3M8 5v.01"/></svg>',
  x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  bookmark: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M4 2.5h8v11l-4-2.8-4 2.8v-11Z"/></svg>',
};

/* ── STATE ── */
const State = {
  currentChapter: null,
  currentPage: 'home', // 'home' | 'reading'
  fontSize: 16,
  lineHeight: 2.1,
  theme: Store.get('ff-theme') || 'void',
  bookmarks: JSON.parse(Store.get('ff-bookmarks') || '[]'),
  readChapters: JSON.parse(Store.get('ff-read') || '[]'),
  distractionFree: false,
  sidebarOpen: false,
  activeModal: null,
  scrollPosition: {},
};

/* ── UTILITIES ── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const save = (k, v) => Store.set(k, JSON.stringify(v));

/* ── PARTICLES ENGINE ── */
const Particles = (() => {
  let canvas, ctx, particles = [], raf, W, H;

  const init = () => {
    canvas = $('#particles-canvas');
    ctx = canvas.getContext('2d');
    resize();
    spawn();
    // New: canvas animation isn't reached by the CSS prefers-reduced-motion rule.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      drawFrame();
    } else {
      loop();
    }
    window.addEventListener('resize', resize);
  };

  const resize = () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };

  const spawn = () => {
    const count = Math.min(80, Math.floor(W * H / 12000));
    particles = Array.from({ length: count }, () => makeParticle(true));
  };

  const makeParticle = (anywhere = false) => ({
    x: Math.random() * W,
    y: anywhere ? Math.random() * H : -10,
    vx: (Math.random() - 0.5) * 0.3,
    vy: Math.random() * 0.5 + 0.2,
    size: Math.random() * 2.5 + 0.5,
    opacity: Math.random() * 0.4 + 0.05,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: (Math.random() - 0.5) * 0.02,
    color: Math.random() > 0.8 ? '#8b1a1a' : '#3d3535',
  });

  const loop = () => {
    raf = requestAnimationFrame(loop);
    ctx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * 0.2;
      p.y += p.vy;
      if (p.y > H + 10) {
        particles[i] = makeParticle(false);
        continue;
      }
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // New: single static paint for reduced-motion, no rAF re-scheduling.
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

  return { init };
})();

/* ── TOAST SYSTEM ── */
const Toast = (() => {
  const container = () => $('#toast-container');
  const icons = { success: Icons.check, info: Icons.info, error: Icons.x, bookmark: Icons.bookmark };

  const show = (msg, type = 'info', dur = 3000) => {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span><span>${msg}</span>`;
    container().appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, dur);
  };

  return { show };
})();

/* ── READING CONTROLS ── */
const Controls = (() => {
  const MIN_SIZE = 12, MAX_SIZE = 28;
  const MIN_LH = 1.6, MAX_LH = 2.8;

  const apply = () => {
    const text = $('#reading-text');
    if (!text) return;
    text.style.fontSize = State.fontSize + 'px';
    text.style.lineHeight = State.lineHeight;
    $('#font-size-display').textContent = State.fontSize;
    save('ff-font', State.fontSize);
    save('ff-lh', State.lineHeight);
  };

  const initFontSize = () => {
    State.fontSize = parseInt(Store.get('ff-font') || '16');
    State.lineHeight = parseFloat(Store.get('ff-lh') || '2.1');
  };

  const bindEvents = () => {
    $('#ctrl-font-up').addEventListener('click', () => {
      if (State.fontSize < MAX_SIZE) { State.fontSize += 2; apply(); }
    });
    $('#ctrl-font-down').addEventListener('click', () => {
      if (State.fontSize > MIN_SIZE) { State.fontSize -= 2; apply(); }
    });
    $('#ctrl-lh-up').addEventListener('click', () => {
      if (State.lineHeight < MAX_LH) { State.lineHeight = +(State.lineHeight + 0.2).toFixed(1); apply(); }
    });
    $('#ctrl-lh-down').addEventListener('click', () => {
      if (State.lineHeight > MIN_LH) { State.lineHeight = +(State.lineHeight - 0.2).toFixed(1); apply(); }
    });

    // Theme dots
    $$('.theme-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const t = dot.dataset.theme;
        State.theme = t;
        document.body.dataset.theme = t;
        $$('.theme-dot').forEach(d => {
          d.classList.toggle('active', d.dataset.theme === t);
          d.setAttribute('aria-checked', d.dataset.theme === t);
        });
        save('ff-theme', t);
      });
      dot.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dot.click(); }
      });
    });

    // Distraction free
    $('#ctrl-distraction-free').addEventListener('click', () => {
      App.toggleDistractionFree();
    });

    // Bookmark
    $('#ctrl-bookmark').addEventListener('click', () => {
      App.addBookmark();
    });
  };

  return { apply, initFontSize, bindEvents };
})();

/* ── BOOKMARKS SYSTEM ── */
const Bookmarks = (() => {
  const add = (chapterId, text) => {
    const bm = {
      id: Date.now(),
      chapterId,
      chapterTitle: NOVEL_DATA.chapters.find(c => c.id === chapterId)?.titleAr || '',
      text: text.substring(0, 200),
      timestamp: new Date().toLocaleDateString('ar'),
    };
    State.bookmarks.unshift(bm);
    if (State.bookmarks.length > 50) State.bookmarks.pop();
    save('ff-bookmarks', State.bookmarks);
    return bm;
  };

  const remove = (id) => {
    State.bookmarks = State.bookmarks.filter(b => b.id !== id);
    save('ff-bookmarks', State.bookmarks);
    render();
  };

  const render = () => {
    const list = $('#bookmarks-list');
    if (!list) return;
    if (State.bookmarks.length === 0) {
      list.innerHTML = '<div class="bookmark-empty">لا توجد إشارات مرجعية بعد.<br><small>اضغط على زر الإشارة أثناء القراءة لحفظ موضعك.</small></div>';
      return;
    }
    list.innerHTML = State.bookmarks.map(bm => `
      <div class="bookmark-item" data-id="${bm.id}" role="listitem">
        <div class="bookmark-item-body">
          <span class="bookmark-chapter">${bm.chapterTitle} · ${bm.timestamp}</span>
          <p class="bookmark-text">${bm.text}</p>
        </div>
        <button class="bookmark-delete" data-delete="${bm.id}" aria-label="حذف الإشارة" title="حذف">✕</button>
      </div>
    `).join('');
    $$('.bookmark-item[data-id]').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.dataset.delete) return;
        const bm = State.bookmarks.find(b => b.id === parseInt(item.dataset.id));
        if (bm) {
          App.closeModal();
          App.openChapter(bm.chapterId);
        }
      });
    });
    $$('.bookmark-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        remove(parseInt(btn.dataset.delete));
        Toast.show('تم حذف الإشارة', 'info');
      });
    });
  };

  return { add, remove, render };
})();

/* ── SEARCH ENGINE ── */
const Search = (() => {
  const index = [];

  const buildIndex = () => {
    NOVEL_DATA.chapters.forEach(ch => {
      if (ch.locked || !ch.content) return;
      const div = document.createElement('div');
      div.innerHTML = ch.content;
      const text = div.textContent;
      const sentences = text.split(/[.،؟!]\s+/).filter(s => s.trim().length > 20);
      sentences.forEach(s => index.push({ chapterId: ch.id, chapterTitle: ch.titleAr, text: s.trim() }));
    });
  };

  const query = (q) => {
    if (!q || q.length < 2) return [];
    const lq = q.toLowerCase();
    return index
      .filter(item => item.text.toLowerCase().includes(lq))
      .slice(0, 8)
      .map(item => ({
        ...item,
        highlighted: item.text.replace(
          new RegExp(q, 'gi'),
          m => `<mark>${m}</mark>`
        )
      }));
  };

  const render = (results, q) => {
    const container = $('#search-results');
    if (!container) return;
    if (!q || q.length < 2) { container.innerHTML = ''; return; }
    if (results.length === 0) {
      container.innerHTML = `<p style="color:var(--dust);font-family:var(--font-arabic);font-size:.85rem;text-align:center;padding:1rem;">لا نتائج للبحث عن "${q}"</p>`;
      return;
    }
    container.innerHTML = results.map(r => `
      <div class="search-result-item" data-chapter="${r.chapterId}" role="listitem">
        <span class="search-result-chapter">${r.chapterTitle}</span>
        <p class="search-result-text">${r.highlighted}</p>
      </div>
    `).join('');
    $$('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        App.closeModal();
        App.openChapter(parseInt(item.dataset.chapter));
      });
    });
  };

  const bindEvents = () => {
    const input = $('#search-input');
    if (!input) return;
    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const results = query(input.value.trim());
        render(results, input.value.trim());
      }, 250);
    });
  };

  return { buildIndex, bindEvents };
})();

/* ── TOC BUILDER ── */
const TOC = (() => {
  const build = () => {
    const list = $('#toc-list');
    if (!list) return;
    list.innerHTML = `<span class="toc-section-label">الفصول</span>` +
      NOVEL_DATA.chapters.map(ch => `
        <button class="toc-item ${ch.locked ? 'locked' : ''} ${State.readChapters.includes(ch.id) ? 'read' : ''} ${State.currentChapter?.id === ch.id ? 'active' : ''}"
          data-id="${ch.id}" ${ch.locked ? 'disabled aria-disabled="true"' : ''}
          aria-label="${ch.titleAr}${ch.locked ? ' (قريباً)' : ''}">
          <span class="toc-item-status" aria-hidden="true"></span>
          <span class="toc-item-num">${ch.numEn}</span>
          <span class="toc-item-title">${ch.titleAr}</span>
        </button>
      `).join('');

    $$('.toc-item:not(.locked)').forEach(btn => {
      btn.addEventListener('click', () => {
        App.openChapter(parseInt(btn.dataset.id));
        App.closeSidebar();
      });
    });
  };

  const update = (chId) => {
    $$('.toc-item').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.id) === chId);
    });
  };

  const search = (q) => {
    $$('.toc-item').forEach(btn => {
      const title = btn.querySelector('.toc-item-title')?.textContent || '';
      btn.style.display = q && !title.includes(q) ? 'none' : '';
    });
  };

  return { build, update, search };
})();

/* ── PROGRESS TRACKING ── */
const Progress = (() => {
  let ticking = false;

  const update = () => {
    if (State.currentPage !== 'reading') return;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollH = el.scrollHeight - el.clientHeight;
      const pct = scrollH > 0 ? Math.min(100, (scrollTop / scrollH) * 100) : 0;
      $('#reading-progress-fill').style.width = pct + '%';
      // Auto-hide header
      const header = $('#site-header');
      if (scrollTop > 120) {
        header.classList.add('hidden');
      } else {
        header.classList.remove('hidden');
      }
      ticking = false;
    });
  };

  const init = () => {
    window.addEventListener('scroll', update, { passive: true });
  };

  return { init, update };
})();

/* ── REVEAL ANIMATION ── */
const Reveal = (() => {
  let observer;
  const init = () => {
    observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    $$('.reveal').forEach(el => observer.observe(el));
  };
  const refresh = () => $$('.reveal:not(.visible)').forEach(el => observer?.observe(el));
  return { init, refresh };
})();

/* ── MAIN APP ── */
const App = {
  init() {
    this.simulateLoader();
    Particles.init();
    Controls.initFontSize();
    Controls.bindEvents();
    Progress.init();
    this.bindGlobalEvents();
    this.buildChapterCards();
    this.computeStats();
    this.setupHeroCta();
    TOC.build();
    Search.buildIndex();
    Search.bindEvents();
    this.applyTheme();
    this.handleDeepLink();
    setTimeout(() => Reveal.init(), 100);
  },

  simulateLoader() {
    const bar = $('#loader-bar');
    const status = $('#loader-status');
    const steps = [
      [20, 'LOADING WORLD DATA…'],
      [45, 'INITIALIZING PARTICLE ENGINE…'],
      [65, 'BUILDING CHAPTER INDEX…'],
      [82, 'CALIBRATING READER…'],
      [100, 'ARCHIVE READY'],
    ];
    let i = 0;
    const tick = () => {
      if (i >= steps.length) {
        setTimeout(() => $('#loader').classList.add('hidden'), 400);
        return;
      }
      const [pct, msg] = steps[i++];
      bar.style.width = pct + '%';
      status.textContent = msg;
      setTimeout(tick, 280 + Math.random() * 180);
    };
    setTimeout(tick, 300);
  },

  applyTheme() {
    document.body.dataset.theme = State.theme;
    $$('.theme-dot').forEach(d => {
      d.classList.toggle('active', d.dataset.theme === State.theme);
      d.setAttribute('aria-checked', d.dataset.theme === State.theme);
    });
  },

  // New: replaces the hardcoded "3 / ~12k / ~45" hero stats with real
  // numbers derived from NOVEL_DATA, so they stay correct as chapters are added.
  computeStats() {
    const unlocked = NOVEL_DATA.chapters.filter(c => !c.locked);
    const words = unlocked.reduce((sum, c) => sum + c.wordCount, 0);
    const minutes = unlocked.reduce((sum, c) => sum + c.readTime, 0);
    const fmtWords = n => n >= 1000 ? (Math.round(n / 100) / 10) + 'k' : n;
    const chEl = $('#stat-chapters'), wEl = $('#stat-words'), tEl = $('#stat-time');
    if (chEl) chEl.textContent = unlocked.length;
    if (wEl) wEl.textContent = '~' + fmtWords(words);
    if (tEl) tEl.textContent = '~' + minutes;
  },

  // New: figures out where "continue reading" should go — the first
  // unlocked chapter the reader hasn't read yet, or the last one if
  // they're caught up.
  getContinueTarget() {
    const unlocked = NOVEL_DATA.chapters.filter(c => !c.locked);
    const nextUnread = unlocked.find(c => !State.readChapters.includes(c.id));
    if (nextUnread) return nextUnread.id;
    return unlocked.length ? unlocked[unlocked.length - 1].id : 1;
  },

  // New: swaps the hero button between "ابدأ القراءة" and "تابع القراءة"
  // based on existing read-state, and points it at the right chapter.
  setupHeroCta() {
    const group = $('#hero-cta-group');
    const btn = $('#start-reading-btn');
    const target = this.getContinueTarget();
    if (btn) btn.dataset.targetChapter = target;
    if (group) group.dataset.cta = State.readChapters.length > 0 ? 'continue' : 'start';
  },

  handleDeepLink() {
    const hash = location.hash.replace('#', '');
    if (hash.startsWith('ch-')) {
      const id = parseInt(hash.replace('ch-', ''));
      const ch = NOVEL_DATA.chapters.find(c => c.id === id && !c.locked);
      if (ch) { setTimeout(() => this.openChapter(id), 900); }
    }
  },

  buildChapterCards() {
    const list = $('#chapter-cards-list');
    if (!list) return;
    list.innerHTML = NOVEL_DATA.chapters.map(ch => `
      <div class="chapter-card ${ch.locked ? 'locked' : ''} ${State.readChapters.includes(ch.id) ? 'read' : ''} reveal"
        data-id="${ch.id}" role="listitem"
        ${ch.locked ? 'aria-disabled="true"' : `tabindex="0" aria-label="فتح ${ch.titleAr}"`}>
        <div class="chapter-card-status" aria-hidden="true"></div>
        <div class="chapter-num-badge" aria-hidden="true">${String(ch.id).padStart(2,'0')}</div>
        <div class="chapter-card-body">
          <span class="chapter-card-sub">${ch.numEn}</span>
          <h3 class="chapter-card-title">${ch.titleAr}</h3>
          <p class="chapter-card-preview">${ch.preview}</p>
          <div class="chapter-card-meta">
            ${!ch.locked ? `
              <span class="chapter-meta-item">${Icons.book} ${ch.readTime} دقائق</span>
              <span class="chapter-meta-item">${Icons.pen} ${ch.wordCount.toLocaleString('ar')} كلمة</span>
            ` : `<span class="chapter-lock-badge">${Icons.lock} قريباً</span>`}
          </div>
        </div>
      </div>
    `).join('');

    $$('.chapter-card:not(.locked)').forEach(card => {
      const go = () => this.openChapter(parseInt(card.dataset.id));
      card.addEventListener('click', go);
      card.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
  },

  openChapter(id) {
    const ch = NOVEL_DATA.chapters.find(c => c.id === id);
    if (!ch || ch.locked) {
      Toast.show('هذا الفصل غير متاح بعد', 'error');
      return;
    }

    State.currentChapter = ch;
    State.currentPage = 'reading';

    // Update URL
    history.pushState({}, '', `#ch-${id}`);

    // Update UI sections
    $('#home-page').style.display = 'none';
    const rp = $('#reading-page');
    rp.classList.add('active');
    rp.style.display = 'block';

    // Fill chapter hero
    $('#chapter-hero-eyebrow').textContent = 'سقوط الشظية — أرشيف الناجين';
    $('#chapter-hero-num').textContent = ch.numEn;
    $('#chapter-hero-title').textContent = ch.titleAr;

    // Fill content
    const text = $('#reading-text');
    text.innerHTML = ch.content;
    Controls.apply();

    // Nav label
    $('#chapter-nav-label').textContent = `${ch.numLabel}`;

    // Prev/Next
    const allUnlocked = NOVEL_DATA.chapters.filter(c => !c.locked);
    const idx = allUnlocked.findIndex(c => c.id === id);
    const prevBtn = $('#prev-chapter-btn');
    const nextBtn = $('#next-chapter-btn');
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx >= allUnlocked.length - 1;
    if (idx > 0)  prevBtn.onclick = () => this.openChapter(allUnlocked[idx-1].id);
    if (idx < allUnlocked.length - 1) nextBtn.onclick = () => this.openChapter(allUnlocked[idx+1].id);

    // Header info
    const hi = $('#header-chapter-info');
    hi.textContent = ch.titleAr;
    hi.classList.add('visible');

    // Show reading controls
    $('#reading-controls').classList.add('visible');

    // TOC update
    TOC.update(id);

    // Mark as read
    if (!State.readChapters.includes(id)) {
      State.readChapters.push(id);
      save('ff-read', State.readChapters);
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('#reading-progress-fill').style.width = '0%';

    // Update page meta
    document.title = `${ch.titleAr} · سقوط الشظية`;

    // Reveal animations on reading content
    setTimeout(() => Reveal.refresh(), 100);
  },

  goHome() {
    State.currentPage = 'home';
    State.currentChapter = null;
    history.pushState({}, '', location.pathname);
    $('#home-page').style.display = 'block';
    const rp = $('#reading-page');
    rp.classList.remove('active');
    rp.style.display = 'none';
    $('#reading-controls').classList.remove('visible');
    $('#header-chapter-info').classList.remove('visible');
    $('#site-header').classList.remove('hidden');
    $('#reading-progress-fill').style.width = '0%';
    document.title = 'سقوط الشظية | Fragment Fall';
    window.scrollTo({ top: 0, behavior: 'instant' });
    TOC.update(null);
    TOC.build();
    this.buildChapterCards(); // new — refresh read/unread marks after reading
    this.setupHeroCta();       // new — hero CTA may now say "continue" instead of "start"
  },

  openSidebar() {
    State.sidebarOpen = true;
    $('#sidebar').classList.add('open');
    $('#sidebar-overlay').classList.add('visible');
    $('#btn-toc').classList.add('active');
    $('#sidebar').querySelector('input')?.focus();
  },

  closeSidebar() {
    State.sidebarOpen = false;
    $('#sidebar').classList.remove('open');
    $('#sidebar-overlay').classList.remove('visible');
    $('#btn-toc').classList.remove('active');
  },

  openModal(id) {
    State.activeModal = id;
    $(`#${id}`).classList.add('open');
    if (id === 'bookmarks-modal') Bookmarks.render();
    if (id === 'search-modal') setTimeout(() => $('#search-input')?.focus(), 100);
  },

  closeModal() {
    if (State.activeModal) {
      $(`#${State.activeModal}`)?.classList.remove('open');
      State.activeModal = null;
    }
  },

  openShortcuts() {
    $('#shortcuts-overlay').classList.add('open');
  },

  closeShortcuts() {
    $('#shortcuts-overlay').classList.remove('open');
  },

  toggleDistractionFree() {
    State.distractionFree = !State.distractionFree;
    const btn = $('#ctrl-distraction-free');
    if (State.distractionFree) {
      document.body.classList.add('reading-mode');
      $('#site-header').style.display = 'none';
      btn.classList.add('active');
      Toast.show('وضع التركيز — اضغط F للخروج', 'info');
    } else {
      document.body.classList.remove('reading-mode');
      $('#site-header').style.display = '';
      btn.classList.remove('active');
    }
  },

  addBookmark() {
    if (State.currentPage !== 'reading' || !State.currentChapter) {
      Toast.show('افتح فصلاً لإضافة إشارة', 'error');
      return;
    }
    // Get visible text snippet
    const text = $('#reading-text')?.textContent?.substring(0, 200) || '';
    const bm = Bookmarks.add(State.currentChapter.id, text);
    Toast.show('تمت إضافة الإشارة', 'bookmark', 2500);
    $('#ctrl-bookmark').classList.add('active');
    setTimeout(() => $('#ctrl-bookmark').classList.remove('active'), 2000);
  },

  bindGlobalEvents() {
    // Logo → home
    $('#home-link').addEventListener('click', () => this.goHome());
    $('#home-link').addEventListener('keydown', e => { if (e.key === 'Enter') this.goHome(); });

    // Start/continue reading
    $('#start-reading-btn')?.addEventListener('click', (e) => {
      const target = parseInt(e.currentTarget.dataset.targetChapter || '1');
      this.openChapter(target);
    });
    $('#goto-chapters-btn')?.addEventListener('click', () => {
      document.getElementById('chapters-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Header buttons
    $('#btn-toc').addEventListener('click', () => {
      State.sidebarOpen ? this.closeSidebar() : this.openSidebar();
    });
    $('#btn-search').addEventListener('click', () => this.openModal('search-modal'));
    $('#btn-bookmarks').addEventListener('click', () => this.openModal('bookmarks-modal'));
    $('#btn-shortcuts').addEventListener('click', () => this.openShortcuts());

    // Sidebar close
    $('#sidebar-close').addEventListener('click', () => this.closeSidebar());
    $('#sidebar-overlay').addEventListener('click', () => this.closeSidebar());

    // TOC search
    $('#toc-search').addEventListener('input', e => TOC.search(e.target.value));

    // Modal close buttons
    $$('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });

    // Click outside modals
    $$('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) this.closeModal();
      });
    });

    // Shortcuts overlay click
    $('#shortcuts-overlay').addEventListener('click', e => {
      if (e.target === $('#shortcuts-overlay')) this.closeShortcuts();
    });

    // Browser back/forward
    window.addEventListener('popstate', () => {
      const hash = location.hash.replace('#', '');
      if (hash.startsWith('ch-')) {
        const id = parseInt(hash.replace('ch-', ''));
        this.openChapter(id);
      } else {
        this.goHome();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isInput = ['input', 'textarea', 'select'].includes(tag);

      if (e.key === 'Escape') {
        if (State.activeModal) { this.closeModal(); return; }
        if ($('#shortcuts-overlay').classList.contains('open')) { this.closeShortcuts(); return; }
        if (State.sidebarOpen) { this.closeSidebar(); return; }
        if (State.distractionFree) { this.toggleDistractionFree(); return; }
      }

      if (isInput) return;

      switch (e.key.toLowerCase()) {
        case 's': this.openModal('search-modal'); break;
        case 'b':
          if (State.currentPage === 'reading') this.addBookmark();
          else this.openModal('bookmarks-modal');
          break;
        case 't': State.sidebarOpen ? this.closeSidebar() : this.openSidebar(); break;
        case 'h': this.goHome(); break;
        case 'f': if (State.currentPage === 'reading') this.toggleDistractionFree(); break;
        case '?': case '/': this.openShortcuts(); break;
        case '+': case '=':
          if (State.fontSize < 28) { State.fontSize += 2; Controls.apply(); } break;
        case '-':
          if (State.fontSize > 12) { State.fontSize -= 2; Controls.apply(); } break;
        case 'arrowright':
          if (State.currentPage === 'reading') {
            $('#next-chapter-btn')?.click();
          }
          break;
        case 'arrowleft':
          if (State.currentPage === 'reading') {
            $('#prev-chapter-btn')?.click();
          }
          break;
      }
    });
  }
};

/* ── BOOT ── */
document.addEventListener('DOMContentLoaded', () => App.init());
