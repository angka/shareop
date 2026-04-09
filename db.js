const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'shareop.db');
const db = new Database(dbPath);

// Initialize database tables
function initDB() {
  // operation_dates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL UNIQUE
    )
  `);

  // operation_rooms table
  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal_id INTEGER REFERENCES operation_dates(id),
      nama_kamar TEXT NOT NULL,
      urutan INTEGER NOT NULL
    )
  `);

  // operation_entries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER REFERENCES operation_rooms(id),
      nomor_urut INTEGER NOT NULL,
      jam TEXT,
      status_pasien TEXT,
      nama TEXT NOT NULL,
      jenis_kelamin TEXT CHECK(jenis_kelamin IN ('L','P')),
      umur INTEGER,
      satuan_umur TEXT DEFAULT 'thn' CHECK(satuan_umur IN ('thn','bln')),
      no_rm TEXT,
      diagnosis TEXT,
      plan TEXT,
      dpjp TEXT,
      pendamping TEXT,
      operator TEXT,
      asisten TEXT,
      onloop TEXT
    )
  `);
}

// Get or create date entry
function getOrCreateDate(tanggal) {
  let row = db.prepare('SELECT id FROM operation_dates WHERE tanggal = ?').get(tanggal);
  if (!row) {
    const info = db.prepare('INSERT INTO operation_dates (tanggal) VALUES (?)').run(tanggal);
    row = { id: info.lastInsertRowid };
  }
  return row.id;
}

// Get jadwal for a specific date
function getJadwalByTanggal(tanggal) {
  const dateId = getOrCreateDate(tanggal);

  // Get rooms for this date, ordered by urutan
  const rooms = db.prepare(`
    SELECT r.id, r.nama_kamar, r.urutan
    FROM operation_rooms r
    WHERE r.tanggal_id = ?
    ORDER BY r.urutan
  `).all(dateId);

  // For each room, get entries ordered by nomor_urut
  const result = [];
  for (const room of rooms) {
    const entries = db.prepare(`
      SELECT *
      FROM operation_entries
      WHERE room_id = ?
      ORDER BY nomor_urut
    `).all(room.id);

    result.push({
      id: room.id,
      nama_kamar: room.nama_kamar,
      urutan: room.urutan,
      entries: entries
    });
  }

  return result;
}

// Upsert jadwal data
function upsertJadwal(tanggal, kamarData) {
  const dateId = getOrCreateDate(tanggal);

  // Begin transaction
  const transaction = db.transaction(() => {
    // Clear existing rooms and entries for this date
    db.prepare('DELETE FROM operation_entries WHERE room_id IN (SELECT id FROM operation_rooms WHERE tanggal_id = ?)').run(dateId);
    db.prepare('DELETE FROM operation_rooms WHERE tanggal_id = ?').run(dateId);

    // Insert rooms and entries
    kamarData.forEach((kamar, index) => {
      const roomInfo = db.prepare(`
        INSERT INTO operation_rooms (tanggal_id, nama_kamar, urutan)
        VALUES (?, ?, ?)
      `).run(dateId, kamar.nama_kamar, index + 1);

      const roomId = roomInfo.lastInsertRowid;

      kamar.entries.forEach((entry, entryIndex) => {
        db.prepare(`
          INSERT INTO operation_entries (
            room_id, nomor_urut, jam, status_pasien, nama, jenis_kelamin, umur,
            satuan_umur, no_rm, diagnosis, plan, dpjp, pendamping, operator, asisten, onloop
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          roomId,
          entryIndex + 1,
          entry.jam || null,
          entry.status_pasien || null,
          entry.nama,
          entry.jenis_kelamin,
          entry.umur || null,
          entry.satuan_umur || 'thn',
          entry.no_rm || null,
          entry.diagnosis || null,
          entry.plan || null,
          entry.dpjp || null,
          entry.pendamping || null,
          entry.operator || null,
          entry.asisten || null,
          entry.onloop || null
        );
      });
    });
  });

  transaction();
}

// Delete jadwal for a specific date
function deleteJadwalByTanggal(tanggal) {
  const dateInfo = db.prepare('SELECT id FROM operation_dates WHERE tanggal = ?').get(tanggal);
  if (dateInfo) {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM operation_entries WHERE room_id IN (SELECT id FROM operation_rooms WHERE tanggal_id = ?)').run(dateInfo.id);
      db.prepare('DELETE FROM operation_rooms WHERE tanggal_id = ?').run(dateInfo.id);
      db.prepare('DELETE FROM operation_dates WHERE id = ?').run(dateInfo.id);
    });
    transaction();
  }
}

module.exports = {
  initDB,
  getJadwalByTanggal,
  upsertJadwal,
  deleteJadwalByTanggal
};

// Initialize database on load
initDB();