// Customers management
async function loadCustomers() {
    try {
        const customers = await getAll('customers');
        
        // Filter sensitive data for Gast role
        const displayCustomers = canViewSensitive() ? customers : (customers || []).map(c => ({
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
        
        let html = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Klanten</h2>
                ${canEdit() ? `
                <button onclick="showCreateCustomer()" 
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                    <i class="fas fa-plus"></i> Nieuwe Klant
                </button>
                ` : ''}
            </div>
        `;
        
        if (!displayCustomers || displayCustomers.length === 0) {
            html += '<p class="text-gray-500 text-center py-8">Geen klanten gevonden</p>';
        } else {
            html += '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
            html += `
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bedrijf</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contactpersoon</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefoon</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
            `;
            
            displayCustomers.forEach(customer => {
                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${customer.business?.displayName || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${customer.contact?.name || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${customer.contact?.emailAddress || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${customer.contact?.phoneNumber || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            ${canEdit() ? `
                            <button onclick="showEditCustomer('${customer.id}')" 
                                    class="text-blue-600 hover:text-blue-900 mr-3">
                                <i class="fas fa-edit"></i>
                            </button>
                            ` : ''}
                            ${canDelete() ? `
                            <button onclick="deleteCustomer('${customer.id}')" 
                                    class="text-red-600 hover:text-red-900">
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
    } catch (error) {
        showError(error.message);
    }
}

function getCustomerForm(customer = null) {
    const c = customer || {};
    const customerId = customer ? c.customerId : generateGuid();

    return `
        <div class="space-y-6">
            <input type="hidden" id="customerId" value="${customerId}">

            <!-- Contactpersoon Sectie -->
            <div class="bg-blue-50 p-4 rounded-lg">
                <h3 class="font-semibold text-gray-800 mb-4 flex items-center">
                    <i class="fas fa-user mr-2 text-blue-600"></i>
                    Contactpersoon
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Naam <span class="text-red-600 ml-1">*</span>
                        </label>
                        <input type="text" id="contactName" 
                               value="${c.contact?.name || ''}" required
                               placeholder="Voor- en achternaam"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            E-mail <span class="text-red-600 ml-1">*</span>
                        </label>
                        <input type="email" id="contactEmail" 
                               value="${c.contact?.emailAddress || ''}" required
                               placeholder="contact@bedrijf.nl"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Telefoon
                        </label>
                        <input type="tel" id="contactPhone" 
                               value="${c.contact?.phoneNumber || ''}"
                               placeholder="06-12345678"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>
            </div>

            <!-- Bedrijfsinformatie Sectie -->
            <div class="bg-green-50 p-4 rounded-lg">
                <h3 class="font-semibold text-gray-800 mb-4 flex items-center">
                    <i class="fas fa-building mr-2 text-green-600"></i>
                    Bedrijfsinformatie
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Bedrijfsnaam <span class="text-red-600 ml-1">*</span>
                        </label>
                        <input type="text" id="businessName" 
                               value="${c.business?.name || ''}" required
                               placeholder="Officiële bedrijfsnaam"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Weergavenaam
                        </label>
                        <input type="text" id="businessDisplayName" 
                               value="${c.business?.displayName || ''}"
                               placeholder="Korte naam voor displays"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Domein
                        </label>
                        <input type="text" id="businessDomain" 
                               value="${c.business?.domain || ''}"
                               placeholder="bedrijf.nl"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Bedrijf E-mail
                        </label>
                        <input type="email" id="businessEmail" 
                               value="${c.business?.emailAddress || ''}"
                               placeholder="info@bedrijf.nl"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Bedrijf Telefoon
                        </label>
                        <input type="tel" id="businessPhone" 
                               value="${c.business?.phoneNumber || ''}"
                               placeholder="010-1234567"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>
            </div>

            <!-- Adresinformatie Sectie -->
            <div class="bg-gray-50 p-4 rounded-lg">
                <h3 class="font-semibold text-gray-800 mb-4 flex items-center">
                    <i class="fas fa-map-marker-alt mr-2 text-gray-600"></i>
                    Adresinformatie
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Straat
                        </label>
                        <input type="text" id="addressStreet" 
                               value="${c.business?.address?.street || ''}"
                               placeholder="Straatnaam"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Huisnummer
                        </label>
                        <input type="text" id="addressHouseNumber" 
                               value="${c.business?.address?.houseNumber || ''}"
                               placeholder="123A"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Postcode
                        </label>
                        <input type="text" id="addressPostalCode" 
                               value="${c.business?.address?.postalCode || ''}"
                               placeholder="1234AB"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Stad
                        </label>
                        <input type="text" id="addressCity" 
                               value="${c.business?.address?.city || ''}"
                               placeholder="Plaats"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
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

function showCreateCustomer() {
    createModal('Nieuwe Klant', getCustomerForm(), async () => {
        const data = getCustomerData();

        // Validate form data
        const errors = validateCustomerData(data);
        if (errors.length > 0) {
            const errorMessages = errors.map(e => e.message).join('\n');
            throw new Error(`Validatie fouten:\n${errorMessages}`);
        }

        await create('customers', data);
        showToast('Klant aangemaakt', 'success');
        loadCustomers();
    });
}

async function showEditCustomer(id) {
    try {
        const customer = await getById('customers', id);
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
