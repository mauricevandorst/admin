// Intake Mode JavaScript

// Current view state
let currentView = 'customers';

// Switch between views
function switchIntakeView(view) {
    // Hide all views
    document.querySelectorAll('.intake-view').forEach(v => v.classList.add('hidden'));

    // Remove active state from all nav buttons
    document.querySelectorAll('.intake-nav-btn').forEach(btn => btn.classList.remove('active'));

    // Show selected view
    document.getElementById(`view-${view}`).classList.remove('hidden');

    // Set active nav button
    document.getElementById(`nav-${view}`).classList.add('active');

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

// Check if user is logged in and in intake mode
function checkIntakeSession() {
    const session = getSession();
    
    if (!session) {
        // Not logged in, redirect to main page
        window.location.href = 'index.html';
        return;
    }
    
    if (!session.intakeMode) {
        // Not in intake mode, redirect to main portal
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

// Open customer modal
function openCustomerModal() {
    document.getElementById('customerModal').classList.remove('hidden');
}

// Close customer modal
function closeCustomerModal() {
    if (confirm('Weet je zeker dat je wilt annuleren? Niet-opgeslagen gegevens gaan verloren.')) {
        document.getElementById('customerModal').classList.add('hidden');
        document.getElementById('customerForm').reset();
    }
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
            switchIntakeTab('contact');
            if (!contactName) document.getElementById('contactName').focus();
            else if (!contactEmail) document.getElementById('contactEmail').focus();
            else document.getElementById('contactPhone').focus();
            return;
        }

        // Validate email format
        if (!contactEmail.includes('@')) {
            alert('❌ Voer een geldig e-mailadres in');
            switchIntakeTab('contact');
            document.getElementById('contactEmail').focus();
            return;
        }

        // Validate required fields - BUSINESS
        if (!businessName || !businessKvk || !businessVat) {
            alert('❌ Vul alle verplichte bedrijfsgegevens in:\n- Bedrijfsnaam (*)\n- KvK-nummer (*)\n- BTW-nummer (*)');
            switchIntakeTab('business');
            if (!businessName) document.getElementById('businessName').focus();
            else if (!businessKvk) document.getElementById('businessKvk').focus();
            else document.getElementById('businessVat').focus();
            return;
        }

        // Validate KvK number format (8 digits)
        if (!/^[0-9]{8}$/.test(businessKvk)) {
            alert('❌ KvK-nummer moet exact 8 cijfers bevatten (bijv. 12345678)');
            switchIntakeTab('business');
            document.getElementById('businessKvk').focus();
            return;
        }

        // Validate BTW number format (NL + 9 digits + B + 2 digits)
        if (!/^[A-Z]{2}[0-9]{9}B[0-9]{2}$/.test(businessVat)) {
            alert('❌ BTW-nummer moet het juiste formaat hebben (bijv. NL123456789B01)');
            switchIntakeTab('business');
            document.getElementById('businessVat').focus();
            return;
        }

        // Validate required fields - ADDRESS
        if (!addressStreet || !addressNumber || !addressPostal || !addressCity) {
            alert('❌ Vul alle verplichte adresgegevens in:\n- Straat (*)\n- Nummer (*)\n- Postcode (*)\n- Plaats (*)');
            switchIntakeTab('address');
            if (!addressStreet) document.getElementById('addressStreet').focus();
            else if (!addressNumber) document.getElementById('addressNumber').focus();
            else if (!addressPostal) document.getElementById('addressPostal').focus();
            else document.getElementById('addressCity').focus();
            return;
        }

        // Validate postcode format (1234AB)
        if (!/^[0-9]{4}[A-Za-z]{2}$/.test(addressPostal)) {
            alert('❌ Postcode moet het juiste formaat hebben (bijv. 1234AB)');
            switchIntakeTab('address');
            document.getElementById('addressPostal').focus();
            return;
        }

        // Extract domain from email
        const domain = contactEmail.split('@')[1] || '';

        // Generate customer number
        const customerNumber = await generateCustomerNumber();

        // Create customer object
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

        // Save to API
        const config = getAppConfig();
        const basicAuthHeader = btoa(`${config.username}:${config.password}`);

        const response = await fetch(`${config.apiUrl}/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuthHeader}`
            },
            body: JSON.stringify(customer)
        });

        if (!response.ok) {
            throw new Error('Fout bij opslaan van klant');
        }

        const savedCustomer = await response.json();

        // Close modal
        document.getElementById('customerModal').classList.add('hidden');
        document.getElementById('customerForm').reset();

        // Store customer in session storage for this intake session
        sessionStorage.setItem('intakeCustomer', JSON.stringify(savedCustomer));

        // Display customer info
        displayCustomer(savedCustomer);

        showToast('✅ Klant succesvol aangemaakt!', 'success');

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
            <button onclick="loadIntakeForCurrentCustomer()" 
                    class="flex-1 py-3 px-4 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors font-medium">
                <i class="fas fa-folder-open mr-2"></i>Intake Laden
            </button>
            <button onclick="viewPriceList()" 
                    class="flex-1 py-3 px-4 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors font-medium">
                <i class="fas fa-tags mr-2"></i>Bekijk prijslijst
            </button>
            <button onclick="openCustomerModal()" 
                    class="flex-1 py-3 px-4 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium">
                <i class="fas fa-plus mr-2"></i>Nieuwe klant aanmaken
            </button>
        </div>
    `;
}

// Quick link to price list
function viewPriceList() {
    switchIntakeView('pricelist');
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Check session
    checkIntakeSession();

    // Start on customers view
    switchIntakeView('customers');

    // Check if there's already a customer in this session
    const savedCustomer = sessionStorage.getItem('intakeCustomer');
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
    setupIntakeFormEnhancements();
});

// Tab navigation
let currentIntakeTab = 'contact';
const intakeTabs = ['contact', 'business', 'address'];

function switchIntakeTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.intake-tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // Remove active state from all tabs
    document.querySelectorAll('.intake-tab-button').forEach(button => {
        button.classList.remove('active', 'text-blue-600', 'border-blue-500');
        button.classList.add('text-gray-500', 'border-transparent');
    });

    // Show selected tab content
    document.getElementById(`intake-content-${tabName}`).classList.remove('hidden');

    // Set active tab button
    const activeTab = document.getElementById(`intake-tab-${tabName}`);
    activeTab.classList.add('active', 'text-blue-600', 'border-blue-500');
    activeTab.classList.remove('text-gray-500', 'border-transparent');

    // Update current tab
    currentIntakeTab = tabName;

    // Update navigation buttons
    updateIntakeNavButtons();
}

function intakeNextTab() {
    const currentIndex = intakeTabs.indexOf(currentIntakeTab);
    if (currentIndex < intakeTabs.length - 1) {
        switchIntakeTab(intakeTabs[currentIndex + 1]);
    }
}

function intakePrevTab() {
    const currentIndex = intakeTabs.indexOf(currentIntakeTab);
    if (currentIndex > 0) {
        switchIntakeTab(intakeTabs[currentIndex - 1]);
    }
}

function updateIntakeNavButtons() {
    const currentIndex = intakeTabs.indexOf(currentIntakeTab);
    const prevBtn = document.getElementById('intakePrevBtn');
    const nextBtn = document.getElementById('intakeNextBtn');

    // Disable/enable prev button
    if (currentIndex === 0) {
        prevBtn.disabled = true;
        prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        prevBtn.disabled = false;
        prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    // Hide/show next button based on last tab
    if (currentIndex === intakeTabs.length - 1) {
        nextBtn.classList.add('hidden');
    } else {
        nextBtn.classList.remove('hidden');
    }
}

// Form enhancements - progress tracking and field validation
function setupIntakeFormEnhancements() {
    const form = document.getElementById('customerForm');
    if (!form) return;

    const allInputs = form.querySelectorAll('input[required], input[type="email"], input[type="tel"]');

    // Add input listeners for progress tracking
    allInputs.forEach(input => {
        input.addEventListener('input', () => {
            updateIntakeProgress();
            validateIntakeField(input);
        });

        input.addEventListener('blur', () => {
            validateIntakeField(input);
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
    updateIntakeProgress();
}

function updateIntakeProgress() {
    const form = document.getElementById('customerForm');
    if (!form) return;

    const requiredFields = form.querySelectorAll('input[required]');
    const filledFields = Array.from(requiredFields).filter(input => input.value.trim() !== '');

    const progress = Math.round((filledFields.length / requiredFields.length) * 100);

    const progressBar = document.getElementById('intakeProgressBar');
    const progressText = document.getElementById('intakeFormProgress');

    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${progress}%`;

    // Update tab checkmarks
    updateIntakeTabChecks();
}

