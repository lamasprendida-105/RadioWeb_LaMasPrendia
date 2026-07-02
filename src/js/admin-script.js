// Estado de la transmisión
let isStreaming = true;
let currentQuality = "medium";
let viewersCount = 24;
let uptimeSeconds = 0;
let uptimeInterval;
let fluctuationInterval;
let peakViewers = 24;

// Elementos DOM
const qualitySelect = document.getElementById('qualitySelect');
const audioBitrateSelect = document.getElementById('audioBitrate');
const currentQualityBadge = document.getElementById('currentQualityBadge');
const startStreamBtn = document.getElementById('startStreamBtn');
const stopStreamBtn = document.getElementById('stopStreamBtn');
const streamStateBadge = document.getElementById('streamStateBadge');
const viewerCountDisplay = document.getElementById('viewerCountDisplay');
const uptimeSpan = document.getElementById('uptime');
const adminQualityLabel = document.getElementById('adminQualityLabel');
const refreshStatsBtn = document.getElementById('refreshStatsBtn');
const manualViewers = document.getElementById('manualViewers');
const updateViewersBtn = document.getElementById('updateViewersBtn');
const peakViewersSpan = document.getElementById('peakViewers');

// Nuevos elementos de personalización
const streamTitleInput = document.getElementById('streamTitle');
const streamSubtitleInput = document.getElementById('streamSubtitle');
const welcomeMessageInput = document.getElementById('welcomeMessage');
const chatAccentColor = document.getElementById('chatAccentColor');
const applyPersonalizationBtn = document.getElementById('applyPersonalizationBtn');
const announcerNameInput = document.getElementById('announcerName');
const dailyPhraseInput = document.getElementById('dailyPhrase');
const primaryColorInput = document.getElementById('primaryColor');
const secondaryColorInput = document.getElementById('secondaryColor');
const applyBrandingBtn = document.getElementById('applyBrandingBtn');
const facebookUrl = document.getElementById('facebookUrl');
const instagramUrl = document.getElementById('instagramUrl');
const whatsappUrl = document.getElementById('whatsappUrl');
const tiktokUrl = document.getElementById('tiktokUrl');
const applySocialBtn = document.getElementById('applySocialBtn');
const sendGlobalNotificationBtn = document.getElementById('sendGlobalNotificationBtn');
const resetViewersBtn = document.getElementById('resetViewersBtn');
const exportConfigBtn = document.getElementById('exportConfigBtn');
const importConfigBtn = document.getElementById('importConfigBtn');
const importFile = document.getElementById('importFile');
const bufferTime = document.getElementById('bufferTime');
const streamId = document.getElementById('streamId');

// Guardar configuración en localStorage
function syncToLocalStorage() {
    localStorage.setItem('streamQuality', currentQuality);
    localStorage.setItem('audioBitrate', audioBitrateSelect.value);
    localStorage.setItem('streamState', isStreaming);
    localStorage.setItem('viewersCount', viewersCount);
    localStorage.setItem('peakViewers', peakViewers);
    localStorage.setItem('bufferTime', bufferTime.value);
    localStorage.setItem('streamId', streamId.value);
    
    // Personalización
    localStorage.setItem('streamTitle', streamTitleInput.value);
    localStorage.setItem('streamSubtitle', streamSubtitleInput.value);
    localStorage.setItem('welcomeMessage', welcomeMessageInput.value);
    localStorage.setItem('chatAccentColor', chatAccentColor.value);
    localStorage.setItem('announcerName', announcerNameInput.value);
    localStorage.setItem('dailyPhrase', dailyPhraseInput.value);
    localStorage.setItem('primaryColor', primaryColorInput.value);
    localStorage.setItem('secondaryColor', secondaryColorInput.value);
    
    // Redes sociales
    localStorage.setItem('facebookUrl', facebookUrl.value);
    localStorage.setItem('instagramUrl', instagramUrl.value);
    localStorage.setItem('whatsappUrl', whatsappUrl.value);
    localStorage.setItem('tiktokUrl', tiktokUrl.value);
}

