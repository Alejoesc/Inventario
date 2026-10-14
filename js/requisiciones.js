import { db, state, addHistory, addNotification, logAudit } from './db.js';
import { renderTable as renderInventoryTable } from './inventario.js';

// Estado en memoria para las tasas oficiales del BCV (Actualización 100% automática)
export let exchangeRates = {
    bcvUsd: 0,
    bcvEur: 0,
    lastUpdated: 'Sincronizando...'
};

let autoSyncInterval = null;

export async function fetchExchangeRates() {
    const updateLabel = document.getElementById('bcv-last-update');

    try {
        // 1. Consultar API en vivo de Dólar Oficial (BCV)
        const resDolares = await fetch('https://ve.dolarapi.com/v1/dolares');
        if (!resDolares.ok) throw new Error('Error consultando API Dólar BCV');
        const dataDolares = await resDolares.json();

        const oficial = Array.isArray(dataDolares) ? dataDolares.find(d => d.fuente === 'oficial') : dataDolares;
        if (oficial && oficial.promedio) {
            exchangeRates.bcvUsd = parseFloat(oficial.promedio);
        }

        // 2. Consultar Euro Oficial (BCV)
        try {
            const resEuros = await fetch('https://ve.dolarapi.com/v1/euros');
            if (resEuros.ok) {
                const dataEuros = await resEuros.json();
                const euroOficial = Array.isArray(dataEuros) ? dataEuros.find(e => e.fuente === 'oficial') || dataEuros[0] : dataEuros;
                if (euroOficial && euroOficial.promedio) {
                    exchangeRates.bcvEur = parseFloat(euroOficial.promedio);
                } else {
                    throw new Error('Fallback paridad Euro BCV');
                }
            } else {
                throw new Error('Fallback paridad Euro BCV');
            }
        } catch {
            // Si el endpoint directo de Euro no responde, calcula la paridad internacional EUR/USD sobre la tasa oficial BCV
            const resFx = await fetch('https://open.er-api.com/v6/latest/EUR');
            if (resFx.ok) {
                const fxData = await resFx.json();
                const eurToUsd = fxData?.rates?.USD || 1.12;
                exchangeRates.bcvEur = parseFloat((exchangeRates.bcvUsd * eurToUsd).toFixed(2));
            } else {
                exchangeRates.bcvEur = parseFloat((exchangeRates.bcvUsd * 1.12).toFixed(2));
            }
        }

        exchangeRates.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        localStorage.setItem('cendit_bcv_rates_official', JSON.stringify(exchangeRates));

        renderExchangeRatesUI();
        updateConversionPreview();
    } catch {
        // Si hay corte momentáneo de internet, muestra la última tasa oficial BCV sincronizada
        const cached = localStorage.getItem('cendit_bcv_rates_official');
        if (cached) {
            exchangeRates = JSON.parse(cached);
        }
        renderExchangeRatesUI();
        updateConversionPreview();
        if (updateLabel) {
            updateLabel.innerHTML = `<i class="fas fa-wifi" style="color:var(--warning);"></i> Reconectando con BCV... (${exchangeRates.lastUpdated})`;
        }
    }
}

function renderExchangeRatesUI() {
    const usdEl = document.getElementById('rate-bcv-usd');
    const eurEl = document.getElementById('rate-bcv-eur');
    const updateLabel = document.getElementById('bcv-last-update');

    if (usdEl) usdEl.textContent = exchangeRates.bcvUsd > 0 ? `Bs. ${exchangeRates.bcvUsd.toFixed(2)}` : 'Bs. --';
    if (eurEl) eurEl.textContent = exchangeRates.bcvEur > 0 ? `Bs. ${exchangeRates.bcvEur.toFixed(2)}` : 'Bs. --';
    if (updateLabel && exchangeRates.bcvUsd > 0) {
        updateLabel.innerHTML = `<i class="fas fa-check-circle" style="color:var(--success);"></i> Sincronizado en vivo con BCV (${exchangeRates.lastUpdated})`;
    }
}

function updateConversionPreview() {
    const amountInput = document.getElementById('req-item-amount');
    const currencySelect = document.getElementById('req-item-currency');
    const previewEl = document.getElementById('req-conversion-preview');
    if (!amountInput || !currencySelect || !previewEl) return;

    const val = parseFloat(amountInput.value) || 0;
    const curr = currencySelect.value;

    let amountBs = 0;
    if (curr === 'USD_BCV') amountBs = val * exchangeRates.bcvUsd;
    else if (curr === 'EUR_BCV') amountBs = val * exchangeRates.bcvEur;
    else if (curr === 'BS') amountBs = val;

    const eqUsdBcv = exchangeRates.bcvUsd > 0 ? (amountBs / exchangeRates.bcvUsd) : 0;
    const eqEurBcv = exchangeRates.bcvEur > 0 ? (amountBs / exchangeRates.bcvEur) : 0;

    previewEl.innerHTML = `Equivalente: <strong>Bs. ${amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> | <strong>$${eqUsdBcv.toFixed(2)} BCV</strong> | <strong>€${eqEurBcv.toFixed(2)} BCV</strong>`;
}

