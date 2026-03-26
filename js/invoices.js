// Invoices management
async function loadInvoices() {
    try {
        const [invoices, customers] = await Promise.all([
            getAll('invoices'),
            getAll('customers')
        ]);

        let html = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Facturen</h2>
                <button onclick="showCreateInvoice()" 
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                    <i class="fas fa-plus"></i> Nieuwe Factuur
                </button>
            </div>
        `;

        if (!invoices || invoices.length === 0) {
            html += '<p class="text-gray-500 text-center py-8">Geen facturen gevonden</p>';
        } else {
            html += '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
            html += `
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nummer</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klant</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referentie</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vervaldatum</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bedrag</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
            `;

            invoices.forEach(invoice => {
                // Calculate paid amount from payments within the invoice
                const invoicePayments = invoice.payments || [];
                const paidAmount = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                const remainingAmount = invoice.totalAmount - paidAmount;
                const paymentPercentage = invoice.totalAmount > 0 ? (paidAmount / invoice.totalAmount * 100) : 0;

                // Determine status with payment calculation
                let actualStatus = invoice.status;
                if (paidAmount >= invoice.totalAmount) {
                    actualStatus = 'paid';
                } else if (paidAmount > 0) {
                    actualStatus = 'partially_paid';
                }

                const statusConfig = {
                    paid: { class: 'bg-green-100 text-green-800', label: 'Betaald', icon: 'check-circle' },
                    partially_paid: { class: 'bg-blue-100 text-blue-800', label: 'Gedeeltelijk', icon: 'clock' },
                    pending: { class: 'bg-yellow-100 text-yellow-800', label: 'Openstaand', icon: 'clock' },
                    overdue: { class: 'bg-red-100 text-red-800', label: 'Achterstallig', icon: 'exclamation-triangle' }
                };
                const status = statusConfig[actualStatus] || statusConfig.pending;

                const customer = customers?.find(c => c.customerId === invoice.customerId);
                const customerName = customer?.business?.displayName || customer?.business?.name || invoice.customerId || 'N/A';

                // Format items count for display
                const itemsCount = invoice.items?.length || 0;
                const itemsText = itemsCount > 0 ? `${itemsCount} regel${itemsCount > 1 ? 's' : ''}` : 'Geen regels';

                // Show "Register Payment" button for unpaid/partially paid invoices
                const paymentButton = actualStatus !== 'paid' ? `
                    <button onclick="showCreatePaymentForInvoice('${invoice.id}')" 
                            class="text-green-600 hover:text-green-900 mr-3" 
                            title="Registreer betaling">
                        <i class="fas fa-euro-sign"></i>
                    </button>
                ` : '';

                // Payment progress indicator
                const paymentInfo = actualStatus === 'partially_paid' ? `
                    <div class="text-xs text-gray-600 mt-1">
                        <div class="flex items-center gap-2">
                            <div class="w-20 bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-600 h-2 rounded-full" style="width: ${paymentPercentage}%"></div>
                            </div>
                            <span>${formatCurrency(paidAmount)} / ${formatCurrency(invoice.totalAmount)}</span>
                        </div>
                    </div>
                ` : '';

                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${invoice.invoiceNumber || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${customerName}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title="${invoice.reference || ''}">${invoice.reference || '-'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${formatDate(invoice.invoiceDate)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${formatDate(invoice.dueDate)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <div>${formatCurrency(invoice.totalAmount)}</div>
                            <div class="text-xs text-gray-500">${itemsText}</div>
                            ${paymentInfo}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span class="px-2 py-1 text-xs font-semibold rounded ${status.class}">
                                <i class="fas fa-${status.icon}"></i> ${status.label}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            ${paymentButton}
                            <button onclick="showEditInvoice('${invoice.id}')" 
                                    class="text-blue-600 hover:text-blue-900 mr-3">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteInvoice('${invoice.id}')" 
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

function getInvoiceForm(invoice = null, allInvoices = [], customers = []) {
    const inv = invoice || {};

    // Generate next invoice number if creating new
    const invoiceNumber = invoice ? inv.invoiceNumber : generateNextId(allInvoices, 'INV-', 4);

    // Default dates
    const invoiceDate = invoice ? (inv.invoiceDate ? inv.invoiceDate.split('T')[0] : '') : getTodayDate();
    const dueDate = invoice ? (inv.dueDate ? inv.dueDate.split('T')[0] : '') : getDatePlusDays(14);

    const isReadonly = invoice ? 'readonly' : 'readonly';
    const bgColor = invoice ? 'bg-gray-100' : 'bg-blue-50';

    // Generate customer dropdown options
    let customerOptions = '<option value="">-- Selecteer een klant --</option>';
    if (customers && customers.length > 0) {
        customers.forEach(customer => {
            const displayName = customer.business?.displayName || customer.business?.name || customer.customerId;
            const selected = inv.customerId === customer.customerId ? 'selected' : '';
            customerOptions += `<option value="${customer.customerId}" ${selected}>${displayName}</option>`;
        });
    }

    // Generate invoice items HTML
    const items = inv.items || [{ description: '', quantity: 1, unitPrice: 0, vatPercentage: 21 }];
    let itemsHtml = '';
    items.forEach((item, index) => {
        itemsHtml += getInvoiceItemRow(index, item);
    });

    return `
        <div class="space-y-6 max-h-[70vh] overflow-y-auto">
            <!-- Header Information -->
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 class="font-bold text-lg mb-3">Factuurgegevens</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">
                            Factuurnummer * 
                            ${!invoice ? '<span class="text-xs text-blue-600">(Automatisch)</span>' : ''}
                        </label>
                        <input type="text" id="invoiceNumber" value="${invoiceNumber}" 
                               ${isReadonly} required
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${bgColor}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Klant *</label>
                        <select id="customerId" required
                                class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                            ${customerOptions}
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-4 mt-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">
                            Factuurdatum * 
                            ${!invoice ? '<span class="text-xs text-gray-600">(Vandaag)</span>' : ''}
                        </label>
                        <input type="date" id="invoiceDate" 
                               value="${invoiceDate}" required
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">
                            Vervaldatum * 
                            ${!invoice ? '<span class="text-xs text-gray-600">(+14 dagen)</span>' : ''}
                        </label>
                        <input type="date" id="dueDate" 
                               value="${dueDate}" required
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Referentie</label>
                        <input type="text" id="reference" value="${inv.reference || ''}" 
                               placeholder="PO nummer, project code..." 
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
            </div>

            <!-- Invoice Items -->
            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-bold text-lg">Factuurregels</h3>
                    <button type="button" onclick="addInvoiceItem()" 
                            class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">
                        <i class="fas fa-plus"></i> Regel toevoegen
                    </button>
                </div>

                <div id="invoiceItems" class="space-y-3">
                    ${itemsHtml}
                </div>
            </div>

            <!-- Totals -->
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 class="font-bold text-lg mb-3">Totalen</h3>
                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span>Subtotaal (excl. BTW):</span>
                        <span id="subtotalDisplay" class="font-semibold">€ 0,00</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span>BTW bedrag:</span>
                        <span id="vatDisplay" class="font-semibold">€ 0,00</span>
                    </div>
                    <div class="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Totaal (incl. BTW):</span>
                        <span id="totalDisplay" class="text-blue-600">€ 0,00</span>
                    </div>
                </div>
            </div>

            <!-- Notes and Status -->
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Opmerkingen</label>
                    <textarea id="notes" rows="3" 
                              placeholder="Extra informatie voor op de factuur..."
                              class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">${inv.notes || ''}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Status *</label>
                    <select id="status" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                        <option value="pending" ${inv.status === 'pending' || !inv.status ? 'selected' : ''}>Openstaand</option>
                        <option value="partially_paid" ${inv.status === 'partially_paid' ? 'selected' : ''}>Gedeeltelijk Betaald</option>
                        <option value="paid" ${inv.status === 'paid' ? 'selected' : ''}>Betaald</option>
                        <option value="overdue" ${inv.status === 'overdue' ? 'selected' : ''}>Achterstallig</option>
                    </select>
                    <p class="text-xs text-gray-500 mt-1">Status wordt automatisch bijgewerkt bij betalingen</p>
                </div>
            </div>
        </div>
    `;
}

// Enhanced invoice form with payment history (for editing existing invoices)
function getInvoiceFormWithPayments(invoice, allInvoices, customers, payments, totalPaid, remainingAmount) {
    console.log('getInvoiceFormWithPayments called with:', {
        invoiceNumber: invoice.invoiceNumber,
        paymentsCount: payments?.length || 0,
        totalPaid,
        remainingAmount
    });

    // Get the base form
    const baseForm = getInvoiceForm(invoice, allInvoices, customers);

    // Build payment history section
    let paymentHistoryHtml = '';
    if (payments && payments.length > 0) {
        paymentHistoryHtml = payments.map(payment => `
            <div class="flex items-center justify-between p-3 bg-white rounded border hover:bg-gray-50">
                <div class="flex-1">
                    <p class="font-semibold text-sm">${payment.paymentId}</p>
                    <p class="text-xs text-gray-500">${formatDate(payment.date)}</p>
                </div>
                <div class="text-right mr-3">
                    <p class="font-bold text-green-600">${formatCurrency(payment.amount || 0)}</p>
                    <p class="text-xs text-gray-500">${payment.method || 'N/A'}</p>
                </div>
                <span class="badge-premium badge-success">
                    <i class="fas fa-check"></i>
                </span>
            </div>
        `).join('');
    } else {
        paymentHistoryHtml = `
            <div class="text-center py-6 text-gray-500">
                <i class="fas fa-inbox text-3xl mb-2 opacity-50"></i>
                <p class="text-sm">Nog geen betalingen geregistreerd</p>
            </div>
        `;
    }

    // Payment status indicator
    const paymentPercentage = invoice.totalAmount > 0 ? (totalPaid / invoice.totalAmount * 100) : 0;
    const statusColor = paymentPercentage >= 100 ? 'green' : paymentPercentage > 0 ? 'blue' : 'yellow';
    const statusBg = paymentPercentage >= 100 ? 'bg-green-50 border-green-200' : paymentPercentage > 0 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200';

    console.log('Payment section config:', {
        paymentPercentage,
        statusColor,
        statusBg,
        showButton: remainingAmount > 0
    });

    // Check if invoice is marked as paid (read-only for payment history)
    const isPaid = invoice.status === 'paid';

    const paymentSection = `
        <!-- Payment History Section -->
        <div id="paymentHistorySection" class="${statusBg} p-4 rounded-lg border mt-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-lg flex items-center">
                    <i class="fas fa-credit-card mr-2 text-${statusColor}-600"></i>
                    Betaalgeschiedenis
                    ${isPaid ? '<span class="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded"><i class="fas fa-lock"></i> Vergrendeld</span>' : ''}
                </h3>
                ${!isPaid && remainingAmount > 0 ? `
                    <button type="button" 
                            id="addPaymentBtn"
                            onclick="event.preventDefault(); showCreatePaymentForInvoice('${invoice.id}')" 
                            class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">
                        <i class="fas fa-plus"></i> Betaling Registreren
                    </button>
                ` : ''}
            </div>

            ${isPaid ? `
                <div class="bg-green-100 border border-green-300 rounded p-3 mb-4">
                    <p class="text-sm text-green-800">
                        <i class="fas fa-info-circle mr-2"></i>
                        <strong>Betaalgeschiedenis is vergrendeld</strong> - Deze factuur heeft de status "Betaald". 
                        Wijzig de status om betalingen toe te voegen of te bewerken.
                    </p>
                </div>
            ` : ''}

            <!-- Payment Summary -->
            <div class="grid grid-cols-3 gap-4 mb-4">
                <div class="bg-white p-3 rounded border">
                    <p class="text-xs text-gray-600 mb-1">Totaal Factuur</p>
                    <p class="text-xl font-bold text-gray-900">${formatCurrency(invoice.totalAmount || 0)}</p>
                </div>
                <div class="bg-white p-3 rounded border">
                    <p class="text-xs text-gray-600 mb-1">Betaald</p>
                    <p class="text-xl font-bold text-green-600">${formatCurrency(totalPaid)}</p>
                    ${payments && payments.length > 0 ? `<p class="text-xs text-gray-500 mt-1">${payments.length} betaling${payments.length > 1 ? 'en' : ''}</p>` : ''}
                </div>
                <div class="bg-white p-3 rounded border">
                    <p class="text-xs text-gray-600 mb-1">Openstaand</p>
                    <p class="text-xl font-bold text-${remainingAmount > 0 ? 'yellow' : 'green'}-600">${formatCurrency(remainingAmount)}</p>
                    ${paymentPercentage > 0 ? `
                        <div class="mt-2">
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-${statusColor}-600 h-2 rounded-full transition-all" style="width: ${Math.min(paymentPercentage, 100)}%"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Payment List -->
            <div class="space-y-2">
                <h4 class="font-semibold text-sm text-gray-700 mb-2">Geregistreerde betalingen:</h4>
                ${paymentHistoryHtml}
            </div>
        </div>
    `;

    // Insert payment section before the closing div of the base form
    // The base form ends with:         </div>\n    `; so we need to insert before that
    const lastDivIndex = baseForm.lastIndexOf('</div>');
    if (lastDivIndex === -1) {
        console.error('Could not find closing </div> in base form');
        return baseForm; // Return base form unchanged if we can't find the insertion point
    }

    console.log('Inserting payment section at position:', lastDivIndex);

    // Insert the payment section before the last </div>
    const result = baseForm.slice(0, lastDivIndex) + paymentSection + baseForm.slice(lastDivIndex);
    console.log('Payment section inserted successfully');
    return result;
}

// Generate a single invoice item row
function getInvoiceItemRow(index, item = {}) {
    const description = item.description || '';
    const quantity = item.quantity || 1;
    const unitPrice = item.unitPrice || 0;
    const vatPercentage = item.vatPercentage !== undefined ? item.vatPercentage : 21;

    return `
        <div class="invoice-item bg-white p-3 rounded border" data-index="${index}">
            <div class="grid grid-cols-12 gap-2 items-start">
                <div class="col-span-5">
                    <label class="block text-xs font-medium mb-1">Beschrijving *</label>
                    <input type="text" 
                           class="item-description w-full px-2 py-1 border rounded text-sm" 
                           value="${description}"
                           placeholder="Product of dienst..."
                           onchange="calculateInvoiceTotals()"
                           required>
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-medium mb-1">Aantal *</label>
                    <input type="number" 
                           class="item-quantity w-full px-2 py-1 border rounded text-sm" 
                           value="${quantity}"
                           min="1"
                           step="0.01"
                           onchange="calculateInvoiceTotals()"
                           required>
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-medium mb-1">Prijs *</label>
                    <input type="number" 
                           class="item-price w-full px-2 py-1 border rounded text-sm" 
                           value="${unitPrice}"
                           min="0"
                           step="0.01"
                           onchange="calculateInvoiceTotals()"
                           required>
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-medium mb-1">BTW %</label>
                    <select class="item-vat w-full px-2 py-1 border rounded text-sm"
                            onchange="calculateInvoiceTotals()">
                        <option value="0" ${vatPercentage === 0 ? 'selected' : ''}>0%</option>
                        <option value="9" ${vatPercentage === 9 ? 'selected' : ''}>9%</option>
                        <option value="21" ${vatPercentage === 21 ? 'selected' : ''}>21%</option>
                    </select>
                </div>
                <div class="col-span-1 flex items-end">
                    <button type="button" 
                            onclick="removeInvoiceItem(${index})"
                            class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm w-full"
                            title="Verwijder regel">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="text-xs text-gray-600 mt-1">
                Subtotaal: <span class="item-subtotal font-semibold">€ 0,00</span>
            </div>
        </div>
    `;
}

// Add new invoice item
function addInvoiceItem() {
    const container = document.getElementById('invoiceItems');
    const currentItems = container.querySelectorAll('.invoice-item');
    const newIndex = currentItems.length;

    const newItemHtml = getInvoiceItemRow(newIndex, { quantity: 1, unitPrice: 0, vatPercentage: 21 });
    container.insertAdjacentHTML('beforeend', newItemHtml);
    calculateInvoiceTotals();
}

// Remove invoice item
function removeInvoiceItem(index) {
    const items = document.querySelectorAll('.invoice-item');
    if (items.length <= 1) {
        showToast('Er moet minimaal 1 factuurregel zijn', 'error');
        return;
    }

    items[index].remove();

    // Re-index remaining items
    const remainingItems = document.querySelectorAll('.invoice-item');
    remainingItems.forEach((item, newIndex) => {
        item.dataset.index = newIndex;
        const removeBtn = item.querySelector('button[onclick^="removeInvoiceItem"]');
        if (removeBtn) {
            removeBtn.setAttribute('onclick', `removeInvoiceItem(${newIndex})`);
        }
    });

    calculateInvoiceTotals();
}

// Calculate invoice totals
function calculateInvoiceTotals() {
    const items = document.querySelectorAll('.invoice-item');
    let subtotal = 0;
    let vatTotal = 0;

    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
        const unitPrice = parseFloat(item.querySelector('.item-price').value) || 0;
        const vatPercentage = parseFloat(item.querySelector('.item-vat').value) || 0;

        const itemSubtotal = quantity * unitPrice;
        const itemVat = itemSubtotal * (vatPercentage / 100);

        subtotal += itemSubtotal;
        vatTotal += itemVat;

        // Update item subtotal display
        const subtotalSpan = item.querySelector('.item-subtotal');
        if (subtotalSpan) {
            subtotalSpan.textContent = formatCurrency(itemSubtotal);
        }
    });

    const total = subtotal + vatTotal;

    // Update displays
    document.getElementById('subtotalDisplay').textContent = formatCurrency(subtotal);
    document.getElementById('vatDisplay').textContent = formatCurrency(vatTotal);
    document.getElementById('totalDisplay').textContent = formatCurrency(total);
}

