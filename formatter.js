function getSuasana() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'pagi';
  if (hour >= 12 && hour < 15) return 'siang';
  if (hour >= 15 && hour < 18) return 'sore';
  return 'malam';
}

function formatHari(tanggal) {
  const date = new Date(tanggal + 'T00:00:00');
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()];
}

function formatTanggal(tanggal) {
  const date = new Date(tanggal + 'T00:00:00');
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
}

function buildOleh(dpjp, pendamping, operator, asisten, onloop) {
  const parts = [dpjp, pendamping, operator, asisten, onloop].filter(p => p && p.trim());
  if (parts.length === 0) return '';
  return `dr. ${parts.join('/')}`;
}

function formatEntry(entry) {
  const lines = [];

  // Baris jam + status
  let jamLine = `Jam ${entry.jam || '...'}`;
  if (entry.status_pasien && entry.status_pasien.trim()) {
    jamLine += ` (${entry.status_pasien.trim()})`;
  }
  lines.push(jamLine);

  // Baris nama/jk/umur
  const umur = entry.umur != null ? `${entry.umur}${entry.satuan_umur || 'thn'}` : '';
  const jk = entry.jenis_kelamin === 'P' ? 'P' : 'L';
  lines.push(`${entry.nama}/${jk}/${umur} ${entry.no_rm || ''}`.trim());

  // Dx
  if (entry.diagnosis && entry.diagnosis.trim()) {
    lines.push(`Dx: ${entry.diagnosis.trim()}`);
  }

  // Plan
  if (entry.plan && entry.plan.trim()) {
    lines.push(`Plan: ${entry.plan.trim()}`);
  }

  // Oleh
  const oleh = buildOleh(entry.dpjp, entry.pendamping, entry.operator, entry.asisten, entry.onloop);
  if (oleh) {
    lines.push(`Oleh: ${oleh}`);
  }

  return lines.join('\n');
}

function generateMessage(jadwal) {
  if (!jadwal) return '';

  const suasana = getSuasana();
  const hari = formatHari(jadwal.tanggal);
  const tanggal = formatTanggal(jadwal.tanggal);

  let message = `Selamat ${suasana} Mas dan Mbak.\n`;
  message += `Mohon maaf mengganggu.\n`;
  message += `Mohon izin mengirimkan rencana jadwal operasi hari ${hari}, ${tanggal}.\n\n`;

  for (const room of jadwal.rooms) {
    message += `${room.nama_kamar}\n`;

    for (let i = 0; i < room.entries.length; i++) {
      const entry = room.entries[i];
      if (!entry.nama || !entry.nama.trim()) continue;
      const lineNum = i + 1;
      message += `${lineNum}) ${formatEntry(entry)}\n\n`;
    }
  }

  message += `Apakah ada tambahan atau perubahan?\n`;
  message += `Mohon asupannya Mas dan Mbak. Terima kasih.`;

  return message;
}

module.exports = { generateMessage, getSuasana, formatHari, formatTanggal };
