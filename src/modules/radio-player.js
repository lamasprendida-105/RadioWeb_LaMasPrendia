// ============================================
// radio-player.js — Reproductor de radio (audio-only)
// ============================================
// Estrategia para audio en background / pantalla de bloqueo:
//
//   1. keepAlive <audio> nativo (silence.wav en loop): actúa como ancla
//      de la sesión de audio del SO. Sin esto, iOS/Android suspenden el
//      iframe cuando la pantalla se bloquea.
//
//   2. Media Session API registrada en el <audio> nativo: el SO muestra
//      los controles en la pantalla de bloqueo y en el notification shade.
//
//   3. Vimeo Event iframe (audio-only): stream real. Comparte la sesión
//      de audio ya activa gracias al keepAlive.
//
//   4. Reconexión automática con backoff exponencial: si el stream cae
//      (error / ended), reintenta solo, hasta MAX_RECONNECT_ATTEMPTS.
//
//   5. visibilitychange + pageshow: reanuda el stream al volver a la app.
//
// NOTA: background=1 en Vimeo MUTEA el audio → NO se usa aquí.

import { updateRadioPlayerUI, updateRadioMuteUI, updateRadioLiveState } from './ui.js';

const VIMEO_SDK_URL         = 'https://player.vimeo.com/api/player.js';
const LIVE_TIMEOUT_MS       = 10_000;
const RECONNECT_BASE_MS     = 3_000;
const MAX_RECONNECT_ATTEMPTS = 8;

// ─── Estado ──────────────────────────────────────────────────────────────────
let player              = null;
let keepAliveAudio      = null;   // <audio> nativo silencioso
let isPlaying           = false;
let isMuted             = false;
let currentVolume       = 0.8;
let isReady             = false;
let eventId             = null;
let reconnectAttempts   = 0;
let reconnectTimer      = null;
let liveCheckTimer      = null;

// ─── Punto de entrada ────────────────────────────────────────────────────────
export function initRadioPlayer(id) {
  eventId = id;

  updateRadioPlayerUI('waiting');
  updateRadioLiveState(false);

  if (!eventId) {
    updateRadioPlayerUI('offline');
    return;
  }

  // Crear keepAlive audio nativo ANTES de cualquier interacción de usuario.
  // Lo activamos en el primer gesto (click play) para satisfacer las
  // restricciones de autoplay del navegador.
  keepAliveAudio = new Audio('/silence.wav');
  keepAliveAudio.loop = true;
  keepAliveAudio.volume = 0;  // Totalmente silencioso
  keepAliveAudio.preload = 'auto';

  // Registrar Media Session sobre el audio nativo (ancla del SO)
  registerMediaSessionHandlers();

  loadVimeoSDK()
    .then(setupRadioPlayer)
    .catch(() => {
      console.warn('[radio-player] No se pudo cargar el SDK de Vimeo');
      updateRadioPlayerUI('error');
    });

  bindControls();
  setupVisibilityHandling();
}

// ─── Carga del SDK (reutiliza script si ya existe) ───────────────────────────
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

