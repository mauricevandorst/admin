// Dossier Mode JavaScript

// Current view state
let currentView = 'customers';

// Toggle mobile menu
function toggleDossierMobileMenu() {
    const mobileMenu = document.getElementById('dossierMobileMenu');
    const hamburgerIcon = document.getElementById('dossierHamburgerIcon');

    mobileMenu.classList.toggle('menu-open');

    if (mobileMenu.classList.contains('menu-open')) {
        hamburgerIcon.classList.remove('fa-bars');
        hamburgerIcon.classList.add('fa-times');
    } else {
        hamburgerIcon.classList.remove('fa-times');
        hamburgerIcon.classList.add('fa-bars');
    }
}

// Switch between views
function switchDossierView(view) {
    // Hide all views
    document.querySelectorAll('.dossier-view').forEach(v => v.classList.add('hidden'));

    // Remove active state from all nav buttons
    document.querySelectorAll('.dossier-nav-btn').forEach(btn => btn.classList.remove('active'));

    // Show selected view
    document.getElementById(`view-${view}`).classList.remove('hidden');

    // Set active nav button for desktop
    const navButton = document.getElementById(`nav-${view}`);
    if (navButton) navButton.classList.add('active');

    // Set active nav button for mobile
    const mobileNavButton = document.getElementById(`mobile-nav-${view}`);
    if (mobileNavButton) mobileNavButton.classList.add('active');

    // Update current view
    currentView = view;

    // Load data if needed
    if (view === 'pricelist') {
        loadPriceList();
    } else if (view === 'maintenance') {
        loadMaintenancePlans();
    } else if (view === 'notes') {
        loadNotes();
    } else if (view === 'quote') {
        loadQuoteServices();
    } else if (view === 'followup') {
        loadFollowUpActions();
    }
}

// Check if user is logged in and in dossier mode
function checkDossierSession() {
    const session = getSession();
    
    if (!session) {
        // Not logged in, redirect to main page
        window.location.href = 'index.html';
        return;
    }
    
    if (!session.dossierMode) {
        // Not in dossier mode, redirect to main portal
        window.location.href = 'index.html';
        return;
    }
    
    // Display displayname
    document.getElementById('userName').textContent = session.displayName || session.DisplayName || session.username || session.Username || 'Gebruiker';
}

// Logout function
function logout() {
    if (confirm('Weet je zeker dat je wilt uitloggen?')) {
        clearSession();
        window.location.href = 'index.html';
    }
}

// Switch to admin mode confirmation
function showSwitchToAdminConfirmation() {
    document.getElementById('switchToAdminModal').classList.remove('hidden');
}

function closeSwitchToAdminModal() {
    document.getElementById('switchToAdminModal').classList.add('hidden');
}

function confirmSwitchToAdmin() {
    closeSwitchToAdminModal();
    switchToAdminMode();
}

// Load price list from standard lines
let allStandardLines = [];
let groupedByCategory = {};
let currentCategory = null;

async function loadPriceList() {
    try {
        const standardLines = await getAll('standard-lines');

        if (!standardLines || standardLines.length === 0) {
            document.getElementById('categoryList').innerHTML = `
                <div class="text-center py-8 text-gray-500 text-sm">
                    <i class="fas fa-info-circle text-2xl mb-2"></i>
                    <p>Geen prijzen beschikbaar</p>
                </div>
            `;
            return;
        }

        // Store for later use
        allStandardLines = standardLines;

        // Group by category
        groupedByCategory = {};
        standardLines.forEach(line => {
            if (!line.isActive) return; // Skip inactive lines
            const cat = line.category || 'Algemeen';
            if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
            groupedByCategory[cat].push(line);
        });

        // Render categories
        renderCategories();

        // Select first category by default
        const firstCategory = Object.keys(groupedByCategory).sort()[0];
        if (firstCategory) {
            selectCategory(firstCategory);
        }
    } catch (error) {
        console.error('Error loading price list:', error);
        document.getElementById('categoryList').innerHTML = `
            <div class="text-center py-8 text-red-500 text-sm">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p>Fout bij laden van prijzen</p>
            </div>
        `;
    }
}

function renderCategories() {
    const categoryList = document.getElementById('categoryList');

    let html = '';
    Object.entries(groupedByCategory)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([category, lines]) => {
            const count = lines.length;
            html += `
                <div class="category-item" onclick="selectCategory('${category.replace(/'/g, "\\'")}')">
                    <i class="fas fa-folder text-sm"></i>
                    <span>${category}</span>
                    <span class="count">${count}</span>
                </div>
            `;
        });

    categoryList.innerHTML = html;
}

function selectCategory(category) {
    currentCategory = category;

    // Update active state in sidebar
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    event?.target?.closest('.category-item')?.classList.add('active');

    // If no event (programmatic call), find and activate the item
    if (!event) {
        document.querySelectorAll('.category-item').forEach(item => {
            if (item.textContent.includes(category)) {
                item.classList.add('active');
            }
        });
    }

    // Update title
    document.getElementById('selectedCategoryTitle').innerHTML = `
        ${category}
    `;

    // Render services
    renderServices(category);
}

