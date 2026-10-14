export const db = {
    users: [
        { id: 1, email: 'admin@cendit.gob.ve', pass: '1234', name: 'Administrador Global', cedula: '00000000', role: 'ADMIN', dir: 'PRESIDENCIA', unit: 'Todas', active: true },
        { id: 2, email: 'lescobar@cendit.gob.ve', pass: '1234', name: 'Luis Escobar', cedula: '27.985.501', role: 'VIEWER', dir: 'DDI', unit: 'UTST', active: true },
        { id: 3, email: 'gcarvalho@cendit.gob.ve', pass: '1234', name: 'Gloria Carvalho', cedula: '14.351.425', role: 'SUPERVISOR', dir: 'PRESIDENCIA', unit: 'Todas', active: true },
        { id: 4, email: 'rsantos@cendit.gob.ve', pass: '1234', name: 'Roselyn Santos', cedula: '21.759.544', role: 'VIEWER', dir: 'PRESIDENCIA', unit: 'Todas', active: true },
        { id: 5, email: 'pquintero@cendit.gob.ve', pass: '1234', name: 'Pierina Quintero', cedula: '13.615.399', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 6, email: 'lsuarez@cendit.gob.ve', pass: '1234', name: 'Leonel Suárez', cedula: '17.719.110', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 7, email: 'cmoncada@cendit.gob.ve', pass: '1234', name: 'Candi Moncada', cedula: '19.658.279', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 8, email: 'ihernandez@cendit.gob.ve', pass: '1234', name: 'Isabel Hernández', cedula: '27.703.237', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 9, email: 'baraque@cendit.gob.ve', pass: '1234', name: 'Belkys Araque', cedula: '10.538.014', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 10, email: 'kfernandez@cendit.gob.ve', pass: '1234', name: 'Kris Fernández', cedula: '18.023.579', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 11, email: 'ygonzalez@cendit.gob.ve', pass: '1234', name: 'Yginia Gonzalez', cedula: '11.556.419', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 12, email: 'dinodirosa@cendit.gob.ve', pass: '1234', name: 'Dino Di Rosa', cedula: '13.621.262', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 13, email: 'arivas@cendit.gob.ve', pass: '1234', name: 'Angélica Rivas', cedula: '14.484.815', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 14, email: 'lsantos@cendit.gob.ve', pass: '1234', name: 'Luis Santos', cedula: '19.334.041', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 15, email: 'omartinez@cendit.gob.ve', pass: '1234', name: 'Olga Martínez', cedula: '10.117.165', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 16, email: 'cgavidia@cendit.gob.ve', pass: '1234', name: 'Carlelines Gavidia', cedula: '18.538.931', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 17, email: 'yumbria@cendit.gob.ve', pass: '1234', name: 'Yaneime Umbría', cedula: '22.904.813', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 18, email: 'sperozo@cendit.gob.ve', pass: '1234', name: 'Samuel Perozo', cedula: '25.869.818', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 19, email: 'rrivero@cendit.gob.ve', pass: '1234', name: 'Rafael Rivero', cedula: '6.941.217', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 20, email: 'mescobar@cendit.gob.ve', pass: '1234', name: 'Mauricio Escobar', cedula: '26.683.059', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 21, email: 'erangel@cendit.gob.ve', pass: '1234', name: 'Estefanie Rangel', cedula: '26.902.091', role: 'SUPERVISOR', dir: 'DDI', unit: 'UFT', active: true },
        { id: 22, email: 'jsilva@cendit.gob.ve', pass: '1234', name: 'Javier Silva', cedula: '30.346.572', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 23, email: 'ggonzalez@cendit.gob.ve', pass: '1234', name: 'Gabriel Gonzalez', cedula: '23.623.637', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 24, email: 'jmanjarres@cendit.gob.ve', pass: '1234', name: 'Jarson Manjares', cedula: '20.492.991', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 25, email: 'rbetancourt@cendit.gob.ve', pass: '1234', name: 'Ray Betancourt', cedula: '20.589.350', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 26, email: 'hmedina@cendit.gob.ve', pass: '1234', name: 'Harrinso Medina', cedula: '25.227.333', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 27, email: 'jfernandez@cendit.gob.ve', pass: '1234', name: 'Jorge Fernandez', cedula: '27.516.318', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 28, email: 'efernandez@cendit.gob.ve', pass: '1234', name: 'Edgar Fernández', cedula: '12.399.171', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 29, email: 'wmarcano@cendit.gob.ve', pass: '1234', name: 'Willian Marcano', cedula: '28.007.522', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 30, email: 'dangulo@cendit.gob.ve', pass: '1234', name: 'Deivis Angulo', cedula: '26.473.124', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 31, email: 'wyanez@cendit.gob.ve', pass: '1234', name: 'Wladimir Yanez', cedula: '16.685.186', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 32, email: 'mquijada@cendit.gob.ve', pass: '1234', name: 'María Quijada', cedula: '27.427.331', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 33, email: 'yhurtado@cendit.gob.ve', pass: '1234', name: 'Yésika Hurtado', cedula: '22.906.204', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 34, email: 'ovillarroel@cendit.gob.ve', pass: '1234', name: 'Orlando Villarroel', cedula: '19.477.395', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 35, email: 'dlandaeta@cendit.gob.ve', pass: '1234', name: 'Daniel Landaeta', cedula: '18.707.761', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 36, email: 'hnunez@cendit.gob.ve', pass: '1234', name: 'Hector Núñez', cedula: '15.207.410', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 37, email: 'dchicaiza@cendit.gob.ve', pass: '1234', name: 'David Chicaiza', cedula: '24.316.965', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 38, email: 'warias@cendit.gob.ve', pass: '1234', name: 'Wilmary Arias', cedula: '22.607.039', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 39, email: 'hparra@cendit.gob.ve', pass: '1234', name: 'Hazael Parra', cedula: '32.149.960', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 40, email: 'jrivero@cendit.gob.ve', pass: '1234', name: 'Jelsymar Rivero', cedula: '28.080.355', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 41, email: 'ylinares@cendit.gob.ve', pass: '1234', name: 'Ymar Linares', cedula: '25.466.755', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 42, email: 'jpena@cendit.gob.ve', pass: '1234', name: 'Jose Peña', cedula: '26.369.329', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 43, email: 'ygamboa@cendit.gob.ve', pass: '1234', name: 'Yaremi Gamboa', cedula: '14.882.205', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 44, email: 'bfigueroa@cendit.gob.ve', pass: '1234', name: 'Belkis Figueroa', cedula: '12.385.893', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 45, email: 'cfigueira@cendit.gob.ve', pass: '1234', name: 'Cristhian Figueira', cedula: '29.595.207', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 46, email: 'jgarcia@cendit.gob.ve', pass: '1234', name: 'Jose Garcia', cedula: '28.309.185', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 47, email: 'jrodriguez@cendit.gob.ve', pass: '1234', name: 'Jose Rodriguez', cedula: '17.529.635', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 48, email: 'cmagdaleno@cendit.gob.ve', pass: '1234', name: 'Caridad Magdaleno', cedula: '22.856.300', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 49, email: 'ogonzalez@cendit.gob.ve', pass: '1234', name: 'Oriana González', cedula: '25.847.780', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 50, email: 'amontezuma@cendit.gob.ve', pass: '1234', name: 'Abrangier Montezuma', cedula: '24.475.537', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 51, email: 'vperez@cendit.gob.ve', pass: '1234', name: 'Vanessa Pérez', cedula: '17.692.378', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 52, email: 'htovar@cendit.gob.ve', pass: '1234', name: 'Halesdyn Tovar', cedula: '17.558.599', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 53, email: 'rtorres@cendit.gob.ve', pass: '1234', name: 'Robert Torres', cedula: '19.153.377', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 54, email: 'mvazquez@cendit.gob.ve', pass: '1234', name: 'Maria Vazquez', cedula: '14.897.235', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 55, email: 'fbencomo@cendit.gob.ve', pass: '1234', name: 'Franz Bencomo', cedula: '11.193.381', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 56, email: 'yperez@cendit.gob.ve', pass: '1234', name: 'Yerika Perez', cedula: '19.372.036', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 57, email: 'mleon@cendit.gob.ve', pass: '1234', name: 'Maria Leon', cedula: '11.990.834', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 58, email: 'atrujillo@cendit.gob.ve', pass: '1234', name: 'Anerlin Trujillo', cedula: '19.163.517', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 59, email: 'kmejia@cendit.gob.ve', pass: '1234', name: 'Keyla Mejia', cedula: '14.058.591', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 60, email: 'jpinto@cendit.gob.ve', pass: '1234', name: 'José Pinto', cedula: '6.360.000', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 61, email: 'ehurtado@cendit.gob.ve', pass: '1234', name: 'Edgardo Hurtado', cedula: '18.599.308', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 62, email: 'kfigueredo@cendit.gob.ve', pass: '1234', name: 'Kelvis Figueredo', cedula: '20.298.052', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 63, email: 'aurbina@cendit.gob.ve', pass: '1234', name: 'Angel Urbina', cedula: '9.954.454', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 64, email: 'cpuerta@cendit.gob.ve', pass: '1234', name: 'Carlos Puertas', cedula: '13.094.387', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 65, email: 'scaraguiche@cendit.gob.ve', pass: '1234', name: 'Santiago Caraguiche', cedula: '14.139.706', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 66, email: 'gduarte@cendit.gob.ve', pass: '1234', name: 'Gerardo Duarte', cedula: '11.567.115', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 67, email: 'dfuentes@cendit.gob.ve', pass: '1234', name: 'Dilan Fuentes', cedula: '22.800.995', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 68, email: 'hlopez@cendit.gob.ve', pass: '1234', name: 'Hilda López', cedula: '6.166.450', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 69, email: 'dravelo@cendit.gob.ve', pass: '1234', name: 'Denis Ravelo', cedula: '12.827.996', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 70, email: 'fortiz@cendit.gob.ve', pass: '1234', name: 'Francisco Ortiz', cedula: '24.232.463', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 71, email: 'bcardenas@cendit.gob.ve', pass: '1234', name: 'Beatriz Cardenas', cedula: '11.675.540', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 72, email: 'aguillen@cendit.gob.ve', pass: '1234', name: 'Aracelis Guillén', cedula: '19.292.721', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 73, email: 'emendez@cendit.gob.ve', pass: '1234', name: 'Edith Méndez', cedula: '24.757.544', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 74, email: 'waguilera@cendit.gob.ve', pass: '1234', name: 'Wendolly Aguilera', cedula: '10.780.848', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 75, email: 'lverde@cendit.gob.ve', pass: '1234', name: 'Leivis Verde', cedula: '10.761.713', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 76, email: 'ibruguera@cendit.gob.ve', pass: '1234', name: 'Ingrid Bruguera', cedula: '6.516.225', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 77, email: 'hortiz@cendit.gob.ve', pass: '1234', name: 'Halsyn Ortiz', cedula: '4.679.550', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 78, email: 'mreveron@cendit.gob.ve', pass: '1234', name: 'Marco Reveron', cedula: '22.774.659', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 79, email: 'wsanmartin@cendit.gob.ve', pass: '1234', name: 'Whinder San Martin', cedula: '24.897.770', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 80, email: 'bbarrios@cendit.gob.ve', pass: '1234', name: 'Briseida Barrios', cedula: '18.030.425', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 81, email: 'jpenalver@cendit.gob.ve', pass: '1234', name: 'Juan Peñalver', cedula: '11.311.435', role: 'VIEWER', dir: 'Sin Asignar', unit: 'Ninguna', active: true },
        { id: 82, email: 'ralvarado@cendit.gob.ve', pass: '1234', name: 'Ramona Alvarado', cedula: '9.050.958', role: 'ENCARGADO', dir: 'DA', unit: 'Bienes Nacionales', active: true }
    ],
    inventory: [
        { id: 'INV-100', name: 'Router Cisco', cat: 'Equipos IT', unit: 'UTST', status: 'Activo', assignedTo: 'Luis Escobar', assignedEmail: 'lescobar@cendit.gob.ve', obs: 'Perfecto', returnDate: '', originalUnit: '' },
        { id: 'INV-101', name: 'Laptop Dell', cat: 'Equipos IT', unit: 'Bienes Nacionales', status: 'Activo', assignedTo: 'Ramona Alvarado', assignedEmail: 'ralvarado@cendit.gob.ve', obs: 'Uso diario', returnDate: '', originalUnit: '' },
        { id: 'INV-102', name: 'Impresora HP', cat: 'Equipos IT', unit: 'UTST', status: 'Activo', assignedTo: '', assignedEmail: '', obs: 'Uso general', returnDate: '', originalUnit: '' }
    ],
    organigrama: {
        'PRESIDENCIA': ['Todas', 'Atención al Ciudadano'],
        'DDI': ['UFT', 'UTST', 'UPA'],
        'DA': ['USNT', 'USAT', 'Bienes Nacionales'],
        'DE': []
    },
    chatMessages: [], history: [], audit: [], notifications: [], requisitions: []
};

export let state = { currentUser: null };

export function addHistory(action, details) {
    db.history.unshift({ date: new Date().toLocaleString(), user: state.currentUser ? state.currentUser.name : 'Sistema', action: action, details: details });
}

export function logAudit(action, details) {
    const mockIP = `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.1.100`;
    const mockMAC = '00:1B:44:11:3A:B7';
    db.audit.unshift({ 
        date: new Date().toLocaleString(), 
        user: state.currentUser ? `${state.currentUser.name} (${state.currentUser.email})` : 'SISTEMA', 
        action: action, 
        details: details,
        network: `IP: ${mockIP} | MAC: ${mockMAC}`
    });
}

export function addNotification(targetEmail, message) {
    db.notifications.push({ to: targetEmail, msg: message, date: new Date().toLocaleString(), read: false });
}