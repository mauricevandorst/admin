// Orders management

function generateOrderNumber(orders) {
    if (!orders || orders.length === 0) return 'ORD-0001';
    const numbers = (orders || []).map(o => {
        const match = (o.orderNumber || '').match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    });
    return `ORD-${String(Math.max(...numbers, 0) + 1).padStart(4, '0')}`;
}

let _ordersCache = [];
let _ordersCustomerMap = {};
let _orderSortCol = 'orderNumber';
let _orderSortDir = -1;
let _invoicesByOrderId = {};
let _archivedSortCol = 'orderNumber';
let _archivedSortDir = -1;

async function loadOrders() {
    try {
        const [orders, customers, invoices] = await Promise.all([
            getAll('orders'),
            getAll('customers'),
            getAll('invoices')
        ]);

        _ordersCustomerMap = {};
        if (customers) {
            customers.forEach(c => {
                _ordersCustomerMap[c.customerId] = c.business?.displayName || c.business?.name || c.customerId;
            });
        }

        _invoicesByOrderId = {};
        (invoices || []).forEach(inv => {
            if (inv.orderId) {
                if (!_invoicesByOrderId[inv.orderId]) _invoicesByOrderId[inv.orderId] = [];
                _invoicesByOrderId[inv.orderId].push(inv);
            }
        });

        _ordersCache = orders || [];
        renderOrdersTable();
    } catch (error) {
        showError(error.message);
    }
}

function sortOrders(col) {
    if (_orderSortCol === col) {
        _orderSortDir = -_orderSortDir;
    } else {
        _orderSortCol = col;
        _orderSortDir = 1;
    }
    renderOrdersTable();
}

function _orderSortIcon(col) {
    if (_orderSortCol !== col) return '<i class="fas fa-sort ml-1 opacity-30"></i>';
    return _orderSortDir === 1
        ? '<i class="fas fa-sort-up ml-1"></i>'
        : '<i class="fas fa-sort-down ml-1"></i>';
}

