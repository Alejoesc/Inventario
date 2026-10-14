import { db, state } from './db.js';

let chart1, chart2;

export function initDashboard() {
    renderCharts('doughnut'); 
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.onclick = (e) => {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            renderCharts(e.currentTarget.getAttribute('data-type'));
        };
    });

    document.addEventListener('inventoryUpdated', () => {
        const activeTab = document.querySelector('.chart-tab.active');
        if(activeTab) renderCharts(activeTab.getAttribute('data-type'));
    });

    document.getElementById('btn-export-pdf').onclick = generatePDF;
}

function renderCharts(type) {
    const catCounts = {}; const unitCounts = {};
    db.inventory.forEach(item => {
        catCounts[item.cat] = (catCounts[item.cat] || 0) + 1;
        unitCounts[item.unit] = (unitCounts[item.unit] || 0) + 1;
    });

    if(chart1) chart1.destroy(); if(chart2) chart2.destroy();
    const ctx1 = document.getElementById('pieChart').getContext('2d');
    chart1 = new Chart(ctx1, { type: type, data: { labels: Object.keys(catCounts), datasets: [{ data: Object.values(catCounts), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'] }] }, options: { plugins: { title: { display: true, text: 'Bienes por Categoría' } } } });

    const ctx2 = document.getElementById('barChart').getContext('2d');
    chart2 = new Chart(ctx2, { type: 'bar', data: { labels: Object.keys(unitCounts), datasets: [{ label: 'Bienes Asignados', data: Object.values(unitCounts), backgroundColor: '#6366f1' }] }, options: { plugins: { title: { display: true, text: 'Bienes por Unidad' } } } });
}

function generatePDF() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); const user = state.currentUser;
    doc.text(`Reporte de Inventario - CENDIT`, 14, 15); doc.setFontSize(10); doc.text(`Generado por: ${user.name} (${user.role})`, 14, 22);

    let filteredInventory = [];
    if (user.role === 'ADMIN') filteredInventory = db.inventory; 
    else if (user.role === 'SUPERVISOR' || user.role === 'ENCARGADO') { const misUnidades = db.organigrama[user.dir] || []; filteredInventory = db.inventory.filter(i => misUnidades.includes(i.unit) || i.assignedEmail === user.email); }
    else filteredInventory = db.inventory.filter(i => i.unit === user.unit || i.assignedEmail === user.email);

    const tableData = filteredInventory.map(i => [i.id, i.name, i.cat, i.unit, i.assignedTo || 'N/A', i.status]);
    doc.autoTable({ startY: 30, head: [['ID', 'Nombre', 'Categoría', 'Unidad', 'Asignado A', 'Estado']], body: tableData, theme: 'grid', styles: { fontSize: 8 }});
    doc.save(`Inventario_${user.dir}_${user.unit}.pdf`); window.showToast("Reporte PDF generado exitosamente.");
}