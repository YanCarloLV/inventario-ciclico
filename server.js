// ==========================================
// server.js - Versión 2.0 Pro (IDs Secuenciales y Garantía de Zona Horaria)
// ==========================================

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURACIÓN DE MONGODB ATLAS ---
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:Autodesk1234@inventario-ciclico.6ntlqbn.mongodb.net/?appName=Inventario-Ciclico";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🚀 Conexión establecida de forma segura con MongoDB Atlas"))
  .catch(err => console.error("❌ Error grave de conexión a base de datos:", err.message));


// ==========================================
// A. NUEVO MODELO DE DATOS: CONTADOR SECUENCIAL
// ==========================================
const CounterSchema = new mongoose.Schema({
    _id: String,
    secuencia: Number
});
const Counter = mongoose.model('Counter', CounterSchema);

// Función de inicialización automática del contador
async function inicializarContador() {
    try {
        const existente = await Counter.findById('inventario_id');
        if (!existente) {
            const nuevoContador = new Counter({ _id: 'inventario_id', secuencia: 0 });
            await nuevoContador.save();
            console.log("ℹ️ Contador de IDs inicializado en base de datos.");
        }
    } catch (e) {
        console.error("❌ Error al inicializar contador:", e.message);
    }
}
inicializarContador(); // Ejecutar al arrancar servidor


// ==========================================
// B. MODELO DE DATOS PRINCIPAL: INVENTARIO CÍCLICO
// ==========================================
const CiclicoSchema = new mongoose.Schema({
    // ID será un String para guardar el formato #00000001
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
    // La fecha por defecto también garantizará Monterrey al crearse
    fecha: String 
});

const Ciclico = mongoose.model('Ciclico', CiclicoSchema);


// ==========================================
// RUTAS DE LA API - CRUD COMPLETO
// ==========================================

// 1. Obtener todos los inventarios
app.get('/api/ciclicos', async (req, res) => {
    try {
        const inventarios = await Ciclico.find().sort({ id: -1 });
        res.json(inventarios);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener datos: " + error.message });
    }
});

// 2. Crear Nuevo Inventario (IDS Secuenciales y Fecha Local Garantizada)
app.post('/api/crear-ciclico', async (req, res) => {
    try {
        const { modelo, color, tallasRaw } = req.body;
        
        // --- Cálculo Garantizado de Zona Horaria (Monterrey, MX) ---
        const now = new Date();
        const formatterFecha = new Intl.DateTimeFormat('es-MX', {
            timeZone: 'America/Monterrey',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const fechaMexicoStr = formatterFecha.format(now); // Ejemplo: "09/03/2026"

        // --- Obtención y Aumento Seguro del ID Secuencial ---
        // findAndUpdate garantiza que no haya duplicados al leer y aumentar al mismo tiempo
        const counterUpdated = await Counter.findByIdAndUpdate(
            'inventario_id', 
            { $inc: { secuencia: 1 } }, 
            { new: true, upsert: true }
        );

        // Formatear el número como String de 8 dígitos con ceros a la izquierda
        const idFormateado = '#' + counterUpdated.secuencia.toString().padStart(8, '0');
        console.log(`💡 Generando inventario #${counterUpdated.secuencia} (${idFormateado})`);

        const listaTallas = tallasRaw.split(',').map(t => t.trim()).filter(t => t !== "");

        const nuevo = new Ciclico({
            id: idFormateado, 
            modelo,
            color,
            tallas: listaTallas,
            totalTallas: listaTallas.length || 1,
            fecha: fechaMexicoStr // Usamos la fecha calculada para la zona horaria
        });

        await nuevo.save();
        res.json(nuevo);
    } catch (error) {
        res.status(500).json({ error: "Error en la creación: " + error.message });
    }
});

// 3. Liberar Inventario (Reset para el Supervisor)
app.post('/api/liberar-inventario', async (req, res) => {
    try {
        const { id } = req.body;
        await Ciclico.findOneAndUpdate({ id: id }, {
            estatus: "Pendiente",
            asignadoA: null,
            progreso: 0,
            conteoActual: 0,
            resultados: [],
            horaInicio: null,
            horaFin: null
        });
        res.json({ success: true, message: "Inventario liberado exitosamente." });
    } catch (e) {
        res.status(500).json({ error: "Error al liberar: " + e.message });
    }
});

// 4. Actualizar Progreso (Desde la App del Operador)
app.post('/api/actualizar-progreso', async (req, res) => {
    try {
        // Al recibir horaFin o Estatus Finalizado, nos aseguramos que el servidor use Monterrey
        const { id, progreso, conteoActual, resultados, horaFin, estatus } = req.body;
        
        const updateData = { progreso, conteoActual, resultados };
        if (horaFin) updateData.horaFin = horaFin;
        if (estatus) updateData.estatus = estatus;

        await Ciclico.findOneAndUpdate({ id: id }, updateData);
        res.json({ success: true, message: "Progreso sincronizado." });
    } catch (e) {
        res.status(500).json({ error: "Error en sincronización: " + e.message });
    }
});

// 5. Asignar Operador e Inicio de Tiempo
app.post('/api/asignar-operador', async (req, res) => {
    try {
        const { id, operador, horaInicio } = req.body;
        await Ciclico.findOneAndUpdate({ id: id }, {
            asignadoA: operador,
            estatus: "En Proceso",
            horaInicio: horaInicio
        });
        res.json({ success: true, message: "Inventario asignado al operador." });
    } catch (e) {
        res.status(500).json({ error: "Error en asignación: " + e.message });
    }
});

// 6. ELIMINAR UN INVENTARIO INDIVIDUAL DEL HISTORIAL
app.delete('/api/eliminar-ciclico/:id', async (req, res) => {
    try {
        // mongoose usa findOneAndDelete cuando buscas por una propiedad diferente a _id
        await Ciclico.findOneAndDelete({ id: req.params.id });
        console.log(`🗑️ Registro ${req.params.id} eliminado del historial.`);
        res.json({ success: true, message: "Registro eliminado." });
    } catch (e) {
        res.status(500).json({ error: "Error al eliminar: " + e.message });
    }
});

// 7. ELIMINAR TODO EL HISTORIAL FINALIZADO (BORRADO MASIVO)
app.delete('/api/eliminar-todos-finalizados', async (req, res) => {
    try {
        // Borramos todos los que coincidan con la condición estatus === Finalizado
        const resultado = await Ciclico.deleteMany({ estatus: "Finalizado" });
        console.log(`⚠️ Se han borrado ${resultado.deletedCount} registros finalizados de la base de datos.`);
        res.json({ success: true, message: "Limpieza de historial completada.", conteo: resultado.deletedCount });
    } catch (e) {
        res.status(500).json({ error: "Error en borrado masivo: " + e.message });
    }
});

// Iniciar Servidor en puerto 10000 o el que designe Render
app.listen(PORT, () => {
    console.log(`✅ Servidor Ciclicos Pro ejecutándose perfectamente en puerto ${PORT}`);
});