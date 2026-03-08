const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

// Configuración para recibir JSON
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// BASE DE DATOS VOLÁTIL (Se reinicia al desplegar en Render si no usas base de datos externa)
// Pero para pruebas operativas funciona perfecto
let db = {
    ciclicos: []
};

// --- RUTAS DEL SISTEMA ---

// 1. Obtener todos los inventarios
app.get('/api/ciclicos', (req, res) => {
    res.json(db.ciclicos);
});

// 2. Crear Inventario (Con contador de tallas para el 100%)
app.post('/api/crear-ciclico', (req, res) => {
    const { modelo, color, tallasRaw } = req.body;
    const listaTallas = tallasRaw.split(',').map(t => t.trim());
    
    const nuevo = {
        id: Date.now(),
        modelo,
        color,
        tallas: listaTallas, 
        totalTallas: listaTallas.length, 
        conteoActual: 0,
        progreso: 0,
        estatus: "Pendiente",
        asignadoA: null,
        resultados: [],
        horaInicio: null,
        horaFin: null,
        tiempoTotal: null
    };

    db.ciclicos.push(nuevo);
    res.json(nuevo);
});

// 3. Apartar Inventario (Control de Colisiones)
app.post('/api/apartar-inventario', (req, res) => {
    const { id, nombreOperador } = req.body;
    const inventario = db.ciclicos.find(c => c.id === id);

    if (inventario) {
        // Si nadie lo tiene o si el que entra es el mismo que ya lo tenía
        if (inventario.asignadoA === null || inventario.asignadoA === nombreOperador) {
            inventario.estatus = "En Proceso";
            inventario.asignadoA = nombreOperador;
            if (!inventario.horaInicio) inventario.horaInicio = new Date().toLocaleTimeString();
            res.json({ success: true, inventario });
        } else {
            res.status(403).json({ success: false, message: "Ya está ocupado por " + inventario.asignadoA });
        }
    } else {
        res.status(404).json({ success: false, message: "Inventario no encontrado" });
    }
});

// 4. Actualizar Progreso (Barra en tiempo real)
app.post('/api/actualizar-progreso', (req, res) => {
    const { id, resultadosActuales } = req.body;
    const inventario = db.ciclicos.find(c => c.id === id);

    if (inventario) {
        inventario.resultados = resultadosActuales;
        inventario.conteoActual = resultadosActuales.length;
        // Cálculo matemático del %
        inventario.progreso = Math.round((inventario.conteoActual / inventario.totalTallas) * 100);
        res.json({ success: true, progreso: inventario.progreso });
    } else {
        res.status(404).json({ success: false });
    }
});

// 5. Finalizar Inventario
app.post('/api/finalizar-ciclico', (req, res) => {
    const { id, resultados } = req.body;
    const inventario = db.ciclicos.find(c => c.id === id);

    if (inventario) {
        inventario.estatus = "Finalizado";
        inventario.resultados = resultados;
        inventario.horaFin = new Date().toLocaleTimeString();
        // Aquí podrías calcular tiempo total si quisieras
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// 6. Liberar Inventario (Botón manual del Supervisor)
app.post('/api/liberar-inventario', (req, res) => {
    const { id } = req.body;
    const inventario = db.ciclicos.find(c => c.id === id);
    if (inventario) {
        inventario.estatus = "Pendiente";
        inventario.asignadoA = null;
        inventario.progreso = 0;
        inventario.conteoActual = 0;
        res.json({ success: true });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor operando en puerto ${PORT}`);
});