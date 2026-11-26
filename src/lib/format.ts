export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** 1500000 -> "1.500.000" ; negatif -> "(1.500.000)" */
export function rp(n: number | undefined | null, kurung = true): string {
  const v = Math.round(n ?? 0);
  const s = Math.abs(v).toLocaleString('id-ID');
  if (v < 0) return kurung ? `(${s})` : `-${s}`;
  return s;
}

/** "2026-03-05" -> "05/03/2026" */
export function tglID(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** "2026-03-05" -> "5 Maret 2026" */
export function tglPanjang(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

export function bulanDari(iso: string): number {
  return Number(iso.slice(5, 7));
}

export function hariIni(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function sekarangISO(): string {
  return new Date().toISOString();
}

export function uid(prefix = ''): string {
  const r = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36);
  return `${prefix}${t}${r}`;
}

export function sum<T>(arr: T[], f: (x: T) => number): number {
  return arr.reduce((s, x) => s + (f(x) || 0), 0);
}

export function padNo(n: number, len = 4): string {
  return String(n).padStart(len, '0');
}

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

function terbilangInt(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${terbilangInt(n - 10)} belas`;
  if (n < 100) return `${terbilangInt(Math.floor(n / 10))} puluh ${terbilangInt(n % 10)}`;
  if (n < 200) return `seratus ${terbilangInt(n - 100)}`;
  if (n < 1000) return `${terbilangInt(Math.floor(n / 100))} ratus ${terbilangInt(n % 100)}`;
  if (n < 2000) return `seribu ${terbilangInt(n - 1000)}`;
  if (n < 1_000_000) return `${terbilangInt(Math.floor(n / 1000))} ribu ${terbilangInt(n % 1000)}`;
  if (n < 1_000_000_000) return `${terbilangInt(Math.floor(n / 1_000_000))} juta ${terbilangInt(n % 1_000_000)}`;
  if (n < 1_000_000_000_000) return `${terbilangInt(Math.floor(n / 1_000_000_000))} miliar ${terbilangInt(n % 1_000_000_000)}`;
  return `${terbilangInt(Math.floor(n / 1_000_000_000_000))} triliun ${terbilangInt(n % 1_000_000_000_000)}`;
}

/** 1250000 -> "Satu juta dua ratus lima puluh ribu rupiah" */
export function terbilang(n: number): string {
  const v = Math.round(Math.abs(n));
  if (v === 0) return 'Nol rupiah';
  const s = terbilangInt(v).replace(/\s+/g, ' ').trim();
  return `${s.charAt(0).toUpperCase()}${s.slice(1)} rupiah`;
}
