import { db, state } from './db.js';

export function initHistorico() { renderHistory(); document.addEventListener('inventoryUpdated', renderHistory); document.addEventListener('orgUpdated', renderHistory); }

function renderHistory() {
    const tbody = document.querySelector('#history-table tbody'); if(!tbody) return; tbody.innerHTML = '';
    
    let historyToShow = db.history;
    if (state.currentUser.role === 'SUPERVISOR' || state.currentUser.role === 'ENCARGADO') {
        historyToShow = db.history.filter(h => {
            const hUser = db.users.find(u => u.name === h.user);
            return hUser && (hUser.dir === state.currentUser.dir || hUser.unit === state.currentUser.unit);
        });
    }

    historyToShow.forEach(h => { tbody.innerHTML += `<tr><td>${h.date}</td><td><strong>${h.user}</strong></td><td><span style="color:var(--accent); font-weight:bold;">${h.action}</span></td><td>${h.details}</td></tr>`; });
}