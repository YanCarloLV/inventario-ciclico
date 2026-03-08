// ==========================================
// server.js - Versión de Alta Estabilidad
// ==========================================

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Render usa el puerto 10000 por defecto
const PORT = process.env.PORT || 10000; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURACIÓN DE MONGODB ---
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:Autodesk1234@inventario-ciclico.6ntlqbn.mongodb.net/?appName=Inventario-Ciclico";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🚀 Conexión establecida con MongoDB Atlas"))
  .catch(err => console.error("❌ Error de conexión:", err.message));


// --- MODELO DE DATOS ---
const CiclicoSchema = new mongoose.Schema({
    id: Number,           
    modelo: String,
    color: String,
    tallas: [String],
    totalTallas: { type: Number, default: 0 },
    conteoActual: { type: Number, default: 0 },
    progreso: { type: Number, default: 0 },
    estatus: { type: String, default: "Pendiente" },
    asignadoA: { type: String, default: null },
    resultados: { type: Array, default: [] },
    horaInicio: String,   
    horaFin: String
});

const Ciclico = mongoose.model('Ciclico', CiclicoSchema);


// --- RUTAS DE LA API ---

// 1. Obtener todos los inventarios
app.get('/api/ciclicos', async (req, res) => {
    try {
        const inventarios = await Ciclico.find().sort({ id: -1 });
        res.json(inventarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Crear Nuevo Inventario (Soporta Cíclico Normal y Hallazgo Libre)
app.post('/api/crear-ciclico', async (req, res) => {
    try {
        const { modelo, color, tallasRaw, tallas, resultados, asignadoA, estatus, totalTallas, horaInicio, horaFin } = req.body;
        
        let listaTallas = [];
        let configFinal = {};

        // LÓGICA PARA CAPTURA LIBRE (HALLAZGOS)
        if (estatus === "Finalizado") {
            listaTallas = tallas || [];
            configFinal = {
                id: Date.now(),
                modelo,
                color,
                tallas: listaTallas,
                resultados: resultados || [],
                asignadoA: asignadoA || "Sistema",
                estatus: "Finalizado",
                totalTallas: totalTallas || listaTallas.length,
                progreso: 100,
                conteoActual: totalTallas || listaTallas.length,
                horaInicio: horaInicio || new Date().toLocaleTimeString(),
                horaFin: horaFin || new Date().toLocaleTimeString()
            };
        } 
        // LÓGICA PARA INVENTARIO PROGRAMADO (SUPERVISOR)
        else {
            listaTallas = tallasRaw ? tallasRaw.split(',').map(t => t.trim()).filter(t => t !== "") : [];
            configFinal = {
                id: Date.now(),
                modelo,
                color,
                tallas: listaTallas,
                totalTallas: listaTallas.length || 1,
                estatus: "Pendiente"
            };
        }

        const nuevo = new Ciclico(configFinal);
        await nuevo.save();
        res.json(nuevo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Liberar Inventario (Reset para el Supervisor)
app.post('/api/liberar-inventario', async (req, res) => {
    try {
        const { id } = req.body;
        await Ciclico.findOneAndUpdate({ id }, {
            estatus: "Pendiente",
            asignadoA: null,
            progreso: 0,
            conteoActual: 0,
            resultados: [],
            horaInicio: null,
            horaFin: null
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. Actualizar Progreso (Desde la App del Operador)
app.post('/api/actualizar-progreso', async (req, res) => {
    try {
        const { id, progreso, conteoActual, resultados, horaFin, estatus } = req.body;
        
        const updateData = { progreso, conteoActual, resultados };
        if (horaFin) updateData.horaFin = horaFin;
        if (estatus) updateData.estatus = estatus;

        await Ciclico.findOneAndUpdate({ id }, updateData);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 5. Asignar Operador e Inicio de Tiempo
app.post('/api/asignar-operador', async (req, res) => {
    try {
        const { id, operador, horaInicio } = req.body;
        await Ciclico.findOneAndUpdate({ id }, {
            asignadoA: operador,
            estatus: "En Proceso",
            horaInicio: horaInicio
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Iniciar Servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor ejecutándose en puerto ${PORT}`);
});