const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

let ciclicos = [
  { id: 128, modelo: "4040", color: "Negro", fecha: "28/02/26", tallas: ["36R", "38R", "40R", "42R", "44R"], estatus: "Pendiente", realizadoPor: null, resultados: [], horaInicio: null, horaFin: null, tiempoTotal: null },
  { id: 129, modelo: "33739", color: "Navy", fecha: "28/02/26", tallas: ["36R", "38R", "40R"], estatus: "Pendiente", realizadoPor: null, resultados: [], horaInicio: null, horaFin: null, tiempoTotal: null }
];

app.get("/api/ciclicos", (req, res) => res.json(ciclicos));

app.post("/api/finalizar-conteo", (req, res) => {
  const { id, realizadoPor, resultados, horaInicio, horaFin } = req.body;
  const index = ciclicos.findIndex(c => c.id === id);

  if (index !== -1) {
    // Calcular diferencia de tiempo en minutos
    const inicio = new Date(horaInicio);
    const fin = new Date(horaFin);
    const diffMs = fin - inicio;
    const diffMins = Math.round(diffMs / 60000);

    ciclicos[index].estatus = "Finalizado";
    ciclicos[index].realizadoPor = realizadoPor;
    ciclicos[index].resultados = resultados;
    ciclicos[index].horaInicio = inicio.toLocaleTimeString();
    ciclicos[index].horaFin = fin.toLocaleTimeString();
    ciclicos[index].tiempoTotal = `${diffMins} min`;

    return res.json({ success: true });
  }
  res.status(404).json({ success: false });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor activo`));