// ─── Inicialización / reinicialización del iframe Vimeo ──────────────────────
function setupRadioPlayer() {
  const wrapper = document.getElementById('radioAudioWrapper');
  if (!wrapper) return;

  // Limpiar iframe anterior si existe (para reconexiones)
  wrapper.innerHTML = '';
  player = null;

  // URL del Vimeo Event (NO usar background=1: mutea el audio)
  const iframe = document.createElement('iframe');
  iframe.src = `https://vimeo.com/event/${eventId}/embed?autoplay=1&autopause=0`;
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
  iframe.setAttribute('title', 'La Más Prendida 105.1 FM — Radio');
  // Oculto visualmente pero funcional (height:0 elimina el iframe del layout)
  iframe.style.cssText = [
    'position:absolute',
    'width:1px',
    'height:1px',
    'opacity:0',
    'pointer-events:none',
    'overflow:hidden',
    'border:0',
  ].join(';');
  wrapper.appendChild(iframe);

  try {
    player = new Vimeo.Player(iframe);

    player.on('playing', handlePlaying);
    player.on('pause',   handlePause);
    player.on('ended',   handleEnded);
    player.on('error',   handleError);

    player.setVolume(currentVolume).catch(() => {});

    // Auto-play al init (puede ser bloqueado por el navegador)
    attemptAutoplay();

    // Si no llega 'playing' en LIVE_TIMEOUT_MS → mostrar OFFLINE
    clearTimeout(liveCheckTimer);
    liveCheckTimer = setTimeout(checkInitialLiveStatus, LIVE_TIMEOUT_MS);

    isReady = true;
  } catch (e) {
    console.warn('[radio-player] Error al inicializar Vimeo.Player:', e);
    scheduleReconnect();
  }
}

// ─── Auto-play (primer intento o reconexión) ─────────────────────────────────
function attemptAutoplay() {
  if (!player) return;

  player.play()
    .then(() => {
      // El navegador permitió autoplay
      startKeepAlive();
    })
    .catch(() => {
      // Autoplay bloqueado — esperar gesto del usuario
      updateRadioPlayerUI('paused');
      updateRadioLiveState(false);
    });
}

// ─── keepAlive: arrancar audio nativo silencioso ──────────────────────────────
// Debe llamarse desde un gesto de usuario o desde la primera vez que
// el stream empieza a reproducirse (el evento 'playing' de Vimeo).
function startKeepAlive() {
  if (!keepAliveAudio || keepAliveAudio._started) return;
  keepAliveAudio.play()
    .then(() => {
      keepAliveAudio._started = true;
    })
    .catch(() => {
      // Puede fallar si no hubo gesto. Se reintenta en togglePlayPause.
    });
}

// ─── Bind de controles DOM ──────────────────────────────────────────────────
function bindControls() {
  const playPauseBtn = document.getElementById('radioPlayPauseBtn');
  const muteBtn      = document.getElementById('radioMuteBtn');
  const volumeSlider = document.getElementById('radioVolumeSlider');

  if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
  if (muteBtn)      muteBtn.addEventListener('click', toggleMute);
  if (volumeSlider) volumeSlider.addEventListener('input', handleVolumeChange);
}

// ─── Acciones de control ────────────────────────────────────────────────────
function togglePlayPause() {
  if (!player) return;

  if (isPlaying) {
    player.pause().catch(() => {});
    if (keepAliveAudio) keepAliveAudio.pause();
  } else {
    // Gesto de usuario: podemos arrancar el keepAlive de forma segura
    startKeepAlive();
    player.play().catch(() => {});
    reconnectAttempts = 0; // Reset backoff al resumir manualmente
  }
}

function toggleMute() {
  if (!player) return;

  isMuted = !isMuted;
  player.setVolume(isMuted ? 0 : currentVolume).catch(() => {});
  updateRadioMuteUI(isMuted, isMuted ? 0 : currentVolume);
}

function handleVolumeChange(e) {
  if (!player) return;

  currentVolume = parseInt(e.target.value, 10) / 100;
  isMuted       = currentVolume === 0;
  player.setVolume(currentVolume).catch(() => {});
  updateRadioMuteUI(isMuted, currentVolume);
}

// ─── Handlers de eventos del stream ─────────────────────────────────────────
function handlePlaying() {
  isPlaying       = false; // lo pone en true justo abajo
  reconnectAttempts = 0;   // stream vivo → resetear backoff
  clearTimeout(reconnectTimer);

  isPlaying = true;
  updateRadioPlayerUI('playing');
  updateRadioLiveState(true);
  startKeepAlive();
  updateMediaSessionState('playing');
}