function renderServices(category) {
    const servicesList = document.getElementById('servicesList');
    const lines = groupedByCategory[category] || [];

    if (lines.length === 0) {
        servicesList.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-400">
                <i class="fas fa-inbox text-4xl mb-3"></i>
                <p>Geen diensten in deze categorie</p>
            </div>
        `;
        return;
    }

    let html = '';
    lines.forEach(line => {
        html += `
            <div class="service-card">
                <div class="service-name">
                    ${line.name || '-'}
                </div>
                <div class="service-description">
                    ${line.description || 'Geen beschrijving beschikbaar'}
                </div>
                <div class="service-price">
                    <div>
                        <div class="service-price-amount">${formatCurrency(line.unitPrice || 0)}</div>
                        <div class="service-price-vat">excl. ${line.vatPercentage || 21}% BTW</div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-500">Incl. BTW</div>
                        <div class="text-lg font-semibold text-gray-700">
                            ${formatCurrency((line.unitPrice || 0) * (1 + (line.vatPercentage || 21) / 100))}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    servicesList.innerHTML = html;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

// Track whether we are editing an existing customer
let editingCustomer = null;

// Open customer modal (new customer)
function openCustomerModal() {
    editingCustomer = null;
    document.getElementById('customerModalTitle').textContent = 'Nieuwe Klant Aanmaken';
    document.getElementById('customerModalIcon').className = 'fas fa-user-plus';
    document.getElementById('customerForm').reset();
    document.getElementById('customerModal').classList.remove('hidden');
    switchDossierTab('contact');
}

// Close customer modal
function closeCustomerModal() {
    if (confirm('Weet je zeker dat je wilt annuleren? Niet-opgeslagen gegevens gaan verloren.')) {
        editingCustomer = null;
        document.getElementById('customerModal').classList.add('hidden');
        document.getElementById('customerForm').reset();
    }
}

// Edit the current customer (pre-fill modal with existing data)
function editCurrentCustomer() {
    const stored = sessionStorage.getItem('dossierCustomer');
    if (!stored) return;

    const customer = JSON.parse(stored);
    editingCustomer = customer;

    // Update modal title
    document.getElementById('customerModalTitle').textContent = 'Klant Bewerken';
    document.getElementById('customerModalIcon').className = 'fas fa-user-edit';

    // Fill contact tab
    document.getElementById('contactName').value = customer.contact?.name || '';
    document.getElementById('contactEmail').value = customer.contact?.emailAddress || '';
    document.getElementById('contactPhone').value = customer.contact?.phoneNumber || '';

    // Fill business tab
    document.getElementById('businessName').value = customer.business?.name || '';
    document.getElementById('businessDisplayName').value = customer.business?.displayName || '';
    document.getElementById('businessKvk').value = customer.business?.kvkNumber || '';
    document.getElementById('businessVat').value = customer.business?.vatNumber || '';
    document.getElementById('businessEmail').value = customer.business?.emailAddress || '';

    // Fill address tab
    document.getElementById('addressStreet').value = customer.business?.address?.street || '';
    document.getElementById('addressNumber').value = customer.business?.address?.houseNumber || '';
    document.getElementById('addressPostal').value = customer.business?.address?.postalCode || '';
    document.getElementById('addressCity').value = customer.business?.address?.city || '';

    document.getElementById('customerModal').classList.remove('hidden');
    switchDossierTab('contact');
}

// Generate GUID
function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Generate customer number
async function generateCustomerNumber() {
    try {
        // Get all existing customers to determine next number
        const config = getAppConfig();
        const basicAuthHeader = btoa(`${config.username}:${config.password}`);

        const response = await fetch(`${config.apiUrl}/customers`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${basicAuthHeader}`
            }
        });

        if (!response.ok) {
            throw new Error('Could not fetch customers');
        }

        const customers = await response.json();

        // Extract all customer numbers that match the CUS-XXXX format
        const customerNumbers = customers
            .map(c => c.customerNumber)
            .filter(num => num && num.startsWith('CUS-'))
            .map(num => {
                const match = num.match(/^CUS-(\d+)$/);
                return match ? parseInt(match[1], 10) : 0;
            })
            .filter(num => !isNaN(num));

        // Find the highest number and add 1
        const nextNumber = customerNumbers.length > 0 
            ? Math.max(...customerNumbers) + 1 
            : 1;

        // Format as CUS-XXXX (pad with zeros to 4 digits)
        return `CUS-${nextNumber.toString().padStart(4, '0')}`;

    } catch (error) {
        console.error('Error generating customer number:', error);
        // Fallback: use timestamp-based number if API call fails
        const timestamp = Date.now().toString().slice(-4);
        return `CUS-${timestamp}`;
    }
}

// Save customer
async function saveCustomer() {
    try {
        // Get form values
        const contactName = document.getElementById('contactName').value.trim();
        const contactEmail = document.getElementById('contactEmail').value.trim();
        const contactPhone = document.getElementById('contactPhone').value.trim();

        const businessName = document.getElementById('businessName').value.trim();
        const businessDisplayName = document.getElementById('businessDisplayName').value.trim();
        const businessKvk = document.getElementById('businessKvk').value.trim();
        const businessVat = document.getElementById('businessVat').value.trim();
        const businessEmail = document.getElementById('businessEmail')?.value.trim() || contactEmail;

        const addressStreet = document.getElementById('addressStreet').value.trim();
        const addressNumber = document.getElementById('addressNumber').value.trim();
        const addressPostal = document.getElementById('addressPostal').value.trim();
        const addressCity = document.getElementById('addressCity').value.trim();

        // Validate required fields - CONTACT
        if (!contactName || !contactEmail || !contactPhone) {
            alert('❌ Vul alle verplichte contactgegevens in:\n- Naam (*)\n- E-mail (*)\n- Telefoon (*)');
            switchDossierTab('contact');
            if (!contactName) document.getElementById('contactName').focus();
            else if (!contactEmail) document.getElementById('contactEmail').focus();
            else document.getElementById('contactPhone').focus();
            return;
        }

        // Validate email format
        if (!contactEmail.includes('@')) {
            alert('❌ Voer een geldig e-mailadres in');
            switchDossierTab('contact');
            document.getElementById('contactEmail').focus();
            return;
        }

        // Validate required fields - BUSINESS
        if (!businessName) {
            alert('❌ Vul de bedrijfsnaam in');
            switchDossierTab('business');
            document.getElementById('businessName').focus();
            return;
        }

        // Validate KvK format only if filled in
        if (businessKvk && !/^[0-9]{8}$/.test(businessKvk)) {
            alert('❌ KvK-nummer moet exact 8 cijfers bevatten (bijv. 12345678)');
            switchDossierTab('business');
            document.getElementById('businessKvk').focus();
            return;
        }

        // Validate BTW format only if filled in
        if (businessVat && !/^[A-Z]{2}[0-9]{9}B[0-9]{2}$/.test(businessVat)) {
            alert('❌ BTW-nummer moet het juiste formaat hebben (bijv. NL123456789B01)');
            switchDossierTab('business');
            document.getElementById('businessVat').focus();
            return;
        }

        // Validate required fields - ADDRESS
        if (!addressStreet || !addressNumber || !addressPostal || !addressCity) {
            alert('❌ Vul alle verplichte adresgegevens in:\n- Straat (*)\n- Nummer (*)\n- Postcode (*)\n- Plaats (*)');
            switchDossierTab('address');
            if (!addressStreet) document.getElementById('addressStreet').focus();
            else if (!addressNumber) document.getElementById('addressNumber').focus();
            else if (!addressPostal) document.getElementById('addressPostal').focus();
            else document.getElementById('addressCity').focus();
            return;
        }

        // Validate postcode format (1234AB)
        if (!/^[0-9]{4}[A-Za-z]{2}$/.test(addressPostal)) {
            alert('❌ Postcode moet het juiste formaat hebben (bijv. 1234AB)');
            switchDossierTab('address');
            document.getElementById('addressPostal').focus();
            return;
        }

        // Extract domain from email
        const domain = contactEmail.split('@')[1] || '';

        const config = getAppConfig();
        const basicAuthHeader = btoa(`${config.username}:${config.password}`);

        let savedCustomer;

        if (editingCustomer) {
            // Update existing customer (preserve id, customerId, customerNumber)
            const customer = {
                ...editingCustomer,
                contact: {
                    name: contactName,
                    emailAddress: contactEmail,
                    phoneNumber: contactPhone
                },
                business: {
                    ...editingCustomer.business,
                    name: businessName,
                    displayName: businessDisplayName || businessName,
                    domain: domain,
                    emailAddress: businessEmail,
                    phoneNumber: contactPhone,
                    kvkNumber: businessKvk,
                    vatNumber: businessVat.toUpperCase(),
                    address: {
                        street: addressStreet,
                        houseNumber: addressNumber,
                        postalCode: addressPostal.toUpperCase(),
                        city: addressCity
                    }
                }
            };

            const response = await fetch(`${config.apiUrl}/customers/${editingCustomer.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${basicAuthHeader}`
                },
                body: JSON.stringify(customer)
            });

            if (!response.ok) throw new Error('Fout bij bijwerken van klant');
            savedCustomer = await response.json();
        } else {
            // Create new customer
            const customerNumber = await generateCustomerNumber();
            const customer = {
                id: generateGuid(),
                type: 'Customer',
                customerId: generateGuid(),
                customerNumber: customerNumber,
                contact: {
                    name: contactName,
                    emailAddress: contactEmail,
                    phoneNumber: contactPhone
                },
                business: {
                    name: businessName,
                    displayName: businessDisplayName || businessName,
                    domain: domain,
                    emailAddress: businessEmail,
                    phoneNumber: contactPhone,
                    kvkNumber: businessKvk,
                    vatNumber: businessVat.toUpperCase(),
                    address: {
                        street: addressStreet,
                        houseNumber: addressNumber,
                        postalCode: addressPostal.toUpperCase(),
                        city: addressCity
                    }
                }
            };

            const response = await fetch(`${config.apiUrl}/customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${basicAuthHeader}`
                },
                body: JSON.stringify(customer)
            });

            if (!response.ok) throw new Error('Fout bij opslaan van klant');
            savedCustomer = await response.json();
        }

        // Close modal
        editingCustomer = null;
        document.getElementById('customerModal').classList.add('hidden');
        document.getElementById('customerForm').reset();

        // Store customer in session storage for this dossier session
        sessionStorage.setItem('dossierCustomer', JSON.stringify(savedCustomer));

        // Display customer info
        displayCustomer(savedCustomer);

        showToast(savedCustomer.customerNumber ? `✅ Klant bijgewerkt!` : '✅ Klant succesvol aangemaakt!', 'success');

    } catch (error) {
        console.error('Error saving customer:', error);
        alert('❌ Fout bij opslaan van klant: ' + error.message);
    }
}

// Display customer info
function displayCustomer(customer) {
    const customerInfo = document.getElementById('customerInfo');
    const customerDetails = document.getElementById('customerDetails');
    const emptyState = document.getElementById('emptyState');

    // Hide empty state, show customer info
    if (emptyState) emptyState.classList.add('hidden');
    customerInfo.classList.remove('hidden');

    customerDetails.innerHTML = `
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg">
            <div class="flex items-start justify-between mb-4">
                <div>
                    <h3 class="text-2xl font-bold text-gray-800">${customer.business?.displayName || customer.business?.name || 'N/A'}</h3>
                    <p class="text-sm text-gray-600 mt-1">Klantnummer: <span class="font-mono font-semibold text-blue-700">${customer.customerNumber || 'N/A'}</span></p>
                </div>
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    <i class="fas fa-check-circle mr-1"></i>Nieuw
                </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div class="space-y-3">
                    <div class="flex items-center gap-2 text-gray-700">
                        <i class="fas fa-user w-5 text-blue-600"></i>
                        <span class="font-medium">Contactpersoon:</span>
                        <span class="font-semibold">${customer.contact?.name || 'N/A'}</span>
                    </div>

                    <div class="flex items-center gap-2 text-gray-700">
                        <i class="fas fa-envelope w-5 text-blue-600"></i>
                        <a href="mailto:${customer.contact?.emailAddress || ''}" class="text-blue-600 hover:underline font-medium">
                            ${customer.contact?.emailAddress || 'N/A'}
                        </a>
                    </div>

                    ${customer.contact?.phoneNumber ? `
                    <div class="flex items-center gap-2 text-gray-700">
                        <i class="fas fa-phone w-5 text-blue-600"></i>
                        <a href="tel:${customer.contact.phoneNumber}" class="text-blue-600 hover:underline font-medium">
                            ${customer.contact.phoneNumber}
                        </a>
                    </div>
                    ` : ''}
                </div>

                <div class="space-y-3">
                    ${customer.business?.kvkNumber ? `
                    <div class="flex items-center gap-2 text-gray-700">
                        <i class="fas fa-building w-5 text-blue-600"></i>
                        <span class="font-medium">KVK:</span>
                        <span class="font-mono">${customer.business.kvkNumber}</span>
                    </div>
                    ` : ''}

                    ${customer.business?.vatNumber ? `
                    <div class="flex items-center gap-2 text-gray-700">
                        <i class="fas fa-file-invoice w-5 text-blue-600"></i>
                        <span class="font-medium">BTW:</span>
                        <span class="font-mono">${customer.business.vatNumber}</span>
                    </div>
                    ` : ''}

                    ${customer.business?.address?.street ? `
                    <div class="flex items-start gap-2 text-gray-700">
                        <i class="fas fa-map-marker-alt w-5 text-blue-600 mt-0.5"></i>
                        <div>
                            <span class="font-medium">Adres:</span>
                            <div class="ml-0 mt-1">
                                ${customer.business.address.street} ${customer.business.address.houseNumber || ''}<br>
                                ${customer.business.address.postalCode || ''} ${customer.business.address.city || ''}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <div class="flex gap-3 mt-4">
            <button onclick="loadDossierForCurrentCustomer()" 
                    class="flex-1 py-3 px-4 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors font-medium">
                <i class="fas fa-folder-open mr-2"></i>Dossier Laden
            </button>
            <button onclick="viewPriceList()" 
                    class="flex-1 py-3 px-4 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors font-medium">
                <i class="fas fa-tags mr-2"></i>Bekijk prijslijst
            </button>
            <button onclick="openCustomerModal()" 
                    class="flex-1 py-3 px-4 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium">
                <i class="fas fa-plus mr-2"></i>Nieuw dossier aanmaken
            </button>
            <button onclick="editCurrentCustomer()"
                    class="py-3 px-4 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg transition-colors font-medium">
                <i class="fas fa-pen mr-2"></i>Wijzig klant
            </button>
            <button onclick="closeCurrentCustomer()" 
                    class="py-3 px-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors font-medium">
                <i class="fas fa-times mr-2"></i>Sluit klant
            </button>
        </div>
    `;
}

// Quick link to price list
function viewPriceList() {
    switchDossierView('pricelist');
}

// Close the current customer and return to empty state
function closeCurrentCustomer() {
    if (!confirm('Weet je zeker dat je de huidige klant wilt sluiten? Niet-opgeslagen wijzigingen gaan verloren.')) {
        return;
    }

    // Clear all session data for this dossier
    sessionStorage.removeItem('dossierCustomer');
    sessionStorage.removeItem('dossierId');
    sessionStorage.removeItem('dossierQuote');
    sessionStorage.removeItem('dossierFollowUp');
    currentIntake = null;

    // Clear note fields
    const fields = ['quickNotes', 'painPoints', 'currentSituation', 'desiredOutcome'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Reset quote
    quoteItems = [];
    updateQuoteTotal();

    // Hide customer info and show empty state
    document.getElementById('customerInfo').classList.add('hidden');
    document.getElementById('emptyState').classList.remove('hidden');

    // Switch back to customers view
    switchDossierView('customers');
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Close dossier search dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const searchInput = document.getElementById('openDossierCustomerNumber');
        const resultsDiv = document.getElementById('dossierSearchResults');
        if (resultsDiv && searchInput && !searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.classList.add('hidden');
        }
    });

    // Check session
    checkDossierSession();

    // Start idle/session watchers
    _startSessionWatchers();

    // Start on customers view
    switchDossierView('customers');

    // Check if there's already a customer in this session
    const savedCustomer = sessionStorage.getItem('dossierCustomer');
    if (savedCustomer) {
        try {
            const customer = JSON.parse(savedCustomer);
            displayCustomer(customer);
        } catch (e) {
            console.error('Error parsing saved customer:', e);
            // Show empty state on error
            document.getElementById('emptyState').classList.remove('hidden');
        }
    } else {
        // No customer yet, show empty state
        document.getElementById('emptyState').classList.remove('hidden');
    }

    // Setup form enhancements
    setupDossierFormEnhancements();
});

// Tab navigation
let currentDossierTab = 'contact';
const dossierTabs = ['contact', 'business', 'address'];

function switchDossierTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.dossier-tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // Remove active state from all tabs
    document.querySelectorAll('.dossier-tab-button').forEach(button => {
        button.classList.remove('active', 'text-blue-600', 'border-blue-500');
        button.classList.add('text-gray-500', 'border-transparent');
    });

    // Show selected tab content
    document.getElementById(`dossier-content-${tabName}`).classList.remove('hidden');

    // Set active tab button
    const activeTab = document.getElementById(`dossier-tab-${tabName}`);
    activeTab.classList.add('active', 'text-blue-600', 'border-blue-500');
    activeTab.classList.remove('text-gray-500', 'border-transparent');

    // Update current tab
    currentDossierTab = tabName;

    // Update navigation buttons
    updateDossierNavButtons();
}

function dossierNextTab() {
    const currentIndex = dossierTabs.indexOf(currentDossierTab);
    if (currentIndex < dossierTabs.length - 1) {
        switchDossierTab(dossierTabs[currentIndex + 1]);
    }
}

function dossierPrevTab() {
    const currentIndex = dossierTabs.indexOf(currentDossierTab);
    if (currentIndex > 0) {
        switchDossierTab(dossierTabs[currentIndex - 1]);
    }
}

function updateDossierNavButtons() {
    const currentIndex = dossierTabs.indexOf(currentDossierTab);
    const prevBtn = document.getElementById('dossierPrevBtn');
    const nextBtn = document.getElementById('dossierNextBtn');

    // Disable/enable prev button
    if (currentIndex === 0) {
        prevBtn.disabled = true;
        prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        prevBtn.disabled = false;
        prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    // Hide/show next button based on last tab
    if (currentIndex === dossierTabs.length - 1) {
        nextBtn.classList.add('hidden');
    } else {
        nextBtn.classList.remove('hidden');
    }
}

// Form enhancements - progress tracking and field validation
function setupDossierFormEnhancements() {
    const form = document.getElementById('customerForm');
    if (!form) return;

    const allInputs = form.querySelectorAll('input[required], input[type="email"], input[type="tel"]');

    // Add input listeners for progress tracking
    allInputs.forEach(input => {
        input.addEventListener('input', () => {
            updateDossierProgress();
            validateDossierField(input);
        });

        input.addEventListener('blur', () => {
            validateDossierField(input);
        });
    });

    // Auto-fill domain from email
    const emailInput = document.getElementById('contactEmail');
    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            const email = emailInput.value.trim();
            if (email && email.includes('@')) {
                const domain = email.split('@')[1];
                // This could be used to auto-fill business domain if needed
            }
        });
    }

    // Initial progress update
    updateDossierProgress();
}

function updateDossierProgress() {
    const form = document.getElementById('customerForm');
    if (!form) return;

    const requiredFields = form.querySelectorAll('input[required]');
    const filledFields = Array.from(requiredFields).filter(input => input.value.trim() !== '');

    const progress = Math.round((filledFields.length / requiredFields.length) * 100);

    const progressBar = document.getElementById('dossierProgressBar');
    const progressText = document.getElementById('dossierFormProgress');

    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${progress}%`;

    // Update tab checkmarks
    updateDossierTabChecks();
}

function validateDossierField(input) {
    const parent = input.closest('.form-group');
    if (!parent) return;

    const checkmark = parent.querySelector('.dossier-field-check');

    let isValid = false;

    if (input.type === 'email') {
        isValid = input.value.trim() !== '' && input.value.includes('@');
    } else if (input.type === 'tel') {
        isValid = input.value.trim() !== '';
    } else if (input.hasAttribute('required')) {
        isValid = input.value.trim() !== '';
    } else {
        isValid = input.value.trim() !== '';
    }

    if (checkmark) {
        if (isValid) {
            checkmark.classList.remove('hidden');
            input.classList.remove('border-red-300');
            input.classList.add('border-green-300');
        } else {
            checkmark.classList.add('hidden');
            if (input.value.trim() !== '' || input === document.activeElement) {
                input.classList.remove('border-green-300');
            }
        }
    }
}

function updateDossierTabChecks() {
    // Check contact tab
    const contactName = document.getElementById('contactName')?.value.trim();
    const contactEmail = document.getElementById('contactEmail')?.value.trim();
    const contactPhone = document.getElementById('contactPhone')?.value.trim();
    const contactComplete = contactName && contactEmail && contactEmail.includes('@') && contactPhone;

    const contactCheck = document.querySelector('#dossier-tab-contact .dossier-tab-check');
    if (contactCheck) {
        contactCheck.classList.toggle('hidden', !contactComplete);
    }

    // Check business tab
    const businessName = document.getElementById('businessName')?.value.trim();
    const businessKvk = document.getElementById('businessKvk')?.value.trim();
    const businessVat = document.getElementById('businessVat')?.value.trim();
    const businessComplete = businessName && businessKvk && businessVat && 
                            /^[0-9]{8}$/.test(businessKvk) && 
                            /^[A-Z]{2}[0-9]{9}B[0-9]{2}$/.test(businessVat);

    const businessCheck = document.querySelector('#dossier-tab-business .dossier-tab-check');
    if (businessCheck) {
        businessCheck.classList.toggle('hidden', !businessComplete);
    }

    // Check address tab
    const addressStreet = document.getElementById('addressStreet')?.value.trim();
    const addressNumber = document.getElementById('addressNumber')?.value.trim();
    const addressPostal = document.getElementById('addressPostal')?.value.trim();
    const addressCity = document.getElementById('addressCity')?.value.trim();
    const addressComplete = addressStreet && addressNumber && addressPostal && addressCity &&
                           /^[0-9]{4}[A-Za-z]{2}$/.test(addressPostal);

    const addressCheck = document.querySelector('#dossier-tab-address .dossier-tab-check');
    if (addressCheck) {
        addressCheck.classList.toggle('hidden', !addressComplete);
    }
}

// ==================== NOTES FUNCTIONALITY ====================

let notesAutoSaveTimer = null;
let currentIntake = null;
let currentNoteId = null; // null = nieuwe notitie, string = bestaande notitie bewerken

// Load notes from Cosmos DB via Function App
async function loadNotes() {
    const customer = JSON.parse(sessionStorage.getItem('dossierCustomer') || 'null');
    const quickNotesEl = document.getElementById('quickNotes');

    currentIntake = null;
    currentNoteId = null;

    if (customer?.customerNumber) {
        try {
            currentIntake = await apiRequest(`/customers/${customer.customerNumber}/intake`);
        } catch (e) {
            if (!e.message?.includes('HTTP 404')) {
                console.error('Error loading notes:', e);
            }
        }
    }

    if (quickNotesEl) quickNotesEl.value = '';
    updateNotesCharCount();
    renderSavedNotesList(currentIntake);

    if (quickNotesEl && !quickNotesEl.dataset.notesListenerAttached) {
        quickNotesEl.dataset.notesListenerAttached = 'true';
        quickNotesEl.addEventListener('input', () => {
            updateNotesCharCount();
            autoSaveNotes();
        });
    }
}

function updateNotesCharCount() {
    const quickNotes = document.getElementById('quickNotes')?.value || '';
    const charCount = document.getElementById('notesCharCount');
    if (charCount) {
        charCount.textContent = `${quickNotes.length} karakters`;
    }
}

function autoSaveNotes() {
    clearTimeout(notesAutoSaveTimer);
    notesAutoSaveTimer = setTimeout(() => {
        saveNotes(true);
    }, 1000); // Auto-save after 1 second of inactivity
}

async function saveNotes(isAutoSave = false) {
    const customer = JSON.parse(sessionStorage.getItem('dossierCustomer') || 'null');
    if (!customer?.customerNumber) {
        if (!isAutoSave) showToast('Geen klant geselecteerd', 'error');
        return;
    }

    const content = document.getElementById('quickNotes')?.value || '';
    if (!content.trim()) {
        if (!isAutoSave) showToast('Notitie is leeg', 'info');
        return;
    }

    try {
        if (!currentIntake) currentIntake = { dossierNotes: [] };
        if (!currentIntake.dossierNotes) currentIntake.dossierNotes = [];

        const now = new Date().toISOString();

        if (currentNoteId) {
            const note = currentIntake.dossierNotes.find(n => n.id === currentNoteId);
            if (note) {
                note.content = content;
                note.updatedAt = now;
            }
        } else {
            const newNoteItem = { id: generateGuid(), content, createdAt: now, updatedAt: null };
            currentIntake.dossierNotes.unshift(newNoteItem);
            currentNoteId = newNoteItem.id;
        }

        if (currentIntake.id) {
            currentIntake = await apiRequest(`/customers/${customer.customerNumber}/intake/${currentIntake.id}`, {
                method: 'PUT',
                body: JSON.stringify(currentIntake)
            });
        } else {
            currentIntake = await apiRequest(`/customers/${customer.customerNumber}/intake`, {
                method: 'POST',
                body: JSON.stringify(currentIntake)
            });
            currentNoteId = currentIntake?.dossierNotes?.[0]?.id || null;
        }

        const saveIndicator = document.getElementById('notesLastSaved');
        if (saveIndicator) {
            const timeStr = new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
            saveIndicator.textContent = `✓ Opgeslagen om ${timeStr}`;
            saveIndicator.classList.remove('hidden');
        }

        renderSavedNotesList(currentIntake);
        if (!isAutoSave) showToast('Notitie opgeslagen!', 'success');
    } catch (error) {
        console.error('Error saving notes:', error);
        if (!isAutoSave) showToast('Fout bij opslaan van notitie', 'error');
    }
}

async function clearNotes() {
    if (!confirm('Weet je zeker dat je alle notities wilt wissen?')) return;
    const quickNotesEl = document.getElementById('quickNotes');
    if (quickNotesEl) quickNotesEl.value = '';
    updateNotesCharCount();
    await saveNotes(true);
    showToast('Notities gewist', 'info');
}

function renderSavedNotesList(intake) {
    const container = document.getElementById('savedNotesList');
    if (!container) return;

    const notes = intake?.dossierNotes || [];
    if (notes.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400 text-sm">
                <i class="fas fa-sticky-note text-3xl mb-2 block"></i>
                <p>Nog geen notities opgeslagen</p>
            </div>`;
        return;
    }

    container.innerHTML = notes.map(note => {
        const timestamp = note.updatedAt || note.createdAt;
        const date = new Date(timestamp);
        const dateStr = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        const preview = (note.content || '').substring(0, 80).replace(/\n/g, ' ').trim();
        const isActive = note.id === currentNoteId;
        return `
            <div class="group relative rounded-lg border p-3 mb-2 cursor-pointer transition-all ${isActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'}"
                 onclick="loadNoteById('${note.id}')">
                <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                        <div class="text-xs text-gray-500 mb-1">${dateStr} om ${timeStr}</div>
                        <div class="text-xs text-gray-600 line-clamp-2">${preview || '(leeg)'}...</div>
                    </div>
                    <button onclick="event.stopPropagation(); deleteNoteById('${note.id}')"
                            class="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 text-red-400 hover:text-red-600 transition-all"
                            title="Verwijderen">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            </div>`;
    }).join('');
}

