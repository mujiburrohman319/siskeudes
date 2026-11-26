// Logika keuangan murni (tanpa I/O) — mudah diuji.
import { AKUN_KAS, AKUN_PAJAK, AKUN_PANJAR } from './referensi';
import type {
  JenisKas, JenisPajak, JurnalBaris, KelompokAnggaran, Ledger, Pengembalian, PenutupanKas, Posting,
  RincianAnggaran, SaldoAwal, SnapshotRincian, Spp,
} from './types';
import { bulanDari, sum } from './format';

export const keyRinci = (kdKeg: string | undefined, kdRek: string, sumberDana: string) =>
  `${kdKeg ?? '-'}|${kdRek}|${sumberDana}`;

export function kelompokDariRek(kdRek: string): KelompokAnggaran {
  if (kdRek.startsWith('4')) return 'PENDAPATAN';
  if (kdRek.startsWith('5')) return 'BELANJA';
  if (kdRek.startsWith('6.1')) return 'PEMBIAYAAN1';
  return 'PEMBIAYAAN2';
}

export function nilaiRab(r: Pick<RincianAnggaran, 'rab'>): number {
  return sum(r.rab ?? [], (x) => Math.round((Number(x.volume) || 0) * (Number(x.harga) || 0)));
}

/** Posting terakhir = anggaran yang berlaku. */
export function postingTerakhir(postings: Posting[]): Posting | null {
  if (!postings.length) return null;
  return [...postings].sort((a, b) => b.no - a.no)[0];
}

export function petaAnggaran(rows: SnapshotRincian[]): Map<string, SnapshotRincian> {
  const m = new Map<string, SnapshotRincian>();
  for (const r of rows) m.set(keyRinci(r.kdKeg, r.kdRek, r.sumberDana), r);
  return m;
}

export function totalAnggaran(rows: Pick<SnapshotRincian, 'kelompok' | 'nilai'>[]) {
  const t = { pendapatan: 0, belanja: 0, pembiayaan1: 0, pembiayaan2: 0 };
  for (const r of rows) {
    if (r.kelompok === 'PENDAPATAN') t.pendapatan += r.nilai;
    else if (r.kelompok === 'BELANJA') t.belanja += r.nilai;
    else if (r.kelompok === 'PEMBIAYAAN1') t.pembiayaan1 += r.nilai;
    else t.pembiayaan2 += r.nilai;
  }
  return t;
}

export interface MasalahPosting {
  level: 'error' | 'warning';
  pesan: string;
}

/** Validasi sebelum posting APBDes. */
export function validasiPosting(
  rincian: RincianAnggaran[],
  kegiatanWajib: string[],
  jenis: Posting['jenis'],
  adaPosting: boolean,
): MasalahPosting[] {
  const out: MasalahPosting[] = [];
  if (jenis === 'AWAL' && adaPosting) out.push({ level: 'error', pesan: 'Posting Awal Tahun sudah dilakukan. Gunakan Pergeseran atau Perubahan.' });
  if (jenis !== 'AWAL' && !adaPosting) out.push({ level: 'error', pesan: 'Lakukan Posting Awal Tahun terlebih dahulu.' });
  if (!rincian.length) out.push({ level: 'error', pesan: 'Belum ada rincian anggaran.' });
  for (const r of rincian) {
    const rak = sum(r.rak ?? [], (x) => x);
    if (rak !== r.nilai) {
      out.push({
        level: 'error',
        pesan: `RAK ${r.kdKeg ? r.kdKeg + ' / ' : ''}${r.kdRek} (${r.sumberDana}) = ${rak.toLocaleString('id-ID')}, tidak sama dengan anggaran ${r.nilai.toLocaleString('id-ID')}.`,
      });
    }
  }
  if (jenis === 'AWAL') {
    for (const kw of kegiatanWajib) {
      const ada = rincian.some((r) => r.kelompok === 'BELANJA' && r.kdKeg === kw && r.nilai > 0);
      if (!ada) out.push({ level: 'error', pesan: `Kegiatan wajib ${kw} belum dianggarkan.` });
    }
  }
  const t = totalAnggaran(rincian);
  const surplus = t.pendapatan - t.belanja;
  const pembNeto = t.pembiayaan1 - t.pembiayaan2;
  if (surplus + pembNeto !== 0) {
    out.push({
      level: 'warning',
      pesan: `APBDes tidak seimbang: surplus/defisit ${surplus.toLocaleString('id-ID')} + pembiayaan neto ${pembNeto.toLocaleString('id-ID')} = SiLPA berjalan ${(surplus + pembNeto).toLocaleString('id-ID')}.`,
    });
  }
  return out;
}