function handlePause() {
  isPlaying = false;
  updateRadioPlayerUI('paused');
  updateRadioLiveState(false);
  updateMediaSessionState('paused');
  // 'pause' en un evento en vivo puede ser interrupción temporal
  // → intentar reconectar automáticamente
  scheduleReconnect();
}

function handleEnded() {
  isPlaying = false;
  updateRadioPlayerUI('ended');
  updateRadioLiveState(false);
  updateMediaSessionState('paused');
  scheduleReconnect();
}

function handleError(data) {
  console.warn('[radio-player] Error Vimeo:', data);
  isPlaying = false;
  updateRadioPlayerUI('error');
  updateRadioLiveState(false);
  updateMediaSessionState('paused');
  scheduleReconnect();
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

// ─── Reconexión con backoff exponencial ──────────────────────────────────────
// Espera: 3s, 6s, 12s, 24s, 48s, ... hasta MAX_RECONNECT_ATTEMPTS.
// Solo reconecta si el usuario no pausó manualmente (isPlaying tracking).
function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    updateRadioPlayerUI('offline');
    return;
  }
  clearTimeout(reconnectTimer);
  const delay = RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts);
  reconnectAttempts++;
  console.info(`[radio-player] Reconectando en ${delay / 1000}s (intento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  reconnectTimer = setTimeout(() => {
    if (!document.hidden) {
      setupRadioPlayer();
    }
    // Si la pestaña está oculta, esperar a que vuelva (manejado en visibilitychange)
  }, delay);
}

// ─── Reanudación al volver al foco (Android / iOS) ──────────────────────────
// Cubre tres casos:
//   - visibilitychange: volver desde otra pestaña o sacar de background
//   - pageshow: BFCache (navegación hacia atrás/adelante)
//   - focus: volver desde app externa en algunos navegadores
function setupVisibilityHandling() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;

    // Si había una reconexión pendiente (diferida por estar oculto), ejecutarla
    if (reconnectTimer && reconnectAttempts > 0 && !isPlaying) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
      setupRadioPlayer();
      return;
    }

    // El stream estaba en vivo: intentar retomar
    if (isPlaying && player) {
      player.getPaused()
        .then(paused => {
          if (paused) {
            startKeepAlive();
            player.play().catch(() => {});
          }
        })
        .catch(() => {
          // iframe puede haber muerto → reconectar
          scheduleReconnect();
        });
    }
  });

  // BFCache: el browser restaura la página desde caché
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    if (isPlaying && player) {
      player.play().catch(() => {});
    }
  });
}

// ─── Media Session API ───────────────────────────────────────────────────────
// Se registra sobre el keepAliveAudio nativo para que el SO reconozca
// esta página como una sesión de audio válida (controles de pantalla de
// bloqueo, notification shade, auriculares Bluetooth, etc.).
function registerMediaSessionHandlers() {
  if (!('mediaSession' in navigator)) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  'La Más Prendida 105.1 FM',
      artist: 'Escucha en vivo — Radio Online',
      album:  '105.1 FM · Ocotlán de Morelos, Oax.',
      artwork: [
        { src: '/img/imgLMP.jpg', sizes: '96x96',   type: 'image/jpeg' },
        { src: '/img/imgLMP.jpg', sizes: '256x256', type: 'image/jpeg' },
        { src: '/img/imgLMP.jpg', sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      startKeepAlive();
      player?.play().catch(() => {});
      reconnectAttempts = 0;
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      player?.pause().catch(() => {});
      keepAliveAudio?.pause();
    });
    navigator.mediaSession.setActionHandler('stop', () => {
      player?.pause().catch(() => {});
      keepAliveAudio?.pause();
    });
  } catch (_) { /* API no disponible */ }
}

function updateMediaSessionState(state) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = state; // 'playing' | 'paused'
  } catch (_) {}
}

// ─── API pública ─────────────────────────────────────────────────────────────
export function getRadioPlayerState() {
  return { isPlaying, isMuted, currentVolume, isReady, eventId };
}