export function initRequisiciones() {
    renderRequisitionsTable();
    fetchExchangeRates();

    // Sincronización automática continua cada 60 segundos sin botones
    if (autoSyncInterval) clearInterval(autoSyncInterval);
    autoSyncInterval = setInterval(fetchExchangeRates, 60000);

    // También actualiza automáticamente al volver a la ventana o recuperar conexión
    window.addEventListener('online', fetchExchangeRates);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) fetchExchangeRates();
    });

    // Actualizar automáticamente al abrir la sección de Requisiciones en el menú lateral
    const reqNavBtn = document.querySelector('.nav-btn[data-target="requisitions-module"]');
    if (reqNavBtn) {
        reqNavBtn.addEventListener('click', fetchExchangeRates);
    }

    const amountInput = document.getElementById('req-item-amount');
    const currencySelect = document.getElementById('req-item-currency');
    if (amountInput) amountInput.addEventListener('input', updateConversionPreview);
    if (currencySelect) currencySelect.addEventListener('change', updateConversionPreview);

    const quoteInput = document.getElementById('req-item-quote');
    if (quoteInput) {
        quoteInput.onchange = (e) => {
            if (e.target.files[0]) {
                document.getElementById('req-item-quote-name').textContent = e.target.files[0].name;
                document.getElementById('req-item-quote-name').style.color = "var(--success)";
            }
        };
    }

    const readFileAsDataURL = (file) => {
        return new Promise((resolve) => {
            if (!file) return resolve(null);
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    };

    document.getElementById('req-form').onsubmit = async (e) => {
        e.preventDefault(); 
        const newItem = document.getElementById('req-item-name').value; 
        const rawAmount = parseFloat(document.getElementById('req-item-amount').value) || 0;
        const currency = document.getElementById('req-item-currency').value;
        const link = document.getElementById('req-item-link').value;
        const quoteFile = document.getElementById('req-item-quote').files[0];

        if (!quoteFile) {
            return window.showToast("Por favor adjunta la cotización en PDF.", "error");
        }

        let amountBs = 0;
        let currencyLabel = '';
        let rateUsed = exchangeRates.bcvUsd;

        if (currency === 'USD_BCV') {
            amountBs = rawAmount * exchangeRates.bcvUsd;
            currencyLabel = `$${rawAmount.toFixed(2)} (Dólar BCV)`;
            rateUsed = exchangeRates.bcvUsd;
        } else if (currency === 'EUR_BCV') {
            amountBs = rawAmount * exchangeRates.bcvEur;
            currencyLabel = `€${rawAmount.toFixed(2)} (Euro BCV)`;
            rateUsed = exchangeRates.bcvEur;
        } else {
            amountBs = rawAmount;
            currencyLabel = `Bs. ${rawAmount.toFixed(2)}`;
            rateUsed = exchangeRates.bcvUsd;
        }

        const eqUsdBcv = exchangeRates.bcvUsd > 0 ? (amountBs / exchangeRates.bcvUsd).toFixed(2) : rawAmount.toFixed(2);
        const quoteData = await readFileAsDataURL(quoteFile);

        const req = { 
            id: Date.now(), 
            date: new Date().toLocaleDateString(), 
            user: state.currentUser.name, 
            email: state.currentUser.email, 
            dir: state.currentUser.dir, 
            unit: state.currentUser.unit, 
            item: newItem, 
            amount: eqUsdBcv,
            displayAmount: currencyLabel,
            amountBs: amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            rateSnapshot: `Tasa BCV $: ${exchangeRates.bcvUsd.toFixed(2)} | €: ${exchangeRates.bcvEur.toFixed(2)}`,
            link: link, 
            quotePdf: quoteData,
            quoteName: quoteFile.name,
            justification: document.getElementById('req-item-justification').value, 
            status: 'Pendiente' 
        };

        db.requisitions.push(req); 
        window.showToast("Requisición con tasa oficial BCV y cotización PDF enviada a supervisión."); 
        addHistory("Requisición Creada", `${state.currentUser.name} solicitó: ${newItem} (${req.displayAmount} / Bs. ${req.amountBs})`); 
        logAudit("Requisición", `Solicitó compra de ${newItem} por ${req.displayAmount} (Tasa BCV: ${rateUsed})`); 
        
        e.target.reset(); 
        document.getElementById('req-item-quote-name').textContent = 'Adjuntar Cotización PDF';
        document.getElementById('req-item-quote-name').style.color = '';
        if (window.syncAllSelects) window.syncAllSelects();
        updateConversionPreview();
        renderRequisitionsTable();
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

        const newInvItem = { id: 'INV-' + Math.floor(Math.random() * 9000 + 1000), name: document.getElementById('comp-req-name').value, cat: 'Equipos IT', qty: 1, unit: req.unit, assignedTo: req.user, assignedEmail: req.email, status: 'Activo', obs: `Comprado por ${req.displayAmount || '$'+req.amount} (Bs. ${req.amountBs || '--'})`, photo: photoData, invoice: invoiceData };
        db.inventory.push(newInvItem); req.status = 'Completado';
        window.showToast("Bien registrado con éxito con foto y factura."); addHistory("Ingreso Requisición", `Se ingresó ${newInvItem.name}`); addNotification(req.email, `Tu requisición de ${req.item} fue comprada e ingresada al inventario.`); logAudit("Ingreso Requisición", `Ingresó físicamente la requisición ${req.id}`);
        
        btnSave.disabled = false; btnSave.innerHTML = '<i class="fas fa-save"></i> Guardar';
        document.getElementById('comp-req-photo-name').textContent = 'Imagen'; document.getElementById('comp-req-photo-name').style.color = '';
        document.getElementById('comp-req-invoice-name').textContent = 'Archivo'; document.getElementById('comp-req-invoice-name').style.color = '';
        e.target.reset(); document.getElementById('complete-req-modal').classList.add('hidden'); renderRequisitionsTable(); renderInventoryTable(); document.dispatchEvent(new Event('inventoryUpdated'));
    };
}

export function renderRequisitionsTable() {
    const tbody = document.querySelector('#requisitions-table tbody'); if(!tbody) return; tbody.innerHTML = '';
    if (db.requisitions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-secondary);">No hay requisiciones registradas.</td></tr>`;
        return;
    }

    db.requisitions.forEach((req) => {
        let statusHtml = req.status === 'Pendiente' ? `<span style="color:var(--warning)"><i class="fas fa-clock"></i> Pendiente</span>` : (req.status === 'Aprobado' ? `<span style="color:var(--info)"><i class="fas fa-thumbs-up"></i> Aprobado</span>` : (req.status === 'Rechazado' ? `<span style="color:var(--danger)"><i class="fas fa-times-circle"></i> Rechazado</span>` : `<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Completado</span>`));
        let actionsHtml = '';
        if (req.status === 'Pendiente' && ['SUPERVISOR', 'ADMIN'].includes(state.currentUser.role)) { actionsHtml = `<div style="display:flex; gap:5px;"><button class="action-btn btn-success" style="padding: 6px 10px;" onclick="window.reqAction(${req.id}, 'Aprobado')" title="Aprobar"><i class="fas fa-check"></i></button><button class="action-btn btn-danger" style="padding: 6px 10px;" onclick="window.reqAction(${req.id}, 'Rechazado')" title="Rechazar"><i class="fas fa-times"></i></button></div>`; }
        if (req.status === 'Aprobado' && ['ENCARGADO', 'ADMIN'].includes(state.currentUser.role)) { actionsHtml = `<button class="action-btn btn-warning" style="padding: 6px 10px;" onclick="window.completeReq(${req.id}, '${req.item}')" title="Ingresar Físicamente"><i class="fas fa-box-open"></i> Ingresar</button>`; }
        
        const quoteBtn = req.quotePdf ? `<a href="${req.quotePdf}" download="${req.quoteName || 'Cotizacion_'+req.id+'.pdf'}" class="action-btn btn-info" style="padding: 4px 8px; font-size: 0.75rem; margin-top: 4px;"><i class="fas fa-file-pdf"></i> Cotización PDF</a>` : '';

        tbody.innerHTML += `
            <tr>
                <td>${req.date}</td>
                <td><strong>${req.user}</strong></td>
                <td>${req.item}</td>
                <td>
                    <strong style="color:var(--success);">${req.displayAmount || ('$' + (req.amount || '0.00'))}</strong>
                    ${req.amountBs ? `<br><small style="color:var(--info); font-weight:600;">Bs. ${req.amountBs}</small>` : ''}
                    ${req.rateSnapshot ? `<br><small style="color:var(--text-secondary); font-size:0.7rem;">${req.rateSnapshot}</small>` : ''}
                </td>
                <td>
                    <a href="${req.link}" target="_blank" style="color:var(--accent); display:block; font-size:0.82rem;"><i class="fas fa-external-link-alt"></i> Ver Link</a>
                    ${quoteBtn}
                </td>
                <td>${req.justification}</td>
                <td>${statusHtml}</td>
                <td>${actionsHtml}</td>
            </tr>`;
    });
}

window.reqAction = function(id, action) { const req = db.requisitions.find(r => r.id === id); if(req) { req.status = action; window.showToast(`Requisición ${action}.`); addNotification(req.email, `Tu requisición de ${req.item} ha sido ${action}.`); renderRequisitionsTable(); } }
window.completeReq = function(id, itemName) { document.getElementById('comp-req-id').value = id; document.getElementById('comp-req-name').value = itemName; document.getElementById('complete-req-modal').classList.remove('hidden'); }