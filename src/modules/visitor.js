// ============================================
// visitor.js — Contador de visitantes con animación
// ============================================

const VISITOR_KEY = 'lmp_visitor_count';

export function initVisitorCounter() {
  const counterElement = document.getElementById('visitorCount');
  if (!counterElement) return;

  let finalCount = getVisitorCount();
  // Incrementar solo si es la primera visita en esta sesión
  if (!sessionStorage.getItem('lmp_visitor_visited')) {
    finalCount += 1;
    setVisitorCount(finalCount);
    sessionStorage.setItem('lmp_visitor_visited', 'true');
  }

  // Animar el contador desde 0 hasta finalCount
  animateCounter(counterElement, finalCount);
}

function getVisitorCount() {
  try {
    const stored = localStorage.getItem(VISITOR_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function setVisitorCount(count) {
  try {
    localStorage.setItem(VISITOR_KEY, String(count));
  } catch (e) {
    // Fallback: no hacer nada
  }
}

/**
 * Anima un elemento desde 0 hasta el número final.
 * @param {HTMLElement} element - El elemento que muestra el número.
 * @param {number} finalValue - El número final a mostrar.
 * @param {number} duration - Duración de la animación en ms (default 1000).
 */
function animateCounter(element, finalValue, duration = 1000) {
  const startTime = performance.now();
  const startValue = 0;

  function updateCounter(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Función de easing: ease-out quad
    const easedProgress = 1 - (1 - progress) * (1 - progress);
    const currentValue = Math.round(easedProgress * finalValue);

    element.textContent = currentValue;

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = finalValue;
      // Efecto "pop" al finalizar
      element.classList.remove('pop');
      // Forzar reflow para reiniciar la animación
      void element.offsetWidth;
      element.classList.add('pop');
    }
  }

  requestAnimationFrame(updateCounter);
}