import { db, state, addHistory, addNotification, logAudit } from './db.js';
import { renderNotificaciones } from './notificaciones.js';

// Función que suma o crea el consumible donado en el inventario de la unidad/usuario destino
export function receiveDonatedConsumable(sourceItem, donateQty, targetUnit, receiverName, receiverEmail, justification) {
    let finalEmail = receiverEmail || '';
    let finalName = receiverName || '';

    // Si escribieron el nombre manualmente sin usar clic en la lista, buscamos su correo en la base de datos
    if (!finalEmail && finalName) {
        const foundUser = db.users.find(u => u.name.toLowerCase() === finalName.toLowerCase());
        if (foundUser) {
            finalEmail = foundUser.email;
            finalName = foundUser.name;
        }
    }

    // Verificar si la unidad/usuario destino ya tiene registrado ese mismo consumible para sumarle el stock
    const existingItem = db.inventory.find(i => 
        i.cat === 'Consumibles' && 
        i.name.trim().toLowerCase() === sourceItem.name.trim().toLowerCase() && 
        i.unit === targetUnit && 
        (i.assignedEmail || '') === finalEmail
    );

    if (existingItem) {
        existingItem.qty = (existingItem.qty ?? 0) + donateQty;
        existingItem.status = 'Activo';
        existingItem.obs = `Recibido por donación de ${sourceItem.unit} (+${donateQty} unid.) | Motivo: ${justification}`;
        return existingItem;
    } else {
        const newDonatedItem = {
            id: 'INV-' + Math.floor(Math.random() * 9000 + 1000),
            name: sourceItem.name,
            cat: 'Consumibles',
            qty: donateQty,
            unit: targetUnit,
            status: 'Activo',
            assignedTo: finalName,
            assignedEmail: finalEmail,
            obs: `Donado por ${sourceItem.unit} | Motivo: ${justification}`,
            pendingAction: null,
            pendingEmail: null,
            originalUnit: sourceItem.unit
        };
        db.inventory.push(newDonatedItem);
        return newDonatedItem;
    }
}

