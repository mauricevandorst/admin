// Payments management - Betalingen zijn nu onderdeel van facturen
async function loadPayments() {
    try {
        const invoices = await getAll('invoices');

        let html = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Betalingen</h2>
                <p class="text-sm text-gray-600">Betalingen worden beheerd via facturen. <a href="#" onclick="switchTab('invoices')" class="text-blue-600 hover:underline">Ga naar facturen</a></p>
            </div>
        `;

        // Extract all payments from all invoices
        const allPayments = [];
        if (invoices && invoices.length > 0) {
            invoices.forEach(invoice => {
                if (invoice.payments && invoice.payments.length > 0) {
                    invoice.payments.forEach(payment => {
                        allPayments.push({
                            ...payment,
                            invoiceId: invoice.id,
                            invoiceNumber: invoice.invoiceNumber,
                            customerId: invoice.customerId
                        });
                    });
                }
            });
        }

        if (allPayments.length === 0) {
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

            allPayments.forEach(payment => {
                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${payment.paymentId || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <a href="#" onclick="showInvoiceDetails('${payment.invoiceId}')" class="text-blue-600 hover:underline">
                                ${payment.invoiceNumber || 'N/A'}
                            </a>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${formatDate(payment.date)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${formatCurrency(payment.amount)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${payment.method || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onclick="deletePaymentFromInvoice('${payment.invoiceId}', '${payment.paymentId}')" 
                                    class="text-red-600 hover:text-red-900"
                                    title="Verwijder betaling">
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

function getPaymentForm(preselectedInvoice = null) {
    const paymentDate = getTodayDate();
    const selectedAmount = preselectedInvoice ? preselectedInvoice.totalAmount : '';
    const remainingAmount = preselectedInvoice ? calculateRemainingAmount(preselectedInvoice) : '';

    return `
        <div class="space-y-4">
            <div class="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p class="text-sm text-blue-800">
                    <i class="fas fa-info-circle mr-2"></i>
                    <strong>Let op:</strong> Het betaling ID wordt automatisch gegenereerd door het systeem.
                </p>
            </div>

            ${preselectedInvoice ? `
                <div class="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 class="font-medium text-green-800 mb-2">Factuurinformatie</h4>
                    <p class="text-sm text-green-700">Factuur: <strong>${preselectedInvoice.invoiceNumber}</strong></p>
                    <p class="text-sm text-green-700">Totaalbedrag: <strong>${formatCurrency(preselectedInvoice.totalAmount)}</strong></p>
                    <p class="text-sm text-green-700">Nog te betalen: <strong>${formatCurrency(remainingAmount)}</strong></p>
                </div>
            ` : ''}

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">
                        Betalingsdatum * 
                        <span class="text-xs text-gray-600">(Standaard: vandaag)</span>
                    </label>
                    <input type="date" id="paymentDate" 
                           value="${paymentDate}" required
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">
                        Bedrag *
                        ${preselectedInvoice ? '<span class="text-xs text-green-600">(Openstaand bedrag)</span>' : ''}
                    </label>
                    <input type="number" step="0.01" id="amount" 
                           value="${remainingAmount || selectedAmount}" required
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${preselectedInvoice ? 'bg-green-50' : ''}">
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium mb-2">
                    Betaalmethode *
                </label>
                <select id="paymentMethod" required class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecteer...</option>
                    <option value="ideal">iDEAL</option>
                    <option value="bank_transfer" selected>Bankoverschrijving</option>
                    <option value="credit_card">Creditcard</option>
                    <option value="cash">Contant</option>
                    <option value="paypal">PayPal</option>
                </select>
            </div>
        </div>
    `;
}

function calculateRemainingAmount(invoice) {
    const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    return invoice.totalAmount - totalPaid;
}

function getPaymentData() {
    return {
        date: document.getElementById('paymentDate').value,
        amount: parseFloat(document.getElementById('amount').value),
        method: document.getElementById('paymentMethod').value
    };
}

async function showCreatePaymentForInvoice(invoiceId) {
    try {
        const invoice = await getById('invoices', invoiceId);

        if (!invoice) {
            showToast('Factuur niet gevonden', 'error');
            return;
        }

        const remainingAmount = calculateRemainingAmount(invoice);

        if (remainingAmount <= 0) {
            showToast('Deze factuur is al volledig betaald', 'info');
            return;
        }

        createModal(`Betaling Registreren - ${invoice.invoiceNumber}`, 
            getPaymentForm(invoice), 
            async () => {
                const paymentData = getPaymentData();

                if (paymentData.amount <= 0) {
                    showToast('Bedrag moet groter zijn dan 0', 'error');
                    return;
                }

                if (paymentData.amount > remainingAmount) {
                    const proceed = confirm(`Het betalingsbedrag (${formatCurrency(paymentData.amount)}) is hoger dan het openstaande bedrag (${formatCurrency(remainingAmount)}). Weet je zeker dat je door wilt gaan?`);
                    if (!proceed) return;
                }

                try {
                    // Use the apiRequest helper function instead of direct fetch
                    await apiRequest(`/invoices/${invoiceId}/payments`, {
                        method: 'POST',
                        body: JSON.stringify(paymentData)
                    });

                    const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0) + paymentData.amount;
                    let message = 'Betaling geregistreerd';

                    if (totalPaid >= invoice.totalAmount) {
                        message = 'Betaling geregistreerd - Factuur volledig betaald!';
                    } else {
                        const stillRemaining = invoice.totalAmount - totalPaid;
                        message = `Betaling geregistreerd - Nog ${formatCurrency(stillRemaining)} openstaand`;
                    }

                    showToast(message, 'success');

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
                        switchTab('invoices');
                    }
                } catch (error) {
                    console.error('Error adding payment:', error);
                    showToast('Fout bij registreren betaling: ' + error.message, 'error');
                }
            }
        );
    } catch (error) {
        showToast('Fout bij laden van factuur: ' + error.message, 'error');
    }
}

async function deletePaymentFromInvoice(invoiceId, paymentId) {
    if (!confirm('Weet je zeker dat je deze betaling wilt verwijderen?')) return;

    try {
        const invoice = await getById('invoices', invoiceId);

        if (!invoice) {
            showToast('Factuur niet gevonden', 'error');
            return;
        }

        if (!invoice.payments || invoice.payments.length === 0) {
            showToast('Geen betalingen gevonden op deze factuur', 'error');
            return;
        }

        invoice.payments = invoice.payments.filter(p => p.paymentId !== paymentId);

        const totalPaid = invoice.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        if (totalPaid >= invoice.totalAmount) {
            invoice.status = 'paid';
        } else if (totalPaid > 0) {
            invoice.status = 'partially_paid';
        } else {
            invoice.status = 'pending';
        }

        await update('invoices', invoiceId, invoice);
        showToast('Betaling verwijderd', 'success');
        loadPayments();
    } catch (error) {
        console.error('Error deleting payment:', error);
        showToast('Fout bij verwijderen betaling: ' + error.message, 'error');
    }
}

async function showInvoiceDetails(invoiceId) {
    switchTab('invoices');
    setTimeout(() => {
        showEditInvoice(invoiceId);
    }, 100);
}
