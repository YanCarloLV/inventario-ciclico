

// ==========================================
// server.js - Versión 7.0 (Integración con Victoria - Gemini AI)
// ==========================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const webpush = require('web-push'); // 🔔 LIBRERÍA PARA NOTIFICACIONES
const { GoogleGenerativeAI } = require('@google/generative-ai'); // 🤖 LIBRERÍA PARA GEMINI AI

const app = express();
const PORT = process.env.PORT || 10000; 

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- 🤖 CONFIGURACIÓN DE VICTORIA (GEMINI AI) ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'MI_LLAVE_GEMINI';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- 🔔 CONFIGURACIÓN DE NOTIFICACIONES PUSH (VAPID KEYS) ---
const publicVapidKey = process.env.PUBLIC_VAPID_KEY || 'Reemplaza_Esto_Con_Tu_Clave_Publica';
const privateVapidKey = process.env.PRIVATE_VAPID_KEY || 'Reemplaza_Esto_Con_Tu_Clave_Privada';

try {
    webpush.setVapidDetails(
        'mailto:admin@tuempresa.com', // Cambia esto por tu correo real
        publicVapidKey,
        privateVapidKey
    );
    console.log("🔔 Servicio de Notificaciones Push Configurado.");
} catch (e) {
    console.warn("⚠️ Web Push desactivado: Las VAPID Keys no son válidas o no se han configurado.");
}

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
        if (!await Counter.findById('pedido_wms_id')) await new Counter({ _id: 'pedido_wms_id', secuencia: 0 }).save(); 
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
// 3. MODELOS DE ALMACÉN, WMS PEDIDOS, PUSH Y ETIQUETADO
// ==========================================

const EtiquetadoSchema = new mongoose.Schema({
    idProyecto: { type: String, default: "global" },
    datos: { type: Array, default: [] }
});
const Etiquetado = mongoose.model('Etiquetado', EtiquetadoSchema);

const SuscripcionPushSchema = new mongoose.Schema({
    operador: String,
    suscripcion: Object,
    fechaSuscripcion: { type: Date, default: Date.now }
});
const SuscripcionPush = mongoose.model('SuscripcionPush', SuscripcionPushSchema);

const KardexSchema = new mongoose.Schema({
    llave: String, modelo: String, color: String, talla: String, lote: String,
    cantidad: { type: Number, default: 0 }, ultimaActualizacion: String,
    sku: { type: String, default: null } 
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

const PedidoSchema = new mongoose.Schema({
    folio: String, 
    numeroPedido: String, 
    prioridad: { type: String, default: 'Normal' }, 
    estatus: { type: String, default: 'Pendiente' }, 
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
        sku: { type: String, default: null } 
    }]
});
const Pedido = mongoose.model('Pedido', PedidoSchema);


