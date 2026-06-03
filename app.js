/* ─────────────────────────────────────────
   NEXT AI // TODAY  ·  app.js
   Modules: StateManager · DataLoader · UIRenderer
            NavigationController · SwipeHandler · init
───────────────────────────────────────── */

/* ── 1. StateManager ─────────────────── */
const State = {
  articles: [],
  total: 0,
  current: 0,
  hasInteracted: false,

  set(index) {
    this.current = Math.max(0, Math.min(index, this.total - 1));
  }
};

/* ── 2. DataLoader ───────────────────── */
const DataLoader = {
  load() {
    if (typeof aiArticles === 'undefined' || !Array.isArray(aiArticles)) {
      console.warn('data.js: aiArticles not found — using fallback');
      State.articles = [{
        type: 'news', category: 'AI', duration: 8,
        title: 'אין כתבות זמינות',
        description: 'לא נמצאו כתבות. יש לעדכן את data.js.',
        summary: '', target_audience: '', link: '#'
      }];
    } else {
      State.articles = aiArticles;
    }
    State.total = State.articles.length;
  },

  getLastUpdated() {
    if (typeof lastUpdatedTime !== 'undefined' && lastUpdatedTime) {
      return lastUpdatedTime;
    }
    const now = new Date();
    return now.toLocaleDateString('he-IL') + ' ' + now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }
};

/* ── 3. UIRenderer ───────────────────── */
const UIRenderer = {

  init() {
    this.track     = document.getElementById('cards-track');
    this.indicators= document.getElementById('story-indicators');
    this.liveDate  = document.getElementById('live-date');
    this.hint      = document.getElementById('swipe-hint');
  },

  renderAll() {
    this.renderHeader();
    this.renderIndicators();
    this.renderCards();
    this.updatePosition(false);
    this.updateIndicators();
  },

  renderHeader() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    const updated = DataLoader.getLastUpdated();
    this.liveDate.innerHTML =
      `<span>${dateStr}</span>` +
      `<span class="updated-label">עודכן: ${updated}</span>`;
  },

  renderIndicators() {
    this.indicators.innerHTML = State.articles.map((_, i) =>
      `<div class="story-bar" data-index="${i}" role="button" aria-label="כתבה ${i + 1}"></div>`
    ).join('');

    this.indicators.querySelectorAll('.story-bar').forEach(bar => {
      bar.addEventListener('click', () => {
        NavigationController.goTo(parseInt(bar.dataset.index));
      });
    });
  },

  updateIndicators() {
    const bars = this.indicators.querySelectorAll('.story-bar');
    bars.forEach((bar, i) => {
      bar.classList.remove('active', 'done');
      if (i === State.current) bar.classList.add('active');
      else if (i < State.current) bar.classList.add('done');
    });
  },

  renderCards() {
    this.track.innerHTML = State.articles.map((a, i) =>
      this.cardHTML(a, i)
    ).join('');
  },

  cardHTML(a, i) {
    const typeLabels = {
      news: '📰 חדשות', tool: '🛠 כלי', research: '🔬 מחקר', business: '💼 עסקים'
    };
    const typeLabel = typeLabels[a.type] || a.type;

    return `
    <article class="card" data-index="${i}" role="article" aria-label="${a.title}">
      <div class="card-counter">${i + 1} / ${State.total}</div>
      <div class="card-strip">
        <span class="card-category">${a.category}</span>
        <span class="card-type">${typeLabel}</span>
      </div>
      <div class="card-body">
        <h2 class="card-title">${a.title}</h2>
        <p class="card-description">${a.description}</p>
        ${a.summary ? `<div class="card-divider"></div><p class="card-summary">${a.summary}</p>` : ''}
        ${a.target_audience ? `
        <div class="card-audience-block">
          <span class="audience-icon" aria-hidden="true">🎯</span>
          <div class="audience-text-wrap">
            <span class="audience-label">קהל יעד</span>
            <span class="audience-value">${a.target_audience}</span>
          </div>
        </div>` : ''}
      </div>
      <div class="card-footer">
        <a href="${a.link}" target="_blank" rel="noopener noreferrer" class="btn-link">
          מעבר לאתר הרשמי
          <span class="btn-arrow" aria-hidden="true">←</span>
        </a>
      </div>
    </article>`;
  },

  updatePosition(animated = true) {
    if (!animated) this.track.classList.add('dragging');
    const cardW = this.track.parentElement.clientWidth - 32; // padding 16px x2
    const gap = 16;
    const offset = State.current * (cardW + gap);
    this.track.style.transform = `translateX(${offset}px)`;
    if (!animated) {
      // force reflow then re-enable transitions
      this.track.offsetHeight;
      this.track.classList.remove('dragging');
    }
  },

  applyDragOffset(dx) {
    this.track.classList.add('dragging');
    const cardW = this.track.parentElement.clientWidth - 32;
    const gap = 16;
    const base = State.current * (cardW + gap);
    this.track.style.transform = `translateX(${base + dx}px)`;
  },

  snapBack() {
    this.track.classList.remove('dragging');
    this.updatePosition();
  },

  hideHint() {
    if (this.hint) this.hint.classList.add('hidden');
  }
};

