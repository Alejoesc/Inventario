import { db, state, addNotification, addHistory, logAudit } from './db.js';
import { renderTable, notifyUnitManagers, receiveDonatedConsumable } from './inventario.js';
import { refreshCustomSelects } from './app.js';
import { renderNotificaciones } from './notificaciones.js';

export function initChat() {
    const dirSelect = document.getElementById('chat-dir-select'); 
    const unitSelect = document.getElementById('chat-unit-select');
    
    const updateDirs = () => { 
        dirSelect.innerHTML = '<option value="" disabled selected>Seleccione...</option>'; 
        Object.keys(db.organigrama).forEach(dir => dirSelect.innerHTML += `<option value="${dir}">${dir}</option>`); 
        if(window.syncAllSelects) window.syncAllSelects(); 
    };
    updateDirs(); document.addEventListener('orgUpdated', updateDirs);
    
    document.addEventListener('inventoryUpdated', renderChat);
    
    dirSelect.onchange = (e) => { 
        unitSelect.innerHTML = '<option value="" disabled selected>Seleccione...</option>' + (db.organigrama[e.target.value] || []).map(u => `<option value="${u}">${u}</option>`).join(''); 
        if(window.syncAllSelects) window.syncAllSelects(); 
    };

    document.getElementById('send-loan-req').onclick = () => {
        const reqItem = document.getElementById('chat-item-req').value; 
        const targetUnit = unitSelect.value;
        if(!reqItem || !targetUnit) return window.showToast('Completa todos los campos.', 'error');
        
        db.chatMessages.push({ id: Date.now(), from: state.currentUser.unit, to: targetUnit, item: reqItem, status: 'Pendiente', author: state.currentUser.name, authorEmail: state.currentUser.email });
        
        const targetUnitClean = String(targetUnit).trim().toUpperCase();
        const targetUsers = db.users.filter(u => String(u.unit).trim().toUpperCase() === targetUnitClean && ['SUPERVISOR', 'ENCARGADO', 'ADMIN'].includes(String(u.role).trim().toUpperCase()));
        
        targetUsers.forEach(u => addNotification(u.email, `Nueva solicitud externa de ${state.currentUser.name}: Necesita un(a) ${reqItem}.`));
        
        window.showToast("Solicitud enviada a la unidad destino."); 
        document.getElementById('chat-item-req').value = ''; 
        renderChat(); 
        renderNotificaciones();
    };

    document.getElementById('chat-action-form').onsubmit = (e) => {
        e.preventDefault();
        const actionId = parseInt(document.getElementById('chat-action-id').value);
        const actionType = document.getElementById('chat-action-type').value;
        const msg = db.chatMessages.find(m => m.id === actionId);
        
        const obs = document.getElementById('chat-action-obs').value;
        if (!obs.trim()) return window.showToast('La justificación / observación es obligatoria.', 'error');
        
        if (actionType === 'Aprobado') {
            const itemId = document.getElementById('chat-action-item-id').value;
            if(!itemId) return window.showToast('Debe seleccionar un bien o consumible utilizando Buscar.', 'error');
            
            const mode = document.querySelector('input[name="chat_action_mode"]:checked').value;
            const returnDate = document.getElementById('chat-action-return-date').value;
            const donateQty = parseInt(document.getElementById('chat-action-donate-qty').value) || 1;
            const invItem = db.inventory.find(i => i.id === itemId);

            if (mode === 'donacion') {
                const currentStock = invItem.qty ?? 1;
                if (donateQty <= 0 || donateQty > currentStock) {
                    return window.showToast(`Cantidad inválida. Stock disponible: ${currentStock} unid.`, 'error');
                }
                // 1. Descontar en unidad origen
                invItem.qty = currentStock - donateQty;
                if (invItem.qty === 0) invItem.status = 'Agotado (0 en Stock)';

                // 2. Sumar o crear en el inventario de la unidad/usuario receptor
                const targetItem = receiveDonatedConsumable(invItem, donateQty, msg.from, msg.author, msg.authorEmail, obs);

                db.donations.unshift({
                    id: 'DON-' + Math.floor(Math.random() * 9000 + 1000),
                    date: new Date().toLocaleString(),
                    itemId: invItem.id,
                    targetItemId: targetItem.id,
                    itemName: invItem.name,
                    qty: donateQty,
                    fromUnit: invItem.unit,
                    toUnit: msg.from,
                    receiver: msg.author,
                    donor: state.currentUser.name,
                    justification: obs
                });

                msg.status = `Donación Completada (${donateQty} unid.)`;
                addNotification(msg.authorEmail, `Tu solicitud de "${msg.item}" fue aprobada como DONACIÓN (${donateQty} unid. de ${invItem.name}) y ya fue cargada a tu inventario en ${msg.from}.`);
                addHistory("Donación Externa", `Se donaron ${donateQty} unid. de ${invItem.name} a ${msg.author} (${msg.from}). Justificación: ${obs}`);
                logAudit("Donación Chat", `Donó ${donateQty} unid. de ${invItem.id} a ${msg.from} (ID Destino: ${targetItem.id})`);

                if (invItem.qty <= 5) {
                    window.showToast(`Donación transferida a ${msg.from}. ¡ALERTA: Quedan solo ${invItem.qty} unid. de "${invItem.name}"!`, 'warning');
                    notifyUnitManagers(invItem.unit, `ALERTA DE STOCK BAJO: Quedan solo ${invItem.qty} unidades de "${invItem.name}".`);
                }
            } else {
                if (mode === 'prestamo' && !returnDate) {
                    return window.showToast('La fecha límite de devolución es obligatoria para préstamos.', 'error');
                }
                invItem.status = mode === 'prestamo' ? 'Pendiente Recepción (Préstamo)' : 'Pendiente Recepción (Traspaso)';
                invItem.pendingAction = mode === 'prestamo' ? 'Prestamo' : 'Traspaso';
                if(mode === 'prestamo') invItem.returnDate = returnDate;
                
                invItem.pendingEmail = msg.authorEmail;
                invItem.pendingName = msg.author;
                invItem.pendingUnit = msg.from; 
                invItem.obs = obs;
                
                msg.status = 'Aprobado y Enviado';
                addNotification(msg.authorEmail, `Tu solicitud de "${msg.item}" fue aprobada. Te enviaron: ${invItem.name}. Confirma en el Chat.`);
                addHistory("Aprobación Externa", `Se envió ${invItem.name} a ${msg.author} (${msg.from})`);
                logAudit("Acción Chat", `Aprobó solicitud de ${msg.author} enviando el bien ${invItem.id}`);
            }
        } else {
            msg.status = 'Rechazado';
            addNotification(msg.authorEmail, `Tu solicitud de "${msg.item}" fue rechazada. Razón: ${obs}`);
        }
        
        document.getElementById('chat-action-modal').classList.add('hidden');
        renderChat(); 
        renderTable(); 
        document.dispatchEvent(new Event('inventoryUpdated')); 
        window.showToast("Acción procesada correctamente.");
    };
}