function validateIntakeField(input) {
    const parent = input.closest('.form-group');
    if (!parent) return;

    const checkmark = parent.querySelector('.intake-field-check');

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

function updateIntakeTabChecks() {
    // Check contact tab
    const contactName = document.getElementById('contactName')?.value.trim();
    const contactEmail = document.getElementById('contactEmail')?.value.trim();
    const contactPhone = document.getElementById('contactPhone')?.value.trim();
    const contactComplete = contactName && contactEmail && contactEmail.includes('@') && contactPhone;

    const contactCheck = document.querySelector('#intake-tab-contact .intake-tab-check');
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

    const businessCheck = document.querySelector('#intake-tab-business .intake-tab-check');
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

    const addressCheck = document.querySelector('#intake-tab-address .intake-tab-check');
    if (addressCheck) {
        addressCheck.classList.toggle('hidden', !addressComplete);
    }
}

// ==================== NOTES FUNCTIONALITY ====================

let notesAutoSaveTimer = null;

// Load notes from storage
function loadNotes() {
    const saved = sessionStorage.getItem('intakeNotes');
    if (saved) {
        try {
            const notes = JSON.parse(saved);
            document.getElementById('quickNotes').value = notes.quick || '';
            document.getElementById('painPoints').value = notes.painPoints || '';
            document.getElementById('currentSituation').value = notes.currentSituation || '';
            document.getElementById('desiredOutcome').value = notes.desiredOutcome || '';
            updateNotesCharCount();
        } catch (e) {
            console.error('Error loading notes:', e);
        }
    }

    // Setup auto-save
    const textareas = ['quickNotes', 'painPoints', 'currentSituation', 'desiredOutcome'];
    textareas.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                updateNotesCharCount();
                autoSaveNotes();
            });
        }
    });
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

