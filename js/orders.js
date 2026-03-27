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

                const generateButton = canGenerateInvoice ? `
                    <button onclick="showGenerateInvoiceFromOrder('${order.id}')"
                            class="text-green-600 hover:text-green-900 mr-3"
                            title="Genereer factuur">
                        <i class="fas fa-file-invoice"></i>
                    </button>
                ` : '';

                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${order.orderNumber || 'N/A'}</td>
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

function getOrderForm(order = null, customers = []) {
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
        <div class="space-y-6 max-h-[70vh] overflow-y-auto">
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
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-bold text-lg">Orderregels</h3>
                    ${!isInvoiced ? `
                    <button type="button" onclick="addOrderLine()"
                            class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">
                        <i class="fas fa-plus"></i> Regel toevoegen
                    </button>
                    ` : ''}
                </div>
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
            <div class="grid grid-cols-2 sm:grid-cols-12 gap-2 items-start">
                <div class="col-span-2 sm:col-span-5">
                    <label class="block text-xs font-medium mb-1">Beschrijving<span class="text-red-600 ml-1">*</span></label>
                    <input type="text" class="line-description w-full px-2 py-1 border rounded text-sm ${readonlyClass}"
                           value="${line.description || ''}" placeholder="Product of dienst..."
                           onchange="calculateOrderTotals()" ${readonlyAttr} required>
                </div>
                <div class="col-span-1 sm:col-span-2">
                    <label class="block text-xs font-medium mb-1">Aantal<span class="text-red-600 ml-1">*</span></label>
                    <input type="number" class="line-quantity w-full px-2 py-1 border rounded text-sm ${readonlyClass}"
                           value="${line.quantity || 1}" min="1" step="0.01"
                           onchange="calculateOrderTotals()" ${readonlyAttr} required>
                </div>
                <div class="col-span-1 sm:col-span-2">
                    <label class="block text-xs font-medium mb-1">Prijs<span class="text-red-600 ml-1">*</span></label>
                    <input type="number" class="line-price w-full px-2 py-1 border rounded text-sm ${readonlyClass}"
                           value="${line.unitPrice || 0}" min="0" step="0.01"
                           onchange="calculateOrderTotals()" ${readonlyAttr} required>
                </div>
                <div class="col-span-1 sm:col-span-2">
                    <label class="block text-xs font-medium mb-1">BTW %</label>
                    <select class="line-vat w-full px-2 py-1 border rounded text-sm ${readonlyClass}"
                            onchange="calculateOrderTotals()" ${disabledAttr}>
                        <option value="0"  ${vatPct === 0  ? 'selected' : ''}>0%</option>
                        <option value="9"  ${vatPct === 9  ? 'selected' : ''}>9%</option>
                        <option value="21" ${vatPct === 21 ? 'selected' : ''}>21%</option>
                    </select>
                </div>
                <div class="col-span-1 sm:col-span-1 flex items-end">
                    ${!readonly ? `
                    <button type="button" onclick="removeOrderLine(${index})"
                            class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm w-full"
                            title="Verwijder regel">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
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
        vatAmount:    vatTotal,
        totalAmount:  subtotal + vatTotal
    };
}

function validateOrderData(data) {
    const errors = [];
    if (!data.customerId)    errors.push('Selecteer een klant');
    if (!data.orderDate)     errors.push('Orderdatum is verplicht');
    if (!data.lines?.length) errors.push('Voeg minimaal 1 orderregel toe');
    data.lines?.forEach((line, i) => {
        if (!line.description)  errors.push(`Regel ${i + 1}: beschrijving is verplicht`);
        if (line.quantity <= 0) errors.push(`Regel ${i + 1}: aantal moet groter dan 0 zijn`);
    });
    return errors;
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
        const [order, customers] = await Promise.all([
            getById('orders', id),
            getAll('customers')
        ]);

        createModal('Order Bewerken', getOrderForm(order, customers || []), async () => {
            const data = getOrderData();
            const errors = validateOrderData(data);
            if (errors.length > 0) throw new Error(errors.join('\n'));

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

async function showGenerateInvoiceFromOrder(orderId) {
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
                <input type="date" id="genDueDate" value="${getDatePlusDays(30)}"
                       class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                <p class="text-xs text-gray-500 mt-1">Standaard: 30 dagen na vandaag</p>
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
