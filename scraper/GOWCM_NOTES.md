# GOW CM Pupuk Indonesia - Pola Scraping

## Konteks
Aplikasi: https://gowcm.pupuk-indonesia.com  
Akun: PUD 1000001601 (CV. ANUGERAH MAKMUR)  
Framework: Laravel + Vue.js (SPA dengan hash routing)

## Kredensial
- Username: `1000001601`
- Password: `A@makmur25`

## Struktur Routing
URL format: `https://gowcm.pupuk-indonesia.com/#/{ENCRYPTED_ROUTE}/{menu}/{submenu}`

Encrypted route prefix (hasil login): `U2FsdGVkX1%2FH0DcpwxVuHd%2FF20k%2FUwj6uh9xmPYCl2o%3D`

## Menu: Alokasi >> SPJB PPTS

### Daftar SPJB
- **URL**: `/#/{prefix}/alokasi/contract-distributor-ppts`
- **Tabel kolom**: Nomor SPJB, Kode PPTS, Nama PPTS, Kode PUD, Nama PUD, Provinsi, Kabupaten, Status, Tanggal Awal, Tanggal Akhir

### Detail setiap SPJB
- **URL**: `/#/{prefix}/alokasi/contract-distributor-ppts/{nomor_spjb_dengan_asterisk}/{kode_ppts}`
  - Catatan: semua `/` dalam Nomor SPJB diganti `*` di URL
  - Contoh: `01/SPJB/AM-PPTS/XII/25` → `01*SPJB*AM-PPTS*XII*25`

### Data Detail SPJB
1. **Info Header**: Judul perjanjian, Nomor SPJB, Status (Active/Ditolak)
2. **Info Fields**: PPTS (kode-nama), PUD (kode-nama), Kabupaten, Provinsi, Mulai Berlaku, Berlaku Hingga
3. **Tabel Alokasi SPJB** (tabel pertama):
   - Kolom: Kecamatan, Produk (Urea/NPK), Alokasi SPJB, Realisasi, Sisa Alokasi, Progress (%)
4. **Tabel Riwayat SPJB** (tabel kedua):
   - Kolom: Nomor Dokument, Jenis Dokument, Alasan, Tanggal Buat, Evidence (PDF), Status, Aksi
5. **PDF Evidence**: path format `storage/adendum-spjb-kios/{kode_pud}_{nomor_spjb_encode}/{kode_ppts}.pdf`

## Script Playwright
- File utama: `d:\testGet\spjb_ppts.js`
- Output: `d:\testGet\spjb_ppts_full.json`
- Jalankan: `node spjb_ppts.js`

## Cara Login & Ambil Token
1. Buka `/#/login`
2. Fill username & password, klik "Masuk"
3. Token tersimpan di **localStorage** (encrypted CryptoJS AES)
4. Intercept response API `/api/*` untuk menangkap token dari response JSON

## Catatan Teknis
- App menggunakan hash routing (`#/`)
- Route ter-enkripsi setelah login (prefix berubah tiap sesi)
- Token format: Base64 AES-encrypted (`U2FsdGVk...`)
- Playwright mode: `headless: false` untuk bypass deteksi bot
