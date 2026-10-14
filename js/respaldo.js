import { db, logAudit } from './db.js';

export function initRespaldo() {
    const fileInput = document.getElementById('import-db-file');
    document.getElementById('btn-export-db').onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
        const downloadAnchorNode = document.createElement('a'); downloadAnchorNode.setAttribute("href", dataStr); downloadAnchorNode.setAttribute("download", "respaldo_cendit_" + new Date().getTime() + ".json");
        document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
        window.showToast("Base de datos exportada con éxito."); logAudit("Sistema", "Generó una copia de respaldo JSON");
    };
    
    fileInput.onchange = (e) => {
        if(e.target.files.length > 0) { document.getElementById('import-file-name').textContent = e.target.files[0].name; document.getElementById('import-file-name').style.color = 'var(--success)'; }
        else { document.getElementById('import-file-name').textContent = "Seleccionar archivo JSON"; document.getElementById('import-file-name').style.color = 'var(--text-primary)'; }
    };

    document.getElementById('btn-import-db').onclick = () => {
        if (!fileInput.files.length) return window.showToast("Selecciona un archivo JSON primero.", "error");
        const reader = new FileReader(); reader.onload = function(event) { try { Object.assign(db, JSON.parse(event.target.result)); window.showToast("Base de datos restaurada. Recargando..."); logAudit("Sistema Peligro", "Restauró la base de datos completa"); setTimeout(() => location.reload(), 2000); } catch (e) { window.showToast("Error al leer el archivo. JSON inválido.", "error"); } }; reader.readAsText(fileInput.files[0]);
    };
}