function saveNotes(isAutoSave = false) {
    const notes = {
        quick: document.getElementById('quickNotes')?.value || '',
        painPoints: document.getElementById('painPoints')?.value || '',
        currentSituation: document.getElementById('currentSituation')?.value || '',
        desiredOutcome: document.getElementById('desiredOutcome')?.value || '',
        timestamp: new Date().toISOString()
    };

    sessionStorage.setItem('intakeNotes', JSON.stringify(notes));

    // Show save indicator
    const saveIndicator = document.getElementById('notesLastSaved');
    if (saveIndicator) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        saveIndicator.textContent = `✓ Opgeslagen om ${timeStr}`;
        saveIndicator.classList.remove('hidden');
    }

    if (!isAutoSave) {
        showToast('Notities opgeslagen!', 'success');
    }
}

function clearNotes() {
    if (confirm('Weet je zeker dat je alle notities wilt wissen?')) {
        document.getElementById('quickNotes').value = '';
        document.getElementById('painPoints').value = '';
        document.getElementById('currentSituation').value = '';
        document.getElementById('desiredOutcome').value = '';
        sessionStorage.removeItem('intakeNotes');
        updateNotesCharCount();
        showToast('Notities gewist', 'info');
    }
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
    sessionStorage.setItem('intakeQuote', JSON.stringify(quote));

    // Also save to Cosmos DB (auto-save)
    saveIntakeToCosmosDB(true).catch(err => {
        console.error('Failed to auto-save quote to Cosmos DB:', err);
    });
}

