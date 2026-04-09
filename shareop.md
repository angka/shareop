# ShareOp — Aplikasi Jadwal Operasi & WhatsApp Bot

## Ringkasan Proyek

ShareOp adalah aplikasi web ringan (tanpa autentikasi) untuk menyusun jadwal operasi harian, mengelola urutan pasien per kamar operasi, lalu memposting hasilnya ke grup WhatsApp dalam format pesan bot yang baku.

---

## Stack Teknologi

| Lapisan | Pilihan |
|---|---|
| Frontend | HTML + Vanilla JS (atau React jika diperlukan) |
| Database | SQLite (via `better-sqlite3` di Node.js) — ringan, tanpa server terpisah |
| Backend | Node.js + Express |
| WhatsApp | [Baileys](https://github.com/WhiskeySockets/Baileys) — tanpa Puppeteer/browser, ringan |
| Deployment | Single machine / VPS kecil |

---

## Struktur Database (SQLite)

### Tabel: `operation_dates`
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
tanggal TEXT NOT NULL UNIQUE  -- format: YYYY-MM-DD
```

### Tabel: `operation_rooms`
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
tanggal_id INTEGER REFERENCES operation_dates(id),
nama_kamar TEXT NOT NULL,       -- contoh: "PJT 1.1", "PJT 1.2"
urutan INTEGER NOT NULL         -- urutan kamar dalam satu hari
```

### Tabel: `operation_entries`
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
room_id INTEGER REFERENCES operation_rooms(id),
nomor_urut INTEGER NOT NULL,     -- urutan dalam kamar (bisa di-reorder)
jam TEXT,                        -- contoh: "08.30"
status_pasien TEXT,              -- kosong = Rawat Inap, "ODC", "FT1", "FT2"
nama TEXT NOT NULL,
jenis_kelamin TEXT CHECK(jenis_kelamin IN ('L','P')),
umur INTEGER,
satuan_umur TEXT DEFAULT 'thn' CHECK(satuan_umur IN ('thn','bln')),  -- thn = tahun, bln = bulan
no_rm TEXT,
diagnosis TEXT,
plan TEXT,
dpjp TEXT,
pendamping TEXT,
operator TEXT,
asisten TEXT,
onloop TEXT
```

---

## Format Output WhatsApp

```
Selamat pagi Mas dan Mbak.
Mohon maaf mengganggu.
Mohon izin mengirimkan rencana jadwal operasi hari {HARI}, {TANGGAL}.

{NAMA_KAMAR_1}
1)Jam {JAM} ({STATUS_PASIEN})   ← jika kosong, bagian (…) tidak ditampilkan
{NAMA}/{JK}/{UMUR}{SATUAN_UMUR} {NO_RM}   ← contoh: "Nimas/P/6thn" atau "Bayi/L/3bln"
Dx: {DIAGNOSIS}
Plan: {PLAN}
Oleh: dr. {DPJP}/{PENDAMPING}/{OPERATOR}/{ASISTEN}/{ONLOOP}

2)Jam ...
...

{NAMA_KAMAR_2}
1)Jam ...
...

