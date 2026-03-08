const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000; // Render usa el 10000 por defecto

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CONEXIÓN A MONGODB
const mongoURI = "mongodb+srv://admin:Autodesk1234@inventario-ciclico.6ntlqbn.mongodb.net/?appName=Inventario-Ciclico";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🚀 Conectado a MongoDB Atlas"))
  .catch(err => console.error("❌ Error de conexión:", err));

// MODELO DE DATOS
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

// --- RUTAS BLINDADAS ---

app.get('/api/ciclicos', async (req, res) => {
    try {
        const inventarios = await Ciclico.find().sort({ id: -1 });
        res.json(inventarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/crear-ciclico', async (req, res) => {
    try {
        const { modelo, color, tallasRaw } = req.body;
        const listaTallas = tallasRaw.split(',').map(t => t.trim()).filter(t => t !== "");
        
        const nuevo = new Ciclico({
            id: Date.now(),
            modelo,
            color,
            tallas: listaTallas,
            totalTallas: listaTallas.length || 1 // Evitamos división por cero
        });

        await nuevo.save();
        res.json(nuevo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/actualizar-progreso', async (req, res) => {
    try {
        const { id, resultadosActuales } = req.body;
        const inv = await Ciclico.findOne({ id });

        if (inv) {
            inv.resultados = resultadosActuales;
            inv.conteoActual = resultadosActuales.length;
            
            // BLINDAJE: Si totalTallas es 0, el progreso es 0. Si no, calculamos.
            let calculo = 0;
            if (inv.totalTallas > 0) {
                calculo = Math.round((inv.conteoActual / inv.totalTallas) * 100);
            }
            
            // Si por alguna razón el cálculo sigue siendo NaN, forzamos a 0
            inv.progreso = isNaN(calculo) ? 0 : calculo;

            await inv.save();
            res.json({ success: true, progreso: inv.progreso });
        } else {
            res.status(404).json({ success: false, message: "No encontrado" });
        }
    } catch (error) {
        console.error("Error en progreso:", error);
        res.status(500).json({ error: error.message });
    }
});

// Ruta para apartar (Control de colisiones)
app.post('/api/apartar-inventario', async (req, res) => {
    try {
        const { id, nombreOperador } = req.body;
        const inv = await Ciclico.findOne({ id });
        if (inv) {
            if (!inv.asignadoA || inv.asignadoA === nombreOperador) {
                inv.estatus = "En Proceso";
                inv.asignadoA = nombreOperador;
                if (!inv.horaInicio) inv.horaInicio = new Date().toLocaleTimeString();
                await inv.save();
                res.json({ success: true, inventario: inv });
            } else {
                res.status(403).json({ success: false, message: "Ocupado por " + inv.asignadoA });
            }
        } else { res.status(404).json({ success: false }); }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/liberar-inventario', async (req, res) => {
    try {
        const { id } = req.body;
        await Ciclico.findOneAndUpdate({ id }, {
            estatus: "Pendiente",
            asignadoA: null,
            progreso: 0,
            conteoActual: 0,
            resultados: []
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`🚀 Servidor MongoDB Activo en puerto ${PORT}`));