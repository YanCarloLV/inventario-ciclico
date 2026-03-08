const express = require('express');
const mongoose = require('mongoose'); 
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// 🔗 CONEXIÓN PERMANENTE
// Pega aquí la dirección que copiaste de MongoDB
const mongoURI = "mongodb+srv://admin:Autodesk1234@inventario-ciclico.6ntlqbn.mongodb.net/?appName=Inventario-Ciclico"; 

mongoose.connect(mongoURI)
  .then(() => console.log("✅ Conectado a MongoDB - Los datos ya no se borrarán"))
  .catch(err => console.error("❌ Error al conectar:", err));

// 📝 ESTRUCTURA DE LOS DATOS
const CiclicoSchema = new mongoose.Schema({
  id: Number,
  modelo: String,
  color: String,
  fecha: String,
  tallas: [String],
  estatus: { type: String, default: "Pendiente" },
  realizadoPor: String,
  resultados: Array,
  horaInicio: String,
  horaFin: String,
  tiempoTotal: String
});

const Ciclico = mongoose.model('Ciclico', CiclicoSchema);

// --- RUTAS DEL SERVIDOR ---

// 1. Ver todos
app.get("/api/ciclicos", async (req, res) => {
  const lista = await Ciclico.find().sort({ id: -1 });
  res.json(lista);
});

// 2. Crear nuevo (Supervisor)
app.post("/api/crear-ciclico", async (req, res) => {
  const { modelo, color, tallasRaw } = req.body;
  const listaTallas = tallasRaw.split(',').map(t => t.trim()).filter(t => t !== "");
  
  const ultimo = await Ciclico.findOne().sort({ id: -1 });
  const nuevoId = ultimo ? ultimo.id + 1 : 100;

  const nuevo = new Ciclico({
    id: nuevoId,
    modelo,
    color,
    fecha: new Date().toLocaleDateString('es-MX'),
    tallas: listaTallas
  });

  await nuevo.save();
  res.json({ success: true });
});

// 3. Guardar resultado (Celular)
app.post("/api/finalizar-conteo", async (req, res) => {
  const { id, realizadoPor, resultados, horaInicioStr, horaFinStr, duracionMinutos } = req.body;
  
  await Ciclico.findOneAndUpdate({ id: id }, {
    estatus: "Finalizado",
    realizadoPor: realizadoPor,
    resultados: resultados,
    horaInicio: horaInicioStr,
    horaFin: horaFinStr,
    tiempoTotal: `${duracionMinutos} min`
  });

  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor profesional activo`));