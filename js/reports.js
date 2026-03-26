// Reports and Analytics page
async function loadReports() {
    try {
        // Fetch all data - betalingen zijn nu onderdeel van facturen
        const [customers, invoices, subscriptions] = await Promise.all([
            getAll('customers'),
            getAll('invoices'),
            getAll('subscriptions')
        ]);

        // Extract payments from invoices
        const payments = [];
        if (invoices && invoices.length > 0) {
            invoices.forEach(invoice => {
                if (invoice.payments && invoice.payments.length > 0) {
                    invoice.payments.forEach(payment => {
                        payments.push({
                            ...payment,
                            invoiceId: invoice.id,
                            invoiceNumber: invoice.invoiceNumber,
                            customerId: invoice.customerId
                        });
                    });
                }
            });
        }

        const stats = calculateDetailedStats(customers, invoices, payments, subscriptions);
        renderReportsPage(stats, invoices, payments);
    } catch (error) {
        showError(error.message);
    }
}

function calculateDetailedStats(customers, invoices, payments, subscriptions) {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Monthly stats
    const thisMonthInvoices = invoices?.filter(i => {
        const date = new Date(i.invoiceDate);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    }) || [];

    const thisMonthPayments = payments?.filter(p => {
        const date = new Date(p.date);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    }) || [];

    const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Year stats
    const thisYearInvoices = invoices?.filter(i => {
        const date = new Date(i.invoiceDate);
        return date.getFullYear() === thisYear;
    }) || [];

    const thisYearRevenue = payments?.filter(p => {
        const date = new Date(p.date);
        return date.getFullYear() === thisYear;
    }).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // Payment method distribution
    const paymentMethods = {};
    payments?.forEach(p => {
        const method = p.method || 'unknown';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });

    // Invoice status distribution
    const invoiceStatus = {
        paid: invoices?.filter(i => i.status === 'paid').length || 0,
        pending: invoices?.filter(i => i.status === 'pending').length || 0,
        overdue: invoices?.filter(i => i.status === 'overdue').length || 0
    };

    // Top customers by revenue
    const customerRevenue = {};
    invoices?.forEach(inv => {
        if (inv.status === 'paid') {
            customerRevenue[inv.customerId] = (customerRevenue[inv.customerId] || 0) + (inv.totalAmount || 0);
        }
    });

    const topCustomers = Object.entries(customerRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, revenue]) => ({
            customerId: id,
            revenue,
            customer: customers?.find(c => c.customerId === id)
        }));
    
    return {
        thisMonthInvoices: thisMonthInvoices.length,
        thisMonthRevenue,
        thisYearInvoices: thisYearInvoices.length,
        thisYearRevenue,
        paymentMethods,
        invoiceStatus,
        topCustomers,
        totalCustomers: customers?.length || 0,
        totalInvoices: invoices?.length || 0,
        totalPayments: payments?.length || 0,
        totalSubscriptions: subscriptions?.length || 0
    };
}

