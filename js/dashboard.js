// Dashboard management
async function loadDashboard() {
    try {
        // Fetch all data in parallel
        const [customers, invoices, payments, subscriptions] = await Promise.all([
            getAll('customers'),
            getAll('invoices'),
            getAll('payments'),
            getAll('subscriptions')
        ]);

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

    // Invoice stats with payment calculations (same logic as invoice list)
    const totalInvoices = invoices?.length || 0;
    const safeInvoices = invoices || [];
    const safePayments = payments || [];
    const paymentsByInvoice = safePayments.reduce((map, payment) => {
        if (!payment.invoiceNumber) return map;
        const currentAmount = map.get(payment.invoiceNumber) || 0;
        map.set(payment.invoiceNumber, currentAmount + (payment.amount || 0));
        return map;
    }, new Map());

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

        if (paidForInvoice >= invoiceTotal && invoiceTotal > 0) {
            paidInvoices += 1;
            return;
        }

        if (paidForInvoice > 0) {
            partiallyPaidInvoices += 1;
            return;
        }

        if (isOverdue) {
            overdueInvoices += 1;
            return;
        }

        pendingInvoices += 1;
    });

    // Payment stats
    const totalPayments = safePayments.length || 0;
    const totalPaidAmount = totalPaidFromPayments;
    
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
        totalPaidAmount,
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        expiringSubscriptions,
        monthlyRecurringRevenue
    };
}

