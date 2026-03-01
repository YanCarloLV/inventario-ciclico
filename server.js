const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Inventario Cíclico</title>
                <style>
                    body {
                        font-family: Arial;
                        background-color: #f4f6f9;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .card {
                        background: white;
                        padding: 30px;
                        border-radius: 12px;
                        box-shadow: 0 8px 20px rgba(0,0,0,0.1);
                        text-align: center;
                    }
                    h1 {
                        margin-bottom: 10px;
                    }
                    p {
                        color: gray;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Sistema Inventario Cíclico</h1>
                    <p>Servidor funcionando correctamente 🚀</p>
                </div>
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