function getInvoiceData() {
    // Collect invoice items
    const itemElements = document.querySelectorAll('.invoice-item');
    const items = [];
    let subtotal = 0;
    let vatTotal = 0;

    itemElements.forEach(itemEl => {
        const description = itemEl.querySelector('.item-description').value.trim();
        const quantity = parseFloat(itemEl.querySelector('.item-quantity').value) || 0;
        const unitPrice = parseFloat(itemEl.querySelector('.item-price').value) || 0;
        const vatPercentage = parseFloat(itemEl.querySelector('.item-vat').value) || 0;

        const amount = quantity * unitPrice;
        subtotal += amount;
        vatTotal += amount * (vatPercentage / 100);

        items.push({
            description,
            quantity,
            unitPrice,
            vatPercentage,
            amount
        });
    });

    const totalAmount = subtotal + vatTotal;

    return {
        invoiceNumber: document.getElementById('invoiceNumber').value.trim(),
        customerId: document.getElementById('customerId').value.trim(),
        invoiceDate: document.getElementById('invoiceDate').value,
        dueDate: document.getElementById('dueDate').value,
        reference: document.getElementById('reference').value.trim(),
        notes: document.getElementById('notes').value.trim(),
        items: items,
        subTotal: subtotal,
        vatAmount: vatTotal,
        totalAmount: totalAmount,
        status: document.getElementById('status').value
    };
}

