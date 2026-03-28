// Dashboard management
async function loadDashboard() {
    try {
        // Fetch all data in parallel - betalingen zijn nu onderdeel van facturen
        const [customers, invoices, subscriptions, orders] = await Promise.all([
            getAll('customers'),
            getAll('invoices'),
            getAll('subscriptions'),
            getAll('orders')
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
                            invoiceNumber: invoice.invoiceNumber
                        });
                    });
                }
            });
        }

        // Calculate statistics
        const stats = calculateStats(customers, invoices, payments, subscriptions, orders);

        // Render dashboard
        renderDashboard(stats, invoices, payments, subscriptions, customers, orders);
    } catch (error) {
        showError(error.message);
    }
}

function calculateStats(customers, invoices, payments, subscriptions, orders) {
    const now = new Date();

    // Customer stats
    const totalCustomers = customers?.length || 0;

    // Invoice stats with payment calculations
    const totalInvoices = invoices?.length || 0;
    const safeInvoices = invoices || [];
    const safePayments = payments || [];

    // Build a map of total paid per invoice number from payments within invoices
    const paymentsByInvoice = new Map();
    safeInvoices.forEach(invoice => {
        if (invoice.payments && invoice.payments.length > 0) {
            const totalPaid = invoice.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
            paymentsByInvoice.set(invoice.invoiceNumber, totalPaid);
        }
    });

    let paidInvoices = 0;
    let partiallyPaidInvoices = 0;
    let pendingInvoices = 0;
    let overdueInvoices = 0;
    let totalInvoiceAmount = 0;
    let totalPaidFromPayments = 0;
    let pendingAmount = 0;

    safeInvoices.forEach((invoice) => {
        const invoiceTotal = invoice.totalAmount || 0;
        const paidForInvoice = paymentsByInvoice.get(invoice.invoiceNumber) || 0;
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
        const isOverdue = dueDate instanceof Date && !Number.isNaN(dueDate.getTime()) && dueDate < now;
        const remainingForInvoice = Math.max(invoiceTotal - paidForInvoice, 0);

        totalInvoiceAmount += invoiceTotal;
        totalPaidFromPayments += Math.min(paidForInvoice, invoiceTotal);
        pendingAmount += remainingForInvoice;

        // Determine actual status based on payments
        let actualStatus = invoice.status;
        if (paidForInvoice >= invoiceTotal && invoiceTotal > 0) {
            actualStatus = 'paid';
        } else if (paidForInvoice > 0) {
            actualStatus = 'partially_paid';
        } else if (isOverdue) {
            actualStatus = 'overdue';
        } else {
            actualStatus = 'pending';
        }

        // Count based on actual calculated status
        if (actualStatus === 'paid') {
            paidInvoices += 1;
        } else if (actualStatus === 'partially_paid') {
            partiallyPaidInvoices += 1;
        } else if (actualStatus === 'overdue') {
            overdueInvoices += 1;
        } else {
            pendingInvoices += 1;
        }
    });

    // Payment stats
    const totalPayments = safePayments.length || 0;

    // Subscription stats
    const totalSubscriptions = subscriptions?.length || 0;
    const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;
    const cancelledSubscriptions = subscriptions?.filter(s => s.status === 'cancelled').length || 0;
    const expiringSubscriptions = subscriptions?.filter(s => {
        if (s.status !== 'active' || !s.endDate) return false;
        const endDate = new Date(s.endDate);
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        return endDate <= thirtyDaysFromNow && endDate >= now;
    }).length || 0;

    const monthlyRecurringRevenue = subscriptions?.filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (s.price || 0), 0) || 0;

    const collectionRate = totalInvoiceAmount > 0 ? (totalPaidFromPayments / totalInvoiceAmount) * 100 : 0;
    const activeSubscriptionRate = totalSubscriptions > 0 ? (activeSubscriptions / totalSubscriptions) * 100 : 0;
    const overduePressure = pendingAmount > 0 ? (overdueInvoices / Math.max(pendingInvoices + overdueInvoices, 1)) * 100 : 0;

    // Order stats
    const safeOrders = orders || [];
    const totalOrders = safeOrders.length;
    const draftOrders = safeOrders.filter(o => o.status === 'draft').length;
    const confirmedOrders = safeOrders.filter(o => o.status === 'confirmed').length;
    const invoicedOrders = safeOrders.filter(o => o.status === 'invoiced').length;
    const cancelledOrders = safeOrders.filter(o => o.status === 'cancelled').length;
    const pendingOrderAmount = safeOrders
        .filter(o => o.status === 'confirmed')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Subscription billing alerts
    const invoicesBySubscription = {};
    safeInvoices.forEach(inv => {
        if (inv.invoiceSource === 'subscription' && inv.subscriptionId) {
            invoicesBySubscription[inv.subscriptionId] = (invoicesBySubscription[inv.subscriptionId] || 0) + 1;
        }
    });
    function calcSubTermsSummary(sub, invoicedCount) {
        if (!sub || !sub.startDate) return null;
        const freq = sub.billingFrequency || 'monthly';
        const start = new Date(sub.startDate);
        start.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endLimit = sub.endDate ? new Date(sub.endDate) : null;
        function addPeriod(d) {
            const r = new Date(d);
            switch (freq) {
                case 'quarterly': r.setMonth(r.getMonth() + 3); break;
                case 'halfyearly': r.setMonth(r.getMonth() + 6); break;
                case 'yearly': r.setFullYear(r.getFullYear() + 1); break;
                default: r.setMonth(r.getMonth() + 1);
            }
            return r;
        }
        let expectedDue = 0;
        let ps = new Date(start);
        let lastPs = null;
        while (ps <= today && expectedDue < 120) {
            if (endLimit && ps > endLimit) break;
            lastPs = new Date(ps);
            expectedDue++;
            ps = addPeriod(ps);
        }
        const hasCurrentPeriod = lastPs !== null && addPeriod(lastPs) > today;
        const invoiced = Math.min(invoicedCount, expectedDue);
        const open = expectedDue - invoiced;
        const currentOpen = (hasCurrentPeriod && open > 0) ? 1 : 0;
        const pastOpen = open - currentOpen;
        return { expectedDue, invoiced, open, pastOpen, currentOpen };
    }
    const UPCOMING_DAYS = 14;
    const subscriptionsWithOpenTerms = [];
    const subscriptionsUpcomingBilling = [];
    (subscriptions || []).filter(s => s.status === 'active').forEach(sub => {
        const linkedCount = invoicesBySubscription[sub.id] || 0;
        const summary = calcSubTermsSummary(sub, linkedCount);
        if (summary && summary.open > 0) {
            subscriptionsWithOpenTerms.push({ sub, open: summary.open, invoiced: summary.invoiced, expectedDue: summary.expectedDue, pastOpen: summary.pastOpen, currentOpen: summary.currentOpen });
        } else if (sub.nextInvoiceDate) {
            const nextDate = new Date(sub.nextInvoiceDate);
            const today2 = new Date();
            today2.setHours(0, 0, 0, 0);
            const daysUntil = Math.ceil((nextDate - today2) / (1000 * 60 * 60 * 24));
            if (daysUntil >= 0 && daysUntil <= UPCOMING_DAYS) {
                subscriptionsUpcomingBilling.push({ sub, daysUntil });
            }
        }
    });

    return {
        totalCustomers,
        totalInvoices,
        paidInvoices,
        partiallyPaidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalInvoiceAmount,
        paidAmount: totalPaidFromPayments,
        pendingAmount,
        totalPayments,
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        expiringSubscriptions,
        monthlyRecurringRevenue,
        collectionRate,
        activeSubscriptionRate,
        overduePressure,
        totalOrders,
        draftOrders,
        confirmedOrders,
        invoicedOrders,
        cancelledOrders,
        pendingOrderAmount,
        subscriptionsWithOpenTerms,
        subscriptionsUpcomingBilling
    };
}

