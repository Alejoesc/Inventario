import { db, state, addNotification, logAudit } from './db.js';
import { initAuth } from './auth.js';
import { initDashboard } from './dashboard.js';
import { initInventario, renderMisBienesTable } from './inventario.js';
import { initOrganigrama } from './organigrama.js';
import { initChat, renderChat } from './chat.js';
import { initUsuarios } from './usuarios.js';
import { initRespaldo } from './respaldo.js';
import { initHistorico } from './historico.js';
import { initAuditoria } from './auditoria.js';
import { initNotificaciones } from './notificaciones.js';
import { initRequisiciones } from './requisiciones.js';
import { initPrestamos, renderPrestamosTables } from './prestamos.js'; 

window.showToast = function(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
};

export function setupAutocomplete(inputId, listId) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    if(!input || !list) return;

    const renderList = (val) => {
        list.innerHTML = '';
        const matches = db.users.filter(u => u.name.toLowerCase().includes(val) || u.email.toLowerCase().includes(val) || u.cedula.includes(val));
        
        if (matches.length > 0) {
            list.classList.remove('hidden');
            matches.forEach(u => {
                const li = document.createElement('li');
                li.className = 'autocomplete-item';
                li.innerHTML = `
                    <div class="avatar-mini" style="flex-shrink: 0;"><i class="fas fa-user"></i></div>
                    <div style="line-height: 1.3; overflow: hidden; text-overflow: ellipsis;">
                        <strong style="display:block; overflow:hidden; text-overflow:ellipsis;">${u.name} <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:normal;">- V-${u.cedula}</span></strong>
                        <small style="color:var(--text-secondary); display:block; overflow:hidden; text-overflow:ellipsis;">${u.email}</small>
                    </div>`;
                li.onclick = (e) => {
                    e.stopPropagation();
                    input.value = `${u.name} (${u.email})`;
                    list.classList.add('hidden');
                };
                list.appendChild(li);
            });
        } else {
            list.innerHTML = '<li style="padding:10px; color:var(--text-secondary); text-align:center;">Usuario no encontrado</li>';
            list.classList.remove('hidden');
        }
    };

    input.oninput = function() { renderList(this.value.toLowerCase()); };
    input.onclick = function(e) { 
        e.stopPropagation(); 
        document.querySelectorAll('.autocomplete-list, .custom-select-list').forEach(l => { if (l !== list) l.classList.add('hidden'); }); 
        renderList(this.value.toLowerCase()); 
    };
}

export function setupCustomSelects() {
    const selects = document.querySelectorAll('select.custom-select');
    selects.forEach(select => {
        if (select.dataset.customized === "true") {
            const triggerSpan = select.parentElement.querySelector('.custom-select-trigger span');
            if (triggerSpan) triggerSpan.textContent = select.options[select.selectedIndex]?.text || 'Seleccione...';
            return;
        }
        select.dataset.customized = "true";
        select.style.display = 'none';

        const container = document.createElement('div');
        container.className = 'custom-select-container';
        select.parentNode.insertBefore(container, select);
        container.appendChild(select);

        const trigger = document.createElement('div');
        trigger.className = 'form-control custom-select-trigger';
        const span = document.createElement('span');
        span.textContent = select.options[select.selectedIndex]?.text || 'Seleccione...';
        const icon = document.createElement('i');
        icon.className = 'fas fa-chevron-down';

        trigger.appendChild(span); trigger.appendChild(icon);

        const list = document.createElement('ul');
        list.className = 'autocomplete-list hidden custom-select-list';

        select.syncCustomUI = () => {
            span.textContent = select.options[select.selectedIndex]?.text || 'Seleccione...';
            list.innerHTML = '';
            Array.from(select.options).forEach(opt => {
                if(opt.disabled && !opt.text.trim()) return;
                const li = document.createElement('li');
                li.className = 'autocomplete-item';
                li.innerHTML = opt.innerHTML; 
                li.onclick = (e) => {
                    e.stopPropagation();
                    select.value = opt.value;
                    span.textContent = opt.text;
                    list.classList.add('hidden');
                    select.dispatchEvent(new Event('change'));
                };
                list.appendChild(li);
            });
        };

        select.syncCustomUI();
        trigger.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-list, .autocomplete-list').forEach(l => { if(l !== list) l.classList.add('hidden'); });
            list.classList.toggle('hidden');
        };

        const observer = new MutationObserver(() => { select.syncCustomUI(); });
        observer.observe(select, { childList: true });
        container.appendChild(trigger); container.appendChild(list);
    });
}

export function syncAllSelects() {
    document.querySelectorAll('select.custom-select').forEach(sel => {
        if(sel.syncCustomUI) sel.syncCustomUI();
    });
}
window.syncAllSelects = syncAllSelects; 

export function refreshCustomSelects() {
    syncAllSelects();
}

document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileMenuBtn && sidebar && overlay) {
        mobileMenuBtn.onclick = () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        };
        overlay.onclick = () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        };
    }

    document.onclick = (e) => {
        if(!e.target.closest('.custom-select-container') && !e.target.closest('.custom-autocomplete')) {
            document.querySelectorAll('.custom-select-list, .autocomplete-list').forEach(l => l.classList.add('hidden'));
        }
    };

    document.getElementById('theme-toggle').onclick = () => {
        const root = document.documentElement;
        const newTheme = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', newTheme);
        document.getElementById('theme-toggle').innerHTML = newTheme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    };

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.getElementById(e.currentTarget.getAttribute('data-target')).classList.add('active');
            
            if(sidebar) sidebar.classList.remove('active');
            if(overlay) overlay.classList.remove('active');

            if(e.currentTarget.getAttribute('data-target') === 'my-items-module') renderMisBienesTable();
            if(e.currentTarget.getAttribute('data-target') === 'loans-module') renderPrestamosTables();
        };
    });

    initAuth(() => {
        setupAutocomplete('item-assigned', 'item-assigned-list');
        setupAutocomplete('transfer-assigned', 'transfer-assigned-list');
        setupAutocomplete('loan-target', 'loan-target-list');

        const today = new Date();
        db.inventory.forEach(item => {
            if(item.status.includes('Prestado') && item.assignedEmail === state.currentUser.email && item.returnDate) {
                const retDate = new Date(item.returnDate);
                if(retDate <= today) addNotification(state.currentUser.email, `ALERTA ROJA: Tienes que devolver el bien ${item.name} HOY o la fecha ya está vencida.`);
            }
        });

        initDashboard(); initInventario(); renderMisBienesTable(); initPrestamos(); initRequisiciones(); initOrganigrama();
        initUsuarios(); initRespaldo(); initHistorico(); initAuditoria(); initNotificaciones();
        initChat(); 
        
        setTimeout(setupCustomSelects, 100);
    });

    document.addEventListener('inventoryUpdated', () => {
        renderMisBienesTable();
        renderPrestamosTables();
    });
});