// ==========================================
// 🤖 ENDPOINT DE VICTORIA AI (GEMINI)
// ==========================================
app.post('/api/victoria-chat', async (req, res) => {
    try {
        const { pregunta, contextoKardex } = req.body;

        // Validar que exista la pregunta
        if (!pregunta) {
            return res.status(400).json({ respuesta: "Por favor, hazme una pregunta." });
        }

        // Configurar el modelo de Gemini (usamos flash por ser rápido y eficiente)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Construir el prompt de sistema dándole personalidad a Victoria y el contexto del Kardex
        const prompt = `
        Eres Victoria, una asistente virtual amigable, profesional y supereficiente diseñada para ayudar a los operadores y supervisores del sistema WMS (Warehouse Management System).
        Tu tono debe ser resolutivo, amable y directo.
        
        A continuación, te proporciono los datos en tiempo real del Kardex (inventario actual):
        ${JSON.stringify(contextoKardex)}

        El usuario te hace la siguiente pregunta o petición: "${pregunta}"
        
        Instrucciones:
        1. Responde a la pregunta basándote ÚNICAMENTE en la información del Kardex proporcionada.
        2. Si te preguntan por stock de un modelo, suma las piezas si están en diferentes lotes y da un total claro.
        3. Si la información solicitada no está en el contexto del Kardex, indica amablemente que no tienes esos datos en este momento.
        4. Mantén tus respuestas concisas, fáciles de leer y profesionales. Puedes usar emojis relacionados al almacén (📦, 👔, 🔍).
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textoRespuesta = response.text();

        // Devolvemos el JSON exacto que espera tu frontend almacen.html
        res.json({ respuesta: textoRespuesta });

    } catch (error) {
        console.error("Error en Victoria AI:", error);
        res.status(500).json({ 
            respuesta: "Ups, tuve un problema de conexión con mi núcleo de procesamiento. Por favor, intenta de nuevo en un momento. 🔌" 
        });
    }
});


// ==========================================
// 🔔 ENDPOINTS PARA NOTIFICACIONES PUSH
// ==========================================

app.post('/api/suscribir-push', async (req, res) => {
    try {
        const { operador, suscripcion } = req.body;
        await SuscripcionPush.findOneAndUpdate(
            { operador: operador },
            { suscripcion: suscripcion, fechaSuscripcion: new Date() },
            { upsert: true, new: true }
        );
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/enviar-notificacion', async (req, res) => {
    try {
        const { titulo, mensaje, urlAccion } = req.body;
        const payload = JSON.stringify({ titulo, mensaje, urlAccion });

        const suscripciones = await SuscripcionPush.find();
        
        const promesas = suscripciones.map(sub => 
            webpush.sendNotification(sub.suscripcion, payload).catch(err => {
                console.error(`Error enviando notificación a ${sub.operador}:`, err.message);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    return SuscripcionPush.findByIdAndDelete(sub._id);
                }
            })
        );

        await Promise.all(promesas);
        res.status(200).json({ success: true, enviados: suscripciones.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ==========================================
// 🏷️ ENDPOINTS PARA ETIQUETADO EN NUBE
// ==========================================
app.get('/api/etiquetado', async (req, res) => {
    try {
        let proyecto = await Etiquetado.findOne({ idProyecto: "global" });
        if (!proyecto) {
            proyecto = await Etiquetado.create({ idProyecto: "global", datos: [] });
        }
        res.json(proyecto.datos);
    } catch (error) {
        console.error("Error al cargar etiquetado:", error);
        res.status(500).json({ error: 'Error al obtener progreso' });
    }
});

app.post('/api/etiquetado', async (req, res) => {
    try {
        await Etiquetado.findOneAndUpdate(
            { idProyecto: "global" },
            { datos: req.body },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Error al guardar etiquetado:", error);
        res.status(500).json({ error: 'Error al guardar progreso' });
    }
});


// ==========================================
// ENDPOINTS DE WMS Y PEDIDOS
// ==========================================

app.get('/api/stock-general', async (req, res) => {
    try {
        const stock = await Kardex.aggregate([
            {
                $group: {
                    _id: { modelo: "$modelo", color: "$color", talla: "$talla" },
                    cantidad: { $sum: "$cantidad" },
                    sku: { $first: "$sku" }
                }
            },
            {
                $project: {
                    _id: 0,
                    modelo: "$_id.modelo",
                    color: "$_id.color",
                    talla: "$_id.talla",
                    cantidad: 1,
                    sku: 1
                }
            }
        ]);
        res.json(stock);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/pedidos', async (req, res) => {
    try { res.json(await Pedido.find().sort({ _id: -1 })); } 
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/asignar-pedido', async (req, res) => {
    try { 
        await Pedido.findOneAndUpdate({ folio: req.body.folio }, { asignadoA: req.body.operador, estatus: "En Proceso" }); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/lotes-disponibles', async (req, res) => {
    try {
        const { modelo, color, talla } = req.query;
        const llave = `${modelo.trim().toUpperCase()}_${color.trim().toUpperCase()}_${talla.trim().toUpperCase()}`;
        const lotes = await Kardex.find({ llave, cantidad: { $gt: 0 } });
        res.json(lotes.map(l => ({ lote: l.lote, cantidad: l.cantidad })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/actualizar-pedido', async (req, res) => {
    try {
        const { folio, items } = req.body;
        await Pedido.findOneAndUpdate({ folio }, { items });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/finalizar-pedido-wms', async (req, res) => {
    try {
        const { folio, items, operador } = req.body;
        const fechaMty = new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });
        const horaFinStr = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Monterrey', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        for (let item of items) {
            if (item.surtido > 0 && item.loteOrigen) {
                const cantSurtida = parseFloat(item.surtido);
                
                if (cantSurtida > item.cantidadSolicitada) {
                    return res.status(400).json({ 
                        error: `Validación fallida: El artículo ${item.modelo} talla ${item.talla} excede la cantidad solicitada.` 
                    });
                }

                const llave = `${item.modelo.trim().toUpperCase()}_${item.color.trim().toUpperCase()}_${item.talla.trim().toUpperCase()}`;
                const kardexItemValidacion = await Kardex.findOne({ llave, lote: item.loteOrigen.trim().toUpperCase() });
                
                if (!kardexItemValidacion || kardexItemValidacion.cantidad < cantSurtida) {
                    return res.status(400).json({ 
                        error: `Stock insuficiente: El lote ${item.loteOrigen} no tiene suficientes piezas.` 
                    });
                }
            }
        }

        const pedidoOriginal = await Pedido.findOne({ folio });
        const folioRealSAP = (pedidoOriginal && pedidoOriginal.numeroPedido) ? pedidoOriginal.numeroPedido : folio;

        await Pedido.findOneAndUpdate({ folio }, { items, estatus: 'Completado', horaFin: horaFinStr });

        let docTeorico = await Teorico.findById('teorico_maestro');
        const counterMov = await Counter.findByIdAndUpdate('movimiento_id', { $inc: { secuencia: 1 } }, { new: true, upsert: true });
        const baseFolioMov = 'MOV-' + counterMov.secuencia.toString().padStart(6, '0');

        for (let item of items) {
            if (item.surtido > 0 && item.loteOrigen) {
                const llave = `${item.modelo.trim().toUpperCase()}_${item.color.trim().toUpperCase()}_${item.talla.trim().toUpperCase()}`;
                const loteSeguro = item.loteOrigen.trim().toUpperCase();
                const cantSurtida = parseFloat(item.surtido);

                let kardexItem = await Kardex.findOne({ llave, lote: loteSeguro });
                if (kardexItem) {
                    kardexItem.cantidad -= cantSurtida;
                    kardexItem.ultimaActualizacion = fechaMty;
                    await kardexItem.save();
                }

                if (docTeorico) {
                    let actualTeorico = docTeorico.datos.get(llave) || 0;
                    let nuevoTeorico = actualTeorico - cantSurtida;
                    docTeorico.datos.set(llave, nuevoTeorico < 0 ? 0 : nuevoTeorico);
                }

                await new Movimiento({
                    folio: baseFolioMov + '-WMS',
                    tipo: 'Salida (Surtido WMS)',
                    llave: llave,
                    modelo: item.modelo.trim().toUpperCase(), color: item.color.trim().toUpperCase(), 
                    talla: item.talla.trim().toUpperCase(), lote: loteSeguro,
                    cantidad: cantSurtida,
                    referencia: `Surtido de Pedido ${folioRealSAP}`,
                    responsable: operador,
                    fecha: fechaMty
                }).save();
            }
        }
        
        if (docTeorico) await docTeorico.save();
        res.json({ success: true });

    } catch (e) { res.status(500).json({ error: e.message }); }
});

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
        const listaTallasConTeorico = listaTallasStr.map(t => ({ talla: t, teorico: mapaTeorico.get(`${modelo.trim().toUpperCase()}_${color.trim().toUpperCase()}_${t.toUpperCase()}`) || 0 }));
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
// ENDPOINTS DE ALMACÉN (KARDEX VIVO)
// ==========================================

app.post('/api/cargar-skus', async (req, res) => {
    try {
        const { skus } = req.body;
        if (!skus || !Array.isArray(skus)) {
            return res.status(400).json({ error: "Datos inválidos. Se esperaba un arreglo de SKUs." });
        }

        let bulkOps = skus.map(item => ({
            updateMany: {
                filter: { llave: item.llave },
                update: { $set: { sku: item.sku } }
            }
        }));

        let actualizados = 0;
        if (bulkOps.length > 0) {
            const result = await Kardex.bulkWrite(bulkOps);
            actualizados = result.modifiedCount;
        }

        res.json({ success: true, message: `Se actualizaron ${actualizados} registros en el Kardex.` });
    } catch (error) {
        console.error("Error al cargar SKUs:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/kardex', async (req, res) => {
    try { res.json(await Kardex.find().sort({ llave: 1, lote: 1 })); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/historial-almacen', async (req, res) => {
    try {
        const filtro = req.query.llave ? { llave: req.query.llave } : {};
        res.json(await Movimiento.find(filtro).sort({ timestamp: -1 }).limit(1000));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/prestamos', async (req, res) => {
    try { res.json(await Prestamo.find({ estatus: "Activo" }).sort({ _id: -1 })); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/movimiento', async (req, res) => {
    try {
        const { tipo, modelo, color, talla, lote, cantidad, referencia, responsable } = req.body;
        
        const modSeguro = modelo ? modelo.trim().toUpperCase() : '';
        const colSeguro = color ? color.trim().toUpperCase() : '';
        const talSeguro = talla ? talla.trim().toUpperCase() : '';
        const loteSeguro = lote ? lote.trim().toUpperCase() : 'SIN-LOTE';
        const llave = `${modSeguro}_${colSeguro}_${talSeguro}`;

        const cantFloat = parseFloat(cantidad);
        if (cantFloat <= 0) return res.status(400).json({ error: "Cantidad inválida." });
        const fechaMty = new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });
        
        const counterMov = await Counter.findByIdAndUpdate('movimiento_id', { $inc: { secuencia: 1 } }, { new: true, upsert: true });
        const folioMov = 'MOV-' + counterMov.secuencia.toString().padStart(6, '0');

        let kardexItem = await Kardex.findOne({ llave, lote: loteSeguro });
        let docTeorico = await Teorico.findById('teorico_maestro');
        if (!docTeorico) { docTeorico = new Teorico({ _id: 'teorico_maestro', datos: {} }); }
        let actualTeorico = docTeorico.datos.get(llave) || 0;

        if (tipo === 'Entrada' || tipo === 'Devolución' || tipo === 'Ajuste Positivo' || tipo === 'Retorno de Préstamo') {
            if (kardexItem) { 
                kardexItem.cantidad += cantFloat; 
                kardexItem.ultimaActualizacion = fechaMty; 
                await kardexItem.save(); 
            } else { 
                await new Kardex({ llave, modelo: modSeguro, color: colSeguro, talla: talSeguro, lote: loteSeguro, cantidad: cantFloat, ultimaActualizacion: fechaMty }).save(); 
            }
            docTeorico.datos.set(llave, actualTeorico + cantFloat);
        } else if (tipo === 'Salida' || tipo === 'Ajuste Negativo' || tipo === 'Préstamo') {
            if (!kardexItem || kardexItem.cantidad < cantFloat) return res.status(400).json({ error: "Stock insuficiente en el lote especificado." });
            kardexItem.cantidad -= cantFloat; kardexItem.ultimaActualizacion = fechaMty;
            await kardexItem.save();
            let nuevoTeorico = actualTeorico - cantFloat; 
            docTeorico.datos.set(llave, nuevoTeorico < 0 ? 0 : nuevoTeorico);
        }

        if (tipo === 'Préstamo') {
            const counterPres = await Counter.findByIdAndUpdate('prestamo_id', { $inc: { secuencia: 1 } }, { new: true, upsert: true });
            const idPres = 'PRES-' + counterPres.secuencia.toString().padStart(5, '0');
            await new Prestamo({ idPrestamo: idPres, llave, modelo: modSeguro, color: colSeguro, talla: talSeguro, lote: loteSeguro, cantidad: cantFloat, prestatario: referencia, responsable, fechaSalida: fechaMty }).save();
        } else if (tipo === 'Retorno de Préstamo') {
            await Prestamo.findOneAndUpdate({ idPrestamo: referencia }, { estatus: "Devuelto" });
        }

        await new Movimiento({ folio: folioMov, tipo, llave, modelo: modSeguro, color: colSeguro, talla: talSeguro, lote: loteSeguro, cantidad: cantFloat, referencia, responsable, fecha: fechaMty }).save();
        await docTeorico.save();
        res.json({ success: true, folio: folioMov });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/movimiento-masivo', async (req, res) => {
    try {
        const { tipo, loteGlobal, referenciaGlobal, responsable, items } = req.body;
        
        const loteSeguro = loteGlobal ? loteGlobal.trim().toUpperCase() : 'GENERAL';

        const fechaMty = new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });
        const counter = await Counter.findByIdAndUpdate('movimiento_id', { $inc: { secuencia: 1 } }, { new: true, upsert: true });
        const folioMov = 'MOV-' + counter.secuencia.toString().padStart(6, '0');
        let docTeorico = await Teorico.findById('teorico_maestro');
        if (!docTeorico) { docTeorico = new Teorico({ _id: 'teorico_maestro', datos: {} }); }

        let procesados = 0; let errores = [];

        for (let item of items) {
            const modSeguro = item.modelo ? String(item.modelo).trim().toUpperCase() : '';
            const colSeguro = item.color ? String(item.color).trim().toUpperCase() : '';
            const talSeguro = item.talla ? String(item.talla).trim().toUpperCase() : '';
            const llave = `${modSeguro}_${colSeguro}_${talSeguro}`;
            
            const cantFloat = parseFloat(item.cantidad);
            if (isNaN(cantFloat) || cantFloat <= 0) continue;

            const nuevoMov = new Movimiento({ folio: folioMov, tipo, llave, modelo: modSeguro, color: colSeguro, talla: talSeguro, lote: loteSeguro, cantidad: cantFloat, referencia: referenciaGlobal, responsable, fecha: fechaMty });
            let kardexItem = await Kardex.findOne({ llave, lote: loteSeguro });
            let actualTeorico = docTeorico.datos.get(llave) || 0;

            if (tipo.includes('Entrada')) {
                if (kardexItem) { 
                    kardexItem.cantidad += cantFloat; 
                    kardexItem.ultimaActualizacion = fechaMty; 
                    await kardexItem.save(); 
                } else { 
                    await new Kardex({ llave, modelo: modSeguro, color: colSeguro, talla: talSeguro, lote: loteSeguro, cantidad: cantFloat, ultimaActualizacion: fechaMty }).save(); 
                }
                docTeorico.datos.set(llave, actualTeorico + cantFloat);
                await nuevoMov.save(); procesados++;
            } else if (tipo.includes('Salida')) {
                if (!kardexItem || kardexItem.cantidad < cantFloat) { errores.push(`Sin stock: ${llave} en Lote: ${loteSeguro}`); continue; }
                kardexItem.cantidad -= cantFloat; kardexItem.ultimaActualizacion = fechaMty;
                await kardexItem.save();
                let nuevoTeorico = actualTeorico - cantFloat; 
                docTeorico.datos.set(llave, nuevoTeorico < 0 ? 0 : nuevoTeorico);
                await nuevoMov.save(); procesados++;
            }
        }
        await docTeorico.save();
        res.json({ success: true, folio: folioMov, procesados, errores });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/renombrar-producto', async (req, res) => {
    try {
        const { modeloViejo, colorViejo, tallaVieja, modeloNuevo, colorNuevo } = req.body;
        if (!modeloViejo || !colorViejo || !modeloNuevo || !colorNuevo) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        const modV = modeloViejo.trim().toUpperCase();
        const colV = colorViejo.trim().toUpperCase();
        const talV = tallaVieja ? tallaVieja.trim().toUpperCase() : null; 
        const modN = modeloNuevo.trim().toUpperCase();
        const colN = colorNuevo.trim().toUpperCase();

        let filtro = { modelo: modV, color: colV };
        if (talV) filtro.talla = talV;

        const kardexItems = await Kardex.find(filtro);
        for(let item of kardexItems) {
            const nuevaLlave = `${modN}_${colN}_${item.talla}`;
            let itemExistente = await Kardex.findOne({ llave: nuevaLlave, lote: item.lote });
            
            if (itemExistente && itemExistente._id.toString() !== item._id.toString()) {
                itemExistente.cantidad += item.cantidad;
                itemExistente.ultimaActualizacion = new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });
                await itemExistente.save();
                await Kardex.findByIdAndDelete(item._id);
            } else {
                item.modelo = modN;
                item.color = colN;
                item.llave = nuevaLlave;
                await item.save();
            }
        }

        const movimientos = await Movimiento.find(filtro);
        for(let mov of movimientos) {
            mov.modelo = modN;
            mov.color = colN;
            mov.llave = `${modN}_${colN}_${mov.talla}`;
            await mov.save();
        }

        const prestamos = await Prestamo.find(filtro);
        for(let pres of prestamos) {
            pres.modelo = modN;
            pres.color = colN;
            pres.llave = `${modN}_${colN}_${pres.talla}`;
            await pres.save();
        }

        let filtroPedidos = { "items.modelo": modV, "items.color": colV };
        if (talV) filtroPedidos["items.talla"] = talV;
        
        const pedidos = await Pedido.find(filtroPedidos);
        for(let ped of pedidos) {
            let changed = false;
            ped.items.forEach(item => {
                let match = (item.modelo === modV && item.color === colV);
                if (talV && item.talla !== talV) match = false; 
                
                if(match) {
                    item.modelo = modN;
                    item.color = colN;
                    changed = true;
                }
            });
            if(changed) await ped.save();
        }

        let docTeorico = await Teorico.findById('teorico_maestro');
        if(docTeorico) {
            let mapUpdated = false;
            for (let [key, value] of docTeorico.datos.entries()) {
                const parts = key.split('_'); 
                if(parts.length >= 3) {
                    const m = parts[0];
                    const c = parts[1];
                    const t = parts.slice(2).join('_'); 
                    
                    let match = (m === modV && c === colV);
                    if (talV && t !== talV) match = false; 

                    if (match) {
                        const newKey = `${modN}_${colN}_${t}`;
                        const valorExistente = docTeorico.datos.get(newKey) || 0;
                        docTeorico.datos.delete(key);
                        docTeorico.datos.set(newKey, valorExistente + value);
                        mapUpdated = true;
                    }
                }
            }
            if(mapUpdated) await docTeorico.save();
        }

        let mensajeExito = `Producto actualizado a ${modN} - ${colN}`;
        if(talV) mensajeExito += ` (Solo aplicado a la talla ${talV})`;

        res.json({ success: true, message: mensajeExito });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => { 
    console.log(`✅ Servidor Operativo en Puerto ${PORT}`); 
});