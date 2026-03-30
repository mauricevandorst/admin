// Purchase Invoices management

let _purchaseInvoicesCache = [];
let _purchaseInvoicesSuppliersCache = [];
let _purchaseInvoiceSortCol = 'invoiceNumber';
let _purchaseInvoiceSortDir = -1;
let _purchaseInvoiceSearch = '';
let _purchaseInvoicePages = { unpaid: 1, paid: 1, cancelled: 1 };
const _purchaseInvoicePageSize = 25;

function generatePurchaseInvoiceNumber(purchaseInvoices) {
    if (!purchaseInvoices || purchaseInvoices.length === 0) return 'PURCH-0001';
    const numbers = (purchaseInvoices || []).map(inv => {
        const match = (inv.invoiceNumber || '').match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    });
    return `PURCH-${String(Math.max(...numbers, 0) + 1).padStart(4, '0')}`;
}

async function loadPurchaseInvoices() {
    try {
        const [purchaseInvoices, suppliers] = await Promise.all([
            getAll('purchaseinvoices'),
            getAll('suppliers')
        ]);
        _purchaseInvoicesCache = purchaseInvoices || [];
        _purchaseInvoicesSuppliersCache = suppliers || [];
        renderPurchaseInvoicesContent();
    } catch (error) {
        showError(error.message);
    }
}

function sortPurchaseInvoices(col) {
    if (_purchaseInvoiceSortCol === col) {
        _purchaseInvoiceSortDir = -_purchaseInvoiceSortDir;
    } else {
        _purchaseInvoiceSortCol = col;
        _purchaseInvoiceSortDir = 1;
    }
    _purchaseInvoicePages = { unpaid: 1, paid: 1, cancelled: 1 };
    renderPurchaseInvoicesContent();
}

function searchPurchaseInvoices(q) {
    _purchaseInvoiceSearch = q;
    _purchaseInvoicePages = { unpaid: 1, paid: 1, cancelled: 1 };
    renderPurchaseInvoicesContent();
}

function goToPurchaseInvoicePage(section, page) {
    _purchaseInvoicePages[section] = page;
    renderPurchaseInvoicesContent();
}

