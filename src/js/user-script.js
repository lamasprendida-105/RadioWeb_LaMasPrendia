// Estado de la transmisión (se sincroniza con Admin vía localStorage)
let isStreaming = true;
let currentQuality = "medium";
let viewersCount = 24;

// Elementos DOM
const streamVideo = document.getElementById('streamVideo');
const liveStatusText = document.getElementById('liveStatusText');
const qualityIndicator = document.getElementById('qualityIndicator');
const viewersOnlineSpan = document.getElementById('viewersOnline');
const chatMessagesDiv = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');

// Navegación entre secciones
const navLinks = document.querySelectorAll('.nav-links a[data-page]');
const sections = {
    inicio: document.getElementById('inicioSection'),
    directo: document.getElementById('inicioSection'), // Directo redirige a inicio (stream)
    contacto: document.getElementById('contactoSection')
};

// Función para cambiar de sección
function switchToPage(pageId) {
    // Ocultar todas las secciones
    Object.values(sections).forEach(section => {
        if (section) section.classList.remove('active-section');
    });
    
    // Mostrar la sección seleccionada
    if (pageId === 'directo') pageId = 'inicio';
    if (sections[pageId]) {
        sections[pageId].classList.add('active-section');
    }
    
    // Actualizar clase activa en navegación
    navLinks.forEach(link => {
        if (link.getAttribute('data-page') === pageId || 
            (pageId === 'inicio' && link.getAttribute('data-page') === 'directo')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Si cambiamos a inicio y el stream estaba detenido, intentar reanudar
    if (pageId === 'inicio' && isStreaming && streamVideo && !streamVideo.src) {
        updateStreamQuality();
        streamVideo.play().catch(e => console.log("autoplay"));
    }
}

// Event listeners para navegación
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        switchToPage(page);
    });
});

// Cargar configuración desde localStorage (enviada por Admin)
function loadAdminConfig() {
    const savedQuality = localStorage.getItem('streamQuality');
    const savedAudio = localStorage.getItem('audioBitrate');
    const savedState = localStorage.getItem('streamState');
    const savedViewers = localStorage.getItem('viewersCount');
    
    if (savedQuality) currentQuality = savedQuality;
    if (savedState !== null) isStreaming = savedState === 'true';
    if (savedViewers) viewersCount = parseInt(savedViewers);
    
    updateStreamQuality();
    updateUI();
}

function updateStreamQuality() {
    let videoSource = "";
    
    if (currentQuality === "high") {
        videoSource = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
        qualityIndicator.innerHTML = '<i class="fas fa-tachometer-alt"></i> Calidad actual: Alta (1080p) · Audio ' + (localStorage.getItem('audioBitrate') || '192') + 'kbps';
    } else if (currentQuality === "medium") {
        videoSource = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFunflies.mp4";
        qualityIndicator.innerHTML = '<i class="fas fa-tachometer-alt"></i> Calidad actual: Media (720p) · Audio ' + (localStorage.getItem('audioBitrate') || '192') + 'kbps';
    } else {
        videoSource = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4";
        qualityIndicator.innerHTML = '<i class="fas fa-tachometer-alt"></i> Calidad actual: Baja (480p) · Audio ' + (localStorage.getItem('audioBitrate') || '192') + 'kbps';
    }
    
    if (isStreaming && streamVideo) {
        const wasPlaying = !streamVideo.paused;
        streamVideo.src = videoSource;
        streamVideo.load();
        if (wasPlaying) streamVideo.play().catch(e => console.log("autoplay"));
    }
}

function updateUI() {
    if (isStreaming) {
        liveStatusText.innerText = "TRANSMISIÓN EN VIVO";
        const liveDot = document.querySelector('.live-dot');
        if (liveDot) liveDot.style.background = "#E31B23";
    } else {
        liveStatusText.innerText = "TRANSMISIÓN DETENIDA";
        const liveDot = document.querySelector('.live-dot');
        if (liveDot) liveDot.style.background = "#666";
        if (streamVideo) {
            streamVideo.pause();
            streamVideo.src = "";
        }
    }
    viewersOnlineSpan.innerText = viewersCount;
}

// Escuchar cambios desde Admin (localStorage)
window.addEventListener('storage', (e) => {
    if (e.key === 'streamQuality') {
        currentQuality = e.newValue;
        updateStreamQuality();
    }
    if (e.key === 'streamState') {
        isStreaming = e.newValue === 'true';
        updateUI();
        if (isStreaming) updateStreamQuality();
    }
    if (e.key === 'viewersCount') {
        viewersCount = parseInt(e.newValue);
        viewersOnlineSpan.innerText = viewersCount;
    }
    if (e.key === 'audioBitrate') {
        updateStreamQuality();
    }
});

// Controles del usuario
document.getElementById('muteBtn').addEventListener('click', () => {
    if(streamVideo) {
        streamVideo.muted = !streamVideo.muted;
        document.getElementById('muteBtn').innerHTML = streamVideo.muted ? '<i class="fas fa-volume-mute"></i> Escuchar' : '<i class="fas fa-volume-up"></i> Silenciar';
    }
});

document.getElementById('fullscreenBtn').addEventListener('click', () => {
    if(streamVideo.requestFullscreen) streamVideo.requestFullscreen();
});

// Chat
function addChatMessage(username, message) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    const nombreMostrado = username === 'admin' ? '🎙️ La Más Prendida' : `👤 ${username}`;
    msgDiv.innerHTML = `<strong>${nombreMostrado}:</strong> ${message}`;
    chatMessagesDiv.appendChild(msgDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}

sendChatBtn.addEventListener('click', () => {
    const msg = chatInput.value.trim();
    if(msg === "") return;
    const randomName = "Oyente" + Math.floor(Math.random()*900);
    addChatMessage(randomName, msg);
    chatInput.value = "";
});

chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendChatBtn.click(); });

// Acceso a Admin (abrir nueva ventana)
document.getElementById('adminAccessBtn').addEventListener('click', () => {
    window.open('admin.html', '_blank', 'width=1200,height=800');
});

// ===== FORMULARIO DE CONTACTO =====
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

function showFormMessage(message, isError = false) {
    formMessage.textContent = message;
    formMessage.className = 'form-message ' + (isError ? 'error' : 'success');
    
    // Auto ocultar después de 5 segundos
    setTimeout(() => {
        formMessage.textContent = '';
        formMessage.className = 'form-message';
    }, 5000);
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Obtener valores
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const subject = document.getElementById('contactSubject').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    
    // Validaciones
    if (!name) {
        showFormMessage('Por favor, ingresa tu nombre completo', true);
        return;
    }
    
    if (!email) {
        showFormMessage('Por favor, ingresa tu correo electrónico', true);
        return;
    }
    
    if (!validateEmail(email)) {
        showFormMessage('Por favor, ingresa un correo electrónico válido', true);
        return;
    }
    
    if (!subject) {
        showFormMessage('Por favor, ingresa un asunto', true);
        return;
    }
    
    if (!message) {
        showFormMessage('Por favor, escribe tu mensaje', true);
        return;
    }
    
    // Simular envío (en producción aquí iría fetch a backend)
    console.log('Datos del formulario:', { name, email, phone, subject, message });
    
    // Mostrar mensaje de éxito
    showFormMessage('✓ ¡Mensaje enviado con éxito! Te responderemos a la brevedad.');
    
    // Limpiar formulario
    contactForm.reset();
});

// Inicializar
loadAdminConfig();
if(streamVideo) streamVideo.play().catch(e => console.log("autoplay denegado"));