function isOrderCompleted(order) {
    if (order.status !== 'invoiced') return false;
    const orderInvoices = _invoicesByOrderId[order.id] || [];
    if (orderInvoices.length === 0) return false;
    return orderInvoices.every(inv => {
        const paid = (inv.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        return inv.totalAmount <= 0 || paid >= inv.totalAmount;
    });
}

function isOrderArchived(order) {
    return order.status === 'cancelled' || isOrderCompleted(order);
}

function applySortToOrders(orders, col, dir) {
    return [...orders].sort((a, b) => {
        if (col === 'orderNumber') {
            const aNum = parseInt((a.orderNumber || '').replace(/\D/g, ''), 10) || 0;
            const bNum = parseInt((b.orderNumber || '').replace(/\D/g, ''), 10) || 0;
            return (aNum - bNum) * dir;
        }
        if (col === 'totalAmount') {
            return ((a.totalAmount || 0) - (b.totalAmount || 0)) * dir;
        }
        let aVal = '', bVal = '';
        if (col === 'customer') {
            aVal = _ordersCustomerMap[a.customerId] || '';
            bVal = _ordersCustomerMap[b.customerId] || '';
        } else if (col === 'orderDate') {
            aVal = a.orderDate || '';
            bVal = b.orderDate || '';
        } else if (col === 'status') {
            aVal = a.status || '';
            bVal = b.status || '';
        }
        return aVal < bVal ? -dir : aVal > bVal ? dir : 0;
    });
}

function sortArchivedOrders(col) {
    if (_archivedSortCol === col) {
        _archivedSortDir = -_archivedSortDir;
    } else {
        _archivedSortCol = col;
        _archivedSortDir = 1;
    }
    renderOrdersTable();
}

function _archivedSortIcon(col) {
    if (_archivedSortCol !== col) return '<i class="fas fa-sort ml-1 opacity-30"></i>';
    return _archivedSortDir === 1
        ? '<i class="fas fa-sort-up ml-1"></i>'
        : '<i class="fas fa-sort-down ml-1"></i>';
}

function renderOrdersTable() {
    const statusConfig = {
        draft:     { class: 'bg-gray-100 text-gray-800',    label: 'Concept',       icon: 'pencil' },
        confirmed: { class: 'bg-blue-100 text-blue-800', label: 'Bevestigd',  icon: 'check' },
        approved:  { class: 'bg-green-100 text-green-800',  label: 'Goedgekeurd',   icon: 'thumbs-up' },
        invoiced:  { class: 'bg-purple-100 text-purple-800',    label: 'Gefactureerd',  icon: 'file-invoice' },
        cancelled: { class: 'bg-red-100 text-red-800',      label: 'Geannuleerd',   icon: 'times' }
    };
    const completedStatus = { class: 'bg-teal-100 text-teal-800', label: 'Voltooid', icon: 'check-double' };

    const activeOrders   = applySortToOrders(_ordersCache.filter(o => !isOrderArchived(o)), _orderSortCol,   _orderSortDir);
    const archivedOrders = applySortToOrders(_ordersCache.filter(o =>  isOrderArchived(o)), _archivedSortCol, _archivedSortDir);

    const thSort = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase text-nowrap cursor-pointer hover:bg-gray-100 select-none';

    let html = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Orders</h2>
            ${canEdit() ? `
            <button onclick="showCreateOrder()"
                    class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                <i class="fas fa-plus"></i> Nieuw
            </button>
            ` : ''}
        </div>
    `;

    // --- Actieve orders ---
    if (activeOrders.length === 0) {
        html += '<p class="text-gray-500 text-center py-8">Geen actieve orders gevonden</p>';
    } else {
        html += '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
        html += `
            <thead class="bg-gray-50">
                <tr>
                    <th class="${thSort}" onclick="sortOrders('orderNumber')">Ordernr. ${_orderSortIcon('orderNumber')}</th>
                    <th class="${thSort}" onclick="sortOrders('customer')">Klant ${_orderSortIcon('customer')}</th>
                    <th class="${thSort}" onclick="sortOrders('orderDate')">Datum ${_orderSortIcon('orderDate')}</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Regels</th>
                    <th class="${thSort}" onclick="sortOrders('totalAmount')">Totaal ${_orderSortIcon('totalAmount')}</th>
                    <th class="${thSort}" onclick="sortOrders('status')">Status ${_orderSortIcon('status')}</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
        `;

        activeOrders.forEach(order => {
            const customerName = _ordersCustomerMap[order.customerId] || order.customerId || 'N/A';
            const linesCount = order.lines?.length || 0;
            const status = statusConfig[order.status] || statusConfig.draft;
            const canApprove = order.status === 'draft' || order.status === 'confirmed';
            const canGenerateInvoice = order.status !== 'invoiced' && order.status !== 'cancelled';
            const canGenerateQuote = order.status !== 'cancelled';

            const approveButton = (canApprove && canEdit()) ? `
                <button onclick="approveOrder('${order.id}')"
                        class="text-green-600 hover:text-green-900 mr-3"
                        title="Markeer als goedgekeurd">
                    <i class="fas fa-thumbs-up"></i>
                </button>
            ` : '';

            const quoteButton = canGenerateQuote ? `
                <button onclick="showDownloadQuoteFromOrder('${order.id}')"
                        class="text-amber-600 hover:text-amber-900 mr-3"
                        title="Offerte als PDF downloaden">
                    <i class="fas fa-download"></i>
                </button>
            ` : '';

            const generateButton = canGenerateInvoice ? `
                <button onclick="showGenerateInvoiceFromOrder('${order.id}')"
                        class="text-purple-600 hover:text-purple-900 mr-3"
                        title="Genereer factuur">
                    <i class="fas fa-file-invoice"></i>
                </button>
            ` : '';

            html += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div class="text-blue-600 hover:text-blue-900 cursor-pointer hover:underline" onclick="showOrderDetails('${order.id}')">${order.orderNumber || 'N/A'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${customerName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatDate(order.orderDate)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${linesCount} regel${linesCount !== 1 ? 's' : ''}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        ${formatCurrency(order.totalAmount || 0)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 py-1 text-xs font-semibold rounded ${status.class}">
                            <i class="fas fa-${status.icon}"></i> ${status.label}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        ${canEdit() ? `
                        <button onclick="showEditOrder('${order.id}')"
                                class="text-blue-600 hover:text-blue-900 mr-3" title="Bewerken">
                            <i class="fas fa-edit"></i>
                        </button>
                        ` : ''}${approveButton}
                        ${quoteButton}
                        ${canEdit() ? generateButton : ''}
                        ${canDelete() ? `
                        <button onclick="deleteOrder('${order.id}')"
                                class="text-red-600 hover:text-red-900" title="Verwijderen">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
    }

    // --- Geannuleerde & voltooide orders ---
    html += `
        <div class="mt-8">
            <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
                <span class="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                    <i class="fas fa-archive"></i> Voltooid &amp; Geannuleerd
                </span>
                <span class="text-gray-500 text-sm font-normal">(${archivedOrders.length})</span>
            </h3>
    `;

    if (archivedOrders.length === 0) {
        html += '<p class="text-gray-500 text-center py-6">Geen geannuleerde of voltooide orders</p>';
    } else {
        html += '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
        html += `
            <thead class="bg-gray-50">
                <tr>
                    <th class="${thSort}" onclick="sortArchivedOrders('orderNumber')">Ordernr. ${_archivedSortIcon('orderNumber')}</th>
                    <th class="${thSort}" onclick="sortArchivedOrders('customer')">Klant ${_archivedSortIcon('customer')}</th>
                    <th class="${thSort}" onclick="sortArchivedOrders('orderDate')">Datum ${_archivedSortIcon('orderDate')}</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Regels</th>
                    <th class="${thSort}" onclick="sortArchivedOrders('totalAmount')">Totaal ${_archivedSortIcon('totalAmount')}</th>
                    <th class="${thSort}" onclick="sortArchivedOrders('status')">Status ${_archivedSortIcon('status')}</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
        `;

        archivedOrders.forEach(order => {
            const customerName = _ordersCustomerMap[order.customerId] || order.customerId || 'N/A';
            const linesCount = order.lines?.length || 0;
            const displayStatus = isOrderCompleted(order)
                ? completedStatus
                : (statusConfig[order.status] || statusConfig.draft);

            html += `
                <tr class="hover:bg-gray-50 opacity-75">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div class="text-blue-600 hover:text-blue-900 cursor-pointer hover:underline" onclick="showOrderDetails('${order.id}')">${order.orderNumber || 'N/A'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${customerName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatDate(order.orderDate)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${linesCount} regel${linesCount !== 1 ? 's' : ''}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        ${formatCurrency(order.totalAmount || 0)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 py-1 text-xs font-semibold rounded ${displayStatus.class}">
                            <i class="fas fa-${displayStatus.icon}"></i> ${displayStatus.label}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        ${canEdit() ? `
                        <button onclick="showEditOrder('${order.id}')"
                                class="text-blue-600 hover:text-blue-900 mr-3" title="Bewerken">
                            <i class="fas fa-edit"></i>
                        </button>
                        ` : ''}
                        ${canDelete() ? `
                        <button onclick="deleteOrder('${order.id}')"
                                class="text-red-600 hover:text-red-900" title="Verwijderen">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
    }

    html += '</div>';

    document.getElementById('content').innerHTML = html;
}

function getOrderForm(order = null, customers = [], linkedInvoices = [], suppliers = []) {
    const ord = order || {};
    const orderDate = order ? (ord.orderDate ? ord.orderDate.split('T')[0] : '') : getTodayDate();
    const isInvoiced = order?.status === 'invoiced';
    const readonlyAttr = isInvoiced ? 'readonly' : '';
    const readonlyClass = isInvoiced ? 'bg-gray-100 cursor-not-allowed' : '';

    let customerOptions = '<option value="">-- Selecteer een klant --</option>';
    customers.forEach(c => {
        const name = c.business?.displayName || c.business?.name || c.customerId;
        const sel = ord.customerId === c.customerId ? 'selected' : '';
        customerOptions += `<option value="${c.customerId}" ${sel}>${name}</option>`;
    });

    const lines = ord.lines?.length > 0
        ? ord.lines
        : [{ description: '', quantity: 1, unitPrice: 0, vatPercentage: 21 }];

    let linesHtml = lines.map((line, i) => getOrderLineRow(i, line, isInvoiced, suppliers)).join('');

    return `
        <div class="space-y-6 max-h-[70vh] overflow-y-auto pb-2">
            ${isInvoiced ? `
            <div class="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <i class="fas fa-lock text-green-600"></i>
                <span class="text-sm text-green-800">
                    Deze order is al gefactureerd. Orderregels kunnen niet meer worden gewijzigd.
                </span>
            </div>
            ` : ''}

            <!-- Ordergegevens -->
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 class="font-bold text-lg mb-3">Ordergegevens</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Klant<span class="text-red-600 ml-1">*</span></label>
                        <select id="customerId" required ${isInvoiced ? 'disabled' : ''}
                                class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${readonlyClass}">
                            ${customerOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Orderdatum<span class="text-red-600 ml-1">*</span></label>
                        <input type="date" id="orderDate" value="${orderDate}" required
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Referentie</label>
                        <input type="text" id="reference" value="${ord.reference || ''}"
                               placeholder="PO nummer, project code..."
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Status</label>
                        <select id="status" ${isInvoiced ? 'disabled' : ''} class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${readonlyClass}">
                            <option value="draft"     ${(!ord.status || ord.status === 'draft') ? 'selected' : ''}>Concept</option>
                            <option value="confirmed" ${ord.status === 'confirmed' ? 'selected' : ''}>Bevestigd</option>
                            <option value="approved"  ${ord.status === 'approved' ? 'selected' : ''}>Goedgekeurd</option>
                            <option value="invoiced"  ${ord.status === 'invoiced' ? 'selected' : ''} disabled>Gefactureerd (automatisch)</option>
                            <option value="cancelled" ${ord.status === 'cancelled' ? 'selected' : ''}>Geannuleerd</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Orderregels -->
            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 class="font-bold text-lg mb-2">Orderregels</h3>
                ${!isInvoiced ? `
                <div class="flex gap-2 mb-3">
                    <button type="button" onclick="pickStandardOrderLine()"
                            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
                        <i class="fas fa-list-check"></i> Standaard&shy;regels
                    </button>
                    <button type="button" onclick="addOrderLine()"
                            class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">
                        <i class="fas fa-plus"></i> Handmatig
                    </button>
                </div>
                ` : ''}
                <div id="orderLines" class="space-y-3">
                    ${linesHtml}
                </div>
            </div>

            <!-- Totalen -->
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 class="font-bold text-lg mb-3">Totalen & Marge</h3>
                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span>Subtotaal (excl. BTW):</span>
                        <span id="orderSubtotalDisplay" class="font-semibold">€ 0,00</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span>BTW bedrag:</span>
                        <span id="orderVatDisplay" class="font-semibold">€ 0,00</span>
                    </div>
                    <div class="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Totaal (incl. BTW):</span>
                        <span id="orderTotalDisplay" class="text-blue-600">€ 0,00</span>
                    </div>
                    <div class="border-t pt-2 mt-2">
                        <div class="flex justify-between text-sm text-red-700">
                            <span><i class="fas fa-coins"></i> Geschatte inkoopkosten:</span>
                            <span id="orderEstimatedCostDisplay" class="font-semibold">€ 0,00</span>
                        </div>
                        <div class="flex justify-between text-sm mt-2 pt-2 border-t">
                            <span class="text-green-700"><i class="fas fa-chart-line"></i> Geschatte marge:</span>
                            <span id="orderEstimatedMarginDisplay" class="text-green-700">€ 0,00 (0%)</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Opmerkingen -->
            <div>
                <label class="block text-sm font-medium mb-2">Opmerkingen</label>
                <textarea id="notes" rows="3"
                          placeholder="Extra informatie..."
                          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">${ord.notes || ''}</textarea>
            </div>

            ${order ? `
            <!-- Gekoppelde facturen -->
            <div class="border border-purple-200 rounded-lg overflow-hidden">
                <div class="px-4 py-2 bg-purple-50 border-b border-purple-200">
                    <h4 class="font-semibold text-sm text-purple-700 flex items-center gap-2">
                        <i class="fas fa-file-invoice text-purple-600"></i>
                        Gekoppelde facturen
                    </h4>
                </div>
                ${linkedInvoices.length > 0 ? `
                <div class="divide-y divide-gray-100">
                    ${linkedInvoices.map(inv => {
        const statusLabels = { paid: 'Betaald', partially_paid: 'Gedeeltelijk', unpaid: 'Openstaand', pending: 'Openstaand', overdue: 'Achterstallig' };
        const statusClasses = { paid: 'bg-green-100 text-green-800', partially_paid: 'bg-purple-100 text-purple-800', unpaid: 'bg-yellow-100 text-yellow-800', pending: 'bg-yellow-100 text-yellow-800', overdue: 'bg-red-100 text-red-800' };
        return `
                        <div class="flex items-center justify-between px-4 py-3 text-sm">
                            <div>
                                <span class="font-medium">${inv.invoiceNumber || 'N/A'}</span>
                                <span class="text-gray-500 ml-2">${formatDate(inv.invoiceDate)}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="font-semibold">${formatCurrency(inv.totalAmount)}</span>
                                <span class="px-2 py-0.5 text-xs font-semibold rounded ${statusClasses[inv.status] || statusClasses.pending}">${statusLabels[inv.status] || 'Openstaand'}</span>
                                <button onclick="downloadInvoicePdf('${inv.id}')" class="text-gray-500 hover:text-gray-800" title="Download factuur PDF">
                                    <i class="fas fa-file-download"></i>
                                </button>
                            </div>
                        </div>`;
    }).join('')}
                </div>` : `
                <div class="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                    <i class="fas fa-info-circle text-gray-400"></i>
                    Geen gekoppelde facturen
                </div>`}
            </div>
            ` : ''}
        </div>
    `;
}

function getOrderLineRow(index, line = {}, readonly = false, suppliers = []) {
    const disabledAttr = readonly ? 'disabled' : '';
    const readonlyAttr = readonly ? 'readonly' : '';
    const readonlyClass = readonly ? 'bg-gray-100 cursor-not-allowed' : '';
    const vatPct = line.vatPercentage !== undefined ? line.vatPercentage : 21;
    const title = line.title || line.description || '';
    const description = line.description || '';
    const assignedSupplier = line.assignedSupplierId || '';
    const estimatedCost = line.estimatedCost || 0;

    // Calculate estimated margin for this line
    const sellPrice = (line.quantity || 1) * (line.unitPrice || 0);
    const costPrice = (line.quantity || 1) * estimatedCost;
    const lineMargin = sellPrice - costPrice;
    const lineMarginPct = sellPrice > 0 ? (lineMargin / sellPrice * 100) : 0;

    const supplierOptions = suppliers.length > 0 
        ? `<option value="">Geen leverancier</option>${suppliers.filter(s => s.isActive !== false).map(s => 
            `<option value="${s.id}" ${s.id === assignedSupplier ? 'selected' : ''}>${s.name || s.supplierNumber}</option>`
        ).join('')}`
        : '<option value="">Geen leveranciers beschikbaar</option>';

    return `
        <div class="order-line bg-white p-3 rounded border" data-index="${index}">
            <div class="flex flex-wrap gap-2 items-end">
                <div class="flex-1 min-w-0">
                    <label class="block text-xs font-medium mb-1">Titel<span class="text-red-600 ml-1">*</span></label>
                    <input type="text" class="line-title w-full px-2 py-1 border rounded text-sm font-medium ${readonlyClass}"
                           value="${title}" placeholder="Korte titel van dienst/product..."
                           onchange="calculateOrderTotals()" ${readonlyAttr} required>
                </div>
                <div class="w-24 shrink-0">
                    <label class="block text-xs font-medium mb-1">Aantal<span class="text-red-600 ml-1">*</span></label>
                    <input type="number" class="line-quantity w-full px-2 py-1 border rounded text-sm ${readonlyClass}"
                           value="${line.quantity || 1}" min="1" step="0.01"
                           onchange="calculateOrderTotals()" ${readonlyAttr} required>
                </div>
                <div class="w-28 shrink-0">
                    <label class="block text-xs font-medium mb-1">Verkoopprijs<span class="text-red-600 ml-1">*</span></label>
                    <input type="number" class="line-price w-full px-2 py-1 border rounded text-sm ${readonlyClass}"
                           value="${line.unitPrice || 0}" min="0" step="0.01"
                           onchange="calculateOrderTotals()" ${readonlyAttr} required>
                </div>
                <div class="w-20 shrink-0">
                    <label class="block text-xs font-medium mb-1">BTW %</label>
                    <select class="line-vat w-full px-2 py-1 border rounded text-sm ${readonlyClass}"
                            onchange="calculateOrderTotals()" ${disabledAttr}>
                        <option value="0"  ${vatPct === 0 ? 'selected' : ''}>0%</option>
                        <option value="9"  ${vatPct === 9 ? 'selected' : ''}>9%</option>
                        <option value="21" ${vatPct === 21 ? 'selected' : ''}>21%</option>
                    </select>
                </div>
                ${!readonly ? `
                <div class="shrink-0">
                    <button type="button" onclick="removeOrderLine(${index})"
                            class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                            title="Verwijder regel">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ` : ''}
            </div>
            <div class="mt-2">
                <label class="block text-xs font-medium mb-1">Beschrijving <span class="text-xs text-gray-500">(optioneel)</span></label>
                <textarea class="line-description w-full px-2 py-1 border rounded text-sm text-gray-600 ${readonlyClass}"
                       placeholder="Extra details..."
                       rows="2"
                       onchange="calculateOrderTotals()" ${readonlyAttr}>${description}</textarea>
            </div>

            <!-- Leverancier & Kostprijs (Fase 2) -->
            <div class="mt-3 pt-3 border-t border-gray-200">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-medium mb-1 text-blue-700">
                            <i class="fas fa-truck text-xs"></i> Leverancier (optioneel)
                        </label>
                        <select class="line-supplier w-full px-2 py-1 border rounded text-sm ${readonlyClass}"
                                onchange="calculateOrderTotals()" ${disabledAttr}>
                            ${supplierOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium mb-1 text-red-700">
                            <i class="fas fa-coins text-xs"></i> Geschatte inkoopprijs per stuk
                        </label>
                        <input type="number" class="line-cost w-full px-2 py-1 border rounded text-sm ${readonlyClass}"
                               value="${estimatedCost}" min="0" step="0.01"
                               onchange="calculateOrderTotals()" ${readonlyAttr}
                               placeholder="0.00">
                    </div>
                </div>
                <div class="mt-2 text-xs flex items-center justify-between">
                    <span class="text-gray-600">
                        Subtotaal verkoop: <span class="line-subtotal font-semibold">€ 0,00</span>
                    </span>
                    <span class="line-margin ${lineMargin >= 0 ? 'text-green-600' : 'text-red-600'} font-semibold">
                        Marge: ${formatCurrency(lineMargin)} (${lineMarginPct.toFixed(1)}%)
                    </span>
                </div>
            </div>
        </div>
    `;
}

function addOrderLine() {
    const container = document.getElementById('orderLines');
    const newIndex = container.querySelectorAll('.order-line').length;

    // Get suppliers from data attribute or global cache
    let suppliers = [];
    if (container && container.dataset.suppliers) {
        try {
            suppliers = JSON.parse(container.dataset.suppliers);
        } catch (e) {
            console.error('Failed to parse suppliers from data attribute', e);
        }
    }

    // Fallback to global cache
    if (!suppliers || suppliers.length === 0) {
        suppliers = window._orderFormSuppliers || [];
    }

    container.insertAdjacentHTML('beforeend', getOrderLineRow(newIndex, { quantity: 1, unitPrice: 0, vatPercentage: 21 }, false, suppliers));
    calculateOrderTotals();
}

function removeOrderLine(index) {
    const lines = document.querySelectorAll('.order-line');
    if (lines.length <= 1) {
        showToast('Er moet minimaal 1 orderregel zijn', 'error');
        return;
    }
    lines[index].remove();
    document.querySelectorAll('.order-line').forEach((line, i) => {
        line.dataset.index = i;
        const btn = line.querySelector('button[onclick^="removeOrderLine"]');
        if (btn) btn.setAttribute('onclick', `removeOrderLine(${i})`);
    });
    calculateOrderTotals();
}

function calculateOrderTotals() {
    let subtotal = 0;
    let vatTotal = 0;
    let estimatedCostTotal = 0;

    document.querySelectorAll('.order-line').forEach(line => {
        const quantity = parseFloat(line.querySelector('.line-quantity')?.value) || 0;
        const unitPrice = parseFloat(line.querySelector('.line-price')?.value) || 0;
        const vatPct = parseFloat(line.querySelector('.line-vat')?.value) || 0;
        const estimatedCost = parseFloat(line.querySelector('.line-cost')?.value) || 0;

        const lineAmount = quantity * unitPrice;
        const lineCost = quantity * estimatedCost;
        const lineMargin = lineAmount - lineCost;
        const lineMarginPct = lineAmount > 0 ? (lineMargin / lineAmount * 100) : 0;

        subtotal += lineAmount;
        vatTotal += lineAmount * (vatPct / 100);
        estimatedCostTotal += lineCost;

        const subtotalSpan = line.querySelector('.line-subtotal');
        if (subtotalSpan) subtotalSpan.textContent = formatCurrency(lineAmount);

        const marginSpan = line.querySelector('.line-margin');
        if (marginSpan) {
            marginSpan.textContent = `Marge: ${formatCurrency(lineMargin)} (${lineMarginPct.toFixed(1)}%)`;
            marginSpan.className = `line-margin ${lineMargin >= 0 ? 'text-green-600' : 'text-red-600'} font-semibold`;
        }
    });

    const total = subtotal + vatTotal;
    const estimatedMargin = subtotal - estimatedCostTotal;
    const estimatedMarginPct = subtotal > 0 ? (estimatedMargin / subtotal * 100) : 0;

    const sub = document.getElementById('orderSubtotalDisplay');
    const vat = document.getElementById('orderVatDisplay');
    const tot = document.getElementById('orderTotalDisplay');
    const cost = document.getElementById('orderEstimatedCostDisplay');
    const margin = document.getElementById('orderEstimatedMarginDisplay');

    if (sub) sub.textContent = formatCurrency(subtotal);
    if (vat) vat.textContent = formatCurrency(vatTotal);
    if (tot) tot.textContent = formatCurrency(total);
    if (cost) cost.textContent = formatCurrency(estimatedCostTotal);
    if (margin) {
        margin.textContent = `${formatCurrency(estimatedMargin)} (${estimatedMarginPct.toFixed(1)}%)`;
        margin.className = estimatedMargin >= 0 ? 'text-green-700 font-bold' : 'text-red-700 font-bold';
    }
}

function getOrderData() {
    const lines = [];
    let subtotal = 0;
    let vatTotal = 0;
    let estimatedCostTotal = 0;

    document.querySelectorAll('.order-line').forEach(lineEl => {
        const title = lineEl.querySelector('.line-title').value.trim();
        const description = lineEl.querySelector('.line-description').value.trim();
        const quantity = parseFloat(lineEl.querySelector('.line-quantity').value) || 0;
        const unitPrice = parseFloat(lineEl.querySelector('.line-price').value) || 0;
        const vatPercentage = parseFloat(lineEl.querySelector('.line-vat').value) || 0;
        const assignedSupplierId = lineEl.querySelector('.line-supplier')?.value || null;
        const estimatedCost = parseFloat(lineEl.querySelector('.line-cost')?.value) || 0;

        const amount = quantity * unitPrice;
        const lineCost = quantity * estimatedCost;

        subtotal += amount;
        vatTotal += amount * (vatPercentage / 100);
        estimatedCostTotal += lineCost;

        lines.push({ 
            title, 
            description, 
            quantity, 
            unitPrice, 
            vatPercentage, 
            amount,
            assignedSupplierId,
            estimatedCost
        });
    });

    const estimatedMargin = subtotal - estimatedCostTotal;

    return {
        customerId: document.getElementById('customerId').value.trim(),
        orderDate: document.getElementById('orderDate').value,
        reference: document.getElementById('reference').value.trim(),
        status: document.getElementById('status').value,
        notes: document.getElementById('notes').value.trim(),
        lines,
        subTotal: subtotal,
        vatAmount: Math.round(vatTotal * 100) / 100,
        totalAmount: subtotal + Math.round(vatTotal * 100) / 100,
        estimatedCost: estimatedCostTotal,
        estimatedMargin: estimatedMargin
    };
}

function validateOrderData(data) {
    const errors = [];
    if (!data.customerId) errors.push('Selecteer een klant');
    if (!data.orderDate) errors.push('Orderdatum is verplicht');
    if (!data.lines?.length) errors.push('Voeg minimaal 1 orderregel toe');
    return errors;
}

function getIncompleteOrderLines(lines) {
    return (lines || []).filter(line => !line.title || line.quantity <= 0);
}

async function showCreateOrder() {
    const loadingModal = showLoadingModal('Formulier voorbereiden...');
    try {
        const [customers, suppliers] = await Promise.all([
            getAll('customers'),
            getAll('suppliers')
        ]);

        hideLoadingModal();

        if (!customers || customers.length === 0) {
            showToast('Geen klanten beschikbaar. Maak eerst een klant aan.', 'error');
            return;
        }

        // Store suppliers globally for addOrderLine
        window._orderFormSuppliers = suppliers || [];

        createModal('Nieuwe Order', getOrderForm(null, customers, [], suppliers), async () => {
            const data = getOrderData();
            const errors = validateOrderData(data);
            if (errors.length > 0) throw new Error(errors.join('\n'));

            const validLines = data.lines.filter(l => l.title && l.quantity > 0);
            const incompleteLines = getIncompleteOrderLines(data.lines);

            if (validLines.length === 0) {
                throw new Error('Vul minimaal 1 orderregel volledig in (titel en aantal zijn verplicht)');
            }

            if (incompleteLines.length > 0) {
                const confirmed = confirm(
                    `De order bevat ${incompleteLines.length} onvolledige regel(s) die niet worden opgeslagen.\n\nWil je de order aanmaken zonder deze regel(s)?`
                );
                if (!confirmed) {
                    const err = new Error('');
                    err.silent = true;
                    throw err;
                }
                data.lines = validLines;
                let subtotal = 0, vatTotal = 0;
                data.lines.forEach(l => { subtotal += l.amount; vatTotal += l.amount * (l.vatPercentage / 100); });
                data.subTotal = subtotal;
                data.vatAmount = Math.round(vatTotal * 100) / 100;
                data.totalAmount = subtotal + data.vatAmount;
            }

            const allOrders = await getAll('orders').catch(() => []);
            data.orderNumber = generateOrderNumber(allOrders);

            await create('orders', data);
            showToast('Order aangemaakt', 'success');
            loadOrders();
        }, 'Opslaan', 'lg');

        // Store suppliers in the modal's orderLines container as data attribute
        setTimeout(() => {
            const container = document.getElementById('orderLines');
            if (container) {
                container.dataset.suppliers = JSON.stringify(suppliers || []);
            }
            calculateOrderTotals();
        }, 100);
    } catch (error) {
        hideLoadingModal();
        showToast('Fout bij laden: ' + error.message, 'error');
    }
}

async function showEditOrder(id) {
    const loadingModal = showLoadingModal('Order laden...');
    try {
        const [order, customers, allInvoices, suppliers] = await Promise.all([
            getById('orders', id),
            getAll('customers'),
            getAll('invoices'),
            getAll('suppliers')
        ]);

        hideLoadingModal();

        const linkedInvoices = (allInvoices || [])
            .filter(inv => inv.orderId === id)
            .sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || ''));

        // Store suppliers globally for addOrderLine
        window._orderFormSuppliers = suppliers || [];

        createModal('Order Bewerken', getOrderForm(order, customers || [], linkedInvoices, suppliers), async () => {
            const data = getOrderData();
            const errors = validateOrderData(data);
            if (errors.length > 0) throw new Error(errors.join('\n'));

            const validLines = data.lines.filter(l => l.title && l.quantity > 0);
            const incompleteLines = getIncompleteOrderLines(data.lines);

            if (validLines.length === 0) {
                throw new Error('Vul minimaal 1 orderregel volledig in (titel en aantal zijn verplicht)');
            }

            if (incompleteLines.length > 0) {
                const confirmed = confirm(
                    `De order bevat ${incompleteLines.length} onvolledige regel(s) die niet worden opgeslagen.\n\nWil je de order opslaan zonder deze regel(s)?`
                );
                if (!confirmed) {
                    const err = new Error('');
                    err.silent = true;
                    throw err;
                }
                data.lines = validLines;
                let subtotal = 0, vatTotal = 0;
                data.lines.forEach(l => { subtotal += l.amount; vatTotal += l.amount * (l.vatPercentage / 100); });
                data.subTotal = subtotal;
                data.vatAmount = Math.round(vatTotal * 100) / 100;
                data.totalAmount = subtotal + data.vatAmount;
            }

            data.orderNumber = order.orderNumber;
            await update('orders', id, data);
            showToast('Order bijgewerkt', 'success');
            loadOrders();
        }, 'Opslaan', 'lg');

        // Store suppliers in the modal's orderLines container as data attribute
        setTimeout(() => {
            const container = document.getElementById('orderLines');
            if (container) {
                container.dataset.suppliers = JSON.stringify(suppliers || []);
            }
            calculateOrderTotals();
        }, 100);
    } catch (error) {
        hideLoadingModal();
        showToast('Fout bij laden van order: ' + error.message, 'error');
    }
}

