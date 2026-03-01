const express = require('express');
const app = express();
const PORT = 3000;

// Esto permite que el servidor muestre páginas web reales desde una carpeta llamada "public"
app.use(express.static('public'));
app.use(express.json());

// Nuestra base de datos temporal en memoria
let ciclicos = [
  {
    id: 128,
    modelo: "4040",
    color: "Negro",
    fecha: "28/02/26",
    tallas: ["36R", "38R", "40R", "42R", "44R"],
    estatus: "Pendiente",
    realizadoPor: null,
    resultados: []
  },
  {
    id: 129,
    modelo: "33739",
    color: "Navy",
    fecha: "28/02/26",
    tallas: ["36R", "38R", "40R"],
    estatus: "Pendiente",
    realizadoPor: null,
    resultados: []
  }
];

// Ruta para que el celular pida los datos de los inventarios
app.get("/api/ciclicos", (req, res) => {
  res.json(ciclicos);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});