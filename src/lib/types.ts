// Tipe data inti SISKEUDES-Web.
// Semua nilai uang disimpan sebagai integer rupiah (tanpa desimal).

export type Role =
  | 'SUPERADMIN'
  | 'ADMIN_KAB'
  | 'KECAMATAN'
  | 'APIP'
  | 'OPERATOR_DESA'
  | 'KADES'
  | 'SEKDES'
  | 'KAUR_KEU'
  | 'PKA'
  | 'DOSEN'
  | 'MAHASISWA';

export const ROLE_LABEL: Record<Role, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN_KAB: 'Admin Kabupaten',
  KECAMATAN: 'Operator Kecamatan',
  APIP: 'Inspektorat / APIP',
  OPERATOR_DESA: 'Operator Desa',
  KADES: 'Kepala Desa',
  SEKDES: 'Sekretaris Desa',
  KAUR_KEU: 'Kaur Keuangan',
  PKA: 'Pelaksana Kegiatan (Kaur/Kasi)',
  DOSEN: 'Dosen (Simulasi)',
  MAHASISWA: 'Mahasiswa (Simulasi)',
};

/** Peran yang bekerja di tingkat kabupaten (bisa memilih desa mana saja). */
export const ROLE_KAB: Role[] = ['SUPERADMIN', 'ADMIN_KAB', 'KECAMATAN', 'APIP', 'DOSEN'];
/** Peran baca-saja. */
export const ROLE_READONLY: Role[] = ['KECAMATAN', 'APIP'];

export interface UserProfile {
  uid: string;
  email: string;
  nama: string;
  role: Role;
  grup?: string; // grup hak menu; default = role
  pemdaId: string;
  kecId?: string;
  desaId?: string;
  aktif?: boolean;
}

/** Pendaftaran organisasi (pemda/lembaga) mandiri dari halaman login; disetujui Super Admin. */
export type StatusPendaftaran = 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';
export type JenisInstansi = 'KABUPATEN' | 'KOTA' | 'LEMBAGA';

export const JENIS_INSTANSI_LABEL: Record<JenisInstansi, string> = {
  KABUPATEN: 'Pemerintah Kabupaten',
  KOTA: 'Pemerintah Kota',
  LEMBAGA: 'Kampus / Lembaga Pelatihan (simulasi)',
};

export interface Pendaftaran {
  uid: string;
  email: string;
  jenis: JenisInstansi;
  namaInstansi: string; // "Kabupaten Sambas"
  kodeWilayah?: string; // kode Kemendagri, mis. "61.01"
  provinsi: string;
  namaPj: string; // penanggung jawab
  jabatan: string;
  hp: string;
  catatan?: string;
  status: StatusPendaftaran;
  tglDaftar: string;
  pemdaId?: string;
  alasan?: string;
  diprosesOleh?: string;
  tglProses?: string;
}

export interface Pemda {
  id: string;
  nama: string; // "Kabupaten Sambas"
  kodeWilayah?: string; // kode Kemendagri, mis. "61.01"
  provinsi?: string;
  ibukota?: string;
  simulasi?: boolean;
  jenis?: JenisInstansi;
}

export interface Kecamatan {
  id: string;
  kode: string;
  nama: string;
}

export interface Desa {
  id: string;
  kode: string; // kode desa Kemendagri, mis. 61.01.01.2001
  nama: string;
  kecId: string;
}

export type JenisAkun = 'AKUN' | 'KELOMPOK' | 'JENIS' | 'OBJEK';

export interface RefAkun {
  id: string; // = kode
  kode: string; // 5.2.1.01
  nama: string;
  level: JenisAkun;
}

export interface RefKegiatan {
  id: string; // = kode
  kode: string; // 1.1.01
  nama: string;
  level: 'BIDANG' | 'SUBBIDANG' | 'KEGIATAN';
}

export interface RefSumberDana {
  id: string; // = kode
  kode: string; // DDS
  nama: string;
  kdRekPendapatan?: string;
}

export interface Perangkat {
  id: string;
  nama: string;
  jabatan: string;
  nik?: string;
  npwp?: string;
  bank?: string;
  noRekening?: string;
  siltap?: number;
  tunjangan?: number;
  pelaksana?: boolean;
}

export interface RekeningBank {
  id: string;
  bank: string;
  noRekening: string;
  atasNama: string;
  utama?: boolean;
}

