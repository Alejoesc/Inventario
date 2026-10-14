import { db, state, addHistory, addNotification, logAudit } from './db.js';

export function initInventario() {
    renderTable();
    
    const searchInv = document.getElementById('search-inventory');
    if(searchInv) {
        searchInv.onkeyup = (e) => {
            const val = e.target.value.toLowerCase();
            const trs = document.querySelectorAll('#inventory-table tbody tr');
            trs.forEach(tr => { tr.style.display = tr.textContent.toLowerCase().includes(val) ? '' : 'none'; });
        };
    }

    document.getElementById('btn-add-item').onclick = () => { document.getElementById('add-item-form').classList.toggle('hidden'); };

    document.getElementById('inventory-form').onsubmit = (e) => {
        e.preventDefault();
        const assignedVal = document.getElementById('item-assigned').value;
        const emailMatch = assignedVal.match(/\(([^)]+)\)/); const assignedEmail = emailMatch ? emailMatch[1] : ''; const assignedName = assignedVal.split('(')[0].trim();

        const newItem = { id: 'INV-' + Math.floor(Math.random() * 9000 + 1000), name: document.getElementById('item-name').value, cat: document.getElementById('item-category').value, unit: state.currentUser.unit, status: 'Activo', assignedTo: assignedName, assignedEmail: assignedEmail, obs: 'Nuevo ingreso', pendingAction: null, pendingEmail: null, originalUnit: '' };
        db.inventory.push(newItem); window.showToast(`Bien ingresado exitosamente.`); 
        addHistory("Ingreso", `Se registró ${newItem.name}`); logAudit("Ingreso Inventario", `Registró el bien ${newItem.id} - ${newItem.name}`);
        e.target.reset(); document.getElementById('add-item-form').classList.add('hidden'); renderTable(); document.dispatchEvent(new Event('inventoryUpdated'));
    };

    document.getElementById('edit-inventory-form').onsubmit = (e) => {
        e.preventDefault(); const index = parseInt(document.getElementById('edit-item-index').value);
        db.inventory[index].name = document.getElementById('edit-item-name').value; db.inventory[index].cat = document.getElementById('edit-item-category').value;
        document.getElementById('edit-modal').classList.add('hidden'); window.showToast("Bien modificado."); logAudit("Edición Inventario", `Editó el bien ${db.inventory[index].id}`); renderTable(); document.dispatchEvent(new Event('inventoryUpdated')); 
    };

    document.getElementById('transfer-form').onsubmit = (e) => {
        e.preventDefault(); const index = document.getElementById('transfer-item-index').value; const targetVal = document.getElementById('transfer-assigned').value;
        const emailMatch = targetVal.match(/\(([^)]+)\)/); const targetEmail = emailMatch ? emailMatch[1] : ''; const targetName = targetVal.split('(')[0].trim();
        const unitVal = document.getElementById('transfer-unit-select').value; 

        db.inventory[index].status = 'Pendiente Recepción (Traspaso)'; db.inventory[index].pendingAction = 'Traspaso'; 
        db.inventory[index].pendingEmail = targetEmail; db.inventory[index].pendingName = targetName; 
        db.inventory[index].pendingUnit = unitVal ? unitVal.split('|')[1] : null;
        db.inventory[index].obs = document.getElementById('transfer-obs').value;
        
        document.getElementById('transfer-modal').classList.add('hidden'); window.showToast("Traspaso enviado a confirmación."); 
        if(targetEmail) addNotification(targetEmail, `Se te ha traspasado el bien ${db.inventory[index].name}. Por favor confirma su recepción.`); 
        logAudit("Traspaso", `Inició traspaso de ${db.inventory[index].id} a ${targetEmail || unitVal}`); renderTable(); document.dispatchEvent(new Event('inventoryUpdated'));
    };

    document.getElementById('loan-form').onsubmit = (e) => {
        e.preventDefault(); const index = document.getElementById('loan-item-index').value; const targetVal = document.getElementById('loan-target').value;
        const emailMatch = targetVal.match(/\(([^)]+)\)/); const targetEmail = emailMatch ? emailMatch[1] : ''; const targetName = targetVal.split('(')[0].trim();

        db.inventory[index].status = 'Pendiente Recepción (Préstamo)'; db.inventory[index].pendingAction = 'Prestamo'; db.inventory[index].pendingEmail = targetEmail; db.inventory[index].pendingName = targetName; db.inventory[index].returnDate = document.getElementById('loan-date').value; db.inventory[index].obs = document.getElementById('loan-obs').value;
        document.getElementById('loan-modal').classList.add('hidden'); window.showToast("Préstamo enviado a confirmación."); addNotification(targetEmail, `Se te ha prestado el bien ${db.inventory[index].name}. Por favor confirma su recepción.`); logAudit("Préstamo", `Inició préstamo de ${db.inventory[index].id} a ${targetEmail}`); renderTable(); document.dispatchEvent(new Event('inventoryUpdated'));
    };

    document.getElementById('confirm-receipt-form').onsubmit = (e) => {
        e.preventDefault(); 
        const index = document.getElementById('confirm-item-index').value; 
        const myObs = document.getElementById('confirm-my-obs').value; 
        const item = db.inventory[index];
        
        if(myObs) item.obs += ` | Receptor indica: ${myObs}`;
        item.assignedTo = item.pendingName; 
        item.assignedEmail = item.pendingEmail; 
        
        const receiverUser = db.users.find(u => u.email === item.pendingEmail);
        const newUnit = receiverUser ? receiverUser.unit : (item.pendingUnit || state.currentUser.unit);

        if (item.pendingAction === 'Traspaso') {
            item.status = 'Activo'; 
            item.unit = newUnit; 
            item.returnDate = '';
        } else if (item.pendingAction === 'Prestamo') {
            item.status = `Prestado (Vence: ${item.returnDate || 'Sin fecha'})`; 
            item.originalUnit = item.unit; 
            item.unit = newUnit; 
        }

        item.pendingAction = null; 
        item.pendingEmail = null; 
        item.pendingName = null; 
        item.pendingUnit = null;

        let chatInput = document.getElementById('confirm-chat-msg-id');
        if (chatInput && chatInput.value) {
            const chatMsg = db.chatMessages.find(m => m.id === parseInt(chatInput.value));
            if (chatMsg) chatMsg.status = 'Completado';
        }

        document.getElementById('confirm-receipt-modal').classList.add('hidden'); 
        window.showToast("Recepción Confirmada exitosamente."); 
        addHistory("Recepción", `${state.currentUser.name} recibió el bien ${item.name}`); 
        logAudit("Recepción", `Confirmó recepción del bien ${item.id}`); 
        
        renderTable(); 
        document.dispatchEvent(new Event('inventoryUpdated'));
    };

    document.getElementById('btn-export-my-items').onclick = () => {
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.text(`Mis Bienes Asignados - CENDIT`, 14, 15); doc.setFontSize(10); doc.text(`Usuario: ${state.currentUser.name}`, 14, 22);
        const myItems = db.inventory.filter(i => i.assignedEmail === state.currentUser.email || i.pendingEmail === state.currentUser.email);
        const tableData = myItems.map(i => [i.id, i.name, i.cat, i.status]);
        doc.autoTable({ startY: 30, head: [['ID', 'Nombre', 'Categoría', 'Estado']], body: tableData, theme: 'grid', styles: { fontSize: 8 }});
        doc.save(`MisBienes_${state.currentUser.name.replace(' ', '')}.pdf`); window.showToast("PDF Exportado.");
    };
}

