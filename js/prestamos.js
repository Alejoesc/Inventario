import { db, state, logAudit, addHistory } from './db.js';

export function initPrestamos() {
    renderPrestamosTables();
    
    const btnBorrowed = document.getElementById('btn-export-borrowed');
    if (btnBorrowed) {
        btnBorrowed.onclick = () => {
            const { jsPDF } = window.jspdf; const doc = new jsPDF();
            doc.text(`Bienes prestados a la Unidad - CENDIT`, 14, 15); doc.setFontSize(10); doc.text(`Unidad: ${state.currentUser.unit}`, 14, 22);
            const borrowed = db.inventory.filter(i => i.unit === state.currentUser.unit && i.status.includes('Prestado') && i.originalUnit && i.originalUnit !== state.currentUser.unit);
            const tableData = borrowed.map(i => [i.id, i.name, i.originalUnit, i.status]);
            doc.autoTable({ startY: 30, head: [['ID', 'Bien', 'Dueño Original', 'Estado/Fecha']], body: tableData, theme: 'grid', styles: { fontSize: 8 }});
            doc.save(`PrestadosA_${state.currentUser.unit}.pdf`); window.showToast("PDF Exportado con éxito.");
        };
    }

    const btnLent = document.getElementById('btn-export-lent');
    if (btnLent) {
        btnLent.onclick = () => {
            const { jsPDF } = window.jspdf; const doc = new jsPDF();
            doc.text(`Bienes prestados por nuestra Unidad - CENDIT`, 14, 15); doc.setFontSize(10); doc.text(`Unidad: ${state.currentUser.unit}`, 14, 22);
            const lent = db.inventory.filter(i => i.originalUnit === state.currentUser.unit && i.status.includes('Prestado'));
            const tableData = lent.map(i => [i.id, i.name, i.unit + ' (A ' + (i.assignedTo || 'Unidad') + ')', i.status]);
            doc.autoTable({ startY: 30, head: [['ID', 'Bien', 'Ubicación Actual', 'Estado/Fecha']], body: tableData, theme: 'grid', styles: { fontSize: 8 }});
            doc.save(`PrestadosPor_${state.currentUser.unit}.pdf`); window.showToast("PDF Exportado con éxito.");
        };
    }
}

export function renderPrestamosTables() {
    const borrowedTbody = document.querySelector('#borrowed-items-table tbody');
    const lentTbody = document.querySelector('#lent-items-table tbody');
    if(!borrowedTbody || !lentTbody) return;
    
    borrowedTbody.innerHTML = ''; lentTbody.innerHTML = '';

    const borrowedItems = db.inventory.filter(i => i.unit === state.currentUser.unit && i.status.includes('Prestado') && i.originalUnit && i.originalUnit !== state.currentUser.unit);
    const lentItems = db.inventory.filter(i => i.originalUnit === state.currentUser.unit && i.status.includes('Prestado'));

    if(borrowedItems.length === 0) borrowedTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-secondary);">Nadie ha prestado equipos a tu unidad.</td></tr>`;
    borrowedItems.forEach(i => {
        borrowedTbody.innerHTML += `
            <tr>
                <td><strong>${i.id}</strong></td>
                <td>${i.name}</td>
                <td><span style="color:var(--info); font-weight:bold;">${i.originalUnit}</span></td>
                <td><span style="color:var(--warning);">${i.status}</span></td>
                <td><button class="action-btn btn-warning btn-return-loan" data-id="${i.id}" style="padding: 6px 10px;"><i class="fas fa-undo"></i> Devolver</button></td>
            </tr>`;
    });

    if(lentItems.length === 0) lentTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-secondary);">Tu unidad no ha prestado equipos a otros.</td></tr>`;
    lentItems.forEach(i => {
        lentTbody.innerHTML += `
            <tr>
                <td><strong>${i.id}</strong></td>
                <td>${i.name}</td>
                <td><span style="color:var(--accent); font-weight:bold;">${i.unit}</span> (a ${i.assignedTo || 'Unidad'})</td>
                <td><span style="color:var(--warning);">${i.status}</span></td>
            </tr>`;
    });
    
    document.querySelectorAll('.btn-return-loan').forEach(btn => {
        btn.onclick = (e) => {
            const itemId = e.currentTarget.dataset.id;
            const item = db.inventory.find(x => x.id === itemId);
            if(confirm('¿Deseas devolver este bien a la unidad dueña original?')) {
                item.status = 'Activo'; 
                item.assignedTo = ''; 
                item.assignedEmail = ''; 
                if(item.originalUnit) { item.unit = item.originalUnit; delete item.originalUnit; }
                item.returnDate = ''; 
                item.obs += ` | Devuelto por ${state.currentUser.name}`; 
                window.showToast("Bien devuelto exitosamente."); 
                addHistory("Devolución", `${state.currentUser.name} devolvió el bien ${item.name}`); 
                logAudit("Devolución", `Devolvió el bien ${item.id}`);
                document.dispatchEvent(new Event('inventoryUpdated')); 
            }
        };
    });
}