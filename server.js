const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CONEXIÓN A MONGODB
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:Autodesk1234@inventario-ciclico.6ntlqbn.mongodb.net/?appName=Inventario-Ciclico";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🚀 Conectado a MongoDB - La base de datos es persistente"))
  .catch(err => console.error("❌ Error conectando a MongoDB:", err));

// MODELO DE DATOS
const CiclicoSchema = new mongoose.Schema({
    id: Number,
    modelo: String,
    color: String,
    tallas: [String],
    totalTallas: Number,
    conteoActual: { type: Number, default: 0 },
    progreso: { type: Number, default: 0 },
    estatus: { type: String, default: "Pendiente" },
    asignadoA: { type: String, default: null },
    resultados: { type: Array, default: [] },
    horaInicio: String,
    horaFin: String
});

const Ciclico = mongoose.model('Ciclico', CiclicoSchema);

// --- RUTAS CON MONGODB ---

// 1. Obtener todos los inventarios
app.get('/api/ciclicos', async (req, res) => {
    const inventarios = await Ciclico.find().sort({ id: -1 });
    res.json(inventarios);
});

// 2. Crear Inventario
app.post('/api/crear-ciclico', async (req, res) => {
    const { modelo, color, tallasRaw } = req.body;
    const listaTallas = tallasRaw.split(',').map(t => t.trim());
    
    const nuevo = new Ciclico({
        id: Date.now(),
        modelo,
        color,
        tallas: listaTallas,
        totalTallas: listaTallas.length
    });

    await nuevo.save();
    res.json(nuevo);
});

// 3. Apartar Inventario (Control de Colisiones)
app.post('/api/apartar-inventario', async (req, res) => {
    const { id, nombreOperador } = req.body;
    const inv = await Ciclico.findOne({ id });

    if (inv) {
        if (inv.asignadoA === null || inv.asignadoA === nombreOperador) {
            inv.estatus = "En Proceso";
            inv.asignadoA = nombreOperador;
            if (!inv.horaInicio) inv.horaInicio = new Date().toLocaleTimeString();
            await inv.save();
            res.json({ success: true, inventario: inv });
        } else {
            res.status(403).json({ success: false, message: "Ocupado por " + inv.asignadoA });
        }
    } else {
        res.status(404).json({ success: false });
    }
});

// 4. Actualizar Avance (Barra de progreso)
app.post('/api/actualizar-progreso', async (req, res) => {
    const { id, resultadosActuales } = req.body;
    const inv = await Ciclico.findOne({ id });

    if (inv) {
        inv.resultados = resultadosActuales;
        inv.conteoActual = resultadosActuales.length;
        inv.progreso = Math.round((inv.conteoActual / inv.totalTallas) * 100);
        await inv.save();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// 5. Finalizar
app.post('/api/finalizar-ciclico', async (req, res) => {
    const { id, resultados } = req.body;
    const inv = await Ciclico.findOne({ id });

    if (inv) {
        inv.estatus = "Finalizado";
        inv.resultados = resultados;
        inv.horaFin = new Date().toLocaleTimeString();
        await inv.save();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// 6. Liberar (Supervisor)
app.post('/api/liberar-inventario', async (req, res) => {
    const { id } = req.body;
    await Ciclico.findOneAndUpdate({ id }, {
        estatus: "Pendiente",
        asignadoA: null,
        progreso: 0,
        conteoActual: 0
    });
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 Servidor MongoDB Activo en puerto ${PORT}`));