async function showCreateInvoice() {
    try {
        // Fetch all invoices and customers
        const [invoices, customers] = await Promise.all([
            getAll('invoices'),
            getAll('customers')
        ]);

        if (!customers || customers.length === 0) {
            showToast('Geen klanten beschikbaar. Maak eerst een klant aan.', 'error');
            return;
        }

        createModal('Nieuwe Factuur', getInvoiceForm(null, invoices || [], customers || []), async () => {
            const data = getInvoiceData();

            // Validate items
            if (!data.items || data.items.length === 0) {
                throw new Error('Voeg minimaal 1 factuurregel toe');
            }

            await create('invoices', data);
            showToast('Factuur aangemaakt', 'success');
            loadInvoices();
        });

        // Initialize calculations after modal is created
        setTimeout(() => calculateInvoiceTotals(), 100);
    } catch (error) {
        showToast('Fout bij laden van gegevens: ' + error.message, 'error');
    }
}

async function showEditInvoice(id) {
    try {
        const [invoice, allInvoices, customers] = await Promise.all([
            getById('invoices', id),
            getAll('invoices'),
            getAll('customers')
        ]);

        // Get payments from within the invoice
        const invoicePayments = invoice.payments || [];

        const totalPaid = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const remainingAmount = Math.max((invoice.totalAmount || 0) - totalPaid, 0);

        createModal(
            'Factuur Bewerken', 
            getInvoiceFormWithPayments(invoice, allInvoices, customers || [], invoicePayments, totalPaid, remainingAmount), 
            async () => {
                const data = getInvoiceData();

                // Validate items
                if (!data.items || data.items.length === 0) {
                    throw new Error('Voeg minimaal 1 factuurregel toe');
                }

                // Preserve existing payments when updating
                data.payments = invoice.payments;

                await update('invoices', id, data);
                showToast('Factuur bijgewerkt', 'success');
                loadInvoices();
            },
            'Opslaan',
            'xl' // Larger modal for payment history
        );

        // Initialize calculations after modal is created
        setTimeout(() => {
            calculateInvoiceTotals();
            setupStatusChangeListener(invoice, invoicePayments, totalPaid, remainingAmount);
        }, 100);
    } catch (error) {
        showToast('Fout bij laden van factuur: ' + error.message, 'error');
    }
}

