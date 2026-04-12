'use strict';

// ── State ─────────────────────────────────────────────────────
let currentTanggal = '';
let roomsData = []; // array of { id, nama_kamar, entries: [...] }
let nextTempId = -1; // for rooms created client-side without id

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Set date input to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('tanggal-input').value = today;
  currentTanggal = today;
  loadJadwal(today);

  bindEvents();
});

// ── Event Bindings ───────────────────────────────────────────
function bindEvents() {
  document.getElementById('tanggal-input').addEventListener('change', e => {
    currentTanggal = e.target.value;
    loadJadwal(currentTanggal);
  });

  document.getElementById('btn-tambah-kamar').addEventListener('click', openAddRoomModal);
  document.getElementById('btn-hapus-jadwal').addEventListener('click', confirmDeleteAllJadwal);

  document.getElementById('btn-simpan').addEventListener('click', simpanJadwal);
  document.getElementById('btn-preview').addEventListener('click', previewPesan);
  document.getElementById('btn-kirim').addEventListener('click', kirimTelegram);

  // Preview modal
  document.getElementById('close-preview').addEventListener('click', closePreviewModal);
  document.getElementById('close-preview-2').addEventListener('click', closePreviewModal);
  document.getElementById('preview-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closePreviewModal();
  });
  document.getElementById('copy-preview').addEventListener('click', copyPreviewText);

  // Add room modal
  document.getElementById('close-add-room').addEventListener('click', closeAddRoomModal);
  document.getElementById('cancel-add-room').addEventListener('click', closeAddRoomModal);
  document.getElementById('confirm-add-room').addEventListener('click', confirmAddRoom);
  document.getElementById('nama-kamar-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmAddRoom();
  });
  document.getElementById('add-room-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeAddRoomModal();
  });

  // Confirm modal
  document.getElementById('close-confirm').addEventListener('click', closeConfirmModal);
  document.getElementById('cancel-confirm').addEventListener('click', closeConfirmModal);
  document.getElementById('confirm-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeConfirmModal();
  });

  // Move entry modal
  document.getElementById('move-entry-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeMoveEntryModal();
  });
  document.getElementById('close-move-entry').addEventListener('click', closeMoveEntryModal);
  document.getElementById('cancel-move-entry').addEventListener('click', closeMoveEntryModal);
}