function renderDashboard(stats, invoices, payments, subscriptions, customers, orders) {
    const content = document.getElementById('content');
    const now = new Date();
    const overdueAmount = stats.pendingAmount * (stats.overduePressure / 100);

    content.innerHTML = `
        <div class="space-y-4 page-transition">

            <!-- Compact header -->
            <div class="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <p class="text-xs text-gray-400 uppercase tracking-widest mb-0.5">${formatDate(now.toISOString())}</p>
                    <h2 class="text-xl font-bold text-gray-900 leading-tight">Dashboard</h2>
                </div>
                <div class="flex gap-2">
                    <button onclick="switchTab('invoices')" class="btn-sm-invoice">
                        <i class="fas fa-file-invoice"></i> Facturen
                    </button>
                    <button onclick="switchTab('orders')" class="btn-sm-sunset">
                        <i class="fas fa-shopping-cart"></i> Orders
                    </button>
                    <button onclick="switchTab('customers')" class="btn-sm-gold">
                        <i class="fas fa-users"></i> Klanten
                    </button>
                    <button onclick="switchTab('subscriptions')" class="btn-sm-rose">
                        <i class="fas fa-sync"></i> Abonnementen
                    </button>
                </div>
            </div>

            <!-- KPI strip -->
            <div class="kpi-strip">
                ${createCompactKpiCard('Klanten', stats.totalCustomers, 'switchTab("customers")', '', 'fa-users')}
                ${createCompactKpiCard('Facturen', stats.totalInvoices, 'switchTab("invoices")', `${stats.pendingInvoices + stats.overdueInvoices} open`, 'fa-file-invoice')}
                ${createCompactKpiCard('Orders', stats.totalOrders, 'switchTab("orders")', `${stats.confirmedOrders} bevestigd`, 'fa-shopping-cart')}
                ${createCompactKpiCard('Abonnementen', stats.totalSubscriptions, 'switchTab("subscriptions")', `${stats.activeSubscriptions} actief`, 'fa-sync')}
            </div>

            <!-- Alerts -->
            ${renderAlerts(stats)}

            <!-- Abonnement facturatie panel -->
            ${renderSubscriptionBillingPanel(stats, customers)}

            <!-- Main grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <!-- Financieel -->
                <div class="card-compact">
                    <div class="card-compact-header">
                        <span>Financieel</span>
                        <button onclick="switchTab('invoices')" class="link-action">Bekijk facturen →</button>
                    </div>
                    <div class="financial-summary">
                        <div class="fin-item">
                            <p class="fin-label">Betaald</p>
                            <p class="fin-value" style="color:#15803d">${formatCurrency(stats.paidAmount)}</p>
                            <p class="fin-note">${stats.paidInvoices} facturen</p>
                        </div>
                        <div class="fin-item">
                            <p class="fin-label">Openstaand</p>
                            <p class="fin-value" style="color:#b45309">${formatCurrency(stats.pendingAmount)}</p>
                            <p class="fin-note">${stats.pendingInvoices + stats.overdueInvoices} facturen</p>
                        </div>
                        <div class="fin-item">
                            <p class="fin-label">MRR</p>
                            <p class="fin-value" style="color:#1d4ed8">${formatCurrency(stats.monthlyRecurringRevenue)}</p>
                            <p class="fin-note">${stats.activeSubscriptions} actief</p>
                        </div>
                    </div>
                    <div class="mt-4 space-y-2">
                        ${createMeterRow('Inningsratio', stats.collectionRate, 'success')}
                        ${createMeterRow('Actieve abonnementen', stats.activeSubscriptionRate, 'info')}
                        ${createMeterRow('Achterstanddruk', stats.overduePressure, 'warning')}
                    </div>
                </div>

                <!-- Actiepunten + Pipeline -->
                <div class="card-compact">
                    <div class="card-compact-header">
                        <span>Actiepunten</span>
                        <button onclick="switchTab('orders')" class="link-action">Orders →</button>
                    </div>
                    <div class="focus-list">
                        <div class="focus-row">
                            <div>
                                <p class="focus-label">Achterstallig risico</p>
                                <p class="focus-note">${stats.overdueInvoices} facturen met prioriteit</p>
                            </div>
                            <p class="focus-value">${formatCurrency(overdueAmount)}</p>
                        </div>
                        <div class="focus-row">
                            <div>
                                <p class="focus-label">Open facturen</p>
                                <p class="focus-note">Plan opvolging voor snellere inning</p>
                            </div>
                            <p class="focus-value">${stats.pendingInvoices + stats.overdueInvoices}</p>
                        </div>
                        <div class="focus-row">
                            <div>
                                <p class="focus-label">Te factureren orders</p>
                                <p class="focus-note">${stats.confirmedOrders} bevestigde order${stats.confirmedOrders !== 1 ? 's' : ''}</p>
                            </div>
                            <p class="focus-value">${formatCurrency(stats.pendingOrderAmount)}</p>
                        </div>
                        <div class="focus-row">
                            <div>
                                <p class="focus-label">Verloopt binnen 30 dagen</p>
                                <p class="focus-note">Proactieve verlenging nodig</p>
                            </div>
                            <p class="focus-value">${stats.expiringSubscriptions}</p>
                        </div>
                    </div>
                    <div class="pipeline-grid mt-4">
                        <div>
                            <p class="pipeline-section-label">Facturen</p>
                            ${createPipelineRow('Betaald', stats.paidInvoices, 'success')}
                            ${createPipelineRow('Gedeeltelijk', stats.partiallyPaidInvoices, 'info')}
                            ${createPipelineRow('Openstaand', stats.pendingInvoices, 'warning')}
                            ${createPipelineRow('Achterstallig', stats.overdueInvoices, 'danger')}
                        </div>
                        <div>
                            <p class="pipeline-section-label">Orders</p>
                            ${createPipelineRow('Concept', stats.draftOrders, 'neutral')}
                            ${createPipelineRow('Bevestigd', stats.confirmedOrders, 'info')}
                            ${createPipelineRow('Gefactureerd', stats.invoicedOrders, 'success')}
                            ${createPipelineRow('Geannuleerd', stats.cancelledOrders, 'danger')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent activity -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                ${renderRecentInvoices(invoices, customers)}
                ${renderRecentOrders(orders, customers)}
                ${renderRecentPayments(payments, invoices, customers)}
            </div>
        </div>
    `;
}