async function deleteInvoice(id) {
    if (!confirm('Weet je zeker dat je deze factuur wilt verwijderen?')) return;

    try {
        await remove('invoices', id);
        showToast('Factuur verwijderd', 'success');
        loadInvoices();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Setup listener for status dropdown changes to update payment history UI
function setupStatusChangeListener(invoice, payments, totalPaid, remainingAmount) {
    const statusDropdown = document.getElementById('status');
    if (!statusDropdown) return;

    statusDropdown.addEventListener('change', function() {
        const newStatus = this.value;
        const paymentSection = document.getElementById('paymentHistorySection');
        const addPaymentBtn = document.getElementById('addPaymentBtn');

        if (!paymentSection) return;

        const isPaid = newStatus === 'paid';

        // Update section styling
        const statusColor = isPaid ? 'green' : (totalPaid > 0 ? 'blue' : 'yellow');
        const statusBg = isPaid ? 'bg-green-50 border-green-200' : (totalPaid > 0 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200');

        paymentSection.className = `${statusBg} p-4 rounded-lg border mt-6`;

        // Show/hide payment button and locked indicator
        const headerDiv = paymentSection.querySelector('.flex.justify-between.items-center');
        if (headerDiv) {
            const heading = headerDiv.querySelector('h3');
            if (heading) {
                // Remove existing lock badge if present
                const existingBadge = heading.querySelector('.ml-2');
                if (existingBadge) existingBadge.remove();

                // Add lock badge if paid
                if (isPaid) {
                    heading.insertAdjacentHTML('beforeend', '<span class="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded"><i class="fas fa-lock"></i> Vergrendeld</span>');
                }
            }

            // Show/hide add payment button
            if (addPaymentBtn) {
                addPaymentBtn.style.display = (!isPaid && remainingAmount > 0) ? 'inline-block' : 'none';
            }
        }

        // Show/hide info message
        let infoMessage = paymentSection.querySelector('.bg-green-100');
        if (isPaid && !infoMessage) {
            // Add info message
            const summaryDiv = paymentSection.querySelector('.grid.grid-cols-3');
            if (summaryDiv) {
                summaryDiv.insertAdjacentHTML('beforebegin', `
                    <div class="bg-green-100 border border-green-300 rounded p-3 mb-4">
                        <p class="text-sm text-green-800">
                            <i class="fas fa-info-circle mr-2"></i>
                            <strong>Betaalgeschiedenis is vergrendeld</strong> - Deze factuur heeft de status "Betaald". 
                            Wijzig de status om betalingen toe te voegen of te bewerken.
                        </p>
                    </div>
                `);
            }
        } else if (!isPaid && infoMessage) {
            // Remove info message
            infoMessage.remove();
        }
    });
}

// Create payment for a specific invoice
async function showCreatePaymentForInvoice(invoiceId) {
    try {
        const invoice = await getById('invoices', invoiceId);

        if (!invoice) {
            showToast('Factuur niet gevonden', 'error');
            return;
        }

        if (invoice.status === 'paid') {
            showToast('Deze factuur is als betaald gemarkeerd. Wijzig eerst de status om een betaling toe te voegen.', 'warning');
            return;
        }

        // Pass invoice data to payment creation
        showCreatePaymentWithInvoice(invoice);
    } catch (error) {
        showToast('Fout bij laden van factuur: ' + error.message, 'error');
    }
}
