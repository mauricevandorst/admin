// Customers management

// Sort state
let _customersSortCol = 'customerNumber';
let _customersSortDir = -1; // 1 = ascending, -1 = descending (default: descending for newest first)
let _customersCache = [];

async function loadCustomers() {
    try {
        const customers = await getAll('customers');

        // Cache customers for sorting
        _customersCache = customers || [];

        renderCustomersTable();
    } catch (error) {
        showError(error.message);
    }
}

function sortCustomers(col) {
    if (_customersSortCol === col) {
        _customersSortDir = -_customersSortDir;
    } else {
        _customersSortCol = col;
        _customersSortDir = 1;
    }
    renderCustomersTable();
}

function _customersSortIcon(col) {
    if (_customersSortCol !== col) return '<i class="fas fa-sort ml-1 opacity-30"></i>';
    return _customersSortDir === 1
        ? '<i class="fas fa-sort-up ml-1"></i>'
        : '<i class="fas fa-sort-down ml-1"></i>';
}

function applySortToCustomers(customers, col, dir) {
    return [...customers].sort((a, b) => {
        let aVal = '', bVal = '';

        if (col === 'customerNumber') {
            const aNum = parseInt((a.customerNumber || '').replace(/\D/g, ''), 10) || 0;
            const bNum = parseInt((b.customerNumber || '').replace(/\D/g, ''), 10) || 0;
            return (aNum - bNum) * dir;
        } else if (col === 'business') {
            aVal = (a.business?.displayName || a.business?.name || '').toLowerCase();
            bVal = (b.business?.displayName || b.business?.name || '').toLowerCase();
        } else if (col === 'contact') {
            aVal = (a.contact?.name || '').toLowerCase();
            bVal = (b.contact?.name || '').toLowerCase();
        } else if (col === 'email') {
            aVal = (a.contact?.emailAddress || '').toLowerCase();
            bVal = (b.contact?.emailAddress || '').toLowerCase();
        } else if (col === 'kvk') {
            aVal = a.business?.kvkNumber || '';
            bVal = b.business?.kvkNumber || '';
        } else if (col === 'vat') {
            aVal = a.business?.vatNumber || '';
            bVal = b.business?.vatNumber || '';
        }

        return aVal < bVal ? -dir : aVal > bVal ? dir : 0;
    });
}

function renderCustomersTable() {
    // Filter sensitive data for Gast role
    const displayCustomers = canViewSensitive() ? _customersCache : (_customersCache || []).map(c => ({
        ...c,
        contact: {
            name: '***',
            emailAddress: '***',
            phoneNumber: '***'
        },
        business: {
            ...c.business,
            emailAddress: '***'
        }
    }));

    // Apply sorting
    const sortedCustomers = applySortToCustomers(displayCustomers, _customersSortCol, _customersSortDir);

    const thSort = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase text-nowrap cursor-pointer hover:bg-gray-100 select-none';

    let html = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Klanten</h2>
            ${canEdit() ? `
            <button onclick="showCreateCustomer()" 
                    class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                <i class="fas fa-plus"></i> Nieuw
            </button>
            ` : ''}
        </div>
    `;

    if (!sortedCustomers || sortedCustomers.length === 0) {
        html += '<p class="text-gray-500 text-center py-8">Geen klanten gevonden</p>';
    } else {
        html += '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
        html += `
            <thead class="bg-gray-50">
                <tr>
                    <th class="${thSort}" onclick="sortCustomers('customerNumber')">Klantnummer ${_customersSortIcon('customerNumber')}</th>
                    <th class="${thSort}" onclick="sortCustomers('business')">Bedrijf ${_customersSortIcon('business')}</th>
                    <th class="${thSort}" onclick="sortCustomers('contact')">Contactpersoon ${_customersSortIcon('contact')}</th>
                    <th class="${thSort}" onclick="sortCustomers('email')">Email ${_customersSortIcon('email')}</th>
                    <th class="${thSort}" onclick="sortCustomers('kvk')">KvK-nummer ${_customersSortIcon('kvk')}</th>
                    <th class="${thSort}" onclick="sortCustomers('vat')">BTW-nummer ${_customersSortIcon('vat')}</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
        `;

        sortedCustomers.forEach(customer => {
            html += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div class="text-blue-600 hover:text-blue-900 cursor-pointer hover:underline" 
                             onclick="showEditCustomer('${customer.id}')">
                            ${customer.customerNumber || 'N/A'}
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${customer.business?.displayName || customer.business?.name || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${customer.contact?.name || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${customer.contact?.emailAddress || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${customer.business?.kvkNumber || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${customer.business?.vatNumber || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        ${canEdit() ? `
                        <button onclick="showEditCustomer('${customer.id}')" 
                                class="text-blue-600 hover:text-blue-900 mr-3"
                                title="Bewerken">
                            <i class="fas fa-edit"></i>
                        </button>
                        ` : ''}
                        ${canDelete() ? `
                        <button onclick="deleteCustomer('${customer.id}')" 
                                class="text-red-600 hover:text-red-900"
                                title="Verwijderen">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
    }

    document.getElementById('content').innerHTML = html;
}

