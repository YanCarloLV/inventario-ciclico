// ==========================================
// server.js - Versión 2.1 (Sincronización Total Monterrey)
// ==========================================

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONEXIÓN A BASE DE DATOS ---
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:Autodesk1234@inventario-ciclico.6ntlqbn.mongodb.net/?appName=Inventario-Ciclico";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🚀 Sistema de Datos Conectado - Zona: Monterrey, MX"))
  .catch(err => console.error("❌ Error de Conexión:", err.message));


// ==========================================
// MODELO DE CONTADOR PARA IDS DE 8 DÍGITOS
// ==========================================
const CounterSchema = new mongoose.Schema({
    _id: String,
    secuencia: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', CounterSchema);

async function inicializarContador() {
    try {
        const doc = await Counter.findById('inventario_id');
        if (!doc) {
            await new Counter({ _id: 'inventario_id', secuencia: 0 }).save();
            console.log("ℹ️ Contador inicializado en 0.");
        }
    } catch (e) { console.log("Error inicializando contador", e); }
}
inicializarContador();


// ==========================================
// MODELO DE INVENTARIO (ESQUEMA ROBUSTO)
// ==========================================
const CiclicoSchema = new mongoose.Schema({
    id: String,           
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
    horaFin: String,
    fecha: String 
});

const Ciclico = mongoose.model('Ciclico', CiclicoSchema);


// ==========================================
// ENDPOINTS DE LA API
// ==========================================

// 1. Obtener listado completo
app.get('/api/ciclicos', async (req, res) => {
    try {
        const datos = await Ciclico.find().sort({ _id: -1 });
        res.json(datos);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. Crear Inventario con ID de 8 Dígitos y Fecha Monterrey
app.post('/api/crear-ciclico', async (req, res) => {
    try {
        const { modelo, color, tallasRaw } = req.body;
        
        // --- Cálculo de Fecha Local (Monterrey) ---
        const hoy = new Date();
        const fechaMty = hoy.toLocaleDateString('es-MX', {
            timeZone: 'America/Monterrey',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // --- Incrementar ID Secuencial ---
        const counter = await Counter.findByIdAndUpdate(
            'inventario_id', 
            { $inc: { secuencia: 1 } }, 
            { new: true, upsert: true }
        );

        const idLargo = '#' + counter.secuencia.toString().padStart(8, '0');

        const listaTallas = tallasRaw.split(',').map(t => t.trim()).filter(t => t !== "");

        const nuevoRegistro = new Ciclico({
            id: idLargo, 
            modelo,
            color,
            tallas: listaTallas,
            totalTallas: listaTallas.length || 1,
            fecha: fechaMty 
        });

        await nuevoRegistro.save();
        res.json(nuevoRegistro);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. Liberar (Resetear) Inventario
app.post('/api/liberar-inventario', async (req, res) => {
    try {
        await Ciclico.findOneAndUpdate({ id: req.body.id }, {
            estatus: "Pendiente",
            asignadoA: null,
            progreso: 0,
            conteoActual: 0,
            resultados: [],
            horaInicio: null,
            horaFin: null
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. Actualizar Avance del Operador
app.post('/api/actualizar-progreso', async (req, res) => {
    try {
        const { id, progreso, conteoActual, resultados, horaFin, estatus } = req.body;
        const up = { progreso, conteoActual, resultados };
        if (horaFin) up.horaFin = horaFin;
        if (estatus) up.estatus = estatus;

        await Ciclico.findOneAndUpdate({ id: id }, up);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Asignar Operador
app.post('/api/asignar-operador', async (req, res) => {
    try {
        const { id, operador, horaInicio } = req.body;
        await Ciclico.findOneAndUpdate({ id: id }, {
            asignadoA: operador,
            estatus: "En Proceso",
            horaInicio: horaInicio
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. Eliminar Registro Individual
app.delete('/api/eliminar-ciclico/:id', async (req, res) => {
    try {
        // Importante: req.params.id ya trae el '#' codificado
        await Ciclico.findOneAndDelete({ id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. Borrado Masivo de Historial
app.delete('/api/eliminar-todos-finalizados', async (req, res) => {
    try {
        const r = await Ciclico.deleteMany({ estatus: "Finalizado" });
        res.json({ success: true, conteo: r.deletedCount });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor Operativo en Puerto ${PORT}`);
});