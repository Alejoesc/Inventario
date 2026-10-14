import { db, state, logAudit } from './db.js';

export function initAuth(onLoginSuccess) {
    const loginForm = document.getElementById('login-form');
    
    loginForm.onsubmit = (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        const user = db.users.find(u => u.email === email && u.pass === pass);
        
        if (user && user.active !== false) {
            state.currentUser = user;
            logAudit("Inicio de Sesión", "Ingreso exitoso al sistema.");
            
            document.getElementById('login-view').classList.remove('active');
            document.getElementById('app-view').style.display = 'flex';
            document.getElementById('current-user-name').textContent = user.name;
            document.getElementById('current-user-role').textContent = `${user.role} - ${user.unit}`;
            
            if(user.role === 'ADMIN') document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
            else document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));

            if(['ADMIN', 'SUPERVISOR', 'ENCARGADO'].includes(user.role)) {
                 document.querySelectorAll('.role-admin-sup-enc').forEach(el => el.classList.remove('hidden'));
            } else {
                 document.querySelectorAll('.role-admin-sup-enc').forEach(el => el.classList.add('hidden'));
            }

            onLoginSuccess();
        } else {
            window.showToast('Credenciales incorrectas o usuario inhabilitado.', 'error');
            logAudit("Intento Fallido", `Intento de acceso fallido para el correo: ${email}`);
        }
    };

    document.getElementById('logout-btn').onclick = () => {
        logAudit("Cierre de Sesión", "Salida del sistema.");
        state.currentUser = null;
        document.getElementById('app-view').style.display = 'none';
        document.getElementById('login-view').classList.add('active');
        loginForm.reset();
    };
}