function getCustomerForm(customer = null) {
    const c = customer || {};
    const customerId = customer ? c.customerId : generateGuid();
    const isEdit = !!customer;

    // Setup autosave after rendering
    setTimeout(() => setupCustomerFormEnhancements(isEdit), 100);

    return `
        <div class="space-y-6">
            <input type="hidden" id="customerId" value="${customerId}">

            <!-- Progress Indicator -->
            <div class="mb-4">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-medium text-gray-600">Voortgang</span>
                    <span class="text-xs text-gray-600" id="formProgress">0%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1.5">
                    <div id="progressBar" class="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
            </div>

            <!-- Smart Quick Actions -->
            <div class="flex flex-wrap gap-2">
                <button type="button" onclick="fillDemoData()" 
                        class="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md text-sm transition-colors">
                    <i class="fas fa-magic mr-1"></i> Demo gegevens
                </button>
                <button type="button" onclick="clearForm()" 
                        class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors">
                    <i class="fas fa-eraser mr-1"></i> Reset
                </button>
            </div>

            <!-- Duplicate Warning -->
            <div id="duplicateWarning" class="hidden bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                <div class="flex">
                    <i class="fas fa-exclamation-triangle text-yellow-400 mr-3 mt-0.5"></i>
                    <div>
                        <h4 class="text-sm font-semibold text-yellow-800">Mogelijke duplicaat gedetecteerd</h4>
                        <p class="text-sm text-yellow-700 mt-1" id="duplicateMessage"></p>
                    </div>
                </div>
            </div>

            <!-- Tabbed Interface -->
            <div class="border-b border-gray-200">
                <nav class="flex space-x-4" role="tablist">
                    <button type="button" onclick="switchCustomerTab('contact')" id="tab-contact" 
                            class="tab-button active px-4 py-2 font-medium text-sm border-b-2 border-blue-500 text-blue-600">
                        <i class="fas fa-user mr-2"></i>Contactpersoon
                        <span class="tab-check ml-2 hidden">✓</span>
                    </button>
                    <button type="button" onclick="switchCustomerTab('business')" id="tab-business"
                            class="tab-button px-4 py-2 font-medium text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
                        <i class="fas fa-building mr-2"></i>Bedrijf
                        <span class="tab-check ml-2 hidden">✓</span>
                    </button>
                    <button type="button" onclick="switchCustomerTab('details')" id="tab-details"
                            class="tab-button px-4 py-2 font-medium text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
                        <i class="fas fa-info-circle mr-2"></i>Details
                        <span class="tab-check ml-2 hidden">✓</span>
                    </button>
                </nav>
            </div>

            <!-- Tab Content -->
            <div id="tabContent">
                <!-- Contact Tab -->
                <div id="content-contact" class="tab-content">
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-sm">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl mr-4">
                                <i class="fas fa-user"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-gray-800">Contactpersoon</h3>
                                <p class="text-sm text-gray-600">Wie is het aanspreekpunt?</p>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <div class="form-group">
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-user-circle text-blue-500 mr-1"></i>
                                    Naam <span class="text-red-600 ml-1">*</span>
                                </label>
                                <div class="relative">
                                    <input type="text" id="contactName" 
                                           value="${c.contact?.name || ''}" required
                                           placeholder="Voor- en achternaam"
                                           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                                    <span class="field-check hidden absolute right-3 top-3 text-green-500">✓</span>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-envelope text-blue-500 mr-1"></i>
                                    E-mail <span class="text-red-600 ml-1">*</span>
                                </label>
                                <div class="relative">
                                    <input type="email" id="contactEmail" 
                                           value="${c.contact?.emailAddress || ''}" required
                                           placeholder="contact@bedrijf.nl"
                                           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                                    <span class="field-check hidden absolute right-3 top-3 text-green-500">✓</span>
                                </div>
                                <p class="text-xs text-gray-500 mt-1">💡 We vullen automatisch het domein in</p>
                            </div>
                            <div class="form-group">
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-phone text-blue-500 mr-1"></i>
                                    Telefoon
                                </label>
                                <div class="relative">
                                    <input type="tel" id="contactPhone" 
                                           value="${c.contact?.phoneNumber || ''}"  
                                           placeholder="06-12345678"
                                           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                                    <span class="field-check hidden absolute right-3 top-3 text-green-500">✓</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Business Tab -->
                <div id="content-business" class="tab-content hidden">
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg shadow-sm">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-xl mr-4">
                                <i class="fas fa-building"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-gray-800">Bedrijfsgegevens</h3>
                                <p class="text-sm text-gray-600">Vertel ons meer over het bedrijf</p>
                            </div>
                        </div>

                        <!-- KvK Smart Lookup -->
                        <div class="bg-white border-2 border-green-200 rounded-lg p-4 mb-4">
                            <div class="flex items-start">
                                <i class="fas fa-lightbulb text-yellow-500 text-xl mr-3 mt-1"></i>
                                <div class="flex-1">
                                    <h4 class="font-semibold text-gray-800 mb-2">⚡ Smart KvK Lookup</h4>
                                    <p class="text-sm text-gray-600 mb-3">Vul het KvK-nummer in en klik op 'Zoek' om automatisch bedrijfsgegevens op te halen.</p>
                                    <div class="form-group">
                                        <label class="block text-sm font-medium text-gray-700 mb-2">KvK-nummer</label>
                                        <div class="flex gap-2">
                                            <input type="text" id="businessKvkNumber" 
                                                   value="${c.business?.kvkNumber || ''}" 
                                                   placeholder="12345678"
                                                   maxlength="8"
                                                   class="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                            <button type="button" onclick="lookupKvK()" id="kvkLookupBtn"
                                                    class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium whitespace-nowrap">
                                                <i class="fas fa-search mr-1"></i> Zoek
                                            </button>
                                        </div>
                                        <div id="kvkStatus" class="text-sm mt-2"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <div class="form-group">
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-building text-green-500 mr-1"></i>
                                    Bedrijfsnaam <span class="text-red-600 ml-1">*</span>
                                </label>
                                <div class="relative">
                                    <input type="text" id="businessName" 
                                           value="${c.business?.name || ''}" required
                                           placeholder="Officiële bedrijfsnaam"
                                           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all">
                                    <span class="field-check hidden absolute right-3 top-3 text-green-500">✓</span>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="form-group">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        <i class="fas fa-tag text-green-500 mr-1"></i>
                                        Weergavenaam
                                    </label>
                                    <div class="relative">
                                        <input type="text" id="businessDisplayName" 
                                               value="${c.business?.displayName || ''}" 
                                               placeholder="Korte naam voor facturen"
                                               class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all">
                                        <span class="field-check hidden absolute right-3 top-3 text-green-500">✓</span>
                                    </div>
                                    <p class="text-xs text-gray-500 mt-1">💡 Indien leeg wordt de bedrijfsnaam getoond</p>
                                </div>
                                <div class="form-group">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        <i class="fas fa-globe text-green-500 mr-1"></i>
                                        Domein
                                    </label>
                                    <div class="relative">
                                        <input type="text" id="businessDomain" 
                                               value="${c.business?.domain || ''}" 
                                               placeholder="bedrijf.nl"
                                               class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all">
                                        <span class="field-check hidden absolute right-3 top-3 text-green-500">✓</span>
                                    </div>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="form-group">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        <i class="fas fa-envelope text-green-500 mr-1"></i>
                                        Bedrijf E-mail
                                    </label>
                                    <div class="relative">
                                        <input type="email" id="businessEmail" 
                                               value="${c.business?.emailAddress || ''}" 
                                               placeholder="info@bedrijf.nl"
                                               class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all">
                                        <span class="field-check hidden absolute right-3 top-3 text-green-500">✓</span>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        <i class="fas fa-phone text-green-500 mr-1"></i>
                                        Bedrijf Telefoon
                                    </label>
                                    <div class="relative">
                                        <input type="tel" id="businessPhone" 
                                               value="${c.business?.phoneNumber || ''}" 
                                               placeholder="010-1234567"
                                               class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all">
                                        <span class="field-check hidden absolute right-3 top-3 text-green-500">✓</span>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-file-invoice text-green-500 mr-1"></i>
                                    BTW-nummer
                                </label>
                                <div class="relative">
                                    <input type="text" id="businessVatNumber" 
                                           value="${c.business?.vatNumber || ''}" 
                                           placeholder="NL123456789B01"
                                           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all">
                                    <span class="field-check hidden absolute right-3 top-3 text-green-500">✓</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Details Tab -->
                <div id="content-details" class="tab-content hidden">
                    <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow-sm">

                                    <div class="flex items-center mb-4">
                                        <div class="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white text-xl mr-4">
                                            <i class="fas fa-map-marker-alt"></i>
                                        </div>
                                        <div>
                                            <h3 class="text-lg font-bold text-gray-800">Adres & Extra Details</h3>
                                            <p class="text-sm text-gray-600">Aanvullende informatie</p>
                                        </div>
                                    </div>

                                    <!-- Address with smart postcode lookup -->
                                    <div class="bg-white border-2 border-purple-200 rounded-lg p-4 mb-4">
                                        <h4 class="font-semibold text-gray-800 mb-3">
                                            <i class="fas fa-home text-purple-500 mr-2"></i>Adresgegevens
                                        </h4>
                                        <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
                                            <div class="md:col-span-2 form-group">
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Postcode</label>
                                                <div class="relative">
                                                    <input type="text" id="addressPostalCode" 
                                                           value="${c.business?.address?.postalCode || ''}" 
                                                           placeholder="1234AB"
                                                           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                                                    <span class="field-check hidden absolute right-3 top-3 text-green-500">✓</span>
                                                </div>
                                                <p class="text-xs text-gray-500 mt-1">💡 We zoeken automatisch het adres</p>
                                            </div>
                                            <div class="md:col-span-1 form-group">
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Nr.</label>
                                                <div class="relative">
                                                    <input type="text" id="addressHouseNumber" 
                                                           value="${c.business?.address?.houseNumber || ''}" 
                                                           placeholder="123A"
                                                           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                                                    <span class="field-check hidden absolute right-3 top-3 text-green-500">✓</span>
                                                </div>
                                            </div>
                                            <div class="md:col-span-3 form-group">
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Straat</label>
                                                <div class="relative">
                                                    <input type="text" id="addressStreet" 
                                                           value="${c.business?.address?.street || ''}" 
                                                           placeholder="Straatnaam"
                                                           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                                                    <span class="field-check hidden absolute right-3 top-3 text-green-500">✓</span>
                                                </div>
                                            </div>
                                            <div class="md:col-span-6 form-group">
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Stad</label>
                                                <div class="relative">
                                                    <input type="text" id="addressCity" 
                                                           value="${c.business?.address?.city || ''}" 
                                                           placeholder="Plaats"
                                                           class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                                                    <span class="field-check hidden absolute right-3 top-3 text-green-500">✓</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Summary Card -->
                                    <div class="bg-white border-2 border-purple-200 rounded-lg p-4">
                                        <h4 class="font-semibold text-gray-800 mb-3">
                                            <i class="fas fa-clipboard-check text-purple-500 mr-2"></i>Samenvatting
                                        </h4>
                                        <div id="formSummary" class="text-sm text-gray-600 space-y-2">
                                            <p>📋 Vul de gegevens in om een samenvatting te zien</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
}

function getCustomerData() {
    return {
        customerId: document.getElementById('customerId').value.trim(),
        contact: {
            name: document.getElementById('contactName').value.trim(),
            emailAddress: document.getElementById('contactEmail').value.trim(),
            phoneNumber: document.getElementById('contactPhone').value.trim()
        },
        business: {
            name: document.getElementById('businessName').value.trim(),
            displayName: document.getElementById('businessDisplayName').value.trim(),
            domain: document.getElementById('businessDomain').value.trim(),
            emailAddress: document.getElementById('businessEmail').value.trim(),
            phoneNumber: document.getElementById('businessPhone').value.trim(),
            kvkNumber: document.getElementById('businessKvkNumber').value.trim(),
            vatNumber: document.getElementById('businessVatNumber').value.trim(),
            address: {
                street: document.getElementById('addressStreet').value.trim(),
                houseNumber: document.getElementById('addressHouseNumber').value.trim(),
                postalCode: document.getElementById('addressPostalCode').value.trim(),
                city: document.getElementById('addressCity').value.trim()
            }
        }
    };
}

// Validate customer form data
function validateCustomerData(data) {
    const errors = [];

    // Clear previous error states
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.remove());

    // Validate contact name (required)
    if (!data.contact.name || data.contact.name.length === 0) {
        errors.push({ field: 'contactName', message: 'Contactpersoon naam is verplicht' });
    }

    // Validate contact email (required + format)
    if (!data.contact.emailAddress || data.contact.emailAddress.length === 0) {
        errors.push({ field: 'contactEmail', message: 'Contact e-mail is verplicht' });
    } else if (!isValidEmail(data.contact.emailAddress)) {
        errors.push({ field: 'contactEmail', message: 'Ongeldig e-mail adres' });
    }

    // Validate business name (required)
    if (!data.business.name || data.business.name.length === 0) {
        errors.push({ field: 'businessName', message: 'Bedrijfsnaam is verplicht' });
    }

    // Validate business email format (optional but must be valid if filled)
    if (data.business.emailAddress && !isValidEmail(data.business.emailAddress)) {
        errors.push({ field: 'businessEmail', message: 'Ongeldig e-mail adres' });
    }

    // Validate domain format (optional but must be valid if filled)
    if (data.business.domain && !isValidDomain(data.business.domain)) {
        errors.push({ field: 'businessDomain', message: 'Ongeldig domein formaat (bijv. bedrijf.nl)' });
    }

    // Validate postal code format (Dutch format, optional but must be valid if filled)
    if (data.business.address.postalCode && !isValidDutchPostalCode(data.business.address.postalCode)) {
        errors.push({ field: 'addressPostalCode', message: 'Ongeldig postcode formaat (bijv. 1234AB)' });
    }

    // Validate KvK number (Dutch Chamber of Commerce, 8 digits, optional but must be valid if filled)
    if (data.business.kvkNumber && !isValidKvkNumber(data.business.kvkNumber)) {
        errors.push({ field: 'businessKvkNumber', message: 'Ongeldig KvK-nummer (8 cijfers)' });
    }

    // Validate VAT number (optional but must be valid if filled)
    if (data.business.vatNumber && !isValidVatNumber(data.business.vatNumber)) {
        errors.push({ field: 'businessVatNumber', message: 'Ongeldig BTW-nummer (bijv. NL123456789B01)' });
    }

    // Display field-specific errors
    errors.forEach(error => {
        const field = document.getElementById(error.field);
        if (field) {
            field.classList.add('error');
            field.classList.add('border-red-500');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message text-red-600 text-sm mt-1 flex items-center';
            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle mr-1"></i> ${error.message}`;
            field.parentElement.appendChild(errorMsg);
        }
    });

    return errors;
}