export function initInventario() {
    renderTable();
    updateDonationSelects();
    renderDonationsTable();
    
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
        const emailMatch = assignedVal.match(/\(([^)]+)\)/); 
        let assignedEmail = emailMatch ? emailMatch[1] : ''; 
        let assignedName = assignedVal.split('(')[0].trim();

        if (!assignedEmail && assignedName) {
            const foundUser = db.users.find(u => u.name.toLowerCase() === assignedName.toLowerCase());
            if (foundUser) { assignedEmail = foundUser.email; assignedName = foundUser.name; }
        }

        const cat = document.getElementById('item-category').value;
        const qty = parseInt(document.getElementById('item-qty').value) || 1;

        const newItem = { 
            id: 'INV-' + Math.floor(Math.random() * 9000 + 1000), 
            name: document.getElementById('item-name').value, 
            cat: cat, 
            qty: qty,
            unit: state.currentUser.unit, 
            status: 'Activo', 
            assignedTo: assignedName, 
            assignedEmail: assignedEmail, 
            obs: 'Nuevo ingreso', 
            pendingAction: null, 
            pendingEmail: null, 
            originalUnit: '' 
        };
        db.inventory.push(newItem); 
        
        if (cat === 'Consumibles' && qty <= 5) {
            window.showToast(`¡Atención! Consumible "${newItem.name}" registrado con stock bajo (${qty} disp.).`, 'warning');
            notifyUnitManagers(newItem.unit, `ALERTA DE STOCK BAJO: El consumible "${newItem.name}" tiene solo ${qty} unidades.`);
        } else {
            window.showToast(`Bien ingresado exitosamente.`);
        }

        addHistory("Ingreso", `Se registró ${newItem.name} (Cant: ${qty})`); 
        logAudit("Ingreso Inventario", `Registró el bien ${newItem.id} - ${newItem.name} (Cant: ${qty})`);
        e.target.reset(); 
        document.getElementById('item-qty').value = 1;
        document.getElementById('add-item-form').classList.add('hidden'); 
        renderTable(); 
        document.dispatchEvent(new Event('inventoryUpdated'));
    };

    document.getElementById('edit-inventory-form').onsubmit = (e) => {
        e.preventDefault(); 
        const index = parseInt(document.getElementById('edit-item-index').value);
        const item = db.inventory[index];
        item.name = document.getElementById('edit-item-name').value; 
        item.cat = document.getElementById('edit-item-category').value;
        item.qty = parseInt(document.getElementById('edit-item-qty').value) || 0;
        if (item.qty > 0 && item.status.includes('Agotado')) item.status = 'Activo';
        if (item.qty === 0 && item.cat === 'Consumibles') item.status = 'Agotado (0 en Stock)';

        document.getElementById('edit-modal').classList.add('hidden'); 
        if (item.cat === 'Consumibles' && item.qty <= 5) {
            window.showToast(`¡Alerta de Stock! Quedan solo ${item.qty} unidades de "${item.name}".`, 'warning');
            notifyUnitManagers(item.unit, `ALERTA DE STOCK BAJO: El consumible "${item.name}" (${item.id}) quedó con ${item.qty} unidades.`);
        } else {
            window.showToast("Bien modificado correctamente.");
        }
        logAudit("Edición Inventario", `Editó el bien ${item.id} (Stock: ${item.qty})`); 
        renderTable(); 
        document.dispatchEvent(new Event('inventoryUpdated')); 
    };

    // SOLICITUD DE ELIMINACIÓN CON JUSTIFICACIÓN OBLIGATORIA Y PERMISO DE SUPERVISOR/ENCARGADO
    document.getElementById('delete-item-form').onsubmit = (e) => {
        e.preventDefault();
        const index = parseInt(document.getElementById('delete-item-index').value);
        const justification = document.getElementById('delete-item-justification').value.trim();
        if (!justification) return window.showToast("La justificación de eliminación es obligatoria.", "error");

        const item = db.inventory[index];
        item.status = 'Pendiente Eliminación';
        item.deleteJustification = justification;
        item.deleteRequestedBy = state.currentUser.name;
        item.deleteRequestedEmail = state.currentUser.email;
        item.deleteRequestedDate = new Date().toLocaleString();

        notifyUnitManagers(item.unit, `SOLICITUD DE BAJA: ${state.currentUser.name} solicita permiso para eliminar "${item.name}" (${item.id}). Justificación: ${justification}`);
        addHistory("Solicitud de Eliminación", `${state.currentUser.name} solicitó eliminar ${item.name} (${item.id}). Motivo: ${justification}`);
        logAudit("Solicitud Baja", `Solicitó eliminar ${item.id}. Justificación: ${justification}`);

        document.getElementById('delete-item-modal').classList.add('hidden');
        e.target.reset();
        window.showToast("Solicitud de eliminación enviada al Supervisor / Encargado para su autorización.", "warning");
        renderTable();
        renderNotificaciones();
        document.dispatchEvent(new Event('inventoryUpdated'));
    };

    // FORMULARIO DE DONACIONES INTERNAS DE CONSUMIBLES (DESCUENTA EN ORIGEN Y AGREGA EN DESTINO)
    document.getElementById('donation-form').onsubmit = (e) => {
        e.preventDefault();
        const itemId = document.getElementById('donation-item-select').value;
        const donateQty = parseInt(document.getElementById('donation-qty').value) || 0;
        const targetUnitVal = document.getElementById('donation-unit-select').value;
        const receiverVal = document.getElementById('donation-receiver').value.trim();
        const justification = document.getElementById('donation-justification').value.trim();

        if (!itemId || !targetUnitVal || !justification) {
            return window.showToast("Complete todos los campos y la justificación de la donación.", "error");
        }

        const item = db.inventory.find(i => i.id === itemId);
        if (!item) return window.showToast("Seleccione un consumible válido.", "error");

        const currentStock = item.qty ?? 1;
        if (donateQty <= 0 || donateQty > currentStock) {
            return window.showToast(`Cantidad inválida. Stock actual disponible: ${currentStock} unidades.`, "error");
        }

        const targetUnit = targetUnitVal.includes('|') ? targetUnitVal.split('|')[1] : targetUnitVal;
        
        // 1. Descontar del inventario origen
        item.qty = currentStock - donateQty;
        if (item.qty === 0) item.status = 'Agotado (0 en Stock)';

        const emailMatch = receiverVal.match(/\(([^)]+)\)/);
        let receiverEmail = emailMatch ? emailMatch[1] : '';
        let receiverName = receiverVal.split('(')[0].trim();

        if (!receiverEmail && receiverName) {
            const foundUser = db.users.find(u => u.name.toLowerCase() === receiverName.toLowerCase());
            if (foundUser) {
                receiverEmail = foundUser.email;
                receiverName = foundUser.name;
            }
        }

        // 2. Agregar o sumar al inventario de la unidad/usuario destino para que aparezca en Inventario Global y Mis Bienes
        const targetItem = receiveDonatedConsumable(item, donateQty, targetUnit, receiverName, receiverEmail, justification);

        const donationRecord = {
            id: 'DON-' + Math.floor(Math.random() * 9000 + 1000),
            date: new Date().toLocaleString(),
            itemId: item.id,
            targetItemId: targetItem.id,
            itemName: item.name,
            qty: donateQty,
            fromUnit: item.unit,
            toUnit: targetUnit,
            receiver: receiverName || `Stock ${targetUnit}`,
            donor: state.currentUser.name,
            justification: justification
        };

        db.donations.unshift(donationRecord);
        addHistory("Donación Consumible", `Se donaron ${donateQty} unid. de ${item.name} (${item.unit} -> ${targetUnit}, Receptor: ${receiverName}). Justificación: ${justification}`);
        logAudit("Donación Interna", `Donó ${donateQty} de ${item.id} a ${targetUnit} (Nuevo/Dest ID: ${targetItem.id}). Stock origen: ${item.qty}`);

        if (receiverEmail) {
            addNotification(receiverEmail, `Has recibido una donación de ${donateQty} unid. de "${item.name}" en tu unidad (${targetUnit}) enviada por ${item.unit}. Ya figura en tu inventario.`);
        }

        if (item.qty <= 5) {
            window.showToast(`¡Donación transferida a ${targetUnit}! ALERTA: Quedan solo ${item.qty} unid. en ${item.unit}.`, "warning");
            notifyUnitManagers(item.unit, `ALERTA DE STOCK BAJO: Tras donación a ${targetUnit}, quedan solo ${item.qty} unidades de "${item.name}".`);
        } else {
            window.showToast(`Donación procesada: descontada de ${item.unit} y agregada al inventario de ${targetUnit}.`);
        }

        e.target.reset();
        document.getElementById('donation-qty').value = 1;
        renderTable();
        updateDonationSelects();
        renderDonationsTable();
        renderNotificaciones();
        document.dispatchEvent(new Event('inventoryUpdated'));
    };

    const btnExportDonations = document.getElementById('btn-export-donations');
    if (btnExportDonations) {
        btnExportDonations.onclick = () => {
            const { jsPDF } = window.jspdf; const doc = new jsPDF();
            doc.text(`Reporte de Donaciones Internas de Consumibles - CENDIT`, 14, 15);
            doc.setFontSize(10); doc.text(`Generado por: ${state.currentUser.name}`, 14, 22);
            const tableData = db.donations.map(d => [d.date, `${d.itemName} (${d.itemId})`, d.qty, `${d.fromUnit} -> ${d.toUnit}`, d.receiver, d.justification]);
            doc.autoTable({ startY: 28, head: [['Fecha', 'Consumible', 'Cant.', 'Origen -> Destino', 'Receptor', 'Justificación']], body: tableData, theme: 'grid', styles: { fontSize: 8 }});
            doc.save(`Donaciones_Consumibles_CENDIT.pdf`);
            window.showToast("PDF de Donaciones exportado.");
        };
    }

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
        const tableData = myItems.map(i => [i.id, `${i.name} (Cant: ${i.qty ?? 1})`, i.cat, i.status]);
        doc.autoTable({ startY: 30, head: [['ID', 'Nombre / Cantidad', 'Categoría', 'Estado']], body: tableData, theme: 'grid', styles: { fontSize: 8 }});
        doc.save(`MisBienes_${state.currentUser.name.replace(' ', '')}.pdf`); window.showToast("PDF Exportado.");
    };
}

