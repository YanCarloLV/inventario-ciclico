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

// Catálogo Maestro 
// Usamos strict: false por si el seed.js añade campos extras como 'sku' o 'familia'
const CatalogoSchema = new mongoose.Schema({
    modelo: String,
    color: String
}, { strict: false });

const Ciclico = mongoose.model('Ciclico', CiclicoSchema);
const Catalogo = mongoose.model('Catalogo', CatalogoSchema, 'catalogo'); 


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

// 2. OBTENER CATÁLOGO (Alimenta los selectores del Supervisor)
app.get('/api/catalogo', async (req, res) => {
    try {
        // Buscamos todo el catálogo para que el Supervisor filtre dinámicamente
        const items = await Catalogo.find().sort({ modelo: 1 });
        console.log(`📦 Catálogo solicitado: ${items.length} productos encontrados.`);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: "Error al cargar el catálogo" });
    }
});

// 3. Crear Nuevo Inventario
app.post('/api/crear-ciclico', async (req, res) => {
    try {
        const { modelo, color, tallasRaw } = req.body;
        
        // Convertir string de tallas a Array y limpiar espacios
        let listaTallas = [];
        if (Array.isArray(tallasRaw)) {
            listaTallas = tallasRaw;
        } else {
            listaTallas = tallasRaw.split(',').map(t => t.trim()).filter(t => t !== "");
        }

        const nuevo = new Ciclico({
            id: Date.now(), 
            modelo,
            color,
            tallas: listaTallas,
            totalTallas: listaTallas.length || 1,
            estatus: "Pendiente",
            progreso: 0,
            conteoActual: 0,
            resultados: []
        });

        await nuevo.save();
        console.log(`✨ Inventario Creado: ${modelo} - ${color}`);
        res.json(nuevo);
    } catch (error) {
        console.error("❌ Error al crear cíclico:", error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Liberar Inventario (Reset)
app.post('/api/liberar-inventario', async (req, res) => {
    try {
        const { id } = req.body;
        // Buscamos por el campo 'id' numérico, no por el _id de Mongo
        await Ciclico.findOneAndUpdate({ id: Number(id) }, {
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
        
        const updateData = { 
            progreso: Number(progreso), 
            conteoActual: Number(conteoActual), 
            resultados 
        };
        
        if (horaFin) updateData.horaFin = horaFin;
        if (estatus) updateData.estatus = estatus;

        const doc = await Ciclico.findOneAndUpdate({ id: Number(id) }, updateData, { new: true });
        res.json({ success: true, doc });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6. Asignar Operador
app.post('/api/asignar-operador', async (req, res) => {
    try {
        const { id, operador, horaInicio } = req.body;
        await Ciclico.findOneAndUpdate({ id: Number(id) }, {
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