// Helper validation functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
}

function isValidDutchPostalCode(postalCode) {
    const postalCodeRegex = /^[1-9][0-9]{3}\s?[A-Z]{2}$/i;
    return postalCodeRegex.test(postalCode);
}

function isValidKvkNumber(kvkNumber) {
    // Dutch KvK number is 8 digits
    const kvkRegex = /^[0-9]{8}$/;
    return kvkRegex.test(kvkNumber.replace(/\s/g, ''));
}

function isValidVatNumber(vatNumber) {
    // Dutch VAT number format: NL + 9 digits + B + 2 digits
    // Also accept other EU VAT number formats (basic validation)
    const dutchVatRegex = /^NL[0-9]{9}B[0-9]{2}$/i;
    const euVatRegex = /^[A-Z]{2}[0-9A-Z]{2,13}$/i;

    const cleanedVat = vatNumber.replace(/[\s.-]/g, '').toUpperCase();
    return dutchVatRegex.test(cleanedVat) || euVatRegex.test(cleanedVat);
}

function showCreateCustomer() {
    createModal('Nieuwe Klant 🎉', getCustomerForm(), async () => {
        const data = getCustomerData();

        // Validate form data
        const errors = validateCustomerData(data);
        if (errors.length > 0) {
            const errorMessages = errors.map(e => e.message).join('\n');
            throw new Error(`Validatie fouten:\n${errorMessages}`);
        }

        await create('customers', data);
        showToast('Klant aangemaakt! 🎉', 'success');
        loadCustomers();
    });
}