export interface ProfilDesa {
  alamat?: string;
  telepon?: string;
  email?: string;
  namaKades?: string;
  namaSekdes?: string;
  namaKaurKeu?: string;
  noPerdesApbdes?: string;
  tglPerdesApbdes?: string;
  noPerkadesPenjabaran?: string;
  tglPerkadesPenjabaran?: string;
}

export interface KonfigurasiKab {
  kontrolRAK: boolean;
  kertas: 'A4' | 'F4';
  kegiatanWajib: string[]; // kode kegiatan yang wajib dianggarkan sebelum posting
  wajibLampiran: boolean;
  /** hakMenu[grup][menuKey][aksi] = false berarti tombol disembunyikan */
  hakMenu: Record<string, Record<string, Partial<Record<AksiMenu, boolean>>>>;
}

export type AksiMenu = 'tambah' | 'ubah' | 'hapus' | 'cetak';

// ---------------- Perencanaan ----------------
export interface RpjmKegiatan {
  id: string;
  jenis: 'KEGIATAN' | 'PEMBIAYAAN';
  kdKeg?: string; // untuk kegiatan
  kdRek?: string; // untuk pembiayaan
  uraian: string;
  lokasi?: string;
  sasaran?: string;
  volume?: string;
  tahun: number[]; // tahun pelaksanaan
  biaya: number; // perkiraan biaya per tahun
  sumberDana?: string;
}

export interface RpjmVisi {
  periodeAwal: number;
  periodeAkhir: number;
  visi: string;
  misi: string;
}

export interface RkpKegiatan {
  id: string;
  rpjmId?: string;
  jenis: 'KEGIATAN' | 'PEMBIAYAAN';
  kdKeg?: string;
  kdRek?: string;
  uraian: string;
  lokasi?: string;
  volume?: string;
  sasaran?: string;
  biaya: number;
  sumberDana?: string;
  pola?: 'SWAKELOLA' | 'KERJASAMA' | 'PIHAK_KETIGA';
  pelaksana?: string;
  prioritas?: number;
}

// ---------------- Penganggaran ----------------
export type KelompokAnggaran = 'PENDAPATAN' | 'BELANJA' | 'PEMBIAYAAN1' | 'PEMBIAYAAN2';

export interface KegiatanAnggaran {
  id: string; // = kdKeg
  kdKeg: string;
  nama: string;
  pelaksanaId?: string;
  pelaksana?: string;
  lokasi?: string;
  waktu?: string;
  keluaran?: string;
}

export interface RabItem {
  uraian: string;
  volume: number;
  satuan: string;
  harga: number;
}

export interface RincianAnggaran {
  id: string;
  kelompok: KelompokAnggaran;
  kdKeg?: string; // hanya untuk BELANJA
  kdRek: string;
  sumberDana: string;
  rab: RabItem[];
  nilai: number; // jumlah RAB
  rak: number[]; // 12 bulan
}

export type JenisPosting = 'AWAL' | 'PERGESERAN' | 'PERUBAHAN';

export interface SnapshotRincian {
  id: string;
  kelompok: KelompokAnggaran;
  kdKeg?: string;
  kdRek: string;
  sumberDana: string;
  nilai: number;
  rak: number[];
}

export interface Posting {
  id: string;
  no: number;
  jenis: JenisPosting;
  tgl: string;
  dasarHukum: string; // nomor Perdes/Perkades
  tglDasarHukum?: string;
  rincian: SnapshotRincian[];
  total: { pendapatan: number; belanja: number; pembiayaan1: number; pembiayaan2: number };
  oleh: string;
}

// ---------------- Penatausahaan ----------------
export type JenisKas = 'BANK' | 'TUNAI';
export type JenisSpp = 'PANJAR' | 'DEFINITIF' | 'PEMBIAYAAN';
export type StatusSpp = 'DRAFT' | 'DIVERIFIKASI' | 'DISETUJUI' | 'DICAIRKAN' | 'SELESAI' | 'DITOLAK';

export type JenisPajak = 'PPN' | 'PPH21' | 'PPH22' | 'PPH23' | 'PPH4_2' | 'PAJAK_DAERAH';

export interface PajakItem {
  jenis: JenisPajak;
  nilai: number;
}

export interface SppRincian {
  kdRek: string;
  sumberDana: string;
  nilai: number;
}

export interface BuktiPengeluaran {
  id: string;
  noBukti: string;
  tgl: string;
  penerima: string;
  alamat?: string;
  npwp?: string;
  bank?: string;
  noRekening?: string;
  uraian: string;
  kdRek: string;
  sumberDana: string;
  nilai: number; // bruto
  pajak: PajakItem[];
  lampiranUrl?: string;
}

