// ============================================
// player.js — Reproductor Vimeo Event optimizado
// ============================================
// Estrategia:
//   1. SDK cargado con Promise (sin polling ni setInterval)
//   2. Detección de estado en vivo via eventos del SDK
//   3. visibilitychange para reanudar en Android al volver a la app
//   4. Media Session API para controles en notificación y evitar
//      que el sistema operativo mate el audio en segundo plano
//   5. RECONEXIÓN AUTOMÁTICA: Si el stream está inactivo, recarga
//      el iframe cada 90 segundos de forma suave (fade) para detectar
//      cuándo el broadcaster enciende el en vivo.

import { updatePlayerUI, updateLiveState } from './ui.js';

const VIMEO_SDK_URL    = 'https://player.vimeo.com/api/player.js';
const LIVE_TIMEOUT_MS  = 8000;  // Si no hay 'playing' en 8s → OFFLINE
const POLL_INTERVAL_MS = 90000; // Intentar reconectar cada 90s si está offline

let player  = null;
let isLive  = false;
let pollTimeout = null;
let initialCheckTimeout = null;
let visibilityHandlerRegistered = false;

// ─── Punto de entrada ────────────────────────────────────────────────────────
export function initPlayer() {
  updatePlayerUI('waiting');
  updateLiveState(false);

  loadVimeoSDK()
    .then(setupPlayer)
    .catch(() => {});
}

// ─── Carga del SDK ───────────────────────────────────────────────────────────
function loadVimeoSDK() {
  return new Promise((resolve, reject) => {
    if (typeof Vimeo !== 'undefined' && Vimeo.Player) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${VIMEO_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load',  resolve, { once: true });
      existing.addEventListener('error', reject,  { once: true });
      return;
    }
    const script    = document.createElement('script');
    script.src      = VIMEO_SDK_URL;
    script.onload   = resolve;
    script.onerror  = reject;
    document.head.appendChild(script);
  });
}

// ─── Inicialización del player ───────────────────────────────────────────────
function setupPlayer() {
  const iframe = document.getElementById('vimeoIframe');
  if (!iframe) return;

  try {
    player = new Vimeo.Player(iframe);

    player.on('playing', handlePlaying);
    player.on('pause',   handlePause);
    player.on('ended',   handleEnded);
    player.on('error',   handleError);

    if (initialCheckTimeout) clearTimeout(initialCheckTimeout);
    initialCheckTimeout = setTimeout(checkInitialLiveStatus, LIVE_TIMEOUT_MS);

    // Solo registrar el listener de visibilidad una vez
    if (!visibilityHandlerRegistered) {
      setupVisibilityHandling();
      visibilityHandlerRegistered = true;
    }

  } catch (_) {
    handleOffline();
  }
}

// ─── Handlers de eventos del stream ─────────────────────────────────────────
function handlePlaying() {
  isLive = true;
  stopOfflinePolling();
  updatePlayerUI('playing');
  updateLiveState(true);
  setupMediaSession();

  // Restaurar opacidad del iframe por si estaba en transición
  const iframe = document.getElementById('vimeoIframe');
  if (iframe) iframe.style.opacity = '1';
}

function handlePause() {
  handleOffline();
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused';
  }
}

function handleEnded() {
  handleOffline();
}

function handleError() {
  handleOffline();
}

function handleOffline() {
  isLive = false;
  updatePlayerUI('waiting');
  updateLiveState(false);
  startOfflinePolling();
}

// ─── Chequeo inicial tras timeout ────────────────────────────────────────────
function checkInitialLiveStatus() {
  if (isLive || !player) return;
  player.getPaused()
    .then(paused => {
      if (paused) handleOffline();
    })
    .catch(() => handleOffline());
}

// ─── Polling silencioso para reconexión ──────────────────────────────────────
// Recarga el iframe de forma suave cada 90 segundos mientras el stream
// esté inactivo, sin parpadeos visibles para el usuario.
function startOfflinePolling() {
  if (pollTimeout) return;

  pollTimeout = setTimeout(() => {
    pollTimeout = null;

    // No recargar si la pestaña está en segundo plano (ahorro de batería)
    if (document.hidden) {
      startOfflinePolling();
      return;
    }

    reloadIframe();
  }, POLL_INTERVAL_MS);
}

function stopOfflinePolling() {
  if (pollTimeout) {
    clearTimeout(pollTimeout);
    pollTimeout = null;
  }
}

function reloadIframe() {
  const iframe = document.getElementById('vimeoIframe');
  if (!iframe) return;

  // Limpiar listeners del player actual
  if (player) {
    player.off('playing');
    player.off('pause');
    player.off('ended');
    player.off('error');
    player = null;
  }

  // Recarga suave: solo reasignar el src (sin ponerlo en blanco primero)
  // Esto evita el parpadeo/flash visible que causaba iframe.src = ''
  const currentSrc = iframe.src;
  iframe.src = currentSrc;

  // Re-inicializar el reproductor tras un breve delay para que el iframe comience a cargar
  setTimeout(() => {
    setupPlayer();
  }, 1500);
}

// ─── Reanudación automática en Android ──────────────────────────────────────
function setupVisibilityHandling() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !player) return;

    if (isLive) {
      // Si estaba en vivo y volvimos a la pestaña, intentar reanudar
      player.getPaused()
        .then(paused => {
          if (paused) player.play().catch(() => {});
        })
        .catch(() => {});
    } else {
      // Si estaba offline y la pestaña vuelve a estar visible,
      // forzar una reconexión inmediata
      stopOfflinePolling();
      reloadIframe();
    }
  });
}

// ─── Media Session API ───────────────────────────────────────────────────────
function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  'La Más Prendida 105.1 FM',
      artist: 'Transmisión en Vivo',
      album:  '105.1 FM · Ocotlán de Morelos, Oax.',
      artwork: [
        { src: '/img/imgLMP1.jpg', sizes: '96x96',   type: 'image/jpeg' },
        { src: '/img/imgLMP1.jpg', sizes: '256x256', type: 'image/jpeg' },
        { src: '/img/imgLMP1.jpg', sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    navigator.mediaSession.setActionHandler('play',  () => player?.play().catch(() => {}));
    navigator.mediaSession.setActionHandler('pause', () => player?.pause().catch(() => {}));
    navigator.mediaSession.setActionHandler('stop',  () => player?.pause().catch(() => {}));

    navigator.mediaSession.playbackState = 'playing';
  } catch (_) { }
}

// ─── API pública ─────────────────────────────────────────────────────────────
export function getPlayerState() {
  return { isLive, player };
}