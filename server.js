require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDb, getJadwal, saveJadwal, deleteJadwal } = require('./db');
const { generateMessage } = require('./formatter');
const { initBot, kirimPesan, getBot } = require('./telegram');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ───────────────────────────────────────────────

// GET /api/jadwal/:tanggal
app.get('/api/jadwal/:tanggal', (req, res) => {
  try {
    const jadwal = getJadwal(req.params.tanggal);
    res.json(jadwal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jadwal
app.post('/api/jadwal', (req, res) => {
  try {
    const { tanggal, rooms } = req.body;
    if (!tanggal) return res.status(400).json({ error: 'tanggal required' });
    saveJadwal(tanggal, rooms || []);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jadwal/:tanggal
app.delete('/api/jadwal/:tanggal', (req, res) => {
  try {
    deleteJadwal(req.params.tanggal);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/preview/:tanggal
app.get('/api/preview/:tanggal', (req, res) => {
  try {
    const jadwal = getJadwal(req.params.tanggal);
    const message = generateMessage(jadwal);
    res.json({ message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kirim-telegram/:tanggal
app.post('/api/kirim-telegram/:tanggal', async (req, res) => {
  try {
    const bot = getBot();
    if (!bot) {
      return res.status(500).json({ error: 'Bot Telegram tidak dikonfigurasi. Set TELEGRAM_BOT_TOKEN di file .env' });
    }
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) {
      return res.status(500).json({ error: 'TELEGRAM_CHAT_ID belum diset di file .env' });
    }
    const jadwal = getJadwal(req.params.tanggal);
    const message = generateMessage(jadwal);
    await kirimPesan(chatId, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ────────────────────────────────────────────────────
async function start() {
  await initDb();
  initBot(process.env.TELEGRAM_BOT_TOKEN);
  app.listen(PORT, () => {
    console.log(`ShareOp server running at http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
