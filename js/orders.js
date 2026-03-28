// Orders management

function generateOrderNumber(orders) {
    if (!orders || orders.length === 0) return 'ORD-0001';
    const numbers = (orders || []).map(o => {
        const match = (o.orderNumber || '').match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    });
    return `ORD-${String(Math.max(...numbers, 0) + 1).padStart(4, '0')}`;
}

async function loadOrders() {
    try {
        const [orders, customers] = await Promise.all([
            getAll('orders'),
            getAll('customers')
        ]);

        const customerMap = {};
        if (customers) {
            customers.forEach(c => {
                customerMap[c.customerId] = c.business?.displayName || c.business?.name || c.customerId;
            });
        }

        let html = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Orders</h2>
                <button onclick="showCreateOrder()"
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                    <i class="fas fa-plus"></i> Nieuwe Order
                </button>
            </div>
        `;

        if (!orders || orders.length === 0) {
            html += '<p class="text-gray-500 text-center py-8">Geen orders gevonden</p>';
        } else {
            html += '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
            html += `
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordernr.</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klant</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Regels</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Totaal</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
            `;

            const statusConfig = {
                draft:     { class: 'bg-gray-100 text-gray-800',   label: 'Concept',        icon: 'pencil' },
                confirmed: { class: 'bg-blue-100 text-blue-800',   label: 'Bevestigd',      icon: 'check' },
                invoiced:  { class: 'bg-green-100 text-green-800', label: 'Gefactureerd',   icon: 'file-invoice' },
                cancelled: { class: 'bg-red-100 text-red-800',     label: 'Geannuleerd',    icon: 'times' }
            };

            orders.forEach(order => {
                const customerName = customerMap[order.customerId] || order.customerId || 'N/A';
                const linesCount = order.lines?.length || 0;
                const status = statusConfig[order.status] || statusConfig.draft;
                const canGenerateInvoice = order.status !== 'invoiced' && order.status !== 'cancelled';
                const canGenerateQuote = order.status !== 'invoiced' && order.status !== 'cancelled';

                const quoteButton = canGenerateQuote ? `
                    <button onclick="showDownloadQuoteFromOrder('${order.id}')"
                            class="text-amber-600 hover:text-amber-900 mr-3"
                            title="Offerte als PDF downloaden">
                        <i class="fas fa-download"></i>
                    </button>
                ` : '';

                const generateButton = canGenerateInvoice ? `
                    <button onclick="showGenerateInvoiceFromOrder('${order.id}')"
                            class="text-green-600 hover:text-green-900 mr-3"
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
                            ${quoteButton}
                            ${generateButton}
                            <button onclick="showEditOrder('${order.id}')"
                                    class="text-blue-600 hover:text-blue-900 mr-3" title="Bewerken">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteOrder('${order.id}')"
                                    class="text-red-600 hover:text-red-900" title="Verwijderen">
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

function getOrderForm(order = null, customers = [], linkedInvoices = []) {
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

    let linesHtml = lines.map((line, i) => getOrderLineRow(i, line, isInvoiced)).join('');

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
                            <option value="draft"     ${(!ord.status || ord.status === 'draft')      ? 'selected' : ''}>Concept</option>
                            <option value="confirmed" ${ord.status === 'confirmed'                   ? 'selected' : ''}>Bevestigd</option>
                            <option value="invoiced"  ${ord.status === 'invoiced'                    ? 'selected' : ''} disabled>Gefactureerd (automatisch)</option>
                            <option value="cancelled" ${ord.status === 'cancelled'                   ? 'selected' : ''}>Geannuleerd</option>
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
                <h3 class="font-bold text-lg mb-3">Totalen</h3>
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
            <div class="border border-blue-200 rounded-lg overflow-hidden">
                <div class="px-4 py-2 bg-blue-50 border-b border-blue-200">
                    <h4 class="font-semibold text-sm text-blue-700 flex items-center gap-2">
                        <i class="fas fa-file-invoice text-blue-600"></i>
                        Gekoppelde facturen
                    </h4>
                </div>
                ${linkedInvoices.length > 0 ? `
                <div class="divide-y divide-gray-100">
                    ${linkedInvoices.map(inv => {
                        const statusLabels = { paid: 'Betaald', partially_paid: 'Gedeeltelijk', unpaid: 'Openstaand', pending: 'Openstaand', overdue: 'Achterstallig' };
                        const statusClasses = { paid: 'bg-green-100 text-green-800', partially_paid: 'bg-blue-100 text-blue-800', unpaid: 'bg-yellow-100 text-yellow-800', pending: 'bg-yellow-100 text-yellow-800', overdue: 'bg-red-100 text-red-800' };
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

function getOrderLineRow(index, line = {}, readonly = false) {
    const disabledAttr = readonly ? 'disabled' : '';
    const readonlyAttr = readonly ? 'readonly' : '';
    const readonlyClass = readonly ? 'bg-gray-100 cursor-not-allowed' : '';
    const vatPct = line.vatPercentage !== undefined ? line.vatPercentage : 21;

    return `
        <div class="order-line bg-white p-3 rounded border" data-index="${index}">
            <div class="flex flex-wrap gap-2 items-end">
                <div class="flex-1 min-w-0">
                    <label class="block text-xs font-medium mb-1">Beschrijving<span class="text-red-600 ml-1">*</span></label>
                    <input type="text" class="line-description w-full px-2 py-1 border rounded text-sm ${readonlyClass}"
                           value="${line.description || ''}" placeholder="Product of dienst..."
                           onchange="calculateOrderTotals()" ${readonlyAttr} required>
                </div>
                <div class="w-24 shrink-0">
                    <label class="block text-xs font-medium mb-1">Aantal<span class="text-red-600 ml-1">*</span></label>
                    <input type="number" class="line-quantity w-full px-2 py-1 border rounded text-sm ${readonlyClass}"
                           value="${line.quantity || 1}" min="1" step="0.01"
                           onchange="calculateOrderTotals()" ${readonlyAttr} required>
                </div>
                <div class="w-28 shrink-0">
                    <label class="block text-xs font-medium mb-1">Prijs<span class="text-red-600 ml-1">*</span></label>
                    <input type="number" class="line-price w-full px-2 py-1 border rounded text-sm ${readonlyClass}"
                           value="${line.unitPrice || 0}" min="0" step="0.01"
                           onchange="calculateOrderTotals()" ${readonlyAttr} required>
                </div>
                <div class="w-20 shrink-0">
                    <label class="block text-xs font-medium mb-1">BTW %</label>
                    <select class="line-vat w-full px-2 py-1 border rounded text-sm ${readonlyClass}"
                            onchange="calculateOrderTotals()" ${disabledAttr}>
                        <option value="0"  ${vatPct === 0  ? 'selected' : ''}>0%</option>
                        <option value="9"  ${vatPct === 9  ? 'selected' : ''}>9%</option>
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
            <div class="text-xs text-gray-600 mt-1">
                Subtotaal: <span class="line-subtotal font-semibold">€ 0,00</span>
            </div>
        </div>
    `;
}

function addOrderLine() {
    const container = document.getElementById('orderLines');
    const newIndex = container.querySelectorAll('.order-line').length;
    container.insertAdjacentHTML('beforeend', getOrderLineRow(newIndex, { quantity: 1, unitPrice: 0, vatPercentage: 21 }));
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

    document.querySelectorAll('.order-line').forEach(line => {
        const quantity   = parseFloat(line.querySelector('.line-quantity')?.value) || 0;
        const unitPrice  = parseFloat(line.querySelector('.line-price')?.value)    || 0;
        const vatPct     = parseFloat(line.querySelector('.line-vat')?.value)      || 0;
        const lineAmount = quantity * unitPrice;
        subtotal += lineAmount;
        vatTotal += lineAmount * (vatPct / 100);
        const span = line.querySelector('.line-subtotal');
        if (span) span.textContent = formatCurrency(lineAmount);
    });

    const total = subtotal + vatTotal;
    const sub = document.getElementById('orderSubtotalDisplay');
    const vat = document.getElementById('orderVatDisplay');
    const tot = document.getElementById('orderTotalDisplay');
    if (sub) sub.textContent = formatCurrency(subtotal);
    if (vat) vat.textContent = formatCurrency(vatTotal);
    if (tot) tot.textContent = formatCurrency(total);
}

function getOrderData() {
    const lines = [];
    let subtotal = 0;
    let vatTotal = 0;

    document.querySelectorAll('.order-line').forEach(lineEl => {
        const description  = lineEl.querySelector('.line-description').value.trim();
        const quantity     = parseFloat(lineEl.querySelector('.line-quantity').value) || 0;
        const unitPrice    = parseFloat(lineEl.querySelector('.line-price').value)    || 0;
        const vatPercentage = parseFloat(lineEl.querySelector('.line-vat').value)    || 0;
        const amount       = quantity * unitPrice;
        subtotal += amount;
        vatTotal += amount * (vatPercentage / 100);
        lines.push({ description, quantity, unitPrice, vatPercentage, amount });
    });

    return {
        customerId: document.getElementById('customerId').value.trim(),
        orderDate:  document.getElementById('orderDate').value,
        reference:  document.getElementById('reference').value.trim(),
        status:     document.getElementById('status').value,
        notes:      document.getElementById('notes').value.trim(),
        lines,
        subTotal:     subtotal,
        vatAmount:    Math.round(vatTotal * 100) / 100,
        totalAmount:  subtotal + Math.round(vatTotal * 100) / 100
    };
}

function validateOrderData(data) {
    const errors = [];
    if (!data.customerId)    errors.push('Selecteer een klant');
    if (!data.orderDate)     errors.push('Orderdatum is verplicht');
    if (!data.lines?.length) errors.push('Voeg minimaal 1 orderregel toe');
    return errors;
}

function getIncompleteOrderLines(lines) {
    return (lines || []).filter(line => !line.description || line.quantity <= 0);
}

async function showCreateOrder() {
    try {
        const customers = await getAll('customers');
        if (!customers || customers.length === 0) {
            showToast('Geen klanten beschikbaar. Maak eerst een klant aan.', 'error');
            return;
        }

        createModal('Nieuwe Order', getOrderForm(null, customers), async () => {
            const data = getOrderData();
            const errors = validateOrderData(data);
            if (errors.length > 0) throw new Error(errors.join('\n'));

            const validLines = data.lines.filter(l => l.description && l.quantity > 0);
            const incompleteLines = getIncompleteOrderLines(data.lines);

            if (validLines.length === 0) {
                throw new Error('Vul minimaal 1 orderregel volledig in (beschrijving en aantal zijn verplicht)');
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
        });

        setTimeout(() => calculateOrderTotals(), 100);
    } catch (error) {
        showToast('Fout bij laden: ' + error.message, 'error');
    }
}

async function showEditOrder(id) {
    try {
        const [order, customers, allInvoices] = await Promise.all([
            getById('orders', id),
            getAll('customers'),
            getAll('invoices')
        ]);

        const linkedInvoices = (allInvoices || [])
            .filter(inv => inv.orderId === id)
            .sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || ''));

        createModal('Order Bewerken', getOrderForm(order, customers || [], linkedInvoices), async () => {
            const data = getOrderData();
            const errors = validateOrderData(data);
            if (errors.length > 0) throw new Error(errors.join('\n'));

            const validLines = data.lines.filter(l => l.description && l.quantity > 0);
            const incompleteLines = getIncompleteOrderLines(data.lines);

            if (validLines.length === 0) {
                throw new Error('Vul minimaal 1 orderregel volledig in (beschrijving en aantal zijn verplicht)');
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
        });

        setTimeout(() => calculateOrderTotals(), 100);
    } catch (error) {
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
        const [order, customers, allInvoices] = await Promise.all([
            getById('orders', id),
            getAll('customers'),
            getAll('invoices')
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

        const statusConfig = {
            draft:     { class: 'bg-gray-100 text-gray-800',   label: 'Concept' },
            confirmed: { class: 'bg-blue-100 text-blue-800',   label: 'Bevestigd' },
            invoiced:  { class: 'bg-green-100 text-green-800', label: 'Gefactureerd' },
            cancelled: { class: 'bg-red-100 text-red-800',     label: 'Geannuleerd' }
        };
        const status = statusConfig[order.status] || statusConfig.draft;

        const linesHtml = (order.lines || []).map(line => `
            <tr>
                <td class="py-2 px-4 text-sm">${line.description || ''}</td>
                <td class="py-2 pr-4 text-sm text-right">${line.quantity}</td>
                <td class="py-2 pr-4 text-sm text-right">${formatCurrency(line.unitPrice)}</td>
                <td class="py-2 pr-4 text-sm text-right">${line.vatPercentage}%</td>
                <td class="py-2 pr-4 text-sm text-right font-semibold">${formatCurrency(line.amount || line.quantity * line.unitPrice)}</td>
            </tr>
        `).join('');

        const statusLabels = { paid: 'Betaald', partially_paid: 'Gedeeltelijk', unpaid: 'Openstaand', pending: 'Openstaand', overdue: 'Achterstallig' };
        const statusClasses = { paid: 'bg-green-100 text-green-800', partially_paid: 'bg-blue-100 text-blue-800', unpaid: 'bg-yellow-100 text-yellow-800', pending: 'bg-yellow-100 text-yellow-800', overdue: 'bg-red-100 text-red-800' };

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

                <div>
                    <p class="text-sm font-semibold mb-2 flex items-center gap-2">
                        <i class="fas fa-file-invoice text-blue-600"></i> Gekoppelde facturen
                    </p>
                    ${invoicesHtml}
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

async function showGenerateInvoiceFromOrder(orderId) {
    const order = await getById('orders', orderId);
    const defaultDueDate = order?.orderDate
        ? getDatePlusDays(30, order.orderDate)
        : getDatePlusDays(30);

    const formHtml = `
        <div class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p class="text-sm text-blue-800">
                    <i class="fas fa-info-circle mr-2"></i>
                    De orderregels worden als snapshot gekopieerd naar de factuur. 
                    De orderstatus wordt automatisch op <strong>Gefactureerd</strong> gezet.
                </p>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Vervaldatum</label>
                <input type="date" id="genDueDate" value="${defaultDueDate}"
                       class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                <p class="text-xs text-gray-500 mt-1">Standaard: 30 dagen na orderdatum</p>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Opmerkingen (optioneel)</label>
                <textarea id="genNotes" rows="2"
                          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Extra toelichting op de factuur..."></textarea>
            </div>
        </div>
    `;

    createModal('Factuur Genereren vanuit Order', formHtml, async () => {
        const dueDate = document.getElementById('genDueDate').value;
        const notes   = document.getElementById('genNotes').value.trim();

        const body = {};
        if (dueDate) body.dueDate = dueDate;
        if (notes)   body.notes   = notes;

        const invoice = await apiRequest(`/orders/${orderId}/invoice`, {
            method: 'POST',
            body: JSON.stringify(body)
        });

        showToast(`Factuur ${invoice?.invoiceNumber || ''} aangemaakt`, 'success');
        loadOrders();
    }, 'Factuur Genereren', 'sm');
}

function pickStandardOrderLine() {
    showStandardLinePicker((selected) => {
        const container = document.getElementById('orderLines');
        if (!container) return;
        selected.forEach(line => {
            const newIndex = container.querySelectorAll('.order-line').length;
            container.insertAdjacentHTML('beforeend', getOrderLineRow(newIndex, line));
        });
        calculateOrderTotals();
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
            ...(order.lines || []).map(line => [
                { text: line.description || '', fontSize: 10 },
                { text: String(line.quantity), fontSize: 10, alignment: 'right' },
                { text: formatCurrency(line.unitPrice), fontSize: 10, alignment: 'right' },
                { text: `${line.vatPercentage}%`, fontSize: 10, alignment: 'right' },
                { text: formatCurrency(line.amount || line.quantity * line.unitPrice), fontSize: 10, alignment: 'right', bold: true }
            ])
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
            footer: function() {
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
