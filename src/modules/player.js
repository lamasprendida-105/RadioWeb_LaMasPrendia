// ============================================
// player.js — Lógica del reproductor Vimeo (con lazy loading)
// ============================================

import { updatePlayerUI, updateMuteUI, updateLiveState } from './ui.js';

const VIMEO_PLAYER_SDK_URL = 'https://player.vimeo.com/api/player.js';

let vimeoPlayer = null;
let isPlaying = false;
let isMuted = false;
let currentVolume = 0.8;
let isReady = false;
let playerInitialized = false;

// Elementos DOM
const videoWrapper = document.getElementById('videoWrapper');
const placeholder = document.getElementById('playerPlaceholder');
const placeholderTitle = document.getElementById('placeholderTitle');
const placeholderSub = document.getElementById('placeholderSub');
const retryBtn = document.getElementById('retryBtn');
const playPauseBtn = document.getElementById('playPauseBtn');
const playPauseIcon = document.getElementById('playPauseIcon');
const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');
const volumeSlider = document.getElementById('volumeSlider');
const fullscreenBtn = document.getElementById('fullscreenBtn');

// Almacenar el videoId para usarlo cuando el reproductor se haga visible
let pendingVideoId = null;

export function initPlayer(videoId) {
  if (!videoId) {
    showPlaceholder('waiting', 'Transmisión inactiva', 'Prepárate para escuchar en línea');
    updatePlayerUI('waiting');
    return;
  }

  pendingVideoId = videoId;

  // Si el elemento ya está visible, inicializar inmediatamente
  if (isElementInViewport(videoWrapper)) {
    initializePlayer(videoId);
  } else {
    // Configurar Intersection Observer para cargar cuando sea visible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !playerInitialized) {
          initializePlayer(pendingVideoId);
          observer.disconnect();
        }
      });
    }, {
      rootMargin: '200px', // Comienza a cargar antes de que sea visible
      threshold: 0.1
    });

    observer.observe(videoWrapper);

    // Fallback: si el observer no se activa en 5 segundos, forzar carga
    setTimeout(() => {
      if (!playerInitialized) {
        observer.disconnect();
        initializePlayer(pendingVideoId);
      }
    }, 5000);
  }

  // Event listeners para controles
  playPauseBtn.addEventListener('click', togglePlayPause);
  muteBtn.addEventListener('click', toggleMute);
  volumeSlider.addEventListener('input', handleVolumeChange);
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  retryBtn.addEventListener('click', () => {
    if (pendingVideoId) {
      // Reiniciar limpiando el reproductor actual
      destroyPlayer();
      initializePlayer(pendingVideoId);
    }
  });
}

function isElementInViewport(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= -200 &&
    rect.left >= -200 &&
    rect.bottom <= (window.innerHeight + 200) &&
    rect.right <= (window.innerWidth + 200)
  );
}

function initializePlayer(videoId) {
  if (playerInitialized) return;
  playerInitialized = true;

  // Cargar SDK si no está disponible
  if (typeof Vimeo === 'undefined') {
    loadVimeoSDK(() => createPlayer(videoId));
  } else {
    createPlayer(videoId);
  }
}

function destroyPlayer() {
  if (vimeoPlayer) {
    try {
      vimeoPlayer.destroy();
    } catch (e) {}
    vimeoPlayer = null;
  }
  playerInitialized = false;
  isReady = false;
  isPlaying = false;
  // Limpiar iframe si existe
  const iframe = document.getElementById('vimeoIframe');
  if (iframe) iframe.remove();
  // Volver a mostrar placeholder
  if (placeholder) placeholder.style.display = 'block';
}

function loadVimeoSDK(callback) {
  const script = document.createElement('script');
  script.src = VIMEO_PLAYER_SDK_URL;
  script.onload = callback;
  script.onerror = () => {
    showPlaceholder('error', 'Error al cargar el reproductor', 'Verifica tu conexión y recarga la página');
    updatePlayerUI('error');
  };
  document.head.appendChild(script);
}