/* ── 4. NavigationController ─────────── */
const NavigationController = {
  goTo(index) {
    if (index < 0 || index >= State.total) return;
    State.set(index);
    UIRenderer.track.classList.remove('dragging');
    UIRenderer.updatePosition();
    UIRenderer.updateIndicators();
  },

  goNext() { this.goTo(State.current + 1); },
  goPrev() { this.goTo(State.current - 1); }
};

/* ── 5. SwipeHandler ─────────────────── */
const SwipeHandler = {
  startX: 0,
  startY: 0,
  currentX: 0,
  isDragging: false,
  isScrolling: null,  // null = undecided, true = vertical scroll, false = horizontal swipe
  THRESHOLD: 50,
  VELOCITY_THRESHOLD: 0.3,
  startTime: 0,

  bind() {
    const el = document.getElementById('cards-container');

    // Touch
    el.addEventListener('touchstart',  e => this.onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    el.addEventListener('touchmove',   e => this.onMove(e.touches[0].clientX, e.touches[0].clientY, e), { passive: false });
    el.addEventListener('touchend',    e => this.onEnd(e.changedTouches[0].clientX), { passive: true });
    el.addEventListener('touchcancel', () => this.cancel());

    // Mouse (desktop testing)
    el.addEventListener('mousedown',  e => { this.onStart(e.clientX, e.clientY); el.style.cursor = 'grabbing'; });
    window.addEventListener('mousemove', e => { if (this.isDragging) this.onMove(e.clientX, e.clientY, e); });
    window.addEventListener('mouseup',   e => { if (this.isDragging) { this.onEnd(e.clientX); el.style.cursor = ''; } });
  },

  onStart(x, y) {
    this.startX    = x;
    this.startY    = y;
    this.currentX  = x;
    this.isDragging = true;
    this.isScrolling = null;
    this.startTime  = Date.now();
  },

  onMove(x, y, e) {
    if (!this.isDragging) return;
    const dx = x - this.startX;
    const dy = y - this.startY;

    // Decide axis on first meaningful move
    if (this.isScrolling === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      this.isScrolling = Math.abs(dy) > Math.abs(dx);
    }

    if (this.isScrolling) return; // let native scroll handle it

    e.preventDefault(); // block scroll during horizontal swipe
    this.currentX = x;

    // Rubber-band resistance at edges
    let resistance = 1;
    if ((State.current === 0 && dx > 0) || (State.current === State.total - 1 && dx < 0)) {
      resistance = 0.25;
    }
    UIRenderer.applyDragOffset(dx * resistance);
  },

  onEnd(x) {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (this.isScrolling) return; // was a scroll gesture

    const dx       = x - this.startX;
    const elapsed  = Date.now() - this.startTime;
    const velocity = Math.abs(dx) / elapsed;
    const isFlick  = velocity > this.VELOCITY_THRESHOLD;

    if (State.current < State.total - 1 && (dx < -this.THRESHOLD || (isFlick && dx < 0))) {
      NavigationController.goNext();
      UIRenderer.hideHint();
    } else if (State.current > 0 && (dx > this.THRESHOLD || (isFlick && dx > 0))) {
      NavigationController.goPrev();
      UIRenderer.hideHint();
    } else {
      UIRenderer.snapBack();
    }

    if (!State.hasInteracted && Math.abs(dx) > 10) {
      State.hasInteracted = true;
      UIRenderer.hideHint();
    }
  },

  cancel() {
    this.isDragging = false;
    UIRenderer.snapBack();
  }
};

/* ── 6. Keyboard navigation ──────────── */
function bindKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown')  NavigationController.goNext();
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp')    NavigationController.goPrev();
  });
}

/* ── 7. init ─────────────────────────── */
function init() {
  DataLoader.load();
  UIRenderer.init();
  UIRenderer.renderAll();
  SwipeHandler.bind();
  bindKeyboard();

  // Update position correctly after layout is painted
  requestAnimationFrame(() => {
    UIRenderer.updatePosition(false);
  });
}

document.addEventListener('DOMContentLoaded', init);