function createCompactKpiCard(title, value, onClickAction, subtitle = '', icon = '') {
    return `
        <button class="kpi-card-compact" onclick="${onClickAction}">
            <p class="kpi-label">${icon ? `<i class="fas ${icon} kpi-icon"></i> ` : ''}${title}</p>
            <p class="kpi-number">${value}</p>
            ${subtitle ? `<p class="kpi-sub">${subtitle}</p>` : ''}
        </button>
    `;
}

function createMeterRow(label, percent, type) {
    const safePercent = Math.max(0, Math.min(100, percent || 0));

    return `
        <div>
            <div class="flex items-center justify-between text-sm mb-2">
                <span class="font-semibold text-gray-700">${label}</span>
                <span class="text-gray-500">${formatPercent(safePercent)}</span>
            </div>
            <div class="dashboard-meter-track">
                <div class="dashboard-meter-fill ${type}" style="width: ${safePercent}%"></div>
            </div>
        </div>
    `;
}

function createPipelineRow(label, value, type) {
    return `
        <div class="dashboard-pipeline-item ${type}">
            <p class="dashboard-pipeline-label">${label}</p>
            <p class="dashboard-pipeline-value">${value}</p>
        </div>
    `;
}

function formatPercent(value) {
    return `${Math.round(value || 0)}%`;
}