export function notifyUnitManagers(unitName, message) {
    const cleanUnit = String(unitName || '').trim().toUpperCase();
    const managers = db.users.filter(u => 
        u.role === 'ADMIN' || 
        (String(u.unit).trim().toUpperCase() === cleanUnit && ['SUPERVISOR', 'ENCARGADO'].includes(u.role))
    );
    managers.forEach(m => addNotification(m.email, message));
}

export function updateTransferSelect() {
    const select = document.getElementById('transfer-unit-select'); select.innerHTML = '<option value="" disabled selected>Seleccione...</option>';
    for (const [dir, units] of Object.entries(db.organigrama)) { units.forEach(u => select.innerHTML += `<option value="${dir}|${u}">${dir} - ${u}</option>`); }
    if(window.syncAllSelects) window.syncAllSelects();
}

export function updateDonationSelects() {
    const itemSelect = document.getElementById('donation-item-select');
    const unitSelect = document.getElementById('donation-unit-select');
    if(!itemSelect || !unitSelect) return;

    itemSelect.innerHTML = '<option value="" disabled selected>Seleccione consumible...</option>';
    const misUnidades = state.currentUser ? (db.organigrama[state.currentUser.dir] || [state.currentUser.unit]) : [];
    const consumables = db.inventory.filter(i => 
        i.cat === 'Consumibles' && 
        (i.qty ?? 1) > 0 && 
        (state.currentUser?.role === 'ADMIN' || i.unit === state.currentUser?.unit || misUnidades.includes(i.unit))
    );
    consumables.forEach(c => {
        itemSelect.innerHTML += `<option value="${c.id}">${c.name} (${c.unit}) - Disp: ${c.qty} unid.</option>`;
    });

    unitSelect.innerHTML = '<option value="" disabled selected>Seleccione unidad destino...</option>';
    for (const [dir, units] of Object.entries(db.organigrama)) {
        units.forEach(u => unitSelect.innerHTML += `<option value="${dir}|${u}">${dir} - ${u}</option>`);
    }
    if(window.syncAllSelects) window.syncAllSelects();
}

