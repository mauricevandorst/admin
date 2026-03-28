// User management

function loadUsers() {
    const session = getSession();
    if (!session || !hasRole(['Admin'])) {
        showError('Geen toegang. Alleen beheerders kunnen gebruikers beheren.');
        return;
    }

    showLoading();
    getAll('users')
        .then(users => renderUsers(users || []))
        .catch(err => showError(err.message));
}

function getRoleBadge(role) {
    const roles = {
        'Admin': { class: 'bg-red-100 text-red-800', icon: 'crown', label: 'Admin' },
        'AdministratiefMedewerker': { class: 'bg-green-100 text-green-800', icon: 'user-edit', label: 'Administratief' },
        'Medewerker': { class: 'bg-blue-100 text-blue-800', icon: 'user', label: 'Medewerker' },
        'Gast': { class: 'bg-gray-100 text-gray-800', icon: 'eye', label: 'Gast' }
    };
    const r = roles[role] || roles['Medewerker'];
    return `<span class="px-2 py-1 text-xs font-semibold rounded ${r.class}"><i class="fas fa-${r.icon}"></i> ${r.label}</span>`;
}

function renderUsers(users) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Gebruikers&shy;beheer</h2>
            <button onclick="showCreateUserModal()" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
                <i class="fas fa-plus"></i> Nieuw
            </button>
        </div>

        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Naam</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gebruikersnaam</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Bedrijf</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">KVK</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">BTW</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${users.length === 0
                        ? `<tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">Geen gebruikers gevonden</td></tr>`
                        : users.map(u => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${escapeHtml(u.displayName || '-')}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${escapeHtml(u.username || '-')}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">${escapeHtml(u.companyName || '-')}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">${escapeHtml(u.kvkNumber || '-')}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">${escapeHtml(u.vatNumber || '-')}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm">
                                    ${getRoleBadge(u.role || 'Medewerker')}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onclick="showEditUserModal(${JSON.stringify(u).replace(/"/g, '&quot;')})"
                                            class="text-blue-600 hover:text-blue-900 mr-3" title="Bewerken">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="confirmDeleteUser('${u.id}', '${escapeHtml(u.displayName || u.username)}')"
                                            class="text-red-600 hover:text-red-900" title="Verwijderen">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function buildUserFormHtml(user) {
    const addr = user?.address || {};
    const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
    const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
    const currentRole = user?.role || 'Medewerker';
    
    return `
        <div class="space-y-4">
            <div class="bg-blue-50 p-4 rounded-lg">
                <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                    <i class="fas fa-user mr-2 text-blue-600"></i> Accountgegevens
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="${labelClass}">Weergavenaam <span class="text-red-600">*</span></label>
                        <input type="text" id="uf-displayName" class="${inputClass}" value="${escapeHtml(user?.displayName || '')}" placeholder="Jan de Vries">
                    </div>
                    <div>
                        <label class="${labelClass}">Gebruikersnaam <span class="text-red-600">*</span></label>
                        <input type="text" id="uf-username" class="${inputClass}" value="${escapeHtml(user?.username || '')}" placeholder="jdevries" ${user?.id ? 'disabled' : ''}>
                    </div>
                </div>
                <div class="mt-4">
                    <label class="${labelClass}">${user?.id ? 'Nieuw wachtwoord (leeg = ongewijzigd)' : 'Wachtwoord *'}</label>
                    <input type="password" id="uf-password" class="${inputClass}" placeholder="••••••••" autocomplete="new-password">
                </div>
            </div>

            <div class="bg-green-50 p-4 rounded-lg">
                <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                    <i class="fas fa-building mr-2 text-green-600"></i> Bedrijfsinformatie
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="${labelClass}">Bedrijfsnaam</label>
                        <input type="text" id="uf-companyName" class="${inputClass}" value="${escapeHtml(user?.companyName || '')}" placeholder="Bedrijf B.V.">
                    </div>
                    <div>
                        <label class="${labelClass}">KVK-nummer</label>
                        <input type="text" id="uf-kvkNumber" class="${inputClass}" value="${escapeHtml(user?.kvkNumber || '')}" placeholder="12345678">
                    </div>
                </div>
                <div class="mt-4">
                    <label class="${labelClass}">BTW-nummer</label>
                    <input type="text" id="uf-vatNumber" class="${inputClass}" value="${escapeHtml(user?.vatNumber || '')}" placeholder="NL123456789B01">
                </div>
            </div>

            <div class="bg-gray-50 p-4 rounded-lg">
                <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                    <i class="fas fa-map-marker-alt mr-2 text-gray-600"></i> Adres
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="md:col-span-2">
                        <label class="${labelClass}">Straat</label>
                        <input type="text" id="uf-street" class="${inputClass}" value="${escapeHtml(addr.street || '')}" placeholder="Voorbeeldstraat">
                    </div>
                    <div>
                        <label class="${labelClass}">Huisnummer</label>
                        <input type="text" id="uf-houseNumber" class="${inputClass}" value="${escapeHtml(addr.houseNumber || '')}" placeholder="1A">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label class="${labelClass}">Postcode</label>
                        <input type="text" id="uf-postalCode" class="${inputClass}" value="${escapeHtml(addr.postalCode || '')}" placeholder="1234 AB">
                    </div>
                    <div>
                        <label class="${labelClass}">Stad</label>
                        <input type="text" id="uf-city" class="${inputClass}" value="${escapeHtml(addr.city || '')}" placeholder="Amsterdam">
                    </div>
                </div>
            </div>

            <div class="bg-yellow-50 p-4 rounded-lg">
                <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                    <i class="fas fa-user-shield mr-2 text-yellow-600"></i> Rol en rechten
                </h3>
                <label class="${labelClass}">Rol <span class="text-red-600">*</span></label>
                <select id="uf-role" class="${inputClass}">
                    <option value="Admin" ${currentRole === 'Admin' ? 'selected' : ''}>
                        Admin - Volledige toegang inclusief verwijderen
                    </option>
                    <option value="AdministratiefMedewerker" ${currentRole === 'AdministratiefMedewerker' ? 'selected' : ''}>
                        Administratief medewerker - Alles bewerken (geen verwijderen)
                    </option>
                    <option value="Medewerker" ${currentRole === 'Medewerker' ? 'selected' : ''}>
                        Medewerker - Alleen bekijken
                    </option>
                    <option value="Gast" ${currentRole === 'Gast' ? 'selected' : ''}>
                        Gast - Beperkt bekijken (geen gevoelige gegevens)
                    </option>
                </select>
                <p class="text-xs text-gray-500 mt-2">
                    <i class="fas fa-info-circle"></i> 
                    Admin: Alles | Administratief: Bewerken | Medewerker: Bekijken | Gast: Beperkt bekijken
                </p>
            </div>
        </div>
    `;
}