export function renderChat() {
    const msgContainer = document.getElementById('chat-messages'); 
    if(!msgContainer) return;
    msgContainer.innerHTML = '';
    
    db.chatMessages.forEach(msg => {
        const myUnit = String(state.currentUser.unit || '').trim().toUpperCase();
        const myRole = String(state.currentUser.role || '').trim().toUpperCase();
        const msgTo = String(msg.to || '').trim().toUpperCase();
        const msgFrom = String(msg.from || '').trim().toUpperCase();
        const msgStatus = String(msg.status || '').trim().toUpperCase();

        const isSource = (msgFrom === myUnit);
        const isTarget = (msgTo === myUnit);
        const isAdmin = (myRole === 'ADMIN');
        const canManage = (myRole === 'SUPERVISOR' || myRole === 'ENCARGADO');

        if(isSource || isTarget || isAdmin) {
            let actionsHTML = '';
            
            if (msgStatus === 'PENDIENTE') {
                if (isAdmin || (isTarget && canManage)) {
                    actionsHTML = `
                    <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="action-btn btn-success" style="padding:6px 12px; font-size:0.85rem; width:auto;" onclick="window.resolveLoan(${msg.id}, 'Aprobado')">Aprobar</button>
                        <button class="action-btn btn-danger" style="padding:6px 12px; font-size:0.85rem; width:auto;" onclick="window.resolveLoan(${msg.id}, 'Rechazado')">Rechazar</button>
                    </div>`;
                } else {
                    actionsHTML = `<strong style="display:block; margin-top:8px;">Estado: <span style="color: var(--warning)">Pendiente (Esperando Aprobación)</span></strong>`;
                }
            } 
            else if (msgStatus === 'APROBADO Y ENVIADO') {
                if (isAdmin || isSource) {
                    const pendingItemIndex = db.inventory.findIndex(i => i.pendingAction && i.pendingEmail === msg.authorEmail);
                    if(pendingItemIndex !== -1) {
                        actionsHTML = `
                        <div style="margin-top: 8px;">
                            <button class="action-btn btn-success" style="padding:6px 12px; font-size:0.85rem; width:auto;" onclick="window.openConfirmReceiptFromChat(${pendingItemIndex}, ${msg.id})">
                                <i class="fas fa-check-double"></i> Confirmar Recepción
                            </button>
                        </div>`;
                    } else {
                        actionsHTML = `<strong style="display:block; margin-top:8px;">Estado: <span style="color: var(--success)"><i class="fas fa-check-circle"></i> Recibido</span></strong>`;
                    }
                } else {
                    actionsHTML = `<strong style="display:block; margin-top:8px;">Estado: <span style="color: var(--info)"><i class="fas fa-truck"></i> Enviado al Solicitante</span></strong>`;
                }
            }
            else {
                let colorClass = msgStatus.includes('COMPLETAD') || msgStatus.includes('APROBADO') || msgStatus.includes('DONACIÓN') ? 'var(--success)' : 'var(--danger)';
                actionsHTML = `<strong style="display:block; margin-top:8px;">Estado: <span style="color: ${colorClass}">${msg.status}</span></strong>`;
            }

            const isOwnClass = isSource ? 'own' : '';

            msgContainer.innerHTML += `
            <div class="msg-bubble ${isOwnClass}">
                <small style="color: var(--text-secondary);"><i class="fas fa-user"></i> ${msg.author} (${msg.from}) <i class="fas fa-arrow-right"></i> Para: <b>${msg.to}</b></small>
                <p style="margin: 5px 0;"><i class="fas fa-hand-holding-box"></i> Solicitud: <b>${msg.item}</b></p>
                ${actionsHTML}
            </div>`;
        }
    });
}

