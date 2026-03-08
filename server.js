const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Render usa el puerto 10000 por defecto, pero process.env.PORT lo detecta automáticamente
const PORT = process.env.PORT || 10000; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURACIÓN DE MONGODB ---
// Intentamos leer de las variables de entorno de Render, si no, usamos tu cadena directa
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:Autodesk1234@inventario-ciclico.6ntlqbn.mongodb.net/?appName=Inventario-Ciclico";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🚀 Conectado exitosamente a MongoDB Atlas"))
  .catch(err => {
    console.error("❌ Error crítico de conexión a MongoDB:");
    console.error(err.message);
  });

// --- MODELO DE DATOS (SCHEMA) ---
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

// 1. Obtener todos los inventarios (Ordenados por el más reciente)
app.get('/api/ciclicos', async (req, res) => {
    try {
        const inventarios = await Ciclico.find().sort({ id: -1 });
        res.json(inventarios);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener datos: " + error.message });
    }
});

// 2. Crear un nuevo inventario (Desde Supervisor)
app.post('/api/crear-ciclico', async (req, res) => {
    try {
        const { modelo, color, tallasRaw } = req.body;
        // Limpiamos la lista de tallas para evitar espacios vacíos
        const listaTallas = tallasRaw.split(',').map(t => t.trim()).filter(t => t !== "");
        
        const nuevo = new Ciclico({
            id: Math.floor(Math.random() * 90) + Date.now().toString().slice(-6), // Genera un ID de 8 dígitos fácil de leer
            modelo,
            color,
            tallas: listaTallas,
            totalTallas: listaTallas.length || 1 // Evitamos división por cero más adelante
        });

        await nuevo.save();
        res.json(nuevo);
    } catch (error) {
        res.status(500).json({ error: "Error al crear inventario: " + error.message });
    }
});

// 3. Apartar Inventario (Previene que dos operadores entren al mismo)
app.post('/api/apartar-inventario', async (req, res) => {
    try {
        const { id, nombreOperador } = req.body;
        const inv = await Ciclico.findOne({ id });

        if (inv) {
            // Si nadie lo tiene asignado O es el mismo operador que ya estaba dentro
            if (!inv.asignadoA || inv.asignadoA === nombreOperador) {
                inv.estatus = "En Proceso";
                inv.asignadoA = nombreOperador;
                if (!inv.horaInicio) inv.horaInicio = new Date().toLocaleTimeString();
                await inv.save();
                res.json({ success: true, inventario: inv });
            } else {
                res.status(403).json({ success: false, message: "Este inventario ya está siendo atendido por: " + inv.asignadoA });
            }
        } else {
            res.status(404).json({ success: false, message: "Inventario no encontrado" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Actualizar Progreso (Barra de carga en tiempo real)
app.post('/api/actualizar-progreso', async (req, res) => {
    try {
        const { id, resultadosActuales } = req.body;
        const inv = await Ciclico.findOne({ id });

        if (inv) {
            inv.resultados = resultadosActuales;
            inv.conteoActual = resultadosActuales.length;
            
            // BLINDAJE ANTI-NaN: Validamos que haya tallas para dividir
            let calculoProgreso = 0;
            if (inv.totalTallas > 0) {
                calculoProgreso = Math.round((inv.conteoActual / inv.totalTallas) * 100);
            }
            
            // Forzamos que sea un número válido antes de guardar
            inv.progreso = isNaN(calculoProgreso) ? 0 : calculoProgreso;

            await inv.save();
            res.json({ success: true, progreso: inv.progreso });
        } else {
            res.status(404).json({ success: false });
        }
    } catch (error) {
        console.error("Error actualizando progreso:", error);
        res.status(500).json({ error: error.message });
    }
});

// 5. Finalizar Inventario
app.post('/api/finalizar-ciclico', async (req, res) => {
    try {
        const { id, resultados } = req.body;
        await Ciclico.findOneAndUpdate({ id }, {
            estatus: "Finalizado",
            resultados: resultados,
            horaFin: new Date().toLocaleTimeString(),
            progreso: 100
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Liberar Inventario (Botón de reset para el Supervisor)
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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Iniciar Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor en línea en puerto ${PORT}`);
    console.log(`📡 Esperando conexión a base de datos...`);
});