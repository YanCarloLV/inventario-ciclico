const mongoose = require('mongoose');

// Tu URI de conexión
const MONGO_URI = "mongodb+srv://admin:Autodesk1234@inventario-ciclico.6ntlqbn.mongodb.net/?appName=Inventario-Ciclico";

const CatalogoSchema = new mongoose.Schema({
    modelo: String,
    color: String
});

const Catalogo = mongoose.model('Catalogo', CatalogoSchema, 'catalogo');

const datosCatálogo = [
    // --- SUPER 120'S CLÁSICO ---
    { modelo: "C67901-1", color: "NEGRO SOLIDO" },
    { modelo: "C67901-2B", color: "NUEVO AZUL" },
    { modelo: "C67901-3", color: "GRIS OXFORD" },
    { modelo: "C67901-4", color: "GRIS LIGERO" },
    { modelo: "C67901-5A", color: "BLANCO" },
    { modelo: "C67901-11", color: "BEIGE SOLIDO" },
    { modelo: "C67901-16", color: "CAMEL" },
    { modelo: "C67901-17", color: "AZUL FRANCIA" },
    { modelo: "C67901-19", color: "AZUL CIELO" },
    { modelo: "C67901-24", color: "GRIS INGLES" },

    // --- SUPER 120'S PRIVILEGE ---
    { modelo: "G45001-1", color: "GRIS SOLIDO" },
    { modelo: "G45001-2", color: "GRIS INGLES" },
    { modelo: "G45001-3", color: "TAUPE GRANOLA" },
    { modelo: "G47815-1", color: "NEGRO SOLIDO" },
    { modelo: "G47815-2B", color: "MARINO NUEVO" },
    { modelo: "G47815-3", color: "GRIS CLARO" },
    { modelo: "G47815-4A", color: "NUEVO BEIGE" },
    { modelo: "G47815-5", color: "BLANCO NATURAL" },
    { modelo: "G47815-5A", color: "BLANCO" },
    { modelo: "G47815-8", color: "CAFE SOLIDO" },
    { modelo: "G47815-9", color: "AZUL LIGERO" },
    { modelo: "G47815-10", color: "VERDE BOSQUE" },
    { modelo: "G47815-11", color: "OLIVO SOLIDO" },
    { modelo: "G47815-12", color: "VINO" },
    { modelo: "G47815-16", color: "CAMEL SOLIDO" },
    { modelo: "G47815-17", color: "AZUL FRANCES" },
    { modelo: "G47815-18", color: "AZUL PLUMA" },
    { modelo: "G47815-19", color: "AZUL INDIGO" },
    { modelo: "G47815-20", color: "VERDE HUNTER" },
    { modelo: "G47815-30", color: "ROSA" },
    { modelo: "G47815-50", color: "VERDE AZULADO" },
    { modelo: "G49412-1", color: "OXFORD SOLIDO" },
    { modelo: "G49412-2", color: "GRIS MEDIO" },

    // --- PRIVILEGE COLLECTION (A CUADROS) ---
    { modelo: "679683-2", color: "TAUPE ENTRE CRUZADO" },
    { modelo: "679727-1", color: "OXFORD AZUL" },
    { modelo: "679728-1", color: "AZUL MALVA" },
    { modelo: "679729-1", color: "AZUL NEGRO" },
    { modelo: "679730-1", color: "MARINO A CUADROS" },
    { modelo: "679731-1", color: "AZUL A CUADROS" },
    { modelo: "679732-1", color: "GRIS CLARO AZUL" },
    { modelo: "679733-1", color: "AZUL OXIDADO" },
    { modelo: "679733-2", color: "GRIS AZUL" },
    { modelo: "679734-1", color: "CAMELLO AZUL" },

    // --- SUPER 140'S ---
    { modelo: "M40901-1", color: "NEGRO" },
    { modelo: "M40901-2A", color: "MARINO" },
    { modelo: "M40901-2B", color: "MARINO SOLIDO" },
    { modelo: "M40901-6", color: "AZUL FRANCIA" },
    { modelo: "M40901-9", color: "AZUL CIELO" },
    { modelo: "M46306-3", color: "CHARCOAL" },
    { modelo: "M46306-1", color: "GRIS" },
    { modelo: "M46306-2", color: "GRIS" },
    { modelo: "M46306-4", color: "GRIS CLARO" },
    { modelo: "M46306-5", color: "TAUPE" },
    { modelo: "M40901-8", color: "CAFE" },
    { modelo: "M40901-7", color: "TAUPE" },
    { modelo: "M40901-16", color: "CAMEL" },
    { modelo: "M40901-11", color: "BEIGE" },
    { modelo: "M87183-2", color: "AZUL CIELO" },
    { modelo: "M87853-1", color: "MARINO A CUADROS" },
    { modelo: "M46500-1", color: "GRIS OJO DE PAJARO" },
    { modelo: "M46500-2", color: "AZUL OJO DE PAJARO" },
    { modelo: "M46501-3", color: "GRIS CLARO" },
    { modelo: "M46501-4", color: "TAUPE OJO DE PAJARO" },
    { modelo: "M46501-5", color: "AZUL CLARO" },
    { modelo: "M78200-4", color: "AZUL CLARO" },
    { modelo: "M78200-5", color: "AZUL PIEL DE TIBURON" },
    { modelo: "M87164-1", color: "TINTA AZUL" },
    { modelo: "M87184-1", color: "NEGRO A RALLAS" },
    { modelo: "M87184-2", color: "MARINO A RALLAS" },
    { modelo: "M87184-3", color: "GRIS A RALLAS" },
    { modelo: "M87130-1", color: "MARINO A RALLAS" },
    { modelo: "M87185-1", color: "GRIS CLARO" },
    { modelo: "M87185-2", color: "BEIGE PIEL DE TIBURON" },
    { modelo: "M87817-1", color: "MARINO HARRINGBONE" },
    { modelo: "M87817-2B", color: "MARINO" },
    { modelo: "M87855-1", color: "GRIS CAFE" },
    { modelo: "M87856-1", color: "GRIS AZUL TARTÁN" },
    { modelo: "M87857-1", color: "MARINO" },
    { modelo: "M87858-1", color: "OXFORD AZUL" },
    { modelo: "M87859-1", color: "AZUL A CUADROS" },
    { modelo: "M87860-1", color: "AZUL TAUPE" },
    { modelo: "M87860-2", color: "CAFE CAMELLO" },
    { modelo: "M87861-1", color: "MARINO A CUADROS" },

    // --- LANA SEDA ---
    { modelo: "B66050-1", color: "NEGRO SOLIDO" },
    { modelo: "B66050-2B", color: "MARINO" },
    { modelo: "B66051-1A", color: "GRIS SOLIDO" },
    { modelo: "B66051-2", color: "GRIS CLARO" },

    // --- SUPER 150'S CASHMERE ---
    { modelo: "E59663-1", color: "NEGRO SOLIDO" },
    { modelo: "E59663-2", color: "MARINO SOLIDO" },
    { modelo: "E59663-6", color: "AZUL SOLIDO" },
    { modelo: "E59663-3", color: "OXFORD SOLIDO" },
    { modelo: "E59663-5", color: "GRIS SOLIDO" },
    { modelo: "E59663-4", color: "GRIS CLARO" },
    { modelo: "E84586-1", color: "GRIS PIEL DE TIBURON" },
    { modelo: "E84593-1", color: "MARINO A CUADROS" },
    { modelo: "E84587-1", color: "OXFORD VINO" },
    { modelo: "E84588-1", color: "TAUPE A CUADROS" },
    { modelo: "E84589-1", color: "CAFE AZUL" },
    { modelo: "E84590-1", color: "MARINO A CUADROS" },
    { modelo: "E84591-1", color: "GRIS AZUL" },
    { modelo: "E84592-1", color: "NEGRO TONAL" },
    { modelo: "E84592-2", color: "MARINO TONAL" },
    { modelo: "E84594-1", color: "MARINO A CUADROS" },
    { modelo: "E84582-1", color: "AZUL TEAKWEAVE" },
    { modelo: "E84584-2", color: "GRIS A CUADROS" },
    { modelo: "E84584-3", color: "BEIGE A CUADROS" }
];

async function cargar() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Conectado...");
        await Catalogo.deleteMany({}); // Limpia lo anterior
        await Catalogo.insertMany(datos);
        console.log("✅ ¡Catálogo cargado con éxito!");
        process.exit();
    } catch (e) {
        console.error(e);
    }
}

cargar();