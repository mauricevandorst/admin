// Dashboard management
async function loadDashboard() {
    try {
        // Gebruik de geoptimaliseerde dashboard API endpoint
        const dashboardData = await apiRequest('/dashboard');

        // Haal ook de facturen op om het correcte openstaande bedrag te berekenen
        // (API openTotal houdt geen rekening met deels betaalde facturen)
        const invoices = await getAll('invoices');

        // Bereken het werkelijke openstaande bedrag
        const actualOpenStats = calculateActualOpenAmount(invoices);

        // Render dashboard met API data en gecorrigeerde openstaande bedragen
        renderDashboardFromAPI(dashboardData, actualOpenStats);
    } catch (error) {
        showError(error.message);
    }
}

// Bereken het werkelijke openstaande bedrag rekening houdend met betalingen
function calculateActualOpenAmount(invoices) {
    const safeInvoices = invoices || [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Build a map of total paid per invoice number from payments within invoices
    const paymentsByInvoice = new Map();
    safeInvoices.forEach(invoice => {
        if (invoice.payments && invoice.payments.length > 0) {
            const totalPaid = invoice.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
            paymentsByInvoice.set(invoice.invoiceNumber, totalPaid);
        }
    });

    let openAmount = 0;
    let openCount = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let incomingNext30Days = 0;
    let incomingNext90Days = 0;
    let partialAmountPaid = 0;
    let totalThisYear = 0;
    const currentYear = now.getFullYear();

    safeInvoices.forEach((invoice) => {
        const invoiceTotal = invoice.totalAmount || 0;
        const paidForInvoice = paymentsByInvoice.get(invoice.invoiceNumber) || 0;
        const remainingForInvoice = Math.max(invoiceTotal - paidForInvoice, 0);
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
        const isOverdue = dueDate instanceof Date && !Number.isNaN(dueDate.getTime()) && dueDate < now;

        // Tel mee in het jaartotaal (betaald + onbetaald, niet geannuleerd)
        if (invoice.status !== 'cancelled' && invoice.invoiceDate) {
            const invoiceYear = new Date(invoice.invoiceDate).getFullYear();
            if (invoiceYear === currentYear) {
                totalThisYear += invoiceTotal;
            }
        }

        // Skip volledig betaalde en geannuleerde facturen
        if (remainingForInvoice === 0 || invoice.status === 'cancelled' || invoice.status === 'paid') {
            return;
        }

        // Tel deelbetaling mee als ontvangen
        if (paidForInvoice > 0) {
            partialAmountPaid += paidForInvoice;
        }

        if (isOverdue) {
            overdueAmount += remainingForInvoice;
            overdueCount += 1;
        } else {
            openAmount += remainingForInvoice;
            openCount += 1;

            // Bereken inkomend geld op basis van vervaldatum
            if (dueDate) {
                if (dueDate <= thirtyDaysFromNow) {
                    incomingNext30Days += remainingForInvoice;
                }
                if (dueDate <= ninetyDaysFromNow) {
                    incomingNext90Days += remainingForInvoice;
                }
            } else {
                // Facturen zonder vervaldatum tellen ook mee als inkomend
                incomingNext30Days += remainingForInvoice;
                incomingNext90Days += remainingForInvoice;
            }
        }
    });

    return {
        openAmount: openAmount,
        openCount: openCount,
        overdueAmount: overdueAmount,
        overdueCount: overdueCount,
        totalOpenAmount: openAmount + overdueAmount,
        totalOpenCount: openCount + overdueCount,
        incomingNext30Days: incomingNext30Days,
        incomingNext90Days: incomingNext90Days,
        partialAmountPaid: partialAmountPaid,
        totalThisYear: totalThisYear
    };
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
    let overdueInvoicesAmount = 0;
    let invoicesDueSoon = 0;
    let invoicesDueSoonAmount = 0;
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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

        // Facturen met €0 zijn automatisch betaald (hoeven niet betaald te worden)
        if (invoiceTotal === 0 && invoice.status !== 'cancelled') {
            actualStatus = 'paid';
        } else if (paidForInvoice >= invoiceTotal && invoiceTotal > 0) {
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
            overdueInvoicesAmount += remainingForInvoice;
        } else {
            pendingInvoices += 1;
            if (dueDate && dueDate >= now && dueDate <= sevenDaysFromNow) {
                invoicesDueSoon++;
                invoicesDueSoonAmount += remainingForInvoice;
            }
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
        .reduce((sum, s) => sum + (s.monthlyPrice || 0), 0) || 0;

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

    const invoicesByOrderId = {};
    safeInvoices.forEach(inv => {
        if (inv.orderId) {
            if (!invoicesByOrderId[inv.orderId]) invoicesByOrderId[inv.orderId] = [];
            invoicesByOrderId[inv.orderId].push(inv);
        }
    });
    const openOrders = safeOrders.filter(o => {
        if (o.status === 'cancelled') return false;
        if (o.status !== 'invoiced') return true;
        const linked = invoicesByOrderId[o.id] || [];
        if (linked.length === 0) return true;
        return !linked.every(inv => {
            const paid = (inv.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
            return inv.totalAmount <= 0 || paid >= inv.totalAmount;
        });
    }).length;

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

    const openSubscriptionTermsCount = subscriptionsWithOpenTerms.reduce((sum, x) => sum + x.open, 0);
    const openSubscriptionsCount = subscriptionsWithOpenTerms.length;

    return {
        totalCustomers,
        totalInvoices,
        paidInvoices,
        partiallyPaidInvoices,
        pendingInvoices,
        overdueInvoices,
        overdueInvoicesAmount,
        invoicesDueSoon,
        invoicesDueSoonAmount,
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
        openOrders,
        draftOrders,
        confirmedOrders,
        invoicedOrders,
        cancelledOrders,
        pendingOrderAmount,
        openSubscriptionTermsCount,
        openSubscriptionsCount,
        subscriptionsWithOpenTerms,
        subscriptionsUpcomingBilling
    };
}

// Nieuwe functie: Render dashboard met API data
function renderDashboardFromAPI(data, actualOpenStats) {
    const content = document.getElementById('content');
    const now = new Date();

    // Gebruik de werkelijke openstaande bedragen indien beschikbaar, anders fallback naar API data
    const correctedOpenTotal = actualOpenStats ? actualOpenStats.totalOpenAmount : data.invoices.openTotal;
    const correctedOpenCount = actualOpenStats ? actualOpenStats.totalOpenCount : data.invoices.openCount;
    const correctedOverdueTotal = actualOpenStats ? actualOpenStats.overdueAmount : data.invoices.overdueTotal;
    const correctedOverdueCount = actualOpenStats ? actualOpenStats.overdueCount : data.invoices.overdueCount;
    const correctedPendingTotal = actualOpenStats ? actualOpenStats.openAmount : (data.invoices.openTotal - data.invoices.overdueTotal);
    const correctedPendingCount = actualOpenStats ? actualOpenStats.openCount : (data.invoices.openCount - data.invoices.overdueCount);
    const correctedIncoming30Days = actualOpenStats ? actualOpenStats.incomingNext30Days : (data.cashflow?.incomingNext30Days || 0);
    const correctedIncoming90Days = actualOpenStats ? actualOpenStats.incomingNext90Days : (data.expectedRevenue?.next90Days || 0);
    const correctedNetCashflow = correctedIncoming30Days - correctedOverdueTotal;
    // Ontvangen bedrag inclusief deelbetalingen op open facturen
    const totalPaidAmount = data.invoices.paidTotal + (actualOpenStats?.partialAmountPaid || 0);

    // Map API data naar stats object (voor compatibiliteit met bestaande render functies)
    const stats = {
        totalCustomers: data.customers.totalCount,
        totalInvoices: data.invoices.totalCount,
        paidInvoices: data.invoices.paidCount,
        partiallyPaidInvoices: 0, // Niet beschikbaar in API
        pendingInvoices: correctedPendingCount,
        overdueInvoices: correctedOverdueCount,
        overdueInvoicesAmount: correctedOverdueTotal,
        invoicesDueSoon: 0, // TODO: kan toegevoegd worden aan API
        invoicesDueSoonAmount: 0,
        totalInvoiceAmount: totalPaidAmount + correctedOpenTotal,
        paidAmount: totalPaidAmount,
        pendingAmount: correctedOpenTotal,
        totalPayments: 0,
        totalSubscriptions: data.subscriptions.activeCount,
        activeSubscriptions: data.subscriptions.activeCount,
        cancelledSubscriptions: 0,
        expiringSubscriptions: 0,
        monthlyRecurringRevenue: data.subscriptions.monthlyRecurringRevenue,
        annualRecurringRevenue: data.subscriptions.annualRecurringRevenue,
        averageRevenuePerSubscription: data.subscriptions.averageRevenuePerSubscription,
        collectionRate: (totalPaidAmount + correctedOpenTotal) > 0
            ? (totalPaidAmount / (totalPaidAmount + correctedOpenTotal)) * 100
            : 0,
        paidInvoiceRate: data.invoices.totalCount > 0
            ? (data.invoices.paidCount / data.invoices.totalCount) * 100
            : 0,
        activeSubscriptionRate: 100,
        overduePressure: correctedOpenCount > 0
            ? (correctedOverdueCount / correctedOpenCount) * 100
            : 0,
        totalOrders: 0,
        openOrders: 0,
        draftOrders: 0,
        confirmedOrders: 0,
        invoicedOrders: 0,
        cancelledOrders: 0,
        pendingOrderAmount: 0,
        openSubscriptionTermsCount: data.subscriptions.overdueSubscriptions?.count || 0,
        subscriptionsWithOpenTerms: [],
        subscriptionsUpcomingBilling: data.subscriptions.upcomingPayments?.items || [],
        // Nieuwe stats voor de uitgebreide dashboard functionaliteit
        expectedRevenue30Days: data.expectedRevenue?.next30Days || 0,
        expectedRevenue90Days: data.expectedRevenue?.next90Days || 0,
        yearlyProjection: data.expectedRevenue?.yearlyProjection || 0,
        netCashflow30Days: data.cashflow?.netExpectedCashflow || 0,
        averageCustomerValue: data.customerValue?.averageMonthlyValuePerCustomer || 0,
        lifetimeValue: data.customerValue?.estimatedLifetimeValue || 0,
        potentialUpsellCustomers: data.customerValue?.potentialUpsellCustomers || 0
    };

    content.innerHTML = `
        <div class="space-y-4 page-transition">

            <!-- Compact header -->
            <div class="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <p class="text-xs text-gray-400 uppercase tracking-widest mb-0.5">${formatDate(now.toISOString())}</p>
                    <h2 class="text-xl font-bold text-gray-900 leading-tight">Dashboard</h2>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button onclick="showCreateCustomer()" class="btn-sm-success">
                        <i class="fas fa-user-plus"></i> Nieuwe klant
                    </button>
                    <button onclick="switchTab('invoices')" class="btn-sm-invoice">
                        <i class="fas fa-file-invoice"></i> Verkoopfacturen
                    </button>
                    <button onclick="switchTab('purchase-invoices')" class="btn-sm-red">
                        <i class="fas fa-file-invoice-dollar"></i> Inkoopfacturen
                    </button>
                    <button onclick="switchTab('orders')" class="btn-sm-sunset">
                        <i class="fas fa-shopping-cart"></i> Orders
                    </button>
                    <button onclick="switchTab('customers')" class="btn-sm-gold">
                        <i class="fas fa-users"></i> Klanten
                    </button>
                    <button onclick="switchTab('suppliers')" class="btn-sm-wood">
                        <i class="fas fa-truck"></i> Leveranciers
                    </button>
                    <button onclick="switchTab('subscriptions')" class="btn-sm-rose">
                        <i class="fas fa-sync"></i> Abonnementen
                    </button>
                </div>
            </div>

            <!-- KPI strip met verbeterde metrics -->
            <div class="kpi-strip">
                ${createCompactKpiCard('Klanten', data.customers.totalCount, "switchTab('customers')", data.customers.activeCount + ' met abonnement', 'fa-users')}
                ${createCompactKpiCard('Facturen', data.invoices.totalCount, "switchTab('invoices')", correctedOpenCount + ' open', 'fa-file-invoice')}
                ${createCompactKpiCard('Verwacht komende maand', formatCurrency(data.expectedRevenue?.next30Days || 0), "switchTab('subscriptions')", 'Uit abonnementen', 'fa-calendar-check')}
                ${createCompactKpiCard('Maandinkomen', formatCurrency(data.subscriptions.monthlyRecurringRevenue), "switchTab('subscriptions')", 'Jaar: ' + formatCurrency(data.subscriptions.annualRecurringRevenue), 'fa-chart-line')}
                ${createCompactKpiCard('Abonnementen', data.subscriptions.activeCount, "switchTab('subscriptions')", 'Gemiddeld ' + formatCurrency(data.subscriptions.averageRevenuePerSubscription) + '/mnd', 'fa-sync')}
            </div>

            <!-- Alerts (verbeterd met API data) -->
            ${renderAlertsFromAPI(data)}

            <!-- Main grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <!-- Financieel (verbeterd) -->
                <div class="card-compact">
                    <div class="card-compact-header">
                        <span>Financieel Overzicht</span>
                        <button onclick="switchTab('invoices')" class="link-action">Bekijk facturen →</button>
                    </div>
                    <div class="financial-summary">
                        <div class="fin-item">
                            <p class="fin-label">Ontvangen</p>
                            <p class="fin-value" style="color:#15803d">${formatCurrency(totalPaidAmount)}</p>
                            <p class="fin-note">${data.invoices.paidCount} volledig betaalde facturen</p>
                        </div>
                        <div class="fin-item">
                            <p class="fin-label">Verwacht (dit jaar)</p>
                            <p class="fin-value" style="color:#059669">${formatCurrency(actualOpenStats?.totalThisYear || 0)}</p>
                            <p class="fin-note">Alle facturen van ${new Date().getFullYear()} bij elkaar</p>
                        </div>
                        <div class="fin-item">
                            <p class="fin-label">Openstaand</p>
                            <p class="fin-value" style="color:#b45309">${formatCurrency(correctedOpenTotal)}</p>
                            <p class="fin-note">${correctedOpenCount} openstaande facturen</p>
                        </div>
                        <div class="fin-item">
                            <p class="fin-label">Achterstallig</p>
                            <p class="fin-value" style="color:#dc2626">${formatCurrency(correctedOverdueTotal)}</p>
                            <p class="fin-note">${correctedOverdueCount} achterstallige facturen</p>
                        </div>
                        <div class="fin-item">
                            <p class="fin-label">Vaste maandinkomen</p>
                            <p class="fin-value" style="color:#1d4ed8">${formatCurrency(data.subscriptions.monthlyRecurringRevenue)}</p>
                            <p class="fin-note">${data.subscriptions.activeCount} actieve abonnementen</p>
                        </div>
                    </div>
                    <div class="mt-4 space-y-2">
                        ${createMeterRow('Betaalde facturen', stats.paidInvoiceRate, 'success')}
                        ${createMeterRow('Achterstallige facturen', stats.overduePressure, 'warning')}
                    </div>
                </div>

                <!-- Abonnementen overzicht -->
                <div class="card-compact">
                    <div class="card-compact-header">
                        <span>Abonnementen overzicht</span>
                        <button onclick="switchTab('subscriptions')" class="link-action">Bekijk abonnementen →</button>
                    </div>
                    <div class="financial-summary">
                        <div class="fin-item">
                            <p class="fin-label">Vaste maandinkomen</p>
                            <p class="fin-value" style="color:#15803d">${formatCurrency(data.subscriptions.monthlyRecurringRevenue)}</p>
                            <p class="fin-note">${data.subscriptions.activeCount} actieve abonnementen</p>
                        </div>
                        <div class="fin-item">
                            <p class="fin-label">Vaste jaarinkomen</p>
                            <p class="fin-value" style="color:#7c3aed">${formatCurrency(data.subscriptions.annualRecurringRevenue)}</p>
                            <p class="fin-note">Wat de abonnementen dit jaar opleveren</p>
                        </div>
                        <div class="fin-item">
                            <p class="fin-label">Verwacht komende maand</p>
                            <p class="fin-value" style="color:#059669">${formatCurrency(data.expectedRevenue?.next30Days || 0)}</p>
                            <p class="fin-note">Inkomsten uit abonnementen</p>
                        </div>
                        <div class="fin-item">
                            <p class="fin-label">Verwacht komende 3 maanden</p>
                            <p class="fin-value" style="color:#1d4ed8">${formatCurrency(data.expectedRevenue?.next90Days || 0)}</p>
                            <p class="fin-note">Inkomsten uit abonnementen</p>
                        </div>
                        <div class="fin-item">
                            <p class="fin-label">Verwacht dit hele jaar</p>
                            <p class="fin-value" style="color:#7c3aed">${formatCurrency(data.expectedRevenue?.yearlyProjection || 0)}</p>
                            <p class="fin-note">Schatting op basis van huidige abonnementen</p>
                        </div>
                        <div class="fin-item">
                            <p class="fin-label">Gemiddeld per abonnement</p>
                            <p class="fin-value" style="color:#ea580c">${formatCurrency(data.subscriptions.averageRevenuePerSubscription)}</p>
                            <p class="fin-note">Wat een abonnement gemiddeld per maand oplevert</p>
                        </div>
                    </div>
                    <div class="mt-4">
                        <p class="text-xs font-semibold text-gray-500 mb-2">WAT MOET ER NOG GEBEUREN</p>
                        <div class="space-y-1 text-xs">
                            ${(data.subscriptions.overdueSubscriptions?.count || 0) > 0 ? `
                                <div class="flex items-center justify-between gap-2 p-2 bg-red-50 rounded border-l-2 border-red-500">
                                    <span class="text-red-700"><i class="fas fa-exclamation-circle mr-1"></i>${data.subscriptions.overdueSubscriptions.count} abonnement${data.subscriptions.overdueSubscriptions.count > 1 ? 'en' : ''} nog te factureren (${formatCurrency(data.subscriptions.overdueSubscriptions.totalAmount)})</span>
                                    <button onclick="switchTab('subscriptions')" class="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium shrink-0">Bekijk →</button>
                                </div>
                            ` : ''}
                            ${(data.subscriptions.upcomingPayments?.count || 0) > 0 ? `
                                <div class="flex items-center justify-between gap-2 p-2 bg-blue-50 rounded border-l-2 border-blue-500">
                                    <span class="text-blue-700"><i class="fas fa-calendar-check mr-1"></i>${data.subscriptions.upcomingPayments.count} abonnement${data.subscriptions.upcomingPayments.count > 1 ? 'en' : ''} binnenkort te factureren (${formatCurrency(data.subscriptions.upcomingPayments.totalAmount)})</span>
                                    <button onclick="switchTab('subscriptions')" class="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium shrink-0">Bekijk →</button>
                                </div>
                            ` : ''}
                            ${(data.subscriptions.overdueSubscriptions?.count || 0) === 0 && (data.subscriptions.upcomingPayments?.count || 0) === 0 ? `
                                <div class="flex items-center gap-2 text-green-600 p-2">
                                    <i class="fas fa-check-circle"></i>
                                    <span>Alle abonnementen zijn up-to-date</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Aanvullende KPI sectie -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                <!-- Omzet Analyse -->
                <div class="card-compact">
                    <div class="card-compact-header">
                        <span>Omzet Analyse</span>
                        <i class="fas fa-chart-line text-gray-400"></i>
                    </div>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Maandinkomen (nu)</span>
                            <span class="font-bold text-green-600">${formatCurrency(data.subscriptions.monthlyRecurringRevenue)}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Jaarinkomen (schatting)</span>
                            <span class="font-bold text-purple-600">${formatCurrency(data.subscriptions.annualRecurringRevenue)}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Verwacht komende maand</span>
                            <span class="font-bold text-blue-600">${formatCurrency(data.expectedRevenue?.next30Days || 0)}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Groei potentieel</span>
                            <span class="font-bold text-orange-600">${formatCurrency((data.customerValue?.potentialUpsellCustomers || 0) * (data.customerValue?.averageMonthlyValuePerCustomer || 0))}</span>
                        </div>
                        <div class="pt-2 border-t">
                            <div class="text-xs text-gray-500 mb-1">Groei dit jaar</div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" style="width: 65%"></div>
                            </div>
                            <div class="text-xs text-gray-500 mt-1">65% van jaardoel</div>
                        </div>
                    </div>
                </div>

                <!-- Klant Inzichten -->
                <div class="card-compact">
                    <div class="card-compact-header">
                        <span>Klant Inzichten</span>
                        <i class="fas fa-users text-gray-400"></i>
                    </div>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Totaal klanten</span>
                            <span class="font-bold">${data.customers.totalCount}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Met abonnement</span>
                            <span class="font-bold text-green-600">${data.customers.activeCount}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Zonder abonnement</span>
                            <span class="font-bold text-orange-600">${data.customers.withoutSubscription}</span>
                        </div>
                        <div class="pt-2 border-t">
                            <div class="text-xs text-gray-500 mb-1">Conversie ratio</div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full" 
                                     style="width: ${data.customers.totalCount > 0 ? (data.customers.activeCount / data.customers.totalCount * 100) : 0}%"></div>
                            </div>
                            <div class="text-xs text-gray-500 mt-1">${data.customers.totalCount > 0 ? Math.round(data.customers.activeCount / data.customers.totalCount * 100) : 0}% heeft abonnement</div>
                        </div>
                    </div>
                </div>

                <!-- Risico Overzicht -->
                <div class="card-compact">
                    <div class="card-compact-header">
                        <span>Risico Overzicht</span>
                        <i class="fas fa-exclamation-triangle text-gray-400"></i>
                    </div>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Achterstallig bedrag</span>
                            <span class="font-bold text-red-600">${formatCurrency(correctedOverdueTotal)}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Risico percentage</span>
                            <span class="font-bold ${stats.overduePressure > 20 ? 'text-red-600' : stats.overduePressure > 10 ? 'text-orange-600' : 'text-green-600'}">${Math.round(stats.overduePressure)}%</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Incasso effectiviteit</span>
                            <span class="font-bold ${stats.collectionRate > 90 ? 'text-green-600' : stats.collectionRate > 70 ? 'text-orange-600' : 'text-red-600'}">${Math.round(stats.collectionRate)}%</span>
                        </div>
                        <div class="pt-2 border-t">
                            ${stats.overduePressure > 15 ? `
                                <div class="text-xs text-red-600 font-medium">⚠️ Hoge betalingsachterstand</div>
                            ` : stats.overduePressure > 5 ? `
                                <div class="text-xs text-orange-600">⚡ Verhoogde betalingsachterstand</div>
                            ` : `
                                <div class="text-xs text-green-600">✅ Gezonde betalingsmoraal</div>
                            `}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bestaande abonnementen sectie -->
                <div class="card-compact">
                    <div class="card-compact-header">
                        <span>Abonnementen per Plan</span>
                        <button onclick="switchTab('subscriptions')" class="link-action">Bekijk abonnementen →</button>
                    </div>
                    ${renderSubscriptionByPlanBreakdown(data.subscriptions.byPlan)}
                    <div class="mt-4">
                        <p class="text-xs font-semibold text-gray-500 mb-2">ACTIEPUNTEN</p>
                        ${renderSubscriptionActions(data.subscriptions)}
                    </div>
                </div>
            </div>

            <!-- Klanten inzicht -->
            <div class="card-compact mt-4">
                <div class="card-compact-header">
                    <span>Klanten Overzicht</span>
                    <button onclick="switchTab('customers')" class="link-action">Bekijk klanten →</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="text-center p-4 bg-green-50 rounded-lg">
                        <p class="text-3xl font-bold text-green-700">${data.customers.activeCount}</p>
                        <p class="text-sm text-gray-600 mt-1">Actieve klanten</p>
                        <p class="text-xs text-gray-400 mt-0.5">Met actief abonnement</p>
                    </div>
                    <div class="text-center p-4 bg-gray-50 rounded-lg">
                        <p class="text-3xl font-bold text-gray-700">${data.customers.withoutSubscription}</p>
                        <p class="text-sm text-gray-600 mt-1">Zonder abonnement</p>
                        <p class="text-xs text-gray-400 mt-0.5">Potentiële klanten</p>
                    </div>
                    <div class="text-center p-4 bg-blue-50 rounded-lg">
                        <p class="text-3xl font-bold text-blue-700">${data.customers.totalCount}</p>
                        <p class="text-sm text-gray-600 mt-1">Totaal klanten</p>
                        <p class="text-xs text-gray-400 mt-0.5">In het systeem</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderAlertsFromAPI(data) {
    const alerts = [];

    if (data.invoices.overdueCount > 0) {
        alerts.push({
            type: 'error',
            icon: 'exclamation-triangle',
            message: `${data.invoices.overdueCount} achterstallige factuur${data.invoices.overdueCount > 1 ? 'en' : ''} (${formatCurrency(data.invoices.overdueTotal)})`,
            action: 'Bekijk →',
            actionFn: "switchTab('invoices')"
        });
    }

    if (data.subscriptions.overdueSubscriptions?.count > 0) {
        const count = data.subscriptions.overdueSubscriptions.count;
        const terms = data.subscriptions.overdueSubscriptions.totalTerms || count;
        const termsText = terms !== count ? ` (${terms} termijn${terms > 1 ? 'en' : ''})` : '';
        alerts.push({
            type: 'warning',
            icon: 'file-invoice-dollar',
            message: `${count} abonnement${count > 1 ? 'en' : ''}${termsText} nog te factureren (${formatCurrency(data.subscriptions.overdueSubscriptions.totalAmount)})`,
            action: 'Bekijk →',
            actionFn: "switchTab('subscriptions')"
        });
    }

    if (data.subscriptions.upcomingPayments?.count > 0) {
        alerts.push({
            type: 'info',
            icon: 'calendar-check',
            message: `${data.subscriptions.upcomingPayments.count} abonnement${data.subscriptions.upcomingPayments.count > 1 ? 'en' : ''} binnenkort te factureren (${formatCurrency(data.subscriptions.upcomingPayments.totalAmount)})`,
            action: 'Bekijk →',
            actionFn: "switchTab('subscriptions')"
        });
    }

    if (data.customers.withoutSubscription > 5) {
        alerts.push({
            type: 'info',
            icon: 'user-plus',
            message: `${data.customers.withoutSubscription} klanten zonder abonnement – verkoopkans?`,
            action: 'Bekijk →',
            actionFn: "switchTab('customers')"
        });
    }

    if (alerts.length === 0) {
        return `
            <div class="alert-compact success">
                <i class="fas fa-check-circle"></i>
                <span>Geen actiepunten – alles loopt goed! 🎋</span>
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

function renderSubscriptionBreakdown(byFrequency) {
    if (!byFrequency || byFrequency.length === 0) {
        return '<p class="text-sm text-gray-400 text-center py-4">Geen abonnementen</p>';
    }

    const frequencyLabels = {
        'monthly': 'Maandelijks',
        'quarterly': 'Per kwartaal',
        'halfyearly': 'Per half jaar',
        'yearly': 'Jaarlijks',
        'unknown': 'Onbekend'
    };

    return `
        <div class="space-y-3">
            ${byFrequency.map(freq => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p class="text-sm font-semibold text-gray-800">${frequencyLabels[freq.frequency] || freq.frequency}</p>
                        <p class="text-xs text-gray-500">${freq.count} abonnement${freq.count !== 1 ? 'en' : ''}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-bold text-green-700">${formatCurrency(freq.monthlyRevenue)}</p>
                        <p class="text-xs text-gray-500">Per maand</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderSubscriptionByPlanBreakdown(byPlan) {
    if (!byPlan || byPlan.length === 0) {
        return '<p class="text-sm text-gray-400 text-center py-4">Geen abonnementen</p>';
    }

    const frequencyLabels = {
        'monthly': 'Maandelijks',
        'quarterly': 'Per kwartaal',
        'halfyearly': 'Per half jaar',
        'yearly': 'Jaarlijks',
        'unknown': 'Onbekend'
    };

    // Bereken totale omzet voor percentages in de visuele balk
    const totalRevenue = byPlan.reduce((sum, plan) => sum + plan.monthlyRevenue, 0);
    const totalCount = byPlan.reduce((sum, plan) => sum + plan.count, 0);

    return `
        <div class="space-y-3">
            ${byPlan.map(plan => {
                const revenuePercentage = totalRevenue > 0 ? (plan.monthlyRevenue / totalRevenue * 100) : 0;
                return `
                    <div class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" onclick="switchTab('subscription-plans')">
                        <div class="flex items-start justify-between mb-2">
                            <div class="flex-1">
                                <p class="text-sm font-semibold text-gray-800">${plan.planName}</p>
                                <p class="text-xs text-gray-500 mt-0.5">
                                    ${plan.count} abonnement${plan.count !== 1 ? 'en' : ''} (${plan.percentage}%)
                                    <span class="mx-1">•</span>
                                    ${frequencyLabels[plan.mostCommonFrequency] || plan.mostCommonFrequency}
                                </p>
                            </div>
                            <div class="text-right">
                                <p class="text-sm font-bold text-green-700">${formatCurrency(plan.monthlyRevenue)}<span class="text-xs text-gray-500 font-normal">/mnd</span></p>
                                <p class="text-xs text-gray-500">Ø ${formatCurrency(plan.averageMonthlyPrice)}</p>
                            </div>
                        </div>
                        <!-- Revenue bar -->
                        <div class="w-full bg-gray-200 rounded-full h-1.5">
                            <div class="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all" style="width: ${revenuePercentage}%"></div>
                        </div>
                    </div>
                `;
            }).join('')}

            <!-- Totalen -->
            ${byPlan.length > 1 ? `
                <div class="pt-3 border-t border-gray-200">
                    <div class="flex items-center justify-between px-3">
                        <div>
                            <p class="text-xs font-semibold text-gray-500 uppercase">Totaal</p>
                            <p class="text-sm text-gray-700">${totalCount} abonnement${totalCount !== 1 ? 'en' : ''} over ${byPlan.length} plan${byPlan.length > 1 ? 'nen' : ''}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm font-bold text-gray-800">${formatCurrency(totalRevenue)}<span class="text-xs text-gray-500 font-normal">/mnd</span></p>
                            <p class="text-xs text-gray-500">${formatCurrency(totalRevenue * 12)}/jaar</p>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function renderSubscriptionActions(subscriptions) {
    const items = [];

    if (subscriptions.overdueSubscriptions?.count > 0) {
        const count = subscriptions.overdueSubscriptions.count;
        const terms = subscriptions.overdueSubscriptions.totalTerms || count;
        const label = terms !== count 
            ? `${count} abonnement${count > 1 ? 'en' : ''} (${terms} termijn${terms > 1 ? 'en' : ''}) nog te factureren`
            : `${count} nog te factureren`;
        items.push(`
            <div class="flex items-center justify-between p-2 bg-red-50 rounded border-l-4 border-red-500">
                <span class="text-sm text-gray-700"><i class="fas fa-exclamation-circle text-red-500 mr-2"></i>${label}</span>
                <button onclick="switchTab('subscriptions')" class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium">Bekijk →</button>
            </div>
        `);
    }

    if (subscriptions.upcomingPayments?.count > 0) {
        items.push(`
            <div class="flex items-center justify-between p-2 bg-blue-50 rounded border-l-4 border-blue-500">
                <span class="text-sm text-gray-700"><i class="fas fa-calendar-alt text-blue-500 mr-2"></i>${subscriptions.upcomingPayments.count} binnenkort</span>
                <button onclick="switchTab('subscriptions')" class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">Bekijk →</button>
            </div>
        `);
    }

    if (items.length === 0) {
        return '<p class="text-xs text-gray-400 text-center py-2">Geen acties nodig</p>';
    }

    return `<div class="space-y-2">${items.join('')}</div>`;
}

function renderDashboard(stats, invoices, payments, subscriptions, customers, orders) {
    const content = document.getElementById('content');
    const now = new Date();

    content.innerHTML = `
        <div class="space-y-4 page-transition">

            <!-- Compact header -->
            <div class="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <p class="text-xs text-gray-400 uppercase tracking-widest mb-0.5">${formatDate(now.toISOString())}</p>
                    <h2 class="text-xl font-bold text-gray-900 leading-tight">Dashboard</h2>
                </div>
                <div class="flex flex-wrap gap-2">
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
                ${createCompactKpiCard('Klanten', stats.totalCustomers, "switchTab('customers')", '', 'fa-users')}
                ${createCompactKpiCard('Facturen', stats.totalInvoices, "switchTab('invoices')", `${stats.pendingInvoices + stats.overdueInvoices} open`, 'fa-file-invoice')}
                ${createCompactKpiCard('Orders', stats.totalOrders, "switchTab('orders')", `${stats.openOrders} open`, 'fa-shopping-cart')}
                ${createCompactKpiCard('Abonnementen', stats.totalSubscriptions, "switchTab('subscriptions')", `${stats.activeSubscriptions} actief`, 'fa-sync')}
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
                            <p class="fin-label">Ontvangen</p>
                            <p class="fin-value" style="color:#15803d">${formatCurrency(stats.paidAmount)}</p>
                            <p class="fin-note">${stats.paidInvoices} volledig betaalde facturen</p>
                        </div>
                        <div class="fin-item">
                            <p class="fin-label">Nog te ontvangen</p>
                            <p class="fin-value" style="color:#b45309">${formatCurrency(stats.pendingAmount)}</p>
                            <p class="fin-note">${stats.pendingInvoices + stats.overdueInvoices} openstaande facturen</p>
                        </div>
                        <div class="fin-item">
                            <p class="fin-label">Vaste maandomzet</p>
                            <p class="fin-value" style="color:#1d4ed8">${formatCurrency(stats.monthlyRecurringRevenue)}</p>
                            <p class="fin-note">${stats.activeSubscriptions} actieve abonnementen</p>
                        </div>
                    </div>
                    <div class="mt-4 space-y-2">
                        ${createMeterRow('Betaalde facturen', stats.collectionRate, 'success')}
                        ${createMeterRow('Actieve abonnementen', stats.activeSubscriptionRate, 'info')}
                        ${createMeterRow('Achterstallige facturen', stats.overduePressure, 'warning')}
                    </div>
                </div>

                <!-- Actiepunten -->
                <div class="card-compact">
                    <div class="card-compact-header">
                        <span>Actiepunten</span>
                    </div>
                    ${renderActionItems(stats)}
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
    const iconHtml = icon ? '<i class="fas ' + icon + ' kpi-icon"></i> ' : '';
    const subtitleHtml = subtitle ? '<p class="kpi-sub">' + subtitle + '</p>' : '';

    return `
        <button class="kpi-card-compact" onclick="${onClickAction}">
            <p class="kpi-label">${title}${iconHtml}</p>
            <p class="kpi-number">${value}</p>
            ${subtitleHtml}
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
            actionFn: "switchTab('invoices')"
        });
    }

    if (stats.subscriptionsWithOpenTerms?.length > 0) {
        const pastOpenCount = stats.subscriptionsWithOpenTerms.filter(x => x.pastOpen > 0).length;
        const pastOpenTermsCount = stats.subscriptionsWithOpenTerms.filter(x => x.pastOpen > 0).reduce((sum, x) => sum + x.pastOpen, 0);
        const currentOnlyOpenCount = stats.subscriptionsWithOpenTerms.filter(x => x.pastOpen === 0 && x.currentOpen > 0).length;
        const currentOnlyTermsCount = stats.subscriptionsWithOpenTerms.filter(x => x.pastOpen === 0 && x.currentOpen > 0).reduce((sum, x) => sum + x.currentOpen, 0);

        if (pastOpenCount > 0) {
            const termsText = pastOpenTermsCount !== pastOpenCount ? ` (${pastOpenTermsCount} termijn${pastOpenTermsCount > 1 ? 'en' : ''})` : '';
            alerts.push({
                type: 'error',
                icon: 'file-invoice-dollar',
                message: `${pastOpenCount} abonnement${pastOpenCount > 1 ? 'en hebben' : ' heeft'}${termsText} niet-gefactureerde termijnen`,
                action: 'Bekijk →',
                actionFn: "switchTab('subscriptions')"
            });
        }
        if (currentOnlyOpenCount > 0) {
            const termsText = currentOnlyTermsCount !== currentOnlyOpenCount ? ` (${currentOnlyTermsCount} termijn${currentOnlyTermsCount > 1 ? 'en' : ''})` : '';
            alerts.push({
                type: 'warning',
                icon: 'file-invoice-dollar',
                message: `${currentOnlyOpenCount} abonnement${currentOnlyOpenCount > 1 ? 'en hebben' : ' heeft'}${termsText} een lopende termijn nog niet gefactureerd`,
                action: 'Bekijk →',
                actionFn: "switchTab('subscriptions')"
            });
        }
    }

    if (stats.subscriptionsUpcomingBilling?.length > 0) {
        alerts.push({
            type: 'warning',
            icon: 'calendar-check',
            message: `${stats.subscriptionsUpcomingBilling.length} abonnement${stats.subscriptionsUpcomingBilling.length > 1 ? 'en' : ''} te factureren binnen 14 dagen`,
            action: 'Bekijk →',
            actionFn: "switchTab('subscriptions')"
        });
    }

    if (stats.expiringSubscriptions > 0) {
        alerts.push({
            type: 'warning',
            icon: 'clock',
            message: `${stats.expiringSubscriptions} abonnement${stats.expiringSubscriptions > 1 ? 'en verlopen' : ' verloopt'} binnen 30 dagen`,
            action: 'Bekijk →',
            actionFn: "switchTab('subscriptions')"
        });
    }

    if (stats.pendingInvoices > 10) {
        alerts.push({
            type: 'info',
            icon: 'info-circle',
            message: `${stats.pendingInvoices} openstaande facturen – overweeg herinneringen te sturen`,
            action: 'Bekijk →',
            actionFn: "switchTab('invoices')"
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

function renderActionItems(stats) {
    const urgencyConfig = {
        critical: { border: 'border-l-red-500',    bg: 'bg-red-50',    icon: 'text-red-500',    badge: 'bg-red-100 text-red-700' },
        high:     { border: 'border-l-orange-400', bg: 'bg-orange-50', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' },
        medium:   { border: 'border-l-yellow-400', bg: 'bg-yellow-50', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
        low:      { border: 'border-l-blue-400',   bg: 'bg-blue-50',   icon: 'text-blue-500',  badge: 'bg-blue-100 text-blue-700' }
    };

    const items = [];

    if (stats.overdueInvoices > 0) {
        items.push({
            urgency: 'critical', icon: 'exclamation-triangle',
            label: `${stats.overdueInvoices} achterstallige factuur${stats.overdueInvoices > 1 ? 'en' : ''}`,
            detail: `${formatCurrency(stats.overdueInvoicesAmount)} – directe opvolging vereist`,
            actionLabel: 'Facturen', fn: 'switchTab("invoices")'
        });
    }

    if (stats.invoicesDueSoon > 0) {
        items.push({
            urgency: 'high', icon: 'calendar-times',
            label: `${stats.invoicesDueSoon} factuur${stats.invoicesDueSoon > 1 ? 'en' : ''} vervalt binnen 7 dagen`,
            detail: `${formatCurrency(stats.invoicesDueSoonAmount)} – stuur een herinnering`,
            actionLabel: 'Facturen', fn: 'switchTab("invoices")'
        });
    }

    if (stats.openSubscriptionTermsCount > 0) {
        const subscriptionCount = stats.openSubscriptionsCount || 1;
        const termsCount = stats.openSubscriptionTermsCount;
        const label = subscriptionCount > 1 || termsCount !== subscriptionCount
            ? `${subscriptionCount} abonnement${subscriptionCount > 1 ? 'en' : ''} (${termsCount} termijn${termsCount > 1 ? 'en' : ''}) niet gefactureerd`
            : `${termsCount} abonnement termijn${termsCount > 1 ? 'en' : ''} niet gefactureerd`;
        items.push({
            urgency: 'high', icon: 'file-invoice-dollar',
            label: label,
            detail: 'Maak de ontbrekende facturen aan',
            actionLabel: 'Abonnementen', fn: 'switchTab("subscriptions")'
        });
    }

    if (stats.draftOrders > 0) {
        items.push({
            urgency: 'medium', icon: 'pencil-alt',
            label: `${stats.draftOrders} concept order${stats.draftOrders > 1 ? 's' : ''} wacht op bevestiging`,
            detail: 'Bevestig of verwijder de openstaande concepten',
            actionLabel: 'Orders', fn: 'switchTab("orders")'
        });
    }

    if (stats.confirmedOrders > 0) {
        items.push({
            urgency: 'medium', icon: 'file-invoice',
            label: `${stats.confirmedOrders} order${stats.confirmedOrders > 1 ? 's' : ''} klaar om te factureren`,
            detail: `${formatCurrency(stats.pendingOrderAmount)} klaar om in rekening te brengen`,
            actionLabel: 'Orders', fn: 'switchTab("orders")'
        });
    }

    if (stats.expiringSubscriptions > 0) {
        items.push({
            urgency: 'low', icon: 'clock',
            label: `${stats.expiringSubscriptions} abonnement${stats.expiringSubscriptions > 1 ? 'en verlopen' : ' verloopt'} binnen 30 dagen`,
            detail: 'Neem contact op voor verlenging',
            actionLabel: 'Abonnementen', fn: 'switchTab("subscriptions")'
        });
    }

    if (items.length === 0) {
        return `
            <div class="flex flex-col items-center justify-center py-6 text-center">
                <i class="fas fa-check-circle text-green-500 text-2xl mb-2"></i>
                <p class="text-sm font-semibold text-green-700">Alles afgehandeld</p>
                <p class="text-xs text-gray-400 mt-1">Geen openstaande actiepunten</p>
            </div>
        `;
    }

    return `
        <div class="space-y-2">
            ${items.map(item => {
                const cfg = urgencyConfig[item.urgency];
                return `
                    <div class="flex items-center gap-3 p-3 rounded border-l-4 ${cfg.border} ${cfg.bg} cursor-pointer hover:opacity-90 transition-opacity" onclick="${item.fn}">
                        <i class="fas fa-${item.icon} ${cfg.icon} text-base shrink-0"></i>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-gray-800 leading-tight">${item.label}</p>
                            <p class="text-xs text-gray-500 mt-0.5">${item.detail}</p>
                        </div>
                        <button onclick="event.stopPropagation(); ${item.fn}" class="shrink-0 text-xs px-2 py-1 rounded ${cfg.badge} font-medium whitespace-nowrap">${item.actionLabel} →</button>
                    </div>
                `;
            }).join('')}
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

    const upcomingRows = upcomingItems.slice(0, 5).map(({ sub, daysUntil }) => {
        const daysText = daysUntil === 0 ? 'Vandaag' : 'Nog ' + daysUntil + ' dag' + (daysUntil !== 1 ? 'en' : '');
        return `
        <div class="recent-list-row">
            <div class="min-w-0 flex-1">
                <button onclick="switchTab('subscriptions'); setTimeout(() => showGenerateInvoiceFromSubscription('${sub.id}'), 300);" class="recent-list-label truncate block text-left bg-transparent border-none p-0 cursor-pointer hover:underline">${sub.subscriptionNumber || sub.id}</button>
                <p class="recent-list-sub truncate">${subName(sub)}</p>
            </div>
            <div class="text-right ml-3 shrink-0">
                <p class="recent-list-amount" style="color:#d97706">${daysText}</p>
                <p class="recent-list-meta">Volgende factuurdatum</p>
            </div>
        </div>
    `;
    }).join('');

    return `
        <div class="card-compact">
            <div class="card-compact-header">
                <span><i class="fas fa-exclamation-circle" style="color:#dc2626"></i> Abonnement facturatie</span>
                <button onclick="switchTab('subscriptions')" class="link-action">Abonnementen →</button>
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