function renderAlerts(stats) {
    const alerts = [];

    if (stats.overdueInvoices > 0) {
        alerts.push({
            type: 'error',
            icon: 'exclamation-triangle',
            message: `${stats.overdueInvoices} achterstallige factuur${stats.overdueInvoices > 1 ? 'en' : ''} – directe opvolging vereist`,
            action: 'Bekijk →',
            actionFn: 'switchTab("invoices")'
        });
    }

    if (stats.subscriptionsWithOpenTerms?.length > 0) {
        const pastOpenCount = stats.subscriptionsWithOpenTerms.filter(x => x.pastOpen > 0).length;
        const currentOnlyOpenCount = stats.subscriptionsWithOpenTerms.filter(x => x.pastOpen === 0 && x.currentOpen > 0).length;
        if (pastOpenCount > 0) {
            alerts.push({
                type: 'error',
                icon: 'file-invoice-dollar',
                message: `${pastOpenCount} abonnement${pastOpenCount > 1 ? 'en hebben' : ' heeft'} niet-gefactureerde termijnen`,
                action: 'Bekijk →',
                actionFn: 'switchTab("subscriptions")'
            });
        }
        if (currentOnlyOpenCount > 0) {
            alerts.push({
                type: 'warning',
                icon: 'file-invoice-dollar',
                message: `${currentOnlyOpenCount} abonnement${currentOnlyOpenCount > 1 ? 'en hebben' : ' heeft'} een lopende termijn nog niet gefactureerd`,
                action: 'Bekijk →',
                actionFn: 'switchTab("subscriptions")'
            });
        }
    }

    if (stats.subscriptionsUpcomingBilling?.length > 0) {
        alerts.push({
            type: 'warning',
            icon: 'calendar-check',
            message: `${stats.subscriptionsUpcomingBilling.length} abonnement${stats.subscriptionsUpcomingBilling.length > 1 ? 'en' : ''} te factureren binnen 14 dagen`,
            action: 'Bekijk →',
            actionFn: 'switchTab("subscriptions")'
        });
    }

    if (stats.expiringSubscriptions > 0) {
        alerts.push({
            type: 'warning',
            icon: 'clock',
            message: `${stats.expiringSubscriptions} abonnement${stats.expiringSubscriptions > 1 ? 'en verlopen' : ' verloopt'} binnen 30 dagen`,
            action: 'Bekijk →',
            actionFn: 'switchTab("subscriptions")'
        });
    }

    if (stats.pendingInvoices > 10) {
        alerts.push({
            type: 'info',
            icon: 'info-circle',
            message: `${stats.pendingInvoices} openstaande facturen – overweeg herinneringen te sturen`,
            action: 'Bekijk →',
            actionFn: 'switchTab("invoices")'
        });
    }

    if (alerts.length === 0) {
        return `
            <div class="alert-compact success">
                <i class="fas fa-check-circle"></i>
                <span>Geen actiepunten – alles loopt goed</span>
            </div>
        `;
    }

    return `
        <div class="space-y-2">
            ${alerts.map(alert => `
                <div class="alert-compact ${alert.type}">
                    <i class="fas fa-${alert.icon}"></i>
                    <span>${alert.message}</span>
                    <button onclick="${alert.actionFn}" class="alert-action">${alert.action}</button>
                </div>
            `).join('')}
        </div>
    `;
}

