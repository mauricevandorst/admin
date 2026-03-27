// Session management
const SESSION_KEY = 'ricedesk_session';

function getSession() {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    try {
        return JSON.parse(stored);
    } catch (e) {
        return null;
    }
}

function saveSession(userProfile) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(userProfile));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

function isLoggedIn() {
    return getSession() !== null;
}

// Show/hide the login screen
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function hideLoginScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    if (!username || !password) {
        errorEl.textContent = 'Vul gebruikersnaam en wachtwoord in';
        errorEl.classList.remove('hidden');
        return;
    }

    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Inloggen...';

    try {
        const config = getAppConfig();
        const basicAuthHeader = btoa(`${config.username}:${config.password}`);

        const response = await fetch(`${config.apiUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuthHeader}`
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const userProfile = await response.json();
            saveSession(userProfile);
            updateNavUserInfo(userProfile);
            hideLoginScreen();
            switchTab('dashboard');
        } else {
            errorEl.textContent = 'Ongeldige gebruikersnaam of wachtwoord';
            errorEl.classList.remove('hidden');
        }
    } catch (e) {
        errorEl.textContent = 'Kan geen verbinding maken met de server';
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Inloggen';
    }
}

function handleLogout() {
    clearSession();
    showLoginScreen();
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
}

function updateNavUserInfo(userProfile) {
    const nameEl = document.getElementById('navUserName');
    if (nameEl) nameEl.textContent = userProfile.displayName || userProfile.username;

    const usersNavItem = document.getElementById('nav-users-wrapper');
    if (usersNavItem) {
        if (userProfile.isAdmin) {
            usersNavItem.classList.remove('hidden');
        } else {
            usersNavItem.classList.add('hidden');
        }
    }
    const mobileUsersBtn = document.getElementById('mobile-nav-users');
    if (mobileUsersBtn) {
        if (userProfile.isAdmin) {
            mobileUsersBtn.classList.remove('hidden');
        } else {
            mobileUsersBtn.classList.add('hidden');
        }
    }
}

// Override global fetch to always include API-level BasicAuth headers
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    const config = getAppConfig();
    const basicAuthHeader = btoa(`${config.username}:${config.password}`);
    options.headers = {
        'Authorization': `Basic ${basicAuthHeader}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    return originalFetch(url, options);
};

// Initialise auth state on page load
document.addEventListener('DOMContentLoaded', () => {
    const session = getSession();
    if (session) {
        updateNavUserInfo(session);
        hideLoginScreen();
        switchTab('dashboard');
    } else {
        showLoginScreen();
    }
}, { once: true });

console.log('Auth module geladen');
