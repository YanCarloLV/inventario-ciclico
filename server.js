const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// Datos de prueba (puedes cambiarlos o añadir más)
let ciclicos = [
  { id: 128, modelo: "4040", color: "Negro", fecha: "28/02/26", tallas: ["36R", "38R", "40R", "42R", "44R"], estatus: "Pendiente", realizadoPor: null, resultados: [], horaInicio: null, horaFin: null, tiempoTotal: null },
  { id: 129, modelo: "33739", color: "Navy", fecha: "28/02/26", tallas: ["36R", "38R", "40R"], estatus: "Pendiente", realizadoPor: null, resultados: [], horaInicio: null, horaFin: null, tiempoTotal: null }
];

app.get("/api/ciclicos", (req, res) => res.json(ciclicos));

app.post("/api/finalizar-conteo", (req, res) => {
  const { id, realizadoPor, resultados, horaInicioStr, horaFinStr, duracionMinutos } = req.body;
  const index = ciclicos.findIndex(c => c.id === id);

  if (index !== -1) {
    ciclicos[index].estatus = "Finalizado";
    ciclicos[index].realizadoPor = realizadoPor;
    ciclicos[index].resultados = resultados;
    // Ahora guardamos directamente los textos que manda el celular
    ciclicos[index].horaInicio = horaInicioStr; 
    ciclicos[index].horaFin = horaFinStr;
    ciclicos[index].tiempoTotal = `${duracionMinutos} min`;

    console.log(`✅ Cíclico ${id} guardado con éxito.`);
    return res.json({ success: true });
  }
  res.status(404).json({ success: false });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor activo`));