function renderReportsPage(stats, invoices, payments) {
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-3xl font-bold text-gray-800">Rapporten & Analytics</h2>
                    <p class="text-gray-600 mt-1">Inzichten in je bedrijfsprestaties</p>
                </div>
                <button onclick="loadReports()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
                    <i class="fas fa-sync-alt"></i> Vernieuwen
                </button>
            </div>

            <!-- Period Stats -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- This Month -->
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-calendar-alt text-blue-600 mr-2"></i>
                        Deze Maand
                    </h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700">Facturen</span>
                            <span class="text-2xl font-bold text-blue-600">${stats.thisMonthInvoices}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700">Omzet</span>
                            <span class="text-2xl font-bold text-green-600">${formatCurrency(stats.thisMonthRevenue)}</span>
                        </div>
                    </div>
                </div>

                <!-- This Year -->
                <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-calendar text-green-600 mr-2"></i>
                        Dit Jaar
                    </h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700">Facturen</span>
                            <span class="text-2xl font-bold text-blue-600">${stats.thisYearInvoices}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700">Omzet</span>
                            <span class="text-2xl font-bold text-green-600">${formatCurrency(stats.thisYearRevenue)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Payment Methods -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-credit-card text-purple-600 mr-2"></i>
                        Betaalmethodes
                    </h3>
                    <div class="space-y-3">
                        ${renderPaymentMethodChart(stats.paymentMethods)}
                    </div>
                </div>

                <!-- Invoice Status -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-file-invoice text-blue-600 mr-2"></i>
                        Factuur Status
                    </h3>
                    <div class="space-y-3">
                        ${renderInvoiceStatusChart(stats.invoiceStatus)}
                    </div>
                </div>
            </div>

            <!-- Top Customers -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-xl font-bold mb-4 flex items-center">
                    <i class="fas fa-trophy text-yellow-600 mr-2"></i>
                    Top 5 Klanten (Omzet)
                </h3>
                ${renderTopCustomers(stats.topCustomers)}
            </div>

            <!-- Recent Activity Timeline -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-xl font-bold mb-4 flex items-center">
                    <i class="fas fa-history text-gray-600 mr-2"></i>
                    Recente Activiteiten
                </h3>
                ${renderActivityTimeline(invoices, payments)}
            </div>
        </div>
    `;
}

function renderPaymentMethodChart(methods) {
    const total = Object.values(methods).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) {
        return '<p class="text-gray-500 text-center py-4">Geen betalingen beschikbaar</p>';
    }
    
    const methodLabels = {
        'cash': 'Contant',
        'bank_transfer': 'Bankoverschrijving',
        'credit_card': 'Creditcard',
        'ideal': 'iDEAL',
        'paypal': 'PayPal'
    };
    
    const colors = {
        'cash': 'bg-green-500',
        'bank_transfer': 'bg-blue-500',
        'credit_card': 'bg-purple-500',
        'ideal': 'bg-pink-500',
        'paypal': 'bg-yellow-500'
    };
    
    return Object.entries(methods)
        .sort((a, b) => b[1] - a[1])
        .map(([method, count]) => {
            const percentage = ((count / total) * 100).toFixed(1);
            return `
                <div>
                    <div class="flex justify-between mb-1 text-sm">
                        <span class="font-medium">${methodLabels[method] || method}</span>
                        <span class="text-gray-600">${count} (${percentage}%)</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="${colors[method] || 'bg-gray-500'} h-2 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');
}

function renderInvoiceStatusChart(status) {
    const total = status.paid + status.pending + status.overdue;
    
    if (total === 0) {
        return '<p class="text-gray-500 text-center py-4">Geen facturen beschikbaar</p>';
    }
    
    const statuses = [
        { label: 'Betaald', count: status.paid, color: 'bg-green-500', total },
        { label: 'Openstaand', count: status.pending, color: 'bg-yellow-500', total },
        { label: 'Achterstallig', count: status.overdue, color: 'bg-red-500', total }
    ];
    
    return statuses.map(({ label, count, color, total }) => {
        const percentage = ((count / total) * 100).toFixed(1);
        return `
            <div>
                <div class="flex justify-between mb-1 text-sm">
                    <span class="font-medium">${label}</span>
                    <span class="text-gray-600">${count} (${percentage}%)</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="${color} h-2 rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTopCustomers(topCustomers) {
    if (!topCustomers || topCustomers.length === 0) {
        return '<p class="text-gray-500 text-center py-4">Geen klantgegevens beschikbaar</p>';
    }
    
    return `
        <div class="overflow-x-auto">
            <table class="min-w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rang</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klant</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klant ID</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Omzet</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${topCustomers.map((item, index) => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="text-2xl">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap font-medium">
                                ${item.customer?.business?.displayName || item.customer?.business?.name || 'Onbekend'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                ${item.customerId}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right font-bold text-green-600">
                                ${formatCurrency(item.revenue)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderActivityTimeline(invoices, payments) {
    // Combine invoices and payments, sort by date
    const activities = [];

    invoices?.forEach(inv => {
        activities.push({
            type: 'invoice',
            date: new Date(inv.invoiceDate),
            data: inv
        });
    });

    payments?.forEach(pay => {
        activities.push({
            type: 'payment',
            date: new Date(pay.date),
            data: pay
        });
    });

    // Sort by date descending, take last 10
    activities.sort((a, b) => b.date - a.date);
    const recent = activities.slice(0, 10);

    if (recent.length === 0) {
        return '<p class="text-gray-500 text-center py-4">Geen recente activiteiten</p>';
    }

    return `
        <div class="space-y-3">
            ${recent.map(activity => {
                const icon = activity.type === 'invoice' ? 'file-invoice' : 'credit-card';
                const color = activity.type === 'invoice' ? 'blue' : 'green';
                const label = activity.type === 'invoice' ? 'Factuur' : 'Betaling';
                const id = activity.type === 'invoice' ? activity.data.invoiceNumber : activity.data.paymentId;
                const amount = activity.type === 'invoice' ? activity.data.totalAmount : activity.data.amount;
                
                return `
                    <div class="flex items-center p-3 bg-gray-50 rounded hover:bg-gray-100">
                        <div class="flex-shrink-0 w-10 h-10 bg-${color}-100 rounded-full flex items-center justify-center mr-4">
                            <i class="fas fa-${icon} text-${color}-600"></i>
                        </div>
                        <div class="flex-1">
                            <p class="font-medium">${label}: ${id}</p>
                            <p class="text-sm text-gray-600">${formatDate(activity.date.toISOString())}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-${color}-600">${formatCurrency(amount)}</p>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}