// ── Load Jadwal ───────────────────────────────────────────────
async function loadJadwal(tanggal) {
  try {
    const res = await fetch(`/api/jadwal/${tanggal}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    roomsData = (data.rooms || []).map(r => ({
      id: r.id,
      tempId: r.id,
      nama_kamar: r.nama_kamar,
      entries: (r.entries || []).map(e => ({ ...e, tempId: e.id }))
    }));
    renderRooms();
  } catch (err) {
    showToast('Gagal memuat data: ' + err.message, 'error');
  }
}

// ── Render ───────────────────────────────────────────────────
function renderRooms() {
  const container = document.getElementById('rooms-container');
  const emptyState = document.getElementById('empty-state');

  // Remove all room cards
  container.querySelectorAll('.room-card').forEach(el => el.remove());

  if (roomsData.length === 0) {
    emptyState.style.display = '';
    return;
  }
  emptyState.style.display = 'none';

  roomsData.forEach((room, roomIdx) => {
    const card = document.createElement('div');
    card.className = 'room-card';
    card.dataset.roomIdx = roomIdx;
    card.innerHTML = `
      <div class="room-header">
        <input class="room-name-input" value="${escHtml(room.nama_kamar)}" data-room-idx="${roomIdx}">
        <div class="room-header-actions">
          <button class="btn-action btn-up" data-action="move-room-up" data-room-idx="${roomIdx}" title="Pindah ke atas">▲</button>
          <button class="btn-action btn-down" data-action="move-room-down" data-room-idx="${roomIdx}" title="Pindah ke bawah">▼</button>
          <button class="btn btn-danger-outline btn-sm" data-action="delete-room" data-room-idx="${roomIdx}" title="Hapus kamar">🗑 Hapus Kamar</button>
        </div>
      </div>
      <div class="table-scroll">
        <table class="entry-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Jam</th>
              <th>Status</th>
              <th>Nama</th>
              <th>JK</th>
              <th>Umur</th>
              <th>Sat.</th>
              <th>RM</th>
              <th>Diagnosis</th>
              <th>Plan</th>
              <th>DPJP</th>
              <th>Pendamping</th>
              <th>Operator</th>
              <th>Asisten</th>
              <th>Onloop</th>
              <th class="action-col">Aksi</th>
            </tr>
          </thead>
          <tbody class="entry-rows" data-room-idx="${roomIdx}">
          </tbody>
        </table>
      </div>
      <div class="room-footer">
        <button class="btn btn-secondary btn-sm" data-action="add-entry" data-room-idx="${roomIdx}">+ Baris</button>
      </div>
    `;
    container.appendChild(card);

    // Render entries
    renderEntries(roomIdx);

    // Bind room-level events
    card.querySelector('.room-name-input').addEventListener('input', e => {
      roomsData[roomIdx].nama_kamar = e.target.value;
    });

    card.querySelector('[data-action="delete-room"]').addEventListener('click', () => {
      confirmDeleteRoom(roomIdx);
    });

    card.querySelector('[data-action="add-entry"]').addEventListener('click', () => {
      addEntry(roomIdx);
    });

    card.querySelector('[data-action="move-room-up"]').addEventListener('click', () => {
      moveRoom(roomIdx, -1);
    });

    card.querySelector('[data-action="move-room-down"]').addEventListener('click', () => {
      moveRoom(roomIdx, +1);
    });
  });
}

function renderEntries(roomIdx) {
  const room = roomsData[roomIdx];
  const tbody = document.querySelector(`.entry-rows[data-room-idx="${roomIdx}"]`);
  if (!tbody) return;
  tbody.innerHTML = '';

  room.entries.forEach((entry, entryIdx) => {
    const tr = document.createElement('tr');
    tr.dataset.entryIdx = entryIdx;

    tr.innerHTML = `
      <td class="td-no">${entryIdx + 1}</td>
      <td><input class="cell-input" data-field="jam" value="${escHtml(entry.jam || '')}" placeholder="08.30"></td>
      <td>
        <select class="cell-select" data-field="status_pasien">
          <option value="">Rawat Inap</option>
          <option value="ODC" ${entry.status_pasien === 'ODC' ? 'selected' : ''}>ODC</option>
          <option value="FT1" ${entry.status_pasien === 'FT1' ? 'selected' : ''}>FT1</option>
          <option value="FT2" ${entry.status_pasien === 'FT2' ? 'selected' : ''}>FT2</option>
        </select>
      </td>
      <td><input class="cell-input" data-field="nama" value="${escHtml(entry.nama || '')}" placeholder="Nama"></td>
      <td>
        <select class="cell-select" data-field="jenis_kelamin">
          <option value="L" ${(entry.jenis_kelamin || 'L') === 'L' ? 'selected' : ''}>L</option>
          <option value="P" ${entry.jenis_kelamin === 'P' ? 'selected' : ''}>P</option>
        </select>
      </td>
      <td><input class="cell-input cell-num" data-field="umur" value="${entry.umur != null ? entry.umur : ''}" placeholder="0" type="number" min="0"></td>
      <td>
        <select class="cell-select" data-field="satuan_umur">
          <option value="thn" ${(entry.satuan_umur || 'thn') === 'thn' ? 'selected' : ''}>thn</option>
          <option value="bln" ${entry.satuan_umur === 'bln' ? 'selected' : ''}>bln</option>
        </select>
      </td>
      <td><input class="cell-input" data-field="no_rm" value="${escHtml(entry.no_rm || '')}" placeholder="RM"></td>
      <td><input class="cell-input" data-field="diagnosis" value="${escHtml(entry.diagnosis || '')}" placeholder="Dx"></td>
      <td><input class="cell-input" data-field="plan" value="${escHtml(entry.plan || '')}" placeholder="Plan"></td>
      <td><input class="cell-input" data-field="dpjp" value="${escHtml(entry.dpjp || '')}" placeholder="DPJP"></td>
      <td><input class="cell-input" data-field="pendamping" value="${escHtml(entry.pendamping || '')}" placeholder="Pendamping"></td>
      <td><input class="cell-input" data-field="operator" value="${escHtml(entry.operator || '')}" placeholder="Operator"></td>
      <td><input class="cell-input" data-field="asisten" value="${escHtml(entry.asisten || '')}" placeholder="Asisten"></td>
      <td><input class="cell-input" data-field="onloop" value="${escHtml(entry.onloop || '')}" placeholder="Onloop"></td>
      <td class="action-col">
        <button class="btn-action btn-up" data-action="move-up" title="Pindah atas">▲</button>
        <button class="btn-action btn-down" data-action="move-down" title="Pindah bawah">▼</button>
        <button class="btn-action btn-move" data-action="move-entry" title="Pindah ke kamar lain" data-room-idx="${roomIdx}" data-entry-idx="${entryIdx}">↪</button>
        <button class="btn-action btn-delete" data-action="delete-entry" title="Hapus">🗑</button>
      </td>
    `;

    // Bind input/select changes
    tr.querySelectorAll('.cell-input, .cell-select').forEach(input => {
      input.addEventListener('input', e => {
        const field = e.target.dataset.field;
        roomsData[roomIdx].entries[entryIdx][field] = e.target.value;
      });
      input.addEventListener('change', e => {
        const field = e.target.dataset.field;
        roomsData[roomIdx].entries[entryIdx][field] = e.target.value;
      });
    });

    // Action buttons
    tr.querySelector('[data-action="move-up"]').addEventListener('click', () => moveEntry(roomIdx, entryIdx, -1));
    tr.querySelector('[data-action="move-down"]').addEventListener('click', () => moveEntry(roomIdx, entryIdx, +1));
    tr.querySelector('[data-action="move-entry"]').addEventListener('click', () => openMoveEntryModal(roomIdx, entryIdx));
    tr.querySelector('[data-action="delete-entry"]').addEventListener('click', () => deleteEntry(roomIdx, entryIdx));

    tbody.appendChild(tr);
  });
}

// ── Entry Operations ─────────────────────────────────────────
function addEntry(roomIdx) {
  roomsData[roomIdx].entries.push({
    tempId: nextTempId--,
    nomor_urut: roomsData[roomIdx].entries.length + 1,
    jam: '',
    status_pasien: '',
    nama: '',
    jenis_kelamin: 'L',
    umur: null,
    satuan_umur: 'thn',
    no_rm: '',
    diagnosis: '',
    plan: '',
    dpjp: '',
    pendamping: '',
    operator: '',
    asisten: '',
    onloop: ''
  });
  renderEntries(roomIdx);
}

function moveEntry(roomIdx, entryIdx, direction) {
  const entries = roomsData[roomIdx].entries;
  const newIdx = entryIdx + direction;
  if (newIdx < 0 || newIdx >= entries.length) return;
  const temp = entries[entryIdx];
  entries[entryIdx] = entries[newIdx];
  entries[newIdx] = temp;
  renderEntries(roomIdx);
}

function deleteEntry(roomIdx, entryIdx) {
  roomsData[roomIdx].entries.splice(entryIdx, 1);
  renderEntries(roomIdx);
}

// ── Move Entry to Another Room ───────────────────────────────
let _moveEntryContext = null; // { fromRoomIdx, fromEntryIdx }

function openMoveEntryModal(fromRoomIdx, fromEntryIdx) {
  const otherRooms = roomsData
    .map((r, i) => ({ r, i }))
    .filter(({ i }) => i !== fromRoomIdx);

  if (otherRooms.length === 0) {
    showToast('Tidak ada kamar lain untuk dipindahkan', 'error');
    return;
  }

  _moveEntryContext = { fromRoomIdx, fromEntryIdx };

  const list = document.getElementById('move-room-list');
  list.innerHTML = '';
  otherRooms.forEach(({ r, i }) => {
    const btn = document.createElement('button');
    btn.className = 'move-room-item';
    btn.textContent = r.nama_kamar;
    btn.dataset.targetRoomIdx = i;
    btn.addEventListener('click', () => {
      const targetRoomIdx = parseInt(btn.dataset.targetRoomIdx, 10);
      doMoveEntry(_moveEntryContext.fromRoomIdx, _moveEntryContext.fromEntryIdx, targetRoomIdx);
      closeMoveEntryModal();
    });
    list.appendChild(btn);
  });

  document.getElementById('move-entry-modal').style.display = 'flex';
}

function closeMoveEntryModal() {
  document.getElementById('move-entry-modal').style.display = 'none';
  _moveEntryContext = null;
}

function doMoveEntry(fromRoomIdx, fromEntryIdx, toRoomIdx) {
  const entry = roomsData[fromRoomIdx].entries.splice(fromEntryIdx, 1)[0];
  if (!entry) return;
  entry.nomor_urut = roomsData[toRoomIdx].entries.length + 1;
  roomsData[toRoomIdx].entries.push(entry);
  renderRooms(); // re-render all rooms so both are correct
}

function moveRoom(roomIdx, direction) {
  const newIdx = roomIdx + direction;
  if (newIdx < 0 || newIdx >= roomsData.length) return;
  const temp = roomsData[roomIdx];
  roomsData[roomIdx] = roomsData[newIdx];
  roomsData[newIdx] = temp;
  renderRooms();
}

// ── Room Operations ───────────────────────────────────────────
function openAddRoomModal() {
  document.getElementById('nama-kamar-input').value = '';
  document.getElementById('add-room-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('nama-kamar-input').focus(), 50);
}

function closeAddRoomModal() {
  document.getElementById('add-room-modal').style.display = 'none';
}

function confirmAddRoom() {
  const nama = document.getElementById('nama-kamar-input').value.trim();
  if (!nama) {
    showToast('Nama kamar tidak boleh kosong', 'error');
    return;
  }
  roomsData.push({
    id: null,
    tempId: nextTempId--,
    nama_kamar: nama,
    entries: []
  });
  closeAddRoomModal();
  renderRooms();
}

function confirmDeleteRoom(roomIdx) {
  showConfirm('Hapus kamar "' + roomsData[roomIdx].nama_kamar + '" beserta seluruh isinya?', () => {
    roomsData.splice(roomIdx, 1);
    renderRooms();
  });
}

function confirmDeleteAllJadwal() {
  showConfirm('Hapus seluruh jadwal untuk tanggal ini? Tindakan ini tidak bisa dibatalkan.', () => {
    roomsData = [];
    renderRooms();
    deleteJadwalFromServer();
  });
}

async function deleteJadwalFromServer() {
  try {
    const res = await fetch(`/api/jadwal/${currentTanggal}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
    showToast('Jadwal berhasil dihapus');
  } catch (err) {
    showToast('Gagal menghapus: ' + err.message, 'error');
  }
}

// ── API Actions ───────────────────────────────────────────────
async function simpanJadwal() {
  if (!currentTanggal) return;
  try {
    const payload = roomsData.map(room => ({
      id: room.id,
      nama_kamar: room.nama_kamar,
      entries: room.entries.map(e => ({
        id: e.id,
        nomor_urut: e.nomor_urut,
        jam: e.jam,
        status_pasien: e.status_pasien,
        nama: e.nama,
        jenis_kelamin: e.jenis_kelamin,
        umur: e.umur,
        satuan_umur: e.satuan_umur,
        no_rm: e.no_rm,
        diagnosis: e.diagnosis,
        plan: e.plan,
        dpjp: e.dpjp,
        pendamping: e.pendamping,
        operator: e.operator,
        asisten: e.asisten,
        onloop: e.onloop
      }))
    }));

    const res = await fetch('/api/jadwal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tanggal: currentTanggal, rooms: payload })
    });
    if (!res.ok) throw new Error(await res.text());

    // Reload to get real IDs
    showToast('Jadwal berhasil disimpan!');
    await loadJadwal(currentTanggal);
  } catch (err) {
    showToast('Gagal menyimpan: ' + err.message, 'error');
  }
}

