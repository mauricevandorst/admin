// Dashboard management
async function loadDashboard() {
    try {
        // Fetch all data in parallel - betalingen zijn nu onderdeel van facturen
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
                            invoiceNumber: invoice.invoiceNumber
                        });
                    });
                }
            });
        }

        // Calculate statistics
        const stats = calculateStats(customers, invoices, payments, subscriptions);

        // Render dashboard
        renderDashboard(stats, invoices, payments, subscriptions, customers);
    } catch (error) {
        showError(error.message);
    }
}

function calculateStats(customers, invoices, payments, subscriptions) {
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
        overduePressure
    };
}

function renderDashboard(stats, invoices, payments, subscriptions, customers) {
    const content = document.getElementById('content');
    const now = new Date();
    const greeting = now.getHours() < 12 ? 'Goedemorgen' : now.getHours() < 18 ? 'Goedemiddag' : 'Goedenavond';
    const overdueAmount = stats.pendingAmount * (stats.overduePressure / 100);

    content.innerHTML = `
        <div class="space-y-7 page-transition dashboard-saas">
            <section class="dashboard-hero">
                <div class="dashboard-hero__content">
                    <p class="dashboard-eyebrow">${greeting}, team RiceDesk</p>
                    <h2 class="dashboard-title">Realtime overzicht van cashflow en groei</h2>
                    <p class="dashboard-subtitle">
                        Laatste update op ${formatDate(now.toISOString())}. Focus op inning, terugkerende omzet en klantbehoud.
                    </p>
                </div>
                <div class="dashboard-hero__actions">
                    <button onclick="switchTab('invoices')" class="btn-bamboo">
                        <i class="fas fa-file-invoice mr-2"></i>Facturen beheren
                    </button>
                    <button onclick="switchTab('reports')" class="btn-ghost">
                        <i class="fas fa-chart-line mr-2"></i>Rapporten openen
                    </button>
                </div>
            </section>

            <section class="dashboard-kpi-grid">
                ${createSaasMetricCard('Klanten', stats.totalCustomers, 'users', 'Actieve klantrelaties', 'switchTab("customers")')}
                ${createSaasMetricCard('Facturen', stats.totalInvoices, 'file-invoice', `${stats.pendingInvoices + stats.overdueInvoices} vragen opvolging`, 'switchTab("invoices")')}
                ${createSaasMetricCard('Betalingen', stats.totalPayments, 'credit-card', `Inningsratio ${formatPercent(stats.collectionRate)}`, 'switchTab("payments")')}
                ${createSaasMetricCard('Abonnementen', stats.totalSubscriptions, 'sync', `${stats.activeSubscriptions} actief`, 'switchTab("subscriptions")')}
            </section>

            ${renderAlerts(stats)}

            <section class="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div class="card-premium xl:col-span-3">
                    <h3 class="text-2xl font-bold mb-6 flex items-center">
                        <div class="icon-financial mr-3">
                            <i class="fas fa-euro-sign"></i>
                        </div>
                        Financiele Performance
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="financial-card success">
                            <p class="text-sm text-gray-600 mb-2 font-semibold">Totaal betaald</p>
                            <p class="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                                ${formatCurrency(stats.paidAmount)}
                            </p>
                            <p class="text-xs text-gray-500 mt-3">${stats.paidInvoices} facturen volledig betaald</p>
                        </div>
                        <div class="financial-card warning">
                            <p class="text-sm text-gray-600 mb-2 font-semibold">Openstaand saldo</p>
                            <p class="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">
                                ${formatCurrency(stats.pendingAmount)}
                            </p>
                            <p class="text-xs text-gray-500 mt-3">${stats.pendingInvoices + stats.overdueInvoices} facturen nog open</p>
                        </div>
                        <div class="financial-card info">
                            <p class="text-sm text-gray-600 mb-2 font-semibold">MRR</p>
                            <p class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                                ${formatCurrency(stats.monthlyRecurringRevenue)}
                            </p>
                            <p class="text-xs text-gray-500 mt-3">${stats.activeSubscriptions} actieve abonnementen</p>
                        </div>
                    </div>
                    <div class="dashboard-meter-list mt-6">
                        ${createMeterRow('Inningsratio', stats.collectionRate, 'success')}
                        ${createMeterRow('Actieve abonnementen', stats.activeSubscriptionRate, 'info')}
                        ${createMeterRow('Achterstanddruk', stats.overduePressure, 'warning')}
                    </div>
                </div>

                <div class="card-premium xl:col-span-2">
                    <h3 class="text-xl font-bold mb-5 flex items-center">
                        <div class="icon-sky mr-3">
                            <i class="fas fa-bullseye"></i>
                        </div>
                        Focus Vandaag
                    </h3>
                    <div class="dashboard-focus-list">
                        <div class="dashboard-focus-item">
                            <p class="dashboard-focus-title">Achterstallig risico</p>
                            <p class="dashboard-focus-value">${formatCurrency(overdueAmount)}</p>
                            <p class="dashboard-focus-note">${stats.overdueInvoices} facturen met directe prioriteit</p>
                        </div>
                        <div class="dashboard-focus-item">
                            <p class="dashboard-focus-title">Openstaande facturen</p>
                            <p class="dashboard-focus-value">${stats.pendingInvoices + stats.overdueInvoices}</p>
                            <p class="dashboard-focus-note">Plan opvolging voor snellere inning</p>
                        </div>
                        <div class="dashboard-focus-item">
                            <p class="dashboard-focus-title">Verloopt binnen 30 dagen</p>
                            <p class="dashboard-focus-value">${stats.expiringSubscriptions}</p>
                            <p class="dashboard-focus-note">Behoud omzet via proactieve verlenging</p>
                        </div>
                    </div>
                    <button onclick="switchTab('subscriptions')" class="btn-wood w-full mt-6">
                        <i class="fas fa-arrow-trend-up mr-2"></i>Werk retentie bij
                    </button>
                </div>
            </section>

            <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="card-premium">
                    <h3 class="text-xl font-bold mb-6 flex items-center">
                        <div class="icon-invoice mr-3">
                            <i class="fas fa-file-invoice"></i>
                        </div>
                        Factuur Pipeline
                    </h3>
                    <div class="dashboard-pipeline">
                        ${createPipelineRow('Betaald', stats.paidInvoices, 'success')}
                        ${createPipelineRow('Gedeeltelijk betaald', stats.partiallyPaidInvoices, 'info')}
                        ${createPipelineRow('Openstaand', stats.pendingInvoices, 'warning')}
                        ${createPipelineRow('Achterstallig', stats.overdueInvoices, 'danger')}
                    </div>
                </div>

                <div class="card-premium">
                    <h3 class="text-xl font-bold mb-6 flex items-center">
                        <div class="icon-rose mr-3">
                            <i class="fas fa-sync"></i>
                        </div>
                        Abonnementen Gezondheid
                    </h3>
                    <div class="dashboard-pipeline">
                        ${createPipelineRow('Actief', stats.activeSubscriptions, 'success')}
                        ${createPipelineRow('Verloopt binnenkort', stats.expiringSubscriptions, 'warning')}
                        ${createPipelineRow('Geannuleerd', stats.cancelledSubscriptions, 'neutral')}
                    </div>
                </div>
            </section>

            <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${renderRecentInvoices(invoices, customers)}
                ${renderRecentPayments(payments)}
            </section>
        </div>
    `;
}