function createPlayer(videoId) {
  // Ocultar placeholder
  if (placeholder) placeholder.style.display = 'none';

  const iframe = document.createElement('iframe');
  iframe.src = `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=0&loop=0&title=0&byline=0&portrait=0`;
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  iframe.id = 'vimeoIframe';
  videoWrapper.appendChild(iframe);

  try {
    vimeoPlayer = new Vimeo.Player(iframe);

    vimeoPlayer.on('loaded', () => {
      isReady = true;
      showPlaceholder('loading', 'Cargando transmisión...', 'Espera un momento');
      updatePlayerUI('waiting');
    });

    vimeoPlayer.on('play', () => {
      isPlaying = true;
      updatePlayerUI('playing');
      updateLiveState(true);
      setupMediaSession();
    });

    vimeoPlayer.on('pause', () => {
      isPlaying = false;
      updatePlayerUI('paused');
      updateLiveState(false);
    });

    vimeoPlayer.on('ended', () => {
      isPlaying = false;
      updatePlayerUI('ended');
      updateLiveState(false);
    });

    vimeoPlayer.on('error', (err) => {
      console.error('Vimeo error:', err);
      showPlaceholder('error', 'Error en la transmisión', 'Intenta recargar la página');
      updatePlayerUI('error');
      updateLiveState(false);
    });

    // Configurar volumen inicial
    vimeoPlayer.setVolume(currentVolume).catch(() => {});
    updateMuteUI(isMuted, currentVolume);

    // Intentar reproducir automáticamente
    vimeoPlayer.play().catch(() => {
      // Si falla, mostrar botón de play
      updatePlayerUI('paused');
    });

  } catch (e) {
    console.error('Error al crear Vimeo Player:', e);
    showPlaceholder('error', 'Error al iniciar el reproductor', 'Intenta de nuevo más tarde');
    updatePlayerUI('error');
  }
}

function showPlaceholder(state, title, sub) {
  if (!placeholder) return;
  placeholder.style.display = 'block';
  placeholderTitle.textContent = title;
  placeholderSub.textContent = sub || '';

  if (state === 'error') {
    retryBtn.style.display = 'inline-flex';
  } else {
    retryBtn.style.display = 'none';
  }
  const icon = placeholder.querySelector('i');
  if (state === 'error') {
    icon.style.animation = 'none';
    icon.style.color = 'var(--clr-accent-orange)';
  } else {
    icon.style.animation = '';
    icon.style.color = 'var(--clr-primary)';
  }
}

function togglePlayPause() {
  if (!vimeoPlayer) return;
  if (isPlaying) {
    vimeoPlayer.pause().catch(() => {});
  } else {
    vimeoPlayer.play().catch(() => {});
  }
}

function toggleMute() {
  if (!vimeoPlayer) return;
  isMuted = !isMuted;
  const vol = isMuted ? 0 : currentVolume;
  vimeoPlayer.setVolume(vol).catch(() => {});
  updateMuteUI(isMuted, currentVolume);
}

function handleVolumeChange(e) {
  const val = parseInt(e.target.value, 10) / 100;
  currentVolume = val;
  isMuted = val === 0;
  if (vimeoPlayer) {
    vimeoPlayer.setVolume(val).catch(() => {});
  }
  updateMuteUI(isMuted, currentVolume);
}

function toggleFullscreen() {
  const el = document.getElementById('vimeoIframe') || videoWrapper;
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else if (el.msRequestFullscreen) el.msRequestFullscreen();
}

function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'La Más Prendida 105.1 FM',
      artist: 'Transmisión en Vivo',
      album: 'Radio',
      artwork: [
        { src: '/img/imgLMP.jpg', sizes: '96x96', type: 'image/jpeg' },
        { src: '/img/imgLMP.jpg', sizes: '256x256', type: 'image/jpeg' },
        { src: '/img/imgLMP.jpg', sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => vimeoPlayer?.play().catch(() => {}));
    navigator.mediaSession.setActionHandler('pause', () => vimeoPlayer?.pause().catch(() => {}));
    navigator.mediaSession.playbackState = 'playing';
  } catch (e) {}
}

export function getPlayerState() {
  return { isPlaying, isReady };
}