function loadNoteById(id) {
    const note = currentIntake?.dossierNotes?.find(n => n.id === id);
    if (!note) return;
    currentNoteId = id;
    const quickNotesEl = document.getElementById('quickNotes');
    if (quickNotesEl) quickNotesEl.value = note.content || '';
    updateNotesCharCount();
    const saveIndicator = document.getElementById('notesLastSaved');
    if (saveIndicator) saveIndicator.classList.add('hidden');
    renderSavedNotesList(currentIntake);
}

async function deleteNoteById(id) {
    if (!confirm('Weet je zeker dat je deze notitie wilt verwijderen?')) return;

    const customer = JSON.parse(sessionStorage.getItem('dossierCustomer') || 'null');
    if (!customer?.customerNumber || !currentIntake?.id) return;

    try {
        currentIntake.dossierNotes = (currentIntake.dossierNotes || []).filter(n => n.id !== id);
        currentIntake = await apiRequest(`/customers/${customer.customerNumber}/intake/${currentIntake.id}`, {
            method: 'PUT',
            body: JSON.stringify(currentIntake)
        });

        if (currentNoteId === id) {
            currentNoteId = null;
            const quickNotesEl = document.getElementById('quickNotes');
            if (quickNotesEl) quickNotesEl.value = '';
            updateNotesCharCount();
            const saveIndicator = document.getElementById('notesLastSaved');
            if (saveIndicator) saveIndicator.classList.add('hidden');
        }

        renderSavedNotesList(currentIntake);
        showToast('Notitie verwijderd', 'info');
    } catch (error) {
        console.error('Error deleting note:', error);
        showToast('Fout bij verwijderen van notitie', 'error');
    }
}

