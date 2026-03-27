// UI Helper functions
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;

    // Set icon and color based on type
    const toastPremium = toast.querySelector('.toast-premium');
    if (type === 'success') {
        toastIcon.className = 'fas fa-check-circle text-2xl';
        toastPremium.className = 'toast-premium flex items-center gap-3 min-w-[300px] bg-green-500 text-white';
    } else if (type === 'error') {
        toastIcon.className = 'fas fa-exclamation-circle text-2xl';
        toastPremium.className = 'toast-premium flex items-center gap-3 min-w-[300px] bg-red-500 text-white';
    } else {
        toastIcon.className = 'fas fa-info-circle text-2xl';
        toastPremium.className = 'toast-premium flex items-center gap-3 min-w-[300px] bg-blue-500 text-white';
    }

    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function showLoading() {
    document.getElementById('content').innerHTML = `
        <div class="text-center text-gray-500 py-12">
            <i class="fas fa-spinner fa-spin text-4xl mb-4"></i>
            <p>Laden...</p>
        </div>
    `;
}

function showError(message) {
    document.getElementById('content').innerHTML = `
        <div class="text-center text-red-500 py-12">
            <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
            <p class="text-lg font-medium mb-2">Er is een fout opgetreden</p>
            <p class="text-sm text-gray-600">${message}</p>
            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Opnieuw laden
            </button>
        </div>
    `;
}

function switchTab(tabName) {
    // Close all open modals first
    closeAllModals();

    // Update navigation buttons
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeNav = document.getElementById(`nav-${tabName}`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Load content
    showLoading();

    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'invoices':
            loadInvoices();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'maintenance-plans':
            loadMaintenancePlans();
            break;
        case 'subscriptions':
            loadSubscriptions();
            break;
        case 'reports':
            loadReports();
            break;
        case 'users':
            loadUsers();
            break;
        default:
            showError('Pagina niet gevonden');
    }
}

// Close all modals helper function
function closeAllModals() {
    // Close user settings modal
    const userSettingsModal = document.getElementById('userSettingsModal');
    if (userSettingsModal && !userSettingsModal.classList.contains('hidden')) {
        closeUserSettings();
    }

    // Close all other modals (created with createModal)
    const modals = document.querySelectorAll('.fixed');
    modals.forEach(modal => {
        if (modal.id !== 'userSettingsModal' && modal.id !== 'toast' && modal.id !== 'appFooter' && modal.id !== 'loginScreen') {
            modal.remove();
        }
    });
}

// Refresh the current view
function refreshCurrentView() {
    const activeNav = document.querySelector('.nav-button.active');
    if (activeNav) {
        const tabName = activeNav.id.replace('nav-', '');
        switchTab(tabName);
        showToast('Gegevens vernieuwen...', 'success');
    } else {
        // Default to dashboard if no active tab
        switchTab('dashboard');
    }
}

// Toggle mobile menu
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const hamburgerIcon = document.getElementById('hamburgerIcon');

    if (mobileMenu) {
        const isOpen = mobileMenu.classList.toggle('menu-open');

        // Change hamburger icon to X when menu is open
        if (hamburgerIcon) {
            if (isOpen) {
                hamburgerIcon.classList.remove('fa-bars');
                hamburgerIcon.classList.add('fa-times');
            } else {
                hamburgerIcon.classList.remove('fa-times');
                hamburgerIcon.classList.add('fa-bars');
            }
        }
    }
}

// Close mobile menu on window resize to desktop width
window.addEventListener('resize', () => {
    if (window.innerWidth >= 1280) {
        const mobileMenu = document.getElementById('mobileMenu');
        const hamburgerIcon = document.getElementById('hamburgerIcon');
        if (mobileMenu) mobileMenu.classList.remove('menu-open');
        if (hamburgerIcon) {
            hamburgerIcon.classList.remove('fa-times');
            hamburgerIcon.classList.add('fa-bars');
        }
    }
});

