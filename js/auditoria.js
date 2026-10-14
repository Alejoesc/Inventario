import { db, state } from './db.js';

export function initAuditoria() {
    renderAuditTable(db.audit);

    document.getElementById('btn-filter-audit').onclick = () => {
        const fromDate = document.getElementById('audit-date-from').value;
        const toDate = document.getElementById('audit-date-to').value;
        
        let filtered = db.audit;
        if(fromDate) {
            const from = new Date(fromDate);
            filtered = filtered.filter(a => {
                const parts = a.date.split(',')[0].split('/'); 
                const aDate = new Date(parts[2], parts[1]-1, parts[0]);
                return aDate >= from;
            });
        }
        if(toDate) {
            const to = new Date(toDate);
            filtered = filtered.filter(a => {
                const parts = a.date.split(',')[0].split('/');
                const aDate = new Date(parts[2], parts[1]-1, parts[0]);
                return aDate <= to;
            });
        }
        renderAuditTable(filtered);
    };

    document.getElementById('btn-export-audit').onclick = () => {
        const { jsPDF } = window.jspdf; const doc = new jsPDF('landscape');
        doc.text(`Auditoría del Sistema - CENDIT`, 14, 15); doc.setFontSize(10); doc.text(`Generado por: Administrador`, 14, 22);

        const tableData = [];
        document.querySelectorAll('#audit-table tbody tr').forEach(tr => {
            if(tr.cells.length > 1) {
                tableData.push([tr.cells[0].innerText, tr.cells[1].innerText, tr.cells[2].innerText, tr.cells[3].innerText]);
            }
        });

        doc.autoTable({ startY: 30, head: [['Fecha/Hora', 'Usuario/Correo', 'Acción y Detalles', 'IP/MAC']], body: tableData, theme: 'grid', styles: { fontSize: 8 }});
        doc.save(`Auditoria_Sistema.pdf`); window.showToast("Reporte de Auditoría Exportado.");
    };
}

function renderAuditTable(auditArray) {
    const tbody = document.querySelector('#audit-table tbody'); if(!tbody) return; tbody.innerHTML = '';
    if(auditArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-secondary);">No hay registros para este filtro.</td></tr>`;
        return;
    }
    auditArray.forEach(a => {
        tbody.innerHTML += `<tr><td>${a.date}</td><td><strong>${a.user.split('(')[0]}</strong><br><small style="color:var(--text-secondary)">${a.user.includes('(') ? '('+a.user.split('(')[1] : ''}</small></td><td><span style="color:var(--warning); font-weight:bold;">${a.action}</span><br>${a.details}</td><td><small style="color:var(--info); font-family:monospace;">${a.network}</small></td></tr>`;
    });
}