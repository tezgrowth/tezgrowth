(function () {
  'use strict';

  const cfg = window.TEZGROWTH_CONFIG || {
    email: 'hello@tezgrowth.com',
    whatsappNumber: '918630027341',
    defaultWhatsappMessage: 'Hi TezGrowth, I would like to enquire about your services.'
  };

  /* 1. WhatsApp Link Configuration */
  function buildWhatsAppUrl(message) {
    const num = (cfg.whatsappNumber || '').replace(/\D/g, '');
    const text = encodeURIComponent(message || cfg.defaultWhatsappMessage);
    return `https://wa.me/${num}?text=${text}`;
  }

  function initWhatsAppLinks() {
    document.querySelectorAll('[data-whatsapp-link]').forEach((el) => {
      const customMsg = el.getAttribute('data-whatsapp-msg');
      el.setAttribute('href', buildWhatsAppUrl(customMsg));
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    });
  }

  /* 2. Sticky Glass Header & Mobile Bottom Bar Scroll State */
  function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    const mobileBar = document.querySelector('.mobile-bottom-bar');
    const hasHero = Boolean(document.querySelector('.hero'));
    if (!header && !mobileBar) return;
    const onScroll = () => {
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
      if (mobileBar) {
        const showBar = !hasHero || window.scrollY > 240;
        mobileBar.classList.toggle('is-visible', showBar);
        document.body.classList.toggle('has-bottom-bar', showBar);
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* 3. Rock-Solid Mobile Navigation Drawer */
  function initMobileNav() {
    const btn = document.querySelector('[data-mobile-toggle]');
    const drawer = document.querySelector('[data-mobile-drawer]');
    const backdrop = document.querySelector('[data-mobile-backdrop]');
    if (!btn || !drawer) return;

    function setOpen(open) {
      drawer.classList.toggle('is-open', open);
      if (backdrop) backdrop.classList.toggle('is-open', open);
      document.body.classList.toggle('no-scroll', open);
      btn.setAttribute('aria-expanded', String(open));
      drawer.setAttribute('aria-hidden', String(!open));
    }

    btn.addEventListener('click', () => {
      const isOpen = !drawer.classList.contains('is-open');
      setOpen(isOpen);
    });

    if (backdrop) {
      backdrop.addEventListener('click', () => setOpen(false));
    }

    const closeBtn = drawer.querySelector('[data-mobile-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => setOpen(false));
    }

    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        setOpen(false);
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 992 && drawer.classList.contains('is-open')) {
        setOpen(false);
      }
    });
  }

  /* 4. 3D Hero Stage & Specular Card Sheen */
  function init3DEffects() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (reduced || !finePointer) return;

    const stage = document.querySelector('[data-hero-3d]');
    if (stage) {
      const wrap = stage.closest('.hero-3d-wrap') || stage;
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      let rafId = null;

      function animate() {
        currentX += (targetX - currentX) * 0.12;
        currentY += (targetY - currentY) * 0.12;
        stage.style.transform = `rotateX(${currentX.toFixed(2)}deg) rotateY(${currentY.toFixed(2)}deg)`;
        if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
          rafId = requestAnimationFrame(animate);
        } else {
          rafId = null;
        }
      }

      wrap.addEventListener('mousemove', (e) => {
        const rect = wrap.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        targetY = nx * 12;
        targetX = -ny * 10;
        if (!rafId) rafId = requestAnimationFrame(animate);
      });

      wrap.addEventListener('mouseleave', () => {
        targetX = 0;
        targetY = 0;
        if (!rafId) rafId = requestAnimationFrame(animate);
      });
    }

    // Specular cursor sheen on cards
    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
      });
    });
  }

  /* 5. Pricing Tabs (Monthly vs Single Services) */
  function initPricingTabs() {
    const tabBtns = document.querySelectorAll('[data-pricing-tab]');
    const panels = document.querySelectorAll('[data-pricing-panel]');
    if (!tabBtns.length || !panels.length) return;

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-pricing-tab');
        tabBtns.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });
        panels.forEach((p) => {
          const match = p.getAttribute('data-pricing-panel') === target;
          p.hidden = !match;
        });
      });
    });
  }

  /* 5b. Home Services Category Tabs */
  function initHomeServiceTabs() {
    const tabBtns = document.querySelectorAll('[data-home-tab]');
    const panels = document.querySelectorAll('[data-home-panel]');
    if (!tabBtns.length || !panels.length) return;

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-home-tab');
        tabBtns.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });
        panels.forEach((p) => {
          p.hidden = p.getAttribute('data-home-panel') !== target;
        });
      });
    });
  }

  /* 6. Scroll Reveal Animations & Scroll Progress */
  function initScrollProgress() {
    if (document.querySelector('.scroll-progress')) return;
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.prepend(bar);

    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
      bar.style.setProperty('--scroll-pct', `${pct.toFixed(1)}%`);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* 6a. Hide floating WhatsApp button while Hero CTA is in view */
  function initWhatsAppFloatVisibility() {
    const heroCta = document.querySelector('[data-hero-cta]');
    if (!heroCta || !('IntersectionObserver' in window)) return;

    document.body.classList.add('is-hero-cta-visible');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          document.body.classList.toggle('is-hero-cta-visible', entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(heroCta);
  }

  /* 6c. Websites We've Built Showcase */
  function buildWebsiteCardHtml(site) {
    const tagsHtml = (site.tags || [])
      .slice(0, 2)
      .map((t) => `<span class="website-tag">${escapeHtml(t)}</span>`)
      .join('');
    let domainLabel = site.url;
    try {
      domainLabel = new URL(site.url).hostname.replace(/^www\./, '');
    } catch (_) {}
    return `
      <article class="website-card">
        <div class="website-card-media">
          <div class="website-browser-bar" aria-hidden="true">
            <span class="website-browser-dots"><span></span><span></span><span></span></span>
            <span class="website-browser-domain">${escapeHtml(domainLabel)}</span>
          </div>
          <img src="${escapeHtml(site.image)}" alt="${escapeHtml(site.alt || site.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
          <div class="website-card-placeholder" style="display:none;">
            <span>${escapeHtml(site.name)}</span>
          </div>
        </div>
        <div class="website-card-body">
          <div class="website-card-tags">${tagsHtml}</div>
          <h3 class="website-card-title">${escapeHtml(site.name)}</h3>
          <p class="website-card-desc">${escapeHtml(site.description)}</p>
          <a href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer" class="btn btn--gradient btn--sm btn--block website-visit-btn">
            Visit Website
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          </a>
        </div>
      </article>
    `;
  }

  function initWebsitesShowcase() {
    const sites = window.TEZGROWTH_WEBSITES || [];
    if (!sites.length) return;
    document.querySelectorAll('[data-websites-showcase], [data-portfolio-websites]').forEach((container) => {
      container.innerHTML = sites.map(buildWebsiteCardHtml).join('');
    });
  }

  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );

    els.forEach((el) => observer.observe(el));
  }

  /* 6b. Interactive Pricing Detail Modal (Desktop Modal + Mobile Bottom Sheet) */
  function ensurePricingModal() {
    let modal = document.getElementById('pricing-modal');
    if (modal) return modal;

    modal = document.createElement('dialog');
    modal.id = 'pricing-modal';
    modal.className = 'modal modal--sheet';
    modal.setAttribute('aria-labelledby', 'pm-title');
    modal.innerHTML = `
      <div class="modal-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="modal-header">
        <div>
          <span class="badge badge--blue" id="pm-badge" style="margin-bottom: 6px;"></span>
          <h3 id="pm-title" class="modal-title-lg"></h3>
        </div>
        <button type="button" class="modal-close" id="pm-close" aria-label="Close plan details">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body modal-body--scroll">
        <div class="pm-price-banner">
          <div>
            <div class="pm-price" id="pm-price"></div>
            <p class="pm-tagline" id="pm-tagline"></p>
          </div>
          <div class="pm-meta-pills">
            <span class="pm-pill" id="pm-cadence"></span>
            <span class="pm-pill" id="pm-platforms"></span>
          </div>
        </div>

        <div class="pm-bestfor" id="pm-bestfor-wrap">
          <div class="pm-section-label">Best For</div>
          <p id="pm-bestfor"></p>
        </div>

        <div class="pm-section">
          <div class="pm-section-label">Full Deliverables Included</div>
          <ul class="check-list pm-deliverables" id="pm-deliverables"></ul>
        </div>

        <div class="pm-section" id="pm-workflow-wrap">
          <div class="pm-section-label">How It Works &amp; Turnaround</div>
          <ul class="pm-workflow-list" id="pm-workflow"></ul>
        </div>

        <div class="notice-box pm-notes-box" id="pm-notes-wrap">
          <div class="notice-title">Important Terms &amp; Notes</div>
          <ul class="pm-notes-list" id="pm-notes"></ul>
        </div>
      </div>
      <div class="modal-footer-sticky">
        <a href="contact.html" id="pm-book-btn" class="btn btn--primary">Book This Plan</a>
        <a href="https://wa.me/918630027341?text=Hi%20TezGrowth%2C%20I%20want%20to%20know%20more%20about%20your%20services" id="pm-wa-btn" target="_blank" rel="noopener noreferrer" class="btn btn--whatsapp">WhatsApp Enquiry</a>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function initPricingModal() {
    const pricingMap = window.TEZGROWTH_PRICING;
    if (!pricingMap) return;

    const modal = ensurePricingModal();
    const elBadge = document.getElementById('pm-badge');
    const elTitle = document.getElementById('pm-title');
    const elPrice = document.getElementById('pm-price');
    const elTagline = document.getElementById('pm-tagline');
    const elCadence = document.getElementById('pm-cadence');
    const elPlatforms = document.getElementById('pm-platforms');
    const elBestFor = document.getElementById('pm-bestfor');
    const elDeliverables = document.getElementById('pm-deliverables');
    const elWorkflow = document.getElementById('pm-workflow');
    const elWorkflowWrap = document.getElementById('pm-workflow-wrap');
    const elNotes = document.getElementById('pm-notes');
    const elNotesWrap = document.getElementById('pm-notes-wrap');
    const elBookBtn = document.getElementById('pm-book-btn');
    const elWaBtn = document.getElementById('pm-wa-btn');
    const elClose = document.getElementById('pm-close');

    function openPlan(id) {
      const plan = pricingMap[id];
      if (!plan) return;

      elBadge.textContent = plan.badge || plan.category;
      elBadge.className = `badge badge--${plan.accent || 'blue'}`;
      elTitle.textContent = plan.title;
      elPrice.innerHTML = `${escapeHtml(plan.price)}<span>${escapeHtml(plan.period || '')}</span>`;
      elTagline.textContent = plan.tagline || '';
      elCadence.textContent = plan.cadence || '';
      elPlatforms.textContent = plan.platforms || '';
      elBestFor.textContent = plan.bestFor || '';

      elDeliverables.innerHTML = (plan.deliverables || [])
        .map(
          (item) =>
            `<li><svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>${escapeHtml(item)}</span></li>`
        )
        .join('');

      if (plan.workflow && plan.workflow.length) {
        elWorkflowWrap.hidden = false;
        elWorkflow.innerHTML = plan.workflow.map((w) => `<li>${escapeHtml(w)}</li>`).join('');
      } else {
        elWorkflowWrap.hidden = true;
      }

      if (plan.notes && plan.notes.length) {
        elNotesWrap.hidden = false;
        elNotes.innerHTML = plan.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('');
      } else {
        elNotesWrap.hidden = true;
      }

      elBookBtn.setAttribute('href', `contact.html?service=${encodeURIComponent(plan.ctaService || plan.title)}`);
      elWaBtn.setAttribute(
        'href',
        buildWhatsAppUrl(`Hi TezGrowth, I want full details and to get started with: ${plan.title} (${plan.price}${plan.period || ''}).`)
      );

      modal.showModal();
      document.body.classList.add('no-scroll');
    }

    function closePlan() {
      modal.close();
      document.body.classList.remove('no-scroll');
    }

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-pricing-trigger]');
      if (trigger) {
        e.preventDefault();
        openPlan(trigger.getAttribute('data-pricing-trigger'));
        return;
      }

      const card = e.target.closest('[data-pricing-card]');
      if (card && !e.target.closest('a, button')) {
        openPlan(card.getAttribute('data-pricing-card'));
      }
    });

    if (elClose) elClose.addEventListener('click', closePlan);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePlan();
    });
    modal.addEventListener('cancel', () => {
      document.body.classList.remove('no-scroll');
    });
  }

  /* 7. Portfolio Rendering, Filtering & Modal */
  function initPortfolio() {
    const grid = document.querySelector('[data-portfolio-grid]');
    const filterButtons = document.querySelectorAll('[data-portfolio-filter]');
    const items = window.TEZGROWTH_PORTFOLIO || [];
    if (!grid || !items.length) return;

    const modal = document.getElementById('portfolio-modal');
    const modalTitle = document.getElementById('modal-project-title');
    const modalCategory = document.getElementById('modal-project-category');
    const modalSummary = document.getElementById('modal-project-summary');
    const modalDeliverables = document.getElementById('modal-project-deliverables');
    const modalNote = document.getElementById('modal-project-note');
    const modalClose = document.getElementById('modal-close-btn');

    const websitesWrap = document.getElementById('portfolio-websites-wrap');

    function render(category) {
      const filtered = category === 'All'
        ? items
        : items.filter((item) => item.category === category);

      if (websitesWrap) {
        websitesWrap.hidden = category !== 'Website Projects';
      }

      grid.innerHTML = filtered
        .map(
          (item) => `
          <article class="card portfolio-card">
            <div class="portfolio-thumb portfolio-thumb--${item.theme || 'blue'}">
              <span class="badge" style="background: rgba(255,255,255,0.16); color: #fff; align-self: flex-start;">${escapeHtml(item.badge)}</span>
              <div>
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8; margin-bottom: 4px;">${escapeHtml(item.category)}</div>
                <h3 style="font-size: 1.125rem; font-weight: 700; line-height: 1.3;">${escapeHtml(item.title)}</h3>
              </div>
            </div>
            <div class="portfolio-body">
              <div class="portfolio-category">${escapeHtml(item.category)}</div>
              <p style="color: var(--text-secondary); font-size: 0.9375rem; margin-bottom: 18px; flex: 1;">${escapeHtml(item.summary)}</p>
              <button type="button" class="btn btn--outline btn--sm" data-project-id="${escapeHtml(item.id)}">
                View Project Scope
              </button>
            </div>
          </article>
        `
        )
        .join('');
    }

    render('All');

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterButtons.forEach((b) => {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        render(btn.getAttribute('data-portfolio-filter'));
      });
    });

    if (modal) {
      grid.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-project-id]');
        if (!trigger) return;
        const project = items.find((p) => p.id === trigger.getAttribute('data-project-id'));
        if (!project) return;

        modalTitle.textContent = project.title;
        modalCategory.textContent = project.category;
        modalSummary.textContent = project.summary;
        modalDeliverables.innerHTML = project.deliverables
          .map((d) => `<li>• ${escapeHtml(d)}</li>`)
          .join('');
        modalNote.textContent = project.note;
        modal.showModal();
      });

      if (modalClose) {
        modalClose.addEventListener('click', () => modal.close());
      }

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.close();
      });
    }
  }

  /* 8. Working Enquiry Form (Homepage + Contact Page) */
  function findPlanForService(serviceVal) {
    const pricingMap = window.TEZGROWTH_PRICING;
    if (!pricingMap || !serviceVal) return null;
    const target = serviceVal.toLowerCase();
    const plans = Object.values(pricingMap);
    return (
      plans.find((p) => (p.ctaService || '').toLowerCase() === target) ||
      plans.find((p) => (p.title || '').toLowerCase() === target) ||
      plans.find((p) => target.includes((p.title || '').toLowerCase())) ||
      null
    );
  }

  function updateIncludedScope(serviceVal) {
    const box = document.getElementById('included-scope-box');
    const list = document.getElementById('included-scope-list');
    if (!box || !list) return;

    const plan = findPlanForService(serviceVal);
    if (!plan || !plan.deliverables || !plan.deliverables.length) {
      box.hidden = true;
      list.innerHTML = '';
      return;
    }

    list.innerHTML = plan.deliverables
      .slice(0, 6)
      .map(
        (item) =>
          `<li><svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>${escapeHtml(item)}</span></li>`
      )
      .join('');
    box.hidden = false;
  }

  function initEnquiryForm() {
    const forms = document.querySelectorAll('[data-enquiry-form]');
    if (!forms.length) return;

    const params = new URLSearchParams(window.location.search);
    const serviceParam = params.get('service');

    forms.forEach((form) => {
      const source = form.getAttribute('data-lead-source') || 'contact';
      const serviceSelect = form.querySelector('[name="service"]');

      if (serviceParam && serviceSelect) {
        const match = Array.from(serviceSelect.options).find(
          (opt) => opt.value.toLowerCase() === serviceParam.toLowerCase()
        );
        if (match) serviceSelect.value = match.value;
      }

      if (serviceSelect && form.querySelector('#included-scope-box, #included-scope-list') === null && document.getElementById('included-scope-box')) {
        updateIncludedScope(serviceSelect.value);
        serviceSelect.addEventListener('change', () => updateIncludedScope(serviceSelect.value));
      } else if (serviceSelect && source === 'contact') {
        updateIncludedScope(serviceSelect.value);
        serviceSelect.addEventListener('change', () => updateIncludedScope(serviceSelect.value));
      }

      const statusBox = form.querySelector('[data-form-status]');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors(form);

        const hp = form.querySelector('[name="website_hp"]');
        if (hp && hp.value.trim()) {
          if (statusBox) {
            statusBox.className = 'form-status is-success';
            statusBox.textContent = 'Thank you! Your enquiry has been received.';
          }
          form.reset();
          return;
        }

        const data = {
          name: form.querySelector('[name="name"]').value.trim(),
          business: form.querySelector('[name="business"]').value.trim(),
          phone: form.querySelector('[name="phone"]').value.trim(),
          email: form.querySelector('[name="email"]').value.trim(),
          service: form.querySelector('[name="service"]').value.trim(),
          budget: form.querySelector('[name="budget"]').value.trim(),
          message: form.querySelector('[name="message"]').value.trim(),
          source,
          status: 'New',
          submitted_at: new Date().toISOString()
        };

        let valid = true;
        if (!data.name) { showFieldError(form, 'name', 'Please enter your name.'); valid = false; }
        if (!data.business) { showFieldError(form, 'business', 'Please enter your business name.'); valid = false; }
        if (!data.phone || data.phone.replace(/\D/g, '').length < 8) {
          showFieldError(form, 'phone', 'Please enter a valid phone or WhatsApp number.');
          valid = false;
        }
        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          showFieldError(form, 'email', 'Please enter a valid email address.');
          valid = false;
        }
        if (!data.service) { showFieldError(form, 'service', 'Please select a required service.'); valid = false; }
        if (!data.budget) { showFieldError(form, 'budget', 'Please select your monthly budget.'); valid = false; }

        if (!valid) {
          if (statusBox) {
            statusBox.className = 'form-status is-error';
            statusBox.textContent = 'Please complete all required fields highlighted above.';
          }
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        let savedToSupabase = false;
        let supabaseError = false;
        if (cfg.supabase && cfg.supabase.url && cfg.supabase.anonKey) {
          const table = cfg.supabase.table || 'enquiries';
          const endpoint = `${cfg.supabase.url}/rest/v1/${table}`;
          const headers = {
            'Content-Type': 'application/json',
            apikey: cfg.supabase.anonKey,
            Authorization: `Bearer ${cfg.supabase.anonKey}`,
            Prefer: 'return=minimal'
          };
          try {
            let res = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify(data)
            });
            if (!res.ok && res.status === 400) {
              // Fallback if source/status columns are not yet migrated
              const { source: _s, status: _st, ...legacyData } = data;
              res = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(legacyData)
              });
            }
            savedToSupabase = res.ok;
            if (!res.ok) supabaseError = true;
          } catch (_) {
            savedToSupabase = false;
            supabaseError = true;
          }
        }

        try {
          const existing = JSON.parse(localStorage.getItem('tezgrowth_enquiries') || '[]');
          existing.push(data);
          localStorage.setItem('tezgrowth_enquiries', JSON.stringify(existing));
        } catch (_) {}

        const formattedMessage =
          `New Enquiry for TezGrowth\n` +
          `Name: ${data.name}\n` +
          `Business: ${data.business}\n` +
          `Phone/WhatsApp: ${data.phone}\n` +
          `Email: ${data.email}\n` +
          `Required Service: ${data.service}\n` +
          `Monthly Budget: ${data.budget}\n` +
          `Message: ${data.message || 'N/A'}`;

        const waUrl = buildWhatsAppUrl(formattedMessage);
        const mailtoUrl = `mailto:${cfg.email}?subject=${encodeURIComponent(
          `TezGrowth Enquiry: ${data.service} (${data.business})`
        )}&body=${encodeURIComponent(formattedMessage)}`;

        if (statusBox) {
          statusBox.className = savedToSupabase ? 'form-status is-success' : 'form-status is-success';
          statusBox.innerHTML = `
            <strong>Thank you, ${escapeHtml(data.name)}!</strong> Your enquiry has been recorded${savedToSupabase ? ' and saved' : ''}.${supabaseError ? ' (Cloud sync pending — use WhatsApp below for instant reply.)' : ''}
            <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 10px;">
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn--whatsapp btn--sm">Send Instantly via WhatsApp</a>
              <a href="${mailtoUrl}" class="btn btn--outline btn--sm">Open in Email (${escapeHtml(cfg.email)})</a>
            </div>
          `;
        }

        if (typeof window.gtag === 'function') {
          window.gtag('event', 'generate_lead', { service: data.service, budget: data.budget });
        }
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'Lead', { content_name: data.service });
        }

        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        form.reset();
        updateIncludedScope('');
      });
    });
  }

  function showFieldError(form, fieldName, msg) {
    const input = form.querySelector(`[name="${fieldName}"]`);
    const err = form.querySelector(`[data-error-for="${fieldName}"]`);
    if (input) input.classList.add('is-invalid');
    if (err) {
      err.textContent = msg;
      err.classList.add('is-visible');
    }
  }

  function clearErrors(form) {
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    form.querySelectorAll('.form-error').forEach((el) => {
      el.textContent = '';
      el.classList.remove('is-visible');
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* 9. Seamless Auto-Playing Testimonials Marquee */
  function initTestimonialsVisibility() {
    const section = document.querySelector('[data-testimonials-section]');
    if (!section) return;
    const realCards = section.querySelectorAll('[data-testimonial-card]:not([data-placeholder="true"])');
    if (!realCards.length) {
      section.hidden = true;
      return;
    }
    const track = section.querySelector('.testimonials-track');
    if (track && !track.dataset.cloned) {
      // Reveal any hidden cards and duplicate once for seamless -50% infinite marquee loop
      track.querySelectorAll('[hidden]').forEach((el) => el.removeAttribute('hidden'));
      const clone = track.innerHTML;
      track.insertAdjacentHTML('beforeend', clone);
      track.dataset.cloned = 'true';
    }
  }

  function initYear() {
    document.querySelectorAll('[data-current-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }

  /* 10. Maintenance Lock Check (controlled from /admin) */
  async function initMaintenanceLock() {
    const sb = cfg.supabase;
    if (!sb || !sb.url || !sb.anonKey) return;
    try {
      const res = await fetch(`${sb.url}/rest/v1/site_settings?id=eq.1&select=maintenance_mode,maintenance_message`, {
        headers: {
          apikey: sb.anonKey,
          Authorization: `Bearer ${sb.anonKey}`
        }
      });
      if (!res.ok) return;
      const rows = await res.json();
      if (!Array.isArray(rows) || !rows.length || !rows[0].maintenance_mode) return;

      const msg = rows[0].maintenance_message || 'We are performing scheduled upgrades and will be back shortly.';
      const lock = document.createElement('div');
      lock.id = 'tez-maintenance-lock';
      lock.className = 'maintenance-lock';
      lock.setAttribute('role', 'dialog');
      lock.setAttribute('aria-modal', 'true');
      lock.innerHTML = `
        <div class="maintenance-card">
          <div class="maintenance-badge">Site Under Maintenance</div>
          <img src="assets/tezgrowth-logo.png" alt="TezGrowth" width="52" height="52" style="margin: 0 auto 14px;" />
          <h1 style="font-size: 1.65rem; font-weight: 800; color: #fff; margin-bottom: 10px;">We'll Be Right Back</h1>
          <p style="color: var(--text-secondary); margin-bottom: 22px;">${escapeHtml(msg)}</p>
          <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
            <a href="${buildWhatsAppUrl()}" target="_blank" rel="noopener noreferrer" class="btn btn--gradient">Chat on WhatsApp</a>
            <a href="tel:+${(cfg.whatsappNumber || '918630027341').replace(/\D/g, '')}" class="btn btn--outline">Call Support</a>
          </div>
        </div>
      `;
      document.body.appendChild(lock);
      document.body.classList.add('no-scroll');
    } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMaintenanceLock();
    initWhatsAppLinks();
    initScrollProgress();
    initHeaderScroll();
    initWhatsAppFloatVisibility();
    initMobileNav();
    init3DEffects();
    initPricingTabs();
    initHomeServiceTabs();
    initPricingModal();
    initReveal();
    initWebsitesShowcase();
    initPortfolio();
    initEnquiryForm();
    initTestimonialsVisibility();
    initYear();
  });
})();
