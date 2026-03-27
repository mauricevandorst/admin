// Maintenance Plans management
async function loadMaintenancePlans() {
    try {
        const plans = await getAll('maintenance-plans');
        
        let html = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Onderhouds&shy;plannen</h2>
                <button onclick="showCreatePlan()" 
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-nowrap rounded">
                    <i class="fas fa-plus"></i> Nieuw Plan
                </button>
            </div>
        `;
        
        if (!plans || plans.length === 0) {
            html += '<p class="text-gray-500 text-center py-8">Geen plannen gevonden</p>';
        } else {
            html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
            
            plans.forEach(plan => {
                const statusBadge = plan.active 
                    ? '<span class="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">Actief</span>'
                    : '<span class="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">Inactief</span>';
                
                const priorityBadge = plan.prioritySupport
                    ? '<span class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded"><i class="fas fa-star"></i> Prioriteit</span>'
                    : '';
                
                html += `
                    <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <div class="flex justify-between items-start mb-4">
                            <h3 class="text-xl font-bold text-gray-900">${plan.name}</h3>
                            ${statusBadge}
                        </div>
                        
                        <p class="text-gray-600 text-sm mb-4">${plan.description || 'Geen beschrijving'}</p>
                        
                        <div class="border-t border-b py-4 mb-4 space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Prijs per maand:</span>
                                <span class="font-bold text-green-600">${formatCurrency(plan.monthlyPrice)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Inclusief uren:</span>
                                <span class="font-semibold">${plan.includedHours} uur</span>
                            </div>
                            ${plan.quarterlyDiscount > 0 || plan.halfyearlyDiscount > 0 || plan.yearlyDiscount > 0 ? `
                                <div class="text-xs text-orange-600 mt-2 bg-orange-50 p-2 rounded">
                                    <div class="font-semibold mb-1"><i class="fas fa-percentage"></i> Stapelkortingen:</div>
                                    ${plan.quarterlyDiscount > 0 ? `<div>Kwartaal: ${plan.quarterlyDiscount}%</div>` : ''}
                                    ${plan.halfyearlyDiscount > 0 ? `<div>Halfjaar: ${plan.halfyearlyDiscount}%</div>` : ''}
                                    ${plan.yearlyDiscount > 0 ? `<div>Jaar: ${plan.yearlyDiscount}%</div>` : ''}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="space-y-2 mb-4 text-sm">
                            <div class="flex items-center ${plan.hostingIncluded ? 'text-green-600' : 'text-gray-400'}">
                                <i class="fas ${plan.hostingIncluded ? 'fa-check-circle' : 'fa-times-circle'} mr-2"></i>
                                Hosting inclusief
                            </div>
                            <div class="flex items-center ${plan.prioritySupport ? 'text-green-600' : 'text-gray-400'}">
                                <i class="fas ${plan.prioritySupport ? 'fa-check-circle' : 'fa-times-circle'} mr-2"></i>
                                Priority support
                            </div>
                            <div class="flex items-center text-gray-700">
                                <i class="fas fa-clock mr-2"></i>
                                Reactietijd: ${plan.responseTimeHours} uur
                            </div>
                        </div>
                        
                        ${priorityBadge}
                        
                        <div class="flex gap-2 mt-4">
                            <button onclick="showEditPlan('${plan.id}')" 
                                    class="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
                                <i class="fas fa-edit"></i> Bewerken
                            </button>
                            <button onclick="deletePlan('${plan.id}')" 
                                    class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        document.getElementById('content').innerHTML = html;
    } catch (error) {
        showError(error.message);
    }
}

function getPlanForm(plan = null, allPlans = []) {
    const p = plan || {};
    
    // Generate next plan ID if creating new
    const planId = plan ? p.planId : generateNextId(allPlans, 'PLAN-', 3);
    const displayOrder = plan ? p.displayOrder : (allPlans.length + 1) * 10;
    
    const isReadonly = plan ? 'readonly' : 'readonly';
    const bgColor = plan ? 'bg-gray-100' : 'bg-blue-50';
    
    return `
        <div class="space-y-4">
            ${plan ? `
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Plan ID<span class="text-red-600 ml-1">*</span></label>
                        <input type="text" id="planId" value="${planId}" 
                               ${isReadonly} required
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${bgColor}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Naam<span class="text-red-600 ml-1">*</span></label>
                        <input type="text" id="name" value="${p.name || ''}" required
                               placeholder="bijv. Light, Standard, Premium"
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
            ` : `
                <div>
                    <label class="block text-sm font-medium mb-2">Naam<span class="text-red-600 ml-1">*</span></label>
                    <input type="text" id="name" value="${p.name || ''}" required
                           placeholder="bijv. Light, Standard, Premium"
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                </div>
            `}
            
            <div>
                <label class="block text-sm font-medium mb-2">Beschrijving</label>
                <textarea id="description" rows="3" 
                          placeholder="Beschrijf wat dit plan biedt..."
                          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">${p.description || ''}</textarea>
            </div>
            
            <div class="bg-blue-50 p-4 rounded">
                <h4 class="font-semibold mb-3">💰 Prijzen</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Maandprijs (€)<span class="text-red-600 ml-1">*</span></label>
                        <input type="number" step="0.01" id="monthlyPrice" value="${p.monthlyPrice || ''}" required
                               placeholder="99.00"
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Inclusief uren<span class="text-red-600 ml-1">*</span></label>
                        <input type="number" id="includedHours" value="${p.includedHours || ''}" required
                               placeholder="3"
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
            </div>

            <div class="bg-orange-50 p-4 rounded">
                <h4 class="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    <i class="fas fa-percentage"></i> Stapelkortingen (Frequentiekortingen)
                </h4>
                <p class="text-xs text-gray-600 mb-3">
                    <i class="fas fa-info-circle"></i> Korting in percentages voor langere betalingsperiodes
                </p>
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Kwartaal korting (%)</label>
                        <input type="number" step="0.1" min="0" max="100" id="quarterlyDiscount" 
                               value="${p.quarterlyDiscount || ''}" 
                               placeholder="5.0"
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-orange-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Halfjaar korting (%)</label>
                        <input type="number" step="0.1" min="0" max="100" id="halfyearlyDiscount" 
                               value="${p.halfyearlyDiscount || ''}" 
                               placeholder="10.0"
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-orange-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Jaar korting (%)</label>
                        <input type="number" step="0.1" min="0" max="100" id="yearlyDiscount" 
                               value="${p.yearlyDiscount || ''}" 
                               placeholder="15.0"
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-orange-500">
                    </div>
                </div>
                <div class="mt-2 text-xs text-orange-700">
                    <i class="fas fa-lightbulb"></i> <strong>Tip:</strong> Hogere kortingen motiveren klanten om voor langere periodes te betalen
                </div>
            </div>
            
            <div class="bg-green-50 p-4 rounded">
                <h4 class="font-semibold mb-3">✨ Features</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="flex items-center">
                            <input type="checkbox" id="hostingIncluded" ${p.hostingIncluded ? 'checked' : ''}
                                   class="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500">
                            <span class="text-sm font-medium">Hosting inclusief</span>
                        </label>
                    </div>
                    <div>
                        <label class="flex items-center">
                            <input type="checkbox" id="prioritySupport" ${p.prioritySupport ? 'checked' : ''}
                                   class="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500">
                            <span class="text-sm font-medium">Priority support</span>
                        </label>
                    </div>
                </div>
                <div class="mt-3">
                    <label class="block text-sm font-medium mb-2">Reactietijd (uren)<span class="text-red-600 ml-1">*</span></label>
                    <input type="number" id="responseTimeHours" value="${p.responseTimeHours || 24}" required
                           placeholder="24"
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Status</label>
                    <select id="active" class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                        <option value="true" ${!plan || p.active ? 'selected' : ''}>Actief</option>
                        <option value="false" ${p.active === false ? 'selected' : ''}>Inactief</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">
                        Volgorde 
                        <span class="text-xs text-gray-600">(voor sortering)</span>
                    </label>
                    <input type="number" id="displayOrder" value="${displayOrder}" required
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                </div>
            </div>
        </div>
    `;
}

function getPlanData() {
    const planIdField = document.getElementById('planId');

    const data = {
        name: document.getElementById('name').value.trim(),
        description: document.getElementById('description').value.trim(),
        monthlyPrice: parseFloat(document.getElementById('monthlyPrice').value),
        quarterlyDiscount: parseFloat(document.getElementById('quarterlyDiscount').value) || 0,
        halfyearlyDiscount: parseFloat(document.getElementById('halfyearlyDiscount').value) || 0,
        yearlyDiscount: parseFloat(document.getElementById('yearlyDiscount').value) || 0,
        includedHours: parseInt(document.getElementById('includedHours').value),
        hostingIncluded: document.getElementById('hostingIncluded').checked,
        prioritySupport: document.getElementById('prioritySupport').checked,
        responseTimeHours: parseInt(document.getElementById('responseTimeHours').value),
        active: document.getElementById('active').value === 'true',
        displayOrder: parseInt(document.getElementById('displayOrder').value)
    };

    // Only include planId if editing existing plan (not creating new)
    if (planIdField && planIdField.value) {
        data.planId = planIdField.value.trim();
    }

    return data;
}

// Validate maintenance plan form data
function validatePlanData(data) {
    const errors = [];

    // Clear previous error states
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.remove());

    // Validate name
    if (!data.name || data.name.length === 0) {
        errors.push({ field: 'name', message: 'Plan naam is verplicht' });
    }

    // Validate monthly price
    if (isNaN(data.monthlyPrice) || data.monthlyPrice < 0) {
        errors.push({ field: 'monthlyPrice', message: 'Maandprijs moet een positief getal zijn' });
    }

    // Validate included hours
    if (isNaN(data.includedHours) || data.includedHours < 0) {
        errors.push({ field: 'includedHours', message: 'Inclusief uren moet een positief getal zijn' });
    }

    // Validate response time hours
    if (isNaN(data.responseTimeHours) || data.responseTimeHours < 0) {
        errors.push({ field: 'responseTimeHours', message: 'Reactietijd moet een positief getal zijn' });
    }

    // Display field-specific errors
    errors.forEach(error => {
        const field = document.getElementById(error.field);
        if (field) {
            field.classList.add('error');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error.message}`;
            field.parentElement.appendChild(errorMsg);
        }
    });

    return errors;
}

