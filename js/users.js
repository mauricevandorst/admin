// User management

function loadUsers() {
    const session = getSession();
    if (!session || !session.isAdmin) {
        showError('Geen toegang. Alleen beheerders kunnen gebruikers beheren.');
        return;
    }

    showLoading();
    getAll('users')
        .then(users => renderUsers(users || []))
        .catch(err => showError(err.message));
}

function renderUsers(users) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <h2 class="text-2xl font-bold flex items-center gap-3">
                    <div class="icon-premium icon-wood"><i class="fas fa-user-cog"></i></div>
                    Gebruikersbeheer
                </h2>
                <button onclick="showCreateUserModal()" class="btn-bamboo flex items-center gap-2">
                    <i class="fas fa-plus"></i> Nieuwe gebruiker
                </button>
            </div>

            <div class="card-glass overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th class="px-4 py-3 text-left font-semibold text-gray-700">Naam</th>
                                <th class="px-4 py-3 text-left font-semibold text-gray-700">Gebruikersnaam</th>
                                <th class="px-4 py-3 text-left font-semibold text-gray-700">Bedrijf</th>
                                <th class="px-4 py-3 text-left font-semibold text-gray-700">KVK</th>
                                <th class="px-4 py-3 text-left font-semibold text-gray-700">BTW</th>
                                <th class="px-4 py-3 text-left font-semibold text-gray-700">Rol</th>
                                <th class="px-4 py-3 text-right font-semibold text-gray-700">Acties</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${users.length === 0
                                ? `<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">Geen gebruikers gevonden</td></tr>`
                                : users.map(u => `
                                    <tr class="hover:bg-gray-50 transition-colors">
                                        <td class="px-4 py-3 font-medium">${escapeHtml(u.displayName || '-')}</td>
                                        <td class="px-4 py-3 text-gray-600">${escapeHtml(u.username || '-')}</td>
                                        <td class="px-4 py-3 text-gray-600">${escapeHtml(u.companyName || '-')}</td>
                                        <td class="px-4 py-3 text-gray-600">${escapeHtml(u.kvkNumber || '-')}</td>
                                        <td class="px-4 py-3 text-gray-600">${escapeHtml(u.vatNumber || '-')}</td>
                                        <td class="px-4 py-3">
                                            ${u.isAdmin
                                                ? '<span class="badge-premium badge-success text-xs">Beheerder</span>'
                                                : '<span class="badge-premium badge-info text-xs">Gebruiker</span>'}
                                        </td>
                                        <td class="px-4 py-3 text-right">
                                            <button onclick="showEditUserModal(${JSON.stringify(u).replace(/"/g, '&quot;')})"
                                                    class="btn-sm-bamboo mr-1" title="Bewerken">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button onclick="confirmDeleteUser('${u.id}', '${escapeHtml(u.displayName || u.username)}')"
                                                    class="btn-sm-ghost text-red-600 hover:text-red-700" title="Verwijderen">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function buildUserFormHtml(user) {
    const addr = user?.address || {};
    return `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-semibold mb-1 text-gray-700">Weergavenaam *</label>
                    <input type="text" id="uf-displayName" class="input-premium w-full" value="${escapeHtml(user?.displayName || '')}" placeholder="Jan de Vries">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1 text-gray-700">Gebruikersnaam *</label>
                    <input type="text" id="uf-username" class="input-premium w-full" value="${escapeHtml(user?.username || '')}" placeholder="jdevries" ${user?.id ? 'disabled' : ''}>
                </div>
            </div>
            <div>
                <label class="block text-sm font-semibold mb-1 text-gray-700">${user?.id ? 'Nieuw wachtwoord (leeg = ongewijzigd)' : 'Wachtwoord *'}</label>
                <input type="password" id="uf-password" class="input-premium w-full" placeholder="••••••••" autocomplete="new-password">
            </div>
            <hr class="border-gray-200">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-semibold mb-1 text-gray-700">Bedrijfsnaam</label>
                    <input type="text" id="uf-companyName" class="input-premium w-full" value="${escapeHtml(user?.companyName || '')}" placeholder="Bedrijf B.V.">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1 text-gray-700">KVK-nummer</label>
                    <input type="text" id="uf-kvkNumber" class="input-premium w-full" value="${escapeHtml(user?.kvkNumber || '')}" placeholder="12345678">
                </div>
            </div>
            <div>
                <label class="block text-sm font-semibold mb-1 text-gray-700">BTW-nummer</label>
                <input type="text" id="uf-vatNumber" class="input-premium w-full" value="${escapeHtml(user?.vatNumber || '')}" placeholder="NL123456789B01">
            </div>
            <hr class="border-gray-200">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adres</p>
            <div class="grid grid-cols-3 gap-4">
                <div class="col-span-2">
                    <label class="block text-sm font-semibold mb-1 text-gray-700">Straat</label>
                    <input type="text" id="uf-street" class="input-premium w-full" value="${escapeHtml(addr.street || '')}" placeholder="Voorbeeldstraat">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1 text-gray-700">Huisnummer</label>
                    <input type="text" id="uf-houseNumber" class="input-premium w-full" value="${escapeHtml(addr.houseNumber || '')}" placeholder="1A">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-semibold mb-1 text-gray-700">Postcode</label>
                    <input type="text" id="uf-postalCode" class="input-premium w-full" value="${escapeHtml(addr.postalCode || '')}" placeholder="1234 AB">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1 text-gray-700">Stad</label>
                    <input type="text" id="uf-city" class="input-premium w-full" value="${escapeHtml(addr.city || '')}" placeholder="Amsterdam">
                </div>
            </div>
            <hr class="border-gray-200">
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <input type="checkbox" id="uf-isAdmin" class="w-5 h-5 rounded" ${user?.isAdmin ? 'checked' : ''}>
                <label class="text-sm font-semibold text-gray-700" for="uf-isAdmin">🔑 Beheerderrechten</label>
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
        isAdmin: document.getElementById('uf-isAdmin').checked
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
