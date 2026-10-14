import { db, state } from './db.js';

export function initNotificaciones() {
    const bellBtn = document.getElementById('bell-btn'); const panel = document.getElementById('notif-panel'); const closeBtn = document.getElementById('close-notif-btn');
    
    bellBtn.onclick = (e) => { 
        e.stopPropagation(); 
        panel.classList.toggle('hidden'); 
        const misNotifsUnread = db.notifications.filter(n => n.to === state.currentUser.email && n.read === false);
        misNotifsUnread.forEach(n => n.read = true);
        renderNotificaciones(); 
    };
    
    closeBtn.onclick = (e) => { e.stopPropagation(); panel.classList.add('hidden'); };
    
    panel.onclick = (e) => { e.stopPropagation(); }
    
    document.addEventListener('click', (e) => {
        if (!bellBtn.contains(e.target) && !panel.contains(e.target)) {
            panel.classList.add('hidden');
        }
    });
    
    renderNotificaciones();
}

export function renderNotificaciones() {
    const list = document.getElementById('notif-list'); const badge = document.getElementById('notif-badge');
    if(!state.currentUser) return;
    
    const allNotifs = db.notifications.filter(n => n.to === state.currentUser.email);
    const unreadCount = allNotifs.filter(n => n.read === false).length;
    
    badge.textContent = unreadCount; 
    badge.style.display = unreadCount > 0 ? 'block' : 'none';
    
    list.innerHTML = '';
    if (allNotifs.length === 0) { list.innerHTML = '<li class="notif-item" style="text-align: center; color: var(--text-secondary);">No tienes notificaciones.</li>'; return; }
    
    allNotifs.slice().reverse().forEach(n => { 
        list.innerHTML += `<li class="notif-item"><small style="color:var(--accent); font-weight:bold;"><i class="fas fa-clock"></i> ${n.date}</small><br><span style="display:block; margin-top:5px; color:var(--text-primary);">${n.msg}</span></li>`; 
    });
}