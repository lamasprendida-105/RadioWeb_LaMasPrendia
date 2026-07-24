// ============================================
// main.js — Punto de entrada de la aplicación
// ============================================

// Si el usuario entra a una subruta inexistente (ej. /robots),
// limpia la barra de direcciones y lo devuelve al index principal.
if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
  window.history.replaceState(null, '', '/');
}


import { initTheme, toggleTheme } from './modules/theme.js';
import { initPlayer } from './modules/player.js';
import { initRadioPlayer } from './modules/radio-player.js';
import { initUI } from './modules/ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar tema (claro/oscuro)
  initTheme();

  // Inicializar interfaz de usuario (footer year, etc.)
  initUI();

  // Inicializar reproductor Vimeo Event (iframe embebido en HTML)
  initPlayer();

  // Inicializar reproductor de radio (audio-only, auto-play)
  // ID del Vimeo Event de La Más Prendida 105.1 FM
  initRadioPlayer('6056588');

  // Exponer toggleTheme globalmente para el botón
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
});
