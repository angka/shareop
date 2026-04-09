function formatOleh(dpjp, pendamping, operator, asisten, onloop) {
  const parts = [];
  if (dpjp) parts.push(dpjp);
  if (pendamping) parts.push(pendamping);
  if (operator) parts.push(operator);
  if (asisten) parts.push(asisten);
  if (onloop) parts.push(onloop);

  if (parts.length === 0) {
    return 'dr. ';
  }

  return `dr. ${parts.join('/')}`;
}

function formatNamaWithJK(nama, jenis_kelamin, umur, satuan_umur) {
  const jk = jenis_kelamin === 'L' ? 'L' : 'P';
  const umurText = umur !== null && umur !== '' ? `${umur}${satuan_umur || 'thn'}` : '';

  if (nama && umurText) {
    return `${nama}/${jk}/${umurText}`;
  } else if (nama) {
    return `${nama}/${jk}`;
  } else {
    return '';
  }
}

function formatJamWithStatus(jam, status_pasien) {
  if (!jam) {
    return '';
  }

  if (status_pasien && status_pasien.trim() !== '') {
    return `Jam ${jam} (${status_pasien})`;
  } else {
    return `Jam ${jam}`;
  }
}

function generateWhatsAppMessage(jadwalData, tanggal) {
  // Parse tanggal to get day name and formatted date
  const dateObj = new Date(tanggal);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = dateObj.toLocaleDateString('id-ID', options);

  // For day name, we need to get it separately since toLocaleDateString doesn't easily give just the day
  const dayOptions = { weekday: 'long' };
  const dayName = dateObj.toLocaleDateString('id-ID', dayOptions);

  let message = `Selamat pagi Mas dan Mbak.\n`;
  message += `Mohon maaf mengganggu.\n`;
  message += `Mohon izin mengirimkan rencana jadwal operasi hari ${dayName}, ${formattedDate}.\n\n`;

  // Process each room
  jadwalData.forEach((kamar, kamarIndex) => {
    if (kamarIndex > 0) {
      message += '\n';
    }

    message += `${kamar.nama_kamar}\n`;

    kamar.entries.forEach((entry, entryIndex) => {
      if (entryIndex > 0) {
        message += '\n';
      }

      const nomor = entryIndex + 1;
      message += `${nomor)}${formatJamWithStatus(entry.jam, entry.status_pasien)}\n`;

      const namaFormatted = formatNamaWithJK(
        entry.nama,
        entry.jenis_kelamin,
        entry.umur,
        entry.satuan_umur
      );
      if (namaFormatted) {
        message += `${namaFormatted} ${entry.no_rm || ''}\n`.trim();
        if (entry.no_rm) {
          message += '\n';
        }
      }

      if (entry.diagnosis) {
        message += `Dx: ${entry.diagnosis}\n`;
      }

      if (entry.plan) {
        message += `Plan: ${entry.plan}\n`;
      }

      message += `Oleh: ${formatOleh(
        entry.dpjp,
        entry.pendamping,
        entry.operator,
        entry.asisten,
        entry.onloop
      )}\n`;
    });
  });

  message += `\nApakah ada tambahan atau perubahan?\n`;
  message += `Mohon asupannya Mas dan Mbak. Terima kasih.`;

  return message;
}

module.exports = {
  generateWhatsAppMessage
};