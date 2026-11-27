(function () {
  'use strict';

  const cfg = window.TEZGROWTH_CONFIG || {};
  const sbCfg = cfg.supabase || {};
  const MAX_MP4_BYTES = 45 * 1024 * 1024; // 45 MB (safe for Supabase 50 MB free-plan limit)

  if (!window.supabase || !sbCfg.url || !sbCfg.anonKey) {
    document.addEventListener('DOMContentLoaded', () => {
      const box = document.getElementById('admin-login-status');
      if (box) {
        box.className = 'form-status is-error';
        box.textContent = 'Supabase configuration is missing in js/config.js.';
      }
    });
    return;
  }

  const supabase = window.supabase.createClient(sbCfg.url, sbCfg.anonKey);
  const LEADS_TABLE = sbCfg.table || 'enquiries';

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ── URL Detection for Reels ────────────────────────────────────────────── */
  function extractYouTubeId(url) {
    const patterns = [
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];
    for (const re of patterns) {
      const m = url.match(re);
      if (m) return m[1];
    }
    return null;
  }

  function extractInstagramInfo(url) {
    const m = url.match(/instagram\.com\/(reel|reels|p|tv)\/([a-zA-Z0-9_-]+)/i);
    if (!m) return null;
    const type = m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase();
    return {
      embedUrl: `https://www.instagram.com/${type}/${m[2]}/embed/`
    };
  }

  function detectReelSource(url) {
    const clean = (url || '').trim();
    if (!clean) return null;
    const ytId = extractYouTubeId(clean);
    if (ytId) {
      return {
        source_type: 'youtube',
        url: clean,
        poster_url: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
        ytId
      };
    }
    const ig = extractInstagramInfo(clean);
    if (ig) {
      return {
        source_type: 'instagram',
        url: clean,
        poster_url: '',
        embedUrl: ig.embedUrl
      };
    }
    if (/\.mp4(\?.*)?$/i.test(clean)) {
      return {
        source_type: 'mp4',
        url: clean,
        poster_url: ''
      };
    }
    return { error: 'Unsupported link. Paste a YouTube / Shorts link, Instagram Reel / Post link, or direct .mp4 URL.' };
  }

  /* ── State ──────────────────────────────────────────────────────────────── */
  let allLeads = [];
  let allReels = [];

  document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('admin-login-section');
    const dashboard = document.getElementById('admin-dashboard');
    const userBar = document.getElementById('admin-user-bar');
    const userEmail = document.getElementById('admin-user-email');
    const logoutBtn = document.getElementById('admin-logout-btn');
    const loginForm = document.getElementById('admin-login-form');
    const loginStatus = document.getElementById('admin-login-status');

    function setAuthenticated(session) {
      const authed = Boolean(session && session.user);
      loginSection.hidden = authed;
      dashboard.hidden = !authed;
      userBar.hidden = !authed;
      if (authed) {
        userEmail.textContent = session.user.email || 'Admin';
        loadSiteSettings();
        loadLeads();
        loadReels();
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(data.session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(session);
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('admin-email').value.trim();
      const password = document.getElementById('admin-password').value;
      const btn = document.getElementById('admin-login-btn');
      loginStatus.className = 'form-status';
      loginStatus.textContent = '';

      if (!email || !password) {
        loginStatus.className = 'form-status is-error';
        loginStatus.textContent = 'Enter both email and password.';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Signing in...';
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      btn.disabled = false;
      btn.textContent = 'Sign In';

      if (error) {
        loginStatus.className = 'form-status is-error';
        loginStatus.textContent = error.message || 'Sign in failed.';
        return;
      }
      setAuthenticated(data.session);
    });

    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      setAuthenticated(null);
    });

    /* ── SITE CONTROLS (Reels On/Off + Maintenance Lock) ─────────────────── */
    let siteSettings = { reels_enabled: true, maintenance_mode: false };
    const reelsToggleBtn = document.getElementById('toggle-reels-section-btn');
    const reelsToggleDesc = document.getElementById('reels-toggle-desc');
    const maintToggleBtn = document.getElementById('toggle-maintenance-btn');
    const maintToggleDesc = document.getElementById('maintenance-toggle-desc');
    const siteCtrlStatus = document.getElementById('site-controls-status');

    function renderSiteSettings() {
      const reelsOn = siteSettings.reels_enabled !== false;
      reelsToggleBtn.textContent = reelsOn ? 'ON' : 'OFF';
      reelsToggleBtn.style.background = reelsOn ? 'rgba(12, 242, 123, 0.16)' : 'rgba(248, 113, 113, 0.14)';
      reelsToggleBtn.style.borderColor = reelsOn ? 'rgba(12, 242, 123, 0.5)' : 'rgba(248, 113, 113, 0.45)';
      reelsToggleBtn.style.color = reelsOn ? '#6ee7b7' : '#fca5a5';
      reelsToggleDesc.textContent = reelsOn ? 'Visible on homepage' : 'Hidden on homepage';

      const maintOn = Boolean(siteSettings.maintenance_mode);
      maintToggleBtn.textContent = maintOn ? 'LOCKED' : 'OFF';
      maintToggleBtn.style.background = maintOn ? 'rgba(255, 122, 0, 0.22)' : 'rgba(255, 255, 255, 0.04)';
      maintToggleBtn.style.borderColor = maintOn ? 'rgba(255, 122, 0, 0.6)' : 'var(--border-medium)';
      maintToggleBtn.style.color = maintOn ? '#fdba74' : 'var(--text-secondary)';
      maintToggleDesc.textContent = maintOn ? 'Public site is locked (Maintenance Mode)' : 'Website is live';
    }

    async function loadSiteSettings() {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) {
        siteCtrlStatus.className = 'form-status is-error';
        siteCtrlStatus.textContent = `Site controls unavailable: run updated SQL migration (${error.message})`;
        return;
      }
      if (data) siteSettings = data;
      siteCtrlStatus.textContent = '';
      renderSiteSettings();
    }

    async function saveSiteSettings(patch) {
      siteCtrlStatus.className = 'form-status';
      siteCtrlStatus.textContent = 'Saving...';
      const next = {
        id: 1,
        reels_enabled: patch.reels_enabled !== undefined ? patch.reels_enabled : siteSettings.reels_enabled,
        maintenance_mode: patch.maintenance_mode !== undefined ? patch.maintenance_mode : siteSettings.maintenance_mode,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabase
        .from('site_settings')
        .upsert(next, { onConflict: 'id' })
        .select()
        .single();
      if (error) {
        siteCtrlStatus.className = 'form-status is-error';
        siteCtrlStatus.textContent = `Update failed: ${error.message}`;
        return;
      }
      siteSettings = data;
      siteCtrlStatus.className = 'form-status is-success';
      siteCtrlStatus.textContent = 'Saved!';
      renderSiteSettings();
    }

    reelsToggleBtn.addEventListener('click', () => {
      const nextVal = !(siteSettings.reels_enabled !== false);
      saveSiteSettings({ reels_enabled: nextVal });
    });

    maintToggleBtn.addEventListener('click', () => {
      const nextVal = !Boolean(siteSettings.maintenance_mode);
      if (nextVal && !window.confirm('Lock the public website with Maintenance Mode? Visitors will see the maintenance screen (/admin remains accessible).')) {
        return;
      }
      saveSiteSettings({ maintenance_mode: nextVal });
    });

    // Tabs
    document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.adminTab;
        document.querySelectorAll('[data-admin-tab]').forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });
        document.querySelectorAll('[data-admin-panel]').forEach((panel) => {
          panel.hidden = panel.dataset.adminPanel !== target;
        });
      });
    });

    /* ── LEADS TAB ────────────────────────────────────────────────────────── */
    const leadsList = document.getElementById('leads-list');
    const leadsMsg = document.getElementById('leads-status-msg');
    const leadsSearch = document.getElementById('leads-search');
    const leadsStatusFilter = document.getElementById('leads-status-filter');
    document.getElementById('leads-refresh-btn').addEventListener('click', loadLeads);
    leadsSearch.addEventListener('input', renderLeads);
    leadsStatusFilter.addEventListener('change', renderLeads);

    async function loadLeads() {
      leadsMsg.className = 'form-status';
      leadsMsg.textContent = 'Loading leads...';
      const { data, error } = await supabase
        .from(LEADS_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        leadsMsg.className = 'form-status is-error';
        leadsMsg.textContent = `Could not load leads: ${error.message}`;
        return;
      }
      leadsMsg.textContent = '';
      allLeads = data || [];
      renderLeads();
    }

    function renderLeads() {
      const q = (leadsSearch.value || '').trim().toLowerCase();
      const statusFilter = leadsStatusFilter.value;

      const filtered = allLeads.filter((lead) => {
        const st = lead.status || 'New';
        if (statusFilter !== 'All' && st !== statusFilter) return false;
        if (!q) return true;
        const hay = `${lead.name} ${lead.business} ${lead.phone} ${lead.email} ${lead.service}`.toLowerCase();
        return hay.includes(q);
      });

      if (!filtered.length) {
        leadsList.innerHTML = `<div class="card"><p style="color:var(--text-secondary);">No leads found.</p></div>`;
        return;
      }

      leadsList.innerHTML = filtered
        .map((lead) => {
          const st = lead.status || 'New';
          const digits = String(lead.phone || '').replace(/\D/g, '');
          const waNum = digits.length === 10 ? `91${digits}` : digits;
          const waHref = `https://wa.me/${waNum}?text=${encodeURIComponent(`Hi ${lead.name}, thanks for contacting TezGrowth regarding ${lead.service}.`)}`;
          const telHref = `tel:${digits}`;
          const dateStr = lead.created_at || lead.submitted_at;
          const dateFormatted = dateStr ? new Date(dateStr).toLocaleString('en-IN') : '';

          return `
            <article class="lead-card" data-lead-id="${escapeHtml(lead.id)}">
              <div class="lead-head">
                <div>
                  <h3 style="font-size:1.05rem;font-weight:800;color:#fff;">${escapeHtml(lead.name)} &mdash; ${escapeHtml(lead.business)}</h3>
                  <div style="font-size:0.78rem;color:var(--text-muted);">${escapeHtml(lead.source || 'contact')} &bull; ${escapeHtml(dateFormatted)}</div>
                </div>
                <span class="status-pill status-pill--${escapeHtml(st)}">${escapeHtml(st)}</span>
              </div>
              <div class="lead-meta">
                <div><strong>Service:</strong> ${escapeHtml(lead.service)} &bull; <strong>Budget:</strong> ${escapeHtml(lead.budget)}</div>
                <div><strong>Phone:</strong> ${escapeHtml(lead.phone)} &bull; <strong>Email:</strong> ${escapeHtml(lead.email)}</div>
                ${lead.message ? `<div><strong>Message:</strong> ${escapeHtml(lead.message)}</div>` : ''}
              </div>
              <div class="lead-actions">
                <a href="${waHref}" target="_blank" rel="noopener noreferrer" class="btn btn--whatsapp">WhatsApp</a>
                <a href="${telHref}" class="btn btn--outline">Call</a>
                <button type="button" class="btn btn--outline" data-copy="${escapeHtml(lead.phone)}">Copy Phone</button>
                <button type="button" class="btn btn--outline" data-copy="${escapeHtml(lead.email)}">Copy Email</button>
                <select class="form-control" style="width:auto;min-height:44px;padding:6px 10px;" data-lead-status="${escapeHtml(lead.id)}" aria-label="Change lead status">
                  <option value="New" ${st === 'New' ? 'selected' : ''}>New</option>
                  <option value="Contacted" ${st === 'Contacted' ? 'selected' : ''}>Contacted</option>
                  <option value="Closed" ${st === 'Closed' ? 'selected' : ''}>Closed</option>
                </select>
                <button type="button" class="btn btn--outline" style="color:var(--danger);border-color:rgba(248,113,113,0.4);" data-delete-lead="${escapeHtml(lead.id)}">Delete</button>
              </div>
            </article>
          `;
        })
        .join('');
    }

    leadsList.addEventListener('click', async (e) => {
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        const val = copyBtn.dataset.copy;
        try {
          await navigator.clipboard.writeText(val);
          const orig = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = orig; }, 1400);
        } catch (_) {}
        return;
      }

      const delBtn = e.target.closest('[data-delete-lead]');
      if (delBtn) {
        const id = delBtn.dataset.deleteLead;
        if (!window.confirm('Delete this lead permanently?')) return;
        const { error } = await supabase.from(LEADS_TABLE).delete().eq('id', id);
        if (error) {
          alert(`Delete failed: ${error.message}`);
          return;
        }
        allLeads = allLeads.filter((l) => String(l.id) !== String(id));
        renderLeads();
      }
    });

    leadsList.addEventListener('change', async (e) => {
      const sel = e.target.closest('[data-lead-status]');
      if (!sel) return;
      const id = sel.dataset.leadStatus;
      const nextStatus = sel.value;
      const { error } = await supabase.from(LEADS_TABLE).update({ status: nextStatus }).eq('id', id);
      if (error) {
        alert(`Status update failed: ${error.message}`);
        return;
      }
      const item = allLeads.find((l) => String(l.id) === String(id));
      if (item) item.status = nextStatus;
      renderLeads();
    });

    /* ── REELS TAB ────────────────────────────────────────────────────────── */
    const reelsAdminList = document.getElementById('reels-admin-list');
    const reelsAdminStatus = document.getElementById('reels-admin-status');
    const addReelForm = document.getElementById('add-reel-form');
    const reelUrlInput = document.getElementById('reel-url');
    const reelFileInput = document.getElementById('reel-file');
    const reelTitleInput = document.getElementById('reel-title');
    const reelFormStatus = document.getElementById('reel-form-status');
    const reelPreviewBtn = document.getElementById('reel-preview-btn');
    const reelPreviewBox = document.getElementById('reel-preview-container');
    document.getElementById('reels-refresh-btn').addEventListener('click', loadReels);

    function showReelPreview() {
      reelFormStatus.className = 'form-status';
      reelFormStatus.textContent = '';
      const file = reelFileInput.files[0];
      const url = reelUrlInput.value.trim();

      if (file) {
        if (file.size > MAX_MP4_BYTES) {
          reelFormStatus.className = 'form-status is-error';
          reelFormStatus.textContent = 'File too large. Keep MP4 uploads under 45 MB for the Supabase free plan.';
          reelPreviewBox.hidden = true;
          return;
        }
        const objUrl = URL.createObjectURL(file);
        reelPreviewBox.hidden = false;
        reelPreviewBox.innerHTML = `<div class="reel-preview-box"><video src="${objUrl}" controls muted playsinline></video></div>`;
        return;
      }

      if (!url) {
        reelFormStatus.className = 'form-status is-error';
        reelFormStatus.textContent = 'Paste a reel link or choose an MP4 file to preview.';
        reelPreviewBox.hidden = true;
        return;
      }

      const detected = detectReelSource(url);
      if (detected.error) {
        reelFormStatus.className = 'form-status is-error';
        reelFormStatus.textContent = detected.error;
        reelPreviewBox.hidden = true;
        return;
      }

      reelPreviewBox.hidden = false;
      if (detected.source_type === 'youtube') {
        reelPreviewBox.innerHTML = `<div class="reel-preview-box"><iframe src="https://www.youtube.com/embed/${escapeHtml(detected.ytId)}?playsinline=1" allowfullscreen></iframe></div>`;
      } else if (detected.source_type === 'instagram') {
        reelPreviewBox.innerHTML = `<div class="reel-preview-box"><iframe src="${escapeHtml(detected.embedUrl)}" allowfullscreen></iframe></div>`;
      } else {
        reelPreviewBox.innerHTML = `<div class="reel-preview-box"><video src="${escapeHtml(detected.url)}" controls muted playsinline></video></div>`;
      }
    }

    reelPreviewBtn.addEventListener('click', showReelPreview);

    addReelForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      reelFormStatus.className = 'form-status';
      reelFormStatus.textContent = '';
      const saveBtn = document.getElementById('reel-save-btn');
      const title = reelTitleInput.value.trim() || null;
      const file = reelFileInput.files[0];
      const url = reelUrlInput.value.trim();

      if (!file && !url) {
        reelFormStatus.className = 'form-status is-error';
        reelFormStatus.textContent = 'Please paste a link or select an MP4 file.';
        return;
      }

      let payload = null;
      if (file) {
        if (file.type && file.type !== 'video/mp4') {
          reelFormStatus.className = 'form-status is-error';
          reelFormStatus.textContent = 'Only MP4 video files are supported.';
          return;
        }
        if (file.size > MAX_MP4_BYTES) {
          reelFormStatus.className = 'form-status is-error';
          reelFormStatus.textContent = 'File exceeds 45 MB limit (Supabase free plan allows up to 50 MB). Please compress the MP4 and try again.';
          return;
        }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Uploading MP4...';
        const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('reels').upload(safeName, file, {
          contentType: 'video/mp4',
          upsert: false
        });
        if (upErr) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Reel';
          reelFormStatus.className = 'form-status is-error';
          reelFormStatus.textContent = `Upload failed: ${upErr.message}`;
          return;
        }
        const { data: pub } = supabase.storage.from('reels').getPublicUrl(safeName);
        payload = {
          title,
          source_type: 'storage_mp4',
          url: pub.publicUrl,
          storage_path: safeName,
          poster_url: '',
          sort_order: allReels.length,
          is_active: true
        };
      } else {
        const detected = detectReelSource(url);
        if (detected.error) {
          reelFormStatus.className = 'form-status is-error';
          reelFormStatus.textContent = detected.error;
          return;
        }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        payload = {
          title,
          source_type: detected.source_type,
          url: detected.url,
          storage_path: null,
          poster_url: detected.poster_url || '',
          sort_order: allReels.length,
          is_active: true
        };
      }

      const { error } = await supabase.from('reels').insert(payload);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Reel';

      if (error) {
        reelFormStatus.className = 'form-status is-error';
        reelFormStatus.textContent = `Save failed: ${error.message}`;
        return;
      }

      reelFormStatus.className = 'form-status is-success';
      reelFormStatus.textContent = 'Reel saved! It is now live on the homepage.';
      addReelForm.reset();
      reelPreviewBox.hidden = true;
      reelPreviewBox.innerHTML = '';
      loadReels();
    });

    async function loadReels() {
      reelsAdminStatus.className = 'form-status';
      reelsAdminStatus.textContent = 'Loading reels...';
      const { data, error } = await supabase
        .from('reels')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        reelsAdminStatus.className = 'form-status is-error';
        reelsAdminStatus.textContent = `Could not load reels: ${error.message}`;
        return;
      }
      reelsAdminStatus.textContent = '';
      allReels = data || [];
      renderReelsAdmin();
    }

    function renderReelsAdmin() {
      if (!allReels.length) {
        reelsAdminList.innerHTML = `<div class="card"><p style="color:var(--text-secondary);">No reels yet. Add one above!</p></div>`;
        return;
      }

      reelsAdminList.innerHTML = allReels
        .map((reel, idx) => {
          const thumbHtml = reel.poster_url
            ? `<img src="${escapeHtml(reel.poster_url)}" alt="" loading="lazy" />`
            : `<span>${escapeHtml(reel.source_type.toUpperCase())}</span>`;

          return `
            <article class="admin-reel-card">
              <div class="admin-reel-row">
                <div class="admin-reel-thumb">${thumbHtml}</div>
                <div style="min-width:0;">
                  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:4px;">
                    <strong style="color:#fff;">${escapeHtml(reel.title || '(Untitled Reel)')}</strong>
                    <span class="status-pill ${reel.is_active ? 'status-pill--Closed' : 'status-pill--Contacted'}">${reel.is_active ? 'Visible' : 'Hidden'}</span>
                  </div>
                  <div style="font-size:0.78rem;color:var(--text-muted);word-break:break-all;">${escapeHtml(reel.source_type)} &bull; ${escapeHtml(reel.url)}</div>
                </div>
              </div>
              <div class="reel-admin-actions">
                <button type="button" class="btn btn--outline" data-reel-move="first" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>Move First</button>
                <button type="button" class="btn btn--outline" data-reel-move="up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>Up</button>
                <button type="button" class="btn btn--outline" data-reel-move="down" data-idx="${idx}" ${idx === allReels.length - 1 ? 'disabled' : ''}>Down</button>
                <button type="button" class="btn btn--outline" data-reel-toggle="${escapeHtml(reel.id)}">${reel.is_active ? 'Hide' : 'Show'}</button>
                <button type="button" class="btn btn--outline" data-reel-edit="${escapeHtml(reel.id)}">Edit Title</button>
                <button type="button" class="btn btn--outline" style="color:var(--danger);border-color:rgba(248,113,113,0.4);" data-reel-delete="${escapeHtml(reel.id)}">Delete</button>
              </div>
            </article>
          `;
        })
        .join('');
    }

    reelsAdminList.addEventListener('click', async (e) => {
      const moveBtn = e.target.closest('[data-reel-move]');
      if (moveBtn) {
        const idx = Number(moveBtn.dataset.idx);
        const dir = moveBtn.dataset.reelMove;
        const reordered = [...allReels];
        const [item] = reordered.splice(idx, 1);
        if (dir === 'first') reordered.unshift(item);
        else if (dir === 'up') reordered.splice(Math.max(0, idx - 1), 0, item);
        else if (dir === 'down') reordered.splice(Math.min(reordered.length, idx + 1), 0, item);

        await Promise.all(
          reordered.map((r, i) => supabase.from('reels').update({ sort_order: i }).eq('id', r.id))
        );
        loadReels();
        return;
      }

      const toggleBtn = e.target.closest('[data-reel-toggle]');
      if (toggleBtn) {
        const id = toggleBtn.dataset.reelToggle;
        const reel = allReels.find((r) => String(r.id) === String(id));
        if (!reel) return;
        const { error } = await supabase.from('reels').update({ is_active: !reel.is_active }).eq('id', id);
        if (error) alert(`Update failed: ${error.message}`);
        else loadReels();
        return;
      }

      const editBtn = e.target.closest('[data-reel-edit]');
      if (editBtn) {
        const id = editBtn.dataset.reelEdit;
        const reel = allReels.find((r) => String(r.id) === String(id));
        if (!reel) return;
        const nextTitle = window.prompt('Edit reel title (leave blank for none):', reel.title || '');
        if (nextTitle === null) return;
        const { error } = await supabase.from('reels').update({ title: nextTitle.trim() || null }).eq('id', id);
        if (error) alert(`Title update failed: ${error.message}`);
        else loadReels();
        return;
      }

      const delBtn = e.target.closest('[data-reel-delete]');
      if (delBtn) {
        const id = delBtn.dataset.reelDelete;
        const reel = allReels.find((r) => String(r.id) === String(id));
        if (!reel || !window.confirm('Delete this reel permanently?')) return;

        if (reel.storage_path) {
          await supabase.storage.from('reels').remove([reel.storage_path]);
        }
        const { error } = await supabase.from('reels').delete().eq('id', id);
        if (error) alert(`Delete failed: ${error.message}`);
        else loadReels();
      }
    });
  });
})();