/** Status kegiatan wajib: hijau (sudah) / merah (belum). */
export function statusKegiatanWajib(rincian: RincianAnggaran[], wajib: string[]) {
  return wajib.map((kd) => ({
    kdKeg: kd,
    sudah: rincian.some((r) => r.kelompok === 'BELANJA' && r.kdKeg === kd && r.nilai > 0),
  }));
}

/** Nilai yang sudah terikat SPP per (kegiatan, rekening, sumber dana). */
export function komitmenSpp(spps: Spp[], pengembalian: Pengembalian[], kecualiSppId?: string): Map<string, number> {
  const m = new Map<string, number>();
  const add = (k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  for (const s of spps) {
    if (s.status === 'DITOLAK' || s.id === kecualiSppId) continue;
    const keg = s.jenis === 'PEMBIAYAAN' ? undefined : s.kdKeg;
    if (s.jenis === 'PANJAR' && s.spj) {
      for (const b of s.spj.bukti) add(keyRinci(keg, b.kdRek, b.sumberDana), b.nilai);
    } else {
      for (const r of s.rincian) add(keyRinci(keg, r.kdRek, r.sumberDana), r.nilai);
    }
  }
  for (const p of pengembalian) add(keyRinci(p.kdKeg, p.kdRek, p.sumberDana), -p.nilai);
  return m;
}

/** Sisa pagu yang tersedia untuk SPP pada tanggal tertentu. */
export function sisaPagu(opts: {
  anggaran: SnapshotRincian | undefined;
  komitmen: number;
  tglSpp: string;
  kontrolRAK: boolean;
}): { pagu: number; tersedia: number } {
  const a = opts.anggaran;
  if (!a) return { pagu: 0, tersedia: 0 };
  const bulan = bulanDari(opts.tglSpp);
  const pagu = opts.kontrolRAK ? sum((a.rak ?? []).slice(0, bulan), (x) => x) : a.nilai;
  return { pagu, tersedia: pagu - opts.komitmen };
}

/** Saldo kas per jenis sampai tanggal (inklusif). */
export function saldoKas(ledger: Ledger[], awal: SaldoAwal | null, sampaiTgl?: string): Record<JenisKas, number> {
  const s: Record<JenisKas, number> = { BANK: awal?.kasBank ?? 0, TUNAI: awal?.kasTunai ?? 0 };
  for (const l of ledger) {
    if (!l.kas) continue;
    if (sampaiTgl && l.tgl > sampaiTgl) continue;
    s[l.kas] += l.masuk - l.keluar;
  }
  return s;
}

/** Saldo utang pajak per jenis (dipungut − disetor). */
export function saldoPajak(ledger: Ledger[]): Record<JenisPajak, number> {
  const s = { PPN: 0, PPH21: 0, PPH22: 0, PPH23: 0, PPH4_2: 0, PAJAK_DAERAH: 0 } as Record<JenisPajak, number>;
  for (const l of ledger) {
    if (!l.pajak) continue;
    if (l.jenis === 'PUNGUT_PAJAK') s[l.pajak] += l.masuk;
    if (l.jenis === 'SETOR_PAJAK') s[l.pajak] -= l.keluar;
  }
  return s;
}

/** Saldo panjar yang belum dipertanggungjawabkan. */
export function saldoPanjar(ledger: Ledger[], awal = 0): number {
  let s = awal;
  for (const l of ledger) {
    if (l.jenis === 'PANJAR') s += l.keluar;
    if (l.jenis === 'SPJ_PANJAR') s -= l.keluar;
    if (l.jenis === 'KEMBALI_PANJAR') s -= l.masuk;
  }
  return s;
}

/** Realisasi per (kegiatan, rekening, sumber dana) sampai bulan tertentu. */
export function realisasiPerKey(ledger: Ledger[], sampaiBulan = 12): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of ledger) {
    if (!l.realisasi || !l.kdRek || l.bulan > sampaiBulan) continue;
    const k = keyRinci(l.kdKeg, l.kdRek, l.sumberDana ?? '');
    m.set(k, (m.get(k) ?? 0) + l.realisasi);
  }
  return m;
}

