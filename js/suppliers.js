// Suppliers management

let _suppliersCache = [];
let _supplierSortCol = 'name';
let _supplierSortDir = 1;
let _supplierSearch = '';

function generateSupplierNumber(suppliers) {
    if (!suppliers || suppliers.length === 0) return 'SUP-0001';
    const numbers = (suppliers || []).map(s => {
        const match = (s.supplierNumber || '').match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    });
    return `SUP-${String(Math.max(...numbers, 0) + 1).padStart(4, '0')}`;
}

async function loadSuppliers() {
    try {
        const suppliers = await getAll('suppliers');
        _suppliersCache = suppliers || [];
        renderSuppliersTable();
    } catch (error) {
        showError(error.message);
    }
}

function sortSuppliers(col) {
    if (_supplierSortCol === col) {
        _supplierSortDir = -_supplierSortDir;
    } else {
        _supplierSortCol = col;
        _supplierSortDir = 1;
    }
    renderSuppliersTable();
}

function _supplierSortIcon(col) {
    if (_supplierSortCol !== col) return '<i class="fas fa-sort ml-1 opacity-30"></i>';
    return _supplierSortDir === 1
        ? '<i class="fas fa-sort-up ml-1"></i>'
        : '<i class="fas fa-sort-down ml-1"></i>';
}