function createModal(title, content, onSave, saveButtonText = 'Opslaan', size = 'md') {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';
    modal.style.backdropFilter = 'blur(4px)';

    // Determine modal width based on size
    const sizeClasses = {
        'sm': 'max-w-md',
        'md': 'max-w-2xl',
        'lg': 'max-w-4xl',
        'xl': 'max-w-6xl',
        'full': 'max-w-7xl'
    };
    const widthClass = sizeClasses[size] || sizeClasses['md'];

    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full ${widthClass} max-h-[90vh] overflow-y-auto relative shadow-2xl">
            <!-- Close button -->
            <button onclick="closeModalWithConfirmation(this)" 
                    class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900"
                    title="Sluiten">
                <i class="fas fa-times text-xl"></i>
            </button>

            <h2 class="text-2xl font-bold mb-4 pr-8">${title}</h2>
            <div id="modalContent">${content}</div>
            <div class="flex gap-2 justify-end mt-6">
                <button onclick="closeModalWithConfirmation(this)" 
                        class="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">
                    Annuleren
                </button>
                <button id="saveBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
                    ${saveButtonText}
                </button>
            </div>
        </div>
    `;

    // Initialize hasUnsavedChanges flag before adding to DOM
    modal.dataset.hasUnsavedChanges = 'false';

    document.body.appendChild(modal);

    // Prevent modal from closing when clicking on the backdrop
    modal.addEventListener('click', (e) => {
        // Only prevent closing - do nothing when backdrop is clicked
        e.stopPropagation();
    });

    // Track changes in form inputs - use both 'change' and 'input' events for better detection
    const formInputs = modal.querySelectorAll('input:not([type="hidden"]), select, textarea');
    formInputs.forEach(input => {
        // Use 'input' event for real-time tracking (fires on every keystroke)
        input.addEventListener('input', () => {
            modal.dataset.hasUnsavedChanges = 'true';
        });
        // Use 'change' event for dropdowns and when input loses focus
        input.addEventListener('change', () => {
            modal.dataset.hasUnsavedChanges = 'true';
        });
    });

    document.getElementById('saveBtn').onclick = async () => {
        try {
            await onSave();
            modal.dataset.hasUnsavedChanges = 'false'; // Reset flag before closing
            modal.remove();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    return modal;
}

// Close modal with confirmation (only ask if there are unsaved changes)
function closeModalWithConfirmation(buttonElement) {
    const modal = buttonElement.closest('.fixed');
    if (!modal) return;

    // Only ask for confirmation if there are unsaved changes
    const hasUnsavedChanges = modal.dataset.hasUnsavedChanges === 'true';
    if (hasUnsavedChanges) {
        const confirmed = confirm('Je hebt onopgeslagen wijzigingen. Weet je zeker dat je wilt sluiten?');
        if (!confirmed) {
            return;
        }
    }

    modal.remove();
}

// Close the most recent modal without confirmation
function closeModal() {
    const modals = document.querySelectorAll('.fixed');
    // Find the last modal (excluding toast and other fixed elements)
    for (let i = modals.length - 1; i >= 0; i--) {
        const modal = modals[i];
        if (modal.id !== 'userSettingsModal' && modal.id !== 'toast' && modal.id !== 'appFooter') {
            modal.remove();
            return;
        }
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL');
}

function formatCurrency(amount, currency = 'EUR') {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Generate a new GUID
function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Get date + days in YYYY-MM-DD format
function getDatePlusDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

// Get current year
function getCurrentYear() {
    return new Date().getFullYear();
}

// Extract number from ID string (e.g., "INV-0042" -> 42)
function extractNumber(id, prefix = '') {
    if (!id) return 0;
    const match = id.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
}

// Generate next ID based on existing items
function generateNextId(items, prefix, digits = 4) {
    if (!items || items.length === 0) {
        return `${prefix}${String(1).padStart(digits, '0')}`;
    }

    const numbers = items.map(item => {
        const id = item.invoiceNumber || item.paymentId || item.subscriptionId || '';
        return extractNumber(id, prefix);
    });

    const maxNumber = Math.max(...numbers, 0);
    const nextNumber = maxNumber + 1;

    return `${prefix}${String(nextNumber).padStart(digits, '0')}`;
}
