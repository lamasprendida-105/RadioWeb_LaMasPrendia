// ============================================
// player.js — Reproductor Vimeo Event optimizado
// ============================================
// Estrategia:
//   1. SDK cargado con Promise (sin polling ni setInterval)
//   2. Detección de estado en vivo via eventos del SDK
//   3. visibilitychange para reanudar en Android al volver a la app
//   4. Media Session API para controles en notificación y evitar
//      que el sistema operativo mate el audio en segundo plano
//   5. RECONEXIÓN AUTOMÁTICA (Polling silencioso): Si el stream está
//      inactivo, recarga el iframe cada 25 segundos de forma invisible
//      hasta detectar el inicio del en vivo, evitando recargar la web.

import { updatePlayerUI, updateLiveState } from './ui.js';

const VIMEO_SDK_URL   = 'https://player.vimeo.com/api/player.js';
const LIVE_TIMEOUT_MS = 8000; // Si no hay 'playing' en 8s → OFFLINE
const POLL_INTERVAL_MS = 25000; // Intentar reconectar cada 25s si está offline

let player  = null;
let isLive  = false;
let pollTimeout = null;
let initialCheckTimeout = null;

// ─── Punto de entrada ────────────────────────────────────────────────────────
export function initPlayer() {
  // Estado inicial siempre esperando confirmación
  updatePlayerUI('waiting');
  updateLiveState(false);

  // Carga el SDK y luego inicializa el player
  loadVimeoSDK()
    .then(setupPlayer)
    .catch(() => console.warn('[player] No se pudo cargar el SDK de Vimeo'));
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

    // Cancelar cualquier chequeo inicial previo antes de armar uno nuevo
    if (initialCheckTimeout) clearTimeout(initialCheckTimeout);
    initialCheckTimeout = setTimeout(checkInitialLiveStatus, LIVE_TIMEOUT_MS);

    // Manejar visibilidad (Android: volver a app, bloquear pantalla, etc.)
    setupVisibilityHandling();

  } catch (e) {
    console.warn('[player] Error al inicializar Vimeo.Player:', e);
    handleOffline();
  }
}

// ─── Handlers de eventos del stream ─────────────────────────────────────────
function handlePlaying() {
  isLive = true;
  stopOfflinePolling();
  updatePlayerUI('playing');
  updateLiveState(true);
  setupMediaSession(); // Activa controles en notificación del SO
}

function handlePause() {
  // En un evento en vivo, 'pause' casi siempre significa que el
  // broadcaster pausó o terminó la transmisión → OFFLINE
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

// Maneja la caída o inactividad del stream
function handleOffline() {
  isLive = false;
  updatePlayerUI('waiting');
  updateLiveState(false);
  startOfflinePolling();
}

// ─── Chequeo inicial tras timeout ────────────────────────────────────────────
function checkInitialLiveStatus() {
  if (isLive || !player) return; // Ya está en vivo, no hacemos nada
  player.getPaused()
    .then(paused => {
      if (paused) {
        handleOffline();
      }
    })
    .catch(() => {
      handleOffline();
    });
}

// ─── Polling silencioso para reconexión ──────────────────────────────────────
// Si la radio está inactiva, recarga el iframe periódicamente para detectar 
// en segundo plano cuándo el emisor enciende el live stream en Vimeo.
function startOfflinePolling() {
  if (pollTimeout) return; // Ya hay un ciclo de reconexión corriendo

  pollTimeout = setTimeout(() => {
    pollTimeout = null;

    // Si la pestaña está en segundo plano, no recargamos para ahorrar batería del usuario
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

  console.log('[player] Intentando reconexión silenciosa al stream de Vimeo...');

  // Limpiar listeners del objeto actual antes de destruirlo
  if (player) {
    player.off('playing');
    player.off('pause');
    player.off('ended');
    player.off('error');
    player = null;
  }

  // Forzar recarga del iframe reasignando su src
  const currentSrc = iframe.src;
  iframe.src = '';
  iframe.src = currentSrc;

  // Re-inicializar el reproductor sobre el nuevo ciclo de carga
  setTimeout(() => {
    setupPlayer();
  }, 1000);
}

// ─── Reanudación automática en Android ──────────────────────────────────────
function setupVisibilityHandling() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !player) return;

    // Si volvimos a la pestaña activa y la radio debería estar transmitiendo, reanudar
    if (isLive) {
      player.getPaused()
        .then(paused => {
          if (paused) {
            player.play().catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      // Si la pestaña vuelve a estar visible y estábamos en polling de espera,
      // intentamos forzar una reconexión inmediata para actualizar el estado rápido
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