window.openConfirmReceiptFromChat = function(invIndex, chatMsgId) {
    const item = db.inventory[invIndex];
    document.getElementById('confirm-item-index').value = invIndex;
    document.getElementById('confirm-obs-text').textContent = item.obs;
    document.getElementById('confirm-my-obs').value = '';
    
    let chatInput = document.getElementById('confirm-chat-msg-id');
    if (!chatInput) {
        chatInput = document.createElement('input');
        chatInput.type = 'hidden';
        chatInput.id = 'confirm-chat-msg-id';
        document.getElementById('confirm-receipt-form').appendChild(chatInput);
    }
    chatInput.value = chatMsgId;

    document.getElementById('confirm-receipt-modal').classList.remove('hidden');
}

window.resolveLoan = function(id, action) { 
    const msg = db.chatMessages.find(m => m.id === id); if(!msg) return;

    document.getElementById('chat-action-id').value = id; 
    document.getElementById('chat-action-type').value = action; 
    document.getElementById('chat-action-title').textContent = action === 'Aprobado' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'; 
    document.getElementById('chat-action-obs').value = '';
    
    const itemContainer = document.getElementById('chat-action-item-container');
    const selectedNameInput = document.getElementById('chat-action-selected-item-name');
    const selectedIdInput = document.getElementById('chat-action-item-id');
    const dateGroup = document.getElementById('chat-action-date-group');
    const qtyGroup = document.getElementById('chat-action-qty-group');
    const suggestionsContainer = document.getElementById('chat-action-suggestions');
    
    if (action === 'Aprobado') {
        itemContainer.classList.remove('hidden'); selectedNameInput.value = ''; selectedIdInput.value = '';
        
        const updateModeVisibility = () => {
            const mode = document.querySelector('input[name="chat_action_mode"]:checked').value;
            if(mode === 'prestamo') { 
                dateGroup.classList.remove('hidden'); 
                qtyGroup.classList.add('hidden');
                document.getElementById('chat-action-return-date').required = true; 
            } else if(mode === 'donacion') {
                dateGroup.classList.add('hidden');
                qtyGroup.classList.remove('hidden');
                document.getElementById('chat-action-return-date').required = false;
            } else { 
                dateGroup.classList.add('hidden'); 
                qtyGroup.classList.add('hidden');
                document.getElementById('chat-action-return-date').required = false; 
            }
        };
        document.querySelectorAll('input[name="chat_action_mode"]').forEach(r => r.onchange = updateModeVisibility); 
        updateModeVisibility();

        const sourceUnitClean = String(msg.to).trim().toUpperCase();
        const available = db.inventory.filter(i => String(i.unit).trim().toUpperCase() === sourceUnitClean && i.status === 'Activo' && (i.qty ?? 1) > 0);
        const exactMatches = available.filter(i => (i.name||'').toLowerCase().includes(msg.item.toLowerCase()) || (i.cat||'').toLowerCase().includes(msg.item.toLowerCase()));

        if (exactMatches.length > 0) {
            let html = `<p style="color:var(--success); font-size:0.85rem; margin-bottom:8px;"><i class="fas fa-star"></i> Bienes disponibles en ${msg.to}:</p>`;
            exactMatches.forEach((i, idx) => { html += `<label class="checklist-item" style="border-left: 3px solid var(--success); padding: 5px 8px; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; background: rgba(16, 185, 129, 0.1); border-radius: 5px; cursor: pointer;"><input type="radio" name="chat_suggested_item" value="${i.id}" ${idx === 0 ? 'checked' : ''}><span style="flex:1;"><strong>${i.name}</strong> <small style="color:var(--text-secondary)">(${i.cat} - Disp: ${i.qty ?? 1})</small></span></label>`; });
            suggestionsContainer.innerHTML = html; suggestionsContainer.classList.remove('hidden');
            
            selectedIdInput.value = exactMatches[0].id; selectedNameInput.value = `${exactMatches[0].name} (${exactMatches[0].id})`;
            document.querySelectorAll('input[name="chat_suggested_item"]').forEach(radio => { radio.onchange = (e) => { const selected = exactMatches.find(item => item.id === e.target.value); selectedIdInput.value = selected.id; selectedNameInput.value = `${selected.name} (${selected.id})`; }; });
            document.getElementById('btn-open-inventory-selector').innerHTML = '<i class="fas fa-search"></i> Buscar Otro';
        } else {
            suggestionsContainer.innerHTML = `<div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid var(--warning); padding: 8px; border-radius: 6px; margin-bottom: 10px;"><p style="color:var(--warning); font-size:0.85rem; margin:0;"><i class="fas fa-exclamation-triangle"></i> No hay coincidencias exactas en ${msg.to} para <strong>"${msg.item}"</strong>. Búscalo manualmente.</p></div>`;
            suggestionsContainer.classList.remove('hidden'); document.getElementById('btn-open-inventory-selector').innerHTML = '<i class="fas fa-search"></i> Buscar Bien';
        }
        document.getElementById('btn-open-inventory-selector').onclick = () => { openInventorySelector(msg.item, msg.to); };
    } else {
        itemContainer.classList.add('hidden');
    }
    document.getElementById('chat-action-modal').classList.remove('hidden');
}

