// Subscriptions management
async function loadSubscriptions() {
    try {
        const subscriptions = await getAll('subscriptions');
        
        let html = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Abonnementen</h2>
                <button onclick="showCreateSubscription()" 
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                    <i class="fas fa-plus"></i> Nieuw Abonnement
                </button>
            </div>
        `;
        
        if (!subscriptions || subscriptions.length === 0) {
            html += '<p class="text-gray-500 text-center py-8">Geen abonnementen gevonden</p>';
        } else {
            html += '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
            html += `
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klant ID</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan Naam</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Startdatum</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Einddatum</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prijs</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
            `;
            
            subscriptions.forEach(sub => {
                const statusClass = sub.status === 'active' ? 'bg-green-100 text-green-800' : 
                                  sub.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                  'bg-gray-100 text-gray-800';
                
                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${sub.subscriptionId || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${sub.customerId || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${sub.planName || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${formatDate(sub.startDate)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${formatDate(sub.endDate)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${formatCurrency(sub.price)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span class="px-2 py-1 text-xs font-semibold rounded ${statusClass}">
                                ${sub.status || 'N/A'}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onclick="showEditSubscription('${sub.id}')" 
                                    class="text-blue-600 hover:text-blue-900 mr-3">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteSubscription('${sub.id}')" 
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

function getSubscriptionForm(subscription = null, allSubscriptions = [], customers = []) {
    const sub = subscription || {};

    // Generate next subscription ID if creating new
    const subscriptionId = subscription ? sub.subscriptionId : generateNextId(allSubscriptions, 'SUB-', 4);

    // Default dates
    const startDate = subscription ? (sub.startDate ? sub.startDate.split('T')[0] : '') : getTodayDate();
    const endDate = subscription ? (sub.endDate ? sub.endDate.split('T')[0] : '') : getDatePlusDays(365);

    const isReadonly = subscription ? 'readonly' : 'readonly';
    const bgColor = subscription ? 'bg-gray-100' : 'bg-blue-50';

    // Create customer dropdown
    let customerOptions = '<option value="">Selecteer een klant...</option>';
    if (customers && customers.length > 0) {
        customers.forEach(customer => {
            const selected = sub.customerId === customer.customerId ? 'selected' : '';
            const displayName = customer.business?.displayName || customer.business?.name || customer.customerId;
            customerOptions += `<option value="${customer.customerId}" ${selected}>${displayName} (${customer.customerId})</option>`;
        });
    }

    return `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">
                        Abonnement ID * 
                        ${!subscription ? '<span class="text-xs text-blue-600">(Automatisch)</span>' : ''}
                    </label>
                    <input type="text" id="subscriptionId" value="${subscriptionId}" 
                           ${isReadonly} required
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${bgColor}">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Klant *</label>
                    ${subscription ? 
                        `<input type="text" id="customerId" value="${sub.customerId || ''}" readonly
                               class="w-full px-3 py-2 border rounded bg-gray-100">` :
                        `<select id="customerId" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                            ${customerOptions}
                         </select>`
                    }
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium mb-2">Plan Naam *</label>
                <input type="text" id="planName" value="${sub.planName || ''}" required
                       placeholder="bijv. Basic, Premium, Enterprise"
                       class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">
                        Startdatum * 
                        ${!subscription ? '<span class="text-xs text-gray-600">(Standaard: vandaag)</span>' : ''}
                    </label>
                    <input type="date" id="startDate" 
                           value="${startDate}" required
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">
                        Einddatum 
                        ${!subscription ? '<span class="text-xs text-gray-600">(Standaard: +1 jaar)</span>' : ''}
                    </label>
                    <input type="date" id="endDate" 
                           value="${endDate}"
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Prijs per maand *</label>
                    <input type="number" step="0.01" id="price" value="${sub.price || ''}" required
                           placeholder="99.99"
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Status *</label>
                    <select id="status" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                        <option value="active" ${!sub.status || sub.status === 'active' ? 'selected' : ''}>Actief</option>
                        <option value="cancelled" ${sub.status === 'cancelled' ? 'selected' : ''}>Geannuleerd</option>
                        <option value="expired" ${sub.status === 'expired' ? 'selected' : ''}>Verlopen</option>
                    </select>
                </div>
            </div>
        </div>
    `;
}

function getSubscriptionData() {
    const endDate = document.getElementById('endDate').value;
    return {
        subscriptionId: document.getElementById('subscriptionId').value.trim(),
        customerId: document.getElementById('customerId').value.trim(),
        planName: document.getElementById('planName').value.trim(),
        startDate: document.getElementById('startDate').value,
        endDate: endDate || null,
        price: parseFloat(document.getElementById('price').value),
        status: document.getElementById('status').value
    };
}

function showCreateSubscription() {
    // Fetch subscriptions and customers in parallel
    Promise.all([
        getAll('subscriptions'),
        getAll('customers')
    ]).then(([subscriptions, customers]) => {
        createModal('Nieuw Abonnement', getSubscriptionForm(null, subscriptions || [], customers || []), async () => {
            const data = getSubscriptionData();
            await create('subscriptions', data);
            showToast('Abonnement aangemaakt', 'success');
            loadSubscriptions();
        });
    }).catch(error => {
        showToast('Kan klanten niet laden: ' + error.message, 'error');
        // Still show modal but without customer list
        createModal('Nieuw Abonnement', getSubscriptionForm(null, [], []), async () => {
            const data = getSubscriptionData();
            await create('subscriptions', data);
            showToast('Abonnement aangemaakt', 'success');
            loadSubscriptions();
        });
    });
}

async function showEditSubscription(id) {
    try {
        const [subscription, allSubscriptions, customers] = await Promise.all([
            getById('subscriptions', id),
            getAll('subscriptions'),
            getAll('customers')
        ]);

        createModal('Abonnement Bewerken', getSubscriptionForm(subscription, allSubscriptions, customers), async () => {
            const data = getSubscriptionData();
            await update('subscriptions', id, data);
            showToast('Abonnement bijgewerkt', 'success');
            loadSubscriptions();
        });
    } catch (error) {
        showToast('Fout bij laden abonnement: ' + error.message, 'error');
    }
}

async function deleteSubscription(id) {
    if (!confirm('Weet je zeker dat je dit abonnement wilt verwijderen?')) return;
    
    try {
        await remove('subscriptions', id);
        showToast('Abonnement verwijderd', 'success');
        loadSubscriptions();
    } catch (error) {
        showToast(error.message, 'error');
    }
}
