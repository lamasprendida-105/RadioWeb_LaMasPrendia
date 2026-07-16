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
  const statusText = document.getElementById('playerStatusText');

  if (dot) dot.classList.toggle('paused', !live);

  if (text) {
    text.textContent = live ? 'EN VIVO' : 'OFFLINE';
    text.style.color = live ? LIVE_COLOR_ON : LIVE_COLOR_OFF;
  }

  if (statusText) {
    statusText.textContent = live ? 'Transmisión en vivo' : 'Transmisión inactiva';
  }
}

// ─── RADIO PLAYER UI ──────────────────────────────────────────────────────────

const radioSoundBars     = document.getElementById('radioSoundBars');
const radioStatusText    = document.getElementById('radioStatusText');
const radioLiveDot       = document.getElementById('radioLiveDot');
const radioLiveText      = document.getElementById('radioLiveText');
const radioPlayPauseIcon = document.getElementById('radioPlayPauseIcon');
const radioMuteIcon      = document.getElementById('radioMuteIcon');

/**
 * Actualiza la UI del reproductor de radio según el estado.
 * @param {string} state - 'playing' | 'paused' | 'ended' | 'error' | 'waiting' | 'offline'
 */
export function updateRadioPlayerUI(state) {
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
    offline: {
      icon: 'fa-radio',
      barsPaused: true,
      status: 'Radio offline',
      dotPaused: true,
      liveLabel: 'OFFLINE',
      liveColor: LIVE_COLOR_OFF,
    },
  };

  const s = states[state] || states.waiting;

  if (radioPlayPauseIcon) radioPlayPauseIcon.className = `fas ${s.icon}`;
  if (radioSoundBars) radioSoundBars.classList.toggle('paused', s.barsPaused);
  if (radioStatusText) radioStatusText.textContent = s.status;
  if (radioLiveDot) radioLiveDot.classList.toggle('paused', s.dotPaused);
  if (radioLiveText) {
    radioLiveText.textContent = s.liveLabel;
    radioLiveText.style.color = s.liveColor;
  }
}

/**
 * Actualiza la UI de volumen y mute del radio.
 * @param {boolean} muted - Si está silenciado
 * @param {number} volume - Volumen actual (0-1)
 */
export function updateRadioMuteUI(muted, volume) {
  if (!radioMuteIcon) return;
  const vol = muted ? 0 : volume;
  if (vol === 0) {
    radioMuteIcon.className = 'fas fa-volume-mute';
  } else if (vol < 0.5) {
    radioMuteIcon.className = 'fas fa-volume-down';
  } else {
    radioMuteIcon.className = 'fas fa-volume-up';
  }

  const slider = document.getElementById('radioVolumeSlider');
  if (slider) {
    slider.value = Math.round(vol * 100);
  }
}

/**
 * Actualiza el estado EN VIVO del radio.
 * @param {boolean} live - Si está en vivo
 */
export function updateRadioLiveState(live) {
  if (radioLiveDot) radioLiveDot.classList.toggle('paused', !live);
  if (radioLiveText) {
    radioLiveText.textContent = live ? 'EN VIVO' : 'OFFLINE';
    radioLiveText.style.color = live ? LIVE_COLOR_ON : LIVE_COLOR_OFF;
  }
  if (radioStatusText) {
    radioStatusText.textContent = live ? 'Transmisión en vivo' : 'Transmisión inactiva';
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

  // Ocultar/mostrar header al scrollear
  setupScrollHeader();
}

function setupScrollHeader() {
  const header = document.getElementById('mainHeader');
  if (!header) return;

  let lastScrollY = window.scrollY;
  const scrollThreshold = 10; // Tolerancia en pixeles para evitar parpadeos
  const minScroll = 80; // No ocultar hasta pasar 80px de scroll

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;

    // Ignorar rebote elástico en móviles (iOS)
    if (currentScrollY < 0 || currentScrollY + window.innerHeight > document.documentElement.scrollHeight) {
      return;
    }

    // Verificar si el cambio supera el umbral de tolerancia
    if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold) {
      return;
    }

    if (currentScrollY > lastScrollY && currentScrollY > minScroll) {
      // Scrolleando hacia abajo -> ocultar header
      header.classList.add('header--hidden');
    } else if (currentScrollY < lastScrollY) {
      // Scrolleando hacia arriba -> mostrar header
      header.classList.remove('header--hidden');
    }

    lastScrollY = currentScrollY;
  }, { passive: true });
}