async function showEditCustomer(id) {
    const loadingModal = showLoadingModal('Klant laden...');
    try {
        const customer = await getById('customers', id);

        hideLoadingModal();

        createModal('Klant Bewerken', getCustomerForm(customer), async () => {
            const data = getCustomerData();

            // Validate form data
            const errors = validateCustomerData(data);
            if (errors.length > 0) {
                const errorMessages = errors.map(e => e.message).join('\n');
                throw new Error(`Validatie fouten:\n${errorMessages}`);
            }

            await update('customers', id, data);
            showToast('Klant bijgewerkt', 'success');
            loadCustomers();
        });
    } catch (error) {
        hideLoadingModal();
        showToast('Fout bij laden klant: ' + error.message, 'error');
    }
}

async function deleteCustomer(id) {
    if (!confirm('Weet je zeker dat je deze klant wilt verwijderen?')) return;

    try {
        await remove('customers', id);
        showToast('Klant verwijderd', 'success');
        loadCustomers();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============= SMART FORM ENHANCEMENTS =============

// Tab switching for customer form
function switchCustomerTab(tabName) {
    // Safety check - ensure elements exist
    const tabButton = document.getElementById(`tab-${tabName}`);
    const tabContent = document.getElementById(`content-${tabName}`);

    if (!tabButton || !tabContent) {
        return; // Silently return if not in customer form context
    }

    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    tabButton.classList.remove('border-transparent', 'text-gray-500');
    tabButton.classList.add('active', 'border-blue-500', 'text-blue-600');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    tabContent.classList.remove('hidden');

    updateFormSummary();
}

// Setup form enhancements
function setupCustomerFormEnhancements(isEdit) {
    const allFields = [
        'contactName', 'contactEmail', 'contactPhone',
        'businessName', 'businessDisplayName', 'businessDomain',
        'businessEmail', 'businessPhone', 'businessKvkNumber', 'businessVatNumber',
        'addressStreet', 'addressHouseNumber', 'addressPostalCode', 'addressCity'
    ];

    // Live validation and progress tracking
    allFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => {
                validateFieldLive(fieldId);
                updateFormProgress();
                updateFormSummary();
            });

            field.addEventListener('blur', () => {
                validateFieldLive(fieldId);
            });
        }
    });

    // Smart auto-fill from email
    const contactEmail = document.getElementById('contactEmail');
    if (contactEmail) {
        contactEmail.addEventListener('blur', () => {
            autoFillFromEmail();
            checkDuplicates();
        });
    }

    // Check for duplicates on business name blur (removed auto-fill displayName)
    const businessName = document.getElementById('businessName');
    if (businessName) {
        businessName.addEventListener('blur', () => {
            checkDuplicates();
        });
    }

    // KvK number validation and duplicate check
    const kvkField = document.getElementById('businessKvkNumber');
    if (kvkField) {
        kvkField.addEventListener('blur', checkDuplicates);
    }

    // Postcode lookup (on blur or when house number changes)
    const postalCode = document.getElementById('addressPostalCode');
    const houseNumber = document.getElementById('addressHouseNumber');
    if (postalCode && houseNumber) {
        const lookupAddress = () => lookupPostalCode();
        postalCode.addEventListener('blur', lookupAddress);
        houseNumber.addEventListener('blur', lookupAddress);
    }

    // Initial validation
    updateFormProgress();
    updateFormSummary();
}

