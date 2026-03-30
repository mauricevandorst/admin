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

// Role checking functions
function getUserRole() {
    const session = getSession();
    // Support both camelCase 'role' and PascalCase 'Role' for backward compatibility
    return session?.role || session?.Role || 'Gast';
}

function hasRole(allowedRoles) {
    const userRole = getUserRole();
    return allowedRoles.includes(userRole);
}

function canEdit() {
    return hasRole(['Admin', 'AdministratiefMedewerker']);
}

function canDelete() {
    return hasRole(['Admin']);
}

function canViewSensitive() {
    return hasRole(['Admin', 'AdministratiefMedewerker', 'Medewerker']);
}

// Show/hide the login screen
function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (mainApp) mainApp.classList.add('hidden');
}

function hideLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const intakeMode = document.getElementById('intakeModeCheckbox')?.checked || false;
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

            // Add intake mode to session
            userProfile.intakeMode = intakeMode;

            saveSession(userProfile);

            // Redirect based on intake mode
            if (intakeMode) {
                window.location.href = 'intake.html';
            } else {
                updateNavUserInfo(userProfile);
                hideLoginScreen();
                switchTab('dashboard');
            }
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

// Switch to intake mode from admin portal
function switchToIntakeMode() {
    const session = getSession();
    if (!session) {
        alert('Je bent niet ingelogd');
        return;
    }

    // Update session to intake mode
    session.intakeMode = true;
    saveSession(session);

    // Redirect to intake page
    window.location.href = 'intake.html';
}

// Switch to admin mode from intake portal (called from intake.html)
function switchToAdminMode() {
    const session = getSession();
    if (!session) {
        alert('Je bent niet ingelogd');
        window.location.href = 'index.html';
        return;
    }

    // Update session to admin mode
    session.intakeMode = false;
    saveSession(session);

    // Clear intake session data
    sessionStorage.removeItem('intakeCustomer');

    // Redirect to admin portal
    window.location.href = 'index.html';
}

function updateNavUserInfo(userProfile) {
    const nameEl = document.getElementById('navUserName');
    if (nameEl) nameEl.textContent = userProfile.displayName || userProfile.username;

    const usersNavItem = document.getElementById('nav-users-wrapper');
    if (usersNavItem) {
        if (hasRole(['Admin'])) {
            usersNavItem.classList.remove('hidden');
        } else {
            usersNavItem.classList.add('hidden');
        }
    }
    const mobileUsersBtn = document.getElementById('mobile-nav-users');
    if (mobileUsersBtn) {
        if (hasRole(['Admin'])) {
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
    // Only run this on index.html (admin portal)
    const loginScreen = document.getElementById('loginScreen');
    if (!loginScreen) return; // Not on admin portal page

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
