import { db, state } from './db.js';

export function initHistorico() { 
    renderHistory(); 
    document.addEventListener('inventoryUpdated', renderHistory); 
    document.addEventListener('orgUpdated', renderHistory); 
}

function renderHistory() {
    const tbody = document.querySelector('#history-table tbody'); 
    const delTbody = document.querySelector('#deleted-items-table tbody');
    if(!tbody) return; 
    tbody.innerHTML = '';
    
    if (delTbody) {
        delTbody.innerHTML = '';
        if (db.deletedItems.length === 0) {
            delTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">No se han registrado eliminaciones de bienes.</td></tr>`;
        } else {
            db.deletedItems.forEach(d => {
                delTbody.innerHTML += `
                    <tr>
                        <td>${d.date}</td>
                        <td><strong>${d.name}</strong> <small style="color:var(--text-secondary);">(${d.id})</small></td>
                        <td><span style="background:var(--accent); color:white; padding:2px 8px; border-radius:12px; font-size:0.75rem;">${d.unit}</span></td>
                        <td>${d.requestedBy}</td>
                        <td><strong style="color:var(--success);">${d.approvedBy}</strong></td>
                        <td><span style="color:var(--warning);">${d.justification}</span></td>
                    </tr>`;
            });
        }
    }

    let historyToShow = db.history;
    if (state.currentUser.role === 'SUPERVISOR' || state.currentUser.role === 'ENCARGADO') {
        historyToShow = db.history.filter(h => {
            const hUser = db.users.find(u => u.name === h.user);
            return hUser && (hUser.dir === state.currentUser.dir || hUser.unit === state.currentUser.unit);
        });
    }

    historyToShow.forEach(h => { 
        tbody.innerHTML += `<tr><td>${h.date}</td><td><strong>${h.user}</strong></td><td><span style="color:var(--accent); font-weight:bold;">${h.action}</span></td><td>${h.details}</td></tr>`; 
    });
}