// Live field validation with visual feedback
function validateFieldLive(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const value = field.value.trim();
    const formGroup = field.closest('.form-group');
    const checkmark = formGroup?.querySelector('.field-check');

    let isValid = false;

    // Validation logic per field
    switch(fieldId) {
        case 'contactName':
        case 'businessName':
            isValid = value.length >= 2;
            break;
        case 'contactEmail':
        case 'businessEmail':
            isValid = value.length > 0 && isValidEmail(value);
            break;
        case 'contactPhone':
        case 'businessPhone':
            isValid = value.length === 0 || value.length >= 10; // Optional but must be valid
            break;
        case 'businessDomain':
            isValid = value.length === 0 || isValidDomain(value);
            break;
        case 'businessKvkNumber':
            isValid = value.length === 0 || isValidKvkNumber(value);
            break;
        case 'businessVatNumber':
            isValid = value.length === 0 || isValidVatNumber(value);
            break;
        case 'addressPostalCode':
            isValid = value.length === 0 || isValidDutchPostalCode(value);
            break;
        default:
            isValid = value.length > 0;
    }

    // Update visual feedback
    if (isValid && value.length > 0) {
        field.classList.remove('border-red-500', 'border-gray-300');
        field.classList.add('border-green-500');
        if (checkmark) {
            checkmark.classList.remove('hidden');
        }
    } else if (value.length > 0) {
        field.classList.remove('border-green-500', 'border-gray-300');
        field.classList.add('border-red-500');
        if (checkmark) {
            checkmark.classList.add('hidden');
        }
    } else {
        field.classList.remove('border-green-500', 'border-red-500');
        field.classList.add('border-gray-300');
        if (checkmark) {
            checkmark.classList.add('hidden');
        }
    }

    return isValid;
}