export function renderDonationsTable() {
    const tbody = document.querySelector('#donations-table tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    if(db.donations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">No se han registrado donaciones internas aún.</td></tr>`;
        return;
    }
    db.donations.forEach(d => {
        tbody.innerHTML += `
            <tr>
                <td>${d.date}</td>
                <td><strong>${d.itemName}</strong> <small style="color:var(--text-secondary);">(${d.itemId})</small></td>
                <td><span class="ok-stock-badge">${d.qty} unid.</span></td>
                <td><strong>${d.fromUnit}</strong> <i class="fas fa-arrow-right" style="color:var(--accent);"></i> <strong>${d.toUnit}</strong></td>
                <td>${d.receiver}</td>
                <td>${d.justification}</td>
            </tr>`;
    });
}

export function renderTable() {
    const tbody = document.querySelector('#inventory-table tbody'); if(!tbody) return; tbody.innerHTML = '';
    let itemsToShow = db.inventory;
    if (state.currentUser.role === 'SUPERVISOR' || state.currentUser.role === 'ENCARGADO') { 
        const misUnidades = db.organigrama[state.currentUser.dir] || []; 
        itemsToShow = db.inventory.filter(i => misUnidades.includes(i.unit) || i.unit === state.currentUser.unit || i.assignedEmail === state.currentUser.email || i.pendingEmail === state.currentUser.email); 
    } else if (state.currentUser.role === 'VIEWER') { 
        itemsToShow = db.inventory.filter(i => i.unit === state.currentUser.unit || i.assignedEmail === state.currentUser.email || i.pendingEmail === state.currentUser.email); 
    }

    itemsToShow.forEach((item) => {
        const realIndex = db.inventory.findIndex(i => i.id === item.id);
        const tr = document.createElement('tr');
        const qty = item.qty ?? 1;
        const isConsumible = item.cat === 'Consumibles';
        const isLowStock = isConsumible && qty <= 5;

        if (isLowStock) tr.classList.add('low-stock-row');

        let actionsHtml = `<div style="display:flex; gap:5px; flex-wrap:wrap;">`;
        
        const canAuthorizeDelete = state.currentUser.role === 'ADMIN' || 
            (['SUPERVISOR', 'ENCARGADO'].includes(state.currentUser.role) && state.currentUser.unit === item.unit);

        if (item.status === 'Pendiente Eliminación') {
            if (canAuthorizeDelete) {
                actionsHtml += `
                    <button class="action-btn btn-success btn-approve-delete" data-index="${realIndex}" title="Aprobar Eliminación Definitiva"><i class="fas fa-check"></i> Aprobar Baja</button>
                    <button class="action-btn btn-danger btn-reject-delete" data-index="${realIndex}" title="Rechazar Eliminación"><i class="fas fa-times"></i></button>`;
            } else {
                actionsHtml += `<small style="color:var(--warning); font-weight:bold;"><i class="fas fa-hourglass-half"></i> Esperando aval del Supervisor</small>`;
            }
        } else if(item.pendingAction && item.pendingEmail === state.currentUser.email) { 
            actionsHtml += `<button class="action-btn btn-success btn-receive" data-index="${realIndex}" style="padding: 6px 10px;" title="Confirmar Recepción"><i class="fas fa-check-double"></i> Recibir Bien</button>`; 
        } else {
            if(item.status.includes('Prestado') && item.assignedEmail === state.currentUser.email) { 
                actionsHtml += `<button class="action-btn btn-warning btn-return" data-index="${realIndex}" style="padding: 6px 10px;" title="Devolver Bien"><i class="fas fa-undo"></i> Devolver</button>`; 
            }
            if(['ADMIN', 'SUPERVISOR', 'ENCARGADO'].includes(state.currentUser.role)) {
                if(isConsumible && qty > 0) {
                    actionsHtml += `<button class="action-btn btn-success btn-donate-quick" data-id="${item.id}" title="Donar Consumible a otra Unidad"><i class="fas fa-hand-holding-heart"></i></button>`;
                }
                if(item.status === 'Activo' && !isConsumible) { 
                    actionsHtml += `<button class="action-btn btn-info btn-prestamo" data-index="${realIndex}" title="Prestar"><i class="fas fa-handshake"></i></button><button class="action-btn btn-warning btn-traspaso" data-index="${realIndex}" title="Traspasar"><i class="fas fa-exchange-alt"></i></button>`; 
                }
                actionsHtml += `<button class="action-btn btn-edit" data-index="${realIndex}" title="Editar / Ajustar Stock"><i class="fas fa-edit"></i></button>`;
                actionsHtml += `<button class="action-btn btn-danger btn-delete" data-index="${realIndex}" title="Solicitar Eliminación"><i class="fas fa-trash"></i></button>`;
            }
        }
        actionsHtml += `</div>`;

        const assignedPersonHtml = item.assignedTo 
            ? `<div style="margin-top:4px; font-size:0.8rem;"><i class="fas fa-user" style="color:var(--accent);"></i> ${item.assignedTo}</div>` 
            : `<div style="margin-top:4px; font-size:0.8rem; color:var(--info);"><i class="fas fa-sitemap"></i> Stock de Unidad (${item.unit})</div>`;

        let stockOrAssigned = '';
        if (isConsumible) {
            const badgeHtml = isLowStock 
                ? `<span class="low-stock-badge"><i class="fas fa-exclamation-triangle"></i> ¡Stock Bajo: ${qty} unid.!</span>`
                : `<span class="ok-stock-badge"><i class="fas fa-boxes"></i> Stock: ${qty} unid.</span>`;
            stockOrAssigned = `${badgeHtml}${assignedPersonHtml}`;
        } else {
            stockOrAssigned = item.pendingAction 
                ? `<i class="fas fa-spinner fa-spin" style="color:var(--warning)"></i> En tránsito a: ${item.pendingName || item.pendingUnit}` 
                : (item.assignedTo ? item.assignedTo : `<span style="color:var(--info); font-weight: 500;"><i class="fas fa-sitemap"></i> Stock de Unidad (${item.unit})</span>`);
        }

        let statusColor = 'var(--success)';
        if (item.status.includes('Pendiente') || item.status.includes('Agotado')) statusColor = 'var(--danger)';

        tr.innerHTML = `
            <td><strong>${item.id}</strong></td>
            <td><strong>${item.name}</strong><br><small style="color:var(--text-secondary);">${item.cat}</small></td>
            <td>${stockOrAssigned}</td>
            <td><span style="background:var(--accent); color:white; padding:4px 10px; border-radius:20px; font-size:0.8rem; display:inline-block;">${item.unit}</span></td>
            <td>
                <span style="color: ${statusColor}; font-weight:bold;">${item.status}</span>
                ${item.deleteJustification ? `<br><small style="color:var(--warning);">Motivo: ${item.deleteJustification}</small>` : ''}
            </td>
            <td>${actionsHtml}</td>`;
        tr.onclick = (e) => { if(!e.target.closest('button')) openDetailsModal(item); }; 
        tbody.appendChild(tr);
    });
    attachTableEvents();
}