function renderDashboard(stats, invoices, payments, subscriptions, customers) {
    const content = document.getElementById('content');

    content.innerHTML = `
        <div class="space-y-8 page-transition">
            <!-- Premium Header -->
            <div class="card-glass">
                <h2 class="text-4xl font-bold text-gray-900">
                    Dashboard
                </h2>
                <p class="text-gray-600 mt-2 font-medium">Overzicht van je RiceDesk administratie</p>
            </div>

            <!-- Main Stats Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                ${createStatCard('Klanten', stats.totalCustomers, 'users', 'bamboo', 'Totaal aantal klanten', 'switchTab("customers")')}
                ${createStatCard('Facturen', stats.totalInvoices, 'file-invoice', 'invoice', 'Totaal aantal facturen', 'switchTab("invoices")')}
                ${createStatCard('Betalingen', stats.totalPayments, 'credit-card', 'financial', 'Totaal aantal betalingen', 'switchTab("payments")')}
                ${createStatCard('Abonnementen', stats.totalSubscriptions, 'sync', 'sunset', 'Totaal aantal abonnementen', 'switchTab("subscriptions")')}
            </div>

            <!-- Financial Overview -->
            <div class="card-premium">
                <h3 class="text-2xl font-bold mb-6 flex items-center">
                    <div class="icon-financial mr-3">
                        <i class="fas fa-euro-sign"></i>
                    </div>
                    Financieel Overzicht
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="financial-card success">
                        <p class="text-sm text-gray-600 mb-2 font-semibold">Totaal Betaald</p>
                        <p class="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                            ${formatCurrency(stats.paidAmount)}
                        </p>
                        <p class="text-xs text-gray-500 mt-3">${stats.paidInvoices} facturen betaald</p>
                    </div>
                    <div class="financial-card warning">
                        <p class="text-sm text-gray-600 mb-2 font-semibold">Openstaand</p>
                        <p class="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">
                            ${formatCurrency(stats.pendingAmount)}
                        </p>
                        <p class="text-xs text-gray-500 mt-3">${stats.pendingInvoices} facturen open</p>
                    </div>
                    <div class="financial-card info">
                        <p class="text-sm text-gray-600 mb-2 font-semibold">MRR</p>
                        <p class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                            ${formatCurrency(stats.monthlyRecurringRevenue)}
                        </p>
                        <p class="text-xs text-gray-500 mt-3">${stats.activeSubscriptions} actieve abonnementen</p>
                    </div>
                </div>
            </div>

            <!-- Alerts & Warnings -->
            ${renderAlerts(stats)}

            <!-- Invoice & Subscription Status -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Invoice Status -->
                <div class="card-premium">
                    <h3 class="text-xl font-bold mb-6 flex items-center">
                        <div class="icon-invoice mr-3">
                            <i class="fas fa-file-invoice"></i>
                        </div>
                        Facturen Status
                    </h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between p-4 bg-green-50 rounded-xl hover-lift">
                            <div class="flex items-center">
                                <div class="icon-bamboo mr-3">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                                <span class="font-semibold">Betaald</span>
                            </div>
                            <span class="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                                ${stats.paidInvoices}
                            </span>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-blue-50 rounded-xl hover-lift">
                            <div class="flex items-center">
                                <div class="icon-sky mr-3">
                                    <i class="fas fa-chart-pie"></i>
                                </div>
                                <span class="font-semibold">Gedeeltelijk Betaald</span>
                            </div>
                            <span class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                                ${stats.partiallyPaidInvoices}
                            </span>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-yellow-50 rounded-xl hover-lift">
                            <div class="flex items-center">
                                <div class="icon-sunset mr-3">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <span class="font-semibold">Openstaand</span>
                            </div>
                            <span class="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">
                                ${stats.pendingInvoices}
                            </span>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-red-50 rounded-xl hover-lift">
                            <div class="flex items-center">
                                <div class="icon-rose mr-3">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                                <span class="font-semibold">Achterstallig</span>
                            </div>
                            <span class="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                                ${stats.overdueInvoices}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Subscription Status -->
                <div class="card-premium">
                    <h3 class="text-xl font-bold mb-6 flex items-center">
                        <div class="icon-rose mr-3">
                            <i class="fas fa-sync"></i>
                        </div>
                        Abonnementen Status
                    </h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between p-4 bg-green-50 rounded-xl hover-lift">
                            <div class="flex items-center">
                                <div class="icon-bamboo mr-3">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                                <span class="font-semibold">Actief</span>
                            </div>
                            <span class="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                                ${stats.activeSubscriptions}
                            </span>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-orange-50 rounded-xl hover-lift">
                            <div class="flex items-center">
                                <div class="icon-sunset mr-3">
                                    <i class="fas fa-hourglass-half"></i>
                                </div>
                                <span class="font-semibold">Verloopt binnenkort</span>
                            </div>
                            <span class="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                                ${stats.expiringSubscriptions}
                            </span>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover-lift">
                            <div class="flex items-center">
                                <div class="icon-wood mr-3">
                                    <i class="fas fa-ban"></i>
                                </div>
                                <span class="font-semibold">Geannuleerd</span>
                            </div>
                            <span class="text-3xl font-bold text-gray-600">
                                ${stats.cancelledSubscriptions}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${renderRecentInvoices(invoices, customers)}
                ${renderRecentPayments(payments)}
            </div>
        </div>
    `;
}