Apakah ada tambahan atau perubahan?
Mohon asupannya Mas dan Mbak. Terima kasih.
```

### Aturan Kolom "Oleh":
Format: `dr. DPJP/pendamping/operator/asisten/onloop`  
Kolom yang kosong **dihilangkan** (bukan diisi tanda `-`), sehingga mendukung variasi:
- `dr. BN/` → DPJP saja
- `dr. BN/A/` → DPJP + pendamping
- `dr. BN/A/B/` → DPJP + pendamping + operator
- `dr. BN/A/B/C/` → + asisten
- `dr. BN/A/B/C/D` → lengkap

---

## Fitur Interface Web

### 1. Pemilihan Tanggal
- Kalender picker di bagian atas halaman
- Memilih tanggal memuat (atau membuat baru) data jadwal untuk hari itu

### 2. Manajemen Kamar Operasi
- Tombol **"+ Tambah Kamar"** → input nama kamar → muncul tabel baru
- Setiap tabel punya header editable (nama kamar)
- Tabel bisa dihapus (dengan konfirmasi)

### 3. Tabel Pasien
Kolom tabel:

| No | Jam | Status Pasien | Nama | JK | Umur | Sat. | RM | Diagnosis | Plan | DPJP | Pendamping | Operator | Asisten | Onloop | ▲▼🗑 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

- **Sat.** (Satuan Umur) diisi via dropdown: `thn` (default) atau `bln`

- **Status Pasien** diisi via dropdown: `(kosong) = Rawat Inap`, `ODC`, `FT1`, `FT2`
- Jika kosong (Rawat Inap), bagian `(STATUS)` **tidak ditampilkan** di output pesan WhatsApp, contoh: `Jam 13.00` bukan `Jam 13.00 ()`

- Tombol **▲ / ▼** di kolom paling kanan setiap baris untuk mengubah urutan (kolom "No" terupdate otomatis)
- Tombol **🗑** (hapus) di kolom aksi yang sama, bersebelahan dengan ▲ / ▼
- Tombol **"+ Baris"** di bawah tabel
- Semua sel **inline-editable**
- Semua tombol aksi berukuran cukup besar untuk layar sentuh (min. 44×44px touch target)

### 4. Tombol Aksi
- **"💾 Simpan"** → POST ke API, simpan ke SQLite
- **"👁 Preview Pesan"** → tampilkan modal berisi teks pesan WhatsApp yang akan dikirim
- **"📲 Kirim ke WhatsApp"** → panggil endpoint bot untuk posting ke grup

---

## Endpoint API (Express)

```
GET    /api/jadwal/:tanggal          → ambil semua data untuk tanggal tertentu
POST   /api/jadwal                   → simpan/update jadwal (upsert)
DELETE /api/jadwal/:tanggal          → hapus seluruh jadwal tanggal itu
GET    /api/preview/:tanggal         → generate teks pesan WhatsApp
POST   /api/kirim-whatsapp/:tanggal  → kirim pesan ke grup WhatsApp
```

---

## Arsitektur File Proyek

```
shareop/
├── server.js              # Express server + API routes
├── db.js                  # Koneksi & query SQLite
├── whatsapp.js            # Inisialisasi & fungsi kirim WhatsApp
├── formatter.js           # Fungsi generate teks pesan dari data DB
├── shareop.db             # File database SQLite (auto-generated)
├── public/
│   ├── index.html         # Halaman utama (SPA)
│   ├── app.js             # Logic frontend
│   └── style.css          # Tampilan
└── package.json
```

---

## Catatan Integrasi WhatsApp

- Library **Baileys** terhubung langsung ke protokol WhatsApp Web tanpa memerlukan Puppeteer atau Chromium — jauh lebih hemat RAM (~10–20 MB).
- Autentikasi dilakukan dengan scan QR code sekali saat pertama dijalankan; kredensial sesi disimpan lokal sebagai file JSON sehingga tidak perlu scan ulang.
- Target pengiriman adalah **ID grup WhatsApp** yang didapat saat bot pertama kali terhubung.
- Baileys bersifat unofficial — WhatsApp tidak mengizinkan bot di platformnya secara resmi, sehingga ada risiko pemblokiran nomor meskipun dalam praktiknya jarang terjadi untuk penggunaan internal terbatas.

---

## Alur Kerja Pengguna

```
Buka Web → Pilih Tanggal
    ↓
Tambah Kamar Operasi (misal: PJT 1.1)
    ↓
Isi tabel pasien (nama, dx, plan, tim dokter, dst.)
    ↓
Tekan ▲ / ▼ untuk atur urutan
    ↓
Preview Pesan → Review teks WhatsApp
    ↓
Kirim ke Grup WhatsApp
```

---

## Pengembangan Selanjutnya (Opsional)

- Export ke PDF / Excel
- Riwayat pengiriman (log)
- Multi-user dengan autentikasi sederhana (PIN per ruangan)
- Template diagnosis & plan yang bisa disimpan (autocomplete)
- Notifikasi pengingat H-1 otomatis
