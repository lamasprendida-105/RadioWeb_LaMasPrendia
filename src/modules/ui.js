// ============================================
// ui.js — Actualizaciones de la interfaz de usuario
// ============================================

const soundBars = document.getElementById('soundBars');
const playerStatusText = document.getElementById('playerStatusText');
const liveDot = document.getElementById('playerLiveDot');
const liveText = document.getElementById('playerLiveText');
const playPauseIcon = document.getElementById('playPauseIcon');
const muteIcon = document.getElementById('muteIcon');

const LIVE_COLOR_ON = 'var(--clr-live-dot)';
const LIVE_COLOR_OFF = 'var(--clr-text-muted)';

/**
 * Actualiza la UI del reproductor según el estado.
 * @param {string} state - 'playing' | 'paused' | 'ended' | 'error' | 'waiting'
 */
export function updatePlayerUI(state) {
  const states = {
    playing: {
      icon: 'fa-pause',
      barsPaused: false,
      status: 'Transmisión en vivo',
      dotPaused: false,
      liveLabel: 'EN VIVO',
      liveColor: LIVE_COLOR_ON,
    },
    paused: {
      icon: 'fa-play',
      barsPaused: true,
      status: 'En pausa',
      dotPaused: true,
      liveLabel: 'PAUSADO',
      liveColor: LIVE_COLOR_OFF,
    },
    ended: {
      icon: 'fa-redo',
      barsPaused: true,
      status: 'Transmisión finalizada',
      dotPaused: true,
      liveLabel: 'FIN',
      liveColor: LIVE_COLOR_OFF,
    },
    error: {
      icon: 'fa-exclamation-triangle',
      barsPaused: true,
      status: 'Error de conexión',
      dotPaused: true,
      liveLabel: 'ERROR',
      liveColor: '#FF6B35',
    },
    waiting: {
      icon: 'fa-tower-broadcast',
      barsPaused: true,
      status: 'Transmisión inactiva',
      dotPaused: true,
      liveLabel: 'OFFLINE',
      liveColor: LIVE_COLOR_OFF,
    },
  };

  const s = states[state] || states.waiting;

  // Play/Pause icon
  if (playPauseIcon) playPauseIcon.className = `fas ${s.icon}`;

  // Sound bars
  if (soundBars) {
    soundBars.classList.toggle('paused', s.barsPaused);
  }

  // Status text
  if (playerStatusText) playerStatusText.textContent = s.status;

  // Live dot and label
  if (liveDot) liveDot.classList.toggle('paused', s.dotPaused);
  if (liveText) {
    liveText.textContent = s.liveLabel;
    liveText.style.color = s.liveColor;
  }
}

/**
 * Actualiza la UI de volumen y mute.
 * @param {boolean} muted - Si está silenciado
 * @param {number} volume - Volumen actual (0-1)
 */
export function updateMuteUI(muted, volume) {
  if (!muteIcon) return;
  const vol = muted ? 0 : volume;
  if (vol === 0) {
    muteIcon.className = 'fas fa-volume-mute';
  } else if (vol < 0.5) {
    muteIcon.className = 'fas fa-volume-down';
  } else {
    muteIcon.className = 'fas fa-volume-up';
  }

  const slider = document.getElementById('volumeSlider');
  if (slider) {
    slider.value = Math.round(vol * 100);
  }
}

/**
 * Actualiza el estado EN VIVO de la interfaz.
 * @param {boolean} live - Si está en vivo
 */
export function updateLiveState(live) {
  const dot = document.getElementById('playerLiveDot');
  const text = document.getElementById('playerLiveText');
  if (dot) {
    dot.classList.toggle('paused', !live);
  }
  if (text) {
    text.textContent = live ? 'EN VIVO' : 'PAUSADO';
    text.style.color = live ? LIVE_COLOR_ON : LIVE_COLOR_OFF;
  }
}

/**
 * Inicializa elementos de UI general (año del footer).
 */
export function initUI() {
  const footerYear = document.getElementById('footerYear');
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  // Ocultar tip de audio en desktop
  const tip = document.getElementById('bgAudioTip');
  if (tip && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    tip.style.display = 'none';
  }
}