function loadSavedQuote() {
    const saved = sessionStorage.getItem('intakeQuote');
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
        sessionStorage.removeItem('intakeQuote');
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
                <input type="date" id="intakeQuoteValidUntil" value="${defaultValidUntil}"
                       class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                <p class="text-xs text-gray-500 mt-1">Standaard: 30 dagen vanaf vandaag</p>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Opmerkingen (optioneel)</label>
                <textarea id="intakeQuoteNotes" rows="3"
                          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Extra toelichting op de offerte..."></textarea>
            </div>
        </div>
    `;

    createModal('Offerte als PDF downloaden', formHtml, async () => {
        const validUntil = document.getElementById('intakeQuoteValidUntil').value;
        const notes = document.getElementById('intakeQuoteNotes').value.trim();
        await downloadIntakeQuotePdf(validUntil, notes);
    }, 'Offerte downloaden', 'sm');
}

// Helper function to get date + days
function getDatePlusDays(days, baseDate = null) {
    const date = baseDate ? new Date(baseDate) : new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

// Generate and download PDF quote from intake
async function downloadIntakeQuotePdf(validUntil, extraNotes) {
    try {
        showToast('Offerte wordt gegenereerd...', 'info');

        const customer = JSON.parse(sessionStorage.getItem('intakeCustomer') || '{}');
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

                return [
                    { text: item.description, fontSize: 10 },
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
    const saved = sessionStorage.getItem('intakeFollowUp');
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
    sessionStorage.setItem('intakeFollowUp', JSON.stringify(followUpActions));

    // Clear form
    document.getElementById('actionDescription').value = '';
    document.getElementById('actionDate').value = '';
    document.getElementById('actionPriority').value = 'medium';

    renderFollowUpList();
    showToast('Follow-up actie toegevoegd!', 'success');

    // Auto-save to Cosmos DB
    saveIntakeToCosmosDB(true).catch(err => {
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
        sessionStorage.setItem('intakeFollowUp', JSON.stringify(followUpActions));
        renderFollowUpList();
        showToast('Actie verwijderd', 'info');

        // Auto-save to Cosmos DB
        saveIntakeToCosmosDB(true).catch(err => {
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

// ==================== INTAKE DATA MANAGEMENT (COSMOS DB) ====================

// Open existing intake by customer number
async function openExistingIntake() {
    const customerNumberInput = document.getElementById('openIntakeCustomerNumber');
    const customerNumber = customerNumberInput.value.trim();

    if (!customerNumber) {
        showToast('Voer een klantnummer in', 'warning');
        return;
    }

    try {
        showToast('Intake ophalen...', 'info');

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
        sessionStorage.setItem('intakeCustomer', JSON.stringify(customer));
        displayCustomer(customer);

        // Now try to get the intake
        const intakeResponse = await fetch(`${config.apiUrl}/customers/${customerNumber}/intake`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${basicAuthHeader}`
            }
        });

        if (intakeResponse.ok) {
            const intake = await intakeResponse.json();

            // Load intake data into the form
            loadIntakeData(intake);
            showToast('Intake succesvol geopend!', 'success');
        } else if (intakeResponse.status === 404) {
            // No intake found, that's okay - we'll create one when saving
            showToast(`Klant ${customerNumber} geladen. Nog geen intake gevonden, je kunt nu notities maken.`, 'info');
        } else {
            throw new Error('Fout bij ophalen van intake');
        }

        // Clear the input
        customerNumberInput.value = '';

    } catch (error) {
        console.error('Error opening intake:', error);
        showToast('Fout bij openen van intake: ' + error.message, 'error');
    }
}