function renderPurchaseInvoicesContent() {
    const invoices = _purchaseInvoicesCache;
    const suppliers = _purchaseInvoicesSuppliersCache;

    const filtered = filterPurchaseInvoicesBySearch(invoices, suppliers);

    // Calculate invoices by status
    const unpaidInvoices = filtered.filter(inv => {
        const paid = (inv.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        return inv.status !== 'cancelled' && paid < inv.totalAmount;
    });
    const paidInvoices = filtered.filter(inv => {
        const paid = (inv.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        return paid >= inv.totalAmount && inv.totalAmount > 0;
    });
    const cancelledInvoices = filtered.filter(inv => inv.status === 'cancelled');

    let html = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Inkoopfacturen</h2>
            <button onclick="showCreatePurchaseInvoice()" 
                    class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                <i class="fas fa-plus"></i> Nieuwe Inkoopfactuur
            </button>
        </div>
        <div class="mb-6">
            <div class="relative w-full sm:w-96">
                <span class="absolute inset-y-0 left-3 flex items-center text-gray-400"><i class="fas fa-search"></i></span>
                <input type="text"
                       id="purchaseInvoiceSearch"
                       oninput="searchPurchaseInvoices(this.value)"
                       value="${_purchaseInvoiceSearch.replace(/"/g, '&quot;')}"
                       placeholder="Zoek op nummer, leverancier of referentie..."
                       class="w-full pl-9 pr-4 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:outline-none">
            </div>
        </div>
    `;

    // Unpaid invoices table
    html += `
        <div class="mb-8">
            <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
                <span class="px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-800">
                    <i class="fas fa-clock"></i> Niet betaald
                </span>
                <span class="text-gray-500 text-sm font-normal">(${unpaidInvoices.length})</span>
            </h3>
            ${buildPurchaseInvoiceTable(unpaidInvoices, suppliers, 'unpaid') || '<p class="text-gray-500 text-center py-6">Geen openstaande inkoopfacturen</p>'}
        </div>
    `;

    // Paid invoices table
    html += `
        <div class="mb-8">
            <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
                <span class="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800">
                    <i class="fas fa-check-circle"></i> Voltooid
                </span>
                <span class="text-gray-500 text-sm font-normal">(${paidInvoices.length})</span>
            </h3>
            ${buildPurchaseInvoiceTable(paidInvoices, suppliers, 'paid') || '<p class="text-gray-500 text-center py-6">Geen betaalde inkoopfacturen</p>'}
        </div>
    `;

    // Cancelled invoices table
    html += `
        <div>
            <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
                <span class="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-600">
                    <i class="fas fa-ban"></i> Geannuleerd
                </span>
                <span class="text-gray-500 text-sm font-normal">(${cancelledInvoices.length})</span>
            </h3>
            ${buildPurchaseInvoiceTable(cancelledInvoices, suppliers, 'cancelled') || '<p class="text-gray-500 text-center py-6">Geen geannuleerde inkoopfacturen</p>'}
        </div>
    `;

    document.getElementById('content').innerHTML = html;
}

function buildPurchaseInvoiceTable(invoices, suppliers, section) {
    if (!invoices || invoices.length === 0) return null;

    const sorted = [...invoices].sort((a, b) => {
        if (_purchaseInvoiceSortCol === 'invoiceNumber') {
            const aNum = parseInt((a.invoiceNumber || '').replace(/\D/g, ''), 10) || 0;
            const bNum = parseInt((b.invoiceNumber || '').replace(/\D/g, ''), 10) || 0;
            return (aNum - bNum) * _purchaseInvoiceSortDir;
        }
        if (_purchaseInvoiceSortCol === 'totalAmount') {
            return ((a.totalAmount || 0) - (b.totalAmount || 0)) * _purchaseInvoiceSortDir;
        }
        let aVal = '', bVal = '';
        if (_purchaseInvoiceSortCol === 'supplier') {
            const aS = suppliers?.find(s => s.id === a.supplierId);
            const bS = suppliers?.find(s => s.id === b.supplierId);
            aVal = aS?.name || a.supplierName || '';
            bVal = bS?.name || b.supplierName || '';
        } else if (_purchaseInvoiceSortCol === 'invoiceDate') {
            aVal = a.invoiceDate || '';
            bVal = b.invoiceDate || '';
        } else if (_purchaseInvoiceSortCol === 'dueDate') {
            aVal = a.dueDate || '';
            bVal = b.dueDate || '';
        }
        return aVal < bVal ? -_purchaseInvoiceSortDir : aVal > bVal ? _purchaseInvoiceSortDir : 0;
    });

    const page = _purchaseInvoicePages[section] || 1;
    const paginated = sorted.slice((page - 1) * _purchaseInvoicePageSize, page * _purchaseInvoicePageSize);

    const thSort = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase text-nowrap cursor-pointer hover:bg-gray-100 select-none';
    return `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="${thSort}" onclick="sortPurchaseInvoices('invoiceNumber')">Nummer ${_purchaseInvoiceSortIcon('invoiceNumber')}</th>
                        <th class="${thSort}" onclick="sortPurchaseInvoices('supplier')">Leverancier ${_purchaseInvoiceSortIcon('supplier')}</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref. leverancier</th>
                        <th class="${thSort}" onclick="sortPurchaseInvoices('invoiceDate')">Datum ${_purchaseInvoiceSortIcon('invoiceDate')}</th>
                        <th class="${thSort}" onclick="sortPurchaseInvoices('dueDate')">Vervaldatum ${_purchaseInvoiceSortIcon('dueDate')}</th>
                        <th class="${thSort}" onclick="sortPurchaseInvoices('totalAmount')">Bedrag ${_purchaseInvoiceSortIcon('totalAmount')}</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${paginated.map(inv => buildPurchaseInvoiceRow(inv, suppliers)).join('')}
                </tbody>
            </table>
            ${buildPurchaseInvoicePagination(section, page, sorted.length)}
        </div>
    `;
}

function buildPurchaseInvoiceRow(invoice, suppliers) {
    const payments = invoice.payments || [];
    const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainingAmount = invoice.totalAmount - paidAmount;
    const paymentPercentage = invoice.totalAmount > 0 ? (paidAmount / invoice.totalAmount * 100) : 0;

    let actualStatus = invoice.status;
    if (paidAmount >= invoice.totalAmount) {
        actualStatus = 'paid';
    } else if (paidAmount > 0) {
        actualStatus = 'partially_paid';
    }

    const statusConfig = {
        paid: { class: 'bg-green-100 text-green-800', label: 'Betaald', icon: 'check-circle' },
        partially_paid: { class: 'bg-purple-100 text-purple-800', label: 'Gedeeltelijk', icon: 'clock' },
        pending: { class: 'bg-orange-100 text-orange-800', label: 'Openstaand', icon: 'clock' },
        unpaid: { class: 'bg-orange-100 text-orange-800', label: 'Openstaand', icon: 'clock' },
        overdue: { class: 'bg-red-100 text-red-800', label: 'Achterstallig', icon: 'exclamation-triangle' },
        cancelled: { class: 'bg-gray-100 text-gray-600', label: 'Geannuleerd', icon: 'ban' }
    };
    const status = statusConfig[actualStatus] || statusConfig.pending;

    const supplier = suppliers?.find(s => s.id === invoice.supplierId);
    const supplierName = supplier?.name || invoice.supplierName || 'Onbekend';
    const supplierId = supplier?.id || null;

    const itemsCount = invoice.lines?.length || 0;
    const itemsText = itemsCount > 0 ? `${itemsCount} regel${itemsCount > 1 ? 's' : ''}` : 'Geen regels';

    const paymentInfo = actualStatus === 'partially_paid' ? `
        <div class="text-xs text-gray-600 mt-1">
            <div class="flex items-center gap-2">
                <div class="w-20 bg-gray-200 rounded-full h-2">
                    <div class="bg-purple-600 h-2 rounded-full" style="width: ${paymentPercentage}%"></div>
                </div>
                <span>${formatCurrency(paidAmount)} / ${formatCurrency(invoice.totalAmount)}</span>
            </div>
        </div>
    ` : '';

    const paymentButton = actualStatus !== 'paid' ? `
        <button onclick="showCreatePaymentForPurchaseInvoice('${invoice.id}')" 
                class="text-green-600 hover:text-green-900 mr-3" 
                title="Registreer betaling">
            <i class="fas fa-hand-holding-dollar"></i>
        </button>
    ` : '';

    return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="text-blue-600 hover:text-blue-900 cursor-pointer hover:underline" 
                     onclick="showPurchaseInvoiceDetails('${invoice.id}')">
                    ${invoice.invoiceNumber || 'N/A'}
                </div>
                ${invoice.relatedOrderId ? `
                    <div class="text-xs mt-1">
                        <span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            <i class="fas fa-link"></i> Gekoppeld aan order
                            </span>
                                </div>
                            ` : ''}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            ${supplierId ? `
                                <div class="text-blue-600 hover:text-blue-900 cursor-pointer hover:underline" 
                                     onclick="showSupplierDetails('${supplierId}')">
                                    ${supplierName}
                                </div>
                            ` : supplierName}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title="${invoice.supplierInvoiceNumber || ''}">${invoice.supplierInvoiceNumber || '-'}</td>
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
                <button onclick="showEditPurchaseInvoice('${invoice.id}')" 
                        class="text-blue-600 hover:text-blue-900 mr-3" 
                        title="Bewerken">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deletePurchaseInvoice('${invoice.id}')" 
                        class="text-red-600 hover:text-red-900" 
                        title="Verwijderen">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

function _purchaseInvoiceSortIcon(col) {
    if (_purchaseInvoiceSortCol !== col) return '<i class="fas fa-sort ml-1 opacity-30"></i>';
    return _purchaseInvoiceSortDir === 1
        ? '<i class="fas fa-sort-up ml-1"></i>'
        : '<i class="fas fa-sort-down ml-1"></i>';
}

function filterPurchaseInvoicesBySearch(invoices, suppliers) {
    const q = _purchaseInvoiceSearch.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(inv => {
        const supplier = suppliers?.find(s => s.id === inv.supplierId);
        const supplierName = (supplier?.name || inv.supplierName || '').toLowerCase();
        return (inv.invoiceNumber || '').toLowerCase().includes(q)
            || supplierName.includes(q)
            || (inv.supplierInvoiceNumber || '').toLowerCase().includes(q)
            || (inv.reference || '').toLowerCase().includes(q);
    });
}

function buildPurchaseInvoicePagination(section, currentPage, totalItems) {
    const totalPages = Math.ceil(totalItems / _purchaseInvoicePageSize);
    if (totalPages <= 1) return '';

    const start = (currentPage - 1) * _purchaseInvoicePageSize + 1;
    const end = Math.min(currentPage * _purchaseInvoicePageSize, totalItems);

    const btn = (page, label) => `<button onclick="goToPurchaseInvoicePage('${section}', ${page})" class="px-3 py-1 rounded border text-sm hover:bg-gray-100">${label}</button>`;
    const activeBtn = (page) => `<span class="px-3 py-1 rounded bg-purple-600 text-white text-sm font-medium">${page}</span>`;
    const ellipsis = `<span class="px-2 py-1 text-sm text-gray-400">…</span>`;

    const delta = 2;
    let pageNums = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
            pageNums.push(i);
        }
    }

    let buttons = '';
    let prev = null;
    for (const p of pageNums) {
        if (prev !== null && p - prev > 1) buttons += ellipsis;
        buttons += p === currentPage ? activeBtn(p) : btn(p, p);
        prev = p;
    }

    return `
        <div class="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <span class="text-sm text-gray-500">${start}–${end} van ${totalItems}</span>
            <div class="flex gap-1 flex-wrap items-center">
                ${currentPage > 1 ? btn(currentPage - 1, '<i class="fas fa-chevron-left"></i>') : ''}
                ${buttons}
                ${currentPage < totalPages ? btn(currentPage + 1, '<i class="fas fa-chevron-right"></i>') : ''}
            </div>
        </div>
    `;
}

async function showCreatePurchaseInvoice() {
    // Load orders to allow linking
    let orders = [];
    try {
        orders = await getAll('orders');
    } catch (e) {
        console.error('Could not load orders', e);
    }

    const invoiceNumber = generatePurchaseInvoiceNumber(_purchaseInvoicesCache);
    const suppliers = _purchaseInvoicesSuppliersCache;
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const html = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-premium max-w-4xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="text-2xl font-bold flex items-center gap-3">
                        <div class="icon-premium icon-red">
                            <i class="fas fa-file-invoice-dollar"></i>
                        </div>
                        Nieuwe inkoopfactuur
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form onsubmit="handleCreatePurchaseInvoice(event)" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold mb-1">Factuurnummer *</label>
                                <input type="text" id="piInvoiceNumber" value="${invoiceNumber}" required class="input-premium w-full">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold mb-1">Leverancier *</label>
                                <select id="piSupplierId" required class="input-premium w-full" onchange="updatePurchaseInvoiceSupplierInfo()">
                                    <option value="">Selecteer leverancier...</option>
                                    ${suppliers.filter(s => s.isActive !== false).map(s => `<option value="${s.id}" data-name="${s.name || ''}">${s.name || s.supplierNumber}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-sm font-semibold mb-1">Factuurdatum *</label>
                                <input type="date" id="piInvoiceDate" value="${today}" required class="input-premium w-full">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold mb-1">Vervaldatum *</label>
                                <input type="date" id="piDueDate" value="${dueDate}" required class="input-premium w-full">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold mb-1">Leverancier factuurnr</label>
                                <input type="text" id="piSupplierInvoiceNumber" class="input-premium w-full">
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold mb-1">Referentie</label>
                            <input type="text" id="piReference" class="input-premium w-full">
                        </div>

                        ${orders.length > 0 ? `
                            <div>
                                <label class="block text-sm font-semibold mb-1">Koppelen aan order (optioneel)</label>
                                <select id="piRelatedOrderId" class="input-premium w-full">
                                    <option value="">Geen koppeling</option>
                                    ${orders.filter(o => o.status !== 'cancelled').map(o => `<option value="${o.id}">${o.orderNumber} - ${o.reference || 'Geen referentie'}</option>`).join('')}
                                </select>
                                <p class="text-xs text-gray-500 mt-1">Koppel deze inkoopfactuur aan een order voor marge-berekening</p>
                            </div>
                        ` : ''}

                        <div>
                            <label class="block text-sm font-semibold mb-1">Notities</label>
                            <textarea id="piNotes" rows="2" class="input-premium w-full"></textarea>
                        </div>

                        <!-- Invoice Lines -->
                        <div class="border-t pt-4">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="font-semibold">Regels</h3>
                                <button type="button" onclick="addPurchaseInvoiceLine()" class="btn-sm-bamboo">
                                    <i class="fas fa-plus mr-1"></i>Regel toevoegen
                                </button>
                            </div>
                            <div id="piLinesContainer" class="space-y-2">
                                <!-- Lines will be added here -->
                            </div>
                        </div>

                        <!-- Totals -->
                        <div class="border-t pt-4">
                            <div class="flex justify-end">
                                <div class="w-64 space-y-2">
                                    <div class="flex justify-between text-sm">
                                        <span>Subtotaal:</span>
                                        <span id="piSubTotal">€ 0,00</span>
                                    </div>
                                    <div class="flex justify-between text-sm">
                                        <span>BTW:</span>
                                        <span id="piVatAmount">€ 0,00</span>
                                    </div>
                                    <div class="flex justify-between font-bold text-lg border-t pt-2">
                                        <span>Totaal:</span>
                                        <span id="piTotalAmount">€ 0,00</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-3 justify-end pt-4 border-t">
                            <button type="button" onclick="closeModal()" class="btn-ghost">
                                Annuleren
                            </button>
                            <button type="submit" class="btn-bamboo">
                                <i class="fas fa-save mr-2"></i>Opslaan
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    addPurchaseInvoiceLine(); // Add first line
}

