import { db, state, addHistory, logAudit } from './db.js';

export function initOrganigrama() {
    renderOrganigrama();
    
    document.getElementById('add-dir-btn').onclick = () => {
        if(state.currentUser.role !== 'ADMIN') return window.showToast('Solo el administrador puede.', 'error');
        const val = document.getElementById('new-dir-name').value.trim().toUpperCase();
        if(val && !db.organigrama[val]) { db.organigrama[val] = []; document.getElementById('new-dir-name').value = ''; window.showToast(`Dirección creada.`); addHistory("Creación", `Dirección: ${val}`); logAudit("Estructura", `Creó dirección ${val}`); renderOrganigrama(); document.dispatchEvent(new Event('orgUpdated')); }
    };

    document.getElementById('add-unit-btn').onclick = () => {
        if(state.currentUser.role !== 'ADMIN') return window.showToast('Solo el administrador puede.', 'error');
        const unit = document.getElementById('new-unit-name').value.trim().toUpperCase(); const dir = document.getElementById('assign-dir-select').value;
        if(unit && dir && !db.organigrama[dir].includes(unit)) { db.organigrama[dir].push(unit); document.getElementById('new-unit-name').value = ''; window.showToast(`Unidad asignada.`); addHistory("Asignación", `Unidad ${unit} a ${dir}`); logAudit("Estructura", `Asignó unidad ${unit} a ${dir}`); renderOrganigrama(); document.dispatchEvent(new Event('orgUpdated')); }
    };

    document.getElementById('edit-org-form').onsubmit = (e) => {
        e.preventDefault();
        const type = document.getElementById('edit-org-type').value; const oldName = document.getElementById('edit-org-oldname').value; const newName = document.getElementById('edit-org-newname').value.trim().toUpperCase();
        if (type === 'dir') { if(!db.organigrama[newName]) { db.organigrama[newName] = db.organigrama[oldName]; delete db.organigrama[oldName]; window.showToast("Dirección renombrada."); logAudit("Estructura", `Renombró dirección ${oldName} a ${newName}`); }
        } else {
            const parent = document.getElementById('edit-org-parent').value; const index = db.organigrama[parent].indexOf(oldName);
            if(index !== -1 && !db.organigrama[parent].includes(newName)) { db.organigrama[parent][index] = newName; window.showToast("Unidad renombrada."); logAudit("Estructura", `Renombró unidad ${oldName} a ${newName}`); }
        }
        document.getElementById('edit-org-modal').classList.add('hidden'); renderOrganigrama(); document.dispatchEvent(new Event('orgUpdated'));
    };
}