function renderRecentInvoices(invoices, customers) {
    const statusBadge = {
        paid: 'badge-success',
        partially_paid: 'badge-info',
        pending: 'badge-warning',
        overdue: 'badge-danger'
    };
    const statusLabel = {
        paid: 'Betaald',
        partially_paid: 'Deels betaald',
        pending: 'Open',
        overdue: 'Achterstallig'
    };

    const emptyState = `<p class="text-sm text-gray-400 text-center py-6">Geen facturen beschikbaar</p>`;

    const rows = (!invoices || invoices.length === 0) ? emptyState : [...invoices]
        .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
        .slice(0, 5)
        .map(invoice => {
            const customer = customers?.find(c => c.customerId === invoice.customerId);
            const name = customer?.business?.displayName || customer?.business?.name || invoice.customerId || 'N/A';
            const badge = statusBadge[invoice.status] || 'badge-warning';
            const label = statusLabel[invoice.status] || 'Open';
            return `
                <div class="recent-list-row">
                    <div class="min-w-0 flex-1">
                        <button onclick="showEditInvoice('${invoice.id}')" class="recent-list-label truncate block text-left bg-transparent border-none p-0 cursor-pointer hover:underline">${invoice.invoiceNumber}</button>
                        <p class="recent-list-sub truncate">${name}</p>
                    </div>
                    <div class="flex items-center gap-3 ml-3 shrink-0">
                        <div class="text-right">
                            <p class="recent-list-amount">${formatCurrency(invoice.totalAmount)}</p>
                            <p class="recent-list-meta">${formatDate(invoice.invoiceDate)}</p>
                        </div>
                        <span class="badge-premium ${badge} hidden sm:inline-flex">${label}</span>
                    </div>
                </div>
            `;
        }).join('');

    return `
        <div class="card-compact">
            <div class="card-compact-header">
                <span>Recente Facturen</span>
                <button onclick="switchTab('invoices')" class="link-action">Bekijk alle →</button>
            </div>
            ${rows}
        </div>
    `;
}

