const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'shareop.db');
let db = null;

// ── Init ─────────────────────────────────────────────────────
async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS operation_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL UNIQUE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS operation_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal_id INTEGER,
      nama_kamar TEXT NOT NULL,
      urutan INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS operation_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER,
      nomor_urut INTEGER NOT NULL,
      jam TEXT DEFAULT '',
      status_pasien TEXT DEFAULT '',
      nama TEXT NOT NULL,
      jenis_kelamin TEXT DEFAULT 'L',
      umur INTEGER,
      satuan_umur TEXT DEFAULT 'thn',
      no_rm TEXT DEFAULT '',
      diagnosis TEXT DEFAULT '',
      plan TEXT DEFAULT '',
      dpjp TEXT DEFAULT '',
      pendamping TEXT DEFAULT '',
      operator TEXT DEFAULT '',
      asisten TEXT DEFAULT '',
      onloop TEXT DEFAULT ''
    )
  `);

  saveDb();
  return db;
}

function saveDb() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// ── Query helpers ────────────────────────────────────────────
// params must be an array: [val1, val2, ...]
function queryAll(sql, params) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

// args here is the spread from caller: queryOne(sql, a, b, c)
// which makes args = [a, b, c]
function queryOne(sql, ...args) {
  const results = queryAll(sql, args);
  return results.length > 0 ? results[0] : null;
}

// args here is the spread from caller: run(sql, a, b, c)
// which makes args = [a, b, c]
function run(sql, ...args) {
  const stmt = db.prepare(sql);
  stmt.bind(args);
  stmt.step();
  stmt.free();
  // Get last_insert_rowid BEFORE saveDb (saveDb -> export -> resets sqlite state)
  const lastId = db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0;
  saveDb();
  return { lastInsertRowid: lastId };
}

// ── operation_dates ──────────────────────────────────────────
function getOrCreateTanggal(tanggal) {
  const existing = queryOne('SELECT id FROM operation_dates WHERE tanggal = ?', tanggal);
  if (existing) return existing.id;
  return run('INSERT INTO operation_dates (tanggal) VALUES (?)', tanggal).lastInsertRowid;
}

function getTanggalId(tanggal) {
  const row = queryOne('SELECT id FROM operation_dates WHERE tanggal = ?', tanggal);
  return row ? row.id : null;
}

// ── operation_rooms ──────────────────────────────────────────
function createRoom(tanggalId, namaKamar, urutan) {
  return run(
    'INSERT INTO operation_rooms (tanggal_id, nama_kamar, urutan) VALUES (?, ?, ?)',
    tanggalId, namaKamar, urutan
  ).lastInsertRowid;
}

function deleteRoom(roomId) {
  run('DELETE FROM operation_entries WHERE room_id = ?', roomId);
  run('DELETE FROM operation_rooms WHERE id = ?', roomId);
}

function updateRoomName(roomId, namaKamar) {
  run('UPDATE operation_rooms SET nama_kamar = ? WHERE id = ?', namaKamar, roomId);
}

function getRoomsByTanggalId(tanggalId) {
  return queryAll('SELECT * FROM operation_rooms WHERE tanggal_id = ? ORDER BY urutan', [tanggalId]);
}

// ── operation_entries ───────────────────────────────────────
function createEntry(roomId, data) {
  return run(
    `INSERT INTO operation_entries
      (room_id, nomor_urut, jam, status_pasien, nama, jenis_kelamin, umur, satuan_umur, no_rm, diagnosis, plan, dpjp, pendamping, operator, asisten, onloop)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    roomId,
    data.nomor_urut,
    data.jam || '',
    data.status_pasien || '',
    data.nama,
    data.jenis_kelamin || 'L',
    data.umur || null,
    data.satuan_umur || 'thn',
    data.no_rm || '',
    data.diagnosis || '',
    data.plan || '',
    data.dpjp || '',
    data.pendamping || '',
    data.operator || '',
    data.asisten || '',
    data.onloop || ''
  ).lastInsertRowid;
}

function updateEntry(entryId, data) {
  run(
    `UPDATE operation_entries SET
      nomor_urut=?, jam=?, status_pasien=?, nama=?, jenis_kelamin=?,
      umur=?, satuan_umur=?, no_rm=?, diagnosis=?, plan=?,
      dpjp=?, pendamping=?, operator=?, asisten=?, onloop=?
    WHERE id=?`,
    data.nomor_urut, data.jam || '', data.status_pasien || '', data.nama,
    data.jenis_kelamin || 'L', data.umur || null, data.satuan_umur || 'thn',
    data.no_rm || '', data.diagnosis || '', data.plan || '',
    data.dpjp || '', data.pendamping || '', data.operator || '',
    data.asisten || '', data.onloop || '', entryId
  );
}

function deleteEntry(entryId) {
  run('DELETE FROM operation_entries WHERE id = ?', entryId);
}

function getEntriesByRoomId(roomId) {
  return queryAll('SELECT * FROM operation_entries WHERE room_id = ? ORDER BY nomor_urut', [roomId]);
}

// ── Full jadwal ─────────────────────────────────────────────
function getJadwal(tanggal) {
  const tanggalId = getTanggalId(tanggal);
  if (!tanggalId) return { tanggal, rooms: [] };
  const rooms = getRoomsByTanggalId(tanggalId);
  return {
    tanggal,
    rooms: rooms.map(room => ({
      ...room,
      entries: getEntriesByRoomId(room.id)
    }))
  };
}

function saveJadwal(tanggal, roomsData) {
  const tanggalId = getOrCreateTanggal(tanggal);

  const existingRooms = getRoomsByTanggalId(tanggalId);
  const existingRoomIds = new Set(existingRooms.map(r => r.id));
  const incomingIds = new Set(roomsData.filter(r => r.id).map(r => r.id));

  existingRooms.forEach(r => {
    if (!incomingIds.has(r.id)) deleteRoom(r.id);
  });

  roomsData.forEach((roomData, idx) => {
    let roomId;
    if (roomData.id) {
      run('UPDATE operation_rooms SET nama_kamar = ?, urutan = ? WHERE id = ?',
        roomData.nama_kamar, idx + 1, roomData.id);
      roomId = roomData.id;
      run('DELETE FROM operation_entries WHERE room_id = ?', roomId);
    } else {
      roomId = createRoom(tanggalId, roomData.nama_kamar, idx + 1);
    }

    (roomData.entries || []).forEach((entry, eIdx) => {
      if (entry.nama && entry.nama.trim()) {
        createEntry(roomId, { ...entry, nomor_urut: eIdx + 1 });
      }
    });
  });
}

function deleteJadwal(tanggal) {
  const tanggalId = getTanggalId(tanggal);
  if (!tanggalId) return;
  const rooms = getRoomsByTanggalId(tanggalId);
  rooms.forEach(r => deleteRoom(r.id));
  run('DELETE FROM operation_dates WHERE id = ?', tanggalId);
}

module.exports = { initDb, getJadwal, saveJadwal, deleteJadwal };