export function renderMisBienesTable() {
    const tbody = document.querySelector('#my-items-table tbody'); if(!tbody) return; tbody.innerHTML = '';
    const myItems = db.inventory.filter(i => 
        i.assignedEmail === state.currentUser.email || 
        i.pendingEmail === state.currentUser.email ||
        (i.assignedTo && i.assignedTo.toLowerCase() === state.currentUser.name.toLowerCase())
    );
    if(myItems.length === 0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-secondary);">No tienes bienes asignados o en tránsito.</td></tr>`; return; }

    myItems.forEach(item => {
        const realIndex = db.inventory.findIndex(i => i.id === item.id); const tr = document.createElement('tr');
        let actionsHtml = `<div style="display:flex; gap:5px; flex-wrap:wrap;">`;
        if(item.pendingAction && item.pendingEmail === state.currentUser.email) { actionsHtml += `<button class="action-btn btn-success btn-receive" data-index="${realIndex}" style="padding: 6px 10px;"><i class="fas fa-check-double"></i> Recibir</button>`; }
        else {
            if(item.status.includes('Prestado') && item.assignedEmail === state.currentUser.email) { actionsHtml += `<button class="action-btn btn-warning btn-return" data-index="${realIndex}" style="padding: 6px 10px;"><i class="fas fa-undo"></i> Devolver Bien</button>`; }
            else { actionsHtml += `<small style="color:var(--text-secondary);">${item.cat === 'Consumibles' ? `Disponible (${item.qty ?? 1} unid.)` : 'Asignado Fijo'}</small>`; }
        }
        actionsHtml += `</div>`;
        tr.innerHTML = `<td><strong>${item.id}</strong></td><td><strong>${item.name}</strong> ${item.cat === 'Consumibles' ? `<small style="color:var(--info);">(Cant: ${item.qty ?? 1})</small>` : ''}</td><td><span style="background:var(--accent); color:white; padding:4px 10px; border-radius:20px; font-size:0.8rem; display:inline-block;">${item.cat}</span></td><td><span style="color: ${item.status.includes('Pendiente') ? 'var(--warning)' : 'var(--success)'}; font-weight:bold;">${item.status}</span></td><td>${actionsHtml}</td>`;
        tr.onclick = (e) => { if(!e.target.closest('button')) openDetailsModal(item); }; tbody.appendChild(tr);
    });
    attachTableEvents(); 
}

