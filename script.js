/* ============================================================
   WALEED MODERN INVESTMENT — v4
   Catalog filters + search · order basket → one WhatsApp message
   ============================================================ */
(function () {
  'use strict';
  const SITE = window.SITE || { whatsapp: '96890206784', products: {}, t: {}, units: ['كرتونة', 'حبة'] };
  const P = SITE.products, T = SITE.t, UNITS = SITE.units;
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

  /* ── Analytics (works with GA4 or GoatCounter if configured in products.json) ── */
  function track(name, params) {
    try {
      if (window.gtag) gtag('event', name, params || {});
      if (window.goatcounter && goatcounter.count) goatcounter.count({ path: 'event/' + name, title: name, event: true });
    } catch (_) {}
  }
  document.addEventListener('click', e => { const a = e.target.closest('[data-track]'); if (a) track(a.dataset.track); });

  /* ── Optional order log (Google Apps Script web app URL in products.json) ── */
  function logOrder(payload) {
    if (!SITE.orderLog) return;
    try {
      const body = JSON.stringify(Object.assign({ ts: new Date().toISOString(), lang: SITE.lang, page: location.href }, payload));
      if (!(navigator.sendBeacon && navigator.sendBeacon(SITE.orderLog, new Blob([body], { type: 'text/plain' }))))
        fetch(SITE.orderLog, { method: 'POST', mode: 'no-cors', body, keepalive: true });
    } catch (_) {}
  }
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  };

  /* ── WhatsApp ── */
  function openWhatsApp(lines) {
    const url = 'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(lines.join('\n'));
    const w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  }
  const normPhone = v => v.replace(/[\s\-()]/g, '').replace(/^00/, '+');
  const validPhone = v => /^\+?\d{8,15}$/.test(normPhone(v));

  /* ── Toast ── */
  const toastEl = $('#toast'); let toastT;
  function toast(msg, action) {
    toastEl.innerHTML = '';
    toastEl.append(document.createTextNode(msg));
    if (action) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = action.label;
      b.addEventListener('click', () => { action.run(); toastEl.hidden = true; });
      toastEl.append(b);
    }
    toastEl.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, 3200);
  }

  /* ── Nav ── */
  const nav = $('#nav'), toTop = $('#toTop');
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 8);
    toTop && toTop.classList.toggle('is-on', y > 700);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  toTop && toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  const burger = $('.burger'), drawer = $('#drawer');
  function setDrawer(open) {
    drawer.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? T.menu_close : T.menu_open);
  }
  burger.addEventListener('click', () => setDrawer(drawer.hidden));
  drawer.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    const id = a.getAttribute('href');
    setDrawer(false);
    if (id && id.startsWith('#') && id.length > 1) {   // scroll after the drawer has collapsed, so the target lands under the header
      e.preventDefault();
      const el = document.querySelector(id);
      requestAnimationFrame(() => el && el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }));
      history.replaceState(null, '', id);
    }
  });
  document.addEventListener('click', e => { if (!drawer.hidden && !e.target.closest('#nav')) setDrawer(false); });

  // active section in menu
  const menuLinks = $$('.menu a');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      menuLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-40% 0px -55% 0px' });
    $$('main section[id]').forEach(s => io.observe(s));
  }

  /* ── Hero slider ── */
  (function () {
    // load the other hero images only after the first one has painted (keeps LCP fast)
    addEventListener('load', () => setTimeout(() => $$('.hs img[data-src]').forEach(im => { im.src = im.dataset.src; im.removeAttribute('data-src'); }), 300));
    const slides = $$('.hs'), dots = $$('.hs-dot'), brand = $('#hsBrand'), name = $('#hsName');
    if (slides.length < 2) return;
    let i = 0, t;
    function go(n) {
      slides[i].classList.remove('is-active'); dots[i].classList.remove('is-active');
      i = (n + slides.length) % slides.length;
      const s = slides[i];
      s.classList.add('is-active'); dots[i].classList.add('is-active');
      brand.style.opacity = name.style.opacity = '0';
      setTimeout(() => {
        brand.textContent = s.dataset.label; brand.className = 'chip chip-' + s.dataset.brand;
        name.textContent = s.dataset.name;
        brand.style.opacity = name.style.opacity = '1';
      }, 180);
    }
    const start = () => { if (reduce) return; stop(); t = setInterval(() => go(i + 1), 3400); };
    const stop = () => clearInterval(t);
    dots.forEach((d, n) => d.addEventListener('click', () => { go(n); start(); }));
    const stage = $('.hero-stage');
    stage.addEventListener('mouseenter', stop); stage.addEventListener('mouseleave', start);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    start();
  })();

  /* ── Catalog: tabs, brand chips, search ── */
  const catalog = $('#catalog'), rows = $$('.brand-row'), cards = $$('.pc'), empty = $('#empty');
  const tabs = $$('.tab'), chips = $$('.bchip'), q = $('#q');
  const state = { group: 'all', brand: null, q: '' };
  const norm = s => s.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '').trim();
  cards.forEach(c => { c._s = norm(c.dataset.search); });

  function applyFilters() {
    const terms = norm(state.q).split(/\s+/).filter(Boolean);
    let shown = 0;
    rows.forEach(row => {
      const okRow = (state.group === 'all' || row.dataset.group === state.group) && (!state.brand || row.dataset.brand === state.brand);
      let n = 0;
      row.querySelectorAll('.pc').forEach(c => {
        const ok = okRow && terms.every(t => c._s.includes(t));
        c.classList.toggle('is-hidden', !ok); if (ok) n++;
      });
      row.classList.toggle('is-hidden', n === 0); shown += n;
    });
    empty.hidden = shown > 0;
    catalog.classList.toggle('is-filtered', state.group !== 'all' || !!state.brand || terms.length > 0);
    tabs.forEach(t => { const on = t.dataset.group === state.group && !state.brand; t.classList.toggle('is-active', on); t.setAttribute('aria-pressed', String(on)); });
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.brand === state.brand)));
  }
  tabs.forEach(t => t.addEventListener('click', () => { state.group = t.dataset.group; state.brand = null; applyFilters(); }));
  chips.forEach(c => c.addEventListener('click', () => {
    state.brand = state.brand === c.dataset.brand ? null : c.dataset.brand; state.group = 'all'; applyFilters();
  }));
  let qT; q.addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(() => { state.q = q.value; applyFilters(); }, 120); });

  function jumpToBrand(id) {
    state.brand = id; state.group = 'all'; state.q = ''; q.value = ''; applyFilters();
    $('#products').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  $$('[data-jump-brand]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); jumpToBrand(el.dataset.jumpBrand); }));

  /* ── Dialog helpers ── */
  let lastFocus = null;
  function openDlg(el, focus) {
    lastFocus = document.activeElement;
    toastEl.hidden = true;
    el.hidden = false; document.body.classList.add('locked');
    requestAnimationFrame(() => { el.classList.add('is-open'); (focus || el.querySelector('[data-close], button'))?.focus(); });
  }
  function closeDlg(el) {
    el.classList.remove('is-open'); document.body.classList.remove('locked');
    setTimeout(() => { el.hidden = true; }, 220);
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  }
  $$('.overlay').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) closeDlg(ov); });
    ov.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeDlg(ov); return; }
      if (e.key !== 'Tab') return;
      const f = $$('button, a[href], input, select, textarea', ov).filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  });

  /* ── Cart (persisted) ── */
  let cart = store.get('wm_cart', []).filter(it => P[it.id]).map(it => ({ ...it, unit: typeof it.unit === 'number' ? it.unit : (it.unit === 'حبة' ? 1 : 0) }));
  const cartEl = $('#cart'), itemsEl = $('#cartItems'), emptyEl = $('#cartEmpty'), formEl = $('#cartForm');
  const save = () => store.set('wm_cart', cart);
  const totalLines = () => cart.length;

  function addToCart(id, qty = 1, unit = 0) {
    const ex = cart.find(it => it.id === id && it.unit === unit);
    if (ex) ex.qty = Math.min(9999, ex.qty + qty); else cart.push({ id, qty, unit });
    save(); renderCart(true);
    track('add_to_cart', { item_id: id, quantity: qty });
    toast(fmt(T.added, { n: P[id].name }), { label: T.view_cart, run: () => openDlg(cartEl) });
  }
  function renderCart(bump) {
    const n = totalLines();
    $$('[data-cart-count]').forEach(b => { b.textContent = n; b.hidden = n === 0; if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } });
    $$('[data-cart-count-inline]').forEach(b => { b.textContent = n; });
    emptyEl.hidden = n > 0; formEl.hidden = n === 0; itemsEl.hidden = n === 0;
    itemsEl.innerHTML = '';
    cart.forEach((it, idx) => {
      const p = P[it.id];
      const li = document.createElement('li'); li.className = 'ci-row';
      li.innerHTML = `<img src="${p.img}" alt="" width="56" height="64" loading="lazy"/>
        <div><b></b><small></small>
          <div class="qty qty-sm" style="margin-top:6px;width:fit-content">
            <button type="button" data-d="-1" aria-label="تقليل">−</button>
            <input type="number" min="1" max="9999" inputmode="numeric" aria-label="الكمية"/>
            <button type="button" data-d="1" aria-label="زيادة">+</button>
          </div></div>
        <div class="ci-ctrl">
          <button type="button" class="ci-del" aria-label="${T.del_}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
          <select aria-label="">${UNITS.map((u, i) => `<option value="${i}">${u}</option>`).join('')}</select>
        </div>`;
      li.querySelector('b').textContent = p.name;
      li.querySelector('small').textContent = p.brand;
      const inp = li.querySelector('input'); inp.value = it.qty;
      const sel = li.querySelector('select'); sel.value = String(it.unit);
      li.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => {
        it.qty = Math.max(1, Math.min(9999, it.qty + +b.dataset.d)); inp.value = it.qty; save();
      }));
      inp.addEventListener('change', () => { it.qty = Math.max(1, Math.min(9999, parseInt(inp.value, 10) || 1)); inp.value = it.qty; save(); });
      sel.addEventListener('change', () => { it.unit = +sel.value; save(); });
      li.querySelector('.ci-del').addEventListener('click', () => {
        const removed = cart.splice(idx, 1)[0]; save(); renderCart();
        toast(fmt(T.removed, { n: p.name }), { label: T.undo, run: () => { cart.splice(idx, 0, removed); save(); renderCart(); } });
      });
      itemsEl.append(li);
    });
    $$('.pc').forEach(c => {
      const inCart = cart.some(it => it.id === c.dataset.id);
      const btn = c.querySelector('.pc-add');
      btn.classList.toggle('is-in', inCart);
      btn.querySelector('span').textContent = inCart ? T.in_cart : T.add;
    });
  }
  $$('[data-open-cart]').forEach(b => b.addEventListener('click', () => openDlg(cartEl)));
  $('#cartClear').addEventListener('click', () => {
    const old = cart; cart = []; save(); renderCart();
    toast(T.cleared, { label: T.undo, run: () => { cart = old; save(); renderCart(); } });
  });

  // customer details remembered between visits
  const cust = store.get('wm_customer', {});
  const ck = { name: $('#ckName'), phone: $('#ckPhone'), city: $('#ckCity'), shop: $('#ckShop'), note: $('#ckNote') };
  ['name', 'phone', 'city', 'shop'].forEach(k => { if (cust[k]) ck[k].value = cust[k]; });

  function formError(form, msg, el) {
    const box = form.querySelector('.form-error');
    form.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
    if (!msg) { box.hidden = true; return false; }
    box.textContent = msg; box.hidden = false;
    if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); }
    return true;
  }

  [formEl, $('#contactForm')].forEach(f => f.addEventListener('input', () => { const b = f.querySelector('.form-error'); if (!b.hidden) { b.hidden = true; f.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid')); } }));

  formEl.addEventListener('submit', e => {
    e.preventDefault();
    if (!cart.length) return;
    const v = k => ck[k].value.trim();
    if (!v('name')) return formError(formEl, T.err_name, ck.name);
    if (!validPhone(v('phone'))) return formError(formEl, T.err_phone, ck.phone);
    formError(formEl, null);
    store.set('wm_customer', { name: v('name'), phone: v('phone'), city: v('city'), shop: v('shop') });
    const lines = [T.order_head, ''];
    cart.forEach((it, n) => {
      const p = P[it.id];
      lines.push(`${n + 1}) ${p.brand} — ${p.name}: ${it.qty} ${UNITS[it.unit] || UNITS[0]}` + (p.pack && it.unit === 0 ? ` (${T.pack}: ${p.pack})` : ''));
    });
    lines.push('', T.items + ': ' + cart.length, '', T.name + ': ' + v('name'), T.phone + ': ' + v('phone'));
    if (v('shop')) lines.push(T.shop + ': ' + v('shop'));
    if (v('city')) lines.push(T.city + ': ' + v('city'));
    if (v('note')) lines.push(T.note + ': ' + v('note'));
    logOrder({ type: 'order', name: v('name'), phone: v('phone'), city: v('city'), shop: v('shop'), note: v('note'),
      items: cart.map(it => ({ id: it.id, product: P[it.id].brand + ' — ' + P[it.id].name, qty: it.qty, unit: UNITS[it.unit] })) });
    track('send_order', { items: cart.length });
    openWhatsApp(lines);
    toast(T.sent, { label: T.clear, run: () => { cart = []; save(); renderCart(); } });
  });

  /* ── Product dialog ── */
  const pd = $('#pd'); let pdId = null;
  function openProduct(id) {
    const p = P[id]; if (!p) return; pdId = id;
    $('#pdImg').src = p.full; $('#pdImg').alt = p.brand + ' ' + p.name;
    $('#pdMedia').className = 'pd-media bg-' + p.brandId;
    const chip = $('#pdBrand'); chip.textContent = p.brand; chip.className = 'chip chip-' + p.brandId;
    $('#pdCat').textContent = p.category; $('#pdName').textContent = p.name;
    $('#pdTags').innerHTML = ''; p.tags.forEach(t => { const s = document.createElement('span'); s.textContent = t; $('#pdTags').append(s); });
    $('#pdQty').value = 1;
    openDlg(pd, $('#pdQty'));
  }
  $$('.qty[data-qty] [data-step]').forEach(b => b.addEventListener('click', () => {
    const i = $('#pdQty'); i.value = Math.max(1, Math.min(9999, (parseInt(i.value, 10) || 1) + +b.dataset.step));
  }));
  $('#pdAdd').addEventListener('click', () => {
    const qty = Math.max(1, parseInt($('#pdQty').value, 10) || 1);
    addToCart(pdId, qty, $('#pdUnit').selectedIndex); closeDlg(pd);
  });
  catalog.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) { addToCart(add.dataset.add, 1, 0); return; }
    const open = e.target.closest('.pc-open');
    if (open) { const id = open.closest('.pc').dataset.id; track('view_item', { item_id: id }); openProduct(id); }
  });

  /* ── Contact form → WhatsApp ── */
  const cf = $('#contactForm');
  cf.addEventListener('submit', e => {
    e.preventDefault();
    const f = cf.elements, v = k => f[k].value.trim();
    if (!v('name')) return formError(cf, T.err_name, f.name);
    if (!validPhone(v('phone'))) return formError(cf, T.err_phone, f.phone);
    if (!v('message')) return formError(cf, T.err_msg, f.message);
    formError(cf, null);
    const lines = [T.msg_head, '', T.type + ': ' + f.type.value, T.name + ': ' + v('name'), T.phone + ': ' + v('phone')];
    if (v('city')) lines.push(T.city + ': ' + v('city'));
    lines.push('', v('message'));
    logOrder({ type: 'message', name: v('name'), phone: v('phone'), city: v('city'), request: f.type.value, message: v('message') });
    track('send_message');
    openWhatsApp(lines); cf.reset();
  });

  /* ── Lightbox ── */
  const lb = $('#lb');
  $$('.gal').forEach(g => g.addEventListener('click', () => {
    $('#lbImg').src = g.dataset.full; $('#lbImg').alt = g.querySelector('img').alt; openDlg(lb);
  }));

  /* ── Videos: one at a time ── */
  const vids = $$('.vid video');
  vids.forEach(v => {
    const fr = v.closest('.vid-frame');
    fr.querySelector('.vid-play').addEventListener('click', () => { v.controls = true; v.play(); track('video_play', { video: v.getAttribute('src') }); });
    v.addEventListener('play', () => { fr.classList.add('is-playing'); vids.forEach(o => o !== v && o.pause()); });
    v.addEventListener('pause', () => fr.classList.remove('is-playing'));
  });

  /* ── Hero counter ── */
  const dd = $('[data-count]');
  if (dd && !reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (!es[0].isIntersecting) return; io.disconnect();
      const to = +dd.dataset.count, t0 = performance.now();
      const step = now => { const p = Math.min(1, (now - t0) / 1100); dd.textContent = '+' + Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }); io.observe(dd);
  }

  /* ── Founder "read more" (mobile) ── */
  const foBtn = $('.fo-more'), foText = $('#foText');
  foBtn && foBtn.addEventListener('click', () => {
    const open = foText.classList.toggle('is-open');
    foBtn.setAttribute('aria-expanded', String(open));
    foBtn.textContent = open ? foBtn.dataset.less : foBtn.dataset.more;
  });

  $('#year').textContent = new Date().getFullYear();
  renderCart();
  applyFilters();
})();
