/* ============================================================
   WALEED MODERN INVESTMENT — SITE SCRIPT (v3)
   ============================================================ */
(function () {
  'use strict';

  const WHATSAPP = (window.SITE && window.SITE.whatsapp) || '96890206784';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function openWhatsApp(lines) {
    const url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines.join('\n'));
    const win = window.open(url, '_blank', 'noopener');
    if (!win) window.location.href = url; // popup blocked (e.g. in-app browsers)
  }

  // Omani numbers: 8 digits starting with 2/7/9, optionally with +968 / 00968
  function validPhone(v) {
    const d = v.replace(/[\s\-()]/g, '').replace(/^(\+|00)/, '');
    return /^\d{8,15}$/.test(d);
  }

  /* ── 1. LOADER — never block content for long ── */
  function hideLoader() {
    const loader = $('#loader');
    document.body.classList.remove('loading');
    document.body.classList.add('hero-loaded');
    if (!loader) return;
    loader.classList.add('hide');
    setTimeout(() => loader.remove(), 600);
  }
  if (document.readyState === 'complete') setTimeout(hideLoader, 200);
  else window.addEventListener('load', () => setTimeout(hideLoader, 200), { once: true });
  setTimeout(hideLoader, 2500); // safety net on slow networks

  /* ── 2. NAV: scrolled state, back-to-top ── */
  const nav = $('#nav');
  const backTop = $('#backTop');
  const onScroll = () => {
    const y = window.scrollY;
    nav && nav.classList.toggle('scrolled', y > 40);
    backTop && backTop.classList.toggle('visible', y > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backTop && backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  /* ── 3. MOBILE MENU ── */
  const drawer = $('#navDrawer');
  const burger = $('.nav-burger');
  function setMenu(open) {
    if (!drawer || !burger) return;
    drawer.classList.toggle('open', open);
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
  }
  burger && burger.addEventListener('click', () => setMenu(!drawer.classList.contains('open')));
  document.addEventListener('click', e => {
    if (drawer && drawer.classList.contains('open') && !e.target.closest('#nav')) setMenu(false);
  });

  /* ── 4. SMOOTH ANCHOR SCROLL (offset for fixed nav) ── */
  function scrollToEl(el) {
    const top = el.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight + 8 : 80);
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      scrollToEl(target);
      history.replaceState(null, '', id);
    });
  });

  /* ── 5. SCROLL REVEAL ── */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = parseInt(entry.target.dataset.delay || 0, 10);
        setTimeout(() => entry.target.classList.add('revealed'), delay);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('revealed'));
  }

  /* ── 6. PRODUCT FILTER ── */
  const filterBtns = $$('.pf');
  function filterProducts(cat) {
    filterBtns.forEach(b => {
      const on = b.dataset.filter === cat;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    $$('.brand-section').forEach(section => {
      const show = cat === 'all' || section.dataset.cat === cat || section.dataset.group === cat;
      section.hidden = !show;
      if (show && !reduceMotion) {
        section.querySelectorAll('.pcard').forEach((card, i) => {
          card.style.animation = 'none';
          void card.offsetHeight;
          card.style.animation = `pcardIn .4s ease ${Math.min(i, 8) * 50}ms both`;
        });
      }
    });
  }
  filterBtns.forEach(btn => btn.addEventListener('click', () => filterProducts(btn.dataset.filter)));

  // Buttons/links elsewhere that jump to a filtered product list
  function jumpToFilter(cat) {
    filterProducts(cat);
    const products = $('#products');
    if (products) scrollToEl(products);
    // make the matching filter button visible when the bar scrolls horizontally (mobile)
    const btn = filterBtns.find(b => b.dataset.filter === cat);
    btn && btn.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  $$('.js-filter').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    e.stopImmediatePropagation();
    jumpToFilter(el.dataset.filter);
  }, true));
  $$('.cat-card[data-group]').forEach(card => card.addEventListener('click', e => {
    e.preventDefault();
    e.stopImmediatePropagation();
    // categories map to groups: show all brands in the group
    filterBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    $$('.brand-section').forEach(s => { s.hidden = s.dataset.group !== card.dataset.group; });
    const products = $('#products');
    if (products) scrollToEl(products);
  }, true));

  /* ── 7. HERO PRODUCT SLIDER ── */
  (function heroSlider() {
    const slides = $$('.hs-slide');
    const dots = $$('.hs-dot');
    const pill = $('#hsBrandPill');
    const name = $('#hsProductName');
    const stage = $('.hero-product');
    if (slides.length < 2) return;
    let current = 0, timer = null;

    function goTo(idx) {
      const prev = slides[current];
      prev.classList.remove('active');
      prev.classList.add('exit');
      setTimeout(() => prev.classList.remove('exit'), 500);
      dots[current] && dots[current].classList.remove('active');
      current = (idx + slides.length) % slides.length;
      const s = slides[current];
      s.classList.add('active');
      dots[current] && dots[current].classList.add('active');
      if (pill && name) {
        pill.style.opacity = name.style.opacity = '0';
        setTimeout(() => {
          pill.textContent = s.dataset.label || '';
          pill.className = 'hs-brand-pill pbrand-' + (s.dataset.brand || '');
          name.textContent = s.dataset.name || '';
          pill.style.opacity = name.style.opacity = '1';
        }, 200);
      }
    }
    const start = () => { if (!reduceMotion) { stop(); timer = setInterval(() => goTo(current + 1), 3200); } };
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); start(); }));
    if (stage) {
      stage.addEventListener('mouseenter', stop);
      stage.addEventListener('mouseleave', start);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    start();
  })();

  /* ── 8. HERO COUNTERS ── */
  function animateCounter(el) {
    const target = parseInt(el.dataset.count, 10);
    const prefix = el.dataset.prefix || '';
    if (!target || reduceMotion) return;
    const t0 = performance.now(), dur = 1200;
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = prefix + Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const heroNums = $('.hero-nums');
  if (heroNums && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.querySelectorAll('b[data-count]').forEach(animateCounter);
        cio.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    cio.observe(heroNums);
  }

  /* ── 9. MARQUEE pause on hover ── */
  const marquee = $('.marquee');
  if (marquee) {
    const track = $('.marquee-track', marquee);
    marquee.addEventListener('mouseenter', () => { track.style.animationPlayState = 'paused'; });
    marquee.addEventListener('mouseleave', () => { track.style.animationPlayState = 'running'; });
  }

  /* ── 10. ACTIVE NAV LINK ── */
  const navLinks = $$('.nav-menu a[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    const nio = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = '#' + entry.target.id;
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    $$('main section[id]').forEach(s => nio.observe(s));
  }

  /* ── 11. MODAL helpers (focus trap + scroll lock) ── */
  let lastFocus = null;
  function openDialog(overlay, focusEl) {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => {
      overlay.classList.add('open');
      (focusEl || overlay.querySelector('button, input, select, textarea, a[href]'))?.focus();
    });
  }
  function closeDialog(overlay) {
    overlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { overlay.hidden = true; }, 250);
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  function trapFocus(overlay, e) {
    if (e.key !== 'Tab') return;
    const f = $$('button, input, select, textarea, a[href]', overlay).filter(el => !el.disabled && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ── 12. PRODUCT ORDER MODAL ── */
  const pm = {
    overlay: $('#pmOverlay'), form: $('#pmForm'), img: $('#pmImg'), brand: $('#pmBrandTag'),
    cat: $('#pmCat'), name: $('#pmProductName'), meta: $('#pmMeta'), qty: $('#pmQty'), unit: $('#pmUnit'),
    cust: $('#pmName'), phone: $('#pmPhone'), msg: $('#pmMsg'), err: $('#pmError'),
  };
  let product = null;

  function openProduct(card) {
    if (!pm.overlay) return;
    const img = card.querySelector('.pimg-main');
    const tag = card.querySelector('.pbrand-tag');
    product = {
      name: card.querySelector('h3')?.textContent.trim() || 'منتج',
      category: card.querySelector('.pcard-cat')?.textContent.trim() || '',
      brand: tag ? tag.textContent.trim() : '',
      brandKey: card.dataset.cat || '',
      img: img ? img.getAttribute('src') : '',
      tags: $$('.pcard-tags span', card).map(s => s.textContent.trim()),
    };
    pm.img.src = product.img; pm.img.alt = product.brand + ' ' + product.name;
    pm.brand.textContent = product.brand;
    pm.brand.className = 'pbrand-tag pbrand-' + product.brandKey;
    pm.overlay.querySelector('.pm-media').className = 'pm-media pcard-bg-' + product.brandKey;
    pm.cat.textContent = product.category;
    pm.name.textContent = product.name;
    pm.meta.innerHTML = '';
    product.tags.forEach(t => { const s = document.createElement('span'); s.textContent = t; pm.meta.appendChild(s); });
    pm.qty.value = 1;
    pm.err.hidden = true;
    // remember the customer between orders
    try {
      pm.cust.value = localStorage.getItem('wm_name') || '';
      pm.phone.value = localStorage.getItem('wm_phone') || '';
    } catch (_) {}
    openDialog(pm.overlay, pm.cust.value ? pm.qty : pm.cust);
  }

  document.addEventListener('click', e => {
    const card = e.target.closest('.pcard');
    if (!card) return;
    if (e.target.closest('a')) return;
    openProduct(card);
  });
  document.addEventListener('keydown', e => {
    const card = e.target.closest && e.target.closest('.pcard');
    if (card && (e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); openProduct(card); }
  });

  if (pm.overlay) {
    $('#pmClose').addEventListener('click', () => closeDialog(pm.overlay));
    pm.overlay.addEventListener('click', e => { if (e.target === pm.overlay) closeDialog(pm.overlay); });
    pm.overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDialog(pm.overlay);
      trapFocus(pm.overlay, e);
    });
    $('#pmQtyMinus').addEventListener('click', () => { pm.qty.value = Math.max(1, (parseInt(pm.qty.value, 10) || 1) - 1); });
    $('#pmQtyPlus').addEventListener('click', () => { pm.qty.value = Math.min(9999, (parseInt(pm.qty.value, 10) || 1) + 1); });

    pm.form.addEventListener('submit', e => {
      e.preventDefault();
      if (!product) return;
      const name = pm.cust.value.trim(), phone = pm.phone.value.trim();
      const showErr = (msg, el) => { pm.err.textContent = msg; pm.err.hidden = false; el.focus(); };
      if (!name) return showErr('من فضلك اكتب اسمك.', pm.cust);
      if (!validPhone(phone)) return showErr('من فضلك اكتب رقم هاتف صحيح.', pm.phone);
      const qty = Math.max(1, parseInt(pm.qty.value, 10) || 1);
      try { localStorage.setItem('wm_name', name); localStorage.setItem('wm_phone', phone); } catch (_) {}
      const lines = ['مرحباً، أرغب بطلب هذا المنتج:', '', '• المنتج: ' + product.name];
      if (product.brand) lines.push('• الماركة: ' + product.brand);
      if (product.tags.length) lines.push('• التفاصيل: ' + product.tags.join(' · '));
      lines.push('• الكمية: ' + qty + ' ' + pm.unit.value, '', 'الاسم: ' + name, 'الهاتف: ' + phone);
      const note = pm.msg.value.trim();
      if (note) lines.push('ملاحظات: ' + note);
      openWhatsApp(lines);
      closeDialog(pm.overlay);
    });
  }

  /* ── 13. CONTACT FORM → WhatsApp ── */
  const cf = $('#contactForm');
  if (cf) {
    const err = $('#cfError');
    cf.addEventListener('submit', e => {
      e.preventDefault();
      const f = cf.elements;
      const showErr = (msg, el) => { err.textContent = msg; err.hidden = false; el.focus(); };
      if (!f.name.value.trim()) return showErr('من فضلك اكتب اسمك.', f.name);
      if (!validPhone(f.phone.value)) return showErr('من فضلك اكتب رقم هاتف صحيح.', f.phone);
      if (!f.message.value.trim()) return showErr('من فضلك اكتب رسالتك.', f.message);
      err.hidden = true;
      const lines = ['مرحباً، رسالة من موقع وليد الحديثة للإستثمار:', '', 'نوع الطلب: ' + f.type.value,
        'الاسم: ' + f.name.value.trim(), 'الهاتف: ' + f.phone.value.trim()];
      if (f.city.value.trim()) lines.push('المدينة: ' + f.city.value.trim());
      lines.push('', f.message.value.trim());
      openWhatsApp(lines);
      cf.reset();
    });
  }

  /* ── 14. GALLERY LIGHTBOX ── */
  const lb = $('#lightbox');
  if (lb) {
    const lbImg = $('#lbImg');
    $$('.gal-item').forEach(item => item.addEventListener('click', () => {
      const img = item.querySelector('img');
      lbImg.src = item.dataset.full; lbImg.alt = img ? img.alt : '';
      openDialog(lb, $('.lb-close', lb));
    }));
    lb.addEventListener('click', e => { if (e.target !== lbImg) closeDialog(lb); });
    lb.addEventListener('keydown', e => { if (e.key === 'Escape') closeDialog(lb); trapFocus(lb, e); });
  }

  /* ── 15. VIDEO ADS — one plays at a time ── */
  const videos = $$('.vcard video');
  videos.forEach(v => {
    const frame = v.closest('.vframe');
    const play = frame && frame.querySelector('.vplay');
    play && play.addEventListener('click', () => { v.controls = true; v.play(); });
    v.addEventListener('play', () => {
      frame && frame.classList.add('playing');
      videos.forEach(o => { if (o !== v) o.pause(); });
    });
    v.addEventListener('pause', () => frame && frame.classList.remove('playing'));
    v.addEventListener('ended', () => frame && frame.classList.remove('playing'));
  });

  /* ── 16. FOOTER YEAR ── */
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