function openDetailsModal(item) {
    document.getElementById('detail-id').textContent = item.id; 
    document.getElementById('detail-name').textContent = item.name; 
    document.getElementById('detail-cat').textContent = item.cat; 
    document.getElementById('detail-qty').textContent = `${item.qty ?? 1} unidad(es)`;
    document.getElementById('detail-unit').textContent = item.unit; 
    document.getElementById('detail-assigned').textContent = item.assignedTo || 'Stock de Unidad'; 
    document.getElementById('detail-status').textContent = item.status; 
    document.getElementById('detail-obs').textContent = item.obs || 'Sin observaciones'; 
    
    const imgDiv = document.getElementById('detail-images'); imgDiv.innerHTML = '';
    if(item.photo) imgDiv.innerHTML += `<img src="${item.photo}" style="width: 100%; border-radius: 8px; border: 1px solid var(--glass-border); margin-bottom: 10px;" alt="Foto">`;
    if(item.invoice) {
        if(item.invoice.startsWith('data:application/pdf')) { imgDiv.innerHTML += `<a href="${item.invoice}" download="Factura_${item.id}.pdf" class="action-btn w-100 justify-center"><i class="fas fa-file-pdf"></i> Descargar Factura PDF</a>`; } 
        else { imgDiv.innerHTML += `<img src="${item.invoice}" style="width: 100%; border-radius: 8px; border: 1px solid var(--glass-border);" alt="Factura">`; }
    }
    document.getElementById('item-details-modal').classList.remove('hidden');
}