// Load intake data into the forms
function loadIntakeData(intake) {
    if (!intake) return;

    // Store intake ID for later updates
    sessionStorage.setItem('intakeId', intake.id);

    // Load notes if available
    if (intake.opmerkingen) {
        try {
            const notes = JSON.parse(intake.opmerkingen);
            if (notes.quick) document.getElementById('quickNotes').value = notes.quick;
            if (notes.painPoints) document.getElementById('painPoints').value = notes.painPoints;
            if (notes.currentSituation) document.getElementById('currentSituation').value = notes.currentSituation;
            if (notes.desiredOutcome) document.getElementById('desiredOutcome').value = notes.desiredOutcome;
            updateNotesCharCount();
        } catch (e) {
            // If it's not JSON, just load as plain text in quick notes
            document.getElementById('quickNotes').value = intake.opmerkingen;
        }
    }

    // Load quote data if available
    if (intake.offerteItems) {
        try {
            const items = JSON.parse(intake.offerteItems);
            if (items && Array.isArray(items)) {
                quoteItems = items;

                // Restore discount if available
                if (intake.offerteKorting != null) {
                    const discountField = document.getElementById('quoteDiscount');
                    if (discountField) {
                        discountField.value = intake.offerteKorting;
                    }
                }

                // Save to session storage for consistency
                const quoteData = {
                    items: items,
                    discount: intake.offerteKorting || 0,
                    timestamp: intake.offerteAangemaaktOp || new Date().toISOString()
                };
                sessionStorage.setItem('intakeQuote', JSON.stringify(quoteData));

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
    if (intake.followUpActies) {
        try {
            const actions = JSON.parse(intake.followUpActies);
            if (actions && Array.isArray(actions)) {
                followUpActions = actions;

                // Save to session storage for consistency
                sessionStorage.setItem('intakeFollowUp', JSON.stringify(actions));

                // Render the follow-up list if we're on the follow-up view
                renderFollowUpList();

                showToast('✅ Follow-up acties hersteld!', 'info');
            }
        } catch (e) {
            console.error('Error loading follow-up data:', e);
        }
    }
}

// Save intake to Cosmos DB
async function saveIntakeToCosmosDB(isAutoSave = false) {
    const customer = sessionStorage.getItem('intakeCustomer');
    if (!customer) {
        if (!isAutoSave) {
            showToast('Geen klant geselecteerd. Maak eerst een klant aan of open een bestaande intake.', 'warning');
        }
        return;
    }

    const customerData = JSON.parse(customer);
    const customerNumber = customerData.customerNumber;

    // Gather all intake data
    const notes = {
        quick: document.getElementById('quickNotes')?.value || '',
        painPoints: document.getElementById('painPoints')?.value || '',
        currentSituation: document.getElementById('currentSituation')?.value || '',
        desiredOutcome: document.getElementById('desiredOutcome')?.value || ''
    };

    // Get quote data
    const quoteData = sessionStorage.getItem('intakeQuote');
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
    const followUpData = sessionStorage.getItem('intakeFollowUp');
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

    const intakeData = {
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

        // Check if intake already exists
        const existingIntakeId = sessionStorage.getItem('intakeId');

        let response;
        if (existingIntakeId) {
            // Update existing intake
            response = await fetch(`${config.apiUrl}/customers/${customerNumber}/intake/${existingIntakeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${basicAuthHeader}`
                },
                body: JSON.stringify(intakeData)
            });
        } else {
            // Create new intake
            response = await fetch(`${config.apiUrl}/customers/${customerNumber}/intake`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${basicAuthHeader}`
                },
                body: JSON.stringify(intakeData)
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const savedIntake = await response.json();

        // Store the intake ID for future updates
        sessionStorage.setItem('intakeId', savedIntake.id);

        if (!isAutoSave) {
            showToast('Intake opgeslagen in Cosmos DB!', 'success');
        }

        return savedIntake;

    } catch (error) {
        console.error('Error saving intake to Cosmos DB:', error);
        if (!isAutoSave) {
            showToast('Fout bij opslaan van intake: ' + error.message, 'error');
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
        await saveIntakeToCosmosDB(isAutoSave);
    } catch (error) {
        // Error already logged and shown to user in saveIntakeToCosmosDB
    }
};

// Load intake for the current customer
async function loadIntakeForCurrentCustomer() {
    const customer = sessionStorage.getItem('intakeCustomer');
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

    // Use the existing openExistingIntake logic
    try {
        showToast('Intake ophalen...', 'info');

        const config = getAppConfig();
        const basicAuthHeader = btoa(`${config.username}:${config.password}`);

        const intakeResponse = await fetch(`${config.apiUrl}/customers/${customerNumber}/intake`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${basicAuthHeader}`
            }
        });

        if (intakeResponse.ok) {
            const intake = await intakeResponse.json();

            // Load intake data into the form
            loadIntakeData(intake);
            showToast('Intake succesvol geopend!', 'success');

            // Switch to notes view to show the loaded data
            switchIntakeView('notes');
        } else if (intakeResponse.status === 404) {
            showToast(`Nog geen intake gevonden voor ${customerNumber}. Je kunt nu notities maken.`, 'info');
            switchIntakeView('notes');
        } else {
            throw new Error('Fout bij ophalen van intake');
        }

    } catch (error) {
        console.error('Error loading intake:', error);
        showToast('Fout bij ophalen van intake: ' + error.message, 'error');
    }
}

