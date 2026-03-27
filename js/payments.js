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
                <p class="text-sm text-gray-600">Overzicht van alle betalingen uit facturen en abonnementen</p>
            </div>
        `;

        if (!allPayments || allPayments.length === 0) {
            html += '<p class="text-gray-500 text-center py-8">Geen betalingen gevonden</p>';
        } else {
            html += '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
            html += `
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klant</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referentie</th>
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
                const typeClass = payment.type === 'Invoice' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';

                let referenceInfo = '';
                if (payment.type === 'Invoice') {
                    referenceInfo = `Factuur ${payment.invoiceNumber}`;
                } else {
                    referenceInfo = payment.planName || 'Abonnement';
                }

                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span class="px-2 py-1 text-xs font-semibold rounded ${typeClass}">
                                ${payment.type === 'Invoice' ? 'Factuur' : 'Abonnement'}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <div class="font-medium">${customerName}</div>
                            ${payment.type === 'Subscription' && payment.billingPeriod ? 
                                `<div class="text-xs text-gray-500">Periode: ${payment.billingPeriod}</div>` : ''}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <div class="font-medium">${referenceInfo}</div>
                            ${payment.reference ? `<div class="text-xs text-gray-500">${payment.reference}</div>` : ''}
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