export function updateTransferSelect() {
    const select = document.getElementById('transfer-unit-select'); select.innerHTML = '<option value="" disabled selected>Seleccione...</option>';
    for (const [dir, units] of Object.entries(db.organigrama)) { units.forEach(u => select.innerHTML += `<option value="${dir}|${u}">${dir} - ${u}</option>`); }
    if(window.syncAllSelects) window.syncAllSelects();
}

export function renderTable() {
    const tbody = document.querySelector('#inventory-table tbody'); if(!tbody) return; tbody.innerHTML = '';
    let itemsToShow = db.inventory;
    if (state.currentUser.role === 'SUPERVISOR' || state.currentUser.role === 'ENCARGADO') { const misUnidades = db.organigrama[state.currentUser.dir] || []; itemsToShow = db.inventory.filter(i => misUnidades.includes(i.unit) || i.assignedEmail === state.currentUser.email || i.pendingEmail === state.currentUser.email); }
    else if (state.currentUser.role === 'VIEWER') { itemsToShow = db.inventory.filter(i => i.unit === state.currentUser.unit || i.assignedEmail === state.currentUser.email || i.pendingEmail === state.currentUser.email); }

    itemsToShow.forEach((item) => {
        const realIndex = db.inventory.findIndex(i => i.id === item.id);
        const tr = document.createElement('tr');
        let actionsHtml = `<div style="display:flex; gap:5px; flex-wrap:wrap;">`;
        
        if(item.pendingAction && item.pendingEmail === state.currentUser.email) { actionsHtml += `<button class="action-btn btn-success btn-receive" data-index="${realIndex}" style="padding: 6px 10px;" title="Confirmar Recepción"><i class="fas fa-check-double"></i> Recibir Bien</button>`; }
        else {
            if(item.status.includes('Prestado') && item.assignedEmail === state.currentUser.email) { actionsHtml += `<button class="action-btn btn-warning btn-return" data-index="${realIndex}" style="padding: 6px 10px;" title="Devolver Bien"><i class="fas fa-undo"></i> Devolver</button>`; }
            if(['ADMIN', 'SUPERVISOR', 'ENCARGADO'].includes(state.currentUser.role)) {
                if(item.status === 'Activo') { actionsHtml += `<button class="action-btn btn-info btn-prestamo" data-index="${realIndex}" style="padding: 6px 10px;" title="Prestar"><i class="fas fa-handshake"></i></button><button class="action-btn btn-warning btn-traspaso" data-index="${realIndex}" style="padding: 6px 10px;" title="Traspasar"><i class="fas fa-exchange-alt"></i></button>`; }
                actionsHtml += `<button class="action-btn btn-edit" data-index="${realIndex}" style="padding: 6px 10px;" title="Editar"><i class="fas fa-edit"></i></button>`;
            }
            if(['ADMIN', 'ENCARGADO'].includes(state.currentUser.role)) { actionsHtml += `<button class="action-btn btn-danger btn-delete" data-index="${realIndex}" style="padding: 6px 10px;" title="Eliminar"><i class="fas fa-trash"></i></button>`; }
        }
        actionsHtml += `</div>`;

        const assignedDisplay = item.pendingAction ? `<i class="fas fa-spinner fa-spin" style="color:var(--warning)"></i> En tránsito a: ${item.pendingName || item.pendingUnit}` : (item.assignedTo ? item.assignedTo : `<span style="color:var(--info); font-weight: 500;"><i class="fas fa-sitemap"></i> Stock de Unidad (${item.unit})</span>`);

        tr.innerHTML = `<td><strong>${item.id}</strong></td><td>${item.name}</td><td>${assignedDisplay}</td><td><span style="background:var(--accent); color:white; padding:4px 10px; border-radius:20px; font-size:0.8rem;">${item.unit}</span></td><td><span style="color: ${item.status.includes('Pendiente') ? 'var(--warning)' : 'var(--success)'}; font-weight:bold;">${item.status}</span></td><td>${actionsHtml}</td>`;
        tr.onclick = (e) => { if(!e.target.closest('button')) openDetailsModal(item); }; tbody.appendChild(tr);
    });
    attachTableEvents();
}