function openInventorySelector(requestedItem, sourceUnit) {
    const modal = document.getElementById('select-inventory-modal'); const tbody = document.querySelector('#select-inventory-table tbody'); const searchInput = document.getElementById('search-select-inventory');
    
    const sourceUnitClean = String(sourceUnit).trim().toUpperCase();
    const available = db.inventory.filter(i => String(i.unit).trim().toUpperCase() === sourceUnitClean && i.status === 'Activo' && (i.qty ?? 1) > 0);
    
    const renderList = (items) => {
        tbody.innerHTML = '';
        if(items.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No se encontraron bienes.</td></tr>'; return; }
        items.forEach(i => {
            const isMatch = (i.name||'').toLowerCase().includes((requestedItem||'').toLowerCase());
            const tr = document.createElement('tr');
            if (isMatch) tr.style.background = 'rgba(16, 185, 129, 0.1)'; 
            tr.innerHTML = `<td><strong>${i.id}</strong></td><td>${isMatch ? '<i class="fas fa-star" style="color:var(--success);"></i> ' : ''}${i.name}</td><td>${i.cat} (Disp: ${i.qty ?? 1})</td><td><span style="color:var(--success); font-weight:bold;">${i.status}</span></td><td><button type="button" class="action-btn btn-info" style="padding: 4px 8px; font-size: 0.8rem;"><i class="fas fa-check"></i></button></td>`;
            tr.querySelector('button').onclick = () => {
                document.getElementById('chat-action-item-id').value = i.id; document.getElementById('chat-action-selected-item-name').value = `${i.name} (${i.id})`;
                const sug = document.getElementById('chat-action-suggestions'); sug.innerHTML = `<p style="color:var(--info); font-size:0.85rem; margin-bottom:8px;"><i class="fas fa-check-circle"></i> Seleccionado: ${i.name} (Stock: ${i.qty ?? 1}).</p>`;
                modal.classList.add('hidden');
            };
            tbody.appendChild(tr);
        });
    };
    
    const matches = available.filter(i => (i.name||'').toLowerCase().includes((requestedItem||'').toLowerCase())); const others = available.filter(i => !matches.includes(i)); renderList([...matches, ...others]);
    searchInput.value = '';
    searchInput.onkeyup = function() { const val = this.value.toLowerCase(); const filtered = available.filter(i => (i.name||'').toLowerCase().includes(val) || (i.id||'').toLowerCase().includes(val) || (i.cat||'').toLowerCase().includes(val)); renderList(filtered); };
    modal.classList.remove('hidden');
}