// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
    // Apply user settings
    const settings = getUserSettings();
    applyUserSettings(settings);

    // Load default tab (dashboard)
    switchTab('dashboard');

    // Set current year in footer
    const footerYear = document.getElementById('footerYear');
    if (footerYear) {
        footerYear.textContent = getCurrentYear();
    }

    // Show footer after initial load
    setTimeout(() => {
        const footer = document.getElementById('appFooter');
        if (footer) {
            footer.classList.remove('hidden');
        }
    }, 500);

    // Show welcome message
    const appConfig = getAppConfig();
    console.log(`${appConfig.appName} v${appConfig.version} geladen`);
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('fixed')) {
        if (e.target.id === 'userSettingsModal') {
            closeUserSettings();
        } else if (e.target.id !== 'toast') {
            e.target.remove();
        }
    }
});

// Handle escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const userSettingsModal = document.getElementById('userSettingsModal');
        if (userSettingsModal && !userSettingsModal.classList.contains('hidden')) {
            closeUserSettingsWithConfirmation();
            return;
        }

        // Find any open modals created with createModal
        const modals = document.querySelectorAll('.fixed');
        modals.forEach(modal => {
            if (modal.id !== 'userSettingsModal' && modal.id !== 'toast' && modal.id !== 'appFooter') {
                // Find close button and trigger it (will handle confirmation)
                const closeBtn = modal.querySelector('button[onclick^="closeModalWithConfirmation"]');
                if (closeBtn) {
                    closeBtn.click();
                }
            }
        });
    }
});
