// ============================================
// player.js — Reproductor Vimeo Event optimizado
// ============================================
// Estrategia:
//   1. SDK cargado con Promise (sin polling ni setInterval)
//   2. Detección de estado en vivo via eventos del SDK
//   3. visibilitychange para reanudar en Android al volver a la app
//   4. Media Session API para controles en notificación y evitar
//      que el sistema operativo mate el audio en segundo plano

import { updatePlayerUI, updateLiveState } from './ui.js';

const VIMEO_SDK_URL   = 'https://player.vimeo.com/api/player.js';
const LIVE_TIMEOUT_MS = 8000; // Si no hay 'playing' en 8s → OFFLINE

let player  = null;
let isLive  = false;

// ─── Punto de entrada ────────────────────────────────────────────────────────
export function initPlayer() {
  // Estado inicial siempre OFFLINE hasta que el stream confirme actividad
  updatePlayerUI('waiting');
  updateLiveState(false);

  // Carga el SDK y luego inicializa el player (todo basado en Promises)
  loadVimeoSDK()
    .then(setupPlayer)
    .catch(() => console.warn('[player] No se pudo cargar el SDK de Vimeo'));
}

// ─── Carga del SDK sin polling ───────────────────────────────────────────────
// Usa un Promise limpio en lugar de setInterval cada 100ms.
// Si el SDK ya está en memoria, resuelve inmediatamente.
function loadVimeoSDK() {
  return new Promise((resolve, reject) => {
    // Ya cargado en memoria
    if (typeof Vimeo !== 'undefined' && Vimeo.Player) {
      resolve();
      return;
    }
    // Ya hay un tag script pendiente → esperar su evento load
    const existing = document.querySelector(`script[src="${VIMEO_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load',  resolve, { once: true });
      existing.addEventListener('error', reject,  { once: true });
      return;
    }
    // Crear el script y cargarlo de forma asíncrona
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

    // Timeout: si no llega 'playing' en LIVE_TIMEOUT_MS → declarar OFFLINE
    setTimeout(checkInitialLiveStatus, LIVE_TIMEOUT_MS);

    // Manejar visibilidad (Android: volver a app, bloquear pantalla, etc.)
    setupVisibilityHandling();

  } catch (e) {
    console.warn('[player] Error al inicializar Vimeo.Player:', e);
    updatePlayerUI('waiting');
    updateLiveState(false);
  }
}

// ─── Handlers de eventos del stream ─────────────────────────────────────────
function handlePlaying() {
  isLive = true;
  updatePlayerUI('playing');
  updateLiveState(true);
  setupMediaSession(); // Activa controles en notificación del SO
}

function handlePause() {
  // En un evento en vivo, 'pause' casi siempre significa que el
  // broadcaster pausó o terminó la transmisión → OFFLINE
  isLive = false;
  updatePlayerUI('waiting');
  updateLiveState(false);
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused';
  }
}

function handleEnded() {
  isLive = false;
  updatePlayerUI('waiting');
  updateLiveState(false);
}

function handleError() {
  isLive = false;
  updatePlayerUI('waiting');
  updateLiveState(false);
}

// ─── Chequeo inicial tras timeout ────────────────────────────────────────────
function checkInitialLiveStatus() {
  if (isLive || !player) return; // Ya estaba en vivo, nada que hacer
  player.getPaused()
    .then(paused => {
      if (paused) {
        updatePlayerUI('waiting');
        updateLiveState(false);
      }
    })
    .catch(() => {
      updatePlayerUI('waiting');
      updateLiveState(false);
    });
}

// ─── Reanudación automática en Android ──────────────────────────────────────
// Cuando el usuario sale de Chrome (bloquea pantalla, cambia de app),
// Android puede pausar el iframe. Al volver, si el stream estaba activo,
// intentamos retomar la reproducción automáticamente.
function setupVisibilityHandling() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !player) return;

    // La página volvió al frente: si el stream debería estar vivo, reanudar
    if (isLive) {
      player.getPaused()
        .then(paused => {
          if (paused) {
            player.play().catch(() => {
              // play() puede fallar si el navegador lo bloquea sin gesto de usuario.
              // En ese caso, la Media Session API ya registró la sesión activa
              // y el usuario puede reanudar desde la notificación del SO.
            });
          }
        })
        .catch(() => {});
    }
  });
}

// ─── Media Session API ───────────────────────────────────────────────────────
// Registra metadatos de reproducción en el SO (Android/iOS).
// Ventajas:
//   • Aparece en la barra de notificaciones con controles de play/pause
//   • Indica al SO que hay audio activo → evita que Chrome lo suspenda
//   • Permite controlar el audio desde la pantalla de bloqueo
function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  'La Más Prendida 105.1 FM',
      artist: 'Transmisión en Vivo',
      album:  '105.1 FM · Ocotlán de Morelos, Oax.',
      artwork: [
        { src: '/img/imgLMP.jpg', sizes: '96x96',   type: 'image/jpeg' },
        { src: '/img/imgLMP.jpg', sizes: '256x256', type: 'image/jpeg' },
        { src: '/img/imgLMP.jpg', sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    // Controles disponibles en la notificación del SO
    navigator.mediaSession.setActionHandler('play',  () => player?.play().catch(() => {}));
    navigator.mediaSession.setActionHandler('pause', () => player?.pause().catch(() => {}));
    navigator.mediaSession.setActionHandler('stop',  () => player?.pause().catch(() => {}));

    navigator.mediaSession.playbackState = 'playing';
  } catch (_) { /* API no disponible en este navegador */ }
}

// ─── API pública ─────────────────────────────────────────────────────────────
export function getPlayerState() {
  return { isLive, player };
}