export function renderMisBienesTable() {
    const tbody = document.querySelector('#my-items-table tbody'); if(!tbody) return; tbody.innerHTML = '';
    const myItems = db.inventory.filter(i => i.assignedEmail === state.currentUser.email || i.pendingEmail === state.currentUser.email);
    if(myItems.length === 0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-secondary);">No tienes bienes asignados o en tránsito.</td></tr>`; return; }

    myItems.forEach(item => {
        const realIndex = db.inventory.findIndex(i => i.id === item.id); const tr = document.createElement('tr');
        let actionsHtml = `<div style="display:flex; gap:5px; flex-wrap:wrap;">`;
        if(item.pendingAction && item.pendingEmail === state.currentUser.email) { actionsHtml += `<button class="action-btn btn-success btn-receive" data-index="${realIndex}" style="padding: 6px 10px;"><i class="fas fa-check-double"></i> Recibir</button>`; }
        else {
            if(item.status.includes('Prestado') && item.assignedEmail === state.currentUser.email) { actionsHtml += `<button class="action-btn btn-warning btn-return" data-index="${realIndex}" style="padding: 6px 10px;"><i class="fas fa-undo"></i> Devolver Bien</button>`; }
            else { actionsHtml += `<small style="color:var(--text-secondary);">Asignado Fijo</small>`; }
        }
        actionsHtml += `</div>`;
        tr.innerHTML = `<td><strong>${item.id}</strong></td><td>${item.name}</td><td><span style="background:var(--accent); color:white; padding:4px 10px; border-radius:20px; font-size:0.8rem;">${item.cat}</span></td><td><span style="color: ${item.status.includes('Pendiente') ? 'var(--warning)' : 'var(--success)'}; font-weight:bold;">${item.status}</span></td><td>${actionsHtml}</td>`;
        tr.onclick = (e) => { if(!e.target.closest('button')) openDetailsModal(item); }; tbody.appendChild(tr);
    });
    attachTableEvents(); 
}