export function realisasiPerRek(ledger: Ledger[], sampaiBulan = 12): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of ledger) {
    if (!l.realisasi || !l.kdRek || l.bulan > sampaiBulan) continue;
    m.set(l.kdRek, (m.get(l.kdRek) ?? 0) + l.realisasi);
  }
  return m;
}

export function bulanDitutup(penutupan: PenutupanKas[]): Set<number> {
  return new Set(penutupan.map((p) => p.bulan));
}

/** Lempar error bila tanggal transaksi berada di bulan yang sudah ditutup. */
export function cekPeriodeTerbuka(tgl: string, penutupan: PenutupanKas[], ta: number) {
  if (!tgl || Number(tgl.slice(0, 4)) !== ta) throw new Error(`Tanggal harus di tahun anggaran ${ta}.`);
  const b = bulanDari(tgl);
  if (bulanDitutup(penutupan).has(b)) throw new Error(`Kas bulan ${b} sudah ditutup. Transaksi tidak dapat ditambah/diubah/dihapus.`);
}

/** Jurnal otomatis basis kas dari satu baris ledger. */
export function jurnalDariLedger(l: Ledger): JurnalBaris[] {
  const kas = l.kas ? AKUN_KAS[l.kas] : '';
  const rek = l.kdRek ?? '';
  const v = l.masuk || l.keluar;
  const dk = (d: string, k: string): JurnalBaris[] => [
    { akun: d, debet: v, kredit: 0 },
    { akun: k, debet: 0, kredit: v },
  ];
  switch (l.jenis) {
    case 'PENDAPATAN':
    case 'PEMBIAYAAN_TERIMA':
      return dk(kas, rek);
    case 'BELANJA':
    case 'PEMBIAYAAN_KELUAR':
      return dk(rek, kas);
    case 'PANJAR':
      return dk(AKUN_PANJAR, kas);
    case 'SPJ_PANJAR':
      return dk(rek, AKUN_PANJAR);
    case 'KEMBALI_PANJAR':
      return dk(kas, AKUN_PANJAR);
    case 'PUNGUT_PAJAK':
      return dk(kas, AKUN_PAJAK[l.pajak!]);
    case 'SETOR_PAJAK':
      return dk(AKUN_PAJAK[l.pajak!], kas);
    case 'PENGEMBALIAN':
      return dk(kas, rek);
    case 'MUTASI_MASUK':
      return dk(kas, AKUN_KAS[l.kasLawan!]);
    case 'MUTASI_KELUAR':
    case 'SILPA':
    default:
      return [];
  }
}

export interface BarisLRA {
  kode: string;
  anggaran: number;
  realisasi: number;
}

/** Anggaran & realisasi per rekening objek (untuk LRA). */
export function lraPerRek(snapshot: SnapshotRincian[], ledger: Ledger[], sampaiBulan = 12): BarisLRA[] {
  const ang = new Map<string, number>();
  for (const r of snapshot) ang.set(r.kdRek, (ang.get(r.kdRek) ?? 0) + r.nilai);
  const real = realisasiPerRek(ledger, sampaiBulan);
  const kode = new Set([...ang.keys(), ...real.keys()]);
  return [...kode].sort(cmpKode).map((k) => ({ kode: k, anggaran: ang.get(k) ?? 0, realisasi: real.get(k) ?? 0 }));
}

/** Bandingkan kode bertitik secara numerik: 1.2.10 > 1.2.9 */
export function cmpKode(a: string, b: string): number {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

/** Bagi rata nilai ke 12 bulan (sisa pembulatan di bulan terakhir). */
export function bagiRata(nilai: number, mulai = 1, akhir = 12): number[] {
  const n = akhir - mulai + 1;
  const per = Math.floor(nilai / n);
  const out = Array(12).fill(0);
  for (let b = mulai; b <= akhir; b++) out[b - 1] = per;
  out[akhir - 1] += nilai - per * n;
  return out;
}
