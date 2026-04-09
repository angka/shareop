const express = require('express');
const db = require('./db');
const whatsapp = require('./whatsapp');
const formatter = require('./formatter');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/jadwal/:tanggal', async (req, res) => {
  try {
    const { tanggal } = req.params;
    const data = await db.getJadwalByTanggal(tanggal);
    res.json(data);
  } catch (error) {
    console.error('Error fetching jadwal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/jadwal', async (req, res) => {
  try {
    const { tanggal, kamarData } = req.body;
    await db.upsertJadwal(tanggal, kamarData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving jadwal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/jadwal/:tanggal', async (req, res) => {
  try {
    const { tanggal } = req.params;
    await db.deleteJadwalByTanggal(tanggal);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting jadwal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/preview/:tanggal', async (req, res) => {
  try {
    const { tanggal } = req.params;
    const data = await db.getJadwalByTanggal(tanggal);
    const message = formatter.generateWhatsAppMessage(data, tanggal);
    res.json({ message });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/kirim-whatsapp/:tanggal', async (req, res) => {
  try {
    const { tanggal } = req.params;
    const data = await db.getJadwalByTanggal(tanggal);
    const message = formatter.generateWhatsAppMessage(data, tanggal);
    await whatsapp.sendMessage(message);
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Initialize WhatsApp client
  whatsapp.initializeClient();
});