function openDetailsModal(item) {
    document.getElementById('detail-id').textContent = item.id; document.getElementById('detail-name').textContent = item.name; document.getElementById('detail-cat').textContent = item.cat; document.getElementById('detail-unit').textContent = item.unit; document.getElementById('detail-assigned').textContent = item.assignedTo || 'Stock de Unidad'; document.getElementById('detail-status').textContent = item.status; document.getElementById('detail-obs').textContent = item.obs || 'Sin observaciones'; 
    
    const imgDiv = document.getElementById('detail-images'); imgDiv.innerHTML = '';
    if(item.photo) imgDiv.innerHTML += `<img src="${item.photo}" style="width: 100%; border-radius: 8px; border: 1px solid var(--glass-border); margin-bottom: 10px;" alt="Foto">`;
    if(item.invoice) {
        if(item.invoice.startsWith('data:application/pdf')) { imgDiv.innerHTML += `<a href="${item.invoice}" download="Factura_${item.id}.pdf" class="action-btn w-100 justify-center"><i class="fas fa-file-pdf"></i> Descargar Factura PDF</a>`; } 
        else { imgDiv.innerHTML += `<img src="${item.invoice}" style="width: 100%; border-radius: 8px; border: 1px solid var(--glass-border);" alt="Factura">`; }
    }
    document.getElementById('item-details-modal').classList.remove('hidden');
}

function attachTableEvents() {
    document.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); if(confirm(`¿Seguro que deseas eliminar permanentemente este bien?`)) { const itm = db.inventory[e.currentTarget.dataset.index]; logAudit("Eliminación Inventario", `Eliminó el bien ${itm.id}`); db.inventory.splice(e.currentTarget.dataset.index, 1); window.showToast("Bien eliminado del sistema.", "error"); renderTable(); document.dispatchEvent(new Event('inventoryUpdated')); } });
    document.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); const item = db.inventory[e.currentTarget.dataset.index]; document.getElementById('edit-item-index').value = e.currentTarget.dataset.index; document.getElementById('edit-item-name').value = item.name; document.getElementById('edit-item-category').value = item.cat; if(window.syncAllSelects) window.syncAllSelects(); document.getElementById('edit-modal').classList.remove('hidden'); });
    document.querySelectorAll('.btn-prestamo').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); document.getElementById('loan-item-index').value = e.currentTarget.dataset.index; document.getElementById('loan-modal').classList.remove('hidden'); });
    document.querySelectorAll('.btn-traspaso').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); document.getElementById('transfer-item-index').value = e.currentTarget.dataset.index; updateTransferSelect(); document.getElementById('transfer-modal').classList.remove('hidden'); });
    document.querySelectorAll('.btn-receive').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); const item = db.inventory[e.currentTarget.dataset.index]; document.getElementById('confirm-item-index').value = e.currentTarget.dataset.index; document.getElementById('confirm-obs-text').textContent = item.obs; document.getElementById('confirm-my-obs').value = ''; document.getElementById('confirm-receipt-modal').classList.remove('hidden'); });
    
    document.querySelectorAll('.btn-return').forEach(btn => btn.onclick = (e) => { 
        e.stopPropagation(); const item = db.inventory[e.currentTarget.dataset.index]; 
        if(confirm('¿Deseas devolver este bien a la unidad dueña original?')) { 
            item.status = 'Activo'; item.assignedTo = ''; item.assignedEmail = ''; 
            if(item.originalUnit) { item.unit = item.originalUnit; delete item.originalUnit; }
            item.returnDate = ''; item.obs += ` | Devuelto por ${state.currentUser.name}`; window.showToast("Bien devuelto exitosamente."); addHistory("Devolución", `${state.currentUser.name} devolvió el bien ${item.name}`); logAudit("Devolución", `Devolvió el bien ${item.id}`); renderTable(); document.dispatchEvent(new Event('inventoryUpdated')); 
        } 
    });
}