// Invoices management
function buildInvoiceTableRows(invoices, customers) {
    let html = '';
    invoices.forEach(invoice => {
        const invoicePayments = invoice.payments || [];
        const paidAmount = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
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
            partially_paid: { class: 'bg-blue-100 text-blue-800', label: 'Gedeeltelijk', icon: 'clock' },
            pending: { class: 'bg-yellow-100 text-yellow-800', label: 'Openstaand', icon: 'clock' },
            unpaid: { class: 'bg-yellow-100 text-yellow-800', label: 'Openstaand', icon: 'clock' },
            overdue: { class: 'bg-red-100 text-red-800', label: 'Achterstallig', icon: 'exclamation-triangle' }
        };
        const status = statusConfig[actualStatus] || statusConfig.pending;

        const customer = customers?.find(c => c.customerId === invoice.customerId);
        const customerName = customer?.business?.displayName || customer?.business?.name || invoice.customerId || 'N/A';

        const itemsCount = invoice.items?.length || 0;
        const itemsText = itemsCount > 0 ? `${itemsCount} regel${itemsCount > 1 ? 's' : ''}` : 'Geen regels';

        const paymentButton = actualStatus !== 'paid' ? `
            <button onclick="showCreatePaymentForInvoice('${invoice.id}')" 
                    class="text-green-600 hover:text-green-900 mr-3" 
                    title="Registreer betaling">
                <i class="fas fa-hand-holding-dollar"></i>
            </button>
        ` : '';

        const paymentInfo = actualStatus === 'partially_paid' ? `
            <div class="text-xs text-gray-600 mt-1">
                <div class="flex items-center gap-2">
                    <div class="w-20 bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-600 h-2 rounded-full" style="width: ${paymentPercentage}%"></div>
                    </div>
                    <span>${formatCurrency(paidAmount)} / ${formatCurrency(invoice.totalAmount)}</span>
                </div>
            </div>
        ` : '';

        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="text-blue-600 hover:text-blue-900 cursor-pointer hover:underline" onclick="showEditInvoice('${invoice.id}')">${invoice.invoiceNumber || 'N/A'}</div>
                    ${invoice.invoiceSource === 'order' ? `
                            <div class="text-xs mt-1">
                                <span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                    <i class="fas fa-shopping-cart"></i> Order
                                </span>
                            </div>` : invoice.invoiceSource === 'subscription' ? `
                            <div class="text-xs mt-1">
                                <span class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                    <i class="fas fa-sync"></i> Abonnement
                                </span>
                            </div>` : invoice.invoiceSource === 'manual' ? `
                            <div class="text-xs mt-1">
                                <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                                    <i class="fas fa-pen"></i> Handmatig
                                </span>
                            </div>` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">${customerName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title="${invoice.reference || ''}">${invoice.reference || '-'}</td>
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
                    <button onclick="downloadInvoicePdf('${invoice.id}')"
                            class="text-gray-600 hover:text-gray-900 mr-3"
                            title="Factuur downloaden als PDF">
                        <i class="fas fa-file-download"></i>
                    </button>
                    <button onclick="showEditInvoice('${invoice.id}')" 
                            class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteInvoice('${invoice.id}')" 
                            class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    return html;
}

function buildInvoiceTable(invoices, customers) {
    if (!invoices || invoices.length === 0) return null;
    return `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nummer</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klant</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referentie</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vervaldatum</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bedrag</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${buildInvoiceTableRows(invoices, customers)}
                </tbody>
            </table>
        </div>
    `;
}

async function loadInvoices() {
    try {
        const [invoices, customers] = await Promise.all([
            getAll('invoices'),
            getAll('customers')
        ]);

        const unpaidStatuses = ['pending', 'overdue', 'partially_paid', 'unpaid'];
        const unpaidInvoices = (invoices || []).filter(inv => {
            const paidAmount = (inv.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
            const isPaid = paidAmount >= inv.totalAmount && inv.totalAmount > 0;
            return !isPaid && unpaidStatuses.includes(inv.status);
        });
        const paidInvoices = (invoices || []).filter(inv => {
            const paidAmount = (inv.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
            const isPaid = paidAmount >= inv.totalAmount && inv.totalAmount > 0;
            return isPaid || inv.status === 'paid';
        });

        let html = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Facturen</h2>
                <button onclick="showCreateInvoice()" 
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                    <i class="fas fa-plus"></i> Nieuwe Factuur
                </button>
            </div>
        `;

        // Unpaid invoices table
        html += `
            <div class="mb-8">
                <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span class="px-2 py-0.5 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
                        <i class="fas fa-clock"></i> Niet betaald
                    </span>
                    <span class="text-gray-500 text-sm font-normal">(${unpaidInvoices.length})</span>
                </h3>
                ${buildInvoiceTable(unpaidInvoices, customers) || '<p class="text-gray-500 text-center py-6">Geen openstaande facturen</p>'}
            </div>
        `;

        // Paid invoices table
        html += `
            <div>
                <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span class="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800">
                        <i class="fas fa-check-circle"></i> Betaald
                    </span>
                    <span class="text-gray-500 text-sm font-normal">(${paidInvoices.length})</span>
                </h3>
                ${buildInvoiceTable(paidInvoices, customers) || '<p class="text-gray-500 text-center py-6">Geen betaalde facturen</p>'}
            </div>
        `;

        document.getElementById('content').innerHTML = html;
    } catch (error) {
        showError(error.message);
    }
}

function generateInvoiceNumber() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const yyyyMMdd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const HHmmss = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `INV-${yyyyMMdd}-${HHmmss}`;
}

function getInvoiceForm(invoice = null, allInvoices = [], customers = []) {
    const inv = invoice || {};

    // Generate timestamp-based invoice number if creating new
    const invoiceNumber = invoice ? inv.invoiceNumber : generateInvoiceNumber();

    // Default dates
    const invoiceDate = invoice ? (inv.invoiceDate ? inv.invoiceDate.split('T')[0] : '') : getTodayDate();
    const dueDate = invoice ? (inv.dueDate ? inv.dueDate.split('T')[0] : '') : getDatePlusDays(14);

    const isReadonly = invoice ? 'readonly' : 'readonly';
    const bgColor = invoice ? 'bg-gray-100' : 'bg-blue-50';

    // Generate customer dropdown options
    let customerOptions = '<option value="">-- Selecteer een klant --</option>';
    if (customers && customers.length > 0) {
        customers.forEach(customer => {
            const displayName = customer.business?.displayName || customer.business?.name || customer.customerId;
            const selected = inv.customerId === customer.customerId ? 'selected' : '';
            customerOptions += `<option value="${customer.customerId}" ${selected}>${displayName}</option>`;
        });
    }

    // Generate invoice items HTML
    const items = inv.items || [{ description: '', quantity: 1, unitPrice: 0, vatPercentage: 21 }];
    let itemsHtml = '';
    items.forEach((item, index) => {
        itemsHtml += getInvoiceItemRow(index, item);
    });

    return `
        <div class="space-y-6 max-h-[70vh] overflow-y-auto">
            <!-- Header Information -->
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 class="font-bold text-lg mb-3">Factuurgegevens</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label for="customerId" class="block text-sm font-medium mb-2">Klant<span class="text-red-600 ml-1">*</span></label>
                        <select id="customerId" required
                                ${invoice ? 'disabled' : ''}
                                class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${invoice ? 'bg-gray-100 cursor-not-allowed' : ''}">
                            ${customerOptions}
                        </select>
                        ${invoice ? '<p class="text-xs text-gray-500 mt-1"><i class="fas fa-lock"></i> Klant kan niet worden gewijzigd</p>' : ''}
                    </div>
                    <div>
                        <label for="invoiceNumber" class="block text-sm font-medium mb-2">
                            Factuurnummer<span class="text-red-600 ml-1">*</span>
                            ${!invoice ? '<span class="text-xs text-blue-600">(Automatisch)</span>' : ''}
                        </label>
                        <input type="text" id="invoiceNumber" value="${invoiceNumber}" 
                               ${isReadonly} required
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 ${bgColor}">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                        <label for="invoiceDate" class="block text-sm font-medium mb-2">
                            Factuurdatum<span class="text-red-600 ml-1">*</span>
                            ${!invoice ? '<span class="text-xs text-gray-600">(Vandaag)</span>' : ''}
                        </label>
                        <input type="date" id="invoiceDate" 
                               value="${invoiceDate}" required
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label for="dueDate" class="block text-sm font-medium mb-2">
                            Vervaldatum<span class="text-red-600 ml-1">*</span>
                            ${!invoice ? '<span class="text-xs text-gray-600">(+14 dagen)</span>' : ''}
                        </label>
                        <input type="date" id="dueDate" 
                               value="${dueDate}" required
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label for="reference" class="block text-sm font-medium mb-2">Referentie</label>
                        <input type="text" id="reference" value="${inv.reference || ''}" 
                               placeholder="PO nummer, project code..." 
                               class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
            </div>

            <!-- Invoice Items -->
            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-bold text-lg">Factuurregels</h3>
                    <button type="button" onclick="addInvoiceItem()" 
                            class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">
                        <i class="fas fa-plus"></i> Regel toevoegen
                    </button>
                </div>

                <div id="invoiceItems" class="space-y-3">
                    ${itemsHtml}
                </div>
            </div>

            <!-- Totals -->
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 class="font-bold text-lg mb-3">Totalen</h3>
                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span>Subtotaal (excl. BTW):</span>
                        <span id="subtotalDisplay" class="font-semibold">€ 0,00</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span>BTW bedrag:</span>
                        <span id="vatDisplay" class="font-semibold">€ 0,00</span>
                    </div>
                    <div class="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Totaal (incl. BTW):</span>
                        <span id="totalDisplay" class="text-blue-600">€ 0,00</span>
                    </div>
                </div>
            </div>

            <!-- Notes and Status -->
            <div class="grid ${invoice ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-4">
                <div>
                    <label for="notes" class="block text-sm font-medium mb-2">Opmerkingen</label>
                    <textarea id="notes" rows="3" 
                              placeholder="Extra informatie voor op de factuur..."
                              class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">${inv.notes || ''}</textarea>
                </div>
                ${invoice ? `
                <div>
                    <label for="status" class="block text-sm font-medium mb-2">
                        Status
                        <span class="text-xs text-gray-500 ml-2"><i class="fas fa-lock"></i> Alleen-lezen</span>
                    </label>
                    <select id="status" disabled class="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed">
                        <option value="pending" ${inv.status === 'pending' || !inv.status ? 'selected' : ''}>Openstaand</option>
                        <option value="unpaid" ${inv.status === 'unpaid' ? 'selected' : ''}>Openstaand</option>
                        <option value="partially_paid" ${inv.status === 'partially_paid' ? 'selected' : ''}>Gedeeltelijk Betaald</option>
                        <option value="paid" ${inv.status === 'paid' ? 'selected' : ''}>Betaald</option>
                        <option value="overdue" ${inv.status === 'overdue' ? 'selected' : ''}>Achterstallig</option>
                    </select>
                    <p class="text-xs text-gray-500 mt-1">
                        <i class="fas fa-info-circle"></i> Status wordt automatisch bijgewerkt bij betalingen
                    </p>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Enhanced invoice form with payment history (for editing existing invoices)
function getInvoiceFormWithPayments(invoice, allInvoices, customers, payments, totalPaid, remainingAmount) {
    console.log('getInvoiceFormWithPayments called with:', {
        invoiceNumber: invoice.invoiceNumber,
        paymentsCount: payments?.length || 0,
        totalPaid,
        remainingAmount
    });

    // Get the base form
    const baseForm = getInvoiceForm(invoice, allInvoices, customers);

    // Build payment history section
    let paymentHistoryHtml = '';
    if (payments && payments.length > 0) {
        paymentHistoryHtml = payments.map(payment => `
            <div class="flex items-center justify-between p-3 bg-white rounded border hover:bg-gray-50">
                <div class="flex-1">
                    <p class="font-semibold text-sm">${payment.paymentId}</p>
                    <p class="text-xs text-gray-500">${formatDate(payment.date)}</p>
                </div>
                <div class="text-right mr-3">
                    <p class="font-bold text-green-600">${formatCurrency(payment.amount || 0)}</p>
                    <p class="text-xs text-gray-500">${formatPaymentMethod(payment.method)}</p>
                </div>
                <span class="badge-premium badge-success">
                    <i class="fas fa-check"></i>
                </span>
            </div>
        `).join('');
    } else {
        paymentHistoryHtml = `
            <div class="text-center py-6 text-gray-500">
                <i class="fas fa-inbox text-3xl mb-2 opacity-50"></i>
                <p class="text-sm">Nog geen betalingen geregistreerd</p>
            </div>
        `;
    }

    // Payment status indicator
    const paymentPercentage = invoice.totalAmount > 0 ? (totalPaid / invoice.totalAmount * 100) : 0;
    const statusColor = paymentPercentage >= 100 ? 'green' : paymentPercentage > 0 ? 'blue' : 'yellow';
    const statusBg = paymentPercentage >= 100 ? 'bg-green-50 border-green-200' : paymentPercentage > 0 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200';

    console.log('Payment section config:', {
        paymentPercentage,
        statusColor,
        statusBg,
        showButton: remainingAmount > 0
    });

    // Betaalgeschiedenis is altijd read-only (vergrendeld)
    // Betalingen worden beheerd via de betalingen module, niet via factuur bewerken
    const isPaid = true;

    const paymentSection = `
        <!-- Payment History Section -->
        <div id="paymentHistorySection" class="${statusBg} p-4 rounded-lg border mt-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-lg flex items-center">
                    <i class="fas fa-credit-card mr-2 text-${statusColor}-600"></i>
                    Betaalgeschiedenis
                    <span class="ml-2 text-xs bg-gray-600 text-white px-2 py-1 rounded"><i class="fas fa-lock"></i> Alleen-lezen</span>
                </h3>
            </div>

            <!-- Payment Summary -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div class="bg-white p-3 rounded border">
                    <p class="text-xs text-gray-600 mb-1">Totaal Factuur</p>
                    <p class="text-xl font-bold text-gray-900">${formatCurrency(invoice.totalAmount || 0)}</p>
                </div>
                <div class="bg-white p-3 rounded border">
                    <p class="text-xs text-gray-600 mb-1">Betaald</p>
                    <p class="text-xl font-bold text-green-600">${formatCurrency(totalPaid)}</p>
                    ${payments && payments.length > 0 ? `<p class="text-xs text-gray-500 mt-1">${payments.length} betaling${payments.length > 1 ? 'en' : ''}</p>` : ''}
                </div>
                <div class="bg-white p-3 rounded border">
                    <p class="text-xs text-gray-600 mb-1">Openstaand</p>
                    <p class="text-xl font-bold text-${remainingAmount > 0 ? 'yellow' : 'green'}-600">${formatCurrency(remainingAmount)}</p>
                    ${paymentPercentage > 0 ? `
                        <div class="mt-2">
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-${statusColor}-600 h-2 rounded-full transition-all" style="width: ${Math.min(paymentPercentage, 100)}%"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Payment List -->
            <div class="space-y-2">
                <h4 class="font-semibold text-sm text-gray-700 mb-2">Geregistreerde betalingen:</h4>
                ${paymentHistoryHtml}
            </div>
        </div>
    `;

    // Insert payment section before the closing div of the base form
    // The base form ends with:         </div>\n    `; so we need to insert before that
    const lastDivIndex = baseForm.lastIndexOf('</div>');
    if (lastDivIndex === -1) {
        console.error('Could not find closing </div> in base form');
        return baseForm; // Return base form unchanged if we can't find the insertion point
    }

    console.log('Inserting payment section at position:', lastDivIndex);

    // Insert the payment section before the last </div>
    const result = baseForm.slice(0, lastDivIndex) + paymentSection + baseForm.slice(lastDivIndex);
    console.log('Payment section inserted successfully');
    return result;
}

// Generate a single invoice item row
function getInvoiceItemRow(index, item = {}) {
    const description = item.description || '';
    const quantity = item.quantity || 1;
    const unitPrice = item.unitPrice || 0;
    const vatPercentage = item.vatPercentage !== undefined ? item.vatPercentage : 21;

    return `
        <div class="invoice-item bg-white p-3 rounded border" data-index="${index}">
            <div class="grid grid-cols-2 sm:grid-cols-12 gap-2 items-start">
                <div class="col-span-2 sm:col-span-5">
                    <label class="block text-xs font-medium mb-1">Beschrijving<span class="text-red-600 ml-1">*</span></label>
                    <input type="text" 
                           class="item-description w-full px-2 py-1 border rounded text-sm" 
                           value="${description}"
                           placeholder="Product of dienst..."
                           onchange="calculateInvoiceTotals()"
                           required>
                </div>
                <div class="col-span-1 sm:col-span-2">
                    <label class="block text-xs font-medium mb-1">Aantal<span class="text-red-600 ml-1">*</span></label>
                    <input type="number" 
                           class="item-quantity w-full px-2 py-1 border rounded text-sm" 
                           value="${quantity}"
                           min="1"
                           step="0.01"
                           onchange="calculateInvoiceTotals()"
                           required>
                </div>
                <div class="col-span-1 sm:col-span-2">
                    <label class="block text-xs font-medium mb-1">Prijs<span class="text-red-600 ml-1">*</span></label>
                    <input type="number" 
                           class="item-price w-full px-2 py-1 border rounded text-sm" 
                           value="${unitPrice}"
                           min="0"
                           step="0.01"
                           onchange="calculateInvoiceTotals()"
                           required>
                </div>
                <div class="col-span-1 sm:col-span-2">
                    <label class="block text-xs font-medium mb-1">BTW %</label>
                    <select class="item-vat w-full px-2 py-1 border rounded text-sm"
                            onchange="calculateInvoiceTotals()">
                        <option value="0" ${vatPercentage === 0 ? 'selected' : ''}>0%</option>
                        <option value="9" ${vatPercentage === 9 ? 'selected' : ''}>9%</option>
                        <option value="21" ${vatPercentage === 21 ? 'selected' : ''}>21%</option>
                    </select>
                </div>
                <div class="col-span-1 sm:col-span-1 flex items-end">
                    <button type="button" 
                            onclick="removeInvoiceItem(${index})"
                            class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm w-full"
                            title="Verwijder regel">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="text-xs text-gray-600 mt-1">
                Subtotaal: <span class="item-subtotal font-semibold">€ 0,00</span>
            </div>
        </div>
    `;
}

// Add new invoice item
function addInvoiceItem() {
    const container = document.getElementById('invoiceItems');
    const currentItems = container.querySelectorAll('.invoice-item');
    const newIndex = currentItems.length;

    const newItemHtml = getInvoiceItemRow(newIndex, { quantity: 1, unitPrice: 0, vatPercentage: 21 });
    container.insertAdjacentHTML('beforeend', newItemHtml);
    calculateInvoiceTotals();
}

// Remove invoice item
function removeInvoiceItem(index) {
    const items = document.querySelectorAll('.invoice-item');
    if (items.length <= 1) {
        showToast('Er moet minimaal 1 factuurregel zijn', 'error');
        return;
    }

    items[index].remove();

    // Re-index remaining items
    const remainingItems = document.querySelectorAll('.invoice-item');
    remainingItems.forEach((item, newIndex) => {
        item.dataset.index = newIndex;
        const removeBtn = item.querySelector('button[onclick^="removeInvoiceItem"]');
        if (removeBtn) {
            removeBtn.setAttribute('onclick', `removeInvoiceItem(${newIndex})`);
        }
    });

    calculateInvoiceTotals();
}

// Calculate invoice totals
function calculateInvoiceTotals() {
    const items = document.querySelectorAll('.invoice-item');
    let subtotal = 0;
    let vatTotal = 0;

    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
        const unitPrice = parseFloat(item.querySelector('.item-price').value) || 0;
        const vatPercentage = parseFloat(item.querySelector('.item-vat').value) || 0;

        const itemSubtotal = quantity * unitPrice;
        const itemVat = itemSubtotal * (vatPercentage / 100);

        subtotal += itemSubtotal;
        vatTotal += itemVat;

        // Update item subtotal display
        const subtotalSpan = item.querySelector('.item-subtotal');
        if (subtotalSpan) {
            subtotalSpan.textContent = formatCurrency(itemSubtotal);
        }
    });

    const total = subtotal + vatTotal;

    // Update displays
    document.getElementById('subtotalDisplay').textContent = formatCurrency(subtotal);
    document.getElementById('vatDisplay').textContent = formatCurrency(vatTotal);
    document.getElementById('totalDisplay').textContent = formatCurrency(total);

    // Update payment history section if it exists
    updatePaymentHistorySummary(total);
}

// Update payment history summary when invoice total changes
function updatePaymentHistorySummary(newTotal) {
    const paymentHistorySection = document.getElementById('paymentHistorySection');
    if (!paymentHistorySection) return;

    // Find the payment summary cards
    const summaryCards = paymentHistorySection.querySelectorAll('.grid.grid-cols-3 > div');
    if (summaryCards.length < 3) return;

    // Get current paid amount from the display
    const paidAmountElement = summaryCards[1].querySelector('.text-xl');
    if (!paidAmountElement) return;

    // Extract paid amount from the formatted currency string
    const paidText = paidAmountElement.textContent.trim();
    const paidAmount = parseCurrency(paidText);

    // Calculate new remaining amount
    const remainingAmount = Math.max(newTotal - paidAmount, 0);

    // Update "Totaal Factuur" (first card)
    const totalAmountElement = summaryCards[0].querySelector('.text-xl');
    if (totalAmountElement) {
        totalAmountElement.textContent = formatCurrency(newTotal);
    }

    // Update "Openstaand" (third card)
    const remainingAmountElement = summaryCards[2].querySelector('.text-xl');
    if (remainingAmountElement) {
        remainingAmountElement.textContent = formatCurrency(remainingAmount);

        // Update color class
        remainingAmountElement.className = remainingAmountElement.className.replace(/text-(yellow|green)-600/, 
            remainingAmount > 0 ? 'text-yellow-600' : 'text-green-600');
    }

    // Update progress bar if it exists
    const progressBar = summaryCards[2].querySelector('.bg-gray-200 .transition-all');
    if (progressBar && newTotal > 0) {
        const paymentPercentage = Math.min((paidAmount / newTotal * 100), 100);
        progressBar.style.width = `${paymentPercentage}%`;
    }
}

// Helper function to parse currency string back to number
function parseCurrency(currencyString) {
    if (!currencyString) return 0;
    // Remove currency symbol, spaces, and convert comma to dot
    return parseFloat(currencyString.replace(/[€\s]/g, '').replace(',', '.')) || 0;
}

function getInvoiceData() {
    // Collect invoice items
    const itemElements = document.querySelectorAll('.invoice-item');
    const items = [];
    let subtotal = 0;
    let vatTotal = 0;

    itemElements.forEach(itemEl => {
        const description = itemEl.querySelector('.item-description').value.trim();
        const quantity = parseFloat(itemEl.querySelector('.item-quantity').value) || 0;
        const unitPrice = parseFloat(itemEl.querySelector('.item-price').value) || 0;
        const vatPercentage = parseFloat(itemEl.querySelector('.item-vat').value) || 0;

        const amount = quantity * unitPrice;
        subtotal += amount;
        vatTotal += amount * (vatPercentage / 100);

        items.push({
            description,
            quantity,
            unitPrice,
            vatPercentage,
            amount
        });
    });

    const totalAmount = subtotal + vatTotal;

    const invoiceData = {
        invoiceNumber: document.getElementById('invoiceNumber').value.trim(),
        customerId: document.getElementById('customerId').value.trim(),
        invoiceDate: document.getElementById('invoiceDate').value,
        dueDate: document.getElementById('dueDate').value,
        reference: document.getElementById('reference').value.trim(),
        notes: document.getElementById('notes').value.trim(),
        invoiceSource: 'manual',
        items: items,
        subTotal: subtotal,
        vatAmount: vatTotal,
        totalAmount: totalAmount
    };

    // Only include status if the field exists (when editing existing invoice)
    const statusElement = document.getElementById('status');
    if (statusElement) {
        invoiceData.status = statusElement.value;
    } else {
        // Default status for new invoices
        invoiceData.status = 'pending';
    }

    return invoiceData;
}

// Validate invoice form data
function validateInvoiceData(data) {
    const errors = [];

    // Clear previous error states
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.remove());

    // Validate invoice number
    if (!data.invoiceNumber || data.invoiceNumber.length === 0) {
        errors.push({ field: 'invoiceNumber', message: 'Factuurnummer is verplicht' });
    }

    // Validate customer
    if (!data.customerId || data.customerId.length === 0) {
        errors.push({ field: 'customerId', message: 'Selecteer een klant' });
    }

    // Validate invoice date
    if (!data.invoiceDate || data.invoiceDate.length === 0) {
        errors.push({ field: 'invoiceDate', message: 'Factuurdatum is verplicht' });
    }

    // Validate due date
    if (!data.dueDate || data.dueDate.length === 0) {
        errors.push({ field: 'dueDate', message: 'Vervaldatum is verplicht' });
    }

    // Validate due date is after invoice date
    if (data.invoiceDate && data.dueDate) {
        const invoiceDate = new Date(data.invoiceDate);
        const dueDate = new Date(data.dueDate);
        if (dueDate < invoiceDate) {
            errors.push({ field: 'dueDate', message: 'Vervaldatum moet na factuurdatum zijn' });
        }
    }

    // Validate items
    if (!data.items || data.items.length === 0) {
        errors.push({ field: 'items', message: 'Voeg minimaal 1 factuurregel toe' });
    } else {
        // Validate each item
        let hasItemErrors = false;
        data.items.forEach((item, index) => {
            const itemElement = document.querySelectorAll('.invoice-item')[index];

            if (!item.description || item.description.trim().length === 0) {
                hasItemErrors = true;
                const descInput = itemElement.querySelector('.item-description');
                descInput.classList.add('error');
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Beschrijving is verplicht';
                descInput.parentElement.appendChild(errorMsg);
            }

            if (!item.quantity || item.quantity <= 0) {
                hasItemErrors = true;
                const qtyInput = itemElement.querySelector('.item-quantity');
                qtyInput.classList.add('error');
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Aantal moet > 0 zijn';
                qtyInput.parentElement.appendChild(errorMsg);
            }

            if (item.unitPrice === undefined || item.unitPrice < 0) {
                hasItemErrors = true;
                const priceInput = itemElement.querySelector('.item-price');
                priceInput.classList.add('error');
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Prijs moet ≥ 0 zijn';
                priceInput.parentElement.appendChild(errorMsg);
            }
        });

        if (hasItemErrors) {
            errors.push({ field: 'items', message: 'Controleer alle factuurregels' });
        }
    }

    // Validate status
    if (!data.status || data.status.length === 0) {
        errors.push({ field: 'status', message: 'Status is verplicht' });
    }

    // Display field-specific errors
    errors.forEach(error => {
        const field = document.getElementById(error.field);
        if (field) {
            field.classList.add('error');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error.message}`;
            field.parentElement.appendChild(errorMsg);
        }
    });

    return errors;
}

async function showCreateInvoice() {
    try {
        // Fetch all invoices and customers
        const [invoices, customers] = await Promise.all([
            getAll('invoices'),
            getAll('customers')
        ]);

        if (!customers || customers.length === 0) {
            showToast('Geen klanten beschikbaar. Maak eerst een klant aan.', 'error');
            return;
        }

        createModal('Nieuwe Factuur', getInvoiceForm(null, invoices || [], customers || []), async () => {
            const data = getInvoiceData();

            // Validate form data
            const errors = validateInvoiceData(data);
            if (errors.length > 0) {
                const errorMessages = errors.map(e => e.message).join('\n');
                throw new Error(`Validatie fouten:\n${errorMessages}`);
            }

            await create('invoices', data);
            showToast('Factuur aangemaakt', 'success');
            loadInvoices();
        });

        // Initialize calculations and date listener after modal is created
        setTimeout(() => {
            calculateInvoiceTotals();
            setupInvoiceDateListener();
        }, 100);
    } catch (error) {
        showToast('Fout bij laden van gegevens: ' + error.message, 'error');
    }
}

async function showEditInvoice(id) {
    try {
        const [invoice, allInvoices, customers] = await Promise.all([
            getById('invoices', id),
            getAll('invoices'),
            getAll('customers')
        ]);

        // Get payments from within the invoice
        const invoicePayments = invoice.payments || [];

        const totalPaid = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const remainingAmount = Math.max((invoice.totalAmount || 0) - totalPaid, 0);

        createModal(
            'Factuur Bewerken', 
            getInvoiceFormWithPayments(invoice, allInvoices, customers || [], invoicePayments, totalPaid, remainingAmount), 
            async () => {
                const data = getInvoiceData();

                // Validate form data
                const errors = validateInvoiceData(data);
                if (errors.length > 0) {
                    const errorMessages = errors.map(e => e.message).join('\n');
                    throw new Error(`Validatie fouten:\n${errorMessages}`);
                }

                // Preserve existing payments when updating
                data.payments = invoice.payments;

                await update('invoices', id, data);
                showToast('Factuur bijgewerkt', 'success');
                loadInvoices();
            },
            'Opslaan',
            'xl' // Larger modal for payment history
        );

        // Initialize calculations after modal is created
        setTimeout(() => {
            calculateInvoiceTotals();
            setupInvoiceDateListener();
            setupStatusChangeListener(invoice, invoicePayments, totalPaid, remainingAmount);
        }, 100);
    } catch (error) {
        showToast('Fout bij laden van factuur: ' + error.message, 'error');
    }
}

async function deleteInvoice(id) {
    if (!confirm('Weet je zeker dat je deze factuur wilt verwijderen?')) return;

    try {
        await remove('invoices', id);
        showToast('Factuur verwijderd', 'success');
        loadInvoices();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Setup listener for status dropdown changes to update payment history UI
function setupStatusChangeListener(invoice, payments, totalPaid, remainingAmount) {
    const statusDropdown = document.getElementById('status');
    if (!statusDropdown) return;

    statusDropdown.addEventListener('change', function() {
        const newStatus = this.value;
        const paymentSection = document.getElementById('paymentHistorySection');
        const addPaymentBtn = document.getElementById('addPaymentBtn');

        if (!paymentSection) return;

        const isPaid = newStatus === 'paid';

        // Update section styling
        const statusColor = isPaid ? 'green' : (totalPaid > 0 ? 'blue' : 'yellow');
        const statusBg = isPaid ? 'bg-green-50 border-green-200' : (totalPaid > 0 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200');

        paymentSection.className = `${statusBg} p-4 rounded-lg border mt-6`;

        // Show/hide payment button and locked indicator
        const headerDiv = paymentSection.querySelector('.flex.justify-between.items-center');
        if (headerDiv) {
            const heading = headerDiv.querySelector('h3');
            if (heading) {
                // Remove existing lock badge if present
                const existingBadge = heading.querySelector('.ml-2');
                if (existingBadge) existingBadge.remove();

                // Add lock badge if paid
                if (isPaid) {
                    heading.insertAdjacentHTML('beforeend', '<span class="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded"><i class="fas fa-lock"></i> Vergrendeld</span>');
                }
            }

            // Show/hide add payment button
            if (addPaymentBtn) {
                addPaymentBtn.style.display = (!isPaid && remainingAmount > 0) ? 'inline-block' : 'none';
            }
        }

        // Show/hide info message
        let infoMessage = paymentSection.querySelector('.bg-green-100');
        if (isPaid && !infoMessage) {
            // Add info message
            const summaryDiv = paymentSection.querySelector('.grid.grid-cols-3');
            if (summaryDiv) {
                summaryDiv.insertAdjacentHTML('beforebegin', `
                    <div class="bg-green-100 border border-green-300 rounded p-3 mb-4">
                        <p class="text-sm text-green-800">
                            <i class="fas fa-info-circle mr-2"></i>
                            <strong>Betaalgeschiedenis is vergrendeld</strong> - Deze factuur heeft de status "Betaald". 
                            Wijzig de status om betalingen toe te voegen of te bewerken.
                        </p>
                    </div>
                `);
            }
        } else if (!isPaid && infoMessage) {
            // Remove info message
            infoMessage.remove();
        }
    });
}

// Setup listener for invoice date changes to automatically update due date
function setupInvoiceDateListener() {
    const invoiceDateInput = document.getElementById('invoiceDate');
    const dueDateInput = document.getElementById('dueDate');

    if (!invoiceDateInput || !dueDateInput) return;

    invoiceDateInput.addEventListener('change', function() {
        const invoiceDate = this.value;
        if (!invoiceDate) return;

        // Calculate due date as 14 days after invoice date
        const date = new Date(invoiceDate);
        date.setDate(date.getDate() + 14);
        const newDueDate = date.toISOString().split('T')[0];

        dueDateInput.value = newDueDate;
    });
}

// Create payment for a specific invoice
async function showCreatePaymentForInvoice(invoiceId) {
    try {
        const invoice = await getById('invoices', invoiceId);

        if (!invoice) {
            showToast('Factuur niet gevonden', 'error');
            return;
        }

        if (invoice.status === 'paid') {
            showToast('Deze factuur is als betaald gemarkeerd. Wijzig eerst de status om een betaling toe te voegen.', 'warning');
            return;
        }

        // Pass invoice data to payment creation
        showCreatePaymentWithInvoice(invoice);
    } catch (error) {
        showToast('Fout bij laden van factuur: ' + error.message, 'error');
    }
}

// Show invoice details in a read-only modal (called from payments tab)
async function showInvoiceDetails(id) {
    try {
        const [invoice, customers] = await Promise.all([
            getById('invoices', id),
            getAll('customers')
        ]);

        if (!invoice) {
            showToast('Factuur niet gevonden', 'error');
            return;
        }

        const customer = customers?.find(c => c.customerId === invoice.customerId);
        const customerName = customer?.business?.displayName || customer?.business?.name || invoice.customerId || 'N/A';

        const invoicePayments = invoice.payments || [];
        const totalPaid = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const remainingAmount = Math.max((invoice.totalAmount || 0) - totalPaid, 0);

        const statusConfig = {
            paid: { class: 'bg-green-100 text-green-800', label: 'Betaald' },
            partially_paid: { class: 'bg-blue-100 text-blue-800', label: 'Gedeeltelijk Betaald' },
            pending: { class: 'bg-yellow-100 text-yellow-800', label: 'Openstaand' },
            unpaid: { class: 'bg-yellow-100 text-yellow-800', label: 'Openstaand' },
            overdue: { class: 'bg-red-100 text-red-800', label: 'Achterstallig' }
        };
        const status = statusConfig[invoice.status] || statusConfig.pending;

        let itemsHtml = (invoice.items || []).map(item => `
            <tr>
                <td class="py-2 pr-4 text-sm">${item.description || ''}</td>
                <td class="py-2 pr-4 text-sm text-right">${item.quantity}</td>
                <td class="py-2 pr-4 text-sm text-right">${formatCurrency(item.unitPrice)}</td>
                <td class="py-2 pr-4 text-sm text-right">${item.vatPercentage}%</td>
                <td class="py-2 text-sm text-right font-semibold">${formatCurrency(item.amount || item.quantity * item.unitPrice)}</td>
            </tr>
        `).join('');

        let paymentsHtml = invoicePayments.length > 0
            ? invoicePayments.map(p => `
                <div class="flex justify-between items-center text-sm py-1 border-b last:border-0">
                    <span class="text-gray-600">${formatDate(p.date)} – ${formatPaymentMethod(p.method)}</span>
                    <span class="font-semibold text-green-600">${formatCurrency(p.amount)}</span>
                </div>`).join('')
            : '<p class="text-sm text-gray-500">Geen betalingen geregistreerd</p>';

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
                        <p class="text-gray-500 text-xs">Factuurnummer</p>
                        <p class="font-medium">${invoice.invoiceNumber || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-gray-500 text-xs">Factuurdatum</p>
                        <p class="font-medium">${formatDate(invoice.invoiceDate)}</p>
                    </div>
                    <div>
                        <p class="text-gray-500 text-xs">Vervaldatum</p>
                        <p class="font-medium">${formatDate(invoice.dueDate)}</p>
                    </div>
                    ${invoice.reference ? `<div>
                        <p class="text-gray-500 text-xs">Referentie</p>
                        <p class="font-medium">${invoice.reference}</p>
                    </div>` : ''}
                </div>

                <div class="border rounded overflow-hidden">
                    <table class="min-w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="py-2 pr-4 text-left text-xs font-medium text-gray-500 uppercase px-3">Beschrijving</th>
                                <th class="py-2 pr-4 text-right text-xs font-medium text-gray-500 uppercase">Aantal</th>
                                <th class="py-2 pr-4 text-right text-xs font-medium text-gray-500 uppercase">Prijs</th>
                                <th class="py-2 pr-4 text-right text-xs font-medium text-gray-500 uppercase">BTW</th>
                                <th class="py-2 text-right text-xs font-medium text-gray-500 uppercase pr-3">Bedrag</th>
                            </tr>
                        </thead>
                        <tbody class="px-3">${itemsHtml}</tbody>
                    </table>
                </div>

                <div class="bg-gray-50 rounded p-4 space-y-1 text-sm">
                    <div class="flex justify-between"><span>Subtotaal</span><span>${formatCurrency(invoice.subTotal)}</span></div>
                    <div class="flex justify-between"><span>BTW</span><span>${formatCurrency(invoice.vatAmount)}</span></div>
                    <div class="flex justify-between font-bold text-base border-t pt-2 mt-2">
                        <span>Totaal</span><span>${formatCurrency(invoice.totalAmount)}</span>
                    </div>
                    ${invoicePayments.length > 0 ? `
                    <div class="flex justify-between text-green-600"><span>Betaald</span><span>${formatCurrency(totalPaid)}</span></div>
                    <div class="flex justify-between font-semibold ${remainingAmount > 0 ? 'text-yellow-600' : 'text-green-600'}">
                        <span>Openstaand</span><span>${formatCurrency(remainingAmount)}</span>
                    </div>` : ''}
                </div>

                ${invoicePayments.length > 0 ? `
                <div>
                    <p class="text-sm font-semibold mb-2">Betalingen</p>
                    ${paymentsHtml}
                </div>` : ''}

                ${invoice.notes ? `<div class="bg-blue-50 rounded p-3 text-sm text-blue-800">${invoice.notes}</div>` : ''}

                <div class="flex justify-end">
                    <button onclick="downloadInvoicePdf('${invoice.id}')"
                            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2">
                        <i class="fas fa-file-download"></i> Factuur downloaden als PDF
                    </button>
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
                <h2 class="text-2xl font-bold mb-4 pr-8">Factuur ${invoice.invoiceNumber || ''}</h2>
                <div>${content}</div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        showToast('Fout bij laden van factuur: ' + error.message, 'error');
    }
}

// Download invoice as PDF directly in the browser
async function downloadInvoicePdf(invoiceId) {
    try {
        showToast('Factuur wordt gegenereerd...', 'info');

        const [invoice, customers] = await Promise.all([
            getById('invoices', invoiceId),
            getAll('customers')
        ]);

        if (!invoice) {
            showToast('Factuur niet gevonden', 'error');
            return;
        }

        const session = getSession();
        const companyName = session?.companyName || 'Rice Studio';
        const companyAddress = session?.address;
        const companyKvk = session?.kvkNumber;
        const companyVat = session?.vatNumber;

        const customer = customers?.find(c => c.customerId === invoice.customerId);
        const customerName = customer?.business?.displayName || customer?.business?.name || invoice.customerId || '';
        const customerAddress = customer?.business?.address;
        const customerEmail = customer?.business?.emailAddress || customer?.contact?.emailAddress || '';

        const invoicePayments = invoice.payments || [];
        const totalPaid = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const remainingAmount = Math.max((invoice.totalAmount || 0) - totalPaid, 0);

        const statusLabels = {
            paid: 'Betaald', partially_paid: 'Gedeeltelijk Betaald',
            pending: 'Openstaand', overdue: 'Achterstallig'
        };
        const statusLabel = statusLabels[invoice.status] || 'Openstaand';

        // Build company address lines
        const companyAddressLines = [];
        if (companyAddress?.street) companyAddressLines.push(`${companyAddress.street} ${companyAddress.houseNumber || ''}`.trim());
        if (companyAddress?.postalCode || companyAddress?.city) companyAddressLines.push(`${companyAddress.postalCode || ''} ${companyAddress.city || ''}`.trim());
        if (companyKvk) companyAddressLines.push(`KVK: ${companyKvk}`);
        if (companyVat) companyAddressLines.push(`BTW: ${companyVat}`);

        // Build customer address lines
        const customerAddressLines = [customerName];
        if (customerAddress?.street) customerAddressLines.push(`${customerAddress.street} ${customerAddress.houseNumber || ''}`.trim());
        if (customerAddress?.postalCode || customerAddress?.city) customerAddressLines.push(`${customerAddress.postalCode || ''} ${customerAddress.city || ''}`.trim());
        if (customerEmail) customerAddressLines.push(customerEmail);

        // Build invoice items table rows
        const itemTableBody = [
            [
                { text: 'Beschrijving', style: 'tableHeader' },
                { text: 'Aantal', style: 'tableHeader', alignment: 'right' },
                { text: 'Stukprijs', style: 'tableHeader', alignment: 'right' },
                { text: 'BTW', style: 'tableHeader', alignment: 'right' },
                { text: 'Bedrag', style: 'tableHeader', alignment: 'right' }
            ],
            ...(invoice.items || []).map(item => [
                { text: item.description || '', fontSize: 10 },
                { text: String(item.quantity), fontSize: 10, alignment: 'right' },
                { text: formatCurrency(item.unitPrice), fontSize: 10, alignment: 'right' },
                { text: `${item.vatPercentage}%`, fontSize: 10, alignment: 'right' },
                { text: formatCurrency(item.amount || item.quantity * item.unitPrice), fontSize: 10, alignment: 'right', bold: true }
            ])
        ];

        // Build totals rows
        const totalsTableBody = [
            [{ text: 'Subtotaal', fontSize: 10 }, { text: formatCurrency(invoice.subTotal), fontSize: 10, alignment: 'right', bold: true }],
            [{ text: 'BTW', fontSize: 10 }, { text: formatCurrency(invoice.vatAmount), fontSize: 10, alignment: 'right', bold: true }],
            [{ text: 'Totaal', fontSize: 13, bold: true }, { text: formatCurrency(invoice.totalAmount), fontSize: 13, alignment: 'right', bold: true }]
        ];
        if (totalPaid > 0) {
            totalsTableBody.push([{ text: 'Betaald', fontSize: 10 }, { text: formatCurrency(totalPaid), fontSize: 10, alignment: 'right', bold: true }]);
            totalsTableBody.push([{ text: 'Openstaand', fontSize: 10, bold: true }, { text: formatCurrency(remainingAmount), fontSize: 10, alignment: 'right', bold: true }]);
        }

        // Build payments table (if any)
        const paymentsSection = [];
        if (invoicePayments.length > 0) {
            paymentsSection.push({ text: 'Betalingen', style: 'sectionHeader', margin: [0, 16, 0, 6] });
            paymentsSection.push({
                table: {
                    widths: ['auto', 'auto', '*'],
                    body: [
                        [
                            { text: 'Datum', style: 'tableHeader' },
                            { text: 'Methode', style: 'tableHeader' },
                            { text: 'Bedrag', style: 'tableHeader', alignment: 'right' }
                        ],
                        ...invoicePayments.map(p => [
                            { text: formatDate(p.date), fontSize: 10 },
                            { text: formatPaymentMethod(p.method), fontSize: 10 },
                            { text: formatCurrency(p.amount), fontSize: 10, alignment: 'right', bold: true }
                        ])
                    ]
                },
                layout: 'lightHorizontalLines'
            });
        }

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 40],
            content: [
                // Header: company + invoice title
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
                                { text: 'FACTUUR', style: 'invoiceTitle', alignment: 'right' },
                                { text: invoice.invoiceNumber || '', fontSize: 12, color: '#6b7280', alignment: 'right' },
                                { text: statusLabel, fontSize: 9, bold: true, color: '#374151', background: '#f3f4f6', alignment: 'right', margin: [0, 4, 0, 0] }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 24]
                },
                // Bill-to + invoice meta
                {
                    columns: [
                        {
                            stack: [
                                { text: 'Factuur aan', style: 'sectionHeader', margin: [0, 0, 0, 4] },
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
                                body: [
                                    [
                                        { text: 'Factuurdatum', fontSize: 9, color: '#6b7280', border: [false, false, false, false] },
                                        { text: formatDate(invoice.invoiceDate), fontSize: 10, alignment: 'right', border: [false, false, false, false] }
                                    ],
                                    [
                                        { text: 'Vervaldatum', fontSize: 9, color: '#6b7280', border: [false, false, false, false] },
                                        { text: formatDate(invoice.dueDate), fontSize: 10, alignment: 'right', border: [false, false, false, false] }
                                    ],
                                    ...(invoice.reference ? [[
                                        { text: 'Referentie', fontSize: 9, color: '#6b7280', border: [false, false, false, false] },
                                        { text: invoice.reference, fontSize: 10, alignment: 'right', border: [false, false, false, false] }
                                    ]] : [])
                                ]
                            },
                            layout: 'noBorders',
                            alignment: 'right'
                        }
                    ],
                    margin: [0, 0, 0, 24]
                },
                // Items table
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 45, 65, 35, 65],
                        body: itemTableBody
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 16]
                },
                // Totals (right-aligned)
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
                // Payments
                ...paymentsSection,
                // Notes
                ...(invoice.notes ? [
                    { text: 'Opmerkingen', style: 'sectionHeader', margin: [0, 16, 0, 4] },
                    { text: invoice.notes, fontSize: 10, color: '#374151', background: '#f9fafb', margin: [8, 4, 8, 4] }
                ] : []),
                // Footer
                {
                    text: `Gegenereerd met RiceDesk op ${new Date().toLocaleDateString('nl-NL')}`,
                    fontSize: 9,
                    color: '#9ca3af',
                    alignment: 'center',
                    margin: [0, 32, 0, 0]
                }
            ],
            styles: {
                companyName: { fontSize: 22, bold: true, color: '#111827' },
                companyDetail: { fontSize: 10, color: '#6b7280', lineHeight: 1.3 },
                invoiceTitle: { fontSize: 20, bold: true, color: '#111827' },
                sectionHeader: { fontSize: 9, bold: true, color: '#6b7280', characterSpacing: 1 },
                tableHeader: { fontSize: 9, bold: true, color: '#6b7280', fillColor: '#f3f4f6' }
            }
        };

        pdfMake.createPdf(docDefinition).download(`Factuur_${invoice.invoiceNumber || invoiceId}.pdf`);
        showToast('Factuur gedownload', 'success');
    } catch (error) {
        showToast('Fout bij genereren factuur: ' + error.message, 'error');
    }
}