// Update progress bar
function updateFormProgress() {
    const requiredFields = [
        'contactName', 'contactEmail', 'businessName'
    ];

    let filledCount = 0;
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && field.value.trim().length > 0) {
            filledCount++;
        }
    });

    const progress = Math.round((filledCount / requiredFields.length) * 100);
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('formProgress');

    if (progressBar && progressText) {
        progressBar.style.width = progress + '%';
        progressText.textContent = progress + '%';
    }

    // Update tab checkmarks
    updateTabCheckmarks();
}

// Update tab checkmarks based on completion
function updateTabCheckmarks() {
    const contactComplete = 
        document.getElementById('contactName')?.value.trim().length > 0 &&
        document.getElementById('contactEmail')?.value.trim().length > 0;

    const businessComplete = 
        document.getElementById('businessName')?.value.trim().length > 0;

    const detailsComplete = 
        document.getElementById('addressPostalCode')?.value.trim().length > 0;

    const tabs = {
        'contact': contactComplete,
        'business': businessComplete,
        'details': detailsComplete
    };

    Object.keys(tabs).forEach(tab => {
        const checkmark = document.querySelector(`#tab-${tab} .tab-check`);
        if (checkmark) {
            if (tabs[tab]) {
                checkmark.classList.remove('hidden');
                checkmark.classList.add('text-green-500');
            } else {
                checkmark.classList.add('hidden');
            }
        }
    });
}

