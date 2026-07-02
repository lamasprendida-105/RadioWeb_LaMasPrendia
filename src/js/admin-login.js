// Credenciales de acceso (en producción esto debería estar en un servidor)
const ADMIN_CREDENTIALS = {
    username: "admin",
    password: "LamásPrendida2026"
};

// Verificar si ya hay una sesión activa
function checkExistingSession() {
    const session = sessionStorage.getItem('adminAuthenticated');
    if (session === 'true') {
        window.location.href = 'admin.html';
    }
}

// Función de login
function login(username, password) {
    // Validar credenciales
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        // Guardar sesión
        sessionStorage.setItem('adminAuthenticated', 'true');
        sessionStorage.setItem('adminUser', username);
        sessionStorage.setItem('loginTime', new Date().toISOString());
        
        // Mostrar mensaje de éxito y redirigir
        showMessage('✅ Acceso concedido. Redirigiendo...', false);
        
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 800);
        
        return true;
    } else {
        showMessage('❌ Usuario o contraseña incorrectos', true);
        return false;
    }
}

function showMessage(message, isError = true) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.className = 'error-message show';
    
    if (!isError) {
        errorDiv.style.background = 'rgba(76, 175, 80, 0.2)';
        errorDiv.style.borderColor = '#4caf50';
        errorDiv.style.color = '#4caf50';
    } else {
        errorDiv.style.background = 'rgba(227, 27, 35, 0.2)';
        errorDiv.style.borderColor = '#E31B23';
        errorDiv.style.color = '#E31B23';
    }
    
    // Limpiar mensaje después de 3 segundos si es error
    if (isError) {
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 3000);
    }
}

// Event listener del formulario
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showMessage('⚠️ Por favor, completa todos los campos', true);
        return;
    }
    
    login(username, password);
});

// Permitir Enter en los campos
document.getElementById('username').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('password').focus();
    }
});

document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
});

// Verificar sesión al cargar
checkExistingSession();