function attachTableEvents() {
    document.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = (e) => { 
        e.stopPropagation(); 
        const idx = e.currentTarget.dataset.index;
        const itm = db.inventory[idx];
        document.getElementById('delete-item-index').value = idx;
        document.getElementById('delete-item-info').innerHTML = `Bien seleccionado: <strong>${itm.name} (${itm.id})</strong> - Unidad: <strong>${itm.unit}</strong>`;
        document.getElementById('delete-item-justification').value = '';
        document.getElementById('delete-item-modal').classList.remove('hidden');
    });

    document.querySelectorAll('.btn-approve-delete').forEach(btn => btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(e.currentTarget.dataset.index);
        const itm = db.inventory[idx];
        window.showConfirm(`¿Autorizar la baja definitiva del bien "${itm.name}" (${itm.id})? Quedará registrado en el Histórico de Eliminaciones.`, () => {
            db.deletedItems.unshift({
                date: new Date().toLocaleString(),
                id: itm.id,
                name: itm.name,
                unit: itm.unit,
                requestedBy: itm.deleteRequestedBy || 'Usuario',
                approvedBy: `${state.currentUser.name} (${state.currentUser.role})`,
                justification: itm.deleteJustification || 'Sin justificación'
            });
            addHistory("Baja Aprobada", `Se eliminó ${itm.name} (${itm.id}). Autorizado por ${state.currentUser.name}. Justificación: ${itm.deleteJustification}`);
            logAudit("Eliminación Inventario", `Aprobó baja definitiva de ${itm.id}. Motivo: ${itm.deleteJustification}`);
            if (itm.deleteRequestedEmail) {
                addNotification(itm.deleteRequestedEmail, `Tu solicitud de baja para el bien "${itm.name}" (${itm.id}) fue APROBADA por ${state.currentUser.name}.`);
            }
            db.inventory.splice(idx, 1);
            window.showToast("Baja aprobada y registrada en el Histórico de Eliminaciones.", "success");
            renderTable();
            document.dispatchEvent(new Event('inventoryUpdated'));
        }, 'Autorizar Baja de Inventario');
    });

    document.querySelectorAll('.btn-reject-delete').forEach(btn => btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(e.currentTarget.dataset.index);
        const itm = db.inventory[idx];
        itm.status = 'Activo';
        if (itm.deleteRequestedEmail) {
            addNotification(itm.deleteRequestedEmail, `Tu solicitud de eliminación para "${itm.name}" (${itm.id}) fue RECHAZADA por ${state.currentUser.name}.`);
        }
        delete itm.deleteJustification;
        delete itm.deleteRequestedBy;
        delete itm.deleteRequestedEmail;
        window.showToast("Solicitud de baja rechazada. El bien continúa activo.");
        renderTable();
        document.dispatchEvent(new Event('inventoryUpdated'));
    });

    document.querySelectorAll('.btn-donate-quick').forEach(btn => btn.onclick = (e) => {
        e.stopPropagation();
        const itemId = e.currentTarget.dataset.id;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        const navBtn = document.querySelector('.nav-btn[data-target="donations-module"]');
        if (navBtn) navBtn.classList.add('active');
        document.getElementById('donations-module').classList.add('active');
        updateDonationSelects();
        const itemSelect = document.getElementById('donation-item-select');
        itemSelect.value = itemId;
        if(window.syncAllSelects) window.syncAllSelects();
    });

    document.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = (e) => { 
        e.stopPropagation(); 
        const item = db.inventory[e.currentTarget.dataset.index]; 
        document.getElementById('edit-item-index').value = e.currentTarget.dataset.index; 
        document.getElementById('edit-item-name').value = item.name; 
        document.getElementById('edit-item-category').value = item.cat; 
        document.getElementById('edit-item-qty').value = item.qty ?? 1;
        if(window.syncAllSelects) window.syncAllSelects(); 
        document.getElementById('edit-modal').classList.remove('hidden'); 
    });

    document.querySelectorAll('.btn-prestamo').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); document.getElementById('loan-item-index').value = e.currentTarget.dataset.index; document.getElementById('loan-modal').classList.remove('hidden'); });
    document.querySelectorAll('.btn-traspaso').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); document.getElementById('transfer-item-index').value = e.currentTarget.dataset.index; updateTransferSelect(); document.getElementById('transfer-modal').classList.remove('hidden'); });
    document.querySelectorAll('.btn-receive').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); const item = db.inventory[e.currentTarget.dataset.index]; document.getElementById('confirm-item-index').value = e.currentTarget.dataset.index; document.getElementById('confirm-obs-text').textContent = item.obs; document.getElementById('confirm-my-obs').value = ''; document.getElementById('confirm-receipt-modal').classList.remove('hidden'); });
    
    document.querySelectorAll('.btn-return').forEach(btn => btn.onclick = (e) => { 
        e.stopPropagation(); 
        const idx = e.currentTarget.dataset.index;
        const item = db.inventory[idx]; 
        window.showConfirm(`¿Deseas devolver el bien "${item.name}" a su unidad dueña original?`, () => {
            item.status = 'Activo'; item.assignedTo = ''; item.assignedEmail = ''; 
            if(item.originalUnit) { item.unit = item.originalUnit; delete item.originalUnit; }
            item.returnDate = ''; item.obs += ` | Devuelto por ${state.currentUser.name}`; 
            window.showToast("Bien devuelto exitosamente."); 
            addHistory("Devolución", `${state.currentUser.name} devolvió el bien ${item.name}`); 
            logAudit("Devolución", `Devolvió el bien ${item.id}`); 
            renderTable(); 
            document.dispatchEvent(new Event('inventoryUpdated')); 
        }, 'Confirmar Devolución');
    });
}