export interface JejakStatus {
  oleh: string;
  tgl: string;
  catatan?: string;
}

export interface Spp {
  id: string;
  noSpp: string;
  tgl: string;
  jenis: JenisSpp;
  kdKeg?: string;
  uraian: string;
  status: StatusSpp;
  rincian: SppRincian[];
  bukti: BuktiPengeluaran[];
  kas: JenisKas;
  verifikasi?: JejakStatus;
  persetujuan?: JejakStatus;
  pencairan?: JejakStatus & { noBukti: string };
  ditolak?: JejakStatus;
  spj?: {
    tgl: string;
    bukti: BuktiPengeluaran[];
    sisa: number;
    kasSisa: JenisKas;
    oleh: string;
  };
}

export interface Penerimaan {
  id: string;
  noBukti: string;
  tgl: string;
  kdRek: string;
  sumberDana: string;
  uraian: string;
  penyetor?: string;
  nilai: number;
  kas: JenisKas;
  lampiranUrl?: string;
}

export interface SetorPajak {
  id: string;
  noBukti: string;
  tgl: string;
  jenis: JenisPajak;
  nilai: number;
  kas: JenisKas;
  ntpn?: string;
  kodeBilling?: string;
  lampiranUrl?: string;
}

export interface Mutasi {
  id: string;
  noBukti: string;
  tgl: string;
  dari: JenisKas;
  ke: JenisKas;
  nilai: number;
  uraian: string;
}

export interface Pengembalian {
  id: string;
  noBukti: string;
  tgl: string;
  kdKeg?: string;
  kdRek: string;
  sumberDana: string;
  nilai: number;
  kas: JenisKas;
  uraian: string;
  lampiranUrl?: string;
}

export interface PenutupanKas {
  id: string; // "01".."12"
  bulan: number;
  tgl: string;
  saldoBank: number;
  saldoTunai: number;
  oleh: string;
  dikunciKab?: boolean;
  dikunciOleh?: string;
}

export type JenisLedger =
  | 'PENDAPATAN'
  | 'SILPA'
  | 'PEMBIAYAAN_TERIMA'
  | 'BELANJA'
  | 'PANJAR'
  | 'SPJ_PANJAR'
  | 'KEMBALI_PANJAR'
  | 'PEMBIAYAAN_KELUAR'
  | 'PUNGUT_PAJAK'
  | 'SETOR_PAJAK'
  | 'MUTASI_MASUK'
  | 'MUTASI_KELUAR'
  | 'PENGEMBALIAN';

/** Satu baris buku. kas=null berarti transaksi non-kas (SPJ panjar, realisasi SILPA). */
export interface Ledger {
  id: string;
  tgl: string;
  bulan: number;
  noBukti: string;
  uraian: string;
  jenis: JenisLedger;
  kas: JenisKas | null;
  kasLawan?: JenisKas; // untuk mutasi
  masuk: number;
  keluar: number;
  kdRek?: string;
  kdKeg?: string;
  sumberDana?: string;
  pajak?: JenisPajak;
  refType: string;
  refId: string;
  /** realisasi anggaran (+) atau pengurang realisasi (-) untuk LRA */
  realisasi?: number;
}

export interface SaldoAwal {
  kasBank: number;
  kasTunai: number;
  panjar: number;
  utangPajak: number;
  keterangan?: string;
}

export interface JurnalBaris {
  akun: string;
  debet: number;
  kredit: number;
}

export interface Jurnal {
  id: string;
  no: string;
  tgl: string;
  uraian: string;
  baris: JurnalBaris[];
  posted: boolean;
  lampiranUrl?: string;
}

export interface Pesan {
  id: string;
  tgl: string;
  judul: string;
  isi: string;
  untukDesa: string; // 'ALL' atau desaId
  oleh: string;
}

export interface Monitoring {
  id: string; // `${ta}_${desaId}`
  ta: number;
  desaId: string;
  postingTerakhir?: JenisPosting;
  postingNo?: number;
  postingTgl?: string;
  bulanTutup?: number; // bulan terakhir yang sudah ditutup
  anggaranBelanja?: number;
  realisasiBelanja?: number;
  diperbarui: string;
}

export interface Audit {
  id: string;
  waktu: string;
  oleh: string;
  aksi: string;
  ref: string;
  catatan?: string;
}