function showCreatePlan() {
    getAll('maintenance-plans').then(plans => {
        createModal('Nieuw Onderhoudsplan', getPlanForm(null, plans || []), async () => {
            const data = getPlanData();

            // Validate form data
            const errors = validatePlanData(data);
            if (errors.length > 0) {
                const errorMessages = errors.map(e => e.message).join('\n');
                throw new Error(`Validatie fouten:\n${errorMessages}`);
            }

            await create('maintenance-plans', data);
            showToast('Onderhoudsplan aangemaakt', 'success');
            loadMaintenancePlans();
        });
    }).catch(error => {
        showToast('Fout bij laden plannen: ' + error.message, 'error');
    });
}

async function showEditPlan(id) {
    try {
        const [plan, allPlans] = await Promise.all([
            getById('maintenance-plans', id),
            getAll('maintenance-plans')
        ]);

        createModal('Plan Bewerken', getPlanForm(plan, allPlans), async () => {
            const data = getPlanData();

            // Validate form data
            const errors = validatePlanData(data);
            if (errors.length > 0) {
                const errorMessages = errors.map(e => e.message).join('\n');
                throw new Error(`Validatie fouten:\n${errorMessages}`);
            }

            await update('maintenance-plans', id, data);
            showToast('Plan bijgewerkt', 'success');
            loadMaintenancePlans();
        });
    } catch (error) {
        showToast('Fout bij laden plan: ' + error.message, 'error');
    }
}

async function deletePlan(id) {
    if (!confirm('Weet je zeker dat je dit plan wilt verwijderen?')) return;
    
    try {
        await remove('maintenance-plans', id);
        showToast('Plan verwijderd', 'success');
        loadMaintenancePlans();
    } catch (error) {
        showToast(error.message, 'error');
    }
}