function createSaasMetricCard(title, value, icon, subtitle, onClickAction = null) {
    return `
        <button class="saas-kpi-card" ${onClickAction ? `onclick='${onClickAction}'` : ''}>
            <div class="saas-kpi-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="saas-kpi-content">
                <p class="saas-kpi-title">${title}</p>
                <p class="saas-kpi-value">${value}</p>
                <p class="saas-kpi-subtitle">${subtitle}</p>
            </div>
            <i class="fas fa-arrow-right saas-kpi-arrow"></i>
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
            title: 'Achterstallige Facturen',
            message: `Je hebt ${stats.overdueInvoices} achterstallige factuur${stats.overdueInvoices > 1 ? 'en' : ''} ter waarde van ongeveer ${formatCurrency(stats.pendingAmount / (stats.pendingInvoices || 1) * stats.overdueInvoices)}.`,
            action: 'Bekijk Facturen',
            actionFn: 'switchTab("invoices")'
        });
    }

    if (stats.expiringSubscriptions > 0) {
        alerts.push({
            type: 'warning',
            icon: 'clock',
            title: 'Verlopende Abonnementen',
            message: `${stats.expiringSubscriptions} abonnement${stats.expiringSubscriptions > 1 ? 'en' : ''} verlop${stats.expiringSubscriptions > 1 ? 'en' : 't'} binnen 30 dagen.`,
            action: 'Bekijk Abonnementen',
            actionFn: 'switchTab("subscriptions")'
        });
    }

    if (stats.pendingInvoices > 10) {
        alerts.push({
            type: 'info',
            icon: 'info-circle',
            title: 'Veel Openstaande Facturen',
            message: `Je hebt ${stats.pendingInvoices} openstaande facturen. Overweeg om herinneringen te versturen.`,
            action: 'Bekijk Facturen',
            actionFn: 'switchTab("invoices")'
        });
    }

    if (alerts.length === 0) {
        return `
            <div class="alert-bamboo success">
                <div class="flex items-center">
                    <div class="icon-bamboo mr-4">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg">Alles loopt goed</h3>
                        <p class="text-sm mt-1 opacity-90">Er zijn geen actiepunten die aandacht vereisen.</p>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="space-y-4">
            <h3 class="text-xl font-bold flex items-center">
                <div class="icon-sunset mr-3">
                    <i class="fas fa-bell"></i>
                </div>
                Actiepunten en Waarschuwingen
            </h3>
            ${alerts.map(alert => {
                const configs = {
                    error: { class: 'alert-bamboo error', icon: 'icon-rose', btn: 'btn-cherry' },
                    warning: { class: 'alert-bamboo warning', icon: 'icon-sunset', btn: 'btn-sunset' },
                    info: { class: 'alert-bamboo success', icon: 'icon-sky', btn: 'btn-bamboo' }
                };
                const config = configs[alert.type];

                return `
                    <div class="${config.class}">
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex items-start flex-1 gap-4">
                                <div class="${config.icon}">
                                    <i class="fas fa-${alert.icon}"></i>
                                </div>
                                <div class="flex-1">
                                    <h4 class="font-bold text-lg mb-1">${alert.title}</h4>
                                    <p class="text-sm opacity-90">${alert.message}</p>
                                </div>
                            </div>
                            <button onclick="${alert.actionFn}" class="${config.btn}">
                                ${alert.action}
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderRecentInvoices(invoices, customers) {
    if (!invoices || invoices.length === 0) {
        return `
            <div class="card-premium text-center py-8">
                <div class="icon-invoice mx-auto mb-4">
                    <i class="fas fa-file-invoice"></i>
                </div>
                <h3 class="text-xl font-bold mb-2">Recente Facturen</h3>
                <p class="text-gray-500">Geen facturen beschikbaar</p>
            </div>
        `;
    }

    const recent = [...invoices]
        .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
        .slice(0, 5);

    return `
        <div class="card-premium">
            <h3 class="text-xl font-bold mb-6 flex items-center justify-between dashboard-recent-header">
                <span class="flex items-center">
                    <div class="icon-invoice mr-3">
                        <i class="fas fa-file-invoice"></i>
                    </div>
                    Recente Facturen
                </span>
                <button onclick="switchTab('invoices')" class="btn-ghost text-sm dashboard-recent-all-btn">
                    Bekijk alle <i class="fas fa-arrow-right ml-1"></i>
                </button>
            </h3>
            <div class="space-y-3">
                ${recent.map(invoice => {
                    const statusConfig = {
                        paid: { badge: 'badge-success', icon: 'check', label: 'Betaald' },
                        partially_paid: { badge: 'badge-info', icon: 'chart-pie', label: 'Gedeeltelijk' },
                        pending: { badge: 'badge-warning', icon: 'clock', label: 'Openstaand' },
                        overdue: { badge: 'badge-danger', icon: 'exclamation', label: 'Achterstallig' }
                    };
                    const config = statusConfig[invoice.status] || statusConfig.pending;

                    const customer = customers?.find(c => c.customerId === invoice.customerId);
                    const customerName = customer?.business?.displayName || customer?.business?.name || invoice.customerId || 'N/A';

                    return `
                        <div class="p-4 hover:bg-gray-50 rounded-xl transition-all hover-lift dashboard-recent-row flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <i class="fas fa-file-invoice text-gray-400 text-sm"></i>
                                    <p class="font-semibold text-gray-900 break-words">${invoice.invoiceNumber}</p>
                                </div>
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-user text-gray-400 text-xs"></i>
                                    <p class="text-xs text-gray-500 break-words">${customerName}</p>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-3 md:justify-end md:gap-4">
                                <div class="text-left md:text-right dashboard-recent-meta">
                                    <p class="font-bold text-lg">${formatCurrency(invoice.totalAmount)}</p>
                                    <p class="text-xs text-gray-500 mt-1">${formatDate(invoice.invoiceDate)}</p>
                                </div>
                                <span class="badge-premium ${config.badge} dashboard-recent-badge shrink-0">
                                    <i class="fas fa-${config.icon}"></i>
                                    ${config.label}
                                </span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderRecentPayments(payments) {
    if (!payments || payments.length === 0) {
        return `
            <div class="card-premium text-center py-8">
                <div class="icon-financial mx-auto mb-4">
                    <i class="fas fa-credit-card"></i>
                </div>
                <h3 class="text-xl font-bold mb-2">Recente Betalingen</h3>
                <p class="text-gray-500">Geen betalingen beschikbaar</p>
            </div>
        `;
    }

    const recent = [...payments]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    return `
        <div class="card-premium">
            <h3 class="text-xl font-bold mb-6 flex items-center justify-between dashboard-recent-header">
                <span class="flex items-center">
                    <div class="icon-financial mr-3">
                        <i class="fas fa-credit-card"></i>
                    </div>
                    Recente Betalingen
                </span>
                <button onclick="switchTab('payments')" class="btn-ghost text-sm dashboard-recent-all-btn">
                    Bekijk alle <i class="fas fa-arrow-right ml-1"></i>
                </button>
            </h3>
            <div class="space-y-3">
                ${recent.map(payment => `
                    <div class="p-4 hover:bg-gray-50 rounded-xl transition-all hover-lift dashboard-recent-row flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <i class="fas fa-file-invoice text-gray-400 text-sm"></i>
                                <p class="font-semibold text-gray-900 break-words">${payment.invoiceNumber || 'N/A'}</p>
                            </div>
                            <p class="text-xs text-gray-500">${formatDate(payment.date)}</p>
                        </div>
                        <div class="text-left md:text-right dashboard-recent-meta">
                            <p class="font-bold text-green-600 text-lg">${formatCurrency(payment.amount)}</p>
                            <div class="flex items-center justify-end gap-1 mt-1 dashboard-recent-method">
                                <i class="fas fa-${payment.method === 'bank_transfer' ? 'university' : payment.method === 'credit_card' ? 'credit-card' : payment.method === 'cash' ? 'money-bill-wave' : 'wallet'} text-xs text-gray-400"></i>
                                <p class="text-xs text-gray-500">${payment.method === 'bank_transfer' ? 'Bankoverschrijving' : payment.method === 'credit_card' ? 'Creditcard' : payment.method === 'cash' ? 'Contant' : payment.method || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}
