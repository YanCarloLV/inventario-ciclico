const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// Base de datos temporal
let ciclicos = [
  { id: 128, modelo: "4040", color: "Negro", fecha: "28/02/26", tallas: ["36R", "38R", "40R", "42R", "44R"], estatus: "Pendiente", realizadoPor: null, resultados: [] },
  { id: 129, modelo: "33739", color: "Navy", fecha: "28/02/26", tallas: ["36R", "38R", "40R"], estatus: "Pendiente", realizadoPor: null, resultados: [] }
];

// Obtener cíclicos pendientes (para el móvil)
app.get("/api/ciclicos", (req, res) => {
  res.json(ciclicos);
});

// Recibir conteo terminado desde el móvil
app.post("/api/finalizar-conteo", (req, res) => {
  const { id, realizadoPor, resultados } = req.body;
  
  const index = ciclicos.findIndex(c => c.id === id);
  if (index !== -1) {
    ciclicos[index].estatus = "Finalizado";
    ciclicos[index].realizadoPor = realizadoPor;
    ciclicos[index].resultados = resultados;
    console.log(`✅ Cíclico ${id} finalizado por ${realizadoPor}`);
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, message: "Cíclico no encontrado" });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});