// Payments management - Betalingen van zowel facturen als abonnementen
async function loadPayments() {
    try {
        const [allPayments, customers] = await Promise.all([
            getAll('payments'),
            getAll('customers')
        ]);

        // Create customer lookup map
        const customerMap = {};
        if (customers && customers.length > 0) {
            customers.forEach(customer => {
                customerMap[customer.customerId] = customer.business?.displayName || customer.business?.name || customer.customerId;
            });
        }

        let html = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Betalingen</h2>
            </div>
        `;

        if (!allPayments || allPayments.length === 0) {
            html += '<p class="text-gray-500 text-center py-8">Geen betalingen gevonden</p>';
        } else {
            html += '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
            html += `
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referentie</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klant</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bedrag</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Methode</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
            `;

            allPayments.forEach(payment => {
                const customerName = customerMap[payment.customerId] || payment.customerId;

                let referenceInfo = '';
                if (payment.type === 'Invoice') {
                    referenceInfo = `Factuur ${payment.invoiceNumber}`;
                } else {
                    referenceInfo = payment.planName || 'Abonnement';
                }

                let sourceBadge = '';
                if (payment.type === 'Invoice') {
                    if (payment.invoiceSource === 'order') {
                        sourceBadge = `<div class="text-xs mt-1"><span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"><i class="fas fa-shopping-cart"></i> Order</span></div>`;
                    } else if (payment.invoiceSource === 'subscription') {
                        sourceBadge = `<div class="text-xs mt-1"><span class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700"><i class="fas fa-sync"></i> Abonnement</span></div>`;
                    } else if (payment.invoiceSource === 'manual') {
                        sourceBadge = `<div class="text-xs mt-1"><span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700"><i class="fas fa-pen"></i> Handmatig</span></div>`;
                    }
                } else {
                    sourceBadge = `<div class="text-xs mt-1"><span class="px-1.5 py-0.5 rounded bg-green-100 text-green-700"><i class="fas fa-sync"></i> Abonnement</span></div>`;
                }

                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div>${referenceInfo}</div>
                            ${sourceBadge}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <div class="font-medium">${customerName}</div>
                            ${payment.type === 'Subscription' && payment.billingPeriod ? 
                                `<div class="text-xs text-gray-500">Periode: ${payment.billingPeriod}</div>` : ''}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${formatDate(payment.date)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${formatCurrency(payment.amount)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${payment.method || 'N/A'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            ${payment.type === 'Invoice' ? 
                                `<button onclick="switchTab('invoices'); setTimeout(() => showInvoiceDetails('${payment.invoiceId}'), 300);" 
                                         class="text-blue-600 hover:underline text-xs">Bekijk factuur</button>` : 
                                `<button onclick="switchTab('subscriptions'); setTimeout(() => showSubscriptionDetails('${payment.subscriptionId}'), 300);" 
                                         class="text-green-600 hover:underline text-xs">Bekijk abonnement</button>`}
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

function showCreatePaymentWithInvoice(invoice) {
    const existingPayments = invoice.payments || [];
    const totalPaid = existingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainingAmount = Math.max((invoice.totalAmount || 0) - totalPaid, 0);

    const formHtml = `
        <div class="bg-gray-50 border rounded p-4 mb-4">
            <div class="grid grid-cols-3 gap-4 text-sm">
                <div>
                    <p class="text-gray-500">Factuur</p>
                    <p class="font-semibold">${invoice.invoiceNumber || invoice.id}</p>
                </div>
                <div>
                    <p class="text-gray-500">Totaalbedrag</p>
                    <p class="font-semibold">${formatCurrency(invoice.totalAmount || 0)}</p>
                </div>
                <div>
                    <p class="text-gray-500">Openstaand</p>
                    <p class="font-semibold text-yellow-600">${formatCurrency(remainingAmount)}</p>
                </div>
            </div>
        </div>
        <form id="invoicePaymentForm" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                    <input type="date" name="date" value="${getTodayDate()}"
                           class="w-full border border-gray-300 rounded px-3 py-2" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Bedrag *</label>
                    <input type="number" name="amount" value="${remainingAmount.toFixed(2)}" step="0.01" min="0.01"
                           class="w-full border border-gray-300 rounded px-3 py-2" required>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Betalingsmethode *</label>
                <select name="method" class="w-full border border-gray-300 rounded px-3 py-2" required>
                    <option value="">Selecteer methode</option>
                    <option value="bank_transfer">Bankoverschrijving</option>
                    <option value="ideal">iDEAL</option>
                    <option value="cash">Contant</option>
                    <option value="card">Pinpas/Creditcard</option>
                    <option value="credit_card">Creditcard</option>
                    <option value="sepa">SEPA incasso</option>
                    <option value="paypal">PayPal</option>
                    <option value="other">Overig</option>
                </select>
            </div>
        </form>
    `;

    createModal('Betaling Registreren', formHtml, async () => {
        const form = document.getElementById('invoicePaymentForm');
        const formData = new FormData(form);

        const amount = parseFloat(formData.get('amount'));
        const method = formData.get('method');
        const date = formData.get('date');

        if (!amount || amount <= 0) throw new Error('Voer een geldig bedrag in');
        if (!method) throw new Error('Selecteer een betalingsmethode');

        const paymentData = { amount, method, date };

        await apiRequest(`/invoices/${invoice.id}/payments`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });

        showToast('Betaling geregistreerd', 'success');
        loadInvoices();
    }, 'Registreer');
}