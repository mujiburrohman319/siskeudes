// Model laporan netral-format: dirender ke pratinjau HTML, PDF (pdfmake), dan Excel (ExcelJS).
export interface Kolom {
  judul: string;
  lebar?: number | '*' | 'auto';
  rata?: 'kiri' | 'kanan' | 'tengah';
  uang?: boolean;
}

export interface BarisLap {
  sel: (string | number | null | undefined)[];
  tebal?: boolean;
  latar?: boolean;
  indent?: number; // indentasi kolom uraian (indeks kolom ke-1)
  indentKolom?: number;
}

export interface Ttd {
  atas?: string; // mis. "Diverifikasi oleh,"
  jabatan: string;
  nama?: string;
}

export type Blok =
  | { jenis: 'tabel'; kolom: Kolom[]; baris: BarisLap[]; judul?: string }
  | { jenis: 'teks'; teks: string; tebal?: boolean; rata?: 'kiri' | 'tengah' | 'kanan'; ukuran?: number; miring?: boolean }
  | { jenis: 'kv'; pasangan: [string, string][] }
  | { jenis: 'ttd'; tempatTgl?: string; kolom: Ttd[] }
  | { jenis: 'garis' }
  | { jenis: 'halaman' };

export interface Kop {
  pemda: string;
  kecamatan: string;
  desa: string;
  ta: number;
}

export interface Laporan {
  kode: string;
  judul: string[];
  orientasi: 'portrait' | 'landscape';
  blok: Blok[];
  draft?: boolean;
  kop: Kop;
  namaFile: string;
}

export interface DefLaporan {
  kode: string;
  nama: string;
  grup: 'Perencanaan' | 'Penganggaran' | 'Penatausahaan' | 'Pembukuan' | 'Pertanggungjawaban';
  param?: ('bulan' | 'kegiatan' | 'spp' | 'akun' | 'semester')[];
}
