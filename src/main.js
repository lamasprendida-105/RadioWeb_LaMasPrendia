/* ==============================================
   LA MÁS PRENDIDA 105.1 FM — Entry Point Vite
   ============================================== */

// CSS is loaded directly via <link> in index.html for render-blocking
// behaviour — this eliminates the Flash of Unstyled Content (FOUC).

// ==============================================
// SCRIPT PRINCIPAL (Vimeo Player SDK + Themes)
// ==============================================

(function () {
    'use strict';

    // ===========================
    // CONFIGURATION
    // ===========================
    const VIMEO_VIDEO_ID = null; // TODO: Reemplazar con ID real del livestream de Vimeo
    const STATION_NAME = 'La Más Prendida 105.1 FM';
    const STATION_TAGLINE = 'Transmisión en Vivo';
    const ARTWORK_URL = '/img/imgLMP.jpg';

    // ===========================
    // DOM ELEMENTS (cached once)
    // ===========================
    const $ = (id) => document.getElementById(id);
    const videoWrapper    = $('videoWrapper');
    const playerPlaceholder = $('playerPlaceholder');
    const playPauseBtn    = $('playPauseBtn');
    const playPauseIcon   = $('playPauseIcon');
    const muteBtn         = $('muteBtn');
    const muteIcon        = $('muteIcon');
    const volumeSlider    = $('volumeSlider');
    const fullscreenBtn   = $('fullscreenBtn');
    const soundBars       = $('soundBars');
    const playerStatusText = $('playerStatusText');
    const liveBadge       = $('liveBadge');
    const liveText        = $('liveText');
    const playerLiveDot   = $('playerLiveDot');
    const playerLiveText  = $('playerLiveText');
    const devNotice       = $('devNotice');
    const closeDevNotice  = $('closeDevNotice');
    const bgAudioTip      = $('bgAudioTip');
    const footerYear      = $('footerYear');
    const themeToggle     = $('themeToggle');
    const themeIcon       = $('themeIcon');

    // ===========================
    // STATE
    // ===========================
    let vimeoPlayer  = null;
    let isPlaying    = false;
    let isMuted      = false;
    let currentVolume = 0.8;

    // ===========================
    // THEME SYSTEM
    // NOTE: The anti-flash script in <head> already sets data-theme
    //       before CSS renders. This function only syncs the icon.
    // ===========================
    function initTheme() {
        // The inline <script> in <head> already applied the correct
        // data-theme from localStorage before first paint.
        // We just need to sync the icon state here.
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        syncThemeIcon(theme);
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('lmp-theme', theme);
        syncThemeIcon(theme);

        // Update meta theme-color for mobile browser bar
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.content = theme === 'dark' ? '#060608' : '#FAFAFA';
        }
    }

    function syncThemeIcon(theme) {
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    }

    // ===========================
    // INIT
    // ===========================
    function init() {
        // Remove 'preload' class added by the inline <head> script.
        // Using double rAF ensures the first frame has already been painted
        // before transitions are re-enabled — zero flash guaranteed.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.documentElement.classList.remove('preload');
            });
        });

        // Theme sync (data-theme already applied by inline script)
        initTheme();

        // Footer year
        if (footerYear) footerYear.textContent = new Date().getFullYear();

        // Close dev notice
        if (closeDevNotice) {
            closeDevNotice.addEventListener('click', () => {
                devNotice.classList.add('hidden');
            });
        }

        // BG audio tip — only on mobile
        if (bgAudioTip && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            bgAudioTip.style.display = 'none';
        }

        // Event listeners
        if (playPauseBtn)  playPauseBtn.addEventListener('click', togglePlayPause);
        if (muteBtn)       muteBtn.addEventListener('click', toggleMute);
        if (volumeSlider)  volumeSlider.addEventListener('input', handleVolumeChange);
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', handleFullscreen);
        if (themeToggle)   themeToggle.addEventListener('click', toggleTheme);

        // Register Service Worker
        registerSW();

        // Initialize player
        if (VIMEO_VIDEO_ID) {
            initVimeoPlayer();
        } else {
            updatePlayerUI('waiting');
        }
    }

    // ===========================
    // VIMEO PLAYER
    // ===========================
    function initVimeoPlayer() {
        if (playerPlaceholder) playerPlaceholder.style.display = 'none';

        const iframe = document.createElement('iframe');
        iframe.src = `https://player.vimeo.com/video/${VIMEO_VIDEO_ID}?autoplay=1&muted=0&loop=0&title=0&byline=0&portrait=0`;
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';
        iframe.id = 'vimeoIframe';
        videoWrapper.appendChild(iframe);

        try {
            vimeoPlayer = new Vimeo.Player(iframe);

            vimeoPlayer.on('play', () => {
                isPlaying = true;
                updatePlayerUI('playing');
                setupMediaSession();
            });

            vimeoPlayer.on('pause', () => {
                isPlaying = false;
                updatePlayerUI('paused');
                updateMediaSessionState('paused');
            });

            vimeoPlayer.on('ended', () => {
                isPlaying = false;
                updatePlayerUI('ended');
            });

            vimeoPlayer.on('error', () => updatePlayerUI('error'));

            vimeoPlayer.setVolume(currentVolume).catch(() => {});
            vimeoPlayer.play().catch(() => updatePlayerUI('paused'));

        } catch (e) {
            console.error('Vimeo init failed:', e);
            updatePlayerUI('error');
        }
    }

    // ===========================
    // CONTROLS
    // ===========================
    function togglePlayPause() {
        if (!vimeoPlayer) return;
        (isPlaying ? vimeoPlayer.pause() : vimeoPlayer.play()).catch(() => {});
    }

    function toggleMute() {
        if (!vimeoPlayer) return;
        isMuted = !isMuted;
        vimeoPlayer.setVolume(isMuted ? 0 : currentVolume).catch(() => {});
        updateMuteUI();
    }

    function handleVolumeChange(e) {
        currentVolume = parseInt(e.target.value, 10) / 100;
        isMuted = currentVolume === 0;
        if (vimeoPlayer) vimeoPlayer.setVolume(currentVolume).catch(() => {});
        updateMuteUI();
    }

    function handleFullscreen() {
        const el = document.getElementById('vimeoIframe') || videoWrapper;
        const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (fn) fn.call(el);
    }

    // ===========================
    // UI UPDATES
    // ===========================
    const liveDots = () => [
        liveBadge?.querySelector('.live-dot'),
        playerLiveDot
    ].filter(Boolean);

    function updatePlayerUI(state) {
        const states = {
            playing: {
                icon: 'fa-pause',  bars: false, status: 'Transmisión en vivo',
                dotPaused: false, liveLabel: 'EN VIVO',  liveColor: 'var(--clr-live-dot)'
            },
            paused: {
                icon: 'fa-play',   bars: true,  status: 'En pausa',
                dotPaused: true,  liveLabel: 'PAUSADO',  liveColor: 'var(--clr-text-muted)'
            },
            ended: {
                icon: 'fa-redo',   bars: true,  status: 'Transmisión finalizada',
                dotPaused: true,  liveLabel: 'FIN',      liveColor: 'var(--clr-text-muted)'
            },
            error: {
                icon: 'fa-exclamation-triangle', bars: true, status: 'Error de conexión',
                dotPaused: true, liveLabel: 'ERROR', liveColor: 'var(--clr-accent-orange)'
            },
            waiting: {
                icon: 'fa-tower-broadcast', bars: true,  status: 'Transmisión Inactiva',
                dotPaused: true,  liveLabel: 'OFFLINE',  liveColor: 'var(--clr-text-muted)'
            }
        };

        const s = states[state];
        if (!s) return;

        if (playPauseIcon)   playPauseIcon.className   = `fas ${s.icon}`;
        if (soundBars)       soundBars.classList.toggle('paused', s.bars);
        if (playerStatusText) playerStatusText.textContent = s.status;

        liveDots().forEach(dot => dot.classList.toggle('paused', s.dotPaused));
        [liveText, playerLiveText].filter(Boolean).forEach(el => {
            el.textContent   = s.liveLabel;
            el.style.color   = s.liveColor;
        });
    }

    function updateMuteUI() {
        if (!muteIcon) return;
        muteIcon.className = isMuted || currentVolume === 0
            ? 'fas fa-volume-mute'
            : currentVolume < 0.5 ? 'fas fa-volume-down' : 'fas fa-volume-up';

        if (volumeSlider) {
            volumeSlider.value = isMuted ? 0 : Math.round(currentVolume * 100);
        }
    }

    // ===========================
    // MEDIA SESSION API
    // ===========================
    function setupMediaSession() {
        if (!('mediaSession' in navigator)) return;

        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title:  STATION_NAME,
                artist: STATION_TAGLINE,
                album:  '105.1 FM',
                artwork: [
                    { src: ARTWORK_URL, sizes: '96x96',   type: 'image/jpeg' },
                    { src: ARTWORK_URL, sizes: '256x256', type: 'image/jpeg' },
                    { src: ARTWORK_URL, sizes: '512x512', type: 'image/jpeg' }
                ]
            });

            const actions = {
                play:  () => vimeoPlayer?.play().catch(() => {}),
                pause: () => vimeoPlayer?.pause().catch(() => {}),
                stop:  () => vimeoPlayer?.pause().catch(() => {})
            };

            Object.entries(actions).forEach(([action, handler]) => {
                navigator.mediaSession.setActionHandler(action, handler);
            });

            navigator.mediaSession.playbackState = 'playing';
        } catch (e) {
            // Media Session API not supported
        }
    }

    function updateMediaSessionState(state) {
        try { navigator.mediaSession.playbackState = state; } catch (e) {}
    }

    // ===========================
    // SERVICE WORKER
    // ===========================
    function registerSW() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
    }

    // ===========================
    // VISIBILITY — keep audio alive
    // ===========================
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isPlaying) {
            updateMediaSessionState('playing');
        }
    });

    // ===========================
    // BOOT
    // ===========================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
