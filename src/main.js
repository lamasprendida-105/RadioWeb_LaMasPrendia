// ============================================
// main.js — Punto de entrada de la aplicación
// ============================================

import { initTheme, toggleTheme } from './modules/theme.js';
import { initPlayer } from './modules/player.js';
import { initVisitorCounter } from './modules/visitor.js';
import { initUI } from './modules/ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar tema (claro/oscuro)
  initTheme();

  // Inicializar interfaz de usuario (footer year, etc.)
  initUI();

  // Inicializar reproductor Vimeo
  const videoId = null; // Reemplazar con ID real
  initPlayer(videoId);

  // Inicializar contador de visitantes
  initVisitorCounter();

  // Exponer toggleTheme globalmente para el botón
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
});
