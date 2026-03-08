// 1. Al crear el inventario, ahora contamos el total de tallas
app.post('/api/crear-ciclico', (req, res) => {
    const { modelo, color, tallasRaw } = req.body;
    const listaTallas = tallasRaw.split(',').map(t => t.trim());
    
    const nuevo = {
        id: Date.now(),
        modelo,
        color,
        tallas: listaTallas, // Guardamos el array de tallas
        totalTallas: listaTallas.length, // El 100%
        conteoActual: 0,
        progreso: 0,
        estatus: "Pendiente",
        asignadoA: null,
        resultados: [],
        horaInicio: null,
        horaFin: null,
        tiempoTotal: null
    };

    db.ciclicos.push(nuevo); // Guardar en tu DB o JSON
    res.json(nuevo);
});

// 2. Nueva ruta para "Apartar" el inventario (Evita colisiones)
app.post('/api/apartar-inventario', (req, res) => {
    const { id, nombreOperador } = req.body;
    const inventario = db.ciclicos.find(c => c.id === id);

    if (inventario) {
        if (inventario.estatus === "Pendiente" || inventario.asignadoA === nombreOperador) {
            inventario.estatus = "En Proceso";
            inventario.asignadoA = nombreOperador;
            if (!inventario.horaInicio) inventario.horaInicio = new Date().toLocaleTimeString();
            res.json({ success: true, inventario });
        } else {
            res.status(403).json({ success: false, message: "Ya está ocupado por " + inventario.asignadoA });
        }
    } else {
        res.status(404).json({ success: false, message: "No encontrado" });
    }
});

// 3. Actualización de progreso (Se llama cada vez que guardan una talla)
app.post('/api/actualizar-progreso', (req, res) => {
    const { id, resultadosActuales } = req.body;
    const inventario = db.ciclicos.find(c => c.id === id);

    if (inventario) {
        inventario.resultados = resultadosActuales;
        inventario.conteoActual = resultadosActuales.length;
        // Cálculo del porcentaje
        inventario.progreso = Math.round((inventario.conteoActual / inventario.totalTallas) * 100);
        res.json({ success: true, progreso: inventario.progreso });
    }
});