// Auto-fill from email
function autoFillFromEmail() {
    const email = document.getElementById('contactEmail')?.value.trim();
    const domainField = document.getElementById('businessDomain');
    const businessEmailField = document.getElementById('businessEmail');

    if (email && email.includes('@') && domainField) {
        const domain = email.split('@')[1];
        if (!domainField.value.trim()) {
            domainField.value = domain;
            validateFieldLive('businessDomain');
        }

        if (!businessEmailField?.value.trim()) {
            businessEmailField.value = 'info@' + domain;
            validateFieldLive('businessEmail');
        }
    }
}

// Check for duplicates
async function checkDuplicates() {
    const email = document.getElementById('contactEmail')?.value.trim();
    const kvk = document.getElementById('businessKvkNumber')?.value.trim();
    const warningDiv = document.getElementById('duplicateWarning');
    const messageDiv = document.getElementById('duplicateMessage');

    if (!email && !kvk) {
        warningDiv?.classList.add('hidden');
        return;
    }

    try {
        const customers = await getAll('customers');
        const duplicates = customers.filter(c => 
            (email && c.contact?.emailAddress === email) ||
            (kvk && c.business?.kvkNumber === kvk)
        );

        if (duplicates.length > 0 && warningDiv && messageDiv) {
            const dup = duplicates[0];
            messageDiv.textContent = `Er bestaat al een klant met deze gegevens: ${dup.business?.name || 'Onbekend'}`;
            warningDiv.classList.remove('hidden');
        } else if (warningDiv) {
            warningDiv.classList.add('hidden');
        }
    } catch (error) {
        console.error('Duplicate check failed:', error);
    }
}

// KvK lookup (mock - in production use real API)
async function lookupKvK() {
    const kvkNumber = document.getElementById('businessKvkNumber')?.value.trim();
    const statusDiv = document.getElementById('kvkStatus');

    if (!kvkNumber || !isValidKvkNumber(kvkNumber)) {
        if (statusDiv) {
            statusDiv.innerHTML = '<span class=\"text-red-600\"><i class=\"fas fa-times mr-1\"></i>Ongeldig KvK-nummer</span>';
        }
        return;
    }

    if (statusDiv) {
        statusDiv.innerHTML = '<span class=\"text-blue-600\"><i class=\"fas fa-spinner fa-spin mr-1\"></i>Zoeken...</span>';
    }

    // Simulate API call (in production, call actual KvK API)
    setTimeout(() => {
        // Mock data
        const mockData = {
            '12345678': {
                name: 'Voorbeeld BV',
                address: {
                    street: 'Voorbeeldstraat',
                    houseNumber: '1',
                    postalCode: '1234AB',
                    city: 'Amsterdam'
                },
                phoneNumber: '020-1234567',
                vatNumber: 'NL123456789B01'
            }
        };

        const data = mockData[kvkNumber];

        if (data && statusDiv) {
            statusDiv.innerHTML = '<span class=\"text-green-600\"><i class=\"fas fa-check mr-1\"></i>Gevonden! Gegevens ingevuld</span>';

            // Fill form - with null checks (displayName removed from auto-fill)
            const fieldUpdates = [
                { id: 'businessName', value: data.name },
                { id: 'businessPhone', value: data.phoneNumber },
                { id: 'businessVatNumber', value: data.vatNumber },
                { id: 'addressStreet', value: data.address.street },
                { id: 'addressHouseNumber', value: data.address.houseNumber },
                { id: 'addressPostalCode', value: data.address.postalCode },
                { id: 'addressCity', value: data.address.city }
            ];

            fieldUpdates.forEach(update => {
                const field = document.getElementById(update.id);
                if (field) {
                    field.value = update.value;
                    validateFieldLive(update.id);
                }
            });

            updateFormProgress();
            updateFormSummary();
        } else if (statusDiv) {
            statusDiv.innerHTML = '<span class=\"text-orange-600\"><i class=\"fas fa-info-circle mr-1\"></i>Geen gegevens gevonden - vul handmatig in</span>';
        }
    }, 1000);
}

