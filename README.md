# SISKEUDES-Web

Tiruan aplikasi **Siskeudes 2.0** (Sistem Keuangan Desa, BPKP–Kemendagri; acuan fitur rilis **2.0.8**) berbasis web dengan **React + TypeScript + Ant Design + Firebase**. Dibuat untuk pembelajaran (praktikum Akuntansi Sektor Publik) dan uji coba. **Bukan aplikasi resmi BPKP/Kemendagri.**

Dokumen kebutuhan: PRD "Clone Siskeudes Web (Firebase)".

## Menjalankan cepat (mode lokal, tanpa Firebase)

```bash
npm install
npm run dev        # buka http://localhost:5173
```

Tanpa file `.env`, aplikasi berjalan di **mode lokal/simulasi**: data disimpan di browser (localStorage). Akun contoh dibuat otomatis:

| Email | Sandi | Peran |
| --- | --- | --- |
| admin@demo.id | admin123 | Admin Kabupaten |
| operator@demo.id | desa123 | Operator Desa Sungai Harapan |
| sekdes@demo.id / kades@demo.id / kaur@demo.id | desa123 | Verifikasi / Persetujuan / Pencairan SPP |
| kecamatan@demo.id | kec123 | Operator Kecamatan (baca saja) |
| mahasiswa@demo.id | mhs123 | Mahasiswa, desa kosong untuk latihan |

Isi data contoh: **Tools › Backup & Data Simulasi › Isi contoh lengkap** (APBDes seimbang Rp1,23 M + posting + transaksi).

## Menjalankan dengan Firebase

1. Buat proyek di Firebase Console. Aktifkan **Authentication (Email/Password)**, **Firestore** (region `asia-southeast2`), dan paket **Blaze** bila memakai Cloud Functions.
2. Salin `.env.example` → `.env`, isi konfigurasi aplikasi web.
3. Salin `.firebaserc.example` → `.firebaserc`, isi project id.
4. Deploy rules & functions:
   ```bash
   npm i -g firebase-tools
   firebase login
   cd functions && npm install && cd ..
   firebase deploy --only firestore,functions
   ```
5. **Super Admin pertama**: buat user di Authentication, lalu buat dokumen `users/{uid}` di Firestore:
   ```json
   { "uid": "<uid>", "email": "superadmin@...", "nama": "Super Admin", "role": "SUPERADMIN", "pemdaId": "sambas", "aktif": true }
   ```
   Login → aplikasi menampilkan form **Penyiapan Pemda** (membuat dokumen pemda + referensi rekening/kegiatan/sumber dana).
6. Lanjutkan di aplikasi: Parameter › Data Wilayah (kecamatan & desa) → File › Pengaturan UserID (Tambah User / Create All User).
7. Hosting: `npm run build && firebase deploy --only hosting`.

Emulator lokal: `firebase emulators:start` lalu set `VITE_USE_EMULATOR=true` di `.env`.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Typecheck + build produksi ke `dist/` |
| `npm test` | Uji logika keuangan dan laporan (Vitest) |
| `npm run typecheck` | Pemeriksaan tipe |

## Cakupan

- **File**: Pengaturan UserID (sortir, cari, Create All User), Pengaturan Menu (sembunyikan tombol per grup).
- **Parameter**: Data wilayah, kode rekening (A.2), bidang/kegiatan (A.1), sumber dana, rekening bank & perangkat desa, Setting Konfigurasi (kontrol RAK, kegiatan wajib, kertas A4/F4).
- **Data Umum Desa** (menu tersendiri), pelaksana kegiatan dimuat dari perangkat desa.
- **Perencanaan**: RPJMDes (visi, misi, kegiatan & pembiayaan), RKPDes (tarik dari RPJMDes).
- **Penganggaran**: kegiatan, isian anggaran + RAB, SiLPA otomatis per sumber dana, RAK bulanan, posting Awal/Pergeseran/Perubahan dengan status kegiatan wajib.
- **Penatausahaan**: penerimaan, SPP Panjar/Definitif/Pembiayaan dengan alur verifikasi → persetujuan → pencairan → SPJ, kontrol sisa pagu & RAK, pajak (pungut/setor), mutasi kas, penutupan kas bulanan, pengembalian belanja, tautan bukti.
- **Pembukuan**: saldo awal, jurnal otomatis (basis kas), jurnal umum dengan posting.
- **Laporan** (PDF & Excel, watermark DRAFT): 26 laporan, antara lain RPJM, RKP, APBDes, Penjabaran, RAB, RAK, DPA, SPP1/2/3, Kuitansi, Register SPP/Kuitansi, BKU, Buku Bank/Tunai/Pajak/Panjar/Kegiatan, Rekap Siltap, Jurnal, Buku Besar, Neraca Saldo, LRA Semester/Tahunan, LRA per Sumber Dana, LPJ.
- **Tools**: Monitoring (posting & penutupan kas per desa), Pesan Teks, Kunci Transaksi Desa, Backup/Restore JSON, data simulasi, jejak audit.

## Catatan penting

- Daftar kode rekening dan kegiatan bawaan adalah **contoh** yang mengikuti pola Permendagri 20/2018. Cocokkan dengan lampiran resmi beserta perubahannya sebelum dipakai untuk desa sungguhan.
- Mode lokal menyimpan kata sandi tanpa enkripsi di browser. Gunakan hanya untuk latihan.