function renderRecentPayments(payments, invoices, customers) {
    const methodLabel = {
        bank_transfer: 'Bank',
        cash: 'Contant',
        card: 'Kaart',
        ideal: 'iDEAL',
        credit_card: 'Creditcard',
        sepa: 'SEPA',
        paypal: 'PayPal'
    };

    const emptyState = `<p class="text-sm text-gray-400 text-center py-6">Geen betalingen beschikbaar</p>`;

    const rows = (!payments || payments.length === 0) ? emptyState : [...payments]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)
        .map(payment => {
            const invoice = invoices?.find(inv => inv.invoiceNumber === payment.invoiceNumber);
            const customer = invoice ? customers?.find(c => c.customerId === invoice.customerId) : null;
            const name = customer?.business?.displayName || customer?.business?.name || payment.invoiceNumber || 'N/A';
            const method = methodLabel[payment.method] || payment.method || '—';
            return `
                <div class="recent-list-row">
                    <div class="min-w-0 flex-1">
                        ${invoice?.id
                            ? `<button onclick="showEditInvoice('${invoice.id}')" class="recent-list-label truncate block text-left bg-transparent border-none p-0 cursor-pointer hover:underline">${payment.invoiceNumber || 'N/A'}</button>`
                            : `<p class="recent-list-label truncate">${payment.invoiceNumber || 'N/A'}</p>`
                        }
                        <p class="recent-list-sub truncate">${name}</p>
                    </div>
                    <div class="text-right ml-3 shrink-0">
                        <p class="recent-list-amount" style="color:#15803d">${formatCurrency(payment.amount)}</p>
                        <p class="recent-list-meta">${payment.date ? formatDate(payment.date) : '—'} · ${method}</p>
                    </div>
                </div>
            `;
        }).join('');

    return `
        <div class="card-compact">
            <div class="card-compact-header">
                <span>Recente Betalingen</span>
                <button onclick="switchTab('payments')" class="link-action">Bekijk alle →</button>
            </div>
            ${rows}
        </div>
    `;
}

function renderRecentOrders(orders, customers) {
    const statusBadge = {
        draft: 'badge-warning',
        confirmed: 'badge-info',
        invoiced: 'badge-success',
        cancelled: 'badge-danger'
    };
    const statusLabel = {
        draft: 'Concept',
        confirmed: 'Bevestigd',
        invoiced: 'Gefactureerd',
        cancelled: 'Geannuleerd'
    };

    const emptyState = `<p class="text-sm text-gray-400 text-center py-6">Geen orders beschikbaar</p>`;

    const rows = (!orders || orders.length === 0) ? emptyState : [...orders]
        .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
        .slice(0, 5)
        .map(order => {
            const customer = customers?.find(c => c.customerId === order.customerId);
            const name = customer?.business?.displayName || customer?.business?.name || order.customerId || 'N/A';
            const badge = statusBadge[order.status] || 'badge-warning';
            const label = statusLabel[order.status] || order.status;
            return `
                <div class="recent-list-row">
                    <div class="min-w-0 flex-1">
                        <button onclick="showEditOrder('${order.id}')" class="recent-list-label truncate block text-left bg-transparent border-none p-0 cursor-pointer hover:underline">${order.orderNumber}</button>
                        <p class="recent-list-sub truncate">${name}</p>
                    </div>
                    <div class="flex items-center gap-3 ml-3 shrink-0">
                        <div class="text-right">
                            <p class="recent-list-amount">${formatCurrency(order.totalAmount)}</p>
                            <p class="recent-list-meta">${formatDate(order.orderDate)}</p>
                        </div>
                        <span class="badge-premium ${badge} hidden sm:inline-flex">${label}</span>
                    </div>
                </div>
            `;
        }).join('');

    return `
        <div class="card-compact">
            <div class="card-compact-header">
                <span>Recente Orders</span>
                <button onclick="switchTab('orders')" class="link-action">Bekijk alle →</button>
            </div>
            ${rows}
        </div>
    `;
}

