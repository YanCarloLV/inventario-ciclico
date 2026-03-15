// ==========================================
// server.js - Versión 6.2 (Bitácora con Folio SAP Real)
// ==========================================

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000; 

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- CONEXIÓN A BASE DE DATOS ---
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:Autodesk1234@inventario-ciclico.6ntlqbn.mongodb.net/?appName=Inventario-Ciclico";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🚀 Sistema de Datos Conectado - Zona: Monterrey, MX"))
  .catch(err => console.error("❌ Error de Conexión:", err.message));

// ==========================================
// 1. MODELOS BASE Y CONTADORES
// ==========================================
const CounterSchema = new mongoose.Schema({ _id: String, secuencia: { type: Number, default: 0 } });
const Counter = mongoose.model('Counter', CounterSchema);

async function inicializarContadores() {
    try {
        if (!await Counter.findById('inventario_id')) await new Counter({ _id: 'inventario_id', secuencia: 0 }).save();
        if (!await Counter.findById('movimiento_id')) await new Counter({ _id: 'movimiento_id', secuencia: 0 }).save();
        if (!await Counter.findById('prestamo_id')) await new Counter({ _id: 'prestamo_id', secuencia: 0 }).save();
        if (!await Counter.findById('pedido_wms_id')) await new Counter({ _id: 'pedido_wms_id', secuencia: 0 }).save(); // Nuevo contador WMS
    } catch (e) {}
}
inicializarContadores();

// ==========================================
// 2. MODELOS DE INVENTARIO CÍCLICO
// ==========================================
const TeoricoSchema = new mongoose.Schema({ _id: String, datos: { type: Map, of: Number, default: {} } });
const Teorico = mongoose.model('Teorico', TeoricoSchema);

const CiclicoSchema = new mongoose.Schema({
    id: String, modelo: String, color: String, tallas: { type: Array, default: [] },
    totalTallas: { type: Number, default: 0 }, conteoActual: { type: Number, default: 0 },
    progreso: { type: Number, default: 0 }, estatus: { type: String, default: "Pendiente" },
    asignadoA: { type: String, default: null }, resultados: { type: Array, default: [] },
    horaInicio: String, horaFin: String, fecha: String 
});
const Ciclico = mongoose.model('Ciclico', CiclicoSchema);

// ==========================================
// 3. MODELOS DE ALMACÉN Y WMS PEDIDOS
// ==========================================
const KardexSchema = new mongoose.Schema({
    llave: String, modelo: String, color: String, talla: String, lote: String,
    cantidad: { type: Number, default: 0 }, ultimaActualizacion: String
});
const Kardex = mongoose.model('Kardex', KardexSchema);

const MovimientoSchema = new mongoose.Schema({
    folio: String, tipo: String, llave: String, modelo: String, color: String,
    talla: String, lote: String, cantidad: Number, referencia: String,
    responsable: String, fecha: String, timestamp: { type: Date, default: Date.now }
});
const Movimiento = mongoose.model('Movimiento', MovimientoSchema);

const PrestamoSchema = new mongoose.Schema({
    idPrestamo: String, llave: String, modelo: String, color: String, talla: String,
    lote: String, cantidad: Number, prestatario: String, responsable: String,
    fechaSalida: String, estatus: { type: String, default: "Activo" } 
});
const Prestamo = mongoose.model('Prestamo', PrestamoSchema);

// Modelo para WMS Picking (Pedidos) - ACTUALIZADO CON numeroPedido
const PedidoSchema = new mongoose.Schema({
    folio: String, // Folio interno del sistema (Ej. WMS-00001)
    numeroPedido: String, // Folio real capturado por el supervisor (Ej. PEDIDO-101015)
    prioridad: { type: String, default: 'Normal' }, // Normal, Urgente
    estatus: { type: String, default: 'Pendiente' }, // Pendiente, En Proceso, Completado
    asignadoA: { type: String, default: null },
    totalPiezas: { type: Number, default: 0 },
    notas: String,
    fechaCreacion: String,
    horaFin: String,
    items: [{
        modelo: String, color: String, talla: String,
        cantidadSolicitada: Number,
        surtido: { type: Number, default: 0 },
        loteOrigen: { type: String, default: null },
        sku: { type: String, default: null } // Guardado silencioso del SKU
    }]
});
const Pedido = mongoose.model('Pedido', PedidoSchema);

