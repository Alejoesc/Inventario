import { db, state, addHistory, logAudit } from './db.js';

export function initUsuarios() {
    renderUsersTable(); updateUnitsSelect(); document.addEventListener('orgUpdated', updateUnitsSelect);

    const searchUser = document.getElementById('search-user');
    if(searchUser) {
        searchUser.onkeyup = (e) => {
            const val = e.target.value.toLowerCase(); const trs = document.querySelectorAll('#users-table tbody tr');
            trs.forEach(tr => { tr.style.display = tr.textContent.toLowerCase().includes(val) ? '' : 'none'; });
        };
    }

    document.getElementById('btn-add-user').onclick = () => {
        if(state.currentUser.role !== 'ADMIN') return window.showToast('Acceso Denegado', 'error');
        document.getElementById('edit-user-form').reset(); document.getElementById('edit-user-id').value = ''; document.getElementById('profile-card-view').style.display = 'none'; document.getElementById('user-modal-title').innerHTML = '<i class="fas fa-user-plus"></i> Registrar Nuevo Usuario'; document.getElementById('user-modal').classList.remove('hidden'); if(window.syncAllSelects) window.syncAllSelects();
    };

    document.getElementById('edit-user-form').onsubmit = (e) => {
        e.preventDefault(); if(state.currentUser.role !== 'ADMIN') return window.showToast('Acceso Denegado', 'error');
        
        const idValue = document.getElementById('edit-user-id').value; const inhabilitar = document.getElementById('edit-user-status').checked;

        if (idValue === '') {
            const newUser = { id: Date.now(), name: document.getElementById('edit-user-name').value, cedula: document.getElementById('edit-user-cedula').value, email: document.getElementById('edit-user-email').value, pass: '1234', role: document.getElementById('edit-user-role').value, dir: document.getElementById('edit-user-unit').value.split('|')[0] || 'Sin Asignar', unit: document.getElementById('edit-user-unit').value.split('|')[1] || 'Ninguna', active: !inhabilitar };
            db.users.push(newUser); window.showToast("Usuario creado con éxito. Clave por defecto: 1234"); addHistory("Creación de Usuario", `Se creó a ${newUser.name}`); logAudit("Gestión Usuarios", `Creó al usuario ${newUser.email}`);
        } else {
            const user = db.users.find(u => u.id === parseInt(idValue));
            user.name = document.getElementById('edit-user-name').value; user.cedula = document.getElementById('edit-user-cedula').value; user.email = document.getElementById('edit-user-email').value; user.role = document.getElementById('edit-user-role').value; user.active = !inhabilitar; user.dir = document.getElementById('edit-user-unit').value.split('|')[0]; user.unit = document.getElementById('edit-user-unit').value.split('|')[1];
            window.showToast(user.active ? "Usuario actualizado." : "Usuario Inhabilitado."); addHistory("Modificación Usuario", `Se actualizó el perfil de ${user.name}`); logAudit("Gestión Usuarios", `Modificó al usuario ${user.email}`);
        }

        document.getElementById('user-modal').classList.add('hidden'); 
        renderUsersTable();
    };
}

function updateUnitsSelect() {
    const select = document.getElementById('edit-user-unit'); select.innerHTML = '';
    for (const [dir, units] of Object.entries(db.organigrama)) {
        if(units.length === 0) select.innerHTML += `<option value="${dir}|Ninguna" style="color:black;">Dirección: ${dir} (Sin unidad)</option>`;
        units.forEach(u => select.innerHTML += `<option value="${dir}|${u}" style="color:black;">${dir} -> Unidad: ${u}</option>`);
    }
    if(window.syncAllSelects) window.syncAllSelects();
}

