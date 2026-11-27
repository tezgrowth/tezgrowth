(function () {
  'use strict';

  const cfg = window.TEZGROWTH_CONFIG || {};
  const DEMO_REEL = {
    id: 'demo-reel-1',
    title: 'TezGrowth Demo Reel',
    source_type: 'youtube',
    url: 'https://www.youtube.com/shorts/YkwQOtqk5wA',
    poster_url: '',
    sort_order: 0,
    is_active: true
  };

  /* ── URL Detection & Parsing ────────────────────────────────────────────── */
  function extractYouTubeId(url) {
    if (!url) return null;
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

  function extractInstagramEmbedUrl(url) {
    if (!url) return null;
    const m = url.match(/instagram\.com\/(reel|reels|p|tv)\/([a-zA-Z0-9_-]+)/i);
    if (!m) return null;
    const type = m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase();
    return `https://www.instagram.com/${type}/${m[2]}/embed/`;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ── YouTube IFrame API Loader ──────────────────────────────────────────── */
  let ytApiPromise = null;
  function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    });
    return ytApiPromise;
  }

  /* ── Fetch Active Reels from Supabase ───────────────────────────────────── */
  async function fetchActiveReels() {
    const sb = cfg.supabase;
    if (!sb || !sb.url || !sb.anonKey) return [DEMO_REEL];

    try {
      const endpoint = `${sb.url}/rest/v1/reels?is_active=eq.true&order=sort_order.asc,created_at.desc&select=id,title,source_type,url,storage_path,poster_url,sort_order,is_active`;
      const res = await fetch(endpoint, {
        headers: {
          apikey: sb.anonKey,
          Authorization: `Bearer ${sb.anonKey}`
        }
      });
      if (!res.ok) {
        // Table not created yet or temporary error -> show demo reel
        return [DEMO_REEL];
      }
      const rows = await res.json();
      if (!Array.isArray(rows)) return [DEMO_REEL];
      return rows;
    } catch (_) {
      return [DEMO_REEL];
    }
  }

  /* ── Render & Interactive Carousel ──────────────────────────────────────── */
  async function initReelsSection() {
    const section = document.getElementById('reels-section');
    const track = document.getElementById('reels-track');
    if (!section || !track) return;

    const reels = await fetchActiveReels();
    if (!reels.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    const controllers = new Map();
    let activeCardIndex = -1;

    track.innerHTML = reels
      .map((reel, idx) => {
        const ytId = extractYouTubeId(reel.url);
        const igEmbed = extractInstagramEmbedUrl(reel.url);
        const isIg = reel.source_type === 'instagram' || Boolean(igEmbed);
        const isYt = !isIg && (reel.source_type === 'youtube' || Boolean(ytId));
        const kind = isIg ? 'instagram' : isYt ? 'youtube' : 'mp4';

        const poster = reel.poster_url || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '');
        const titleHtml = reel.title
          ? `<div class="reel-card-title">${escapeHtml(reel.title)}</div>`
          : '';

        let mediaHtml = '';
        if (kind === 'mp4') {
          mediaHtml = `
            <video class="reel-video" data-reel-video data-src="${escapeHtml(reel.url)}" ${poster ? `poster="${escapeHtml(poster)}"` : ''} playsinline muted loop preload="none"></video>
            <button type="button" class="reel-tap-overlay" data-reel-toggle aria-label="Play or pause reel"></button>
          `;
        } else if (kind === 'youtube') {
          mediaHtml = `
            <div class="reel-poster" ${poster ? `style="background-image:url('${escapeHtml(poster)}')"` : ''} data-reel-poster></div>
            <div class="reel-yt-host" id="reel-yt-${idx}" data-yt-id="${escapeHtml(ytId)}"></div>
            <button type="button" class="reel-tap-overlay" data-reel-toggle aria-label="Play or pause reel"></button>
          `;
        } else {
          mediaHtml = `
            <div class="reel-ig-wrap" data-ig-embed="${escapeHtml(igEmbed || '')}" data-ig-url="${escapeHtml(reel.url)}">
              <div class="reel-ig-fallback">
                <p>Watch this Reel on Instagram</p>
                <a href="${escapeHtml(reel.url)}" target="_blank" rel="noopener noreferrer" class="btn btn--instagram btn--sm">Watch on Instagram</a>
              </div>
            </div>
          `;
        }

        const muteBtnHtml =
          kind === 'instagram'
            ? ''
            : `<button type="button" class="reel-mute-btn" data-reel-mute aria-label="Unmute reel" aria-pressed="false">
                <svg class="icon-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                <svg class="icon-unmuted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              </button>`;

        const statusBadge =
          kind === 'instagram'
            ? ''
            : `<span class="reel-play-indicator" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
              </span>`;

        return `
          <article class="reel-card" data-reel-card data-reel-index="${idx}" data-reel-kind="${kind}">
            <div class="reel-frame">
              ${mediaHtml}
              ${statusBadge}
              <div class="reel-ui-bottom">
                ${titleHtml}
                ${muteBtnHtml}
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    const cards = Array.from(track.querySelectorAll('[data-reel-card]'));

    function setMuteBtnState(card, muted) {
      const btn = card.querySelector('[data-reel-mute]');
      if (!btn) return;
      btn.setAttribute('aria-pressed', String(!muted));
      btn.setAttribute('aria-label', muted ? 'Unmute reel' : 'Mute reel');
      btn.classList.toggle('is-unmuted', !muted);
    }

    function pauseAllExcept(keepIdx) {
      controllers.forEach((ctrl, idx) => {
        if (idx !== keepIdx) ctrl.pause();
      });
    }

    function activateCard(idx) {
      if (activeCardIndex === idx) return;
      activeCardIndex = idx;
      cards.forEach((c, i) => c.classList.toggle('is-active', i === idx));
      pauseAllExcept(idx);
      const ctrl = controllers.get(idx);
      if (ctrl) ctrl.play();
    }

    function hydrateCard(card) {
      const idx = Number(card.dataset.reelIndex);
      if (controllers.has(idx)) return;
      const kind = card.dataset.reelKind;

      if (kind === 'mp4') {
        const video = card.querySelector('[data-reel-video]');
        if (!video) return;
        if (!video.src && video.dataset.src) {
          video.src = video.dataset.src;
        }
        video.muted = true;
        const ctrl = {
          muted: true,
          play() {
            video.play().catch(() => {});
            card.classList.add('is-playing');
          },
          pause() {
            video.pause();
            card.classList.remove('is-playing');
          },
          togglePlay() {
            if (video.paused) {
              pauseAllExcept(idx);
              ctrl.play();
            } else {
              ctrl.pause();
            }
          },
          toggleMute() {
            ctrl.muted = !ctrl.muted;
            video.muted = ctrl.muted;
            setMuteBtnState(card, ctrl.muted);
          }
        };
        controllers.set(idx, ctrl);
      } else if (kind === 'youtube') {
        const host = card.querySelector('.reel-yt-host');
        const ytId = host ? host.dataset.ytId : null;
        if (!host || !ytId) return;

        let player = null;
        let ready = false;
        let wantPlay = false;
        const ctrl = {
          muted: true,
          play() {
            wantPlay = true;
            if (ready && player && typeof player.playVideo === 'function') {
              player.playVideo();
              card.classList.add('is-playing');
            }
          },
          pause() {
            wantPlay = false;
            if (ready && player && typeof player.pauseVideo === 'function') {
              player.pauseVideo();
              card.classList.remove('is-playing');
            }
          },
          togglePlay() {
            if (!ready || !player) return;
            const state = player.getPlayerState ? player.getPlayerState() : -1;
            if (state === 1) {
              ctrl.pause();
            } else {
              pauseAllExcept(idx);
              ctrl.play();
            }
          },
          toggleMute() {
            if (!ready || !player) return;
            if (ctrl.muted) {
              player.unMute();
              ctrl.muted = false;
            } else {
              player.mute();
              ctrl.muted = true;
            }
            setMuteBtnState(card, ctrl.muted);
          }
        };
        controllers.set(idx, ctrl);

        loadYouTubeAPI().then((YT) => {
          player = new YT.Player(host.id, {
            videoId: ytId,
            playerVars: {
              autoplay: 0,
              mute: 1,
              controls: 0,
              loop: 1,
              playlist: ytId,
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
              enablejsapi: 1
            },
            events: {
              onReady() {
                ready = true;
                player.mute();
                const poster = card.querySelector('[data-reel-poster]');
                if (poster) poster.classList.add('is-hidden');
                if (wantPlay || activeCardIndex === idx) {
                  player.playVideo();
                  card.classList.add('is-playing');
                }
              },
              onStateChange(e) {
                if (e.data === YT.PlayerState.PLAYING) {
                  card.classList.add('is-playing');
                } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
                  card.classList.remove('is-playing');
                }
              }
            }
          });
        });
      } else if (kind === 'instagram') {
        const wrap = card.querySelector('[data-ig-embed]');
        if (!wrap) return;
        const embedUrl = wrap.dataset.igEmbed;
        const origUrl = wrap.dataset.igUrl;
        if (embedUrl) {
          const iframe = document.createElement('iframe');
          iframe.src = embedUrl;
          iframe.className = 'reel-ig-iframe';
          iframe.setAttribute('loading', 'lazy');
          iframe.setAttribute('allowtransparency', 'true');
          iframe.setAttribute('allowfullscreen', 'true');
          iframe.setAttribute('title', 'Instagram Reel');
          iframe.addEventListener('error', () => {
            iframe.remove();
            wrap.classList.add('is-fallback');
          });
          wrap.prepend(iframe);
        } else {
          wrap.classList.add('is-fallback');
        }
        controllers.set(idx, {
          play() {},
          pause() {},
          togglePlay() {
            if (origUrl) window.open(origUrl, '_blank', 'noopener,noreferrer');
          },
          toggleMute() {}
        });
      }
    }

    // Event delegation for play/pause and mute/unmute
    track.addEventListener('click', (e) => {
      const muteBtn = e.target.closest('[data-reel-mute]');
      if (muteBtn) {
        e.stopPropagation();
        const card = muteBtn.closest('[data-reel-card]');
        const ctrl = card && controllers.get(Number(card.dataset.reelIndex));
        if (ctrl) ctrl.toggleMute();
        return;
      }

      const toggleBtn = e.target.closest('[data-reel-toggle]');
      if (toggleBtn) {
        const card = toggleBtn.closest('[data-reel-card]');
        if (!card) return;
        const idx = Number(card.dataset.reelIndex);
        hydrateCard(card);
        const ctrl = controllers.get(idx);
        if (ctrl) ctrl.togglePlay();
      }
    });

    // Lazy hydrate + auto-play the most visible card when section is in viewport
    const cardVisibility = new Map();
    let sectionInView = false;

    function pickMostVisibleCard() {
      if (!sectionInView) {
        pauseAllExcept(-1);
        activeCardIndex = -1;
        return;
      }
      let bestIdx = -1;
      let bestRatio = 0.45;
      cardVisibility.forEach((ratio, idx) => {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestIdx = idx;
        }
      });
      if (bestIdx >= 0) {
        hydrateCard(cards[bestIdx]);
        activateCard(bestIdx);
      }
    }

    if ('IntersectionObserver' in window) {
      const sectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            sectionInView = entry.isIntersecting;
            if (sectionInView) {
              cards.forEach((c, i) => {
                if (i < 2) hydrateCard(c);
              });
              pickMostVisibleCard();
            } else {
              pauseAllExcept(-1);
              activeCardIndex = -1;
            }
          });
        },
        { threshold: 0.2 }
      );
      sectionObserver.observe(section);

      const cardObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const idx = Number(entry.target.dataset.reelIndex);
            cardVisibility.set(idx, entry.intersectionRatio);
            if (entry.isIntersecting) hydrateCard(entry.target);
          });
          pickMostVisibleCard();
        },
        { root: track, threshold: [0, 0.25, 0.5, 0.75, 1] }
      );
      cards.forEach((c) => cardObserver.observe(c));
    } else {
      cards.forEach((c) => hydrateCard(c));
    }

    // Desktop Prev/Next arrows & drag-to-scroll
    const prevBtn = section.querySelector('[data-reels-prev]');
    const nextBtn = section.querySelector('[data-reels-next]');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        track.scrollBy({ left: -320, behavior: 'smooth' });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        track.scrollBy({ left: 320, behavior: 'smooth' });
      });
    }

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    track.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, a')) return;
      isDown = true;
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
      track.classList.add('is-dragging');
    });
    window.addEventListener('mouseup', () => {
      isDown = false;
      track.classList.remove('is-dragging');
    });
    track.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      track.scrollLeft = scrollLeft - (x - startX) * 1.4;
    });
  }

  document.addEventListener('DOMContentLoaded', initReelsSection);
})();