function collectUserFormData() {
    return {
        displayName: document.getElementById('uf-displayName').value.trim(),
        username: document.getElementById('uf-username').value.trim(),
        password: document.getElementById('uf-password').value,
        companyName: document.getElementById('uf-companyName').value.trim(),
        kvkNumber: document.getElementById('uf-kvkNumber').value.trim(),
        vatNumber: document.getElementById('uf-vatNumber').value.trim(),
        address: {
            street: document.getElementById('uf-street').value.trim(),
            houseNumber: document.getElementById('uf-houseNumber').value.trim(),
            postalCode: document.getElementById('uf-postalCode').value.trim(),
            city: document.getElementById('uf-city').value.trim()
        },
        role: document.getElementById('uf-role').value
    };
}

function showCreateUserModal() {
    createModal(
        'Nieuwe gebruiker',
        buildUserFormHtml(null),
        async () => {
            const data = collectUserFormData();
            if (!data.displayName) throw new Error('Weergavenaam is verplicht');
            if (!data.username) throw new Error('Gebruikersnaam is verplicht');
            if (!data.password) throw new Error('Wachtwoord is verplicht');
            await create('users', data);
            showToast('Gebruiker aangemaakt', 'success');
            loadUsers();
        }
    );
}

function showEditUserModal(user) {
    createModal(
        'Gebruiker bewerken',
        buildUserFormHtml(user),
        async () => {
            const data = collectUserFormData();
            if (!data.displayName) throw new Error('Weergavenaam is verplicht');
            if (!data.password) delete data.password;
            const updated = await update('users', user.id, data);
            const session = getSession();
            if (session && session.id === user.id) {
                saveSession({ ...session, ...updated });
                updateNavUserInfo({ ...session, ...updated });
            }
            showToast('Gebruiker bijgewerkt', 'success');
            loadUsers();
        }
    );
}

async function confirmDeleteUser(id, name) {
    if (!confirm(`Wil je gebruiker "${name}" verwijderen?`)) return;

    try {
        await remove('users', id);
        showToast('Gebruiker verwijderd', 'success');
        loadUsers();
    } catch (err) {
        showToast(err.message || 'Fout bij verwijderen gebruiker', 'error');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
