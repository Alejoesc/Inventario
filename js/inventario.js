import { db, state, addHistory, addNotification, logAudit } from './db.js';
import { renderNotificaciones } from './notificaciones.js';

// Función que suma o crea el consumible donado (por unidades/carretes o por metros) en el inventario de la unidad/usuario destino
export function receiveDonatedConsumable(sourceItem, donateQty, targetUnit, receiverName, receiverEmail, justification, mode = 'unidades') {
    let finalEmail = receiverEmail || '';
    let finalName = receiverName || '';

    if (!finalEmail && finalName) {
        const foundUser = db.users.find(u => u.name.toLowerCase() === finalName.toLowerCase());
        if (foundUser) {
            finalEmail = foundUser.email;
            finalName = foundUser.name;
        }
    }

    const existingItem = db.inventory.find(i => 
        i.cat === 'Consumibles' && 
        i.name.trim().toLowerCase() === sourceItem.name.trim().toLowerCase() && 
        i.unit === targetUnit && 
        (i.assignedEmail || '') === finalEmail
    );

    const hasMeters = (sourceItem.meters || 0) > 0;
    const donatedMeters = mode === 'metros' ? donateQty : (hasMeters ? donateQty * sourceItem.meters : 0);
    const donatedUnits = mode === 'metros' ? 1 : donateQty;

    if (existingItem) {
        if (mode === 'metros' && hasMeters) {
            existingItem.totalMeters = (existingItem.totalMeters ?? ((existingItem.qty ?? 1) * (existingItem.meters || sourceItem.meters))) + donatedMeters;
            existingItem.meters = existingItem.meters || sourceItem.meters;
            existingItem.qty = Math.max(1, Math.ceil(existingItem.totalMeters / existingItem.meters));
        } else {
            existingItem.qty = (existingItem.qty ?? 0) + donatedUnits;
            if (hasMeters) {
                existingItem.meters = existingItem.meters || sourceItem.meters;
                existingItem.totalMeters = (existingItem.totalMeters ?? 0) + donatedMeters;
            }
        }
        existingItem.status = 'Activo';
        existingItem.obs = `Recibido por donación de ${sourceItem.unit} (+${mode === 'metros' ? donatedMeters + 'm' : donatedUnits + ' unid.'}) | Motivo: ${justification}`;
        return existingItem;
    } else {
        const newDonatedItem = {
            id: 'INV-' + Math.floor(Math.random() * 9000 + 1000),
            name: sourceItem.name,
            cat: 'Consumibles',
            qty: donatedUnits,
            meters: hasMeters ? (mode === 'metros' ? donatedMeters : sourceItem.meters) : 0,
            totalMeters: hasMeters ? donatedMeters : 0,
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

    // Mostrar/Ocultar campo de Metros cuando se selecciona "Consumibles" en el formulario de ingreso
    const itemCatSelect = document.getElementById('item-category');
    const itemMetersGroup = document.getElementById('item-meters-group');
    const itemQtyInput = document.getElementById('item-qty');
    const itemMetersInput = document.getElementById('item-meters');
    const itemMetersPreview = document.getElementById('item-meters-preview');
    const itemQtyLabel = document.getElementById('item-qty-label');

    const updateMetersCalculationPreview = () => {
        if (!itemQtyInput || !itemMetersInput || !itemMetersPreview) return;
        const q = parseInt(itemQtyInput.value) || 0;
        const m = parseFloat(itemMetersInput.value) || 0;
        if (m > 0) {
            itemMetersPreview.innerHTML = `<i class="fas fa-check-circle" style="color:var(--success);"></i> Total calculado: <strong>${q} carrete(s) / unid. de ${m}m = ${q * m} metros en total</strong>`;
        } else {
            itemMetersPreview.innerHTML = `Si es cable o fibra, indique cuántos metros trae cada carrete/unidad.`;
        }
    };

    if (itemCatSelect && itemMetersGroup) {
        itemCatSelect.addEventListener('change', () => {
            if (itemCatSelect.value === 'Consumibles') {
                itemMetersGroup.classList.remove('hidden');
                if (itemQtyLabel) itemQtyLabel.textContent = 'Cantidad (Unidades / Carretes)';
                updateMetersCalculationPreview();
            } else {
                itemMetersGroup.classList.add('hidden');
                if (itemMetersInput) itemMetersInput.value = '';
                if (itemQtyLabel) itemQtyLabel.textContent = 'Cantidad / Stock Inicial';
            }
        });
    }
    if (itemQtyInput) itemQtyInput.addEventListener('input', updateMetersCalculationPreview);
    if (itemMetersInput) itemMetersInput.addEventListener('input', updateMetersCalculationPreview);

    // Mostrar/Ocultar campo de Metros en el modal de Edición
    const editCatSelect = document.getElementById('edit-item-category');
    const editMetersGroup = document.getElementById('edit-item-meters-group');
    if (editCatSelect && editMetersGroup) {
        editCatSelect.addEventListener('change', () => {
            if (editCatSelect.value === 'Consumibles') {
                editMetersGroup.classList.remove('hidden');
            } else {
                editMetersGroup.classList.add('hidden');
                document.getElementById('edit-item-meters').value = '';
            }
        });
    }

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
        const meters = (cat === 'Consumibles') ? (parseFloat(document.getElementById('item-meters').value) || 0) : 0;
        const totalMeters = meters > 0 ? (qty * meters) : 0;

        const newItem = { 
            id: 'INV-' + Math.floor(Math.random() * 9000 + 1000), 
            name: document.getElementById('item-name').value, 
            cat: cat, 
            qty: qty,
            meters: meters,
            totalMeters: totalMeters,
            unit: state.currentUser.unit, 
            status: 'Activo', 
            assignedTo: assignedName, 
            assignedEmail: assignedEmail, 
            obs: meters > 0 ? `Ingreso: ${qty} carrete(s) de ${meters}m (${totalMeters}m total)` : 'Nuevo ingreso', 
            pendingAction: null, 
            pendingEmail: null, 
            originalUnit: '' 
        };
        db.inventory.push(newItem); 
        
        if (cat === 'Consumibles' && qty <= 5) {
            const stockDesc = meters > 0 ? `${qty} carrete(s) / ${totalMeters}m` : `${qty} disp.`;
            window.showToast(`¡Atención! Consumible "${newItem.name}" registrado con stock bajo (${stockDesc}).`, 'warning');
            notifyUnitManagers(newItem.unit, `ALERTA DE STOCK BAJO: El consumible "${newItem.name}" tiene solo ${stockDesc}.`);
        } else {
            window.showToast(`Bien ingresado exitosamente.`);
        }

        const logDesc = meters > 0 ? `${qty} carrete(s) de ${meters}m (${totalMeters}m)` : `Cant: ${qty}`;
        addHistory("Ingreso", `Se registró ${newItem.name} (${logDesc})`); 
        logAudit("Ingreso Inventario", `Registró el bien ${newItem.id} - ${newItem.name} (${logDesc})`);
        e.target.reset(); 
        document.getElementById('item-qty').value = 1;
        itemMetersGroup.classList.add('hidden');
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
        
        if (item.cat === 'Consumibles') {
            const m = parseFloat(document.getElementById('edit-item-meters').value) || 0;
            item.meters = m;
            item.totalMeters = m > 0 ? (item.qty * m) : 0;
        } else {
            item.meters = 0;
            item.totalMeters = 0;
        }

        if (item.qty > 0 && item.status.includes('Agotado')) item.status = 'Activo';
        if (item.qty === 0 && item.cat === 'Consumibles') item.status = 'Agotado (0 en Stock)';

        document.getElementById('edit-modal').classList.add('hidden'); 
        if (item.cat === 'Consumibles' && item.qty <= 5) {
            window.showToast(`¡Alerta de Stock! Quedan solo ${item.qty} unidades/carretes de "${item.name}".`, 'warning');
            notifyUnitManagers(item.unit, `ALERTA DE STOCK BAJO: El consumible "${item.name}" (${item.id}) quedó con ${item.qty} unidades/carretes.`);
        } else {
            window.showToast("Bien modificado correctamente.");
        }
        logAudit("Edición Inventario", `Editó el bien ${item.id} (Stock: ${item.qty}${item.meters > 0 ? ', Metros: ' + item.totalMeters + 'm' : ''})`); 
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

    // Selector dinámico en Donaciones cuando el consumible tiene metros
    const donItemSelect = document.getElementById('donation-item-select');
    const donMeasureGroup = document.getElementById('donation-measure-group');
    const donMeasureMode = document.getElementById('donation-measure-mode');
    const donQtyLabel = document.getElementById('donation-qty-label');

    const updateDonationMeasureVisibility = () => {
        if (!donItemSelect || !donMeasureGroup) return;
        const selectedItem = db.inventory.find(i => i.id === donItemSelect.value);
        if (selectedItem && (selectedItem.meters || 0) > 0) {
            donMeasureGroup.classList.remove('hidden');
            if (donMeasureMode.value === 'metros') {
                donQtyLabel.textContent = `Metros a Entregar (Disp: ${selectedItem.totalMeters ?? (selectedItem.qty * selectedItem.meters)}m)`;
            } else {
                donQtyLabel.textContent = `Carretes a Entregar (${selectedItem.meters}m c/u - Disp: ${selectedItem.qty})`;
            }
        } else {
            donMeasureGroup.classList.add('hidden');
            if (donMeasureMode) donMeasureMode.value = 'unidades';
            if (donQtyLabel) donQtyLabel.textContent = 'Cantidad a Entregar';
        }
    };

    if (donItemSelect) donItemSelect.addEventListener('change', updateDonationMeasureVisibility);
    if (donMeasureMode) donMeasureMode.addEventListener('change', updateDonationMeasureVisibility);

    // FORMULARIO DE DONACIONES INTERNAS DE CONSUMIBLES
    document.getElementById('donation-form').onsubmit = (e) => {
        e.preventDefault();
        const itemId = document.getElementById('donation-item-select').value;
        const donateQty = parseFloat(document.getElementById('donation-qty').value) || 0;
        const targetUnitVal = document.getElementById('donation-unit-select').value;
        const receiverVal = document.getElementById('donation-receiver').value.trim();
        const justification = document.getElementById('donation-justification').value.trim();

        if (!itemId || !targetUnitVal || !justification) {
            return window.showToast("Complete todos los campos y la justificación de la donación.", "error");
        }

        const item = db.inventory.find(i => i.id === itemId);
        if (!item) return window.showToast("Seleccione un consumible válido.", "error");

        const hasMeters = (item.meters || 0) > 0;
        const mode = (hasMeters && donMeasureMode) ? donMeasureMode.value : 'unidades';
        const currentStock = item.qty ?? 1;
        const currentTotalMeters = item.totalMeters ?? (currentStock * (item.meters || 0));

        if (mode === 'metros') {
            if (donateQty <= 0 || donateQty > currentTotalMeters) {
                return window.showToast(`Metraje inválido. Disponible actualmente: ${currentTotalMeters} metros.`, "error");
            }
            item.totalMeters = currentTotalMeters - donateQty;
            item.qty = item.totalMeters > 0 ? Math.ceil(item.totalMeters / item.meters) : 0;
        } else {
            if (donateQty <= 0 || donateQty > currentStock) {
                return window.showToast(`Cantidad inválida. Stock actual disponible: ${currentStock} unidades/carretes.`, "error");
            }
            item.qty = currentStock - donateQty;
            if (hasMeters) {
                item.totalMeters = Math.max(0, currentTotalMeters - (donateQty * item.meters));
            }
        }

        if (item.qty === 0) item.status = 'Agotado (0 en Stock)';

        const targetUnit = targetUnitVal.includes('|') ? targetUnitVal.split('|')[1] : targetUnitVal;

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

        const targetItem = receiveDonatedConsumable(item, donateQty, targetUnit, receiverName, receiverEmail, justification, mode);
        const qtyLabelDisplay = mode === 'metros' 
            ? `${donateQty}m` 
            : (hasMeters ? `${donateQty} carrete(s) (${donateQty * item.meters}m)` : `${donateQty} unid.`);

        const donationRecord = {
            id: 'DON-' + Math.floor(Math.random() * 9000 + 1000),
            date: new Date().toLocaleString(),
            itemId: item.id,
            targetItemId: targetItem.id,
            itemName: item.name,
            qty: qtyLabelDisplay,
            fromUnit: item.unit,
            toUnit: targetUnit,
            receiver: receiverName || `Stock ${targetUnit}`,
            donor: state.currentUser.name,
            justification: justification
        };

        db.donations.unshift(donationRecord);
        addHistory("Donación Consumible", `Se donaron ${qtyLabelDisplay} de ${item.name} (${item.unit} -> ${targetUnit}, Receptor: ${receiverName}). Justificación: ${justification}`);
        logAudit("Donación Interna", `Donó ${qtyLabelDisplay} de ${item.id} a ${targetUnit} (ID Destino: ${targetItem.id}). Stock origen: ${item.qty}`);

        if (receiverEmail) {
            addNotification(receiverEmail, `Has recibido una donación de ${qtyLabelDisplay} de "${item.name}" en tu unidad (${targetUnit}) enviada por ${item.unit}. Ya figura en tu inventario.`);
        }

        if (item.qty <= 5) {
            window.showToast(`¡Donación transferida a ${targetUnit}! ALERTA: Quedan solo ${item.qty} unid./carretes en ${item.unit}.`, "warning");
            notifyUnitManagers(item.unit, `ALERTA DE STOCK BAJO: Tras donación a ${targetUnit}, quedan solo ${item.qty} unidades/carretes de "${item.name}".`);
        } else {
            window.showToast(`Donación procesada: descontada de ${item.unit} y agregada al inventario de ${targetUnit}.`);
        }

        e.target.reset();
        document.getElementById('donation-qty').value = 1;
        if (donMeasureGroup) donMeasureGroup.classList.add('hidden');
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
            doc.autoTable({ startY: 28, head: [['Fecha', 'Consumible', 'Cant. / Metros', 'Origen -> Destino', 'Receptor', 'Justificación']], body: tableData, theme: 'grid', styles: { fontSize: 8 }});
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
        const tableData = myItems.map(i => {
            const qtyInfo = (i.meters || 0) > 0 ? `${i.qty ?? 1} carrete(s) (${i.totalMeters ?? (i.qty * i.meters)}m)` : `Cant: ${i.qty ?? 1}`;
            return [i.id, `${i.name} (${qtyInfo})`, i.cat, i.status];
        });
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
        const stockText = (c.meters || 0) > 0 
            ? `Disp: ${c.qty} carrete(s) de ${c.meters}m (Total: ${c.totalMeters ?? (c.qty * c.meters)}m)` 
            : `Disp: ${c.qty} unid.`;
        itemSelect.innerHTML += `<option value="${c.id}">${c.name} (${c.unit}) - ${stockText}</option>`;
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
        const displayQty = String(d.qty).includes('m') || String(d.qty).includes('unid') || String(d.qty).includes('carrete') ? d.qty : `${d.qty} unid.`;
        tbody.innerHTML += `
            <tr>
                <td>${d.date}</td>
                <td><strong>${d.itemName}</strong> <small style="color:var(--text-secondary);">(${d.itemId})</small></td>
                <td><span class="ok-stock-badge">${displayQty}</span></td>
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
        const hasMeters = (item.meters || 0) > 0;
        const totalM = item.totalMeters ?? (qty * (item.meters || 0));
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
            const stockDetailText = hasMeters 
                ? `${qty} carrete(s) de ${item.meters}m (Total: ${totalM}m)` 
                : `${qty} unid.`;
            const badgeHtml = isLowStock 
                ? `<span class="low-stock-badge"><i class="fas fa-exclamation-triangle"></i> ¡Stock Bajo: ${stockDetailText}!</span>`
                : `<span class="ok-stock-badge"><i class="fas fa-boxes"></i> Stock: ${stockDetailText}</span>`;
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
        const hasMeters = (item.meters || 0) > 0;
        const totalM = item.totalMeters ?? ((item.qty ?? 1) * (item.meters || 0));
        const consDesc = hasMeters ? `${item.qty ?? 1} carrete(s) / ${totalM}m` : `Cant: ${item.qty ?? 1}`;

        let actionsHtml = `<div style="display:flex; gap:5px; flex-wrap:wrap;">`;
        if(item.pendingAction && item.pendingEmail === state.currentUser.email) { actionsHtml += `<button class="action-btn btn-success btn-receive" data-index="${realIndex}" style="padding: 6px 10px;"><i class="fas fa-check-double"></i> Recibir</button>`; }
        else {
            if(item.status.includes('Prestado') && item.assignedEmail === state.currentUser.email) { actionsHtml += `<button class="action-btn btn-warning btn-return" data-index="${realIndex}" style="padding: 6px 10px;"><i class="fas fa-undo"></i> Devolver Bien</button>`; }
            else { actionsHtml += `<small style="color:var(--text-secondary);">${item.cat === 'Consumibles' ? `Disponible (${consDesc})` : 'Asignado Fijo'}</small>`; }
        }
        actionsHtml += `</div>`;
        tr.innerHTML = `<td><strong>${item.id}</strong></td><td><strong>${item.name}</strong> ${item.cat === 'Consumibles' ? `<small style="color:var(--info);">(${consDesc})</small>` : ''}</td><td><span style="background:var(--accent); color:white; padding:4px 10px; border-radius:20px; font-size:0.8rem; display:inline-block;">${item.cat}</span></td><td><span style="color: ${item.status.includes('Pendiente') ? 'var(--warning)' : 'var(--success)'}; font-weight:bold;">${item.status}</span></td><td>${actionsHtml}</td>`;
        tr.onclick = (e) => { if(!e.target.closest('button')) openDetailsModal(item); }; tbody.appendChild(tr);
    });
    attachTableEvents(); 
}

function openDetailsModal(item) {
    document.getElementById('detail-id').textContent = item.id; 
    document.getElementById('detail-name').textContent = item.name; 
    document.getElementById('detail-cat').textContent = item.cat; 
    const hasMeters = (item.meters || 0) > 0;
    const totalM = item.totalMeters ?? ((item.qty ?? 1) * (item.meters || 0));
    document.getElementById('detail-qty').textContent = hasMeters 
        ? `${item.qty ?? 1} carrete(s) de ${item.meters}m (Total: ${totalM} metros)` 
        : `${item.qty ?? 1} unidad(es)`;
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
        itemSelect.dispatchEvent(new Event('change'));
        if(window.syncAllSelects) window.syncAllSelects();
    });

    document.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = (e) => { 
        e.stopPropagation(); 
        const item = db.inventory[e.currentTarget.dataset.index]; 
        document.getElementById('edit-item-index').value = e.currentTarget.dataset.index; 
        document.getElementById('edit-item-name').value = item.name; 
        document.getElementById('edit-item-category').value = item.cat; 
        document.getElementById('edit-item-qty').value = item.qty ?? 1;
        
        const editMetersGroup = document.getElementById('edit-item-meters-group');
        const editMetersInput = document.getElementById('edit-item-meters');
        if (item.cat === 'Consumibles') {
            editMetersGroup.classList.remove('hidden');
            editMetersInput.value = item.meters || '';
        } else {
            editMetersGroup.classList.add('hidden');
            editMetersInput.value = '';
        }

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