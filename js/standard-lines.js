// Standard lines management

async function loadStandardLines() {
    try {
        const [lines] = await Promise.all([getAll('standard-lines')]);

        let html = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Standaard regels</h2>
                <button onclick="showCreateStandardLine()"
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                    <i class="fas fa-plus"></i> Nieuw
                </button>
            </div>
        `;

        if (!lines || lines.length === 0) {
            html += '<p class="text-gray-500 text-center py-8">Geen standaard regels gevonden.</p>';
        } else {
            // Group by category
            const grouped = {};
            lines.forEach(line => {
                const cat = line.category || 'Algemeen';
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(line);
            });

            html += '<div class="space-y-6">';
            Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).forEach(([category, catLines]) => {
                html += `
                    <div>
                        <h3 class="text-sm font-semibold text-gray-500 uppercase mb-2">${category}</h3>
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Naam</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beschrijving</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prijs (excl. BTW)</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BTW</th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                `;
                catLines.forEach(line => {
                    html += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 text-sm font-medium">${line.name || '-'}</td>
                            <td class="px-6 py-4 text-sm text-gray-600">${line.description || '-'}</td>
                            <td class="px-6 py-4 text-sm font-semibold">${formatCurrency(line.unitPrice || 0)}</td>
                            <td class="px-6 py-4 text-sm">${line.vatPercentage ?? 21}%</td>
                            <td class="px-6 py-4 text-right text-sm font-medium">
                                <button onclick="showEditStandardLine('${line.id}')"
                                        class="text-blue-600 hover:text-blue-900 mr-3" title="Bewerken">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteStandardLine('${line.id}')"
                                        class="text-red-600 hover:text-red-900" title="Verwijderen">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
                html += '</tbody></table></div></div>';
            });
            html += '</div>';
        }

        document.getElementById('content').innerHTML = html;
    } catch (err) {
        console.error('Error loading standard lines:', err);
        document.getElementById('content').innerHTML = '<p class="text-red-500">Fout bij laden van standaard regels.</p>';
    }
}

function getStandardLineForm(line = null) {
    const sl = line || {};
    return `
        <div class="space-y-4">
            <div class="grid grid-cols-1 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Naam<span class="text-red-600 ml-1">*</span></label>
                    <input type="text" id="slName" value="${sl.name || ''}"
                           placeholder="Bijv. Maatwerk website bouwen"
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" required>
                    <p class="text-xs text-gray-500 mt-1">Korte naam voor in de kiezer</p>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Categorie</label>
                    <input type="text" id="slCategory" value="${sl.category || ''}"
                           placeholder="Bijv. Ontwikkeling, Hosting, SEO, Design"
                           list="slCategoryList"
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                    <datalist id="slCategoryList"></datalist>
                    <p class="text-xs text-gray-500 mt-1">Optioneel: voor groepering in de kiezer</p>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Beschrijving<span class="text-red-600 ml-1">*</span></label>
                <input type="text" id="slDescription" value="${sl.description || ''}"
                       placeholder="Bijv. Ontwerp en ontwikkeling van een maatwerk website inclusief 5 pagina's"
                       class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" required>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Prijs (excl. BTW)<span class="text-red-600 ml-1">*</span></label>
                    <input type="number" id="slUnitPrice" value="${sl.unitPrice ?? 0}"
                           min="0" step="0.01"
                           class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" required>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">BTW percentage</label>
                    <select id="slVatPercentage" class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                        <option value="0"  ${(sl.vatPercentage ?? 21) === 0  ? 'selected' : ''}>0%</option>
                        <option value="9"  ${(sl.vatPercentage ?? 21) === 9  ? 'selected' : ''}>9%</option>
                        <option value="21" ${(sl.vatPercentage ?? 21) === 21 ? 'selected' : ''}>21%</option>
                    </select>
                </div>
            </div>
            <div>
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="slIsActive" ${(sl.isActive !== false) ? 'checked' : ''}
                           class="rounded">
                    <span class="text-sm font-medium">Actief (zichtbaar in kiezer)</span>
                </label>
            </div>
        </div>
    `;
}

function getStandardLineFormData() {
    return {
        name: document.getElementById('slName')?.value?.trim(),
        category: document.getElementById('slCategory')?.value?.trim() || null,
        description: document.getElementById('slDescription')?.value?.trim(),
        unitPrice: parseFloat(document.getElementById('slUnitPrice')?.value) || 0,
        vatPercentage: parseFloat(document.getElementById('slVatPercentage')?.value) ?? 21,
        isActive: document.getElementById('slIsActive')?.checked ?? true,
    };
}

async function showCreateStandardLine() {
    try {
        const existing = await getAll('standard-lines');
        const form = getStandardLineForm();
        createModal('Nieuwe standaard regel', form, async () => {
            const data = getStandardLineFormData();
            if (!data.name) { showToast('Naam is verplicht', 'error'); return false; }
            if (!data.description) { showToast('Beschrijving is verplicht', 'error'); return false; }
            await create('standard-lines', data);
            showToast('Standaard regel aangemaakt', 'success');
            await loadStandardLines();
        });
        populateCategoryDatalist(existing);
    } catch (err) {
        console.error('Error showing create standard line form:', err);
        showToast('Fout bij openen formulier', 'error');
    }
}

async function showEditStandardLine(id) {
    try {
        const [line, existing] = await Promise.all([getById('standard-lines', id), getAll('standard-lines')]);
        if (!line) { showToast('Standaard regel niet gevonden', 'error'); return; }

        const form = getStandardLineForm(line);
        createModal('Standaard regel bewerken', form, async () => {
            const data = getStandardLineFormData();
            if (!data.name) { showToast('Naam is verplicht', 'error'); return false; }
            if (!data.description) { showToast('Beschrijving is verplicht', 'error'); return false; }
            await update('standard-lines', id, data);
            showToast('Standaard regel bijgewerkt', 'success');
            await loadStandardLines();
        });
        populateCategoryDatalist(existing);
    } catch (err) {
        console.error('Error showing edit standard line form:', err);
        showToast('Fout bij openen formulier', 'error');
    }
}

async function deleteStandardLine(id) {
    if (!confirm('Weet je zeker dat je deze standaard regel wilt verwijderen?')) return;
    try {
        await remove('standard-lines', id);
        showToast('Standaard regel verwijderd', 'success');
        await loadStandardLines();
    } catch (err) {
        console.error('Error deleting standard line:', err);
        showToast('Fout bij verwijderen', 'error');
    }
}

function populateCategoryDatalist(lines) {
    const datalist = document.getElementById('slCategoryList');
    if (!datalist || !lines) return;
    const categories = [...new Set(lines.map(l => l.category).filter(Boolean))];
    datalist.innerHTML = categories.map(c => `<option value="${c}">`).join('');
}

// ── Picker (used by orders.js and invoices.js) ────────────────────────────────

/**
 * Open a modal to pick one or more standard lines.
 * @param {function} onSelect - called with an array of selected line objects { description, quantity, unitPrice, vatPercentage }
 */
async function showStandardLinePicker(onSelect) {
    let standardLines = [];
    try {
        standardLines = await getAll('standard-lines');
    } catch (err) {
        showToast('Kan standaard regels niet laden', 'error');
        return;
    }

    if (!standardLines || standardLines.length === 0) {
        showToast('Geen standaard regels beschikbaar. Maak er eerst een aan via het menu.', 'info');
        return;
    }

    // Group by category
    const grouped = {};
    standardLines.forEach(line => {
        const cat = line.category || 'Algemeen';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(line);
    });

    let groupHtml = '';
    Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).forEach(([category, catLines]) => {
        groupHtml += `<div class="mb-4">
            <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">${category}</h4>
            <div class="space-y-1">`;
        catLines.forEach(line => {
            groupHtml += `
                <label class="flex items-start gap-3 p-2 rounded hover:bg-blue-50 cursor-pointer border border-transparent hover:border-blue-200 transition-colors">
                    <input type="checkbox" class="sl-pick mt-1 rounded" data-id="${line.id}"
                           data-description="${(line.description || '').replace(/"/g, '&quot;')}"
                           data-unit-price="${line.unitPrice ?? 0}"
                           data-vat="${line.vatPercentage ?? 21}">
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium">${line.name}</div>
                        <div class="text-xs text-gray-500 truncate">${line.description}</div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-sm font-semibold">${formatCurrency(line.unitPrice ?? 0)}</div>
                        <div class="text-xs text-gray-400">${line.vatPercentage ?? 21}% BTW</div>
                    </div>
                </label>`;
        });
        groupHtml += '</div></div>';
    });

    const pickerContent = `
        <div class="space-y-3">
            <div class="flex items-center gap-2 px-3 py-2 border rounded bg-gray-50">
                <i class="fas fa-search text-gray-400"></i>
                <input type="text" id="slPickerSearch" placeholder="Zoeken..."
                       oninput="filterStandardLinePicker(this.value)"
                       class="flex-1 bg-transparent text-sm outline-none">
            </div>
            <div id="slPickerList" class="max-h-80 overflow-y-auto border rounded p-2">
                ${groupHtml}
            </div>
            <p class="text-xs text-gray-500">
                <i class="fas fa-info-circle"></i> Selecteer een of meerdere regels om toe te voegen. Hoeveelheid is daarna nog aan te passen.
            </p>
        </div>
    `;

    // Build modal manually so we can control the confirm action
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
            <div class="flex items-center justify-between p-4 border-b shrink-0">
                <h2 class="text-lg font-bold"><i class="fas fa-list-check mr-2 text-blue-600"></i>Kies standaard regels</h2>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="p-4 overflow-y-auto flex-1">${pickerContent}</div>
            <div class="flex justify-end gap-3 p-4 border-t shrink-0">
                <button onclick="this.closest('.fixed').remove()"
                        class="px-4 py-2 border rounded hover:bg-gray-50 text-sm">Annuleren</button>
                <button id="slPickerConfirm"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
                    <i class="fas fa-plus mr-1"></i> Toevoegen
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('slPickerConfirm').addEventListener('click', () => {
        const checked = overlay.querySelectorAll('.sl-pick:checked');
        if (checked.length === 0) {
            showToast('Selecteer minimaal één regel', 'error');
            return;
        }
        const selected = Array.from(checked).map(cb => ({
            description: cb.dataset.description,
            quantity: 1,
            unitPrice: parseFloat(cb.dataset.unitPrice) || 0,
            vatPercentage: parseFloat(cb.dataset.vat) ?? 21,
            amount: parseFloat(cb.dataset.unitPrice) || 0,
        }));
        overlay.remove();
        onSelect(selected);
    });
}

function filterStandardLinePicker(query) {
    const q = query.toLowerCase();
    const list = document.getElementById('slPickerList');
    if (!list) return;
    list.querySelectorAll('label').forEach(label => {
        const text = label.textContent.toLowerCase();
        label.style.display = text.includes(q) ? '' : 'none';
    });
    // Hide empty category headers
    list.querySelectorAll('.mb-4').forEach(group => {
        const visible = group.querySelectorAll('label:not([style*="none"])').length;
        group.style.display = visible ? '' : 'none';
    });
}
