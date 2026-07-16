// ============================================
// radio-player.js — Reproductor de radio (audio-only)
// ============================================
// Usa Vimeo Player SDK (mismo SDK que player.js) con un iframe oculto.
// Auto-play al cargar la página. Controles independientes: play/pause,
// mute, volumen. Media Session API para controles en notificación del SO.

import { updateRadioPlayerUI, updateRadioMuteUI, updateRadioLiveState } from './ui.js';

const VIMEO_SDK_URL = 'https://player.vimeo.com/api/player.js';
const LIVE_TIMEOUT_MS = 8000;

let player = null;
let isPlaying = false;
let isMuted = false;
let currentVolume = 0.8;
let isReady = false;
let videoId = null;

// ─── Punto de entrada ────────────────────────────────────────────────────────
export function initRadioPlayer(id) {
  videoId = id;

  updateRadioPlayerUI('waiting');
  updateRadioLiveState(false);

  if (!videoId) {
    updateRadioPlayerUI('offline');
    return;
  }

  loadVimeoSDK()
    .then(setupRadioPlayer)
    .catch(() => {
      console.warn('[radio-player] No se pudo cargar el SDK de Vimeo');
      updateRadioPlayerUI('error');
    });

  bindControls();
}

// ─── Carga del SDK (reutiliza la misma lógica que player.js) ─────────────────
function loadVimeoSDK() {
  return new Promise((resolve, reject) => {
    if (typeof Vimeo !== 'undefined' && Vimeo.Player) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${VIMEO_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = VIMEO_SDK_URL;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ─── Inicialización del player oculto ────────────────────────────────────────
function setupRadioPlayer() {
  const wrapper = document.getElementById('radioAudioWrapper');
  if (!wrapper) return;

  // Crear iframe oculto (audio-only)
  const iframe = document.createElement('iframe');
  iframe.src = `https://player.vimeo.com/video/${videoId}?autoplay=1&background=1`;
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'autoplay; encrypted-media');
  iframe.setAttribute('title', 'La Más Prendida 105.1 FM — Radio');
  iframe.style.cssText = 'height:0;overflow:hidden;position:absolute;opacity:0;pointer-events:none;width:1px;';
  wrapper.appendChild(iframe);

  try {
    player = new Vimeo.Player(iframe);

    player.on('playing', handlePlaying);
    player.on('pause', handlePause);
    player.on('ended', handleEnded);
    player.on('error', handleError);

    // Aplicar volumen inicial
    player.setVolume(currentVolume).catch(() => { });

    // Auto-play con fallback
    attemptAutoplay();

    // Timeout: si no llega 'playing' en LIVE_TIMEOUT_MS → OFFLINE
    setTimeout(checkInitialLiveStatus, LIVE_TIMEOUT_MS);

    // Reanudación al volver a la pestaña (Android)
    setupVisibilityHandling();

    isReady = true;
  } catch (e) {
    console.warn('[radio-player] Error al inicializar Vimeo.Player:', e);
    updateRadioPlayerUI('error');
  }
}

// ─── Auto-play con manejo de errores del navegador ───────────────────────────
function attemptAutoplay() {
  if (!player) return;

  player.play()
    .then(() => {
      isPlaying = true;
      updateRadioPlayerUI('playing');
      updateRadioLiveState(true);
      setupMediaSession();
    })
    .catch(() => {
      // El navegador bloqueó autoplay — mostrar botón de play
      isPlaying = false;
      updateRadioPlayerUI('paused');
      updateRadioLiveState(false);
    });
}

// ─── Bind de controles DOM ──────────────────────────────────────────────────
function bindControls() {
  const playPauseBtn = document.getElementById('radioPlayPauseBtn');
  const muteBtn = document.getElementById('radioMuteBtn');
  const volumeSlider = document.getElementById('radioVolumeSlider');

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', togglePlayPause);
  }
  if (muteBtn) {
    muteBtn.addEventListener('click', toggleMute);
  }
  if (volumeSlider) {
    volumeSlider.addEventListener('input', handleVolumeChange);
  }
}

// ─── Acciones de control ────────────────────────────────────────────────────
function togglePlayPause() {
  if (!player) return;

  if (isPlaying) {
    player.pause().catch(() => { });
  } else {
    player.play().catch(() => { });
  }
}

function toggleMute() {
  if (!player) return;

  isMuted = !isMuted;
  player.setVolume(isMuted ? 0 : currentVolume).catch(() => { });
  updateRadioMuteUI(isMuted, isMuted ? 0 : currentVolume);
}

function handleVolumeChange(e) {
  if (!player) return;

  currentVolume = parseInt(e.target.value, 10) / 100;
  isMuted = currentVolume === 0;
  player.setVolume(currentVolume).catch(() => { });
  updateRadioMuteUI(isMuted, currentVolume);
}

// ─── Handlers de eventos del stream ─────────────────────────────────────────
function handlePlaying() {
  isPlaying = true;
  updateRadioPlayerUI('playing');
  updateRadioLiveState(true);
  setupMediaSession();
}

function handlePause() {
  isPlaying = false;
  updateRadioPlayerUI('paused');
  updateRadioLiveState(false);
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused';
  }
}

function handleEnded() {
  isPlaying = false;
  updateRadioPlayerUI('ended');
  updateRadioLiveState(false);
}

function handleError() {
  isPlaying = false;
  updateRadioPlayerUI('error');
  updateRadioLiveState(false);
}

// ─── Chequeo inicial tras timeout ────────────────────────────────────────────
function checkInitialLiveStatus() {
  if (isPlaying || !player) return;
  player.getPaused()
    .then(paused => {
      if (paused) {
        updateRadioPlayerUI('waiting');
        updateRadioLiveState(false);
      }
    })
    .catch(() => {
      updateRadioPlayerUI('waiting');
      updateRadioLiveState(false);
    });
}

// ─── Reanudación automática en Android ──────────────────────────────────────
function setupVisibilityHandling() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !player) return;
    if (isPlaying) {
      player.getPaused()
        .then(paused => {
          if (paused) {
            player.play().catch(() => { });
          }
        })
        .catch(() => { });
    }
  });
}

// ─── Media Session API ───────────────────────────────────────────────────────
function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'La Más Prendida 105.1 FM',
      artist: 'Radio — Solo Audio',
      album: '105.1 FM · Ocotlán de Morelos, Oax.',
      artwork: [
        { src: '/img/imgLMP.jpg', sizes: '96x96', type: 'image/jpeg' },
        { src: '/img/imgLMP.jpg', sizes: '256x256', type: 'image/jpeg' },
        { src: '/img/imgLMP.jpg', sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => player?.play().catch(() => { }));
    navigator.mediaSession.setActionHandler('pause', () => player?.pause().catch(() => { }));
    navigator.mediaSession.setActionHandler('stop', () => player?.pause().catch(() => { }));

    navigator.mediaSession.playbackState = 'playing';
  } catch (_) { /* API no disponible */ }
}

// ─── API pública ─────────────────────────────────────────────────────────────
export function getRadioPlayerState() {
  return { isPlaying, isMuted, currentVolume, isReady, videoId };
}