// Create purchase invoice from order (pre-filled)
async function showCreatePurchaseInvoiceFromOrder(orderId) {
    try {
        // Load order and other data
        const [order, suppliers] = await Promise.all([
            getById('orders', orderId),
            getAll('suppliers')
        ]);

        if (!order) {
            showToast('Order niet gevonden', 'error');
            return;
        }

        const invoiceNumber = generatePurchaseInvoiceNumber(_purchaseInvoicesCache);
        const today = new Date().toISOString().split('T')[0];
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const html = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal-premium max-w-4xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2 class="text-2xl font-bold flex items-center gap-3">
                            <div class="icon-premium icon-red">
                                <i class="fas fa-file-invoice-dollar"></i>
                            </div>
                            Nieuwe inkoopfactuur voor Order ${order.orderNumber}
                        </h2>
                        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form onsubmit="handleCreatePurchaseInvoiceFromOrder(event, '${orderId}')" class="space-y-4">
                            <!-- Info banner -->
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div class="flex items-center gap-2 text-blue-800">
                                    <i class="fas fa-info-circle"></i>
                                    <span class="text-sm font-semibold">Deze inkoopfactuur wordt automatisch gekoppeld aan order ${order.orderNumber}</span>
                                </div>
                                <div class="mt-2 text-sm text-blue-700">
                                    Order totaal: ${formatCurrency(order.totalAmount)} | Referentie: ${order.reference || 'Geen'}
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Factuurnummer *</label>
                                    <input type="text" id="piInvoiceNumber" value="${invoiceNumber}" required class="input-premium w-full">
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Leverancier *</label>
                                    <select id="piSupplierId" required class="input-premium w-full" onchange="updatePurchaseInvoiceSupplierInfo()">
                                        <option value="">Selecteer leverancier...</option>
                                        ${suppliers.filter(s => s.isActive !== false).map(s => `<option value="${s.id}" data-name="${s.name || ''}">${s.name || s.supplierNumber}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Factuurdatum *</label>
                                    <input type="date" id="piInvoiceDate" value="${today}" required class="input-premium w-full">
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Vervaldatum *</label>
                                    <input type="date" id="piDueDate" value="${dueDate}" required class="input-premium w-full">
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Leverancier factuurnr</label>
                                    <input type="text" id="piSupplierInvoiceNumber" class="input-premium w-full">
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-semibold mb-1">Referentie</label>
                                <input type="text" id="piReference" value="${order.reference || ''}" class="input-premium w-full">
                            </div>

                            <div>
                                <label class="block text-sm font-semibold mb-1">Notities</label>
                                <textarea id="piNotes" rows="2" class="input-premium w-full" placeholder="Bijv. welke werkzaamheden zijn uitgevoerd..."></textarea>
                            </div>

                            <!-- Invoice Lines -->
                            <div class="border-t pt-4">
                                <div class="flex items-center justify-between mb-3">
                                    <h3 class="font-semibold">Regels</h3>
                                    <button type="button" onclick="addPurchaseInvoiceLine()" class="btn-sm-bamboo">
                                        <i class="fas fa-plus mr-1"></i>Regel toevoegen
                                    </button>
                                </div>
                                <div id="piLinesContainer" class="space-y-2">
                                    <!-- Lines will be added here -->
                                </div>
                            </div>

                            <!-- Totals -->
                            <div class="border-t pt-4">
                                <div class="flex justify-end">
                                    <div class="w-64 space-y-2">
                                        <div class="flex justify-between text-sm">
                                            <span>Subtotaal:</span>
                                            <span id="piSubTotal">€ 0,00</span>
                                        </div>
                                        <div class="flex justify-between text-sm">
                                            <span>BTW:</span>
                                            <span id="piVatAmount">€ 0,00</span>
                                        </div>
                                        <div class="flex justify-between font-bold text-lg border-t pt-2">
                                            <span>Totaal:</span>
                                            <span id="piTotalAmount">€ 0,00</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="flex gap-3 justify-end pt-4 border-t">
                                <button type="button" onclick="closeModal()" class="btn-ghost">
                                    Annuleren
                                </button>
                                <button type="submit" class="btn-bamboo">
                                    <i class="fas fa-save mr-2"></i>Opslaan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        addPurchaseInvoiceLine(); // Add first line
    } catch (error) {
        showToast('Fout bij laden: ' + error.message, 'error');
    }
}

async function handleCreatePurchaseInvoiceFromOrder(e, orderId) {
    e.preventDefault();

    // Collect lines
    const lines = [];
    const lineElements = document.querySelectorAll('#piLinesContainer > div');
    lineElements.forEach(line => {
        const desc = line.querySelector('.pi-line-desc')?.value;
        const qty = parseInt(line.querySelector('.pi-line-qty')?.value || 0);
        const price = parseFloat(line.querySelector('.pi-line-price')?.value || 0);
        const vat = parseFloat(line.querySelector('.pi-line-vat')?.value || 0);
        const amount = qty * price * (1 + vat / 100);

        lines.push({
            description: desc,
            quantity: qty,
            unitPrice: price,
            vatPercentage: vat,
            amount: amount
        });
    });

    const subTotal = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
    const vatAmount = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice * l.vatPercentage / 100), 0);
    const totalAmount = subTotal + vatAmount;

    const supplierId = document.getElementById('piSupplierId').value;
    const supplierName = document.getElementById('piSupplierId').selectedOptions[0]?.getAttribute('data-name') || '';

    const invoice = {
        invoiceNumber: document.getElementById('piInvoiceNumber').value,
        invoiceDate: document.getElementById('piInvoiceDate').value,
        dueDate: document.getElementById('piDueDate').value,
        supplierId: supplierId,
        supplierName: supplierName,
        supplierInvoiceNumber: document.getElementById('piSupplierInvoiceNumber').value,
        relatedOrderId: orderId, // Automatically linked to order
        reference: document.getElementById('piReference').value,
        notes: document.getElementById('piNotes').value,
        lines: lines,
        subTotal: subTotal,
        vatAmount: vatAmount,
        totalAmount: totalAmount,
        status: 'pending',
        payments: []
    };

    try {
        await create('purchaseinvoices', invoice);
        closeModal();
        showToast('Inkoopfactuur succesvol aangemaakt en gekoppeld aan order', 'success');
        await loadPurchaseInvoices();
    } catch (error) {
        showToast('Fout: ' + error.message, 'error');
    }
}

let _piLineCounter = 0;

function addPurchaseInvoiceLine() {
    _piLineCounter++;
    const lineId = `pi-line-${_piLineCounter}`;
    
    const html = `
        <div id="${lineId}" class="grid grid-cols-12 gap-2 items-start bg-gray-50 p-3 rounded">
            <div class="col-span-5">
                <label class="block text-xs font-semibold mb-1">Omschrijving</label>
                <input type="text" class="input-premium w-full text-sm pi-line-desc" required>
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-semibold mb-1">Aantal</label>
                <input type="number" class="input-premium w-full text-sm pi-line-qty" value="1" min="1" required onchange="calculatePurchaseInvoiceLineTotals()">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-semibold mb-1">Prijs</label>
                <input type="number" step="0.01" class="input-premium w-full text-sm pi-line-price" value="0" required onchange="calculatePurchaseInvoiceLineTotals()">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-semibold mb-1">BTW %</label>
                <input type="number" step="0.01" class="input-premium w-full text-sm pi-line-vat" value="21" required onchange="calculatePurchaseInvoiceLineTotals()">
            </div>
            <div class="col-span-1 flex items-end">
                <button type="button" onclick="removePurchaseInvoiceLine('${lineId}')" class="btn-ghost text-red-600 w-full">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('piLinesContainer').insertAdjacentHTML('beforeend', html);
    calculatePurchaseInvoiceLineTotals();
}

function removePurchaseInvoiceLine(lineId) {
    document.getElementById(lineId)?.remove();
    calculatePurchaseInvoiceLineTotals();
}

function calculatePurchaseInvoiceLineTotals() {
    const lines = document.querySelectorAll('#piLinesContainer > div');
    let subTotal = 0;
    let vatAmount = 0;

    lines.forEach(line => {
        const qty = parseFloat(line.querySelector('.pi-line-qty')?.value || 0);
        const price = parseFloat(line.querySelector('.pi-line-price')?.value || 0);
        const vat = parseFloat(line.querySelector('.pi-line-vat')?.value || 0);
        
        const lineTotal = qty * price;
        const lineVat = lineTotal * (vat / 100);
        
        subTotal += lineTotal;
        vatAmount += lineVat;
    });

    const total = subTotal + vatAmount;

    document.getElementById('piSubTotal').textContent = formatCurrency(subTotal);
    document.getElementById('piVatAmount').textContent = formatCurrency(vatAmount);
    document.getElementById('piTotalAmount').textContent = formatCurrency(total);
}

function updatePurchaseInvoiceSupplierInfo() {
    const select = document.getElementById('piSupplierId');
    const supplierId = select?.value;
    
    if (!supplierId) return;
    
    const supplier = _purchaseInvoicesSuppliersCache.find(s => s.id === supplierId);
    if (supplier && supplier.defaultPaymentTermDays) {
        const invoiceDate = document.getElementById('piInvoiceDate')?.value;
        if (invoiceDate) {
            const dueDate = new Date(invoiceDate);
            dueDate.setDate(dueDate.getDate() + parseInt(supplier.defaultPaymentTermDays));
            document.getElementById('piDueDate').value = dueDate.toISOString().split('T')[0];
        }
    }
}

async function handleCreatePurchaseInvoice(e) {
    e.preventDefault();
    
    // Collect lines
    const lines = [];
    const lineElements = document.querySelectorAll('#piLinesContainer > div');
    lineElements.forEach(line => {
        const desc = line.querySelector('.pi-line-desc')?.value;
        const qty = parseInt(line.querySelector('.pi-line-qty')?.value || 0);
        const price = parseFloat(line.querySelector('.pi-line-price')?.value || 0);
        const vat = parseFloat(line.querySelector('.pi-line-vat')?.value || 0);
        const amount = qty * price * (1 + vat / 100);
        
        lines.push({
            description: desc,
            quantity: qty,
            unitPrice: price,
            vatPercentage: vat,
            amount: amount
        });
    });

    const subTotal = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
    const vatAmount = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice * l.vatPercentage / 100), 0);
    const totalAmount = subTotal + vatAmount;

    const supplierId = document.getElementById('piSupplierId').value;
    const supplierName = document.getElementById('piSupplierId').selectedOptions[0]?.getAttribute('data-name') || '';

    const invoice = {
        invoiceNumber: document.getElementById('piInvoiceNumber').value,
        invoiceDate: document.getElementById('piInvoiceDate').value,
        dueDate: document.getElementById('piDueDate').value,
        supplierId: supplierId,
        supplierName: supplierName,
        supplierInvoiceNumber: document.getElementById('piSupplierInvoiceNumber').value,
        relatedOrderId: document.getElementById('piRelatedOrderId')?.value || null,
        reference: document.getElementById('piReference').value,
        notes: document.getElementById('piNotes').value,
        lines: lines,
        subTotal: subTotal,
        vatAmount: vatAmount,
        totalAmount: totalAmount,
        status: 'pending',
        payments: []
    };

    try {
        await create('purchaseinvoices', invoice);
        closeModal();
        showSuccess('Inkoopfactuur succesvol aangemaakt');
        await loadPurchaseInvoices();
    } catch (error) {
        showError(error.message);
    }
}

async function showPurchaseInvoiceDetails(id) {
    const invoice = _purchaseInvoicesCache.find(inv => inv.id === id);
    if (!invoice) return;

    const supplier = _purchaseInvoicesSuppliersCache.find(s => s.id === invoice.supplierId);
    const supplierName = supplier?.name || invoice.supplierName || 'Onbekend';

    const payments = invoice.payments || [];
    const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainingAmount = invoice.totalAmount - paidAmount;

    let order = null;
    if (invoice.relatedOrderId) {
        try {
            order = await getById('orders', invoice.relatedOrderId);
        } catch (e) {
            console.error('Could not load related order', e);
        }
    }

    const html = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-premium max-w-4xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="text-2xl font-bold flex items-center gap-3">
                        <div class="icon-premium icon-red">
                            <i class="fas fa-file-invoice-dollar"></i>
                        </div>
                        Inkoopfactuur ${invoice.invoiceNumber}
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="modal-body space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <div class="text-sm text-gray-500">Leverancier</div>
                            <div class="font-medium">${supplierName}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-500">Leverancier factuurnummer</div>
                            <div class="font-medium">${invoice.supplierInvoiceNumber || '-'}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-500">Factuurdatum</div>
                            <div class="font-medium">${formatDate(invoice.invoiceDate)}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-500">Vervaldatum</div>
                            <div class="font-medium">${formatDate(invoice.dueDate)}</div>
                        </div>
                    </div>

                    ${invoice.reference ? `
                        <div>
                            <div class="text-sm text-gray-500">Referentie</div>
                            <div class="font-medium">${invoice.reference}</div>
                        </div>
                    ` : ''}

                    ${order ? `
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div class="flex items-center gap-2 text-blue-800">
                                <i class="fas fa-link"></i>
                                <span class="font-semibold">Gekoppeld aan order</span>
                            </div>
                            <div class="mt-2 text-sm text-blue-700">
                                <span class="font-medium">${order.orderNumber}</span> - ${order.reference || 'Geen referentie'}
                            </div>
                        </div>
                    ` : ''}

                    <div class="border-t pt-4">
                        <h3 class="font-semibold mb-3">Regels</h3>
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="text-left py-2 px-3">Omschrijving</th>
                                    <th class="text-right py-2 px-3">Aantal</th>
                                    <th class="text-right py-2 px-3">Prijs</th>
                                    <th class="text-right py-2 px-3">BTW</th>
                                    <th class="text-right py-2 px-3">Bedrag</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(invoice.lines || []).map(line => `
                                    <tr class="border-t">
                                        <td class="py-2 px-3">${line.description}</td>
                                        <td class="text-right py-2 px-3">${line.quantity}</td>
                                        <td class="text-right py-2 px-3">${formatCurrency(line.unitPrice)}</td>
                                        <td class="text-right py-2 px-3">${line.vatPercentage}%</td>
                                        <td class="text-right py-2 px-3 font-medium">${formatCurrency(line.amount)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="border-t pt-4">
                        <div class="flex justify-end">
                            <div class="w-64 space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span>Subtotaal:</span>
                                    <span>${formatCurrency(invoice.subTotal)}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span>BTW:</span>
                                    <span>${formatCurrency(invoice.vatAmount)}</span>
                                </div>
                                <div class="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>Totaal:</span>
                                    <span>${formatCurrency(invoice.totalAmount)}</span>
                                </div>
                                ${paidAmount > 0 ? `
                                    <div class="flex justify-between text-sm text-green-600 border-t pt-2">
                                        <span>Betaald:</span>
                                        <span>-${formatCurrency(paidAmount)}</span>
                                    </div>
                                    <div class="flex justify-between font-bold text-lg text-orange-600 border-t pt-2">
                                        <span>Nog te betalen:</span>
                                        <span>${formatCurrency(remainingAmount)}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    ${payments.length > 0 ? `
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-3">Betalingen</h3>
                            <div class="space-y-2">
                                ${payments.map(p => `
                                    <div class="flex justify-between items-center bg-green-50 border border-green-200 rounded p-2 text-sm">
                                        <div>
                                            <div class="font-medium">${formatDate(p.date)}</div>
                                            <div class="text-xs text-gray-600">${p.method || 'Betaling'}</div>
                                        </div>
                                        <div class="font-bold text-green-600">${formatCurrency(p.amount)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${invoice.notes ? `
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-2">Notities</h3>
                            <div class="text-sm text-gray-700 whitespace-pre-wrap">${invoice.notes}</div>
                        </div>
                    ` : ''}

                    <div class="flex gap-3 justify-end pt-4 border-t">
                        <button onclick="closeModal()" class="btn-ghost">
                            Sluiten
                        </button>
                        ${paidAmount < invoice.totalAmount ? `
                            <button onclick="closeModal(); showCreatePaymentForPurchaseInvoice('${id}')" class="btn-bamboo">
                                <i class="fas fa-hand-holding-dollar mr-2"></i>Betaling registreren
                            </button>
                        ` : ''}
                        <button onclick="closeModal(); showEditPurchaseInvoice('${id}')" class="btn-bamboo">
                            <i class="fas fa-edit mr-2"></i>Bewerken
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

async function showEditPurchaseInvoice(id) {
    const invoice = _purchaseInvoicesCache.find(inv => inv.id === id);
    if (!invoice) return;

    // Load orders
    let orders = [];
    try {
        orders = await getAll('orders');
    } catch (e) {
        console.error('Could not load orders', e);
    }

    const suppliers = _purchaseInvoicesSuppliersCache;

    const html = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-premium max-w-4xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="text-2xl font-bold flex items-center gap-3">
                        <div class="icon-premium icon-red">
                            <i class="fas fa-file-invoice-dollar"></i>
                        </div>
                        Inkoopfactuur bewerken
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form onsubmit="handleUpdatePurchaseInvoice(event, '${id}')" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold mb-1">Factuurnummer *</label>
                                <input type="text" id="piInvoiceNumber" value="${invoice.invoiceNumber || ''}" required class="input-premium w-full">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold mb-1">Leverancier *</label>
                                <select id="piSupplierId" required class="input-premium w-full">
                                    <option value="">Selecteer leverancier...</option>
                                    ${suppliers.map(s => `<option value="${s.id}" data-name="${s.name || ''}" ${s.id === invoice.supplierId ? 'selected' : ''}>${s.name || s.supplierNumber}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-sm font-semibold mb-1">Factuurdatum *</label>
                                <input type="date" id="piInvoiceDate" value="${invoice.invoiceDate || ''}" required class="input-premium w-full">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold mb-1">Vervaldatum *</label>
                                <input type="date" id="piDueDate" value="${invoice.dueDate || ''}" required class="input-premium w-full">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold mb-1">Leverancier factuurnr</label>
                                <input type="text" id="piSupplierInvoiceNumber" value="${invoice.supplierInvoiceNumber || ''}" class="input-premium w-full">
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold mb-1">Referentie</label>
                            <input type="text" id="piReference" value="${invoice.reference || ''}" class="input-premium w-full">
                        </div>

                        ${orders.length > 0 ? `
                            <div>
                                <label class="block text-sm font-semibold mb-1">Koppelen aan order (optioneel)</label>
                                <select id="piRelatedOrderId" class="input-premium w-full">
                                    <option value="">Geen koppeling</option>
                                    ${orders.filter(o => o.status !== 'cancelled').map(o => `<option value="${o.id}" ${o.id === invoice.relatedOrderId ? 'selected' : ''}>${o.orderNumber} - ${o.reference || 'Geen referentie'}</option>`).join('')}
                                </select>
                            </div>
                        ` : ''}

                        <div>
                            <label class="block text-sm font-semibold mb-1">Notities</label>
                            <textarea id="piNotes" rows="2" class="input-premium w-full">${invoice.notes || ''}</textarea>
                        </div>

                        <div class="border-t pt-4">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="font-semibold">Regels</h3>
                                <button type="button" onclick="addPurchaseInvoiceLine()" class="btn-sm-bamboo">
                                    <i class="fas fa-plus mr-1"></i>Regel toevoegen
                                </button>
                            </div>
                            <div id="piLinesContainer" class="space-y-2">
                                <!-- Lines will be added here -->
                            </div>
                        </div>

                        <div class="border-t pt-4">
                            <div class="flex justify-end">
                                <div class="w-64 space-y-2">
                                    <div class="flex justify-between text-sm">
                                        <span>Subtotaal:</span>
                                        <span id="piSubTotal">€ 0,00</span>
                                    </div>
                                    <div class="flex justify-between text-sm">
                                        <span>BTW:</span>
                                        <span id="piVatAmount">€ 0,00</span>
                                    </div>
                                    <div class="flex justify-between font-bold text-lg border-t pt-2">
                                        <span>Totaal:</span>
                                        <span id="piTotalAmount">€ 0,00</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold mb-1">Status</label>
                            <select id="piStatus" class="input-premium w-full">
                                <option value="pending" ${invoice.status === 'pending' ? 'selected' : ''}>Openstaand</option>
                                <option value="paid" ${invoice.status === 'paid' ? 'selected' : ''}>Betaald</option>
                                <option value="overdue" ${invoice.status === 'overdue' ? 'selected' : ''}>Achterstallig</option>
                                <option value="cancelled" ${invoice.status === 'cancelled' ? 'selected' : ''}>Geannuleerd</option>
                            </select>
                        </div>

                        <div class="flex gap-3 justify-end pt-4 border-t">
                            <button type="button" onclick="closeModal()" class="btn-ghost">
                                Annuleren
                            </button>
                            <button type="submit" class="btn-bamboo">
                                <i class="fas fa-save mr-2"></i>Opslaan
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    
    // Add existing lines
    _piLineCounter = 0;
    (invoice.lines || []).forEach(line => {
        _piLineCounter++;
        const lineId = `pi-line-${_piLineCounter}`;
        const lineHtml = `
            <div id="${lineId}" class="grid grid-cols-12 gap-2 items-start bg-gray-50 p-3 rounded">
                <div class="col-span-5">
                    <label class="block text-xs font-semibold mb-1">Omschrijving</label>
                    <input type="text" class="input-premium w-full text-sm pi-line-desc" value="${line.description || ''}" required>
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-semibold mb-1">Aantal</label>
                    <input type="number" class="input-premium w-full text-sm pi-line-qty" value="${line.quantity || 1}" min="1" required onchange="calculatePurchaseInvoiceLineTotals()">
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-semibold mb-1">Prijs</label>
                    <input type="number" step="0.01" class="input-premium w-full text-sm pi-line-price" value="${line.unitPrice || 0}" required onchange="calculatePurchaseInvoiceLineTotals()">
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-semibold mb-1">BTW %</label>
                    <input type="number" step="0.01" class="input-premium w-full text-sm pi-line-vat" value="${line.vatPercentage || 21}" required onchange="calculatePurchaseInvoiceLineTotals()">
                </div>
                <div class="col-span-1 flex items-end">
                    <button type="button" onclick="removePurchaseInvoiceLine('${lineId}')" class="btn-ghost text-red-600 w-full">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        document.getElementById('piLinesContainer').insertAdjacentHTML('beforeend', lineHtml);
    });
    
    calculatePurchaseInvoiceLineTotals();
}

async function handleUpdatePurchaseInvoice(e, id) {
    e.preventDefault();
    
    // Collect lines
    const lines = [];
    const lineElements = document.querySelectorAll('#piLinesContainer > div');
    lineElements.forEach(line => {
        const desc = line.querySelector('.pi-line-desc')?.value;
        const qty = parseInt(line.querySelector('.pi-line-qty')?.value || 0);
        const price = parseFloat(line.querySelector('.pi-line-price')?.value || 0);
        const vat = parseFloat(line.querySelector('.pi-line-vat')?.value || 0);
        const amount = qty * price * (1 + vat / 100);
        
        lines.push({
            description: desc,
            quantity: qty,
            unitPrice: price,
            vatPercentage: vat,
            amount: amount
        });
    });

    const subTotal = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
    const vatAmount = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice * l.vatPercentage / 100), 0);
    const totalAmount = subTotal + vatAmount;

    const supplierId = document.getElementById('piSupplierId').value;
    const supplierName = document.getElementById('piSupplierId').selectedOptions[0]?.getAttribute('data-name') || '';

    const invoice = {
        invoiceNumber: document.getElementById('piInvoiceNumber').value,
        invoiceDate: document.getElementById('piInvoiceDate').value,
        dueDate: document.getElementById('piDueDate').value,
        supplierId: supplierId,
        supplierName: supplierName,
        supplierInvoiceNumber: document.getElementById('piSupplierInvoiceNumber').value,
        relatedOrderId: document.getElementById('piRelatedOrderId')?.value || null,
        reference: document.getElementById('piReference').value,
        notes: document.getElementById('piNotes').value,
        lines: lines,
        subTotal: subTotal,
        vatAmount: vatAmount,
        totalAmount: totalAmount,
        status: document.getElementById('piStatus')?.value || 'pending',
        payments: _purchaseInvoicesCache.find(inv => inv.id === id)?.payments || []
    };

    try {
        await update('purchaseinvoices', id, invoice);
        closeModal();
        showSuccess('Inkoopfactuur succesvol bijgewerkt');
        await loadPurchaseInvoices();
    } catch (error) {
        showError(error.message);
    }
}

async function deletePurchaseInvoice(id) {
    const invoice = _purchaseInvoicesCache.find(inv => inv.id === id);
    if (!invoice) return;

    if (!confirm(`Weet je zeker dat je inkoopfactuur "${invoice.invoiceNumber}" wilt verwijderen?`)) {
        return;
    }

    try {
        await apiRequest(`/purchaseinvoices/${id}`, { method: 'DELETE' });
        showSuccess('Inkoopfactuur succesvol verwijderd');
        await loadPurchaseInvoices();
    } catch (error) {
        showError(error.message);
    }
}

function showCreatePaymentForPurchaseInvoice(invoiceId) {
    const invoice = _purchaseInvoicesCache.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    const paid = (invoice.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const remaining = invoice.totalAmount - paid;

    const html = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-premium max-w-md">
                <div class="modal-header">
                    <h2 class="text-xl font-bold flex items-center gap-3">
                        <div class="icon-premium icon-wood">
                            <i class="fas fa-hand-holding-dollar"></i>
                        </div>
                        Betaling registreren
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form onsubmit="handleCreatePaymentForPurchaseInvoice(event, '${invoiceId}')" class="space-y-4">
                        <div class="bg-gray-50 rounded p-3">
                            <div class="text-sm text-gray-600">Factuur ${invoice.invoiceNumber}</div>
                            <div class="text-lg font-bold">${formatCurrency(invoice.totalAmount)}</div>
                            ${paid > 0 ? `<div class="text-sm text-orange-600">Nog te betalen: ${formatCurrency(remaining)}</div>` : ''}
                        </div>

                        <div>
                            <label class="block text-sm font-semibold mb-1">Bedrag *</label>
                            <input type="number" step="0.01" id="paymentAmount" value="${remaining.toFixed(2)}" required class="input-premium w-full">
                        </div>

                        <div>
                            <label class="block text-sm font-semibold mb-1">Betaaldatum *</label>
                            <input type="date" id="paymentDate" value="${new Date().toISOString().split('T')[0]}" required class="input-premium w-full">
                        </div>

                        <div>
                            <label class="block text-sm font-semibold mb-1">Betaalmethode</label>
                            <select id="paymentMethod" class="input-premium w-full">
                                <option value="Bankoverschrijving">Bankoverschrijving</option>
                                <option value="iDEAL">iDEAL</option>
                                <option value="Creditcard">Creditcard</option>
                                <option value="Contant">Contant</option>
                                <option value="Anders">Anders</option>
                            </select>
                        </div>

                        <div class="flex gap-3 justify-end pt-4 border-t">
                            <button type="button" onclick="closeModal()" class="btn-ghost">
                                Annuleren
                            </button>
                            <button type="submit" class="btn-bamboo">
                                <i class="fas fa-save mr-2"></i>Registreren
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

async function handleCreatePaymentForPurchaseInvoice(e, invoiceId) {
    e.preventDefault();

    const invoice = _purchaseInvoicesCache.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    const payment = {
        paymentId: `PAY-${Date.now()}`,
        date: document.getElementById('paymentDate').value,
        amount: parseFloat(document.getElementById('paymentAmount').value),
        method: document.getElementById('paymentMethod').value
    };

    const payments = invoice.payments || [];
    payments.push(payment);

    try {
        await update('purchaseinvoices', invoiceId, { ...invoice, payments });
        closeModal();
        showSuccess('Betaling succesvol geregistreerd');
        await loadPurchaseInvoices();
    } catch (error) {
        showError(error.message);
    }
}