function renderSubscriptionBillingPanel(stats, customers) {
    const openItems = stats.subscriptionsWithOpenTerms || [];
    const upcomingItems = stats.subscriptionsUpcomingBilling || [];

    if (openItems.length === 0 && upcomingItems.length === 0) return '';

    function subName(sub) {
        const customer = customers?.find(c => c.customerId === sub.customerId);
        return customer?.business?.displayName || customer?.business?.name || sub.customerId || 'Onbekend';
    }

    const openRows = openItems.slice(0, 5).map(({ sub, open, invoiced, expectedDue, pastOpen, currentOpen }) => {
        let amountLines = '';
        if (pastOpen > 0) {
            amountLines += `<p class="recent-list-amount" style="color:#dc2626">${pastOpen} niet gefactureerd</p>`;
        }
        if (currentOpen > 0) {
            amountLines += `<p class="recent-list-amount" style="color:#d97706">1 lopende termijn</p>`;
        }
        return `
        <div class="recent-list-row">
            <div class="min-w-0 flex-1">
                <button onclick="switchTab('subscriptions'); setTimeout(() => showEditSubscription('${sub.id}'), 300);" class="recent-list-label truncate block text-left bg-transparent border-none p-0 cursor-pointer hover:underline">${sub.subscriptionNumber || sub.id}</button>
                <p class="recent-list-sub truncate">${subName(sub)}</p>
            </div>
            <div class="text-right ml-3 shrink-0">
                ${amountLines}
                <p class="recent-list-meta">${invoiced}/${expectedDue} gefactureerd</p>
            </div>
        </div>
    `;
    }).join('');

    const upcomingRows = upcomingItems.slice(0, 5).map(({ sub, daysUntil }) => `
        <div class="recent-list-row">
            <div class="min-w-0 flex-1">
                <button onclick="switchTab('subscriptions'); setTimeout(() => showGenerateInvoiceFromSubscription('${sub.id}'), 300);" class="recent-list-label truncate block text-left bg-transparent border-none p-0 cursor-pointer hover:underline">${sub.subscriptionNumber || sub.id}</button>
                <p class="recent-list-sub truncate">${subName(sub)}</p>
            </div>
            <div class="text-right ml-3 shrink-0">
                <p class="recent-list-amount" style="color:#d97706">${daysUntil === 0 ? 'Vandaag' : `Nog ${daysUntil} dag${daysUntil !== 1 ? 'en' : ''}`}</p>
                <p class="recent-list-meta">Volgende factuurdatum</p>
            </div>
        </div>
    `).join('');

    return `
        <div class="card-compact">
            <div class="card-compact-header">
                <span><i class="fas fa-exclamation-circle" style="color:#dc2626"></i> Abonnement facturatie</span>
                <button onclick="switchTab('subscriptions')" class="link-action">Beheer abonnementen →</button>
            </div>
            ${openItems.length > 0 ? `
                <p class="text-xs font-semibold uppercase tracking-widest mb-2 mt-1" style="color:#dc2626">Openstaande termijnen</p>
                ${openRows}
                ${openItems.length > 5 ? `<p class="text-xs text-gray-400 text-center pt-2">+${openItems.length - 5} meer</p>` : ''}
            ` : ''}
            ${upcomingItems.length > 0 ? `
                ${openItems.length > 0 ? '<div class="border-t border-gray-100 my-3"></div>' : ''}
                <p class="text-xs font-semibold uppercase tracking-widest mb-2" style="color:#d97706">Binnenkort te factureren</p>
                ${upcomingRows}
                ${upcomingItems.length > 5 ? `<p class="text-xs text-gray-400 text-center pt-2">+${upcomingItems.length - 5} meer</p>` : ''}
            ` : ''}
        </div>
    `;
}