export function renderUsersTable() {
    const tbody = document.querySelector('#users-table tbody'); if(!tbody) return; tbody.innerHTML = '';
    
    if(state.currentUser && state.currentUser.role !== 'ADMIN') document.getElementById('btn-add-user').classList.add('hidden');

    db.users.forEach((u, index) => {
        const statusHTML = u.active !== false ? `<span style="color:var(--success)"><i class="fas fa-check"></i> Activo</span>` : `<span style="color:var(--danger)"><i class="fas fa-ban"></i> Inhabilitado</span>`;
        const tr = document.createElement('tr');
        
        let actionBtn = '<small>No autorizado</small>';
        if (state.currentUser.role === 'ADMIN') {
            if (u.role !== 'ADMIN' || db.users.filter(usr=>usr.role==='ADMIN').length > 1) { actionBtn = `<button class="action-btn btn-edit-user" data-index="${index}" style="padding: 6px 10px;" title="Ver/Editar Perfil"><i class="fas fa-id-card"></i> Gestionar</button>`; } else { actionBtn = '<small style="color:var(--danger)">Admin Intocable</small>'; }
        } else {
             actionBtn = `<button class="action-btn btn-info btn-view-user" data-index="${index}" style="padding: 6px 10px;"><i class="fas fa-eye"></i> Ver</button>`;
        }

        tr.innerHTML = `<td><strong>${u.name}</strong></td><td>${u.cedula}</td><td><span style="background:var(--accent); color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem;">${u.role}</span></td><td>${u.dir} / ${u.unit}</td><td>${statusHTML}</td><td>${actionBtn}</td>`;
        tr.onclick = () => { if(state.currentUser.role === 'ADMIN') openUserModal(u); else viewUserModalReadOnly(u); }; tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-edit-user').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); openUserModal(db.users[e.currentTarget.dataset.index]); });
    document.querySelectorAll('.btn-view-user').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); viewUserModalReadOnly(db.users[e.currentTarget.dataset.index]); });
}

function viewUserModalReadOnly(u) {
    document.getElementById('profile-card-view').style.display = 'flex'; document.getElementById('user-modal-title').innerHTML = '<i class="fas fa-id-card"></i> Perfil de Usuario';
    document.getElementById('profile-name').textContent = u.name; document.getElementById('profile-cedula').textContent = `V-${u.cedula}`; document.getElementById('profile-email').textContent = u.email; document.getElementById('profile-role').textContent = u.role;
    const statusBadge = document.getElementById('profile-status');
    if(u.active !== false) { statusBadge.textContent = 'ACTIVO'; statusBadge.style.background = 'var(--success)'; statusBadge.style.color = 'white'; } else { statusBadge.textContent = 'INHABILITADO'; statusBadge.style.background = 'var(--danger)'; statusBadge.style.color = 'white'; }
    document.getElementById('edit-user-form').style.display = 'none'; document.getElementById('user-modal').classList.remove('hidden');
}

function openUserModal(u) {
    if(state.currentUser.role !== 'ADMIN') return;
    document.getElementById('edit-user-form').style.display = 'block'; document.getElementById('profile-card-view').style.display = 'flex'; document.getElementById('user-modal-title').innerHTML = '<i class="fas fa-user-edit"></i> Editar Usuario';
    document.getElementById('profile-name').textContent = u.name; document.getElementById('profile-cedula').textContent = `V-${u.cedula}`; document.getElementById('profile-email').textContent = u.email; document.getElementById('profile-role').textContent = u.role;
    
    const statusBadge = document.getElementById('profile-status');
    if(u.active !== false) { statusBadge.textContent = 'ACTIVO'; statusBadge.style.background = 'var(--success)'; statusBadge.style.color = 'white'; } else { statusBadge.textContent = 'INHABILITADO'; statusBadge.style.background = 'var(--danger)'; statusBadge.style.color = 'white'; }
    
    document.getElementById('edit-user-id').value = u.id; document.getElementById('edit-user-name').value = u.name; document.getElementById('edit-user-email').value = u.email; document.getElementById('edit-user-cedula').value = u.cedula; document.getElementById('edit-user-role').value = u.role; document.getElementById('edit-user-unit').value = `${u.dir}|${u.unit}`; document.getElementById('edit-user-status').checked = u.active === false; 
    
    if(window.syncAllSelects) window.syncAllSelects();
    document.getElementById('user-modal').classList.remove('hidden');
}