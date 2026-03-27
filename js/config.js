// Application Configuration
// ⚠️ BELANGRIJK: In productie, gebruik environment variables voor gevoelige data!
const APP_CONFIG = {
    apiUrl: 'https://ricedesk-api.azurewebsites.net/api',
    // Basic Authentication - Deze credentials worden gebruikt voor alle API calls
    // Voor productie: vervang door process.env variabelen of haal op van beveiligde bron
    username: 'admin',
    password: 'e4da26b5-2dc3-46eb-bb40-dc67bfe6e123',
    appName: 'RiceDesk',
    version: '2.0'
};

// User Settings (persoonlijke voorkeuren)
const USER_SETTINGS_KEY = 'ricedesk_user_settings';

const defaultUserSettings = {
    theme: 'light',
    language: 'nl',
    notifications: true,
    itemsPerPage: 10,
    dateFormat: 'DD-MM-YYYY',
    currency: 'EUR'
};

function getUserSettings() {
    const stored = localStorage.getItem(USER_SETTINGS_KEY);
    if (stored) {
        try {
            return { ...defaultUserSettings, ...JSON.parse(stored) };
        } catch (e) {
            console.error('Failed to parse user settings:', e);
        }
    }
    return { ...defaultUserSettings };
}

function saveUserSettings(settings) {
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
    applyUserSettings(settings);
}

function applyUserSettings(settings) {
    // Apply theme
    if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // More settings can be applied here as needed
}

function showUserSettings() {
    const settings = getUserSettings();
    const modal = document.getElementById('userSettingsModal');

    if (!modal) {
        console.error('User settings modal not found in DOM');
        showToast('Fout bij openen instellingen', 'error');
        return;
    }

    modal.classList.remove('hidden');

    // Populate form with null checks
    const themeEl = document.getElementById('settingTheme');
    const languageEl = document.getElementById('settingLanguage');
    const notificationsEl = document.getElementById('settingNotifications');
    const itemsPerPageEl = document.getElementById('settingItemsPerPage');
    const dateFormatEl = document.getElementById('settingDateFormat');
    const currencyEl = document.getElementById('settingCurrency');

    if (themeEl) themeEl.value = settings.theme;
    if (languageEl) languageEl.value = settings.language;
    if (notificationsEl) notificationsEl.checked = settings.notifications;
    if (itemsPerPageEl) itemsPerPageEl.value = settings.itemsPerPage;
    if (dateFormatEl) dateFormatEl.value = settings.dateFormat;
    if (currencyEl) currencyEl.value = settings.currency;
}

function closeUserSettings() {
    const modal = document.getElementById('userSettingsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function closeUserSettingsWithConfirmation() {
    // Check if there are unsaved changes
    const settings = getUserSettings();
    const currentTheme = document.getElementById('settingTheme')?.value;
    const currentLanguage = document.getElementById('settingLanguage')?.value;
    const currentNotifications = document.getElementById('settingNotifications')?.checked;
    const currentItemsPerPage = parseInt(document.getElementById('settingItemsPerPage')?.value);
    const currentDateFormat = document.getElementById('settingDateFormat')?.value;
    const currentCurrency = document.getElementById('settingCurrency')?.value;

    const hasChanges = 
        settings.theme !== currentTheme ||
        settings.language !== currentLanguage ||
        settings.notifications !== currentNotifications ||
        settings.itemsPerPage !== currentItemsPerPage ||
        settings.dateFormat !== currentDateFormat ||
        settings.currency !== currentCurrency;

    if (hasChanges) {
        const confirmed = confirm('Er zijn niet-opgeslagen wijzigingen. Weet je zeker dat je wilt sluiten?');
        if (!confirmed) return;
    }

    closeUserSettings();
}

function saveUserSettingsFromForm() {
    const settings = {
        theme: document.getElementById('settingTheme').value,
        language: document.getElementById('settingLanguage').value,
        notifications: document.getElementById('settingNotifications').checked,
        itemsPerPage: parseInt(document.getElementById('settingItemsPerPage').value),
        dateFormat: document.getElementById('settingDateFormat').value,
        currency: document.getElementById('settingCurrency').value
    };

    saveUserSettings(settings);
    closeUserSettings();
    showToast('Instellingen opgeslagen', 'success');
}

// Get application config (read-only for users)
function getAppConfig() {
    return APP_CONFIG;
}