function renderSuppliersTable() {
    const searchLower = _supplierSearch.toLowerCase();
    let filtered = _suppliersCache;
    
    if (searchLower) {
        filtered = filtered.filter(s =>
            (s.name || '').toLowerCase().includes(searchLower) ||
            (s.supplierNumber || '').toLowerCase().includes(searchLower) ||
            (s.contactPerson || '').toLowerCase().includes(searchLower) ||
            (s.email || '').toLowerCase().includes(searchLower)
        );
    }

    const sorted = [...filtered].sort((a, b) => {
        let aVal = '', bVal = '';
        if (_supplierSortCol === 'name') {
            aVal = a.name || '';
            bVal = b.name || '';
        } else if (_supplierSortCol === 'supplierNumber') {
            const aNum = parseInt((a.supplierNumber || '').replace(/\D/g, ''), 10) || 0;
            const bNum = parseInt((b.supplierNumber || '').replace(/\D/g, ''), 10) || 0;
            return (aNum - bNum) * _supplierSortDir;
        } else if (_supplierSortCol === 'contactPerson') {
            aVal = a.contactPerson || '';
            bVal = b.contactPerson || '';
        } else if (_supplierSortCol === 'email') {
            aVal = a.email || '';
            bVal = b.email || '';
        }
        return aVal.localeCompare(bVal) * _supplierSortDir;
    });

    const activeSuppliers = sorted.filter(s => s.isActive !== false);
    const inactiveSuppliers = sorted.filter(s => s.isActive === false);

    let html = `
        <div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 class="text-2xl font-bold flex items-center gap-2">
                <i class="fas fa-truck text-green-600"></i>
                Leveranciers
            </h2>
            <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div class="relative flex-1 sm:flex-initial">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input 
                        type="text" 
                        id="supplierSearch"
                        placeholder="Zoeken..." 
                        value="${_supplierSearch}"
                        oninput="_supplierSearch = this.value; renderSuppliersTable();"
                        class="input-premium pl-10 w-full sm:w-64"
                    >
                </div>
                <button onclick="showCreateSupplier()" class="btn-bamboo whitespace-nowrap">
                    <i class="fas fa-plus mr-2"></i>Nieuwe leverancier
                </button>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onclick="sortSuppliers('supplierNumber')">
                                Nummer ${_supplierSortIcon('supplierNumber')}
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onclick="sortSuppliers('name')">
                                Naam ${_supplierSortIcon('name')}
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onclick="sortSuppliers('contactPerson')">
                                Contactpersoon ${_supplierSortIcon('contactPerson')}
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onclick="sortSuppliers('email')">
                                Email ${_supplierSortIcon('email')}
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acties
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
    `;

    if (activeSuppliers.length === 0 && inactiveSuppliers.length === 0) {
        html += `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-truck text-4xl mb-3 text-gray-300"></i>
                    <p class="font-medium">Geen leveranciers gevonden</p>
                    ${searchLower ? '<p class="text-sm mt-1">Probeer een andere zoekopdracht</p>' : ''}
                </td>
            </tr>
        `;
    } else {
        activeSuppliers.forEach(supplier => {
            html += buildSupplierRow(supplier);
        });
        
        if (inactiveSuppliers.length > 0) {
            html += `
                <tr class="bg-gray-50">
                    <td colspan="6" class="px-6 py-2 text-xs font-semibold text-gray-600 uppercase">
                        <i class="fas fa-archive mr-1"></i> Inactieve leveranciers
                    </td>
                </tr>
            `;
            inactiveSuppliers.forEach(supplier => {
                html += buildSupplierRow(supplier);
            });
        }
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;
}

function buildSupplierRow(supplier) {
    const statusBadge = supplier.isActive !== false
        ? '<span class="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800"><i class="fas fa-check-circle"></i> Actief</span>'
        : '<span class="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-600"><i class="fas fa-archive"></i> Inactief</span>';

    return `
        <tr class="hover:bg-gray-50 ${supplier.isActive === false ? 'opacity-60' : ''}">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="text-blue-600 hover:text-blue-900 cursor-pointer hover:underline" 
                     onclick="showSupplierDetails('${supplier.id}')">
                    ${supplier.supplierNumber || 'N/A'}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="font-medium">${supplier.name || 'N/A'}</div>
                ${supplier.city ? `<div class="text-xs text-gray-500">${supplier.city}</div>` : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${supplier.contactPerson || '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${supplier.email ? `<a href="mailto:${supplier.email}" class="text-blue-600 hover:underline">${supplier.email}</a>` : '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                ${statusBadge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="showEditSupplier('${supplier.id}')" 
                        class="text-blue-600 hover:text-blue-900 mr-3" 
                        title="Bewerken">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="confirmDeleteSupplier('${supplier.id}')" 
                        class="text-red-600 hover:text-red-900" 
                        title="Verwijderen">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

function showCreateSupplier() {
    const supplierNumber = generateSupplierNumber(_suppliersCache);
    
    const html = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-premium max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="modal-header">
                    <h2 class="text-2xl font-bold flex items-center gap-3">
                        <div class="icon-premium icon-wood">
                            <i class="fas fa-truck"></i>
                        </div>
                        Nieuwe leverancier
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form onsubmit="handleCreateSupplier(event)" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold mb-1">Leveranciersnummer *</label>
                                <input type="text" id="supplierNumber" value="${supplierNumber}" required class="input-premium w-full">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold mb-1">Naam *</label>
                                <input type="text" id="supplierName" required class="input-premium w-full">
                            </div>
                        </div>
                        
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-3">Contactgegevens</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Contactpersoon</label>
                                    <input type="text" id="supplierContactPerson" class="input-premium w-full">
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Email</label>
                                    <input type="email" id="supplierEmail" class="input-premium w-full">
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Telefoon</label>
                                    <input type="text" id="supplierPhone" class="input-premium w-full">
                                </div>
                            </div>
                        </div>
                        
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-3">Adres</h3>
                            <div class="grid grid-cols-1 gap-4">
                                <div class="grid grid-cols-4 gap-2">
                                    <div class="col-span-3">
                                        <label class="block text-sm font-semibold mb-1">Straat</label>
                                        <input type="text" id="supplierStreet" class="input-premium w-full">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold mb-1">Nr.</label>
                                        <input type="text" id="supplierHouseNumber" class="input-premium w-full">
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label class="block text-sm font-semibold mb-1">Postcode</label>
                                        <input type="text" id="supplierPostalCode" class="input-premium w-full">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold mb-1">Plaats</label>
                                        <input type="text" id="supplierCity" class="input-premium w-full">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold mb-1">Land</label>
                                        <input type="text" id="supplierCountry" value="Nederland" class="input-premium w-full">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-3">Fiscale gegevens</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-semibold mb-1">BTW-nummer</label>
                                    <input type="text" id="supplierVatNumber" class="input-premium w-full">
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">KvK-nummer</label>
                                    <input type="text" id="supplierCoCNumber" class="input-premium w-full">
                                </div>
                            </div>
                        </div>
                        
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-3">Betalingsgegevens</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-semibold mb-1">IBAN</label>
                                    <input type="text" id="supplierIban" class="input-premium w-full">
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Standaard betalingstermijn (dagen)</label>
                                    <input type="number" id="supplierPaymentTermDays" value="30" class="input-premium w-full">
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold mb-1">Notities</label>
                            <textarea id="supplierNotes" rows="3" class="input-premium w-full"></textarea>
                        </div>
                        
                        <div class="flex items-center">
                            <input type="checkbox" id="supplierIsActive" checked class="w-4 h-4 text-green-600">
                            <label for="supplierIsActive" class="ml-2 text-sm font-semibold">Actief</label>
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
}

async function handleCreateSupplier(e) {
    e.preventDefault();
    
    const supplier = {
        supplierNumber: document.getElementById('supplierNumber').value,
        name: document.getElementById('supplierName').value,
        contactPerson: document.getElementById('supplierContactPerson').value,
        email: document.getElementById('supplierEmail').value,
        phone: document.getElementById('supplierPhone').value,
        street: document.getElementById('supplierStreet').value,
        houseNumber: document.getElementById('supplierHouseNumber').value,
        postalCode: document.getElementById('supplierPostalCode').value,
        city: document.getElementById('supplierCity').value,
        country: document.getElementById('supplierCountry').value,
        vatNumber: document.getElementById('supplierVatNumber').value,
        chamberOfCommerceNumber: document.getElementById('supplierCoCNumber').value,
        iban: document.getElementById('supplierIban').value,
        defaultPaymentTermDays: document.getElementById('supplierPaymentTermDays').value,
        notes: document.getElementById('supplierNotes').value,
        isActive: document.getElementById('supplierIsActive').checked
    };
    
    try {
        await create('suppliers', supplier);
        closeModal();
        showSuccess('Leverancier succesvol aangemaakt');
        await loadSuppliers();
    } catch (error) {
        showError(error.message);
    }
}

async function showEditSupplier(id) {
    const supplier = _suppliersCache.find(s => s.id === id);
    if (!supplier) return;
    
    const html = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-premium max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="modal-header">
                    <h2 class="text-2xl font-bold flex items-center gap-3">
                        <div class="icon-premium icon-wood">
                            <i class="fas fa-truck"></i>
                        </div>
                        Leverancier bewerken
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form onsubmit="handleUpdateSupplier(event, '${id}')" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold mb-1">Leveranciersnummer *</label>
                                <input type="text" id="supplierNumber" value="${supplier.supplierNumber || ''}" required class="input-premium w-full">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold mb-1">Naam *</label>
                                <input type="text" id="supplierName" value="${supplier.name || ''}" required class="input-premium w-full">
                            </div>
                        </div>
                        
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-3">Contactgegevens</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Contactpersoon</label>
                                    <input type="text" id="supplierContactPerson" value="${supplier.contactPerson || ''}" class="input-premium w-full">
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Email</label>
                                    <input type="email" id="supplierEmail" value="${supplier.email || ''}" class="input-premium w-full">
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Telefoon</label>
                                    <input type="text" id="supplierPhone" value="${supplier.phone || ''}" class="input-premium w-full">
                                </div>
                            </div>
                        </div>
                        
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-3">Adres</h3>
                            <div class="grid grid-cols-1 gap-4">
                                <div class="grid grid-cols-4 gap-2">
                                    <div class="col-span-3">
                                        <label class="block text-sm font-semibold mb-1">Straat</label>
                                        <input type="text" id="supplierStreet" value="${supplier.street || ''}" class="input-premium w-full">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold mb-1">Nr.</label>
                                        <input type="text" id="supplierHouseNumber" value="${supplier.houseNumber || ''}" class="input-premium w-full">
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label class="block text-sm font-semibold mb-1">Postcode</label>
                                        <input type="text" id="supplierPostalCode" value="${supplier.postalCode || ''}" class="input-premium w-full">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold mb-1">Plaats</label>
                                        <input type="text" id="supplierCity" value="${supplier.city || ''}" class="input-premium w-full">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold mb-1">Land</label>
                                        <input type="text" id="supplierCountry" value="${supplier.country || 'Nederland'}" class="input-premium w-full">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-3">Fiscale gegevens</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-semibold mb-1">BTW-nummer</label>
                                    <input type="text" id="supplierVatNumber" value="${supplier.vatNumber || ''}" class="input-premium w-full">
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">KvK-nummer</label>
                                    <input type="text" id="supplierCoCNumber" value="${supplier.chamberOfCommerceNumber || ''}" class="input-premium w-full">
                                </div>
                            </div>
                        </div>
                        
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-3">Betalingsgegevens</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-semibold mb-1">IBAN</label>
                                    <input type="text" id="supplierIban" value="${supplier.iban || ''}" class="input-premium w-full">
                                </div>
                                <div>
                                    <label class="block text-sm font-semibold mb-1">Standaard betalingstermijn (dagen)</label>
                                    <input type="number" id="supplierPaymentTermDays" value="${supplier.defaultPaymentTermDays || '30'}" class="input-premium w-full">
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold mb-1">Notities</label>
                            <textarea id="supplierNotes" rows="3" class="input-premium w-full">${supplier.notes || ''}</textarea>
                        </div>
                        
                        <div class="flex items-center">
                            <input type="checkbox" id="supplierIsActive" ${supplier.isActive !== false ? 'checked' : ''} class="w-4 h-4 text-green-600">
                            <label for="supplierIsActive" class="ml-2 text-sm font-semibold">Actief</label>
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
}

async function handleUpdateSupplier(e, id) {
    e.preventDefault();
    
    const supplier = {
        supplierNumber: document.getElementById('supplierNumber').value,
        name: document.getElementById('supplierName').value,
        contactPerson: document.getElementById('supplierContactPerson').value,
        email: document.getElementById('supplierEmail').value,
        phone: document.getElementById('supplierPhone').value,
        street: document.getElementById('supplierStreet').value,
        houseNumber: document.getElementById('supplierHouseNumber').value,
        postalCode: document.getElementById('supplierPostalCode').value,
        city: document.getElementById('supplierCity').value,
        country: document.getElementById('supplierCountry').value,
        vatNumber: document.getElementById('supplierVatNumber').value,
        chamberOfCommerceNumber: document.getElementById('supplierCoCNumber').value,
        iban: document.getElementById('supplierIban').value,
        defaultPaymentTermDays: document.getElementById('supplierPaymentTermDays').value,
        notes: document.getElementById('supplierNotes').value,
        isActive: document.getElementById('supplierIsActive').checked
    };
    
    try {
        await update('suppliers', id, supplier);
        closeModal();
        showSuccess('Leverancier succesvol bijgewerkt');
        await loadSuppliers();
    } catch (error) {
        showError(error.message);
    }
}

async function showSupplierDetails(id) {
    const supplier = _suppliersCache.find(s => s.id === id);
    if (!supplier) return;
    
    const html = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-premium max-w-2xl">
                <div class="modal-header">
                    <h2 class="text-2xl font-bold flex items-center gap-3">
                        <div class="icon-premium icon-wood">
                            <i class="fas fa-truck"></i>
                        </div>
                        ${supplier.name}
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="modal-body space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <div class="text-sm text-gray-500">Leveranciersnummer</div>
                            <div class="font-medium">${supplier.supplierNumber || '-'}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-500">Status</div>
                            <div>${supplier.isActive !== false ? '<span class="badge-success">Actief</span>' : '<span class="badge-gray">Inactief</span>'}</div>
                        </div>
                    </div>
                    
                    ${supplier.contactPerson || supplier.email || supplier.phone ? `
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-2">Contactgegevens</h3>
                            <div class="space-y-2">
                                ${supplier.contactPerson ? `<div><span class="text-sm text-gray-500">Contactpersoon:</span> ${supplier.contactPerson}</div>` : ''}
                                ${supplier.email ? `<div><span class="text-sm text-gray-500">Email:</span> <a href="mailto:${supplier.email}" class="text-blue-600 hover:underline">${supplier.email}</a></div>` : ''}
                                ${supplier.phone ? `<div><span class="text-sm text-gray-500">Telefoon:</span> ${supplier.phone}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${supplier.street || supplier.city ? `
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-2">Adres</h3>
                            <div class="space-y-1">
                                ${supplier.street ? `<div>${supplier.street} ${supplier.houseNumber || ''}</div>` : ''}
                                ${supplier.postalCode || supplier.city ? `<div>${supplier.postalCode || ''} ${supplier.city || ''}</div>` : ''}
                                ${supplier.country ? `<div>${supplier.country}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${supplier.vatNumber || supplier.chamberOfCommerceNumber ? `
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-2">Fiscale gegevens</h3>
                            <div class="space-y-2">
                                ${supplier.vatNumber ? `<div><span class="text-sm text-gray-500">BTW-nummer:</span> ${supplier.vatNumber}</div>` : ''}
                                ${supplier.chamberOfCommerceNumber ? `<div><span class="text-sm text-gray-500">KvK-nummer:</span> ${supplier.chamberOfCommerceNumber}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${supplier.iban || supplier.defaultPaymentTermDays ? `
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-2">Betalingsgegevens</h3>
                            <div class="space-y-2">
                                ${supplier.iban ? `<div><span class="text-sm text-gray-500">IBAN:</span> ${supplier.iban}</div>` : ''}
                                ${supplier.defaultPaymentTermDays ? `<div><span class="text-sm text-gray-500">Standaard betalingstermijn:</span> ${supplier.defaultPaymentTermDays} dagen</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${supplier.notes ? `
                        <div class="border-t pt-4">
                            <h3 class="font-semibold mb-2">Notities</h3>
                            <div class="text-sm text-gray-700 whitespace-pre-wrap">${supplier.notes}</div>
                        </div>
                    ` : ''}
                    
                    <div class="flex gap-3 justify-end pt-4 border-t">
                        <button onclick="closeModal()" class="btn-ghost">
                            Sluiten
                        </button>
                        <button onclick="closeModal(); showEditSupplier('${id}')" class="btn-bamboo">
                            <i class="fas fa-edit mr-2"></i>Bewerken
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

async function confirmDeleteSupplier(id) {
    const supplier = _suppliersCache.find(s => s.id === id);
    if (!supplier) return;
    
    if (!confirm(`Weet je zeker dat je leverancier "${supplier.name}" wilt verwijderen?`)) {
        return;
    }
    
    try {
        await apiRequest(`/suppliers/${id}`, { method: 'DELETE' });
        showSuccess('Leverancier succesvol verwijderd');
        await loadSuppliers();
    } catch (error) {
        showError(error.message);
    }
}
