// Payments management
async function loadPayments() {
    try {
        const payments = await getAll('payments');
        
        let html = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Betalingen</h2>
                <button onclick="showCreatePayment()" 
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                    <i class="fas fa-plus"></i> Nieuwe Betaling
                </button>
            </div>
        `;
        
        if (!payments || payments.length === 0) {
            html += '<p class="text-gray-500 text-center py-8">Geen betalingen gevonden</p>';
        } else {
            html += '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
            html += `
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factuur Nr</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bedrag</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Methode</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
            `;
            
            payments.forEach(payment => {
                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${payment.paymentId || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${payment.invoiceNumber || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${formatDate(payment.paymentDate)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${formatCurrency(payment.amount)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${payment.paymentMethod || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onclick="showEditPayment('${payment.id}')" 
                                    class="text-blue-600 hover:text-blue-900 mr-3">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deletePayment('${payment.id}')" 
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

function getPaymentForm(payment = null, allPayments = [], invoices = [], preselectedInvoice = null) {
    const p = payment || {};

    // Generate next payment ID if creating new
    const paymentId = payment ? p.paymentId : generateNextId(allPayments, 'PAY-', 4);

    // Default date to today
    const paymentDate = payment ? (p.paymentDate ? p.paymentDate.split('T')[0] : '') : getTodayDate();

    const isReadonly = payment ? 'readonly' : 'readonly';
    const bgColor = payment ? 'bg-gray-100' : 'bg-blue-50';

    // If we have a preselected invoice, use its data
    let selectedInvoiceNumber = p.invoiceNumber || '';
    let selectedAmount = p.amount || '';
    let invoiceFieldReadonly = '';

    if (preselectedInvoice) {
        selectedInvoiceNumber = preselectedInvoice.invoiceNumber;
        selectedAmount = preselectedInvoice.totalAmount;
        invoiceFieldReadonly = 'readonly';
    }

    // Generate invoice dropdown for unpaid invoices
    let invoiceDropdown = '';
    if (!payment && !preselectedInvoice && invoices && invoices.length > 0) {
        const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid');

        if (unpaidInvoices.length > 0) {
            invoiceDropdown = `
                <div class="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <label class="block text-sm font-medium mb-2">Selecteer openstaande factuur (optioneel)</label>
                    <select id="invoiceSelector" onchange="selectInvoiceForPayment()" 
                            class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Of voer handmatig in --</option>
                        ${unpaidInvoices.map(inv => 
                            `<option value="${inv.invoiceNumber}" data-amount="${inv.totalAmount}">
                                ${inv.invoiceNumber} - ${formatCurrency(inv.totalAmount)}
                            </option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }
    }

    return `
        <div class="space-y-4">
            ${invoiceDropdown}

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">
                        Betaling ID * 
                        ${!payment ? '<span class="text-xs text-blue-600">(Automatisch)</span>' : ''}
                    </label>
                    <input type="text" id="paymentId" value="${paymentId}" 
                           ${isReadonly} required
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${bgColor}">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">
                        Factuurnummer *
                        ${preselectedInvoice ? '<span class="text-xs text-green-600">(Auto-ingevuld)</span>' : ''}
                    </label>
                    <input type="text" id="invoiceNumber" value="${selectedInvoiceNumber}" required
                           ${invoiceFieldReadonly}
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${preselectedInvoice ? 'bg-green-50' : ''}">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">
                        Betalingsdatum * 
                        ${!payment ? '<span class="text-xs text-gray-600">(Standaard: vandaag)</span>' : ''}
                    </label>
                    <input type="date" id="paymentDate" 
                           value="${paymentDate}" required
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">
                        Bedrag *
                        ${preselectedInvoice ? '<span class="text-xs text-green-600">(Auto-ingevuld)</span>' : ''}
                    </label>
                    <input type="number" step="0.01" id="amount" value="${selectedAmount}" required
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${preselectedInvoice ? 'bg-green-50' : ''}">
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium mb-2">
                    Betaalmethode *
                </label>
                <select id="paymentMethod" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecteer...</option>
                    <option value="ideal" ${p.paymentMethod === 'ideal' ? 'selected' : ''}>iDEAL</option>
                    <option value="bank_transfer" ${!payment || p.paymentMethod === 'bank_transfer' ? 'selected' : ''}>Bankoverschrijving</option>
                    <option value="credit_card" ${p.paymentMethod === 'credit_card' ? 'selected' : ''}>Creditcard</option>
                    <option value="cash" ${p.paymentMethod === 'cash' ? 'selected' : ''}>Contant</option>
                    <option value="paypal" ${p.paymentMethod === 'paypal' ? 'selected' : ''}>PayPal</option>
                </select>
            </div>
        </div>
    `;
}

function getPaymentData() {
    return {
        paymentId: document.getElementById('paymentId').value.trim(),
        invoiceNumber: document.getElementById('invoiceNumber').value.trim(),
        paymentDate: document.getElementById('paymentDate').value,
        amount: parseFloat(document.getElementById('amount').value),
        paymentMethod: document.getElementById('paymentMethod').value
    };
}

async function showCreatePayment() {
    try {
        // Fetch payments and invoices
        const [payments, invoices] = await Promise.all([
            getAll('payments'),
            getAll('invoices')
        ]);

        createModal('Nieuwe Betaling', getPaymentForm(null, payments || [], invoices || []), async () => {
            const data = getPaymentData();
            const invoiceNumber = data.invoiceNumber;

            // Create payment
            await create('payments', data);

            // Update invoice status based on total paid amount
            if (invoiceNumber && invoices) {
                const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
                if (invoice) {
                    try {
                        // Calculate total paid including this new payment
                        const allPayments = payments?.filter(p => p.invoiceNumber === invoiceNumber) || [];
                        const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0) + data.amount;

                        // Determine new status
                        let newStatus = 'pending';
                        if (totalPaid >= invoice.totalAmount) {
                            newStatus = 'paid';
                        } else if (totalPaid > 0) {
                            newStatus = 'partially_paid';
                        }

                        if (invoice.status !== newStatus) {
                            await update('invoices', invoice.id, { ...invoice, status: newStatus });
                        }
                    } catch (error) {
                        console.error('Failed to update invoice status:', error);
                    }
                }
            }

            showToast('Betaling aangemaakt', 'success');
            loadPayments();
        });
    } catch (error) {
        showToast('Fout bij laden van gegevens: ' + error.message, 'error');
    }
}

async function showEditPayment(id) {
    const payment = await getById('payments', id);
    const allPayments = await getAll('payments');
    createModal('Betaling Bewerken', getPaymentForm(payment, allPayments), async () => {
        const data = getPaymentData();
        await update('payments', id, data);
        showToast('Betaling bijgewerkt', 'success');
        loadPayments();
    });
}

async function deletePayment(id) {
    if (!confirm('Weet je zeker dat je deze betaling wilt verwijderen?')) return;

    try {
        await remove('payments', id);
        showToast('Betaling verwijderd', 'success');
        loadPayments();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Create payment with preselected invoice (called from invoice page)
async function showCreatePaymentWithInvoice(invoice) {
    try {
        const [payments, allPayments] = await Promise.all([
            getAll('payments'),
            getAll('payments') // Get twice to have both for form generation and calculation
        ]);

        createModal(`Betaling Registreren - ${invoice.invoiceNumber}`, 
            getPaymentForm(null, payments || [], [], invoice), 
            async () => {
                const data = getPaymentData();

                // Create payment
                await create('payments', data);

                // Calculate total paid for this invoice
                const invoicePayments = allPayments?.filter(p => p.invoiceNumber === invoice.invoiceNumber) || [];
                const totalPaid = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0) + data.amount;

                // Determine new status based on payment amount
                let newStatus = 'pending';
                let message = 'Betaling geregistreerd';

                if (totalPaid >= invoice.totalAmount) {
                    newStatus = 'paid';
                    message = 'Betaling geregistreerd - Factuur volledig betaald!';
                } else if (totalPaid > 0) {
                    newStatus = 'partially_paid';
                    const remaining = invoice.totalAmount - totalPaid;
                    message = `Betaling geregistreerd - Nog ${formatCurrency(remaining)} openstaand`;
                }

                // Update invoice status
                try {
                    await update('invoices', invoice.id, { ...invoice, status: newStatus });
                    showToast(message, 'success');
                } catch (error) {
                    console.error('Failed to update invoice:', error);
                    showToast('Betaling geregistreerd, maar factuur kon niet worden bijgewerkt', 'warning');
                }

                // Reload current view
                const activeNav = document.querySelector('.nav-button.active');
                if (activeNav) {
                    const tabName = activeNav.id.replace('nav-', '');
                    if (tabName === 'invoices') {
                        loadInvoices();
                    } else if (tabName === 'payments') {
                        loadPayments();
                    } else {
                        switchTab('dashboard');
                    }
                } else {
                    switchTab('dashboard');
                }
            }
        );
    } catch (error) {
        showToast('Fout bij laden van betalingen: ' + error.message, 'error');
    }
}

// Helper function for invoice dropdown selection
function selectInvoiceForPayment() {
    const selector = document.getElementById('invoiceSelector');
    const selectedOption = selector.options[selector.selectedIndex];

    if (selectedOption.value) {
        document.getElementById('invoiceNumber').value = selectedOption.value;
        const amount = selectedOption.getAttribute('data-amount');
        if (amount) {
            document.getElementById('amount').value = amount;
        }
    }
}
