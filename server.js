const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// Base de datos temporal (Empezamos con los que ya tenías)
let ciclicos = [
  { id: 128, modelo: "4040", color: "Negro", fecha: "28/02/26", tallas: ["36R", "38R", "40R", "42R", "44R"], estatus: "Pendiente", realizadoPor: null, resultados: [], horaInicio: null, horaFin: null, tiempoTotal: null }
];

// Obtener todos los cíclicos
app.get("/api/ciclicos", (req, res) => res.json(ciclicos));

// RUTA NUEVA: Crear un nuevo cíclico desde el Panel
app.post("/api/crear-ciclico", (req, res) => {
  const { modelo, color, tallasRaw } = req.body;
  
  // Convertimos el texto de tallas "36, 38, 40" en una lista real ["36", "38", "40"]
  const listaTallas = tallasRaw.split(',').map(t => t.trim()).filter(t => t !== "");

  const nuevoId = ciclicos.length > 0 ? Math.max(...ciclicos.map(c => c.id)) + 1 : 100;

  const nuevoCiclico = {
    id: nuevoId,
    modelo: modelo,
    color: color,
    fecha: new Date().toLocaleDateString('es-MX'),
    tallas: listaTallas,
    estatus: "Pendiente",
    realizadoPor: null,
    resultados: [],
    horaInicio: null,
    horaFin: null,
    tiempoTotal: null
  };

  ciclicos.push(nuevoCiclico);
  console.log(`🆕 Nuevo cíclico creado: ID ${nuevoId}`);
  res.json({ success: true });
});

// Finalizar conteo (la que ya teníamos)
app.post("/api/finalizar-conteo", (req, res) => {
  const { id, realizadoPor, resultados, horaInicioStr, horaFinStr, duracionMinutos } = req.body;
  const index = ciclicos.findIndex(c => c.id === id);
  if (index !== -1) {
    ciclicos[index].estatus = "Finalizado";
    ciclicos[index].realizadoPor = realizadoPor;
    ciclicos[index].resultados = resultados;
    ciclicos[index].horaInicio = horaInicioStr;
    ciclicos[index].horaFin = horaFinStr;
    ciclicos[index].tiempoTotal = `${duracionMinutos} min`;
    return res.json({ success: true });
  }
  res.status(404).json({ success: false });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor listo`));