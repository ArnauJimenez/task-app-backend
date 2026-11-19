const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Ruta de prueba para verificar el servidor y la BD
app.get('/api/health', async (req, res) => {
  try {
    // Intentamos hacer una consulta simple para comprobar la conexión a SQLite
    const userCount = await prisma.user.count();
    res.json({ status: 'OK', message: 'Servidor y Base de datos funcionando perfectamente', userCount });
  } catch (error) {
    res.status(500).json({ status: 'Error', error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});