async function deleteOrder(id) {
    if (!confirm('Weet je zeker dat je deze order wilt verwijderen?')) return;
    try {
        await remove('orders', id);
        showToast('Order verwijderd', 'success');
        loadOrders();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function showOrderDetails(id) {
    try {
        const [order, customers, allInvoices, allPurchaseInvoices] = await Promise.all([
            getById('orders', id),
            getAll('customers'),
            getAll('invoices'),
            getAll('purchaseinvoices')
        ]);

        if (!order) {
            showToast('Order niet gevonden', 'error');
            return;
        }

        const customer = customers?.find(c => c.customerId === order.customerId);
        const customerName = customer?.business?.displayName || customer?.business?.name || order.customerId || 'N/A';

        const linkedInvoices = (allInvoices || [])
            .filter(inv => inv.orderId === id)
            .sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || ''));

        const linkedPurchaseInvoices = (allPurchaseInvoices || [])
            .filter(inv => inv.relatedOrderId === id)
            .sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || ''));

        // Calculate margin
        const totalRevenue = order.totalAmount || 0;
        const totalCosts = linkedPurchaseInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalMargin = totalRevenue - totalCosts;
        const marginPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue * 100) : 0;

        // Get estimated costs from order
        const estimatedCosts = order.estimatedCost || 0;
        const estimatedMargin = order.estimatedMargin || 0;

        // Check for cost overruns
        const costOverrun = totalCosts - estimatedCosts;
        const hasWarning = costOverrun > 0;

        const statusConfig = {
            draft: { class: 'bg-gray-100 text-gray-800', label: 'Concept' },
            confirmed: { class: 'bg-blue-100 text-blue-800', label: 'Bevestigd' },
            approved: { class: 'bg-green-100 text-green-800', label: 'Goedgekeurd' },
            invoiced: { class: 'bg-purple-100 text-purple-800', label: 'Gefactureerd' },
            cancelled: { class: 'bg-red-100 text-red-800', label: 'Geannuleerd' }
        };
        const status = statusConfig[order.status] || statusConfig.draft;

        const linesHtml = (order.lines || []).map(line => `
            <tr>
                <td class="py-2 px-4 text-sm">
                    <div class="font-medium">${line.title || line.description || ''}</div>
                    ${line.description && line.title ? `<div class="text-xs text-gray-500 mt-0.5">${line.description}</div>` : ''}
                </td>
                <td class="py-2 pr-4 text-sm text-right">${line.quantity}</td>
                <td class="py-2 pr-4 text-sm text-right">${formatCurrency(line.unitPrice)}</td>
                <td class="py-2 pr-4 text-sm text-right">${line.vatPercentage}%</td>
                <td class="py-2 pr-4 text-sm text-right font-semibold">${formatCurrency(line.amount || line.quantity * line.unitPrice)}</td>
            </tr>
        `).join('');

        const statusLabels = { paid: 'Betaald', partially_paid: 'Gedeeltelijk', unpaid: 'Openstaand', pending: 'Openstaand', overdue: 'Achterstallig' };
        const statusClasses = { paid: 'bg-green-100 text-green-800', partially_paid: 'bg-purple-100 text-purple-800', unpaid: 'bg-yellow-100 text-yellow-800', pending: 'bg-yellow-100 text-yellow-800', overdue: 'bg-red-100 text-red-800' };

        const invoicesHtml = linkedInvoices.length > 0
            ? linkedInvoices.map(inv => `
                <div class="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                    <div>
                        <span class="font-medium">${inv.invoiceNumber || 'N/A'}</span>
                        <span class="text-gray-500 ml-2">${formatDate(inv.invoiceDate)}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="font-semibold">${formatCurrency(inv.totalAmount)}</span>
                        <span class="px-2 py-0.5 text-xs font-semibold rounded ${statusClasses[inv.status] || statusClasses.pending}">${statusLabels[inv.status] || 'Openstaand'}</span>
                        <button onclick="downloadInvoicePdf('${inv.id}')" class="text-gray-500 hover:text-gray-800" title="Download factuur PDF">
                            <i class="fas fa-file-download"></i>
                        </button>
                    </div>
                </div>`).join('')
            : '<p class="text-sm text-gray-500">Geen gekoppelde facturen</p>';

        const content = `
            <div class="space-y-5">
                ${hasWarning ? `
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-exclamation-triangle text-yellow-400 text-xl"></i>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-yellow-800">⚠️ Kostenoverschrijding gedetecteerd</h3>
                            <div class="mt-2 text-sm text-yellow-700">
                                <p>De actuele inkoopkosten (${formatCurrency(totalCosts)}) zijn <strong>${formatCurrency(costOverrun)}</strong> hoger dan de geschatte kosten (${formatCurrency(estimatedCosts)}).</p>
                                <p class="mt-1">Geschatte marge: ${formatCurrency(estimatedMargin)} → Actuele marge: ${formatCurrency(totalMargin)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-gray-500 text-sm">Klant</p>
                        <p class="font-semibold">${customerName}</p>
                    </div>
                    <span class="px-3 py-1 text-sm font-semibold rounded ${status.class}">${status.label}</span>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                        <p class="text-gray-500 text-xs">Ordernummer</p>
                        <p class="font-medium">${order.orderNumber || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-gray-500 text-xs">Orderdatum</p>
                        <p class="font-medium">${formatDate(order.orderDate)}</p>
                    </div>
                    ${order.reference ? `<div>
                        <p class="text-gray-500 text-xs">Referentie</p>
                        <p class="font-medium">${order.reference}</p>
                    </div>` : ''}
                </div>

                <div class="border rounded overflow-hidden">
                    <table class="min-w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="py-2 text-left text-xs font-medium text-gray-500 uppercase px-4">Beschrijving</th>
                                <th class="py-2 text-right text-xs font-medium text-gray-500 uppercase pr-4">Aantal</th>
                                <th class="py-2 text-right text-xs font-medium text-gray-500 uppercase pr-4">Prijs</th>
                                <th class="py-2 text-right text-xs font-medium text-gray-500 uppercase pr-4">BTW</th>
                                <th class="py-2 text-right text-xs font-medium text-gray-500 uppercase pr-4">Bedrag</th>
                            </tr>
                        </thead>
                        <tbody>${linesHtml}</tbody>
                    </table>
                </div>

                <div class="bg-gray-50 rounded p-4 space-y-1 text-sm">
                    <div class="flex justify-between"><span>Subtotaal</span><span>${formatCurrency(order.subTotal)}</span></div>
                    <div class="flex justify-between"><span>BTW</span><span>${formatCurrency(order.vatAmount)}</span></div>
                    <div class="flex justify-between font-bold text-base border-t pt-2 mt-2">
                        <span>Totaal</span><span>${formatCurrency(order.totalAmount)}</span>
                    </div>
                </div>

                ${order.notes ? `<div class="bg-blue-50 rounded p-3 text-sm text-blue-800">${order.notes}</div>` : ''}

                <!-- Marge overzicht -->
                <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <i class="fas fa-chart-line text-green-600"></i>
                            Marge Berekening
                        </h3>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div class="text-xs text-gray-600 mb-1">Omzet (verkoop)</div>
                            <div class="text-lg font-bold text-green-700">${formatCurrency(totalRevenue)}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-600 mb-1">Kosten (inkoop)</div>
                            <div class="text-lg font-bold text-red-600">${formatCurrency(totalCosts)}</div>
                            ${estimatedCosts > 0 ? `<div class="text-xs text-gray-500 mt-1">Geschat: ${formatCurrency(estimatedCosts)}</div>` : ''}
                        </div>
                        <div class="col-span-2 border-t border-green-200 pt-3 mt-2">
                            <div class="flex justify-between items-center">
                                <div>
                                    <div class="text-xs text-gray-600 mb-1">Netto Marge (actueel)</div>
                                    <div class="text-2xl font-bold ${totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}">
                                        ${formatCurrency(totalMargin)}
                                    </div>
                                    ${estimatedMargin !== 0 ? `<div class="text-xs text-gray-500 mt-1">Geschat: ${formatCurrency(estimatedMargin)}</div>` : ''}
                                </div>
                                <div class="text-right">
                                    <div class="text-xs text-gray-600 mb-1">Marge %</div>
                                    <div class="text-xl font-bold ${marginPercentage >= 0 ? 'text-green-600' : 'text-red-600'}">
                                        ${marginPercentage.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Verkoopfacturen -->
                <div>
                    <p class="text-sm font-semibold mb-2 flex items-center gap-2">
                        <i class="fas fa-file-invoice text-purple-600"></i> Verkoopfacturen
                    </p>
                    ${invoicesHtml}
                </div>

                <!-- Inkoopfacturen -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-sm font-semibold flex items-center gap-2">
                            <i class="fas fa-file-invoice-dollar text-red-600"></i> Inkoopfacturen
                        </p>
                        <button onclick="closeModal(); showCreatePurchaseInvoiceFromOrder('${id}')" 
                                class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium">
                            <i class="fas fa-plus mr-1"></i>Nieuwe Inkoopfactuur
                        </button>
                    </div>
                    ${linkedPurchaseInvoices.length > 0 ? `
                        <div class="space-y-2">
                            ${linkedPurchaseInvoices.map(inv => {
                                const paidAmount = (inv.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                                const isPaid = paidAmount >= inv.totalAmount;
                                const statusClass = isPaid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
                                const statusLabel = isPaid ? 'Betaald' : 'Openstaand';
                                return `
                                <div class="flex items-center justify-between py-2 border-b last:border-0 text-sm bg-red-50 px-3 rounded">
                                    <div>
                                        <span class="font-medium cursor-pointer text-blue-600 hover:underline" onclick="closeModal(); showPurchaseInvoiceDetails('${inv.id}')">${inv.invoiceNumber || 'N/A'}</span>
                                        <span class="text-gray-500 ml-2">${formatDate(inv.invoiceDate)}</span>
                                        ${inv.supplierInvoiceNumber ? `<span class="text-xs text-gray-500 ml-2">(${inv.supplierInvoiceNumber})</span>` : ''}
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="font-semibold text-red-600">-${formatCurrency(inv.totalAmount)}</span>
                                        <span class="px-2 py-0.5 text-xs font-semibold rounded ${statusClass}">${statusLabel}</span>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    ` : `<p class="text-sm text-gray-500 bg-gray-50 p-3 rounded">Geen inkoopfacturen gekoppeld</p>`}
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';
        modal.style.backdropFilter = 'blur(4px)';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
                <button onclick="this.closest('.fixed').remove()"
                        class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900"
                        title="Sluiten">
                    <i class="fas fa-times text-xl"></i>
                </button>
                <h2 class="text-2xl font-bold mb-4 pr-8">Order ${order.orderNumber || ''}</h2>
                <div>${content}</div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        showToast('Fout bij laden van order: ' + error.message, 'error');
    }
}

async function approveOrder(id) {
    if (!confirm('Weet je zeker dat je deze order wilt goedkeuren?')) return;
    try {
        await apiRequest(`/orders/${id}/approve`, { method: 'PATCH' });
        showToast('Order goedgekeurd', 'success');
        loadOrders();
    } catch (error) {
        showToast('Fout bij goedkeuren: ' + error.message, 'error');
    }
}

async function showGenerateInvoiceFromOrder(orderId) {
    const order = await getById('orders', orderId);
    const defaultDueDate = order?.orderDate
        ? getDatePlusDays(30, order.orderDate)
        : getDatePlusDays(30);

    // Check if there are lines with suppliers
    const linesWithSuppliers = (order.lines || []).filter(line => line.assignedSupplierId);
    const uniqueSuppliers = [...new Set(linesWithSuppliers.map(line => line.assignedSupplierId))];

    // Get supplier names if available
    let supplierNames = {};
    if (uniqueSuppliers.length > 0) {
        try {
            const suppliers = await getAll('suppliers');
            suppliers.forEach(s => {
                supplierNames[s.id] = s.name || s.supplierNumber;
            });
        } catch (e) {
            console.error('Could not load suppliers', e);
        }
    }

    const formHtml = `
        <div class="space-y-4">
            <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p class="text-sm text-purple-800">
                    <i class="fas fa-info-circle mr-2"></i>
                    De orderregels worden als snapshot gekopieerd naar de factuur. 
                    De orderstatus wordt automatisch op <strong>Gefactureerd</strong> gezet.
                </p>
            </div>

            ${uniqueSuppliers.length > 0 ? `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 class="text-sm font-semibold text-blue-800 mb-2">
                    <i class="fas fa-truck mr-2"></i>Leveranciers gedetecteerd
                </h4>
                <p class="text-sm text-blue-700 mb-3">
                    Dit order heeft regels gekoppeld aan <strong>${uniqueSuppliers.length}</strong> leverancier(s). 
                    Wil je automatisch inkoopfacturen aanmaken?
                </p>
                <div class="space-y-2">
                    ${uniqueSuppliers.map(supplierId => {
                        const supplierLines = linesWithSuppliers.filter(l => l.assignedSupplierId === supplierId);
                        const totalCost = supplierLines.reduce((sum, l) => sum + (l.quantity * (l.estimatedCost || 0)), 0);
                        return `
                        <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-blue-100 p-2 rounded">
                            <input type="checkbox" class="supplier-checkbox w-4 h-4" 
                                   value="${supplierId}" 
                                   data-cost="${totalCost}"
                                   checked>
                            <span class="flex-1">
                                <strong>${supplierNames[supplierId] || supplierId}</strong> 
                                - ${supplierLines.length} regel(s) - ${formatCurrency(totalCost)}
                            </span>
                        </label>
                        `;
                    }).join('')}
                </div>
            </div>
            ` : ''}

            <div>
                <label class="block text-sm font-medium mb-2">Vervaldatum verkoopfactuur</label>
                <input type="date" id="genDueDate" value="${defaultDueDate}"
                       class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500">
                <p class="text-xs text-gray-500 mt-1">Standaard: 30 dagen na orderdatum</p>
            </div>

            ${uniqueSuppliers.length > 0 ? `
            <div>
                <label class="block text-sm font-medium mb-2">Vervaldatum inkoopfacturen</label>
                <input type="date" id="genPurchaseDueDate" value="${defaultDueDate}"
                       class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                <p class="text-xs text-gray-500 mt-1">Voor alle geselecteerde leveranciers</p>
            </div>
            ` : ''}

            <div>
                <label class="block text-sm font-medium mb-2">Opmerkingen (optioneel)</label>
                <textarea id="genNotes" rows="2"
                          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                          placeholder="Extra toelichting op de factuur..."></textarea>
            </div>
        </div>
    `;

    createModal('Factuur Genereren vanuit Order', formHtml, async () => {
        const dueDate = document.getElementById('genDueDate').value;
        const notes = document.getElementById('genNotes').value.trim();

        const body = {};
        if (dueDate) body.dueDate = dueDate;
        if (notes) body.notes = notes;

        // Generate sales invoice
        const invoice = await apiRequest(`/orders/${orderId}/invoice`, {
            method: 'POST',
            body: JSON.stringify(body)
        });

        showToast(`Verkoopfactuur ${invoice?.invoiceNumber || ''} aangemaakt`, 'success');

        // Check if we need to create purchase invoices
        const selectedSuppliers = Array.from(document.querySelectorAll('.supplier-checkbox:checked'))
            .map(cb => ({
                supplierId: cb.value,
                cost: parseFloat(cb.dataset.cost)
            }));

        if (selectedSuppliers.length > 0) {
            const purchaseDueDate = document.getElementById('genPurchaseDueDate').value;
            await createPurchaseInvoicesFromOrder(orderId, order, selectedSuppliers, purchaseDueDate, supplierNames);
        }

        loadOrders();
    }, 'Facturen Genereren', 'md');
}

async function createPurchaseInvoicesFromOrder(orderId, order, selectedSuppliers, dueDate, supplierNames) {
    try {
        const today = new Date().toISOString().split('T')[0];
        let successCount = 0;
        let errorCount = 0;

        // Get all purchase invoices to generate numbers
        const allPurchaseInvoices = await getAll('purchaseinvoices');

        for (const { supplierId, cost } of selectedSuppliers) {
            try {
                // Find all lines for this supplier
                const supplierLines = (order.lines || [])
                    .filter(line => line.assignedSupplierId === supplierId)
                    .map(line => {
                        const unitCost = line.estimatedCost || 0;
                        const lineCost = line.quantity * unitCost;
                        return {
                            description: line.title || line.description || 'Order regel',
                            quantity: line.quantity,
                            unitPrice: unitCost,
                            vatPercentage: line.vatPercentage || 21,
                            amount: lineCost * (1 + (line.vatPercentage || 21) / 100)
                        };
                    });

                const subTotal = supplierLines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
                const vatAmount = supplierLines.reduce((sum, l) => sum + (l.quantity * l.unitPrice * l.vatPercentage / 100), 0);
                const totalAmount = subTotal + vatAmount;

                // Generate unique invoice number
                const invoiceNumber = generatePurchaseInvoiceNumber(allPurchaseInvoices);
                allPurchaseInvoices.push({ invoiceNumber }); // Add to array to avoid duplicates

                const purchaseInvoice = {
                    invoiceNumber: invoiceNumber,
                    invoiceDate: today,
                    dueDate: dueDate || today,
                    supplierId: supplierId,
                    supplierName: supplierNames[supplierId] || supplierId,
                    supplierInvoiceNumber: '',
                    relatedOrderId: orderId,
                    reference: order.reference || '',
                    notes: `Automatisch aangemaakt vanuit order ${order.orderNumber}`,
                    lines: supplierLines,
                    subTotal: subTotal,
                    vatAmount: vatAmount,
                    totalAmount: totalAmount,
                    status: 'pending',
                    payments: []
                };

                await create('purchaseinvoices', purchaseInvoice);
                successCount++;
            } catch (error) {
                console.error(`Error creating purchase invoice for supplier ${supplierId}:`, error);
                errorCount++;
            }
        }

        if (successCount > 0) {
            showToast(`${successCount} inkoopfactuur${successCount > 1 ? 'en' : ''} aangemaakt`, 'success');
        }
        if (errorCount > 0) {
            showToast(`${errorCount} inkoopfactuur${errorCount > 1 ? 'en' : ''} mislukt`, 'error');
        }
    } catch (error) {
        showToast('Fout bij aanmaken inkoopfacturen: ' + error.message, 'error');
    }
}

function generatePurchaseInvoiceNumber(existingInvoices) {
    if (!existingInvoices || existingInvoices.length === 0) return 'PURCH-0001';
    const numbers = existingInvoices.map(inv => {
        const match = (inv.invoiceNumber || '').match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    });
    return `PURCH-${String(Math.max(...numbers, 0) + 1).padStart(4, '0')}`;
}

function pickStandardOrderLine() {
    showStandardLinePicker((selected) => {
        const container = document.getElementById('orderLines');
        if (!container) return;

        // Remove empty/incomplete manual lines before adding standard lines
        const existingLines = container.querySelectorAll('.order-line');
        const linesToRemove = [];

        existingLines.forEach((lineEl, index) => {
            const title = lineEl.querySelector('.line-title')?.value?.trim() || '';
            const quantity = parseFloat(lineEl.querySelector('.line-quantity')?.value || 0);
            const unitPrice = parseFloat(lineEl.querySelector('.line-price')?.value || 0);

            // Consider a line empty if title is empty AND (quantity is 0 or unitPrice is 0)
            const isEmpty = !title && (quantity === 0 || unitPrice === 0);

            if (isEmpty) {
                linesToRemove.push(lineEl);
            }
        });

        // Remove empty lines
        linesToRemove.forEach(lineEl => lineEl.remove());

        // Get suppliers from data attribute or global cache
        let suppliers = [];
        if (container && container.dataset.suppliers) {
            try {
                suppliers = JSON.parse(container.dataset.suppliers);
            } catch (e) {
                console.error('Failed to parse suppliers from data attribute', e);
            }
        }

        // Fallback to global cache
        if (!suppliers || suppliers.length === 0) {
            suppliers = window._orderFormSuppliers || [];
        }

        // Add selected standard lines
        selected.forEach(line => {
            const newIndex = container.querySelectorAll('.order-line').length;
            container.insertAdjacentHTML('beforeend', getOrderLineRow(newIndex, line, false, suppliers));
        });

        // Reindex all remaining lines to ensure proper numbering
        container.querySelectorAll('.order-line').forEach((line, i) => {
            line.dataset.index = i;
            const btn = line.querySelector('button[onclick^="removeOrderLine"]');
            if (btn) btn.setAttribute('onclick', `removeOrderLine(${i})`);
        });

        calculateOrderTotals();

        if (linesToRemove.length > 0) {
            showToast(`${linesToRemove.length} lege regel${linesToRemove.length > 1 ? 's' : ''} weggehaald`, 'info');
        }
    });
}

async function showDownloadQuoteFromOrder(orderId) {
    const order = await getById('orders', orderId);
    const defaultValidUntil = order?.orderDate
        ? getDatePlusDays(30, order.orderDate)
        : getDatePlusDays(30);

    const formHtml = `
        <div class="space-y-4">
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p class="text-sm text-amber-800">
                    <i class="fas fa-info-circle mr-2"></i>
                    Er wordt een PDF-offerte gegenereerd op basis van de orderregels.
                    De order zelf wordt <strong>niet</strong> aangepast.
                </p>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Geldig tot</label>
                <input type="date" id="quoteValidUntil" value="${defaultValidUntil}"
                       class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                <p class="text-xs text-gray-500 mt-1">Standaard: 30 dagen na orderdatum</p>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Opmerkingen (optioneel)</label>
                <textarea id="quoteNotes" rows="2"
                          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Extra toelichting op de offerte...">${order?.notes || ''}</textarea>
            </div>
        </div>
    `;

    createModal('Offerte als PDF downloaden', formHtml, async () => {
        const validUntil = document.getElementById('quoteValidUntil').value;
        const notes = document.getElementById('quoteNotes').value.trim();
        await downloadOrderQuotePdf(orderId, validUntil, notes);
    }, 'Offerte downloaden', 'sm');
}

async function downloadOrderQuotePdf(orderId, validUntil, extraNotes) {
    try {
        showToast('Offerte wordt gegenereerd...', 'info');

        const [order, customers] = await Promise.all([
            getById('orders', orderId),
            getAll('customers')
        ]);

        if (!order) {
            showToast('Order niet gevonden', 'error');
            return;
        }

        const session = getSession();
        const companyName = session?.companyName || 'Rice Studio';
        const companyAddress = session?.address;
        const companyKvk = session?.kvkNumber;
        const companyVat = session?.vatNumber;

        const customer = customers?.find(c => c.customerId === order.customerId);
        const customerName = customer?.business?.displayName || customer?.business?.name || order.customerId || '';
        const customerAddress = customer?.business?.address;
        const customerEmail = customer?.business?.emailAddress || customer?.contact?.emailAddress || '';

        const quoteNumber = `OFF-${order.orderNumber || orderId}`;
        const notes = extraNotes || '';

        const companyAddressLines = [];
        if (companyAddress?.street) companyAddressLines.push(`${companyAddress.street} ${companyAddress.houseNumber || ''}`.trim());
        if (companyAddress?.postalCode || companyAddress?.city) companyAddressLines.push(`${companyAddress.postalCode || ''} ${companyAddress.city || ''}`.trim());
        if (companyKvk) companyAddressLines.push(`KVK: ${companyKvk}`);
        if (companyVat) companyAddressLines.push(`BTW: ${companyVat}`);

        const customerAddressLines = [customerName];
        if (customerAddress?.street) customerAddressLines.push(`${customerAddress.street} ${customerAddress.houseNumber || ''}`.trim());
        if (customerAddress?.postalCode || customerAddress?.city) customerAddressLines.push(`${customerAddress.postalCode || ''} ${customerAddress.city || ''}`.trim());
        if (customerEmail) customerAddressLines.push(customerEmail);

        const itemTableBody = [
            [
                { text: 'Beschrijving', style: 'tableHeader' },
                { text: 'Aantal', style: 'tableHeader', alignment: 'right' },
                { text: 'Stukprijs', style: 'tableHeader', alignment: 'right' },
                { text: 'BTW', style: 'tableHeader', alignment: 'right' },
                { text: 'Bedrag', style: 'tableHeader', alignment: 'right' }
            ],
            ...(order.lines || []).map(line => {
                const titleText = line.title || line.description || '';
                const descriptionText = line.description && line.title ? line.description : '';

                const descriptionCell = descriptionText
                    ? [
                        { text: titleText, fontSize: 10, bold: false },
                        { text: descriptionText, fontSize: 8, color: '#6b7280', margin: [0, 2, 0, 0] }
                    ]
                    : { text: titleText, fontSize: 10 };

                return [
                    descriptionCell,
                    { text: String(line.quantity), fontSize: 10, alignment: 'right' },
                    { text: formatCurrency(line.unitPrice), fontSize: 10, alignment: 'right' },
                    { text: `${line.vatPercentage}%`, fontSize: 10, alignment: 'right' },
                    { text: formatCurrency(line.amount || line.quantity * line.unitPrice), fontSize: 10, alignment: 'right', bold: true }
                ];
            })
        ];

        const totalsTableBody = [
            [{ text: 'Subtotaal', fontSize: 10 }, { text: formatCurrency(order.subTotal), fontSize: 10, alignment: 'right', bold: true }],
            [{ text: 'BTW', fontSize: 10 }, { text: formatCurrency(order.vatAmount), fontSize: 10, alignment: 'right', bold: true }],
            [{ text: 'Totaal', fontSize: 13, bold: true }, { text: formatCurrency(order.totalAmount), fontSize: 13, alignment: 'right', bold: true }]
        ];

        const metaRows = [
            [
                { text: 'Offertenummer', fontSize: 9, color: '#6b7280', border: [false, false, false, false] },
                { text: quoteNumber, fontSize: 10, alignment: 'right', border: [false, false, false, false] }
            ],
            [
                { text: 'Datum', fontSize: 9, color: '#6b7280', border: [false, false, false, false] },
                { text: new Date().toLocaleDateString('nl-NL'), fontSize: 10, alignment: 'right', border: [false, false, false, false] }
            ]
        ];
        if (validUntil) {
            metaRows.push([
                { text: 'Geldig tot', fontSize: 9, color: '#6b7280', border: [false, false, false, false] },
                { text: formatDate(validUntil), fontSize: 10, alignment: 'right', border: [false, false, false, false] }
            ]);
        }
        if (order.reference) {
            metaRows.push([
                { text: 'Referentie', fontSize: 9, color: '#6b7280', border: [false, false, false, false] },
                { text: order.reference, fontSize: 10, alignment: 'right', border: [false, false, false, false] }
            ]);
        }

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 60],
            footer: function () {
                const parts = [companyName];
                if (companyAddress?.street) parts.push(`${companyAddress.street} ${companyAddress.houseNumber || ''}`.trim());
                if (companyAddress?.postalCode || companyAddress?.city) parts.push(`${companyAddress.postalCode || ''} ${companyAddress.city || ''}`.trim());
                if (companyKvk) parts.push(`KVK: ${companyKvk}`);
                if (companyVat) parts.push(`BTW: ${companyVat}`);
                return [
                    { text: 'Wij bouwen onze offertes volledig transparant op, je ziet exact waar je voor betaalt. Geen verborgen kosten of verrassingen achteraf.', alignment: 'center', fontSize: 8, italics: true, color: '#9ca3af', margin: [40, 8, 40, 2] },
                    { text: parts.join('  ·  '), alignment: 'center', fontSize: 8, color: '#9ca3af', margin: [40, 0, 40, 0] }
                ];
            },
            content: [
                {
                    columns: [
                        {
                            stack: [
                                { text: companyName, style: 'companyName' },
                                ...companyAddressLines.map(line => ({ text: line, style: 'companyDetail' }))
                            ]
                        },
                        {
                            stack: [
                                { text: 'OFFERTE', style: 'invoiceTitle', alignment: 'right' },
                                { text: quoteNumber, fontSize: 12, color: '#6b7280', alignment: 'right' }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 24]
                },
                {
                    columns: [
                        {
                            stack: [
                                { text: 'Offerte voor', style: 'sectionHeader', margin: [0, 0, 0, 4] },
                                ...customerAddressLines.map((line, i) => ({
                                    text: line,
                                    fontSize: 10,
                                    bold: i === 0,
                                    color: i === 0 ? '#111827' : '#374151'
                                }))
                            ]
                        },
                        {
                            table: {
                                widths: ['auto', 'auto'],
                                body: metaRows
                            },
                            layout: 'noBorders',
                            alignment: 'right'
                        }
                    ],
                    margin: [0, 0, 0, 24]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 45, 65, 35, 65],
                        body: itemTableBody
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 16]
                },
                {
                    columns: [
                        { text: '', width: '*' },
                        {
                            width: 220,
                            table: {
                                widths: ['*', 'auto'],
                                body: totalsTableBody
                            },
                            layout: 'lightHorizontalLines'
                        }
                    ],
                    margin: [0, 0, 0, 16]
                },
                ...(notes ? [
                    { text: 'Opmerkingen', style: 'sectionHeader', margin: [0, 16, 0, 4] },
                    { text: notes, fontSize: 10, color: '#374151', background: '#f9fafb', margin: [8, 4, 8, 4] }
                ] : []),
            ],
            styles: {
                companyName: { fontSize: 22, bold: true, color: '#111827' },
                companyDetail: { fontSize: 10, color: '#6b7280', lineHeight: 1.3 },
                invoiceTitle: { fontSize: 20, bold: true, color: '#111827' },
                sectionHeader: { fontSize: 9, bold: true, color: '#6b7280', characterSpacing: 1 },
                tableHeader: { fontSize: 9, bold: true, color: '#6b7280', fillColor: '#f3f4f6' }
            }
        };

        pdfMake.createPdf(docDefinition).download(`Offerte_${quoteNumber}.pdf`);
        showToast('Offerte gedownload', 'success');
    } catch (error) {
        showToast('Fout bij genereren offerte: ' + error.message, 'error');
    }
}
