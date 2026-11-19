const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Test endpoint for checking the server and database.
app.get('/api/health', async (req, res) => {
  try {
    // Run a simple query to check the database connection.
    const userCount = await prisma.user.count();
    res.json({ status: 'OK', message: 'Server and database are working correctly', userCount });
  } catch (error) {
    res.status(500).json({ status: 'Error', error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});