// ==================== INTAKE COMPLETION ====================

// Complete intake and mark as "afgerond"
async function completeIntake() {
    const customer = sessionStorage.getItem('intakeCustomer');
    if (!customer) {
        showToast('Geen klant geselecteerd', 'warning');
        return;
    }

    const customerData = JSON.parse(customer);
    const intakeId = sessionStorage.getItem('intakeId');

    if (!intakeId) {
        alert('⚠️ Deze intake moet eerst worden opgeslagen voordat je deze kunt afronden.\n\nKlik op "Opslaan" in de Notities sectie om de intake op te slaan.');
        return;
    }

    // Check if we have minimum required data
    const hasNotes = sessionStorage.getItem('intakeNotes');
    const hasQuote = sessionStorage.getItem('intakeQuote');

    if (!hasNotes && !hasQuote) {
        alert('⚠️ Vul minimaal notities of een offerte in voordat je de intake afrondt.');
        return;
    }

    if (!confirm('🎯 Weet je zeker dat je deze intake wilt afronden?\n\n✅ Alle gegevens worden opgeslagen:\n• Notities\n• Offerte items\n• Follow-up acties\n\nDe status wordt gewijzigd naar "afgerond".')) {
        return;
    }

    try {
        showToast('Intake afronden...', 'info');

        // Save all data with status "afgerond"
        const customerNumber = customerData.customerNumber;
        const notes = JSON.parse(sessionStorage.getItem('intakeNotes') || '{}');

        // Get quote data
        const quoteData = sessionStorage.getItem('intakeQuote');
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
        const followUpData = sessionStorage.getItem('intakeFollowUp');
        let followUpActies = null;

        if (followUpData) {
            const actions = JSON.parse(followUpData);
            if (actions && actions.length > 0) {
                followUpActies = JSON.stringify(actions);
            }
        }

        const intakeData = {
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

        // Update intake with "afgerond" status
        const response = await fetch(`${config.apiUrl}/customers/${customerNumber}/intake/${intakeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuthHeader}`
            },
            body: JSON.stringify(intakeData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Success!
        showToast('🎉 Intake succesvol afgerond!', 'success');

        // Show summary modal
        showIntakeCompletionSummary(customerData, offerteSubtotaal, offerteTotaal, followUpActies);

    } catch (error) {
        console.error('Error completing intake:', error);
        showToast('❌ Fout bij afronden van intake: ' + error.message, 'error');
    }
}

// Show completion summary
function showIntakeCompletionSummary(customer, subtotal, total, followUpJson) {
    const followUpCount = followUpJson ? JSON.parse(followUpJson).length : 0;

    const summaryHtml = `
        <div class="space-y-4">
            <div class="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-check text-white text-2xl"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-green-800">Intake Afgerond!</h3>
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
                    Je kunt deze intake later weer openen om wijzigingen aan te brengen.
                </p>
            </div>
        </div>
    `;

    createModal(
        'Intake Afgerond',
        summaryHtml,
        () => {
            // Clear session and return to customer list
            sessionStorage.removeItem('intakeCustomer');
            sessionStorage.removeItem('intakeId');
            sessionStorage.removeItem('intakeNotes');
            sessionStorage.removeItem('intakeQuote');
            sessionStorage.removeItem('intakeFollowUp');

            // Redirect to customers view
            switchIntakeView('customers');
            location.reload(); // Refresh to reset everything
        },
        'Afsluiten',
        'md'
    );
}

// ==================== KVK LOOKUP FUNCTIONALITY ====================

// KvK API lookup function
async function intakeLookupKvK() {
    const kvkInput = document.getElementById('businessKvk');
    const kvkNumber = kvkInput?.value.trim();
    const statusDiv = document.getElementById('intakeKvkStatus');
    const lookupBtn = document.getElementById('intakeKvkLookupBtn');

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
                validateIntakeField(businessNameField);
            }

            // Fill in address if available
            if (data.adressen && data.adressen.length > 0) {
                const address = data.adressen[0];

                if (address.straatnaam) {
                    const streetField = document.getElementById('addressStreet');
                    if (streetField && !streetField.value) {
                        streetField.value = address.straatnaam;
                        validateIntakeField(streetField);
                    }
                }

                if (address.huisnummer) {
                    const numberField = document.getElementById('addressNumber');
                    if (numberField && !numberField.value) {
                        numberField.value = address.huisnummer + (address.huisnummerToevoeging || '');
                        validateIntakeField(numberField);
                    }
                }

                if (address.postcode) {
                    const postalField = document.getElementById('addressPostal');
                    if (postalField && !postalField.value) {
                        postalField.value = address.postcode.replace(/\s/g, '');
                        validateIntakeField(postalField);
                    }
                }

                if (address.plaats) {
                    const cityField = document.getElementById('addressCity');
                    if (cityField && !cityField.value) {
                        cityField.value = address.plaats;
                        validateIntakeField(cityField);
                    }
                }
            }

            // Success message
            if (statusDiv) {
                statusDiv.innerHTML = '<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>Bedrijfsgegevens succesvol opgehaald!</span>';
            }
            showToast('✅ KvK gegevens succesvol ingevuld!', 'success');

            // Update tab checks
            updateIntakeTabChecks();
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
                validateIntakeField(businessNameField);
            }

            // Fill in address
            if (mockCompany.address) {
                const streetField = document.getElementById('addressStreet');
                if (streetField && !streetField.value) {
                    streetField.value = mockCompany.address.straatnaam;
                    validateIntakeField(streetField);
                }

                const numberField = document.getElementById('addressNumber');
                if (numberField && !numberField.value) {
                    numberField.value = mockCompany.address.huisnummer;
                    validateIntakeField(numberField);
                }

                const postalField = document.getElementById('addressPostal');
                if (postalField && !postalField.value) {
                    postalField.value = mockCompany.address.postcode;
                    validateIntakeField(postalField);
                }

                const cityField = document.getElementById('addressCity');
                if (cityField && !cityField.value) {
                    cityField.value = mockCompany.address.plaats;
                    validateIntakeField(cityField);
                }
            }

            if (statusDiv) {
                statusDiv.innerHTML = '<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>Bedrijfsgegevens succesvol opgehaald! (demo data)</span>';
            }
            showToast('✅ KvK gegevens succesvol ingevuld! (demo)', 'success');

            // Update tab checks
            updateIntakeTabChecks();
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
    // Show confirmation and note in the intake
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
            switchIntakeView('notes');

            // Show success message
            showToast('success', `Onderhoudsplan "${planName}" toegevoegd aan notities`);
        }
    } else {
        // No customer selected, just show info
        showToast('info', `Onderhoudsplan "${planName}" geselecteerd. Maak eerst een klant aan om dit toe te voegen aan de intake.`);
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

