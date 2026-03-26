// Customers management
async function loadCustomers() {
    try {
        const customers = await getAll('customers');
        
        let html = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Klanten</h2>
                <button onclick="showCreateCustomer()" 
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                    <i class="fas fa-plus"></i> Nieuwe Klant
                </button>
            </div>
        `;
        
        if (!customers || customers.length === 0) {
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
            
            customers.forEach(customer => {
                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${customer.business?.displayName || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${customer.contact?.name || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${customer.contact?.emailAddress || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${customer.contact?.phoneNumber || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onclick="showEditCustomer('${customer.id}')" 
                                    class="text-blue-600 hover:text-blue-900 mr-3">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteCustomer('${customer.id}')" 
                                    class="text-red-600 hover:text-red-900">
                                <i class="fas fa-trash"></i>
                            </button>
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
        <div class="space-y-4">
            <input type="hidden" id="customerId" value="${customerId}">

            <div>
                <h3 class="font-medium mb-3">Contactpersoon</h3>
                <div class="grid grid-cols-1 gap-4">
                    <input type="text" id="contactName" placeholder="Naam *" 
                           value="${c.contact?.name || ''}" required
                           class="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    <input type="email" id="contactEmail" placeholder="E-mail *" 
                           value="${c.contact?.emailAddress || ''}" required
                           class="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    <input type="tel" id="contactPhone" placeholder="Telefoon" 
                           value="${c.contact?.phoneNumber || ''}"
                           class="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                </div>
            </div>
            
            <div class="border-t pt-4">
                <h3 class="font-medium mb-3">Bedrijfsinformatie</h3>
                <div class="grid grid-cols-1 gap-4">
                    <input type="text" id="businessName" placeholder="Bedrijfsnaam *" 
                           value="${c.business?.name || ''}" required
                           class="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    <input type="text" id="businessDisplayName" placeholder="Weergavenaam" 
                           value="${c.business?.displayName || ''}"
                           class="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    <input type="text" id="businessDomain" placeholder="Domein (bijv. example.com)" 
                           value="${c.business?.domain || ''}"
                           class="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    <input type="email" id="businessEmail" placeholder="Bedrijf E-mail" 
                           value="${c.business?.emailAddress || ''}"
                           class="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    <input type="tel" id="businessPhone" placeholder="Bedrijf Telefoon" 
                           value="${c.business?.phoneNumber || ''}"
                           class="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                </div>
                
                <h4 class="font-medium mt-4 mb-2">Adres</h4>
                <div class="grid grid-cols-2 gap-4">
                    <input type="text" id="addressStreet" placeholder="Straat" 
                           value="${c.business?.address?.street || ''}" class="px-3 py-2 border rounded">
                    <input type="text" id="addressHouseNumber" placeholder="Huisnummer" 
                           value="${c.business?.address?.houseNumber || ''}" class="px-3 py-2 border rounded">
                    <input type="text" id="addressPostalCode" placeholder="Postcode" 
                           value="${c.business?.address?.postalCode || ''}" class="px-3 py-2 border rounded">
                    <input type="text" id="addressCity" placeholder="Stad" 
                           value="${c.business?.address?.city || ''}" class="px-3 py-2 border rounded">
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

function showCreateCustomer() {
    createModal('Nieuwe Klant', getCustomerForm(), async () => {
        const data = getCustomerData();
        await create('customers', data);
        showToast('Klant aangemaakt', 'success');
        loadCustomers();
    });
}

async function showEditCustomer(id) {
    const customer = await getById('customers', id);
    createModal('Klant Bewerken', getCustomerForm(customer), async () => {
        const data = getCustomerData();
        await update('customers', id, data);
        showToast('Klant bijgewerkt', 'success');
        loadCustomers();
    });
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