function renderOrganigrama() {
    const container = document.getElementById('org-drag-container'); const selectDir = document.getElementById('assign-dir-select'); container.innerHTML = ''; selectDir.innerHTML = '<option value="" disabled selected>Seleccione...</option>';
    for (const [dir, units] of Object.entries(db.organigrama)) {
        selectDir.innerHTML += `<option value="${dir}">${dir}</option>`;
        const zone = document.createElement('div'); zone.className = 'dir-zone glass-card'; zone.dataset.dir = dir;
        
        let dirActions = '';
        if(state.currentUser.role === 'ADMIN') { dirActions = `<i class="fas fa-edit edit-dir" data-dir="${dir}" style="cursor:pointer; margin-left:15px; font-size:1rem; color:var(--text-secondary);" title="Editar"></i> <i class="fas fa-trash delete-dir" data-dir="${dir}" style="cursor:pointer; margin-left:8px; font-size:1rem; color:var(--danger);" title="Eliminar"></i>`; }

        zone.innerHTML = `<h3 style="margin-bottom: 10px; color: var(--accent); border-bottom: 1px solid var(--glass-border); padding-bottom: 5px; display:flex; align-items:center;"><i class="fas fa-building" style="margin-right:8px;"></i> ${dir} ${dirActions}</h3><div class="units-container"></div>`;
        const uCont = zone.querySelector('.units-container');
        if(units.length === 0) uCont.innerHTML = '<small style="color: var(--text-secondary);">Sin unidades</small>';
        
        units.forEach(unit => {
            const chip = document.createElement('div'); chip.className = 'unit-chip'; chip.dataset.unit = unit; chip.dataset.originDir = dir; 
            let unitActions = '';
            if(state.currentUser.role === 'ADMIN') { 
                chip.draggable = true; chip.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', JSON.stringify({unit: e.target.dataset.unit, originDir: e.target.dataset.originDir}))); 
                unitActions = `<i class="fas fa-edit edit-unit" data-unit="${unit}" data-dir="${dir}" style="cursor:pointer; margin-left:8px; opacity:0.8;"></i> <i class="fas fa-times delete-unit" data-unit="${unit}" data-dir="${dir}" style="cursor:pointer; margin-left:5px; opacity:0.8; color:#ffcccc;"></i>`;
            }
            chip.innerHTML = `<i class="fas fa-users"></i> ${unit} ${unitActions}`;
            uCont.appendChild(chip);
        });

        if(state.currentUser.role === 'ADMIN') {
            zone.addEventListener('dragover', e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); });
            zone.addEventListener('dragleave', e => e.currentTarget.classList.remove('dragover'));
            zone.addEventListener('drop', e => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); try { const data = JSON.parse(e.dataTransfer.getData('text/plain')); const tDir = e.currentTarget.dataset.dir; if(data.originDir !== tDir && !db.organigrama[tDir].includes(data.unit)) { db.organigrama[data.originDir] = db.organigrama[data.originDir].filter(u => u !== data.unit); db.organigrama[tDir].push(data.unit); window.showToast("Unidad movida."); addHistory("Reubicación", `Unidad ${data.unit} a ${tDir}`); logAudit("Estructura", `Movió ${data.unit} a ${tDir}`); renderOrganigrama(); document.dispatchEvent(new Event('orgUpdated')); } } catch(err) {} });
        }
        container.appendChild(zone);
    }
    
    if(state.currentUser.role === 'ADMIN') {
        document.querySelectorAll('.delete-dir').forEach(btn => btn.onclick = (e) => { 
            const dir = e.currentTarget.dataset.dir; 
            if(db.organigrama[dir].length > 0) return window.showToast('No puedes eliminar una dirección que tiene unidades.', 'error'); 
            window.showConfirm(`¿Seguro que deseas eliminar la dirección "${dir}"?`, () => {
                delete db.organigrama[dir]; window.showToast("Dirección eliminada."); renderOrganigrama(); document.dispatchEvent(new Event('orgUpdated'));
            }, 'Eliminar Dirección');
        });
        document.querySelectorAll('.delete-unit').forEach(btn => btn.onclick = (e) => { 
            const dir = e.currentTarget.dataset.dir; const unit = e.currentTarget.dataset.unit; 
            window.showConfirm(`¿Seguro que deseas eliminar la unidad "${unit}"?`, () => {
                db.organigrama[dir] = db.organigrama[dir].filter(u => u !== unit); window.showToast("Unidad eliminada."); renderOrganigrama(); document.dispatchEvent(new Event('orgUpdated'));
            }, 'Eliminar Unidad');
        });
        document.querySelectorAll('.edit-dir').forEach(btn => btn.onclick = (e) => { document.getElementById('edit-org-type').value = 'dir'; document.getElementById('edit-org-oldname').value = e.currentTarget.dataset.dir; document.getElementById('edit-org-newname').value = e.currentTarget.dataset.dir; document.getElementById('edit-org-modal').classList.remove('hidden'); });
        document.querySelectorAll('.edit-unit').forEach(btn => btn.onclick = (e) => { document.getElementById('edit-org-type').value = 'unit'; document.getElementById('edit-org-parent').value = e.currentTarget.dataset.dir; document.getElementById('edit-org-oldname').value = e.currentTarget.dataset.unit; document.getElementById('edit-org-newname').value = e.currentTarget.dataset.unit; document.getElementById('edit-org-modal').classList.remove('hidden'); });
    }
    if(window.syncAllSelects) window.syncAllSelects();
}