function createStatCard(title, value, icon, color, subtitle, onClickAction = null) {
    const iconColors = {
        bamboo: 'icon-bamboo',
        rose: 'icon-rose',
        sunset: 'icon-sunset',
        wood: 'icon-wood',
        sky: 'icon-sky',
        financial: 'icon-financial',
        invoice: 'icon-invoice'
    };

    const buttonColors = {
        bamboo: 'bamboo',
        rose: 'rose',
        sunset: 'sunset',
        wood: 'wood',
        financial: 'financial',
        invoice: 'invoice'
    };

    const gradientColors = {
        bamboo: 'var(--gradient-bamboo)',
        rose: 'var(--gradient-rose)',
        sunset: 'var(--gradient-sunset)',
        wood: 'var(--gradient-wood)',
        sky: 'linear-gradient(135deg, #4FC3F7 0%, #03A9F4 100%)',
        financial: 'var(--gradient-financial)',
        invoice: 'var(--gradient-invoice)'
    };

    const addButton = onClickAction ? `
        <button onclick='${onClickAction}' 
                class="btn-quick-action-premium ${buttonColors[color] || 'bamboo'}"
                title="Ga naar ${title}">
            <i class="fas fa-arrow-right"></i>
        </button>
    ` : '';

    return `
        <div class="stat-card-premium">
            ${addButton}
            <div class="stat-icon ${iconColors[color] || 'icon-bamboo'}" style="background: ${gradientColors[color] || 'var(--gradient-bamboo)'};">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="stat-label">${title}</div>
            <div class="stat-value" style="background: ${gradientColors[color] || 'var(--gradient-bamboo)'}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${value}</div>
            <div class="text-xs text-gray-500 mt-2">${subtitle}</div>
        </div>
    `;
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
                        <h3 class="font-bold text-lg">Alles loopt goed!</h3>
                        <p class="text-sm mt-1 opacity-90">Er zijn geen actiepunten die aandacht vereisen.</p>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="space-y-4">
            <h3 class="text-2xl font-bold flex items-center">
                <div class="icon-sunset mr-3">
                    <i class="fas fa-bell"></i>
                </div>
                Actiepunten & Waarschuwingen
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
            <h3 class="text-xl font-bold mb-6 flex items-center justify-between">
                <span class="flex items-center">
                    <div class="icon-invoice mr-3">
                        <i class="fas fa-file-invoice"></i>
                    </div>
                    Recente Facturen
                </span>
                <button onclick="switchTab('invoices')" class="btn-ghost text-sm">
                    Bekijk alle →
                </button>
            </h3>
            <div class="space-y-3">
                ${recent.map(invoice => {
                    const statusConfig = {
                        paid: { badge: 'badge-success', icon: 'check' },
                        partially_paid: { badge: 'badge-info', icon: 'chart-pie' },
                        pending: { badge: 'badge-warning', icon: 'clock' },
                        overdue: { badge: 'badge-danger', icon: 'exclamation' }
                    };
                    const config = statusConfig[invoice.status] || statusConfig.pending;

                    const customer = customers?.find(c => c.customerId === invoice.customerId);
                    const customerName = customer?.business?.displayName || customer?.business?.name || invoice.customerId || 'N/A';

                    return `
                        <div class="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-all hover-lift">
                            <div class="flex-1">
                                <p class="font-semibold">${invoice.invoiceNumber}</p>
                                <p class="text-xs text-gray-500 mt-1">${formatDate(invoice.invoiceDate)}</p>
                            </div>
                            <div class="text-right mr-4">
                                <p class="font-bold">${formatCurrency(invoice.totalAmount)}</p>
                                <p class="text-xs text-gray-500 mt-1">${customerName}</p>
                            </div>
                            <span class="badge-premium ${config.badge}">
                                <i class="fas fa-${config.icon}"></i>
                                ${invoice.status}
                            </span>
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
        .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
        .slice(0, 5);

    return `
        <div class="card-premium">
            <h3 class="text-xl font-bold mb-6 flex items-center justify-between">
                <span class="flex items-center">
                    <div class="icon-financial mr-3">
                        <i class="fas fa-credit-card"></i>
                    </div>
                    Recente Betalingen
                </span>
                <button onclick="switchTab('payments')" class="btn-ghost text-sm">
                    Bekijk alle →
                </button>
            </h3>
            <div class="space-y-3">
                ${recent.map(payment => `
                    <div class="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-all hover-lift">
                        <div class="flex-1">
                            <p class="font-semibold">${payment.paymentId}</p>
                            <p class="text-xs text-gray-500 mt-1">${formatDate(payment.paymentDate)}</p>
                        </div>
                        <div class="text-right mr-4">
                            <p class="font-bold text-blue-600">${formatCurrency(payment.amount)}</p>
                            <p class="text-xs text-gray-500 mt-1">${payment.paymentMethod}</p>
                        </div>
                        <div class="badge-premium badge-success">
                            <i class="fas fa-arrow-left"></i>
                            ${payment.invoiceNumber}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}