// Postal code lookup (mock - in production use real API)
function lookupPostalCode() {
    const postalCode = document.getElementById('addressPostalCode')?.value.trim().toUpperCase();
    const houseNumber = document.getElementById('addressHouseNumber')?.value.trim();

    if (!postalCode || !houseNumber || !isValidDutchPostalCode(postalCode)) return;

    // Mock lookup (in production, use actual API like PostcodeAPI)
    const mockData = {
        '1234AB': { street: 'Voorbeeldstraat', city: 'Amsterdam' },
        '3011AB': { street: 'Coolsingel', city: 'Rotterdam' },
        '2511AB': { street: 'Lange Voorhout', city: 'Den Haag' }
    };

    const data = mockData[postalCode.replace(/\\s/g, '')];
    if (data) {
        document.getElementById('addressStreet').value = data.street;
        document.getElementById('addressCity').value = data.city;
        validateFieldLive('addressStreet');
        validateFieldLive('addressCity');
        updateFormSummary();
    }
}

// Update form summary
function updateFormSummary() {
    const summaryDiv = document.getElementById('formSummary');
    if (!summaryDiv) return;

    const data = {
        contactName: document.getElementById('contactName')?.value.trim(),
        contactEmail: document.getElementById('contactEmail')?.value.trim(),
        businessName: document.getElementById('businessName')?.value.trim(),
        businessDomain: document.getElementById('businessDomain')?.value.trim(),
        kvk: document.getElementById('businessKvkNumber')?.value.trim(),
        city: document.getElementById('addressCity')?.value.trim()
    };

    if (!data.contactName && !data.businessName) {
        summaryDiv.innerHTML = '<p>📋 Vul de gegevens in om een samenvatting te zien</p>';
        return;
    }

    let html = '<div class=\"space-y-2\">';

    if (data.contactName) {
        html += `<p><strong>👤 Contact:</strong> ${data.contactName}</p>`;
    }
    if (data.contactEmail) {
        html += `<p><strong>📧 Email:</strong> ${data.contactEmail}</p>`;
    }
    if (data.businessName) {
        html += `<p><strong>🏢 Bedrijf:</strong> ${data.businessName}</p>`;
    }
    if (data.businessDomain) {
        html += `<p><strong>🌐 Website:</strong> ${data.businessDomain}</p>`;
    }
    if (data.kvk) {
        html += `<p><strong>📋 KvK:</strong> ${data.kvk}</p>`;
    }
    if (data.city) {
        html += `<p><strong>📍 Locatie:</strong> ${data.city}</p>`;
    }

    html += '</div>';
    summaryDiv.innerHTML = html;
}

// Demo data filler
function fillDemoData() {
    // Check if form exists
    if (!document.getElementById('contactName')) {
        console.warn('Form not loaded, cannot fill demo data');
        return;
    }

    const demoData = {
        contactName: 'Jan de Vries',
        contactEmail: 'jan@voorbeeldbv.nl',
        contactPhone: '06-12345678',
        businessName: 'Voorbeeld BV',
        businessDomain: 'voorbeeldbv.nl',
        businessEmail: 'info@voorbeeldbv.nl',
        businessPhone: '020-1234567',
        businessKvkNumber: '12345678',
        businessVatNumber: 'NL123456789B01',
        addressStreet: 'Voorbeeldstraat',
        addressHouseNumber: '42',
        addressPostalCode: '1234AB',
        addressCity: 'Amsterdam'
    };

    Object.keys(demoData).forEach(key => {
        const field = document.getElementById(key);
        if (field) {
            field.value = demoData[key];
            validateFieldLive(key);
        }
    });

    updateFormProgress();
    updateFormSummary();
    showToast('Demo gegevens ingevuld! 🎉', 'success');
}

// Clear form
function clearForm() {
    // Check if form exists
    if (!document.getElementById('contactName')) {
        console.warn('Form not loaded, cannot clear');
        return;
    }

    if (!confirm('Weet je zeker dat je het formulier wilt leegmaken?')) return;

    const allFields = [
        'contactName', 'contactEmail', 'contactPhone',
        'businessName', 'businessDisplayName', 'businessDomain',
        'businessEmail', 'businessPhone', 'businessKvkNumber', 'businessVatNumber',
        'addressStreet', 'addressHouseNumber', 'addressPostalCode', 'addressCity'
    ];

    allFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = '';
            field.classList.remove('border-green-500', 'border-red-500');
            field.classList.add('border-gray-300');
            const checkmark = field.closest('.form-group')?.querySelector('.field-check');
            if (checkmark) checkmark.classList.add('hidden');
        }
    });

    updateFormProgress();
    updateFormSummary();
    document.getElementById('duplicateWarning')?.classList.add('hidden');
}