function updateQualityDisplay() {
    if (currentQuality === "high") {
        currentQualityBadge.innerText = "Calidad: Alta";
        adminQualityLabel.innerText = "1080p";
    } else if (currentQuality === "medium") {
        currentQualityBadge.innerText = "Calidad: Media";
        adminQualityLabel.innerText = "720p";
    } else {
        currentQualityBadge.innerText = "Calidad: Baja";
        adminQualityLabel.innerText = "480p";
    }
    syncToLocalStorage();
}

function updateUI() {
    if (isStreaming) {
        streamStateBadge.innerHTML = "🔴 EN VIVO";
        streamStateBadge.style.color = "#E31B23";
        startStreamBtn.disabled = true;
        stopStreamBtn.disabled = false;
    } else {
        streamStateBadge.innerHTML = "⏹️ FUERA DE AIRE";
        streamStateBadge.style.color = "#aaa";
        startStreamBtn.disabled = false;
        stopStreamBtn.disabled = true;
    }
    viewerCountDisplay.innerText = viewersCount;
    if (peakViewersSpan) peakViewersSpan.innerText = peakViewers;
    syncToLocalStorage();
}

function startStream() {
    if (isStreaming) return;
    isStreaming = true;
    updateUI();
    startUptimeCounter();
    startViewerFluctuation();
    showAdminNotification("🔴 Transmisión INICIADA", "#E31B23");
    const event = new StorageEvent('storage', { key: 'streamState', newValue: 'true' });
    window.dispatchEvent(event);
}

function stopStream() {
    if (!isStreaming) return;
    isStreaming = false;
    updateUI();
    if (uptimeInterval) clearInterval(uptimeInterval);
    if (fluctuationInterval) clearInterval(fluctuationInterval);
    showAdminNotification("⏹️ Transmisión DETENIDA", "#555");
    const event = new StorageEvent('storage', { key: 'streamState', newValue: 'false' });
    window.dispatchEvent(event);
}