// ==========================================
// ENDPOINTS DE WMS Y PEDIDOS
// ==========================================

// NUEVO: Semáforo Inteligente - Consulta global de stock agrupado por modelo/color/talla
app.get('/api/stock-general', async (req, res) => {
    try {
        const stock = await Kardex.aggregate([
            {
                $group: {
                    _id: { modelo: "$modelo", color: "$color", talla: "$talla" },
                    cantidad: { $sum: "$cantidad" }
                }
            },
            {
                $project: {
                    _id: 0,
                    modelo: "$_id.modelo",
                    color: "$_id.color",
                    talla: "$_id.talla",
                    cantidad: 1
                }
            }
        ]);
        res.json(stock);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Obtener todos los pedidos
app.get('/api/pedidos', async (req, res) => {
    try { res.json(await Pedido.find().sort({ _id: -1 })); } 
    catch (e) { res.status(500).json({ error: e.message }); }
});

// Operador: Apartar Pedido
app.post('/api/asignar-pedido', async (req, res) => {
    try { 
        await Pedido.findOneAndUpdate({ folio: req.body.folio }, { asignadoA: req.body.operador, estatus: "En Proceso" }); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Operador: Consulta Inteligente de Lotes disponibles en Kardex para una Talla
app.get('/api/lotes-disponibles', async (req, res) => {
    try {
        const { modelo, color, talla } = req.query;
        const llave = `${modelo.trim()}_${color.trim()}_${talla.trim()}`;
        // Buscar solo lotes que tengan más de 0 piezas
        const lotes = await Kardex.find({ llave, cantidad: { $gt: 0 } });
        res.json(lotes.map(l => ({ lote: l.lote, cantidad: l.cantidad })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Operador: Guardar avance parcial del surtido
app.post('/api/actualizar-pedido', async (req, res) => {
    try {
        const { folio, items } = req.body;
        await Pedido.findOneAndUpdate({ folio }, { items });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Operador: FINALIZAR PEDIDO (Descuenta Inventario y Cierra)
app.post('/api/finalizar-pedido-wms', async (req, res) => {
    try {
        const { folio, items, operador } = req.body;
        const fechaMty = new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });
        const horaFinStr = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Monterrey', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // NUEVO: Obtener el pedido original para sacar el Folio SAP (numeroPedido)
        const pedidoOriginal = await Pedido.findOne({ folio });
        const folioRealSAP = (pedidoOriginal && pedidoOriginal.numeroPedido) ? pedidoOriginal.numeroPedido : folio;

        // 1. Marcar pedido como Completado
        await Pedido.findOneAndUpdate({ folio }, { items, estatus: 'Completado', horaFin: horaFinStr });

        // 2. Descontar del Kardex y generar la historia
        let docTeorico = await Teorico.findById('teorico_maestro');
        const counterMov = await Counter.findByIdAndUpdate('movimiento_id', { $inc: { secuencia: 1 } }, { new: true, upsert: true });
        const baseFolioMov = 'MOV-' + counterMov.secuencia.toString().padStart(6, '0');

        for (let item of items) {
            if (item.surtido > 0 && item.loteOrigen) {
                const llave = `${item.modelo.trim()}_${item.color.trim()}_${item.talla.trim()}`;
                const cantSurtida = parseFloat(item.surtido);

                // Descuento en KARDEX Físico
                let kardexItem = await Kardex.findOne({ llave, lote: item.loteOrigen });
                if (kardexItem) {
                    kardexItem.cantidad -= cantSurtida;
                    kardexItem.ultimaActualizacion = fechaMty;
                    if (kardexItem.cantidad <= 0) await Kardex.findByIdAndDelete(kardexItem._id); 
                    else await kardexItem.save();
                }

                // Descuento en TEÓRICO GLOBAL
                if (docTeorico) {
                    let actualTeorico = docTeorico.datos.get(llave) || 0;
                    let nuevoTeorico = actualTeorico - cantSurtida;
                    docTeorico.datos.set(llave, nuevoTeorico < 0 ? 0 : nuevoTeorico);
                }

                // Generar MOVIMIENTO Log (Salida por Surtido) - AHORA CON REFERENCIA REAL
                await new Movimiento({
                    folio: baseFolioMov + '-WMS',
                    tipo: 'Salida (Surtido WMS)',
                    llave: llave,
                    modelo: item.modelo, color: item.color, talla: item.talla, lote: item.loteOrigen,
                    cantidad: cantSurtida,
                    referencia: `Surtido de Pedido ${folioRealSAP}`, // <--- AQUÍ ESTÁ EL CAMBIO
                    responsable: operador,
                    fecha: fechaMty
                }).save();
            }
        }
        
        if (docTeorico) await docTeorico.save();
        res.json({ success: true });

    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Crear Pedido desde Supervisor - ACTUALIZADO para recibir numeroPedido
app.post('/api/crear-pedido', async (req, res) => {
    try {
        const { numeroPedido, prioridad, notas, items } = req.body;
        const counter = await Counter.findByIdAndUpdate('pedido_wms_id', { $inc: { secuencia: 1 } }, { new: true, upsert: true });
        const folio = 'WMS-' + counter.secuencia.toString().padStart(5, '0');
        const fechaMty = new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });
        
        let totalPz = items.reduce((sum, item) => sum + parseInt(item.cantidadSolicitada || 0), 0);

        const nuevoPedido = new Pedido({
            folio, numeroPedido, prioridad: prioridad || 'Normal', notas, totalPiezas: totalPz, items, fechaCreacion: fechaMty
        });
        await nuevoPedido.save();
        res.json({ success: true, folio });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// ==========================================
// ENDPOINTS DE INVENTARIO CÍCLICO
// ==========================================
app.post('/api/teorico', async (req, res) => {
    try {
        await Teorico.findOneAndUpdate({ _id: 'teorico_maestro' }, { datos: req.body }, { upsert: true, new: true });
        res.json({ success: true, conteo: Object.keys(req.body).length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ciclicos', async (req, res) => {
    try { res.json(await Ciclico.find().sort({ _id: -1 })); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/crear-ciclico', async (req, res) => {
    try {
        const { modelo, color, tallasRaw } = req.body;
        const fechaMty = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Monterrey', day: '2-digit', month: '2-digit', year: 'numeric' });
        const counter = await Counter.findByIdAndUpdate('inventario_id', { $inc: { secuencia: 1 } }, { new: true, upsert: true });
        const idLargo = '#' + counter.secuencia.toString().padStart(8, '0');
        let docTeorico = await Teorico.findById('teorico_maestro');
        let mapaTeorico = docTeorico ? docTeorico.datos : new Map();
        const listaTallasStr = tallasRaw.split(',').map(t => t.trim()).filter(t => t !== "");
        const listaTallasConTeorico = listaTallasStr.map(t => ({ talla: t, teorico: mapaTeorico.get(`${modelo.trim()}_${color.trim()}_${t}`) || 0 }));
        const nuevoRegistro = new Ciclico({ id: idLargo, modelo, color, tallas: listaTallasConTeorico, totalTallas: listaTallasConTeorico.length || 1, fecha: fechaMty });
        await nuevoRegistro.save(); res.json(nuevoRegistro);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/liberar-inventario', async (req, res) => {
    try { await Ciclico.findOneAndUpdate({ id: req.body.id }, { estatus: "Pendiente", asignadoA: null, progreso: 0, conteoActual: 0, resultados: [], horaInicio: null, horaFin: null }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/actualizar-progreso', async (req, res) => {
    try {
        const { id, progreso, conteoActual, resultados, horaFin, estatus } = req.body;
        const up = { progreso, conteoActual, resultados };
        if (horaFin) up.horaFin = horaFin; if (estatus) up.estatus = estatus;
        await Ciclico.findOneAndUpdate({ id: id }, up); res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/asignar-operador', async (req, res) => {
    try { await Ciclico.findOneAndUpdate({ id: req.body.id }, { asignadoA: req.body.operador, estatus: "En Proceso", horaInicio: req.body.horaInicio }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/eliminar-ciclico/:id', async (req, res) => {
    try { await Ciclico.findOneAndDelete({ id: req.params.id }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/eliminar-todos-finalizados', async (req, res) => {
    try { const r = await Ciclico.deleteMany({ estatus: "Finalizado" }); res.json({ success: true, conteo: r.deletedCount }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// ENDPOINTS DE ALMACÉN
// ==========================================
app.get('/api/kardex', async (req, res) => {
    try { res.json(await Kardex.find().sort({ llave: 1, lote: 1 })); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/historial-almacen', async (req, res) => {
    try {
        // Filtrado inteligente: si mandan "llave", trae solo la historia de ese producto
        const filtro = req.query.llave ? { llave: req.query.llave } : {};
        res.json(await Movimiento.find(filtro).sort({ timestamp: -1 }).limit(1000));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/prestamos', async (req, res) => {
    try { res.json(await Prestamo.find({ estatus: "Activo" }).sort({ _id: -1 })); } catch (e) { res.status(500).json({ error: e.message }); }
});

// Movimiento Individual General (Incluye Préstamos y Ajustes +/-)
app.post('/api/movimiento', async (req, res) => {
    try {
        const { tipo, modelo, color, talla, lote, cantidad, referencia, responsable } = req.body;
        const llave = `${modelo.trim()}_${color.trim()}_${talla.trim()}`;
        const cantFloat = parseFloat(cantidad);
        if (cantFloat <= 0) return res.status(400).json({ error: "Cantidad inválida." });
        const fechaMty = new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });
        
        const counterMov = await Counter.findByIdAndUpdate('movimiento_id', { $inc: { secuencia: 1 } }, { new: true, upsert: true });
        const folioMov = 'MOV-' + counterMov.secuencia.toString().padStart(6, '0');

        let kardexItem = await Kardex.findOne({ llave, lote });
        let docTeorico = await Teorico.findById('teorico_maestro');
        if (!docTeorico) { docTeorico = new Teorico({ _id: 'teorico_maestro', datos: {} }); }
        let actualTeorico = docTeorico.datos.get(llave) || 0;

        // LÓGICA DE KARDEX Y TEÓRICO
        if (tipo === 'Entrada' || tipo === 'Devolución' || tipo === 'Ajuste Positivo' || tipo === 'Retorno de Préstamo') {
            if (kardexItem) { kardexItem.cantidad += cantFloat; kardexItem.ultimaActualizacion = fechaMty; await kardexItem.save(); } 
            else { await new Kardex({ llave, modelo, color, talla, lote, cantidad: cantFloat, ultimaActualizacion: fechaMty }).save(); }
            docTeorico.datos.set(llave, actualTeorico + cantFloat);
        } else if (tipo === 'Salida' || tipo === 'Ajuste Negativo' || tipo === 'Préstamo') {
            if (!kardexItem || kardexItem.cantidad < cantFloat) return res.status(400).json({ error: "Stock insuficiente en el lote." });
            kardexItem.cantidad -= cantFloat; kardexItem.ultimaActualizacion = fechaMty;
            if (kardexItem.cantidad <= 0) await Kardex.findByIdAndDelete(kardexItem._id); else await kardexItem.save();
            let nuevoTeorico = actualTeorico - cantFloat; docTeorico.datos.set(llave, nuevoTeorico < 0 ? 0 : nuevoTeorico);
        }

        // LÓGICA ESPECIAL PARA PRÉSTAMOS
        if (tipo === 'Préstamo') {
            const counterPres = await Counter.findByIdAndUpdate('prestamo_id', { $inc: { secuencia: 1 } }, { new: true, upsert: true });
            const idPres = 'PRES-' + counterPres.secuencia.toString().padStart(5, '0');
            await new Prestamo({ idPrestamo: idPres, llave, modelo, color, talla, lote, cantidad: cantFloat, prestatario: referencia, responsable, fechaSalida: fechaMty }).save();
        } else if (tipo === 'Retorno de Préstamo') {
            await Prestamo.findOneAndUpdate({ idPrestamo: referencia }, { estatus: "Devuelto" });
        }

        await new Movimiento({ folio: folioMov, tipo, llave, modelo, color, talla, lote, cantidad: cantFloat, referencia, responsable, fecha: fechaMty }).save();
        await docTeorico.save();
        res.json({ success: true, folio: folioMov });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Movimiento Masivo (Excel)
app.post('/api/movimiento-masivo', async (req, res) => {
    try {
        const { tipo, loteGlobal, referenciaGlobal, responsable, items } = req.body;
        const fechaMty = new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });
        const counter = await Counter.findByIdAndUpdate('movimiento_id', { $inc: { secuencia: 1 } }, { new: true, upsert: true });
        const folioMov = 'MOV-' + counter.secuencia.toString().padStart(6, '0');
        let docTeorico = await Teorico.findById('teorico_maestro');
        if (!docTeorico) { docTeorico = new Teorico({ _id: 'teorico_maestro', datos: {} }); }

        let procesados = 0; let errores = [];

        for (let item of items) {
            const llave = `${item.modelo.trim()}_${item.color.trim()}_${item.talla.trim()}`;
            const cantFloat = parseFloat(item.cantidad);
            if (isNaN(cantFloat) || cantFloat <= 0) continue;

            const nuevoMov = new Movimiento({ folio: folioMov, tipo, llave, modelo: item.modelo.trim(), color: item.color.trim(), talla: item.talla.trim(), lote: loteGlobal, cantidad: cantFloat, referencia: referenciaGlobal, responsable, fecha: fechaMty });
            let kardexItem = await Kardex.findOne({ llave, lote: loteGlobal });
            let actualTeorico = docTeorico.datos.get(llave) || 0;

            if (tipo.includes('Entrada')) {
                if (kardexItem) { kardexItem.cantidad += cantFloat; kardexItem.ultimaActualizacion = fechaMty; await kardexItem.save(); } 
                else { await new Kardex({ llave, modelo: item.modelo.trim(), color: item.color.trim(), talla: item.talla.trim(), lote: loteGlobal, cantidad: cantFloat, ultimaActualizacion: fechaMty }).save(); }
                docTeorico.datos.set(llave, actualTeorico + cantFloat);
                await nuevoMov.save(); procesados++;
            } else if (tipo.includes('Salida')) {
                if (!kardexItem || kardexItem.cantidad < cantFloat) { errores.push(`Sin stock: ${llave}`); continue; }
                kardexItem.cantidad -= cantFloat; kardexItem.ultimaActualizacion = fechaMty;
                if (kardexItem.cantidad <= 0) await Kardex.findByIdAndDelete(kardexItem._id); else await kardexItem.save();
                let nuevoTeorico = actualTeorico - cantFloat; docTeorico.datos.set(llave, nuevoTeorico < 0 ? 0 : nuevoTeorico);
                await nuevoMov.save(); procesados++;
            }
        }
        await docTeorico.save();
        res.json({ success: true, folio: folioMov, procesados, errores });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(PORT, () => { console.log(`✅ Servidor Operativo en Puerto ${PORT}`); });