function newNote() {
    const quickNotesEl = document.getElementById('quickNotes');
    if (quickNotesEl?.value.trim() && !confirm('Weet je zeker dat je een nieuwe notitie wilt beginnen? Niet-opgeslagen wijzigingen gaan verloren.')) {
        return;
    }
    currentNoteId = null;
    if (quickNotesEl) quickNotesEl.value = '';
    updateNotesCharCount();
    const saveIndicator = document.getElementById('notesLastSaved');
    if (saveIndicator) saveIndicator.classList.add('hidden');
    renderSavedNotesList(currentIntake);
    quickNotesEl?.focus();
}

// ==================== QUOTE FUNCTIONALITY ====================

let quoteItems = [];
let allServices = [];

async function loadQuoteServices() {
    try {
        const services = await getAll('standard-lines');
        allServices = services.filter(s => s.isActive);
        renderAvailableServices(allServices);
        loadSavedQuote();
    } catch (error) {
        console.error('Error loading services:', error);
        document.getElementById('availableServices').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p>Fout bij laden van diensten</p>
            </div>
        `;
    }
}

function renderAvailableServices(services) {
    const container = document.getElementById('availableServices');
    if (!services || services.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-inbox text-3xl mb-2"></i>
                <p>Geen diensten beschikbaar</p>
            </div>
        `;
        return;
    }

    // Sort services by category first, then by description
    const sortedServices = [...services].sort((a, b) => {
        const catA = (a.category || 'Algemeen').toLowerCase();
        const catB = (b.category || 'Algemeen').toLowerCase();
        if (catA !== catB) {
            return catA.localeCompare(catB);
        }
        return a.description.localeCompare(b.description);
    });

    container.innerHTML = sortedServices.map(service => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div class="flex-1">
                ${service.name ? `<div class="text-medium text-slate-800 mt-1">${service.name}</div>` : ''}
                <div class="font-sm text-slate-500">${service.description}</div>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-right">
                    <div class="font-bold text-blue-600">€ ${service.unitPrice.toFixed(2)}</div>
                    <div class="text-xs text-gray-500">${service.unit || 'per stuk'}</div>
                </div>
                <button onclick="addToQuote('${service.id}')" 
                        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function filterQuoteServices() {
    const search = document.getElementById('quoteServiceSearch')?.value.toLowerCase() || '';
    const filtered = allServices.filter(s => 
        s.description.toLowerCase().includes(search) ||
        (s.category || '').toLowerCase().includes(search)
    );
    renderAvailableServices(filtered);
}

function addToQuote(serviceId) {
    const service = allServices.find(s => s.id === serviceId);
    if (!service) return;

    // Check if already in quote
    const existingIndex = quoteItems.findIndex(item => item.id === serviceId);
    if (existingIndex >= 0) {
        quoteItems[existingIndex].quantity++;
    } else {
        quoteItems.push({
            id: service.id,
            name: service.name,
            description: service.description,
            category: service.category,
            unitPrice: service.unitPrice,
            customPrice: service.unitPrice,
            unit: service.unit,
            quantity: 1
        });
    }

    renderQuoteItems();
    updateQuoteTotal();
    saveQuote();
    showToast('Toegevoegd aan offerte', 'success');
}

function removeFromQuote(index) {
    quoteItems.splice(index, 1);
    renderQuoteItems();
    updateQuoteTotal();
    saveQuote();
}

function updateQuoteItemQuantity(index, quantity) {
    if (quantity <= 0) {
        removeFromQuote(index);
        return;
    }
    quoteItems[index].quantity = parseInt(quantity);
    updateQuoteTotal();
    saveQuote();
}

function updateQuoteItemPrice(index, price) {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
        return;
    }
    quoteItems[index].customPrice = numPrice;
    updateQuoteTotal();
    saveQuote();
}

function renderQuoteItems() {
    const container = document.getElementById('quoteItems');
    if (quoteItems.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400 text-sm">
                <i class="fas fa-inbox text-3xl mb-2"></i>
                <p>Nog geen items toegevoegd</p>
            </div>
        `;
        return;
    }

    container.innerHTML = quoteItems.map((item, index) => `
        <div class="mb-3 p-3 bg-gray-50 rounded-lg">
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                    <div class="font-medium text-sm text-gray-800">${item.description}</div>
                </div>
                <button onclick="removeFromQuote(${index})" 
                        class="text-red-600 hover:text-red-700 ml-2">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="space-y-2">
                <div class="flex items-center gap-2">
                    <label class="text-xs text-gray-600 w-16">Aantal:</label>
                    <input type="number" value="${item.quantity}" min="1" 
                           onchange="updateQuoteItemQuantity(${index}, this.value)"
                           class="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center">
                </div>
                <div class="flex items-center gap-2">
                    <label class="text-xs text-gray-600 w-16">Prijs:</label>
                    <input type="number" value="${(item.customPrice || item.unitPrice).toFixed(2)}" min="0" step="0.01"
                           onchange="updateQuoteItemPrice(${index}, this.value)"
                           class="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right">
                </div>
                <div class="flex items-center justify-between pt-1 border-t border-gray-200">
                    <span class="text-xs text-gray-600">Subtotaal:</span>
                    <span class="font-semibold text-sm text-blue-600">€ ${(item.quantity * (item.customPrice || item.unitPrice)).toFixed(2)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function updateQuoteTotal() {
    const subtotal = quoteItems.reduce((sum, item) => sum + (item.quantity * (item.customPrice || item.unitPrice)), 0);
    const discount = parseFloat(document.getElementById('quoteDiscount')?.value || 0);
    const discountAmount = subtotal * (discount / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const vat = subtotalAfterDiscount * 0.21;
    const total = subtotalAfterDiscount + vat;

    document.getElementById('quoteSubtotal').textContent = `€ ${subtotalAfterDiscount.toFixed(2)}`;
    document.getElementById('quoteVat').textContent = `€ ${vat.toFixed(2)}`;
    document.getElementById('quoteTotal').textContent = `€ ${total.toFixed(2)}`;
}

function saveQuote() {
    const quote = {
        items: quoteItems,
        discount: parseFloat(document.getElementById('quoteDiscount')?.value || 0),
        timestamp: new Date().toISOString()
    };
    sessionStorage.setItem('dossierQuote', JSON.stringify(quote));

    // Also save to Cosmos DB (auto-save)
    saveDossierToCosmosDB(true).catch(err => {
        console.error('Failed to auto-save quote to Cosmos DB:', err);
    });
}

function loadSavedQuote() {
    const saved = sessionStorage.getItem('dossierQuote');
    if (saved) {
        try {
            const quote = JSON.parse(saved);
            quoteItems = quote.items || [];
            if (quote.discount) {
                document.getElementById('quoteDiscount').value = quote.discount;
            }
            renderQuoteItems();
            updateQuoteTotal();
        } catch (e) {
            console.error('Error loading quote:', e);
        }
    }
}

function clearQuote() {
    if (confirm('Weet je zeker dat je de offerte wilt wissen?')) {
        quoteItems = [];
        document.getElementById('quoteDiscount').value = 0;
        renderQuoteItems();
        updateQuoteTotal();
        sessionStorage.removeItem('dossierQuote');
        showToast('Offerte gewist', 'info');
    }
}

function exportQuote() {
    if (quoteItems.length === 0) {
        alert('Voeg eerst items toe aan de offerte');
        return;
    }

    // Show modal to get valid until date and notes
    const defaultValidUntil = getDatePlusDays(30);

    const formHtml = `
        <div class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p class="text-sm text-blue-800">
                    <i class="fas fa-info-circle mr-2"></i>
                    Er wordt een PDF-offerte gegenereerd op basis van de geselecteerde diensten.
                </p>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Geldig tot</label>
                <input type="date" id="dossierQuoteValidUntil" value="${defaultValidUntil}"
                       class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                <p class="text-xs text-gray-500 mt-1">Standaard: 30 dagen vanaf vandaag</p>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Opmerkingen (optioneel)</label>
                <textarea id="dossierQuoteNotes" rows="3"
                          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Extra toelichting op de offerte..."></textarea>
            </div>
        </div>
    `;

    createModal('Offerte als PDF downloaden', formHtml, async () => {
        const validUntil = document.getElementById('dossierQuoteValidUntil').value;
        const notes = document.getElementById('dossierQuoteNotes').value.trim();
        await downloadDossierQuotePdf(validUntil, notes);
    }, 'Offerte downloaden', 'sm');
}

// Helper function to get date + days
function getDatePlusDays(days, baseDate = null) {
    const date = baseDate ? new Date(baseDate) : new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

// Generate and download PDF quote from dossier
async function downloadDossierQuotePdf(validUntil, extraNotes) {
    try {
        showToast('Offerte wordt gegenereerd...', 'info');

        const customer = JSON.parse(sessionStorage.getItem('dossierCustomer') || '{}');
        const discount = parseFloat(document.getElementById('quoteDiscount')?.value || 0);

        if (!customer.customerNumber) {
            showToast('Geen klant geselecteerd', 'error');
            return;
        }

        const session = getSession();
        const companyName = session?.companyName || 'Rice Studio';
        const companyAddress = session?.address;
        const companyKvk = session?.kvkNumber;
        const companyVat = session?.vatNumber;

        const customerName = customer?.business?.displayName || customer?.business?.name || '';
        const customerAddress = customer?.business?.address;
        const customerEmail = customer?.business?.emailAddress || customer?.contact?.emailAddress || '';

        const quoteNumber = `OFF-${customer.customerNumber}`;

        const companyAddressLines = [];
        if (companyAddress?.street) companyAddressLines.push(`${companyAddress.street} ${companyAddress.houseNumber || ''}`.trim());
        if (companyAddress?.postalCode || companyAddress?.city) companyAddressLines.push(`${companyAddress.postalCode || ''} ${companyAddress.city || ''}`.trim());
        if (companyKvk) companyAddressLines.push(`KVK: ${companyKvk}`);
        if (companyVat) companyAddressLines.push(`BTW: ${companyVat}`);

        const customerAddressLines = [customerName];
        if (customerAddress?.street) customerAddressLines.push(`${customerAddress.street} ${customerAddress.houseNumber || ''}`.trim());
        if (customerAddress?.postalCode || customerAddress?.city) customerAddressLines.push(`${customerAddress.postalCode || ''} ${customerAddress.city || ''}`.trim());
        if (customerEmail) customerAddressLines.push(customerEmail);

        // Calculate totals
        const rawSubtotal = quoteItems.reduce((sum, item) => sum + (item.quantity * (item.customPrice || item.unitPrice)), 0);
        const discountAmount = rawSubtotal * (discount / 100);
        const subtotal = rawSubtotal - discountAmount;
        const vatAmount = subtotal * 0.21;
        const totalAmount = subtotal + vatAmount;

        // Build item table
        const itemTableBody = [
            [
                { text: 'Beschrijving', style: 'tableHeader' },
                { text: 'Aantal', style: 'tableHeader', alignment: 'right' },
                { text: 'Stukprijs', style: 'tableHeader', alignment: 'right' },
                { text: 'BTW', style: 'tableHeader', alignment: 'right' },
                { text: 'Bedrag', style: 'tableHeader', alignment: 'right' }
            ],
            ...quoteItems.map(item => {
                const price = item.customPrice || item.unitPrice;
                const lineAmount = item.quantity * price;

                const titleText = item.name || item.description || '';
                const descriptionText = item.name && item.description ? item.description : '';
                const descriptionCell = descriptionText
                    ? [
                        { text: titleText, fontSize: 10, bold: false },
                        { text: descriptionText, fontSize: 8, color: '#6b7280', margin: [0, 2, 0, 0] }
                    ]
                    : { text: titleText, fontSize: 10 };

                return [
                    descriptionCell,
                    { text: String(item.quantity), fontSize: 10, alignment: 'right' },
                    { text: formatCurrency(price), fontSize: 10, alignment: 'right' },
                    { text: '21%', fontSize: 10, alignment: 'right' },
                    { text: formatCurrency(lineAmount), fontSize: 10, alignment: 'right', bold: true }
                ];
            })
        ];

        // Build totals table
        const totalsTableBody = [
            [{ text: 'Subtotaal (excl. korting)', fontSize: 10 }, { text: formatCurrency(rawSubtotal), fontSize: 10, alignment: 'right', bold: true }]
        ];

        if (discount > 0) {
            totalsTableBody.push(
                [{ text: `Korting (${discount}%)`, fontSize: 10, color: '#059669' }, { text: `-${formatCurrency(discountAmount)}`, fontSize: 10, alignment: 'right', bold: true, color: '#059669' }]
            );
        }

        totalsTableBody.push(
            [{ text: 'Subtotaal (na korting)', fontSize: 10 }, { text: formatCurrency(subtotal), fontSize: 10, alignment: 'right', bold: true }],
            [{ text: 'BTW (21%)', fontSize: 10 }, { text: formatCurrency(vatAmount), fontSize: 10, alignment: 'right', bold: true }],
            [{ text: 'Totaal', fontSize: 13, bold: true }, { text: formatCurrency(totalAmount), fontSize: 13, alignment: 'right', bold: true }]
        );

        // Metadata rows
        const metaRows = [
            [
                { text: 'Offertenummer', fontSize: 9, color: '#6b7280', border: [false, false, false, false] },
                { text: quoteNumber, fontSize: 10, alignment: 'right', border: [false, false, false, false] }
            ],
            [
                { text: 'Datum', fontSize: 9, color: '#6b7280', border: [false, false, false, false] },
                { text: new Date().toLocaleDateString('nl-NL'), fontSize: 10, alignment: 'right', border: [false, false, false, false] }
            ]
        ];

        if (validUntil) {
            metaRows.push([
                { text: 'Geldig tot', fontSize: 9, color: '#6b7280', border: [false, false, false, false] },
                { text: formatDate(validUntil), fontSize: 10, alignment: 'right', border: [false, false, false, false] }
            ]);
        }

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 60],
            footer: function () {
                const parts = [companyName];
                if (companyAddress?.street) parts.push(`${companyAddress.street} ${companyAddress.houseNumber || ''}`.trim());
                if (companyAddress?.postalCode || companyAddress?.city) parts.push(`${companyAddress.postalCode || ''} ${companyAddress.city || ''}`.trim());
                if (companyKvk) parts.push(`KVK: ${companyKvk}`);
                if (companyVat) parts.push(`BTW: ${companyVat}`);
                return [
                    { text: 'Wij bouwen onze offertes volledig transparant op, je ziet exact waar je voor betaalt. Geen verborgen kosten of verrassingen achteraf.', alignment: 'center', fontSize: 8, italics: true, color: '#9ca3af', margin: [40, 8, 40, 2] },
                    { text: parts.join('  ·  '), alignment: 'center', fontSize: 8, color: '#9ca3af', margin: [40, 0, 40, 0] }
                ];
            },
            content: [
                {
                    columns: [
                        {
                            stack: [
                                { text: companyName, style: 'companyName' },
                                ...companyAddressLines.map(line => ({ text: line, style: 'companyDetail' }))
                            ]
                        },
                        {
                            stack: [
                                { text: 'OFFERTE', style: 'invoiceTitle', alignment: 'right' },
                                { text: quoteNumber, fontSize: 12, color: '#6b7280', alignment: 'right' }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 24]
                },
                {
                    columns: [
                        {
                            stack: [
                                { text: 'Offerte voor', style: 'sectionHeader', margin: [0, 0, 0, 4] },
                                ...customerAddressLines.map((line, i) => ({
                                    text: line,
                                    fontSize: 10,
                                    bold: i === 0,
                                    color: i === 0 ? '#111827' : '#374151'
                                }))
                            ]
                        },
                        {
                            table: {
                                widths: ['auto', 'auto'],
                                body: metaRows
                            },
                            layout: 'noBorders',
                            alignment: 'right'
                        }
                    ],
                    margin: [0, 0, 0, 24]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 45, 65, 35, 65],
                        body: itemTableBody
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 16]
                },
                {
                    columns: [
                        { text: '', width: '*' },
                        {
                            width: 220,
                            table: {
                                widths: ['*', 'auto'],
                                body: totalsTableBody
                            },
                            layout: 'lightHorizontalLines'
                        }
                    ],
                    margin: [0, 0, 0, 16]
                },
                ...(extraNotes ? [
                    { text: 'Opmerkingen', style: 'sectionHeader', margin: [0, 16, 0, 4] },
                    { text: extraNotes, fontSize: 10, color: '#374151', background: '#f9fafb', margin: [8, 4, 8, 4] }
                ] : []),
            ],
            styles: {
                companyName: { fontSize: 22, bold: true, color: '#111827' },
                companyDetail: { fontSize: 10, color: '#6b7280', lineHeight: 1.3 },
                invoiceTitle: { fontSize: 20, bold: true, color: '#111827' },
                sectionHeader: { fontSize: 9, bold: true, color: '#6b7280', characterSpacing: 1 },
                tableHeader: { fontSize: 9, bold: true, color: '#6b7280', fillColor: '#f3f4f6' }
            }
        };

        pdfMake.createPdf(docDefinition).download(`Offerte_${quoteNumber}.pdf`);
        showToast('Offerte gedownload!', 'success');
    } catch (error) {
        console.error('Error generating quote PDF:', error);
        showToast('Fout bij genereren offerte: ' + error.message, 'error');
    }
}

// ==================== FOLLOW-UP FUNCTIONALITY ====================

let followUpActions = [];

function loadFollowUpActions() {
    const saved = sessionStorage.getItem('dossierFollowUp');
    if (saved) {
        try {
            followUpActions = JSON.parse(saved);
            renderFollowUpList();
        } catch (e) {
            console.error('Error loading follow-up actions:', e);
        }
    }
}

function addFollowUpAction() {
    // Just scroll to form or highlight it
    document.getElementById('actionDescription')?.focus();
}

function saveFollowUpAction() {
    const type = document.getElementById('actionType')?.value;
    const description = document.getElementById('actionDescription')?.value.trim();
    const date = document.getElementById('actionDate')?.value;
    const priority = document.getElementById('actionPriority')?.value;

    if (!description) {
        alert('Vul een beschrijving in');
        return;
    }

    if (!date) {
        alert('Selecteer een datum');
        return;
    }

    const action = {
        id: Date.now().toString(),
        type,
        description,
        date,
        priority,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    followUpActions.push(action);
    sessionStorage.setItem('dossierFollowUp', JSON.stringify(followUpActions));

    // Clear form
    document.getElementById('actionDescription').value = '';
    document.getElementById('actionDate').value = '';
    document.getElementById('actionPriority').value = 'medium';

    renderFollowUpList();
    showToast('Follow-up actie toegevoegd!', 'success');

    // Auto-save to Cosmos DB
    saveDossierToCosmosDB(true).catch(err => {
        console.error('Failed to auto-save follow-up to Cosmos DB:', err);
    });
}

function renderFollowUpList() {
    const container = document.getElementById('followUpList');
    if (followUpActions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i class="fas fa-clipboard text-4xl mb-3"></i>
                <p class="text-sm">Nog geen follow-up acties gepland</p>
                <p class="text-xs mt-2">Klik op "Nieuwe Actie" om te beginnen</p>
            </div>
        `;
        return;
    }

    // Sort by date
    const sorted = [...followUpActions].sort((a, b) => new Date(a.date) - new Date(b.date));

    container.innerHTML = sorted.map((action, index) => {
        const typeEmoji = {
            callback: '📞',
            meeting: '📅',
            quote: '📄',
            demo: '🖥️',
            contract: '📝',
            email: '✉️',
            other: '⚡'
        }[action.type] || '⚡';

        const priorityColor = {
            low: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-red-100 text-red-800'
        }[action.priority] || 'bg-gray-100 text-gray-800';

        const priorityLabel = {
            low: '🟢 Laag',
            medium: '🟡 Gemiddeld',
            high: '🔴 Hoog'
        }[action.priority] || 'Gemiddeld';

        const dateObj = new Date(action.date);
        const formattedDate = dateObj.toLocaleDateString('nl-NL', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });

        return `
            <div class="mb-3 p-4 bg-gray-50 rounded-lg border-l-4 ${action.priority === 'high' ? 'border-red-500' : action.priority === 'medium' ? 'border-yellow-500' : 'border-green-500'}">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">${typeEmoji}</span>
                        <div>
                            <div class="font-semibold text-gray-800">${action.description}</div>
                            <div class="text-sm text-gray-600 mt-1">
                                <i class="fas fa-calendar mr-1"></i>${formattedDate}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs px-2 py-1 rounded-full ${priorityColor}">${priorityLabel}</span>
                        <button onclick="removeFollowUpAction('${action.id}')" 
                                class="text-red-600 hover:text-red-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function removeFollowUpAction(actionId) {
    if (confirm('Weet je zeker dat je deze actie wilt verwijderen?')) {
        followUpActions = followUpActions.filter(a => a.id !== actionId);
        sessionStorage.setItem('dossierFollowUp', JSON.stringify(followUpActions));
        renderFollowUpList();
        showToast('Actie verwijderd', 'info');

        // Auto-save to Cosmos DB
        saveDossierToCosmosDB(true).catch(err => {
            console.error('Failed to auto-save follow-up removal to Cosmos DB:', err);
        });
    }
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };

    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== DOSSIER DATA MANAGEMENT (COSMOS DB) ====================

// Customer search for "Bestaande Dossier Openen"
let dossierSearchTimeout = null;

async function searchDossierCustomers() {
    const input = document.getElementById('openDossierCustomerNumber');
    const resultsDiv = document.getElementById('dossierSearchResults');
    const query = input.value.trim().toLowerCase();

    clearTimeout(dossierSearchTimeout);

    if (!query) {
        resultsDiv.classList.add('hidden');
        resultsDiv.innerHTML = '';
        return;
    }

    resultsDiv.innerHTML = `<div class="px-4 py-3 text-sm text-gray-400 flex items-center gap-2"><i class="fas fa-spinner fa-spin"></i>Zoeken...</div>`;
    resultsDiv.classList.remove('hidden');

    dossierSearchTimeout = setTimeout(async () => {
        try {
            const config = getAppConfig();
            const basicAuthHeader = btoa(`${config.username}:${config.password}`);

            const response = await fetch(`${config.apiUrl}/customers`, {
                method: 'GET',
                headers: { 'Authorization': `Basic ${basicAuthHeader}` }
            });

            if (!response.ok) return;

            const customers = await response.json();
            const matches = customers.filter(c => {
                const num = (c.customerNumber || '').toLowerCase();
                const name = (c.business?.displayName || c.business?.name || '').toLowerCase();
                const contact = (c.contact?.name || '').toLowerCase();
                return num.includes(query) || name.includes(query) || contact.includes(query);
            });

            if (matches.length === 0) {
                resultsDiv.innerHTML = `<div class="px-4 py-3 text-sm text-gray-500 italic">Geen klanten gevonden voor "${input.value}"</div>`;
            } else {
                resultsDiv.innerHTML = matches.map(c => {
                    const displayName = c.business?.displayName || c.business?.name || 'Onbekend';
                    const num = c.customerNumber || '';
                    const contact = c.contact?.name ? `<div class="text-xs text-gray-400 mt-0.5">${c.contact.name}</div>` : '';
                    return `<button type="button"
                        onmousedown="selectDossierCustomer('${num}')"
                        class="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors">
                        <div class="font-medium text-gray-800">${displayName}</div>
                        <div class="text-xs text-blue-600 font-mono mt-0.5">${num}</div>
                        ${contact}
                    </button>`;
                }).join('');
            }
            resultsDiv.classList.remove('hidden');
        } catch (e) {
            console.error('Error searching customers:', e);
        }
    }, 250);
}

function selectDossierCustomer(customerNumber) {
    const input = document.getElementById('openDossierCustomerNumber');
    const resultsDiv = document.getElementById('dossierSearchResults');
    input.value = customerNumber;
    resultsDiv.classList.add('hidden');
    resultsDiv.innerHTML = '';
    openExistingDossier();
}

function handleDossierSearchKeydown(event) {
    if (event.key === 'Escape') {
        document.getElementById('dossierSearchResults').classList.add('hidden');
    } else if (event.key === 'Enter') {
        document.getElementById('dossierSearchResults').classList.add('hidden');
        openExistingDossier();
    }
}

// Open existing dossier by customer number
async function openExistingDossier() {
    const customerNumberInput = document.getElementById('openDossierCustomerNumber');
    const customerNumber = customerNumberInput.value.trim();

    if (!customerNumber) {
        showToast('Voer een klantnummer in', 'warning');
        return;
    }

    try {
        showToast('Dossier ophalen...', 'info');

        const config = getAppConfig();
        const basicAuthHeader = btoa(`${config.username}:${config.password}`);

        // First, get the customer
        const customerResponse = await fetch(`${config.apiUrl}/customers`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${basicAuthHeader}`
            }
        });

        if (!customerResponse.ok) {
            throw new Error('Fout bij ophalen van klantgegevens');
        }

        const customers = await customerResponse.json();
        const customer = customers.find(c => c.customerNumber?.toLowerCase() === customerNumber.toLowerCase());

        if (!customer) {
            showToast(`Klant met nummer ${customerNumber} niet gevonden`, 'error');
            return;
        }

        // Store customer in session
        sessionStorage.setItem('dossierCustomer', JSON.stringify(customer));
        displayCustomer(customer);

        // Now try to get the dossier
        const dossierResponse = await fetch(`${config.apiUrl}/customers/${customerNumber}/intake`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${basicAuthHeader}`
            }
        });

        if (dossierResponse.ok) {
            const dossier = await dossierResponse.json();

            // Load dossier data into the form
            loadDossierData(dossier);
            showToast('Dossier succesvol geopend!', 'success');            showToast(`Klant ${customerNumber} geladen. Nog geen dossier gevonden — je kunt nu beginnen.`, 'info');
        } else {
            throw new Error('Fout bij ophalen van dossier');
        }

        // Clear the input
        customerNumberInput.value = '';

    } catch (error) {
        console.error('Error opening dossier:', error);
        showToast('Fout bij openen van dossier: ' + error.message, 'error');
    }
}

// Load dossier data into the forms
function loadDossierData(dossier) {
    if (!dossier) return;

    // Store dossier ID for later updates
    sessionStorage.setItem('dossierId', dossier.id);

    // Load notes if available
    if (dossier.opmerkingen) {
        try {
            const notes = JSON.parse(dossier.opmerkingen);
            const quickNotesEl = document.getElementById('quickNotes');
            if (quickNotesEl) {
                let combined = notes.quick || '';
                const legacyParts = [];
                if (notes.currentSituation) legacyParts.push(`Huidige Situatie:\n${notes.currentSituation}`);
                if (notes.painPoints) legacyParts.push(`Pijnpunten:\n${notes.painPoints}`);
                if (notes.desiredOutcome) legacyParts.push(`Gewenst Resultaat:\n${notes.desiredOutcome}`);
                if (legacyParts.length > 0) {
                    combined = (combined ? combined + '\n\n' : '') + legacyParts.join('\n\n');
                }
                quickNotesEl.value = combined;
            }
            updateNotesCharCount();
        } catch (e) {
            // If it's not JSON, just load as plain text in quick notes
            document.getElementById('quickNotes').value = dossier.opmerkingen;
        }
    }

    // Load quote data if available
    if (dossier.offerteItems) {
        try {
            const items = JSON.parse(dossier.offerteItems);
            if (items && Array.isArray(items)) {
                quoteItems = items;

                // Restore discount if available
                if (dossier.offerteKorting != null) {
                    const discountField = document.getElementById('quoteDiscount');
                    if (discountField) {
                        discountField.value = dossier.offerteKorting;
                    }
                }

                // Save to session storage for consistency
                const quoteData = {
                    items: items,
                    discount: dossier.offerteKorting || 0,
                    timestamp: dossier.offerteAangemaaktOp || new Date().toISOString()
                };
                sessionStorage.setItem('dossierQuote', JSON.stringify(quoteData));

                // Render the quote items if we're on the quote view
                renderQuoteItems();
                updateQuoteTotal();

                showToast('✅ Offerte gegevens hersteld!', 'info');
            }
        } catch (e) {
            console.error('Error loading quote data:', e);
        }
    }

    // Load follow-up actions if available
    if (dossier.followUpActies) {
        try {
            const actions = JSON.parse(dossier.followUpActies);
            if (actions && Array.isArray(actions)) {
                followUpActions = actions;

                // Save to session storage for consistency
                sessionStorage.setItem('dossierFollowUp', JSON.stringify(actions));

                // Render the follow-up list if we're on the follow-up view
                renderFollowUpList();

                showToast('✅ Follow-up acties hersteld!', 'info');
            }
        } catch (e) {
            console.error('Error loading follow-up data:', e);
        }
    }
}

// Save dossier to Cosmos DB
async function saveDossierToCosmosDB(isAutoSave = false) {
    const customer = sessionStorage.getItem('dossierCustomer');
    if (!customer) {
        if (!isAutoSave) {
            showToast('Geen klant geselecteerd. Maak eerst een klant aan of open een bestaande dossier.', 'warning');
        }
        return;
    }

    const customerData = JSON.parse(customer);
    const customerNumber = customerData.customerNumber;

    // Gather all dossier data
    const notes = {
        quick: document.getElementById('quickNotes')?.value || '',
        painPoints: '',
        currentSituation: '',
        desiredOutcome: ''
    };

    // Get quote data
    const quoteData = sessionStorage.getItem('dossierQuote');
    let offerteItems = null;
    let offerteKorting = null;
    let offerteSubtotaal = null;
    let offerteTotaal = null;
    let offerteAangemaaktOp = null;

    if (quoteData) {
        try {
            const quote = JSON.parse(quoteData);
            if (quote.items && quote.items.length > 0) {
                offerteItems = JSON.stringify(quote.items);
                offerteKorting = quote.discount || 0;
                offerteAangemaaktOp = quote.timestamp;

                // Calculate totals
                const rawSubtotal = quote.items.reduce((sum, item) => 
                    sum + (item.quantity * (item.customPrice || item.unitPrice)), 0);
                const discountAmount = rawSubtotal * (offerteKorting / 100);
                const subtotal = rawSubtotal - discountAmount;
                const vatAmount = subtotal * 0.21;

                offerteSubtotaal = subtotal;
                offerteTotaal = subtotal + vatAmount;
            }
        } catch (e) {
            console.error('Error parsing quote data:', e);
        }
    }

    // Get follow-up data
    const followUpData = sessionStorage.getItem('dossierFollowUp');
    let followUpActies = null;

    if (followUpData) {
        try {
            const actions = JSON.parse(followUpData);
            if (actions && actions.length > 0) {
                followUpActies = JSON.stringify(actions);
            }
        } catch (e) {
            console.error('Error parsing follow-up data:', e);
        }
    }

    const dossierData = {
        aantalWerkplekken: 0,
        besturingssysteemVoorkeur: '',
        huidigeAntivirusoplossing: '',
        huidigeBackupoplossing: '',
        cloudGebaseerd: false,
        gewensteDiensten: notes.desiredOutcome,
        prioriteiten: notes.painPoints,
        specialeEisen: '',
        opmerkingen: JSON.stringify(notes),
        status: 'concept',
        aangemaaktDoor: getSession()?.displayName || getSession()?.username || 'Onbekend',

        // Offerte gegevens
        offerteItems: offerteItems,
        offerteKorting: offerteKorting,
        offerteSubtotaal: offerteSubtotaal,
        offerteTotaal: offerteTotaal,
        offerteAangemaaktOp: offerteAangemaaktOp,

        // Follow-up acties
        followUpActies: followUpActies
    };

    try {
        const config = getAppConfig();
        const basicAuthHeader = btoa(`${config.username}:${config.password}`);

        // Check if dossier already exists
        const existingDossierId = sessionStorage.getItem('dossierId');

        let response;
        if (existingDossierId) {
            // Update existing dossier
            response = await fetch(`${config.apiUrl}/customers/${customerNumber}/intake/${existingDossierId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${basicAuthHeader}`
                },
                body: JSON.stringify(dossierData)
            });

            // If the dossier no longer exists on the server, create a new one
            if (response.status === 404) {
                sessionStorage.removeItem('dossierId');
                response = await fetch(`${config.apiUrl}/customers/${customerNumber}/intake`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${basicAuthHeader}`
                    },
                    body: JSON.stringify(dossierData)
                });
            }
        } else {
            // Create new dossier
            response = await fetch(`${config.apiUrl}/customers/${customerNumber}/intake`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${basicAuthHeader}`
                },
                body: JSON.stringify(dossierData)
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const savedDossier = await response.json();

        // Store the dossier ID for future updates
        sessionStorage.setItem('dossierId', savedDossier.id);

        if (!isAutoSave) {
            showToast('Dossier opgeslagen!', 'success');
        }

        return savedDossier;

    } catch (error) {
        console.error('Error saving dossier to Cosmos DB:', error);
        if (!isAutoSave) {
            showToast('Fout bij opslaan van dossier: ' + error.message, 'error');
        }
        throw error;
    }
}

// Update the saveNotes function to also save to Cosmos DB
const originalSaveNotes = saveNotes;
saveNotes = async function(isAutoSave = false) {
    // Call original save notes (saves to sessionStorage)
    originalSaveNotes(isAutoSave);

    // Also save to Cosmos DB
    try {
        await saveDossierToCosmosDB(isAutoSave);
    } catch (error) {
        // Error already logged and shown to user in saveDossierToCosmosDB
    }
};

// Load dossier for the current customer
async function loadDossierForCurrentCustomer() {
    const customer = sessionStorage.getItem('dossierCustomer');
    if (!customer) {
        showToast('Geen klant geselecteerd', 'warning');
        return;
    }

    const customerData = JSON.parse(customer);
    const customerNumber = customerData.customerNumber;

    if (!customerNumber) {
        showToast('Klantnummer niet gevonden', 'error');
        return;
    }

    // Use the existing openExistingDossier logic
    try {
        showToast('Dossier ophalen...', 'info');

        const config = getAppConfig();
        const basicAuthHeader = btoa(`${config.username}:${config.password}`);

        const dossierResponse = await fetch(`${config.apiUrl}/customers/${customerNumber}/intake`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${basicAuthHeader}`
            }
        });

        if (dossierResponse.ok) {
            const dossier = await dossierResponse.json();

            // Load dossier data into the form
            loadDossierData(dossier);
            showToast('Dossier succesvol geopend!', 'success');

            // Switch to notes view to show the loaded data
            switchDossierView('notes');
        } else if (dossierResponse.status === 404) {
            showToast(`Nog geen dossier gevonden voor ${customerNumber} — je kunt nu beginnen.`, 'info');
            switchDossierView('notes');
        } else {
            throw new Error('Fout bij ophalen van dossier');
        }

    } catch (error) {
        console.error('Error loading dossier:', error);
        showToast('Fout bij ophalen van dossier: ' + error.message, 'error');
    }
}

// ==================== DOSSIER COMPLETION ====================

// Complete dossier and mark as "afgerond"
async function completeDossier() {
    const customer = sessionStorage.getItem('dossierCustomer');
    if (!customer) {
        showToast('Geen klant geselecteerd', 'warning');
        return;
    }

    const customerData = JSON.parse(customer);
    const dossierId = sessionStorage.getItem('dossierId');

    if (!dossierId) {
        alert('⚠️ Dit dossier moet eerst worden opgeslagen voordat je het kunt afronden.\n\nKlik op "Opslaan" in de Notities sectie om het dossier op te slaan.');
        return;
    }

    // Check if we have minimum required data
    const hasNotes = sessionStorage.getItem('dossierNotes');
    const hasQuote = sessionStorage.getItem('dossierQuote');

    if (!hasNotes && !hasQuote) {
        alert('⚠️ Vul minimaal notities of een offerte in voordat je het dossier afrondt.');
        return;
    }

    if (!confirm('🗂️ Weet je zeker dat je dit dossier wilt afronden?\n\n✅ Alle gegevens worden opgeslagen:\n• Notities\n• Offerte items\n• Follow-up acties\n\nDe status wordt gewijzigd naar "afgerond".')) {
        return;
    }

    try {
        showToast('Dossier afronden...', 'info');

        // Save all data with status "afgerond"
        const customerNumber = customerData.customerNumber;
        const notes = JSON.parse(sessionStorage.getItem('dossierNotes') || '{}');

        // Get quote data
        const quoteData = sessionStorage.getItem('dossierQuote');
        let offerteItems = null;
        let offerteKorting = null;
        let offerteSubtotaal = null;
        let offerteTotaal = null;
        let offerteAangemaaktOp = null;

        if (quoteData) {
            const quote = JSON.parse(quoteData);
            if (quote.items && quote.items.length > 0) {
                offerteItems = JSON.stringify(quote.items);
                offerteKorting = quote.discount || 0;
                offerteAangemaaktOp = quote.timestamp;

                // Calculate totals
                const rawSubtotal = quote.items.reduce((sum, item) => 
                    sum + (item.quantity * (item.customPrice || item.unitPrice)), 0);
                const discountAmount = rawSubtotal * (offerteKorting / 100);
                const subtotal = rawSubtotal - discountAmount;
                const vatAmount = subtotal * 0.21;

                offerteSubtotaal = subtotal;
                offerteTotaal = subtotal + vatAmount;
            }
        }

        // Get follow-up data
        const followUpData = sessionStorage.getItem('dossierFollowUp');
        let followUpActies = null;

        if (followUpData) {
            const actions = JSON.parse(followUpData);
            if (actions && actions.length > 0) {
                followUpActies = JSON.stringify(actions);
            }
        }

        const dossierData = {
            aantalWerkplekken: 0,
            besturingssysteemVoorkeur: '',
            huidigeAntivirusoplossing: '',
            huidigeBackupoplossing: '',
            cloudGebaseerd: false,
            gewensteDiensten: notes.desiredOutcome || '',
            prioriteiten: notes.painPoints || '',
            specialeEisen: '',
            opmerkingen: JSON.stringify(notes),
            status: 'afgerond', // Mark as completed!
            aangemaaktDoor: getSession()?.displayName || getSession()?.username || 'Onbekend',

            // Offerte gegevens
            offerteItems: offerteItems,
            offerteKorting: offerteKorting,
            offerteSubtotaal: offerteSubtotaal,
            offerteTotaal: offerteTotaal,
            offerteAangemaaktOp: offerteAangemaaktOp,

            // Follow-up acties
            followUpActies: followUpActies
        };

        const config = getAppConfig();
        const basicAuthHeader = btoa(`${config.username}:${config.password}`);

        // Update dossier with "afgerond" status
        const response = await fetch(`${config.apiUrl}/customers/${customerNumber}/intake/${dossierId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuthHeader}`
            },
            body: JSON.stringify(dossierData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Success!
        showToast('🎉 Dossier succesvol afgerond!', 'success');

        // Show summary modal
        showDossierCompletionSummary(customerData, offerteSubtotaal, offerteTotaal, followUpActies);

    } catch (error) {
        console.error('Error completing dossier:', error);
        showToast('❌ Fout bij afronden van dossier: ' + error.message, 'error');
    }
}

// Show completion summary
function showDossierCompletionSummary(customer, subtotal, total, followUpJson) {
    const followUpCount = followUpJson ? JSON.parse(followUpJson).length : 0;

    const summaryHtml = `
        <div class="space-y-4">
            <div class="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-check text-white text-2xl"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-green-800">Dossier Afgerond!</h3>
                        <p class="text-sm text-green-600">Alle gegevens zijn succesvol opgeslagen</p>
                    </div>
                </div>
            </div>

            <div class="bg-white border border-gray-200 rounded-lg p-4">
                <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <i class="fas fa-file-alt text-blue-600"></i>
                    Samenvatting
                </h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Klant:</span>
                        <span class="font-semibold">${customer.business?.displayName || customer.business?.name}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Klantnummer:</span>
                        <span class="font-mono font-semibold">${customer.customerNumber}</span>
                    </div>
                    ${subtotal ? `
                    <div class="flex justify-between pt-2 border-t border-gray-200">
                        <span class="text-gray-600">Offerte subtotaal:</span>
                        <span class="font-semibold text-blue-600">${formatCurrency(subtotal)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Offerte totaal:</span>
                        <span class="font-semibold text-green-600">${formatCurrency(total)}</span>
                    </div>
                    ` : ''}
                    ${followUpCount > 0 ? `
                    <div class="flex justify-between pt-2 border-t border-gray-200">
                        <span class="text-gray-600">Follow-up acties:</span>
                        <span class="font-semibold text-purple-600">${followUpCount} ${followUpCount === 1 ? 'actie' : 'acties'}</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p class="text-sm text-blue-800">
                    <i class="fas fa-info-circle mr-2"></i>
                    Je kunt deze dossier later weer openen om wijzigingen aan te brengen.
                </p>
            </div>
        </div>
    `;

    createModal(
        'Dossier Afgerond',
        summaryHtml,
        () => {
            // Clear session and return to customer list
            sessionStorage.removeItem('dossierCustomer');
            sessionStorage.removeItem('dossierId');
            sessionStorage.removeItem('dossierNotes');
            sessionStorage.removeItem('dossierQuote');
            sessionStorage.removeItem('dossierFollowUp');

            // Redirect to customers view
            switchDossierView('customers');
            location.reload(); // Refresh to reset everything
        },
        'Afsluiten',
        'md'
    );
}

// ==================== KVK LOOKUP FUNCTIONALITY ====================

// KvK API lookup function
async function dossierLookupKvK() {
    const kvkInput = document.getElementById('businessKvk');
    const kvkNumber = kvkInput?.value.trim();
    const statusDiv = document.getElementById('dossierKvkStatus');
    const lookupBtn = document.getElementById('dossierKvkLookupBtn');

    if (!kvkNumber) {
        if (statusDiv) {
            statusDiv.innerHTML = '<span class="text-red-600"><i class="fas fa-exclamation-circle mr-1"></i>Voer een KvK-nummer in</span>';
        }
        return;
    }

    // Validate KvK number format (8 digits)
    if (!/^[0-9]{8}$/.test(kvkNumber)) {
        if (statusDiv) {
            statusDiv.innerHTML = '<span class="text-red-600"><i class="fas fa-exclamation-circle mr-1"></i>KvK-nummer moet exact 8 cijfers bevatten</span>';
        }
        return;
    }

    // Show loading state
    if (lookupBtn) {
        lookupBtn.disabled = true;
        lookupBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Zoeken...';
    }
    if (statusDiv) {
        statusDiv.innerHTML = '<span class="text-blue-600"><i class="fas fa-spinner fa-spin mr-1"></i>Bedrijfsgegevens ophalen...</span>';
    }

    try {
        // Call KvK API
        const response = await fetch(`https://api.kvk.nl/api/v1/basisprofielen/${kvkNumber}`, {
            method: 'GET',
            headers: {
                'apikey': 'l7xx1f2691f2520d487b902f4e0b57a0b197' // Dit is een voorbeeld API key, vervang met je eigen key
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Geen bedrijf gevonden met dit KvK-nummer');
            }
            throw new Error('Fout bij ophalen van KvK gegevens');
        }

        const data = await response.json();

        // Extract relevant data from KvK API response
        if (data && data.naam) {
            // Fill in business name
            const businessNameField = document.getElementById('businessName');
            if (businessNameField && !businessNameField.value) {
                businessNameField.value = data.naam;
                validateDossierField(businessNameField);
            }

            // Fill in address if available
            if (data.adressen && data.adressen.length > 0) {
                const address = data.adressen[0];

                if (address.straatnaam) {
                    const streetField = document.getElementById('addressStreet');
                    if (streetField && !streetField.value) {
                        streetField.value = address.straatnaam;
                        validateDossierField(streetField);
                    }
                }

                if (address.huisnummer) {
                    const numberField = document.getElementById('addressNumber');
                    if (numberField && !numberField.value) {
                        numberField.value = address.huisnummer + (address.huisnummerToevoeging || '');
                        validateDossierField(numberField);
                    }
                }

                if (address.postcode) {
                    const postalField = document.getElementById('addressPostal');
                    if (postalField && !postalField.value) {
                        postalField.value = address.postcode.replace(/\s/g, '');
                        validateDossierField(postalField);
                    }
                }

                if (address.plaats) {
                    const cityField = document.getElementById('addressCity');
                    if (cityField && !cityField.value) {
                        cityField.value = address.plaats;
                        validateDossierField(cityField);
                    }
                }
            }

            // Success message
            if (statusDiv) {
                statusDiv.innerHTML = '<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>Bedrijfsgegevens succesvol opgehaald!</span>';
            }
            showToast('✅ KvK gegevens succesvol ingevuld!', 'success');

            // Update tab checks
            updateDossierTabChecks();
        } else {
            throw new Error('Geen geldige gegevens ontvangen van KvK API');
        }

    } catch (error) {
        console.error('Error looking up KvK:', error);

        // Fallback: use mock data for demonstration
        console.log('Using mock data for demonstration purposes');

        // Mock data based on KvK number
        const mockData = {
            '12345678': {
                naam: 'Voorbeeld BV',
                address: {
                    straatnaam: 'Voorbeeldstraat',
                    huisnummer: '42',
                    postcode: '1234AB',
                    plaats: 'Amsterdam'
                }
            },
            '87654321': {
                naam: 'Test Onderneming',
                address: {
                    straatnaam: 'Testlaan',
                    huisnummer: '123',
                    postcode: '3011AB',
                    plaats: 'Rotterdam'
                }
            }
        };

        const mockCompany = mockData[kvkNumber];
        if (mockCompany) {
            // Fill in business name
            const businessNameField = document.getElementById('businessName');
            if (businessNameField && !businessNameField.value) {
                businessNameField.value = mockCompany.naam;
                validateDossierField(businessNameField);
            }

            // Fill in address
            if (mockCompany.address) {
                const streetField = document.getElementById('addressStreet');
                if (streetField && !streetField.value) {
                    streetField.value = mockCompany.address.straatnaam;
                    validateDossierField(streetField);
                }

                const numberField = document.getElementById('addressNumber');
                if (numberField && !numberField.value) {
                    numberField.value = mockCompany.address.huisnummer;
                    validateDossierField(numberField);
                }

                const postalField = document.getElementById('addressPostal');
                if (postalField && !postalField.value) {
                    postalField.value = mockCompany.address.postcode;
                    validateDossierField(postalField);
                }

                const cityField = document.getElementById('addressCity');
                if (cityField && !cityField.value) {
                    cityField.value = mockCompany.address.plaats;
                    validateDossierField(cityField);
                }
            }

            if (statusDiv) {
                statusDiv.innerHTML = '<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>Bedrijfsgegevens succesvol opgehaald! (demo data)</span>';
            }
            showToast('✅ KvK gegevens succesvol ingevuld! (demo)', 'success');

            // Update tab checks
            updateDossierTabChecks();
        } else {
            if (statusDiv) {
                statusDiv.innerHTML = `<span class="text-red-600"><i class="fas fa-exclamation-circle mr-1"></i>${error.message}</span>`;
            }
            showToast('❌ ' + error.message, 'error');
        }
    } finally {
        // Reset button state
        if (lookupBtn) {
            lookupBtn.disabled = false;
            lookupBtn.innerHTML = '<i class="fas fa-search mr-1"></i> Zoek';
        }
    }
}

// Maintenance Plans functionality
async function loadMaintenancePlans() {
    const loadingElement = document.getElementById('maintenance-loading');
    const gridElement = document.getElementById('maintenance-plans-grid');
    const emptyElement = document.getElementById('maintenance-empty');

    try {
        // Show loading state
        loadingElement.classList.remove('hidden');
        gridElement.classList.add('hidden');
        emptyElement.classList.add('hidden');

        // Fetch active subscription plans (maintenance plans)
        const plans = await getAll('subscription-plans/active');

        // Hide loading
        loadingElement.classList.add('hidden');

        if (!plans || plans.length === 0) {
            emptyElement.classList.remove('hidden');
            return;
        }

        // Display plans
        displayMaintenancePlans(plans);
        gridElement.classList.remove('hidden');

    } catch (error) {
        console.error('Error loading maintenance plans:', error);
        loadingElement.classList.add('hidden');
        emptyElement.classList.remove('hidden');

        // Show error message
        document.getElementById('maintenance-empty').innerHTML = `
            <div class="text-6xl mb-4">⚠️</div>
            <h3 class="text-xl font-semibold text-red-700 mb-2">Fout bij laden van onderhoudsplannen</h3>
            <p class="text-red-600">Er is een fout opgetreden. Probeer het later opnieuw.</p>
        `;
    }
}

function displayMaintenancePlans(plans) {
    const gridElement = document.getElementById('maintenance-plans-grid');

    // Sort plans by displayOrder
    const sortedPlans = plans.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));

    let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';

    sortedPlans.forEach(plan => {
        const monthlyPrice = formatCurrency(plan.monthlyPrice);
        const responseTime = plan.responseTimeHours ? `${plan.responseTimeHours} uur` : 'n.v.t.';

        // Calculate discounted prices if available
        let discountInfo = '';
        if (plan.quarterlyDiscount > 0 || plan.halfyearlyDiscount > 0 || plan.yearlyDiscount > 0) {
            discountInfo = '<div class="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">';
            discountInfo += '<div class="text-xs font-semibold text-orange-800 mb-2"><i class="fas fa-percentage"></i> Stapelkortingen:</div>';

            if (plan.quarterlyDiscount > 0) {
                const quarterlyPrice = plan.monthlyPrice * (1 - plan.quarterlyDiscount / 100);
                discountInfo += `<div class="text-xs text-orange-700">Kwartaal: ${formatCurrency(quarterlyPrice)}/maand (${plan.quarterlyDiscount}% korting)</div>`;
            }
            if (plan.halfyearlyDiscount > 0) {
                const halfyearlyPrice = plan.monthlyPrice * (1 - plan.halfyearlyDiscount / 100);
                discountInfo += `<div class="text-xs text-orange-700">Halfjaar: ${formatCurrency(halfyearlyPrice)}/maand (${plan.halfyearlyDiscount}% korting)</div>`;
            }
            if (plan.yearlyDiscount > 0) {
                const yearlyPrice = plan.monthlyPrice * (1 - plan.yearlyDiscount / 100);
                discountInfo += `<div class="text-xs text-orange-700">Jaar: ${formatCurrency(yearlyPrice)}/maand (${plan.yearlyDiscount}% korting)</div>`;
            }

            discountInfo += '</div>';
        }

        html += `
            <div class="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
                <!-- Plan Header -->
                <div class="text-center mb-6">
                    <h3 class="text-xl font-bold text-gray-900 mb-2">${plan.name}</h3>
                    <div class="text-3xl font-bold text-blue-600 mb-1">${monthlyPrice}</div>
                    <div class="text-sm text-gray-600">per maand</div>
                </div>

                <!-- Plan Description -->
                <div class="mb-6">
                    <p class="text-gray-600 text-sm leading-relaxed">${plan.description || 'Professioneel onderhoudsplan voor uw IT-infrastructuur'}</p>
                </div>

                <!-- Plan Features -->
                <div class="space-y-3 mb-6">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-clock text-green-600"></i>
                        <span class="text-sm">Responstijd: <strong>${responseTime}</strong></span>
                    </div>

                    <div class="flex items-center gap-3">
                        <i class="fas fa-clock text-blue-600"></i>
                        <span class="text-sm">Inclusief: <strong>${plan.includedHours} uren per maand</strong></span>
                    </div>

                    ${plan.hostingIncluded ? `
                        <div class="flex items-center gap-3">
                            <i class="fas fa-server text-purple-600"></i>
                            <span class="text-sm"><strong>Hosting inbegrepen</strong></span>
                        </div>
                    ` : ''}

                    ${plan.prioritySupport ? `
                        <div class="flex items-center gap-3">
                            <i class="fas fa-star text-yellow-500"></i>
                            <span class="text-sm"><strong>Prioriteitsondersteuning</strong></span>
                        </div>
                    ` : ''}
                </div>

                ${discountInfo}

                <!-- Action Button -->
                <div class="mt-6 pt-6 border-t border-gray-200">
                    <button onclick="selectMaintenancePlan('${plan.id}', '${plan.name}')" 
                            class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                        <i class="fas fa-check mr-2"></i>Plan Bespreken
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    gridElement.innerHTML = html;
}

function selectMaintenancePlan(planId, planName) {
    // Show confirmation and note in the dossier
    const message = `Onderhoudsplan "${planName}" geselecteerd voor bespreking met de klant.`;

    // Add to notes if customer is selected
    const currentCustomer = sessionStorage.getItem('currentCustomer');
    if (currentCustomer) {
        // Add plan selection to notes
        const notesTextarea = document.getElementById('quickNotes');
        if (notesTextarea) {
            const currentNotes = notesTextarea.value;
            const planNote = `\n\n🔧 ONDERHOUDSPLAN GESELECTEERD: ${planName} (ID: ${planId})\nTijd: ${new Date().toLocaleString('nl-NL')}`;
            notesTextarea.value = currentNotes + planNote;
            updateNotesCharCount();

            // Switch to notes tab to show the addition
            switchDossierView('notes');

            // Show success message
            showToast('success', `Onderhoudsplan "${planName}" toegevoegd aan notities`);
        }
    } else {
        // No customer selected, just show info
        showToast('info', `Onderhoudsplan "${planName}" geselecteerd. Maak eerst een klant aan om dit toe te voegen aan de dossier.`);
    }
}

// Helper function to show toast messages
function showToast(type, message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium transition-all duration-300 transform translate-x-full`;

    // Set color based on type
    if (type === 'success') {
        toast.className += ' bg-green-600';
    } else if (type === 'error') {
        toast.className += ' bg-red-600';
    } else {
        toast.className += ' bg-blue-600';
    }

    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);

    // Animate out and remove
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

