// Subscriptions management
let globalPlansData = []; // Global variable to store plan data for billing calculations

async function loadSubscriptions() {
    try {
        const [subscriptions, customers, plans, allInvoices] = await Promise.all([
            getAll('subscriptions'),
            getAll('customers'),
            getAll('maintenance-plans'),
            getAll('invoices')
        ]);

        // Create customer lookup map
        const customerMap = {};
        if (customers && customers.length > 0) {
            customers.forEach(c => {
                customerMap[c.customerId] = c.business?.displayName || c.business?.name || c.customerId;
            });
        }

        // Create plan lookup map  
        const planMap = {};
        if (plans && plans.length > 0) {
            plans.forEach(plan => {
                planMap[plan.planId] = plan;
            });
        }

        // Aantal gekoppelde facturen per abonnement
        const invoiceCountMap = {};
        (allInvoices || []).forEach(inv => {
            if (inv.invoiceSource === 'subscription' && inv.subscriptionId) {
                invoiceCountMap[inv.subscriptionId] = (invoiceCountMap[inv.subscriptionId] || 0) + 1;
            }
        });

        let html = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Abonnementen</h2>
                <button onclick="showCreateSubscription()" 
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                    <i class="fas fa-plus"></i> Nieuw
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
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nummer</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klant</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prijs</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequentie</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facturatie</th>
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

                const linkedCount = invoiceCountMap[sub.id] || 0;
                const paymentStatusClass =
                    sub.paymentStatus === 'invoiced' ? 'bg-green-100 text-green-800' :
                    sub.paymentStatus === 'upcoming' ? 'bg-orange-100 text-orange-800' :
                    linkedCount > 0 ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800';
                const paymentStatusLabel =
                    sub.paymentStatus === 'invoiced' ? 'Gefactureerd' :
                    sub.paymentStatus === 'upcoming' ? 'Binnenkort te factureren' :
                    linkedCount > 0 ? 'Nieuwe periode' :
                    'Openstaand';

                const customerName = customerMap[sub.customerId] || sub.customerId;

                const billingFrequency = sub.billingFrequency || 'monthly';
                const billingFrequencyText = {
                    'monthly': 'Maandelijks',
                    'quarterly': 'Kwartaal',
                    'halfyearly': 'Halfjaarlijks', 
                    'yearly': 'Jaarlijks'
                }[billingFrequency] || 'Maandelijks';

                // Get discount from the plan, not from subscription
                const plan = planMap[sub.planId];
                const discounts = plan ? {
                    quarterly: plan.quarterlyDiscount || 0,
                    halfyearly: plan.halfyearlyDiscount || 0,
                    yearly: plan.yearlyDiscount || 0
                } : { quarterly: 0, halfyearly: 0, yearly: 0 };

                const billingAmount = getBillingAmount(sub.monthlyPrice, billingFrequency, discounts);

                const termsSummary = calcTermsSummary(sub, linkedCount);
                let facturatieHtml;
                if (termsSummary && termsSummary.expectedDue > 0) {
                    if (termsSummary.open > 0) {
                        let parts = '';
                        if (termsSummary.pastOpen > 0) {
                            parts += `<div class="flex items-center gap-1.5 mb-0.5"><i class="fas fa-exclamation-triangle text-red-500 text-xs"></i><span class="text-xs font-semibold text-red-700">${termsSummary.pastOpen} niet gefactureerd</span></div>`;
                        }
                        if (termsSummary.currentOpen > 0) {
                            parts += `<div class="flex items-center gap-1.5 mb-0.5"><i class="fas fa-clock text-orange-500 text-xs"></i><span class="text-xs font-semibold text-orange-600">1 lopende termijn</span></div>`;
                        }
                        facturatieHtml = parts + `<div class="text-xs text-gray-500">${termsSummary.invoiced}/${termsSummary.expectedDue} termijnen</div>`;
                    } else {
                        facturatieHtml = `<div class="flex items-center gap-1.5 mb-0.5"><i class="fas fa-check-circle text-green-500 text-xs"></i><span class="text-xs font-semibold text-green-700">Alles gefactureerd</span></div><div class="text-xs text-gray-500">${termsSummary.invoiced}/${termsSummary.expectedDue} termijnen</div>`;
                    }
                } else {
                    facturatieHtml = '<span class="text-xs text-gray-400">—</span>';
                }
                if (sub.nextInvoiceDate) {
                    facturatieHtml += `<div class="text-xs text-gray-400 mt-0.5">Volgende: ${formatDate(sub.nextInvoiceDate)}</div>`;
                }

                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span class="font-mono font-medium text-blue-600 hover:text-blue-900 hover:underline cursor-pointer"
                                  onclick="showEditSubscription('${sub.id}')">${sub.subscriptionNumber || '—'}</span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <div class="font-medium">${customerName}</div>
                            <div class="text-xs text-gray-500">Start: ${formatDate(sub.startDate)}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <div class="font-medium">${sub.planName || 'N/A'}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <div>${formatCurrency(billingAmount)}</div>
                            <div class="text-xs text-gray-500">
                                ${formatCurrency(sub.monthlyPrice)}/mnd
                                ${(() => {
                                    const plan = planMap[sub.planId];
                                    const currentDiscount = billingFrequency === 'quarterly' ? (plan?.quarterlyDiscount || 0) :
                                                          billingFrequency === 'halfyearly' ? (plan?.halfyearlyDiscount || 0) :
                                                          billingFrequency === 'yearly' ? (plan?.yearlyDiscount || 0) : 0;
                                    return currentDiscount > 0 ? `<span class="text-orange-600 font-medium ml-1">-${currentDiscount}%</span>` : '';
                                })()}
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${billingFrequencyText}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            ${facturatieHtml}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span class="px-2 py-1 text-xs font-semibold rounded ${statusClass}">
                                ${sub.status || 'N/A'}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            ${(() => {
                                const alreadyInvoiced = sub.paymentStatus === 'invoiced';
                                return alreadyInvoiced
                                    ? `<button disabled class="text-gray-300 mr-3 cursor-not-allowed" title="Al gefactureerd tot ${formatDate(sub.nextInvoiceDate)}">
                                           <i class="fas fa-file-invoice"></i>
                                       </button>`
                                    : `<button onclick="showGenerateInvoiceFromSubscription('${sub.id}')"
                                               class="text-purple-600 hover:text-purple-900 mr-3" title="Factuur Genereren">
                                           <i class="fas fa-file-invoice"></i>
                                       </button>`;
                            })()}
                            <button onclick="showEditSubscription('${sub.id}')" 
                                    class="text-blue-600 hover:text-blue-900 mr-3" title="Abonnement Bewerken">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteSubscription('${sub.id}')" 
                                    class="text-red-600 hover:text-red-900" title="Abonnement Verwijderen">
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

function getSubscriptionForm(subscription = null, allSubscriptions = [], customers = [], plans = [], linkedInvoices = []) {
    const sub = subscription || {};

    // For new subscriptions, let backend auto-generate the ID
    const subscriptionId = subscription ? sub.subscriptionId : '';

    // Default dates
    const startDate = subscription ? (sub.startDate ? toLocalDateStr(new Date(sub.startDate)) : '') : getTodayDate();
    const endDate = subscription ? (sub.endDate ? toLocalDateStr(new Date(sub.endDate)) : '') : '';

    const isReadonly = subscription ? 'readonly' : 'readonly';
    const bgColor = subscription ? 'bg-gray-100' : 'bg-blue-50';

    // Create customer dropdown
    let customerOptions = '<option value="">Selecteer een klant...</option>';
    if (customers && customers.length > 0) {
        customers.forEach(customer => {
            const selected = sub.customerId === customer.customerId ? 'selected' : '';
            const displayName = customer.business?.displayName || customer.business?.name || customer.customerId;
            customerOptions += `<option value="${customer.customerId}" ${selected}>${displayName}</option>`;
        });
    }

    // Create plan dropdown
    let planOptions = '<option value="">Selecteer een plan...</option>';
    if (plans && plans.length > 0) {
        const activePlans = plans.filter(p => p.active);
        activePlans.forEach(plan => {
            const selected = sub.planId === plan.planId ? 'selected' : '';
            planOptions += `<option value="${plan.planId}" 
                data-name="${plan.name}"
                data-price="${plan.monthlyPrice}"
                data-quarterly-discount="${plan.quarterlyDiscount || 0}"
                data-halfyearly-discount="${plan.halfyearlyDiscount || 0}"
                data-yearly-discount="${plan.yearlyDiscount || 0}"
                ${selected}>${plan.name} - €${plan.monthlyPrice}/mnd</option>`;
        });
    }

    return `
        <div class="space-y-4">
            ${!subscription ? `
                <div>
                    <label class="block text-sm font-medium mb-2">Klant<span class="text-red-600 ml-1">*</span></label>
                    <select id="customerId" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                        ${customerOptions}
                    </select>
                </div>
            ` : `
                <!-- Hidden fields for existing subscription -->
                <input type="hidden" id="subscriptionId" value="${subscriptionId}">
                <input type="hidden" id="customerId" value="${sub.customerId || ''}">
                <div>
                    <label class="block text-sm font-medium mb-2">Abonnementsnummer</label>
                    <input type="text" value="${sub.subscriptionNumber || '—'}" readonly
                           class="w-full px-3 py-2 border rounded bg-gray-100 font-mono font-medium text-gray-700">
                </div>
            `}

            <div>
                <label class="block text-sm font-medium mb-2">Onderhoudsplan<span class="text-red-600 ml-1">*</span></label>
                <select id="planId" ${subscription ? 'disabled' : ''} required 
                        onchange="updateSubscriptionPlanFields()"
                        class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${subscription ? 'bg-gray-100' : ''}">
                    ${planOptions}
                </select>
                ${subscription ? '<input type="hidden" id="planIdHidden" value="' + sub.planId + '">' : ''}
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Startdatum<span class="text-red-600 ml-1">*</span></label>
                    <input type="date" id="startDate" 
                           value="${startDate}" required
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Einddatum</label>
                    <input type="date" id="endDate" 
                           value="${endDate}"
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                </div>
            </div>

            <div class="flex flex-col gap-2 bg-green-50 p-4 rounded">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Maandprijs (€)<span class="text-red-600 ml-1">*</span></label>
                        <input type="number" step="0.01" id="monthlyPrice" value="${sub.monthlyPrice || ''}" required
                            onchange="onMonthlyPriceChange()"
                            placeholder="Auto"
                            class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Factureringsfrequentie<span class="text-red-600 ml-1">*</span></label>
                        <select id="billingFrequency" required onchange="updateBillingAmount()" class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                            <option value="monthly" ${!sub.billingFrequency || sub.billingFrequency === 'monthly' ? 'selected' : ''}>Maandelijks</option>
                            <option value="quarterly" ${sub.billingFrequency === 'quarterly' ? 'selected' : ''}>Kwartaal</option>
                            <option value="halfyearly" ${sub.billingFrequency === 'halfyearly' ? 'selected' : ''}>Halfjaarlijks</option>
                            <option value="yearly" ${sub.billingFrequency === 'yearly' ? 'selected' : ''}>Jaarlijks</option>
                        </select>
                    </div>
                </div>
                <div id="billingAmountInfo" class="text-sm text-gray-600 bg-white p-2 rounded border">
                    <span id="billingAmountText">Factuurbedrag wordt berekend op basis van onderhoudsplan en frequentie</span>
                </div>
            </div>

            ${subscription && sub.paymentStatus ? `
                <div class="bg-blue-50 p-4 rounded">
                    <h4 class="font-semibold text-blue-900 mb-2">Factuurinformatie</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div class="text-gray-600">Factuurstatus</div>
                            <div class="font-medium">${getPaymentStatusText(sub.paymentStatus)}</div>
                        </div>
                        ${sub.nextInvoiceDate ? `
                            <div>
                                <div class="text-gray-600">Volgende factuurdatum</div>
                                <div class="font-medium">${formatDate(sub.nextInvoiceDate)}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Status<span class="text-red-600 ml-1">*</span></label>
                    <select id="status" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                        <option value="active" ${!sub.status || sub.status === 'active' ? 'selected' : ''}>Actief</option>
                        <option value="cancelled" ${sub.status === 'cancelled' ? 'selected' : ''}>Geannuleerd</option>
                        <option value="expired" ${sub.status === 'expired' ? 'selected' : ''}>Verlopen</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Plan naam</label>
                    <input type="text" id="planName" value="${sub.planName || ''}" 
                           readonly
                           class="w-full px-3 py-2 border rounded bg-gray-100">
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium mb-2">Notities</label>
                <textarea id="notes" rows="2" 
                          placeholder="Bijzonderheden of opmerkingen..."
                          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">${sub.notes || ''}</textarea>
            </div>

            ${subscription ? (() => {
                const subPlan = plans.find(p => p.planId === sub.planId);
                const subDiscounts = subPlan ? {
                    quarterly: subPlan.quarterlyDiscount || 0,
                    halfyearly: subPlan.halfyearlyDiscount || 0,
                    yearly: subPlan.yearlyDiscount || 0
                } : {};
                const terms = calcExpectedTerms(sub, linkedInvoices, subDiscounts);
                return `
                    <div class="border border-gray-200 rounded-lg overflow-hidden">
                        <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
                            <h4 class="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                <i class="fas fa-tasks text-purple-600"></i>
                                Termijnen overzicht
                            </h4>
                        </div>
                        <div class="p-3">
                            ${buildTermsOverviewHtml(terms, subscription.id)}
                        </div>
                    </div>`;
            })() : ''}
        </div>

            `;
}

// Global function to update subscription plan fields when plan is selected
function updateSubscriptionPlanFields() {
    const planSelect = document.getElementById('planId');
    if (!planSelect) return;

    const selectedOption = planSelect.options[planSelect.selectedIndex];

    if (selectedOption.value) {
        document.getElementById('planName').value = selectedOption.getAttribute('data-name') || '';
        document.getElementById('monthlyPrice').value = selectedOption.getAttribute('data-price') || '';

        // Update billing amount display
        updateBillingAmount();
    } else {
        document.getElementById('planName').value = '';
        document.getElementById('monthlyPrice').value = '';
        updateBillingAmount();
    }
}

// Update billing amount display based on frequency
function onMonthlyPriceChange() {
    const monthlyPriceField = document.getElementById('monthlyPrice');
    if (!monthlyPriceField) return;

    if (!monthlyPriceField.value) {
        const planIdField = document.getElementById('planId');
        const planIdHiddenField = document.getElementById('planIdHidden');

        if (planIdField && planIdField.selectedIndex >= 0 && planIdField.value) {
            monthlyPriceField.value = planIdField.options[planIdField.selectedIndex].getAttribute('data-price') || '';
        } else if (planIdHiddenField && globalPlansData) {
            const plan = globalPlansData.find(p => p.planId === planIdHiddenField.value);
            if (plan) monthlyPriceField.value = plan.monthlyPrice || '';
        }
    }

    updateBillingAmount();
}

function updateBillingAmount() {
    const monthlyPriceField = document.getElementById('monthlyPrice');
    const billingFrequencyField = document.getElementById('billingFrequency');
    const billingAmountText = document.getElementById('billingAmountText');

    if (!monthlyPriceField || !billingFrequencyField || !billingAmountText) return;

    const monthlyPrice = parseFloat(monthlyPriceField.value) || 0;
    const frequency = billingFrequencyField.value;

    // Get current plan ID
    let currentPlanId = '';
    const planIdField = document.getElementById('planId');
    const planIdHiddenField = document.getElementById('planIdHidden');

    if (planIdField && planIdField.value) {
        currentPlanId = planIdField.value;
    } else if (planIdHiddenField && planIdHiddenField.value) {
        currentPlanId = planIdHiddenField.value;
    }

    // Get discount values from the global plans data
    let discounts = { quarterly: 0, halfyearly: 0, yearly: 0 };

    if (currentPlanId && globalPlansData && globalPlansData.length > 0) {
        const plan = globalPlansData.find(p => p.planId === currentPlanId);
        if (plan) {
            discounts = {
                quarterly: plan.quarterlyDiscount || 0,
                halfyearly: plan.halfyearlyDiscount || 0,
                yearly: plan.yearlyDiscount || 0
            };
        }
    } else if (planIdField && planIdField.options && planIdField.selectedIndex >= 0) {
        // Fallback to data attributes for new subscriptions
        const selectedOption = planIdField.options[planIdField.selectedIndex];
        discounts = {
            quarterly: parseFloat(selectedOption.getAttribute('data-quarterly-discount')) || 0,
            halfyearly: parseFloat(selectedOption.getAttribute('data-halfyearly-discount')) || 0,
            yearly: parseFloat(selectedOption.getAttribute('data-yearly-discount')) || 0
        };
    }

    if (monthlyPrice > 0) {
        const baseAmount = monthlyPrice * ({
            'monthly': 1,
            'quarterly': 3,
            'halfyearly': 6,
            'yearly': 12
        }[frequency] || 1);

        const billingAmount = getBillingAmount(monthlyPrice, frequency, discounts);
        const discountAmount = getBillingDiscountAmount(monthlyPrice, frequency, discounts);

        const frequencyText = {
            'monthly': 'maand',
            'quarterly': 'kwartaal',
            'halfyearly': 'half jaar',
            'yearly': 'jaar'
        }[frequency] || 'maand';

        let displayText = `<i class="fas fa-calculator text-green-600"></i> Factuurbedrag: <strong>${formatCurrency(billingAmount)}</strong> per ${frequencyText}`;

        // Show discount information if applicable
        if (discountAmount > 0) {
            const discountPercentage = discounts[frequency] || 0;
            displayText += `<br><small class="text-orange-600"><i class="fas fa-tag"></i> ${discountPercentage}% plankorting: -${formatCurrency(discountAmount)} (van ${formatCurrency(baseAmount)})</small>`;
        }

        billingAmountText.innerHTML = displayText;
    } else {
        billingAmountText.innerHTML = '<i class="fas fa-info-circle text-gray-500"></i> Factuurbedrag wordt berekend op basis van onderhoudsplan en frequentie';
    }
}

function getSubscriptionData() {
    const endDate = document.getElementById('endDate').value;

    // For edit mode, use hidden planId field if present, otherwise use the select value
    const planIdElement = document.getElementById('planIdHidden') || document.getElementById('planId');
    const planId = planIdElement ? planIdElement.value : null;

    const subscriptionIdField = document.getElementById('subscriptionId');

    const data = {
        customerId: document.getElementById('customerId').value.trim(),
        planId: planId,
        planName: document.getElementById('planName').value.trim(),
        startDate: document.getElementById('startDate').value,
        endDate: endDate || null,
        monthlyPrice: parseFloat(document.getElementById('monthlyPrice').value),
        billingFrequency: document.getElementById('billingFrequency').value,
        status: document.getElementById('status').value,
        notes: document.getElementById('notes').value.trim() || null
    };

    // Only include subscriptionId if editing existing subscription (not creating new)
    if (subscriptionIdField && subscriptionIdField.value && subscriptionIdField.type !== 'hidden') {
        data.subscriptionId = subscriptionIdField.value.trim();
    }
    // For new subscriptions, let the backend auto-generate the subscriptionId

    return data;
}

// Validate subscription form data
function validateSubscriptionData(data) {
    const errors = [];

    // Clear previous error states
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.remove());

    // Validate customer
    if (!data.customerId || data.customerId.length === 0) {
        errors.push({ field: 'customerId', message: 'Selecteer een klant' });
    }

    // Validate plan
    if (!data.planId || data.planId.length === 0) {
        errors.push({ field: 'planId', message: 'Selecteer een onderhoudsplan' });
    }

    // Validate start date
    if (!data.startDate || data.startDate.length === 0) {
        errors.push({ field: 'startDate', message: 'Startdatum is verplicht' });
    }

    // Validate end date is after start date (if provided)
    if (data.startDate && data.endDate) {
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        if (endDate < startDate) {
            errors.push({ field: 'endDate', message: 'Einddatum moet na startdatum zijn' });
        }
    }

    // Validate monthly price
    if (isNaN(data.monthlyPrice) || data.monthlyPrice < 0) {
        errors.push({ field: 'monthlyPrice', message: 'Maandprijs moet een positief getal zijn' });
    }

    // Validate status
    if (!data.status || data.status.length === 0) {
        errors.push({ field: 'status', message: 'Status is verplicht' });
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

function showCreateSubscription() {
    // Fetch subscriptions, customers, and plans in parallel
    Promise.all([
        getAll('subscriptions'),
        getAll('customers'),
        getAll('maintenance-plans')
    ]).then(([subscriptions, customers, plans]) => {
        // Store plans globally for billing calculations
        globalPlansData = plans || [];

        createModal('Nieuw Abonnement', getSubscriptionForm(null, subscriptions || [], customers || [], plans || []), async () => {
            const data = getSubscriptionData();

            // Validate form data
            const errors = validateSubscriptionData(data);
            if (errors.length > 0) {
                const errorMessages = errors.map(e => e.message).join('\n');
                throw new Error(`Validatie fouten:\n${errorMessages}`);
            }

            await create('subscriptions', data);
            showToast('Abonnement aangemaakt', 'success');
            loadSubscriptions();
        });

        // Update billing amount display after modal is rendered
        setTimeout(() => {
            updateBillingAmount();
        }, 100);
    }).catch(error => {
        showToast('Kan gegevens niet laden: ' + error.message, 'error');
    });
}

async function showEditSubscription(id) {
    try {
        const [subscription, allSubscriptions, customers, plans, allInvoices] = await Promise.all([
            getById('subscriptions', id),
            getAll('subscriptions'),
            getAll('customers'),
            getAll('maintenance-plans'),
            getAll('invoices')
        ]);

        // Store plans globally for billing calculations
        globalPlansData = plans || [];

        // Filter facturen die aan dit abonnement zijn gekoppeld
        const linkedInvoices = (allInvoices || [])
            .filter(inv => inv.invoiceSource === 'subscription' && inv.subscriptionId === id)
            .sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || ''));

        createModal('Abonnement Bewerken', getSubscriptionForm(subscription, allSubscriptions, customers, plans, linkedInvoices), async () => {
            const data = getSubscriptionData();

            // Validate form data
            const errors = validateSubscriptionData(data);
            if (errors.length > 0) {
                const errorMessages = errors.map(e => e.message).join('\n');
                throw new Error(`Validatie fouten:\n${errorMessages}`);
            }

            await update('subscriptions', id, data);
            showToast('Abonnement bijgewerkt', 'success');
            loadSubscriptions();
        });

        // Update billing amount display after modal is rendered
        setTimeout(() => {
            updateBillingAmount();
        }, 100);
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
        const message = error.message.replace(/^HTTP \d+:\s*/, '').replace(/^"|"$/g, '');
        showToast(message || error.message, 'error');
    }
}

// Show subscription details
async function showSubscriptionDetails(id) {
    try {
        const subscription = await getById('subscriptions', id);

        let html = `
            <div class="space-y-4">
                <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                    <h3 class="text-2xl font-bold mb-2">${subscription.planName}</h3>
                    <p class="text-blue-100">Abonnement voor ${subscription.customerId}</p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-green-50 p-4 rounded-lg">
                        <div class="text-sm text-gray-600 mb-1">Maandprijs</div>
                        <div class="text-2xl font-bold text-green-600">${formatCurrency(subscription.monthlyPrice)}</div>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <div class="text-sm text-gray-600 mb-1">Status</div>
                        <div class="text-2xl font-bold text-blue-600 capitalize">${subscription.status}</div>
                    </div>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-lg font-semibold mb-2">Details</h4>
                    <div class="space-y-2 text-sm">
                        <div><strong>Startdatum:</strong> ${formatDate(subscription.startDate)}</div>
                        ${subscription.endDate ? `<div><strong>Einddatum:</strong> ${formatDate(subscription.endDate)}</div>` : ''}
                        ${subscription.notes ? `<div><strong>Notities:</strong> ${subscription.notes}</div>` : ''}
                    </div>
                </div>
            </div>
        `;

        createModal('Abonnement Details', html, null, "Opslaan", 'lg');
    } catch (error) {
        showToast('Fout bij laden details: ' + error.message, 'error');
    }
}

// Add time entry for subscription
function showAddTimeEntry(subscriptionId) {
    // This will be implemented in time-entries.js
    // For now, show a message
    showToast('Time entry functionaliteit wordt geladen...', 'info');
    // Close current modal and open time entry modal
    closeModal();
    setTimeout(() => {
        if (typeof showCreateTimeEntryForSubscription === 'function') {
            showCreateTimeEntryForSubscription(subscriptionId);
        } else {
            showToast('Time entries module niet geladen', 'error');
        }
    }, 300);
}

// Helper functions for billing
function getBillingAmount(monthlyPrice, frequency, discounts = {}) {
    const multiplier = {
        'monthly': 1,
        'quarterly': 3,
        'halfyearly': 6,
        'yearly': 12
    };

    const baseAmount = monthlyPrice * (multiplier[frequency] || 1);

    // Apply frequency discount
    const discount = frequency === 'quarterly' ? (discounts.quarterly || 0) :
                    frequency === 'halfyearly' ? (discounts.halfyearly || 0) :
                    frequency === 'yearly' ? (discounts.yearly || 0) : 0;

    return baseAmount * (1 - discount / 100);
}

function getBillingDiscountAmount(monthlyPrice, frequency, discounts = {}) {
    const multiplier = {
        'monthly': 1,
        'quarterly': 3,
        'halfyearly': 6,
        'yearly': 12
    };

    const baseAmount = monthlyPrice * (multiplier[frequency] || 1);

    // Calculate discount amount
    const discount = frequency === 'quarterly' ? (discounts.quarterly || 0) :
                    frequency === 'halfyearly' ? (discounts.halfyearly || 0) :
                    frequency === 'yearly' ? (discounts.yearly || 0) : 0;

    return baseAmount * (discount / 100);
}

function getPaymentStatusText(status) {
    const statusTexts = {
        'invoiced': 'Gefactureerd',
        'upcoming': 'Binnenkort te factureren',
        'open': 'Openstaand'
    };
    return statusTexts[status] || 'Onbekend';
}

// Berekent alle verwachte factureringstermijnen voor een abonnement en matcht bestaande facturen
function calcExpectedTerms(sub, linkedInvoices, discounts) {
    if (!sub || !sub.startDate) return [];
    const freq = sub.billingFrequency || 'monthly';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endLimit = sub.endDate ? new Date(sub.endDate) : null;

    function addPeriod(date) {
        const d = new Date(date);
        switch (freq) {
            case 'quarterly':  d.setMonth(d.getMonth() + 3); break;
            case 'halfyearly': d.setMonth(d.getMonth() + 6); break;
            case 'yearly':     d.setFullYear(d.getFullYear() + 1); break;
            default:           d.setMonth(d.getMonth() + 1); break;
        }
        return d;
    }

    // Sorteer oplopend: oudste factuur = termijn 1
    const sortedInvoices = [...(linkedInvoices || [])].sort((a, b) =>
        (a.invoiceDate || '').localeCompare(b.invoiceDate || ''));

    const terms = [];
    let periodStart = new Date(sub.startDate);
    periodStart.setHours(0, 0, 0, 0);
    let invoiceIndex = 0;
    let addedFuture = false;
    const expectedAmount = getBillingAmount(sub.monthlyPrice || 0, freq, discounts || {});

    while (terms.length < 120) {
        const nextStart = addPeriod(periodStart);
        const periodEnd = new Date(nextStart);
        periodEnd.setDate(periodEnd.getDate() - 1);

        if (endLimit && periodStart > endLimit) break;

        const isPast    = nextStart <= today;
        const isCurrent = periodStart <= today && nextStart > today;
        const isFuture  = periodStart > today;

        if (isFuture) {
            if (addedFuture) break;
            addedFuture = true;
        }

        const invoice = invoiceIndex < sortedInvoices.length ? sortedInvoices[invoiceIndex] : null;
        if (invoice) invoiceIndex++;

        let status;
        if (invoice)        { status = 'invoiced'; }
        else if (isPast)    { status = 'open'; }
        else if (isCurrent) { status = 'current'; }
        else                { status = 'future'; }

        terms.push({ termNumber: terms.length + 1, periodStart, periodEnd, expectedAmount, invoice, status });
        periodStart = nextStart;
    }
    return terms;
}

// Bouwt de HTML-tabel voor het termijnen overzicht
// prefillMode = true: knop vult de open datumvelden in de huidige modal in (gebruik vanuit de factuur-genereermodal)
// prefillMode = false: knop sluit de huidige modal en opent de factuur-genereermodal opnieuw (gebruik vanuit abonnement bewerken)
function buildTermsOverviewHtml(terms, subscriptionId = null, prefillMode = false) {
    if (!terms || terms.length === 0) {
        return '<div class="text-center py-3 text-gray-400 text-sm italic">Geen termijnen berekend</div>';
    }
    const invoicedCount = terms.filter(t => t.status === 'invoiced').length;
    const openCount     = terms.filter(t => t.status === 'open').length;
    const currentCount  = terms.filter(t => t.status === 'current').length;
    const relevantCount = terms.filter(t => t.status !== 'future').length;

    let summaryClass, summaryIcon, summaryText;
    if (openCount > 0) {
        summaryClass = 'bg-red-100 text-red-800 border border-red-300';
        summaryIcon  = 'exclamation-triangle';
        summaryText  = `${openCount} verstreken termijn${openCount > 1 ? 'en' : ''} niet gefactureerd!`;
    } else if (currentCount > 0) {
        summaryClass = 'bg-orange-100 text-orange-800 border border-orange-300';
        summaryIcon  = 'clock';
        summaryText  = 'Huidige periode nog niet gefactureerd';
    } else if (invoicedCount > 0) {
        summaryClass = 'bg-green-100 text-green-800 border border-green-300';
        summaryIcon  = 'check-circle';
        summaryText  = `Alle ${invoicedCount} termijn${invoicedCount !== 1 ? 'en' : ''} gefactureerd`;
    } else {
        summaryClass = 'bg-gray-100 text-gray-600 border border-gray-200';
        summaryIcon  = 'info-circle';
        summaryText  = 'Nog geen termijnen verschuldigd';
    }

    const rows = terms.map(term => {
        let statusBadge, rowClass;
        if (term.status === 'invoiced') {
            statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800"><i class="fas fa-check"></i> Gefactureerd</span>';
            rowClass = '';
        } else if (term.status === 'open') {
            statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-800"><i class="fas fa-exclamation-triangle"></i> Openstaand</span>';
            rowClass = 'bg-red-50';
        } else if (term.status === 'current') {
            statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-800"><i class="fas fa-clock"></i> Lopende periode</span>';
            rowClass = 'bg-orange-50';
        } else {
            statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-500"><i class="fas fa-calendar"></i> Toekomst</span>';
            rowClass = 'opacity-50';
        }

        const invoiceCell = term.invoice
            ? `<span class="text-blue-600 hover:underline cursor-pointer font-mono text-xs" onclick="closeAllModals(); setTimeout(() => showEditInvoice('${term.invoice.id}'), 300)">${term.invoice.invoiceNumber || 'N/A'}</span>`
            : '<span class="text-gray-400 text-xs">—</span>';

        const invoiceAmount = term.invoice
            ? formatCurrency(term.invoice.totalAmount)
            : `<span class="text-gray-400">${formatCurrency(term.expectedAmount)}</span>`;

        const periodStartStr = term.periodStart instanceof Date ? toLocalDateStr(term.periodStart) : '';
        const periodEndStr   = term.periodEnd   instanceof Date ? toLocalDateStr(term.periodEnd)   : '';
        let actionCell = '<td class="px-3 py-2 text-xs"></td>';
        if (subscriptionId && (term.status === 'open' || term.status === 'current')) {
            const onclickHandler = prefillMode
                ? `document.getElementById('genPeriodStart').value='${periodStartStr}'; document.getElementById('genPeriodEnd').value='${periodEndStr}';`
                : `closeAllModals(); setTimeout(() => showGenerateInvoiceFromSubscription('${subscriptionId}', '${periodStartStr}', '${periodEndStr}'), 300);`;
            actionCell = `<td class="px-3 py-2 text-xs">
                <button onclick="${onclickHandler}"
                        class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded text-purple-800 hover:text-purple-600 border-0 cursor-pointer">
                    <i class="fa-regular fa-calendar"></i> Gebruik periode
                </button>
            </td>`;
        } else if (subscriptionId) {
            actionCell = '<td class="px-3 py-2 text-xs"></td>';
        }

        return `<tr class="${rowClass}">
                <td class="px-3 py-2 text-xs font-medium text-gray-500 text-center w-8">${term.termNumber}</td>
                <td class="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">${formatDate(term.periodStart)} – ${formatDate(term.periodEnd)}</td>
                <td class="px-3 py-2 text-xs font-medium">${invoiceAmount}</td>
                <td class="px-3 py-2 text-xs">${invoiceCell}</td>
                <td class="px-3 py-2 text-xs">${statusBadge}</td>
                ${subscriptionId ? actionCell : ''}
            </tr>`;
    }).join('');

    return `<div class="flex items-center justify-between mb-2 px-1">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded ${summaryClass}">
                <i class="fas fa-${summaryIcon}"></i> ${summaryText}
            </span>
            ${relevantCount > 0 ? `<span class="text-xs text-gray-500">${invoicedCount} van ${relevantCount} gefactureerd</span>` : ''}
        </div>
        <div class="overflow-x-auto rounded border border-gray-200">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-8">#</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Periode</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bedrag</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Factuur</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        ${subscriptionId ? '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acties</th>' : ''}
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-100">${rows}</tbody>
            </table>
        </div>`;
}

// Berekent een snelle samenvatting voor de lijstweergave (hoeveel termijnen verwacht vs gefactureerd)
function calcTermsSummary(sub, invoicedCount) {
    if (!sub || !sub.startDate) return null;
    const freq = sub.billingFrequency || 'monthly';
    const start = new Date(sub.startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endLimit = sub.endDate ? new Date(sub.endDate) : null;

    function addPeriod(date) {
        const d = new Date(date);
        switch (freq) {
            case 'quarterly':  d.setMonth(d.getMonth() + 3); break;
            case 'halfyearly': d.setMonth(d.getMonth() + 6); break;
            case 'yearly':     d.setFullYear(d.getFullYear() + 1); break;
            default:           d.setMonth(d.getMonth() + 1); break;
        }
        return d;
    }

    let expectedDue = 0;
    let periodStart = new Date(start);
    let lastPeriodStart = null;
    while (periodStart <= today && expectedDue < 120) {
        if (endLimit && periodStart > endLimit) break;
        lastPeriodStart = new Date(periodStart);
        expectedDue++;
        periodStart = addPeriod(periodStart);
    }

    const hasCurrentPeriod = lastPeriodStart !== null && addPeriod(lastPeriodStart) > today;
    const invoiced = Math.min(invoicedCount, expectedDue);
    const open = expectedDue - invoiced;
    const currentOpen = (hasCurrentPeriod && open > 0) ? 1 : 0;
    const pastOpen = open - currentOpen;
    return { expectedDue, invoiced, open, pastOpen, currentOpen };
}

// Show subscription payments
async function showSubscriptionPayments(subscriptionId) {
    try {
        const [subscription, payments] = await Promise.all([
            getById('subscriptions', subscriptionId),
            apiRequest(`/subscriptions/${subscriptionId}/payments`)
        ]);

        let html = `
            <div class="space-y-4">
                <div class="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
                    <h3 class="text-xl font-bold mb-2">Betalingen voor ${subscription.planName}</h3>
                    <p class="text-green-100">Klant: ${subscription.customerId}</p>
                </div>

                <div class="flex justify-between items-center">
                    <h4 class="text-lg font-semibold">Betalingsgeschiedenis</h4>
                </div>
        `;

        if (!payments || payments.length === 0) {
            html += '<p class="text-gray-500 text-center py-8">Geen betalingen gevonden</p>';
        } else {
            html += '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
            html += `
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bedrag</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Methode</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periode</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referentie</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
            `;

            payments.forEach(payment => {
                html += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${formatDate(payment.paymentDate)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${formatCurrency(payment.amount)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${formatPaymentMethod(payment.method)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            ${payment.billingPeriodStart ? `${formatDate(payment.billingPeriodStart)} - ${formatDate(payment.billingPeriodEnd)}` : 'N/A'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${payment.reference || 'N/A'}</td>
                    </tr>
                `;
            });

            html += '</tbody></table></div>';
        }

        html += '</div>';

        createModal('Betalingen', html, null, "Opslaan", 'lg');
    } catch (error) {
        showToast('Fout bij laden betalingen: ' + error.message, 'error');
    }
}

// Show add payment form
async function showAddSubscriptionPayment(subscriptionId) {
    try {
        const [subscription, plans] = await Promise.all([
            getById('subscriptions', subscriptionId),
            getAll('maintenance-plans')
        ]);

        // Find the plan associated with this subscription
        const plan = plans?.find(p => p.planId === subscription.planId);
        const discounts = plan ? {
            quarterly: plan.quarterlyDiscount || 0,
            halfyearly: plan.halfyearlyDiscount || 0,
            yearly: plan.yearlyDiscount || 0
        } : { quarterly: 0, halfyearly: 0, yearly: 0 };

        const billingAmount = getBillingAmount(subscription.monthlyPrice, subscription.billingFrequency || 'monthly', discounts);

        // Calculate billing period
        const today = new Date();
        let periodStart = today;
        let periodEnd = new Date(today);

        switch (subscription.billingFrequency || 'monthly') {
            case 'quarterly':
                periodEnd.setMonth(periodEnd.getMonth() + 3);
                break;
            case 'halfyearly':
                periodEnd.setMonth(periodEnd.getMonth() + 6);
                break;
            case 'yearly':
                periodEnd.setFullYear(periodEnd.getFullYear() + 1);
                break;
            default: // monthly
                periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const html = `
            <form id="subscriptionPaymentForm" class="space-y-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-blue-900">Betalingsdetails voor ${subscription.planName}</h4>
                    <p class="text-blue-700 text-sm">Klant: ${subscription.customerId}</p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Betaaldatum *</label>
                        <input type="date" name="paymentDate" value="${toLocalDateStr(today)}" 
                               class="w-full border border-gray-300 rounded px-3 py-2" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Bedrag *</label>
                        <input type="number" name="amount" value="${billingAmount}" step="0.01" min="0" 
                               class="w-full border border-gray-300 rounded px-3 py-2" required>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Betalingsmethode *</label>
                        <select name="method" class="w-full border border-gray-300 rounded px-3 py-2" required>
                            <option value="">Selecteer methode</option>
                            <option value="bank_transfer">Bankoverschrijving</option>
                            <option value="direct_debit">Automatische incasso</option>
                            <option value="cash">Contant</option>
                            <option value="card">Pinpas/Creditcard</option>
                            <option value="other">Overig</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Referentie</label>
                        <input type="text" name="reference" 
                               class="w-full border border-gray-300 rounded px-3 py-2">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Periode start</label>
                        <input type="date" name="billingPeriodStart" value="${toLocalDateStr(periodStart)}" 
                               class="w-full border border-gray-300 rounded px-3 py-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Periode eind</label>
                        <input type="date" name="billingPeriodEnd" value="${toLocalDateStr(periodEnd)}" 
                               class="w-full border border-gray-300 rounded px-3 py-2">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Opmerkingen</label>
                    <textarea name="notes" rows="3" 
                              class="w-full border border-gray-300 rounded px-3 py-2"></textarea>
                </div>
            </form>
        `;

        createModal('Betaling Toevoegen', html, async () => {
            const form = document.getElementById('subscriptionPaymentForm');
            const formData = new FormData(form);

            const paymentData = {
                paymentDate: formData.get('paymentDate'),
                amount: parseFloat(formData.get('amount')),
                method: formData.get('method'),
                billingPeriodStart: formData.get('billingPeriodStart'),
                billingPeriodEnd: formData.get('billingPeriodEnd'),
                reference: formData.get('reference'),
                notes: formData.get('notes')
            };

            try {
                await apiRequest(`/subscriptions/${subscriptionId}/payments`, {
                    method: 'POST',
                    body: JSON.stringify(paymentData)
                });

                        showToast('Betaling toegevoegd', 'success');
                                loadSubscriptions();
                            } catch (error) {
                                showToast('Fout: ' + error.message, 'error');
                            }
                        }, "Annuleren");
                    } catch (error) {
                        showToast('Fout bij laden formulier: ' + error.message, 'error');
                    }
                }

                async function showGenerateInvoiceFromSubscription(subscriptionId, prefillStart = null, prefillEnd = null) {
                    const [subscription, allInvoices, allPlans] = await Promise.all([
                        getById('subscriptions', subscriptionId),
                        getAll('invoices'),
                        getAll('maintenance-plans')
                    ]);
                    const billingFrequency = subscription?.billingFrequency || 'monthly';

                    // Filter facturen die aan dit abonnement zijn gekoppeld (oplopend op datum = termijn 1 eerst)
                    const linkedInvoices = (allInvoices || [])
                        .filter(inv => inv.invoiceSource === 'subscription' && inv.subscriptionId === subscriptionId)
                        .sort((a, b) => (a.invoiceDate || '').localeCompare(b.invoiceDate || ''));

                    const genPlan = (allPlans || []).find(p => p.planId === subscription?.planId);
                    const genDiscounts = genPlan ? {
                        quarterly: genPlan.quarterlyDiscount || 0,
                        halfyearly: genPlan.halfyearlyDiscount || 0,
                        yearly: genPlan.yearlyDiscount || 0
                    } : {};
                    const genTerms = calcExpectedTerms(subscription, linkedInvoices, genDiscounts);
                    const termsOverviewHtml = buildTermsOverviewHtml(genTerms, subscriptionId, true);

                    function calcPeriodEnd(startDateStr, frequency) {
                        const d = new Date(startDateStr);
                        switch (frequency) {
                            case 'quarterly':  d.setMonth(d.getMonth() + 3); break;
                            case 'halfyearly': d.setMonth(d.getMonth() + 6); break;
                            case 'yearly':     d.setFullYear(d.getFullYear() + 1); break;
                            default:           d.setMonth(d.getMonth() + 1); break;
                        }
                        return toLocalDateStr(d);
                    }

                    const today = getTodayDate();

                    // Gebruik de lopende periode als standaard; val terug op de eerste openstaande termijn, dan vandaag
                    const defaultTerm = genTerms.find(t => t.status === 'current') || genTerms.find(t => t.status === 'open');
                    const defaultPeriodStart = defaultTerm ? toLocalDateStr(defaultTerm.periodStart) : today;
                    const defaultPeriodEnd   = defaultTerm ? toLocalDateStr(defaultTerm.periodEnd)   : calcPeriodEnd(today, billingFrequency);

                    const billingFrequencyText = {
                        monthly:    'Maandelijks',
                        quarterly:  'Kwartaal',
                        halfyearly: 'Halfjaarlijks',
                        yearly:     'Jaarlijks'
                    }[billingFrequency] || 'Maandelijks';

                    const formHtml = `
                        <div class="space-y-4">
                            <!-- Abonnementinformatie -->
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm">
                                <div>
                                    <p class="text-xs text-gray-500 mb-0.5">Plan</p>
                                    <p class="font-medium">${subscription?.planName || '—'}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-500 mb-0.5">Frequentie</p>
                                    <p class="font-medium">${billingFrequencyText}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-500 mb-0.5">Startdatum</p>
                                    <p class="font-medium">${formatDate(subscription?.startDate)}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-500 mb-0.5">Einddatum</p>
                                    <p class="font-medium">${subscription?.endDate ? formatDate(subscription.endDate) : '—'}</p>
                                </div>
                            </div>

                            <!-- Nieuwe factuur genereren -->
                            <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <p class="text-sm text-purple-800">
                                    <i class="fas fa-info-circle mr-2"></i>
                                    Er wordt een factuur aangemaakt met één regel voor de opgegeven facturatieperiode.
                                </p>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium mb-2">Periode van<span class="text-red-600 ml-1">*</span></label>
                                       <input type="date" id="genPeriodStart" value="${prefillStart || defaultPeriodStart}"
                                                   class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium mb-2">Periode tot<span class="text-red-600 ml-1">*</span></label>
                                            <input type="date" id="genPeriodEnd" value="${prefillEnd || defaultPeriodEnd}"
                                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500">
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium mb-2">Vervaldatum</label>
                                    <input type="date" id="genDueDate" value="${getDatePlusDays(14)}"
                                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500">
                                    <p class="text-xs text-gray-500 mt-1">Standaard: 14 dagen na startdatum</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-2">BTW %</label>
                                    <select id="genVatPercentage"
                                            class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500">
                                        <option value="0">0%</option>
                                        <option value="9">9%</option>
                                        <option value="21" selected>21%</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-2">Opmerkingen (optioneel)</label>
                                <textarea id="genNotes" rows="2"
                                          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                                          placeholder="Extra toelichting op de factuur..."></textarea>
                            </div>

                            <!-- Termijnen overzicht -->
                            <div class="border border-gray-200 rounded-lg overflow-hidden">
                                <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                    <h4 class="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                        <i class="fas fa-tasks text-purple-600"></i>
                                        Termijnen overzicht
                                    </h4>
                                </div>
                                <div class="p-3">
                                    ${termsOverviewHtml}
                                </div>
                            </div>
                        </div>
                    `;

                    const genModal = createModal('Factuur Genereren vanuit Abonnement', formHtml, async () => {
                        const periodStart    = document.getElementById('genPeriodStart').value;
                        const periodEnd      = document.getElementById('genPeriodEnd').value;
                        const dueDate        = document.getElementById('genDueDate').value;
                        const vatRaw         = parseFloat(document.getElementById('genVatPercentage').value);
                        const vatPercentage  = isNaN(vatRaw) ? 21 : vatRaw;
                        const notes          = document.getElementById('genNotes').value.trim();

                        if (!periodStart || !periodEnd) throw new Error('Facturatieperiode is verplicht');
                        if (new Date(periodEnd) < new Date(periodStart)) throw new Error('Einddatum moet na startdatum liggen');

                        const body = { billingPeriodStart: periodStart, billingPeriodEnd: periodEnd, vatPercentage };
                        if (dueDate) body.dueDate = dueDate;
                        if (notes)   body.notes   = notes;

                        const invoice = await apiRequest(`/subscriptions/${subscriptionId}/invoice`, {
                            method: 'POST',
                            body: JSON.stringify(body)
                        });

                        showToast(`Factuur ${invoice?.invoiceNumber || ''} aangemaakt`, 'success');
                        loadSubscriptions();
                    }, 'Factuur Genereren', 'lg');

                    genModal.querySelector('#genPeriodStart').addEventListener('change', function () {
                        genModal.querySelector('#genPeriodEnd').value = calcPeriodEnd(this.value, billingFrequency);
                    });
                }
