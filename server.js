// ==========================================
// server.js - Versión de Alta Estabilidad
// ==========================================

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Puerto dinámico para Render o local
const PORT = process.env.PORT || 10000; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURACIÓN DE MONGODB ---
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:Autodesk1234@inventario-ciclico.6ntlqbn.mongodb.net/?appName=Inventario-Ciclico";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🚀 Conexión establecida con MongoDB Atlas"))
  .catch(err => console.error("❌ Error de conexión:", err.message));


// --- MODELOS DE DATOS ---

// Inventarios Cíclicos
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

// Catálogo Maestro (Para alimentar los selectores del Supervisor)
const CatalogoSchema = new mongoose.Schema({
    modelo: String,
    color: String
});

const Ciclico = mongoose.model('Ciclico', CiclicoSchema);
const Catalogo = mongoose.model('Catalogo', CatalogoSchema, 'catalogo'); // Colección 'catalogo'


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

// 2. OBTENER CATÁLOGO (Nueva ruta para el Supervisor inteligente)
app.get('/api/catalogo', async (req, res) => {
    try {
        const items = await Catalogo.find().sort({ modelo: 1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: "Error al cargar el catálogo" });
    }
});

// 3. Crear Nuevo Inventario (ID Largo Cronológico)
app.post('/api/crear-ciclico', async (req, res) => {
    try {
        const { modelo, color, tallasRaw } = req.body;
        // Limpiamos y convertimos el string de tallas en un array limpio
        const listaTallas = tallasRaw.split(',').map(t => t.trim()).filter(t => t !== "");

        const nuevo = new Ciclico({
            id: Date.now(), 
            modelo,
            color,
            tallas: listaTallas,
            totalTallas: listaTallas.length || 1
        });

        await nuevo.save();
        res.json(nuevo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Liberar Inventario (Reset para el Supervisor)
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

// 5. Actualizar Progreso (Desde la App del Operador)
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

// 6. Asignar Operador e Inicio de Tiempo
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

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`✅ Servidor ejecutándose en puerto ${PORT}`);
});