async function previewPesan() {
  if (!currentTanggal) return;
  try {
    // Save first so preview is up to date
    await simpanJadwalQuiet();
    const res = await fetch(`/api/preview/${currentTanggal}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    document.getElementById('preview-text').textContent = data.message;
    document.getElementById('preview-modal').style.display = 'flex';
  } catch (err) {
    showToast('Gagal preview: ' + err.message, 'error');
  }
}

async function simpanJadwalQuiet() {
  const payload = roomsData.map(room => ({
    id: room.id,
    nama_kamar: room.nama_kamar,
    entries: room.entries.map(e => ({
      id: e.id,
      nomor_urut: e.nomor_urut,
      jam: e.jam,
      status_pasien: e.status_pasien,
      nama: e.nama,
      jenis_kelamin: e.jenis_kelamin,
      umur: e.umur,
      satuan_umur: e.satuan_umur,
      no_rm: e.no_rm,
      diagnosis: e.diagnosis,
      plan: e.plan,
      dpjp: e.dpjp,
      pendamping: e.pendamping,
      operator: e.operator,
      asisten: e.asisten,
      onloop: e.onloop
    }))
  }));
  await fetch('/api/jadwal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tanggal: currentTanggal, rooms: payload })
  });
}

async function kirimTelegram() {
  if (!currentTanggal) return;
  const btn = document.getElementById('btn-kirim');
  btn.disabled = true;
  btn.textContent = 'Mengirim...';
  try {
    // Save first
    await simpanJadwalQuiet();
    const res = await fetch(`/api/kirim-telegram/${currentTanggal}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Unknown error');
    }
    showToast('Pesan berhasil dikirim ke Telegram!');
  } catch (err) {
    showToast('Gagal kirim Telegram: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📲 Kirim ke Telegram';
  }
}

// ── Preview Modal ─────────────────────────────────────────────
function closePreviewModal() {
  document.getElementById('preview-modal').style.display = 'none';
}

function copyPreviewText() {
  const text = document.getElementById('preview-text').textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Teks berhasil disalin!');
  }).catch(() => {
    showToast('Gagal menyalin teks', 'error');
  });
}

// ── Confirm Modal ─────────────────────────────────────────────
let _confirmCallback = null;

function showConfirm(message, callback) {
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-modal').style.display = 'flex';
  _confirmCallback = callback;
  document.getElementById('ok-confirm').onclick = () => {
    closeConfirmModal();
    if (_confirmCallback) _confirmCallback();
  };
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').style.display = 'none';
  _confirmCallback = null;
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast toast-' + type;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// ── Helpers ───────────────────────────────────────────────────
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