function startUptimeCounter() {
    if (uptimeInterval) clearInterval(uptimeInterval);
    uptimeSeconds = 0;
    uptimeInterval = setInterval(() => {
        if (isStreaming) {
            uptimeSeconds++;
            const hours = Math.floor(uptimeSeconds / 3600);
            const mins = Math.floor((uptimeSeconds % 3600) / 60);
            const secs = uptimeSeconds % 60;
            uptimeSpan.innerText = `${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
        }
    }, 1000);
}

function startViewerFluctuation() {
    if (fluctuationInterval) clearInterval(fluctuationInterval);
    fluctuationInterval = setInterval(() => {
        if (isStreaming) {
            let variation = Math.floor(Math.random() * 9) - 2;
            viewersCount = Math.max(10, viewersCount + variation);
            viewersCount = Math.min(200, viewersCount);
            if (viewersCount > peakViewers) peakViewers = viewersCount;
            viewerCountDisplay.innerText = viewersCount;
            if (peakViewersSpan) peakViewersSpan.innerText = peakViewers;
            syncToLocalStorage();
        }
    }, 8000);
}

function showAdminNotification(message, bgColor = "#FFD700") {
    const notification = document.createElement('div');
    notification.className = 'admin-notification';
    notification.textContent = message;
    notification.style.background = bgColor;
    notification.style.color = bgColor === "#FFD700" ? "#000" : "#fff";
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Aplicar personalización
function applyPersonalization() {
    syncToLocalStorage();
    // Forzar actualización en la página de usuario
    const event = new StorageEvent('storage', { key: 'streamTitle', newValue: streamTitleInput.value });
    window.dispatchEvent(event);
    showAdminNotification("✓ Personalización aplicada", "#4caf50");
}

function applyBranding() {
    syncToLocalStorage();
    showAdminNotification("🎨 Estilos actualizados", "#4caf50");
}

function applySocialLinks() {
    syncToLocalStorage();
    showAdminNotification("🔗 Enlaces sociales actualizados", "#4caf50");
}

function sendGlobalNotification() {
    const message = prompt("Mensaje de notificación global:", "¡No te pierdas lo que viene! 🎵");
    if (message) {
        localStorage.setItem('globalNotification', JSON.stringify({ message, timestamp: Date.now() }));
        showAdminNotification("📢 Notificación enviada a todos los usuarios", "#FFD700");
        setTimeout(() => localStorage.removeItem('globalNotification'), 30000);
    }
}

function resetViewers() {
    if (confirm("¿Resetear el contador de espectadores a 0?")) {
        viewersCount = 0;
        peakViewers = 0;
        updateUI();
        syncToLocalStorage();
        showAdminNotification("Contador de espectadores reiniciado", "#E31B23");
    }
}

function exportConfig() {
    const config = {
        streamQuality: currentQuality,
        audioBitrate: audioBitrateSelect.value,
        bufferTime: bufferTime.value,
        streamId: streamId.value,
        streamTitle: streamTitleInput.value,
        streamSubtitle: streamSubtitleInput.value,
        welcomeMessage: welcomeMessageInput.value,
        chatAccentColor: chatAccentColor.value,
        announcerName: announcerNameInput.value,
        dailyPhrase: dailyPhraseInput.value,
        primaryColor: primaryColorInput.value,
        secondaryColor: secondaryColorInput.value,
        facebookUrl: facebookUrl.value,
        instagramUrl: instagramUrl.value,
        whatsappUrl: whatsappUrl.value,
        tiktokUrl: tiktokUrl.value
    };
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lamasprendida_config_${new Date().toISOString().slice(0,19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showAdminNotification("Configuración exportada", "#4caf50");
}

function importConfig() {
    importFile.click();
}

importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const config = JSON.parse(ev.target.result);
            if (config.streamQuality) qualitySelect.value = config.streamQuality;
            if (config.audioBitrate) audioBitrateSelect.value = config.audioBitrate;
            if (config.bufferTime) bufferTime.value = config.bufferTime;
            if (config.streamId) streamId.value = config.streamId;
            if (config.streamTitle) streamTitleInput.value = config.streamTitle;
            if (config.streamSubtitle) streamSubtitleInput.value = config.streamSubtitle;
            if (config.welcomeMessage) welcomeMessageInput.value = config.welcomeMessage;
            if (config.chatAccentColor) chatAccentColor.value = config.chatAccentColor;
            if (config.announcerName) announcerNameInput.value = config.announcerName;
            if (config.dailyPhrase) dailyPhraseInput.value = config.dailyPhrase;
            if (config.primaryColor) primaryColorInput.value = config.primaryColor;
            if (config.secondaryColor) secondaryColorInput.value = config.secondaryColor;
            if (config.facebookUrl) facebookUrl.value = config.facebookUrl;
            if (config.instagramUrl) instagramUrl.value = config.instagramUrl;
            if (config.whatsappUrl) whatsappUrl.value = config.whatsappUrl;
            if (config.tiktokUrl) tiktokUrl.value = config.tiktokUrl;
            
            currentQuality = qualitySelect.value;
            updateQualityDisplay();
            syncToLocalStorage();
            showAdminNotification("Configuración importada exitosamente", "#4caf50");
        } catch (err) {
            showAdminNotification("Error al importar archivo", "#E31B23");
        }
    };
    reader.readAsText(file);
    importFile.value = '';
});

// Event listeners
qualitySelect.addEventListener('change', (e) => {
    currentQuality = e.target.value;
    updateQualityDisplay();
});

audioBitrateSelect.addEventListener('change', () => syncToLocalStorage());
bufferTime.addEventListener('change', () => syncToLocalStorage());
streamId.addEventListener('change', () => syncToLocalStorage());

startStreamBtn.addEventListener('click', startStream);
stopStreamBtn.addEventListener('click', stopStream);

updateViewersBtn.addEventListener('click', () => {
    let newCount = parseInt(manualViewers.value);
    if (!isNaN(newCount) && newCount >= 1) {
        viewersCount = newCount;
        if (viewersCount > peakViewers) peakViewers = viewersCount;
        updateUI();
        syncToLocalStorage();
    }
});

refreshStatsBtn.addEventListener('click', () => {
    viewerCountDisplay.innerText = viewersCount;
    showAdminNotification(`Estadísticas: ${viewersCount} espectadores | Calidad: ${currentQuality}`);
});

applyPersonalizationBtn.addEventListener('click', applyPersonalization);
applyBrandingBtn.addEventListener('click', applyBranding);
applySocialBtn.addEventListener('click', applySocialLinks);
sendGlobalNotificationBtn.addEventListener('click', sendGlobalNotification);
resetViewersBtn.addEventListener('click', resetViewers);
exportConfigBtn.addEventListener('click', exportConfig);
importConfigBtn.addEventListener('click', importConfig);

// Cargar configuraciones guardadas
function loadSavedConfig() {
    const savedQuality = localStorage.getItem('streamQuality');
    const savedAudio = localStorage.getItem('audioBitrate');
    const savedBuffer = localStorage.getItem('bufferTime');
    const savedStreamId = localStorage.getItem('streamId');
    const savedTitle = localStorage.getItem('streamTitle');
    const savedSubtitle = localStorage.getItem('streamSubtitle');
    const savedWelcome = localStorage.getItem('welcomeMessage');
    const savedChatColor = localStorage.getItem('chatAccentColor');
    const savedAnnouncer = localStorage.getItem('announcerName');
    const savedPhrase = localStorage.getItem('dailyPhrase');
    const savedPrimary = localStorage.getItem('primaryColor');
    const savedSecondary = localStorage.getItem('secondaryColor');
    const savedFb = localStorage.getItem('facebookUrl');
    const savedIg = localStorage.getItem('instagramUrl');
    const savedWp = localStorage.getItem('whatsappUrl');
    const savedTt = localStorage.getItem('tiktokUrl');
    
    if (savedQuality) currentQuality = savedQuality;
    if (savedAudio) audioBitrateSelect.value = savedAudio;
    if (savedBuffer) bufferTime.value = savedBuffer;
    if (savedStreamId) streamId.value = savedStreamId;
    if (savedTitle) streamTitleInput.value = savedTitle;
    if (savedSubtitle) streamSubtitleInput.value = savedSubtitle;
    if (savedWelcome) welcomeMessageInput.value = savedWelcome;
    if (savedChatColor) chatAccentColor.value = savedChatColor;
    if (savedAnnouncer) announcerNameInput.value = savedAnnouncer;
    if (savedPhrase) dailyPhraseInput.value = savedPhrase;
    if (savedPrimary) primaryColorInput.value = savedPrimary;
    if (savedSecondary) secondaryColorInput.value = savedSecondary;
    if (savedFb) facebookUrl.value = savedFb;
    if (savedIg) instagramUrl.value = savedIg;
    if (savedWp) whatsappUrl.value = savedWp;
    if (savedTt) tiktokUrl.value = savedTt;
    
    qualitySelect.value = currentQuality;
    updateQualityDisplay();
}

// Cerrar panel
document.getElementById('closeAdminBtn').addEventListener('click', () => {
    window.close();
});

// Inicializar
function init() {
    loadSavedConfig();
    updateUI();
    startUptimeCounter();
    startViewerFluctuation();
    manualViewers.value = viewersCount;
    syncToLocalStorage();
}
// Cerrar sesión
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('adminAuthenticated');
        sessionStorage.removeItem('adminUser');
        sessionStorage.removeItem('loginTime');
        window.location.href = 'admin-login.html';
    });
}

// Verificar autenticación al cargar el panel
function checkAuth() {
    const isAuthenticated = sessionStorage.getItem('adminAuthenticated');
    if (!isAuthenticated || isAuthenticated !== 'true') {
        window.location.href = 'admin-login.html';
    }
}

// Llamar a checkAuth al inicio
checkAuth();

init();