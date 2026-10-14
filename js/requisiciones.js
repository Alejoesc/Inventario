import { db, state, addHistory, addNotification, logAudit } from './db.js';
import { renderTable as renderInventoryTable } from './inventario.js';

export function initRequisiciones() {
    renderRequisitionsTable();
    document.getElementById('req-form').onsubmit = (e) => {
        e.preventDefault(); const newItem = document.getElementById('req-item-name').value; const link = document.getElementById('req-item-link').value;
        const req = { id: Date.now(), date: new Date().toLocaleDateString(), user: state.currentUser.name, email: state.currentUser.email, dir: state.currentUser.dir, unit: state.currentUser.unit, item: newItem, link: link, justification: document.getElementById('req-item-justification').value, status: 'Pendiente' };
        db.requisitions.push(req); window.showToast("Requisición enviada a supervisión."); addHistory("Requisición Creada", `${state.currentUser.name} solicitó: ${newItem}`); logAudit("Requisición", `Solicitó compra de ${newItem}`); e.target.reset(); renderRequisitionsTable();
    };

    document.getElementById('comp-req-photo').onchange = (e) => { if(e.target.files[0]) { document.getElementById('comp-req-photo-name').textContent = e.target.files[0].name; document.getElementById('comp-req-photo-name').style.color = "var(--success)"; }};
    document.getElementById('comp-req-invoice').onchange = (e) => { if(e.target.files[0]) { document.getElementById('comp-req-invoice-name').textContent = e.target.files[0].name; document.getElementById('comp-req-invoice-name').style.color = "var(--success)"; }};

    const compressImage = (file) => {
        return new Promise((resolve) => {
            if (!file) return resolve(null);
            if (!file.type.startsWith('image/')) { const reader = new FileReader(); reader.onload = e => resolve(e.target.result); reader.readAsDataURL(file); return; }
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => { const canvas = document.createElement('canvas'); const MAX_WIDTH = 800; const scaleSize = MAX_WIDTH / img.width; canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.7)); };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    document.getElementById('complete-req-form').onsubmit = async (e) => {
        e.preventDefault(); 
        const btnSave = document.getElementById('btn-save-req-item'); btnSave.disabled = true; btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Comprimiendo...';
        const req = db.requisitions.find(r => r.id === parseInt(document.getElementById('comp-req-id').value));
        const photoFile = document.getElementById('comp-req-photo').files[0]; const invoiceFile = document.getElementById('comp-req-invoice').files[0];
        
        const photoData = await compressImage(photoFile); const invoiceData = await compressImage(invoiceFile);

        const newInvItem = { id: 'INV-' + Math.floor(Math.random() * 9000 + 1000), name: document.getElementById('comp-req-name').value, cat: 'Comprado (Requisición)', unit: req.unit, assignedTo: req.user, assignedEmail: req.email, status: 'Activo', obs: 'Recién comprado', photo: photoData, invoice: invoiceData };
        db.inventory.push(newInvItem); req.status = 'Completado';
        window.showToast("Bien registrado con éxito con foto y factura."); addHistory("Ingreso Requisición", `Se ingresó ${newInvItem.name}`); addNotification(req.email, `Tu requisición de ${req.item} fue comprada e ingresada al inventario.`); logAudit("Ingreso Requisición", `Ingresó físicamente la requisición ${req.id}`);
        
        btnSave.disabled = false; btnSave.innerHTML = '<i class="fas fa-save"></i> Guardar en Inventario';
        document.getElementById('comp-req-photo-name').textContent = 'Seleccionar Imagen'; document.getElementById('comp-req-photo-name').style.color = '';
        document.getElementById('comp-req-invoice-name').textContent = 'Seleccionar Archivo'; document.getElementById('comp-req-invoice-name').style.color = '';
        e.target.reset(); document.getElementById('complete-req-modal').classList.add('hidden'); renderRequisitionsTable(); renderInventoryTable(); document.dispatchEvent(new Event('inventoryUpdated'));
    };
}

export function renderRequisitionsTable() {
    const tbody = document.querySelector('#requisitions-table tbody'); if(!tbody) return; tbody.innerHTML = '';
    db.requisitions.forEach((req) => {
        let statusHtml = req.status === 'Pendiente' ? `<span style="color:var(--warning)"><i class="fas fa-clock"></i> Pendiente</span>` : (req.status === 'Aprobado' ? `<span style="color:var(--info)"><i class="fas fa-thumbs-up"></i> Aprobado</span>` : `<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Completado</span>`);
        let actionsHtml = '';
        if (req.status === 'Pendiente' && ['SUPERVISOR', 'ADMIN'].includes(state.currentUser.role)) { actionsHtml = `<button class="action-btn btn-success" style="padding: 6px 10px;" onclick="window.reqAction(${req.id}, 'Aprobado')" title="Aprobar"><i class="fas fa-check"></i></button><button class="action-btn btn-danger" style="padding: 6px 10px;" onclick="window.reqAction(${req.id}, 'Rechazado')" title="Rechazar"><i class="fas fa-times"></i></button>`; }
        if (req.status === 'Aprobado' && ['ENCARGADO', 'ADMIN'].includes(state.currentUser.role)) { actionsHtml = `<button class="action-btn btn-warning" style="padding: 6px 10px;" onclick="window.completeReq(${req.id}, '${req.item}')" title="Ingresar Físicamente"><i class="fas fa-box-open"></i> Registrar Ingreso</button>`; }
        tbody.innerHTML += `<tr><td>${req.date}</td><td><strong>${req.user}</strong></td><td>${req.item}</td><td><a href="${req.link}" target="_blank" style="color:var(--accent);">Ver Producto</a></td><td>${req.justification}</td><td>${statusHtml}</td><td>${actionsHtml}</td></tr>`;
    });
}

window.reqAction = function(id, action) { const req = db.requisitions.find(r => r.id === id); if(req) { req.status = action; window.showToast(`Requisición ${action}.`); addNotification(req.email, `Tu requisición de ${req.item} ha sido ${action}.`); renderRequisitionsTable(); } }
window.completeReq = function(id, itemName) { document.getElementById('comp-req-id').value = id; document.getElementById('comp-req-name').value = itemName; document.getElementById('complete-req-modal').classList.remove('hidden'); }