// Penyusun laporan: dari data mentah menjadi model Laporan.
import { BULAN, padNo, sum, terbilang, tglID, tglPanjang } from '../format';
import { cmpKode, jurnalDariLedger, keyRinci, realisasiPerKey } from '../keuangan';
import { PAJAK_LABEL } from '../referensi';
import type { BuktiPengeluaran, JenisKas, JurnalBaris, Ledger, SnapshotRincian, Spp } from '../types';
import type { DataLap } from './data';
import type { BarisLap, Blok, DefLaporan, Kolom, Laporan, Ttd } from './model';

export const DAFTAR_LAPORAN: DefLaporan[] = [
  { kode: 'rpjm', nama: 'RPJM Desa', grup: 'Perencanaan' },
  { kode: 'rkp', nama: 'RKP Desa', grup: 'Perencanaan' },
  { kode: 'apbdes', nama: 'APBDes (Lampiran Perdes)', grup: 'Penganggaran' },
  { kode: 'penjabaran', nama: 'Penjabaran APBDes (Lampiran Perkades)', grup: 'Penganggaran' },
  { kode: 'rab', nama: 'Rencana Anggaran Biaya (RAB) per Kegiatan', grup: 'Penganggaran', param: ['kegiatan'] },
  { kode: 'rak', nama: 'Rencana Anggaran Kas Desa (per Triwulan)', grup: 'Penganggaran' },
  { kode: 'dpa', nama: 'Dokumen Pelaksanaan Anggaran (DPA)', grup: 'Penganggaran', param: ['kegiatan'] },
  { kode: 'spp1', nama: 'SPP 1 – Surat Permintaan Pembayaran', grup: 'Penatausahaan', param: ['spp'] },
  { kode: 'spp2', nama: 'SPP 2 – Pernyataan Tanggung Jawab Belanja', grup: 'Penatausahaan', param: ['spp'] },
  { kode: 'sptb', nama: 'SPP 3 – SPTB / Daftar Bukti Pengeluaran', grup: 'Penatausahaan', param: ['spp'] },
  { kode: 'kuitansi', nama: 'Kuitansi', grup: 'Penatausahaan', param: ['spp'] },
  { kode: 'registerSpp', nama: 'Register SPP', grup: 'Penatausahaan' },
  { kode: 'registerKuitansi', nama: 'Register Kuitansi (Penerima, NPWP, Rekening)', grup: 'Penatausahaan' },
  { kode: 'bku', nama: 'Buku Kas Umum', grup: 'Penatausahaan', param: ['bulan'] },
  { kode: 'bukuBank', nama: 'Buku Pembantu Bank', grup: 'Penatausahaan', param: ['bulan'] },
  { kode: 'bukuTunai', nama: 'Buku Pembantu Kas Tunai', grup: 'Penatausahaan', param: ['bulan'] },
  { kode: 'bukuPajak', nama: 'Buku Pembantu Pajak', grup: 'Penatausahaan', param: ['bulan'] },
  { kode: 'bukuPanjar', nama: 'Buku Pembantu Panjar', grup: 'Penatausahaan', param: ['bulan'] },
  { kode: 'bukuKegiatan', nama: 'Buku Pembantu Kas Kegiatan', grup: 'Penatausahaan', param: ['kegiatan'] },
  { kode: 'rekapSiltap', nama: 'Rekap Realisasi Siltap/Tunjangan', grup: 'Penatausahaan', param: ['bulan'] },
  { kode: 'jurnal', nama: 'Jurnal', grup: 'Pembukuan', param: ['bulan'] },
  { kode: 'bukuBesar', nama: 'Buku Besar', grup: 'Pembukuan', param: ['bulan', 'akun'] },
  { kode: 'neracaSaldo', nama: 'Neraca Saldo', grup: 'Pembukuan', param: ['bulan'] },
  { kode: 'lra', nama: 'Laporan Realisasi Pelaksanaan APBDes', grup: 'Pertanggungjawaban', param: ['semester'] },
  { kode: 'lraSumberDana', nama: 'Laporan Realisasi per Sumber Dana', grup: 'Pertanggungjawaban', param: ['semester'] },
  { kode: 'lpj', nama: 'LPJ Realisasi Pelaksanaan APBDes (Tahunan)', grup: 'Pertanggungjawaban' },
];

export interface ParamLap {
  bulan?: number; // s.d. bulan
  semester?: 1 | 2;
  kdKeg?: string;
  sppId?: string;
  akun?: string;
}

// -------------------- util --------------------
const U = (judul: string, lebar: Kolom['lebar'] = 'auto'): Kolom => ({ judul, lebar, rata: 'kanan', uang: true });
const T = (judul: string, lebar: Kolom['lebar'] = 'auto', rata: Kolom['rata'] = 'kiri'): Kolom => ({ judul, lebar, rata });

function kop(d: DataLap) {
  return { pemda: d.pemda?.nama ?? '', kecamatan: d.kec?.nama ?? '', desa: d.desa.nama, ta: d.ctx.ta };
}

function ttdKades(d: DataLap, extra: Ttd[] = []): Blok {
  return { jenis: 'ttd', tempatTgl: `${d.desa.nama}, ....................... ${d.ctx.ta}`, kolom: [...extra, { jabatan: 'Kepala Desa', nama: d.profil.namaKades }] };
}

function ttdKaur(d: DataLap): Blok {
  return {
    jenis: 'ttd', tempatTgl: `${d.desa.nama}, ....................... ${d.ctx.ta}`,
    kolom: [{ atas: 'Mengetahui,', jabatan: 'Kepala Desa', nama: d.profil.namaKades }, { jabatan: 'Kaur Keuangan', nama: d.profil.namaKaurKeu }],
  };
}

const nmBulan = (b?: number) => (b ? BULAN[b - 1] : 'Desember');
const akhirBulan = (ta: number, b = 12) => new Date(Date.UTC(ta, b, 0)).toISOString().slice(0, 10);
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(2)}%` : '-');

function lap(d: DataLap, kode: string, judul: string[], blok: Blok[], opsi: Partial<Laporan> = {}): Laporan {
  return { kode, judul, blok, orientasi: 'portrait', kop: kop(d), namaFile: `${kode}_${d.desa.kode}_${d.ctx.ta}`, ...opsi };
}

// -------------------- struktur APBDes (anggaran ± realisasi) --------------------
interface Nilai { a: number; r: number }

function parentsAkun(kode: string): string[] {
  const s = kode.split('.');
  return s.map((_, i) => s.slice(0, i + 1).join('.'));
}

function strukturApbdes(d: DataLap, rows: SnapshotRincian[], real: Map<string, number> | null, detailRek: boolean): BarisLap[] {
  const out: BarisLap[] = [];
  const add = (kode: string, uraian: string, v: Nilai, level: number, tebal = false) => {
    const sel: (string | number)[] = [kode, uraian, v.a];
    if (real) sel.push(v.r, v.r - v.a);
    out.push({ sel, tebal, indent: level });
  };
  const rOf = (r: SnapshotRincian) => (real ? real.get(keyRinci(r.kdKeg, r.kdRek, r.sumberDana)) ?? 0 : 0);
  const hier = (filter: (r: SnapshotRincian) => boolean, minLevel: number) => {
    const m = new Map<string, Nilai>();
    for (const r of rows.filter(filter)) {
      for (const p of parentsAkun(r.kdRek).slice(minLevel - 1)) {
        const x = m.get(p) ?? { a: 0, r: 0 };
        x.a += r.nilai; x.r += rOf(r); m.set(p, x);
      }
    }
    [...m.keys()].sort(cmpKode).forEach((k) => add(k, d.akunMap.get(k) ?? '', m.get(k)!, k.split('.').length - minLevel + 1, k.split('.').length <= minLevel));
    return [...m.entries()].filter(([k]) => k.split('.').length === minLevel).reduce((t, [, v]) => ({ a: t.a + v.a, r: t.r + v.r }), { a: 0, r: 0 });
  };
  const tot = (label: string, v: Nilai) => { const sel: (string | number)[] = ['', label, v.a]; if (real) sel.push(v.r, v.r - v.a); out.push({ sel, tebal: true, latar: true }); };

  out.push({ sel: ['4', 'PENDAPATAN'], tebal: true });
  const p = hier((r) => r.kelompok === 'PENDAPATAN', 2);
  tot('JUMLAH PENDAPATAN', p);

  out.push({ sel: ['5', 'BELANJA'], tebal: true });
  const bel = rows.filter((r) => r.kelompok === 'BELANJA');
  const mk = new Map<string, Nilai>();
  for (const r of bel) {
    for (const k of parentsAkun(r.kdKeg ?? '')) {
      const x = mk.get(k) ?? { a: 0, r: 0 };
      x.a += r.nilai; x.r += rOf(r); mk.set(k, x);
    }
  }
  for (const k of [...mk.keys()].sort(cmpKode)) {
    const lv = k.split('.').length;
    add(k, d.kegMap.get(k) ?? '', mk.get(k)!, lv, lv === 1);
    if (detailRek && lv === 3) {
      const perRek = new Map<string, Nilai>();
      for (const r of bel.filter((x) => x.kdKeg === k)) {
        const x = perRek.get(r.kdRek) ?? { a: 0, r: 0 };
        x.a += r.nilai; x.r += rOf(r); perRek.set(r.kdRek, x);
      }
      [...perRek.keys()].sort(cmpKode).forEach((rk) => add(rk, d.akunMap.get(rk) ?? '', perRek.get(rk)!, 4));
    }
  }
  const b = { a: sum(bel, (r) => r.nilai), r: sum(bel, rOf) };
  tot('JUMLAH BELANJA', b);
  tot('SURPLUS/(DEFISIT)', { a: p.a - b.a, r: p.r - b.r });

  out.push({ sel: ['6', 'PEMBIAYAAN'], tebal: true });
  const p1 = hier((r) => r.kelompok === 'PEMBIAYAAN1', 2);
  tot('JUMLAH PENERIMAAN PEMBIAYAAN', p1);
  const p2 = hier((r) => r.kelompok === 'PEMBIAYAAN2', 2);
  tot('JUMLAH PENGELUARAN PEMBIAYAAN', p2);
  tot('PEMBIAYAAN NETTO', { a: p1.a - p2.a, r: p1.r - p2.r });
  tot('SILPA/SiLPA TAHUN BERJALAN', { a: p.a - b.a + p1.a - p2.a, r: p.r - b.r + p1.r - p2.r });
  return out;
}

// -------------------- buku --------------------
function bukuKas(d: DataLap, kode: string, judul: string, filter: (l: Ledger) => boolean, saldoAwal: number, bulan: number, masukFn = (l: Ledger) => l.masuk, keluarFn = (l: Ledger) => l.keluar, kolomTambahan?: { judul: string; f: (l: Ledger) => string }): Laporan {
  const batas = akhirBulan(d.ctx.ta, bulan);
  let saldo = saldoAwal;
  const baris: BarisLap[] = [{ sel: ['', '', 'Saldo awal tahun', ...(kolomTambahan ? [''] : []), '', '', saldo], tebal: true }];
  let tm = 0, tk = 0;
  for (const l of d.ledger.filter((x) => filter(x) && x.tgl <= batas)) {
    const m = masukFn(l), k = keluarFn(l);
    if (!m && !k) continue;
    saldo += m - k; tm += m; tk += k;
    baris.push({ sel: [tglID(l.tgl), l.noBukti, l.uraian, ...(kolomTambahan ? [kolomTambahan.f(l)] : []), m || null, k || null, saldo] });
  }
  baris.push({ sel: ['', '', 'JUMLAH', ...(kolomTambahan ? [''] : []), tm, tk, saldo], tebal: true, latar: true });
  return lap(d, kode, [judul, `Periode Januari s.d. ${nmBulan(bulan)} ${d.ctx.ta}`], [
    { jenis: 'tabel', kolom: [T('Tanggal', 55), T('No. Bukti', 75), T('Uraian', '*'), ...(kolomTambahan ? [T(kolomTambahan.judul, 70)] : []), U('Penerimaan/Debet', 75), U('Pengeluaran/Kredit', 75), U('Saldo', 80)], baris },
    ttdKaur(d),
  ], { orientasi: 'landscape' });
}

function semuaBukti(d: DataLap): (BuktiPengeluaran & { spp: Spp })[] {
  const out: (BuktiPengeluaran & { spp: Spp })[] = [];
  for (const s of d.spp) {
    if (!['SELESAI', 'DICAIRKAN'].includes(s.status)) continue;
    for (const b of s.bukti ?? []) out.push({ ...b, spp: s });
    for (const b of s.spj?.bukti ?? []) out.push({ ...b, spp: s });
  }
  return out.sort((a, b) => a.tgl.localeCompare(b.tgl));
}

function jurnalSemua(d: DataLap, bulan: number) {
  const batas = akhirBulan(d.ctx.ta, bulan);
  const items: { tgl: string; no: string; uraian: string; baris: JurnalBaris[]; draft: boolean }[] = [];
  for (const l of d.ledger) if (l.tgl <= batas) { const b = jurnalDariLedger(l); if (b.length) items.push({ tgl: l.tgl, no: l.noBukti, uraian: l.uraian, baris: b, draft: false }); }
  for (const j of d.jurnal) if (j.tgl <= batas) items.push({ tgl: j.tgl, no: j.no, uraian: j.uraian, baris: j.baris, draft: !j.posted });
  return items.sort((a, b) => a.tgl.localeCompare(b.tgl));
}

function saldoAwalAkun(d: DataLap): Map<string, number> {
  const s = d.saldoAwal;
  const m = new Map<string, number>();
  if (!s) return m;
  m.set('1.1.1.01', s.kasBank); m.set('1.1.1.02', s.kasTunai); m.set('1.1.3.01', s.panjar);
  return m;
}

// -------------------- SPP --------------------
function sppDok(d: DataLap, id?: string): Spp {
  const s = d.spp.find((x) => x.id === id);
  if (!s) throw new Error('Pilih SPP yang akan dicetak.');
  return s;
}
const sppDraft = (s: Spp) => !['DICAIRKAN', 'SELESAI'].includes(s.status);
const namaKeg = (d: DataLap, s: Spp) => (s.kdKeg ? `${s.kdKeg} ${d.kegMap.get(s.kdKeg) ?? ''}` : 'Pengeluaran Pembiayaan');

// ==================== GENERATOR ====================
export function buatLaporan(kode: string, d: DataLap, p: ParamLap = {}): Laporan {
  const ta = d.ctx.ta;
  const bulan = p.bulan ?? 12;
  const posting = d.posting;
  const butuhPosting = () => { if (!posting) throw new Error('APBDes belum diposting.'); return posting; };

  switch (kode) {
    case 'rpjm': {
      const v = d.rpjmVisi;
      const rows = [...d.rpjm].sort((a, b) => (a.kdKeg ?? a.kdRek ?? '').localeCompare(b.kdKeg ?? b.kdRek ?? ''));
      return lap(d, kode, ['RENCANA PEMBANGUNAN JANGKA MENENGAH DESA', `Periode ${v?.periodeAwal ?? ''} - ${v?.periodeAkhir ?? ''}`], [
        { jenis: 'kv', pasangan: [['Visi', v?.visi ?? '-'], ['Misi', v?.misi ?? '-']] },
        { jenis: 'tabel', kolom: [T('Kode', 50), T('Kegiatan/Pembiayaan', '*'), T('Lokasi', 70), T('Volume', 60), T('Tahun Pelaksanaan', 90), U('Biaya/Tahun', 80), T('Sumber', 45)],
          baris: rows.map((r) => ({ sel: [r.kdKeg ?? r.kdRek ?? '', r.uraian, r.lokasi ?? '', r.volume ?? '', (r.tahun ?? []).join(', '), r.biaya, r.sumberDana ?? ''] })) },
        ttdKades(d),
      ], { orientasi: 'landscape' });
    }
    case 'rkp': {
      const rows = [...d.rkp].sort((a, b) => (a.kdKeg ?? a.kdRek ?? '').localeCompare(b.kdKeg ?? b.kdRek ?? ''));
      return lap(d, kode, ['RENCANA KERJA PEMERINTAH DESA', `Tahun ${ta}`], [
        { jenis: 'tabel', kolom: [T('Kode', 50), T('Kegiatan', '*'), T('Lokasi', 70), T('Volume', 55), T('Pola', 60), T('Pelaksana', 90), U('Pagu', 80), T('Sumber', 45)],
          baris: [...rows.map((r) => ({ sel: [r.kdKeg ?? r.kdRek ?? '', r.uraian, r.lokasi ?? '', r.volume ?? '', r.pola ?? '', r.pelaksana ?? '', r.biaya, r.sumberDana ?? ''] })),
            { sel: ['', 'JUMLAH', '', '', '', '', sum(rows, (r) => r.biaya), ''], tebal: true, latar: true }] },
        ttdKades(d),
      ], { orientasi: 'landscape' });
    }
    case 'apbdes':
    case 'penjabaran': {
      // Belum diposting → cetak rancangan dengan watermark DRAFT.
      const snap = posting?.rincian ?? d.rincian;
      const judul = kode === 'apbdes' ? 'ANGGARAN PENDAPATAN DAN BELANJA DESA' : 'PENJABARAN ANGGARAN PENDAPATAN DAN BELANJA DESA';
      const dasar = kode === 'apbdes' ? `Lampiran Peraturan Desa ${d.profil.noPerdesApbdes ?? '....'}` : `Lampiran Peraturan Kepala Desa ${d.profil.noPerkadesPenjabaran ?? '....'}`;
      return lap(d, kode, [judul, `Tahun Anggaran ${ta}`], [
        { jenis: 'teks', teks: posting ? `${dasar} — Posting ${posting.jenis.toLowerCase()} no. ${posting.no} (${posting.dasarHukum})` : 'RANCANGAN (belum diposting)', miring: true, rata: 'tengah', ukuran: 8 },
        { jenis: 'tabel', kolom: [T('Kode', 55), T('Uraian', '*'), U('Anggaran (Rp)', 100)], baris: strukturApbdes(d, snap, null, kode === 'penjabaran') },
        ttdKades(d),
      ], { draft: !posting });
    }
    case 'rab':
    case 'dpa': {
      const snap = kode === 'dpa' ? butuhPosting().rincian : d.rincian;
      const kegs = [...d.kegiatan].filter((k) => !p.kdKeg || k.kdKeg === p.kdKeg).sort((a, b) => cmpKode(a.kdKeg, b.kdKeg));
      const blok: Blok[] = [];
      kegs.forEach((k, i) => {
        if (i) blok.push({ jenis: 'halaman' });
        const rs = snap.filter((r) => r.kdKeg === k.kdKeg).sort((a, b) => cmpKode(a.kdRek, b.kdRek));
        blok.push({ jenis: 'kv', pasangan: [['Bidang', `${k.kdKeg.split('.')[0]} ${d.kegMap.get(k.kdKeg.split('.')[0]) ?? ''}`], ['Sub Bidang', `${k.kdKeg.split('.').slice(0, 2).join('.')} ${d.kegMap.get(k.kdKeg.split('.').slice(0, 2).join('.')) ?? ''}`], ['Kegiatan', `${k.kdKeg} ${k.nama}`], ['Pelaksana', k.pelaksana ?? '-'], ['Lokasi', k.lokasi ?? '-'], ['Keluaran', k.keluaran ?? '-']] });
        if (kode === 'rab') {
          const full = d.rincian.filter((r) => r.kdKeg === k.kdKeg).sort((a, b) => cmpKode(a.kdRek, b.kdRek));
          const baris: BarisLap[] = [];
          for (const r of full) {
            baris.push({ sel: [r.kdRek, `${d.akunMap.get(r.kdRek) ?? ''} (${r.sumberDana})`, '', '', '', r.nilai], tebal: true });
            for (const x of r.rab) baris.push({ sel: ['', x.uraian, x.volume, x.satuan, x.harga, Math.round(x.volume * x.harga)], indent: 1 });
          }
          baris.push({ sel: ['', 'JUMLAH', '', '', '', sum(full, (r) => r.nilai)], tebal: true, latar: true });
          blok.push({ jenis: 'tabel', kolom: [T('Kode Rek', 55), T('Uraian', '*'), U('Volume', 45), T('Satuan', 45), U('Harga Satuan', 75), U('Jumlah', 85)], baris });
        } else {
          const tw = (r: SnapshotRincian, q: number) => sum(r.rak.slice(q * 3, q * 3 + 3), (x) => x);
          blok.push({ jenis: 'tabel', kolom: [T('Kode Rek', 55), T('Uraian', '*'), T('Sumber', 40), U('Anggaran', 80), U('Tw I', 70), U('Tw II', 70), U('Tw III', 70), U('Tw IV', 70)],
            baris: [...rs.map((r) => ({ sel: [r.kdRek, d.akunMap.get(r.kdRek) ?? '', r.sumberDana, r.nilai, tw(r, 0), tw(r, 1), tw(r, 2), tw(r, 3)] })),
              { sel: ['', 'JUMLAH', '', sum(rs, (r) => r.nilai), ...[0, 1, 2, 3].map((q) => sum(rs, (r) => tw(r, q)))], tebal: true, latar: true }] });
        }
        blok.push({ jenis: 'ttd', tempatTgl: `${d.desa.nama}, ....................... ${ta}`, kolom: [{ atas: 'Disetujui,', jabatan: 'Kepala Desa', nama: d.profil.namaKades }, { atas: 'Diverifikasi,', jabatan: 'Sekretaris Desa', nama: d.profil.namaSekdes }, { jabatan: 'Pelaksana Kegiatan', nama: k.pelaksana?.split(' - ')[1] }] });
      });
      if (!kegs.length) blok.push({ jenis: 'teks', teks: 'Tidak ada kegiatan.' });
      return lap(d, kode, [kode === 'rab' ? 'RENCANA ANGGARAN BIAYA' : 'DOKUMEN PELAKSANAAN ANGGARAN', `Tahun Anggaran ${ta}`], blok, { orientasi: kode === 'dpa' ? 'landscape' : 'portrait', draft: kode === 'rab' && !posting });
    }
    case 'rak': {
      const snap = posting?.rincian ?? d.rincian;
      const rs = [...snap].sort((a, b) => a.kelompok.localeCompare(b.kelompok) || cmpKode(a.kdKeg ?? '0', b.kdKeg ?? '0') || cmpKode(a.kdRek, b.kdRek));
      const bln = (r: SnapshotRincian, q: number) => sum(r.rak.slice(q * 3, q * 3 + 3), (x) => x);
      return lap(d, kode, ['RENCANA ANGGARAN KAS DESA', `Tahun Anggaran ${ta}`], [
        { jenis: 'tabel', kolom: [T('Kegiatan', 45), T('Kode Rek', 55), T('Uraian', '*'), T('SD', 30), U('Anggaran', 75), U('Tw I', 65), U('Tw II', 65), U('Tw III', 65), U('Tw IV', 65)],
          baris: rs.map((r) => ({ sel: [r.kdKeg ?? '', r.kdRek, d.akunMap.get(r.kdRek) ?? '', r.sumberDana, r.nilai, bln(r, 0), bln(r, 1), bln(r, 2), bln(r, 3)] })) },
        ttdKades(d, [{ jabatan: 'Kaur Keuangan', nama: d.profil.namaKaurKeu }]),
      ], { orientasi: 'landscape', draft: !posting });
    }
    case 'spp1': {
      const s = sppDok(d, p.sppId);
      const total = sum(s.rincian, (r) => r.nilai);
      const k = d.kegiatan.find((x) => x.kdKeg === s.kdKeg);
      return lap(d, kode, ['SURAT PERMINTAAN PEMBAYARAN (SPP)', `Nomor: ${s.noSpp}`], [
        { jenis: 'teks', teks: `Kepada Yth. Kepala Desa ${d.desa.nama} di tempat.` },
        { jenis: 'teks', teks: `Dengan memperhatikan Peraturan Desa ${d.profil.noPerdesApbdes ?? '....'} tanggal ${tglPanjang(d.profil.tglPerdesApbdes) || '....'} tentang APBDes Tahun Anggaran ${ta}, bersama ini kami mengajukan permintaan pembayaran sebagai berikut:` },
        { jenis: 'kv', pasangan: [['Jenis SPP', s.jenis], ['Bidang', s.kdKeg ? `${s.kdKeg.split('.')[0]} ${d.kegMap.get(s.kdKeg.split('.')[0]) ?? ''}` : '-'], ['Kegiatan', namaKeg(d, s)], ['Waktu pelaksanaan', k?.waktu ?? '-'], ['Keperluan', s.uraian], ['Jumlah pembayaran', `Rp ${total.toLocaleString('id-ID')}`], ['Terbilang', terbilang(total)], ['Dibayar dari', s.kas === 'BANK' ? 'Rekening kas desa' : 'Kas tunai']] },
        { jenis: 'ttd', tempatTgl: `${d.desa.nama}, ${tglPanjang(s.tgl)}`, kolom: [{ atas: 'Telah diverifikasi,', jabatan: 'Sekretaris Desa', nama: d.profil.namaSekdes }, { atas: 'Setuju untuk dibayar,', jabatan: 'Kepala Desa', nama: d.profil.namaKades }, { jabatan: 'Pelaksana Kegiatan', nama: k?.pelaksana?.split(' - ')[1] }] },
      ], { draft: sppDraft(s), namaFile: `SPP1_${s.noSpp.replace(/\//g, '-')}` });
    }
    case 'spp2': {
      const s = sppDok(d, p.sppId);
      const snap = butuhPosting().rincian;
      const sebelum = d.spp.filter((x) => x.id !== s.id && x.status !== 'DITOLAK' && x.kdKeg === s.kdKeg && (x.tgl < s.tgl || (x.tgl === s.tgl && x.noSpp < s.noSpp)));
      const baris: BarisLap[] = s.rincian.map((r) => {
        const ang = snap.find((x) => x.kdKeg === s.kdKeg && x.kdRek === r.kdRek && x.sumberDana === r.sumberDana)?.nilai ?? 0;
        const lalu = sum(sebelum.flatMap((x) => x.rincian).filter((x) => x.kdRek === r.kdRek && x.sumberDana === r.sumberDana), (x) => x.nilai);
        return { sel: [r.kdRek, `${d.akunMap.get(r.kdRek) ?? ''} (${r.sumberDana})`, ang, lalu, r.nilai, lalu + r.nilai, ang - lalu - r.nilai] };
      });
      return lap(d, kode, ['PERNYATAAN TANGGUNG JAWAB BELANJA', `SPP Nomor ${s.noSpp}`], [
        { jenis: 'kv', pasangan: [['Kegiatan', namaKeg(d, s)], ['Jenis SPP', s.jenis], ['Tanggal', tglPanjang(s.tgl)]] },
        { jenis: 'tabel', kolom: [T('Kode', 50), T('Uraian', '*'), U('Anggaran', 75), U('SPP lalu', 70), U('SPP ini', 70), U('Jumlah s.d. ini', 75), U('Sisa Dana', 70)], baris: [...baris, { sel: ['', 'JUMLAH', sum(baris, (b) => Number(b.sel[2])), sum(baris, (b) => Number(b.sel[3])), sum(baris, (b) => Number(b.sel[4])), sum(baris, (b) => Number(b.sel[5])), sum(baris, (b) => Number(b.sel[6]))], tebal: true, latar: true }] },
        { jenis: 'teks', teks: 'Bertanggung jawab penuh atas kebenaran pengeluaran di atas dan sanggup mengembalikan apabila terdapat kelebihan pembayaran.', ukuran: 8, miring: true },
        { jenis: 'ttd', tempatTgl: `${d.desa.nama}, ${tglPanjang(s.tgl)}`, kolom: [{ jabatan: 'Pelaksana Kegiatan', nama: d.kegiatan.find((x) => x.kdKeg === s.kdKeg)?.pelaksana?.split(' - ')[1] }] },
      ], { orientasi: 'landscape', draft: sppDraft(s), namaFile: `SPP2_${s.noSpp.replace(/\//g, '-')}` });
    }
    case 'sptb': {
      const s = sppDok(d, p.sppId);
      const bukti = s.jenis === 'PANJAR' ? s.spj?.bukti ?? [] : s.bukti;
      return lap(d, kode, ['SURAT PERNYATAAN TANGGUNG JAWAB BELANJA (SPTB)', `SPP Nomor ${s.noSpp}`], [
        { jenis: 'kv', pasangan: [['Kegiatan', namaKeg(d, s)]] },
        { jenis: 'tabel', kolom: [T('No', 25, 'tengah'), T('No. Bukti', 70), T('Tanggal', 55), T('Penerima', 110), T('Uraian', '*'), T('Rekening', 55), U('Nilai', 75), U('Pajak', 65)],
          baris: [...bukti.map((b, i) => ({ sel: [i + 1, b.noBukti, tglID(b.tgl), b.penerima, b.uraian, b.kdRek, b.nilai, sum(b.pajak ?? [], (x) => x.nilai)] })),
            { sel: ['', '', '', '', 'JUMLAH', '', sum(bukti, (b) => b.nilai), sum(bukti, (b) => sum(b.pajak ?? [], (x) => x.nilai))], tebal: true, latar: true }] },
        { jenis: 'teks', teks: 'Bukti-bukti pengeluaran di atas disimpan oleh Kaur Keuangan untuk keperluan pemeriksaan.', ukuran: 8, miring: true },
        { jenis: 'ttd', tempatTgl: `${d.desa.nama}, ${tglPanjang(s.spj?.tgl ?? s.tgl)}`, kolom: [{ jabatan: 'Pelaksana Kegiatan' }] },
      ], { orientasi: 'landscape', draft: sppDraft(s), namaFile: `SPTB_${s.noSpp.replace(/\//g, '-')}` });
    }
    case 'kuitansi': {
      const s = sppDok(d, p.sppId);
      const bukti = s.jenis === 'PANJAR' ? s.spj?.bukti ?? [] : s.bukti;
      const blok: Blok[] = [];
      bukti.forEach((b, i) => {
        if (i) blok.push({ jenis: 'garis' });
        blok.push({ jenis: 'teks', teks: `KUITANSI  No. ${b.noBukti || '-'}`, tebal: true, rata: 'tengah', ukuran: 12 });
        blok.push({ jenis: 'kv', pasangan: [['Sudah terima dari', `Kaur Keuangan Desa ${d.desa.nama}`], ['Uang sebanyak', terbilang(b.nilai)], ['Untuk pembayaran', b.uraian], ['Kegiatan', namaKeg(d, s)], ['Kode rekening', `${b.kdRek} ${d.akunMap.get(b.kdRek) ?? ''}`], ['Jumlah', `Rp ${b.nilai.toLocaleString('id-ID')}`], ['Potongan pajak', (b.pajak ?? []).map((x) => `${PAJAK_LABEL[x.jenis]} Rp ${x.nilai.toLocaleString('id-ID')}`).join('; ') || '-']] });
        blok.push({ jenis: 'ttd', tempatTgl: `${d.desa.nama}, ${tglPanjang(b.tgl)}`, kolom: [{ atas: 'Lunas dibayar,', jabatan: 'Kaur Keuangan', nama: d.profil.namaKaurKeu }, { atas: 'Setuju dibayar,', jabatan: 'Pelaksana Kegiatan' }, { atas: 'Yang menerima,', jabatan: b.npwp ? `NPWP ${b.npwp}` : 'Penerima', nama: b.penerima }] });
      });
      if (!bukti.length) blok.push({ jenis: 'teks', teks: 'SPP ini belum memiliki bukti pengeluaran.' });
      return lap(d, kode, ['KUITANSI PEMBAYARAN'], blok, { draft: sppDraft(s), namaFile: `Kuitansi_${s.noSpp.replace(/\//g, '-')}` });
    }
    case 'registerSpp': {
      const rows = [...d.spp].sort((a, b) => a.noSpp.localeCompare(b.noSpp));
      return lap(d, kode, ['REGISTER SURAT PERMINTAAN PEMBAYARAN', `Tahun Anggaran ${ta}`], [
        { jenis: 'tabel', kolom: [T('No. SPP', 80), T('Tanggal', 55), T('Jenis', 55), T('Kegiatan', '*'), T('Uraian', '*'), U('Nilai', 80), T('Status', 65), T('Tgl Cair', 55)],
          baris: [...rows.map((s) => ({ sel: [s.noSpp, tglID(s.tgl), s.jenis, namaKeg(d, s), s.uraian, sum(s.rincian, (r) => r.nilai), s.status, tglID(s.pencairan?.tgl)] })),
            { sel: ['', '', '', '', 'JUMLAH', sum(rows.filter((s) => s.status !== 'DITOLAK'), (s) => sum(s.rincian, (r) => r.nilai)), '', ''], tebal: true, latar: true }] },
        ttdKaur(d),
      ], { orientasi: 'landscape' });
    }
    case 'registerKuitansi': {
      const rows = semuaBukti(d);
      return lap(d, kode, ['REGISTER KUITANSI', `Tahun Anggaran ${ta}`], [
        { jenis: 'tabel', kolom: [T('Tanggal', 50), T('No. Bukti', 60), T('No. SPP', 70), T('Penerima', 90), T('NPWP', 75), T('Bank/No. Rek', 85), T('Uraian', '*'), T('Rekening', 50), U('Nilai', 70)],
          baris: [...rows.map((b) => ({ sel: [tglID(b.tgl), b.noBukti, b.spp.noSpp, b.penerima, b.npwp ?? '', [b.bank, b.noRekening].filter(Boolean).join(' '), b.uraian, b.kdRek, b.nilai] })),
            { sel: ['', '', '', '', '', '', 'JUMLAH', '', sum(rows, (b) => b.nilai)], tebal: true, latar: true }] },
      ], { orientasi: 'landscape' });
    }
    case 'bku':
      return bukuKas(d, kode, 'BUKU KAS UMUM', (l) => !!l.kas && !l.jenis.startsWith('MUTASI'), (d.saldoAwal?.kasBank ?? 0) + (d.saldoAwal?.kasTunai ?? 0), bulan, undefined, undefined, { judul: 'Kode Rek', f: (l) => l.kdRek ?? '' });
    case 'bukuBank':
      return bukuKas(d, kode, 'BUKU PEMBANTU BANK', (l) => l.kas === 'BANK', d.saldoAwal?.kasBank ?? 0, bulan);
    case 'bukuTunai':
      return bukuKas(d, kode, 'BUKU PEMBANTU KAS TUNAI', (l) => l.kas === 'TUNAI', d.saldoAwal?.kasTunai ?? 0, bulan);
    case 'bukuPajak':
      return bukuKas(d, kode, 'BUKU PEMBANTU PAJAK', (l) => l.jenis === 'PUNGUT_PAJAK' || l.jenis === 'SETOR_PAJAK', d.saldoAwal?.utangPajak ?? 0, bulan, undefined, undefined, { judul: 'Jenis Pajak', f: (l) => (l.pajak ? PAJAK_LABEL[l.pajak] : '') });
    case 'bukuPanjar':
      return bukuKas(d, kode, 'BUKU PEMBANTU PANJAR', (l) => ['PANJAR', 'SPJ_PANJAR', 'KEMBALI_PANJAR'].includes(l.jenis), d.saldoAwal?.panjar ?? 0, bulan,
        (l) => (l.jenis === 'PANJAR' ? l.keluar : 0), (l) => (l.jenis === 'SPJ_PANJAR' ? l.keluar : l.jenis === 'KEMBALI_PANJAR' ? l.masuk : 0), { judul: 'Kegiatan', f: (l) => l.kdKeg ?? '' });
    case 'bukuKegiatan': {
      if (!p.kdKeg) throw new Error('Pilih kegiatan.');
      const r = bukuKas(d, kode, 'BUKU PEMBANTU KAS KEGIATAN', (l) => l.kdKeg === p.kdKeg && ['PANJAR', 'BELANJA', 'SPJ_PANJAR', 'KEMBALI_PANJAR'].includes(l.jenis), 0, 12,
        (l) => (l.jenis === 'PANJAR' || l.jenis === 'BELANJA' ? (l.keluar) : 0), (l) => (l.jenis === 'SPJ_PANJAR' || l.jenis === 'BELANJA' ? l.keluar : l.jenis === 'KEMBALI_PANJAR' ? l.masuk : 0), { judul: 'Kode Rek', f: (l) => l.kdRek ?? '' });
      r.judul.push(`Kegiatan ${p.kdKeg} ${d.kegMap.get(p.kdKeg) ?? ''}`);
      return r;
    }
    case 'rekapSiltap': {
      const rek = ['5.1.1.01', '5.1.1.02', '5.1.2.01', '5.1.2.02', '5.1.3.01', '5.1.3.02', '5.1.4.01', '5.1.4.02', '5.2.2.03'];
      const ang = butuhPosting().rincian;
      const real = realisasiPerKey(d.ledger, bulan);
      const baris = rek.filter((k) => ang.some((r) => r.kdRek === k)).map((k) => {
        const a = sum(ang.filter((r) => r.kdRek === k), (r) => r.nilai);
        const rr = sum(ang.filter((r) => r.kdRek === k), (r) => real.get(keyRinci(r.kdKeg, r.kdRek, r.sumberDana)) ?? 0);
        return { sel: [k, d.akunMap.get(k) ?? '', a, rr, a - rr, pct(rr, a)] };
      });
      return lap(d, kode, ['REKAPITULASI REALISASI PENGHASILAN TETAP DAN TUNJANGAN', `Januari s.d. ${nmBulan(bulan)} ${ta}`], [
        { jenis: 'tabel', kolom: [T('Kode', 55), T('Uraian', '*'), U('Anggaran', 85), U('Realisasi', 85), U('Sisa', 85), T('%', 45, 'kanan')], baris },
        ttdKaur(d),
      ]);
    }
    case 'jurnal': {
      const items = jurnalSemua(d, bulan);
      const baris: BarisLap[] = [];
      for (const j of items) j.baris.forEach((b, i) => baris.push({ sel: [i ? '' : tglID(j.tgl), i ? '' : j.no, i ? '' : j.uraian + (j.draft ? ' [DRAFT]' : ''), b.akun, (b.kredit ? '      ' : '') + (d.akunMap.get(b.akun) ?? ''), b.debet || null, b.kredit || null] }));
      baris.push({ sel: ['', '', 'JUMLAH', '', '', sum(items, (j) => sum(j.baris, (b) => b.debet)), sum(items, (j) => sum(j.baris, (b) => b.kredit))], tebal: true, latar: true });
      return lap(d, kode, ['JURNAL', `Januari s.d. ${nmBulan(bulan)} ${ta}`], [
        { jenis: 'tabel', kolom: [T('Tanggal', 50), T('No. Bukti', 70), T('Uraian', '*'), T('Akun', 50), T('Nama Akun', 150), U('Debet', 75), U('Kredit', 75)], baris },
      ], { orientasi: 'landscape', draft: items.some((j) => j.draft) });
    }
    case 'bukuBesar':
    case 'neracaSaldo': {
      const items = jurnalSemua(d, bulan);
      const sa = saldoAwalAkun(d);
      const akunList = [...new Set([...sa.keys(), ...items.flatMap((j) => j.baris.map((b) => b.akun))])].sort(cmpKode);
      const normalDebet = (a: string) => a.startsWith('1') || a.startsWith('5') || a.startsWith('6.2');
      if (kode === 'neracaSaldo') {
        const baris: BarisLap[] = akunList.map((a) => {
          const dd = sum(items.flatMap((j) => j.baris).filter((b) => b.akun === a), (b) => b.debet) + (normalDebet(a) ? sa.get(a) ?? 0 : 0);
          const kk = sum(items.flatMap((j) => j.baris).filter((b) => b.akun === a), (b) => b.kredit) + (!normalDebet(a) ? sa.get(a) ?? 0 : 0);
          const s = dd - kk;
          return { sel: [a, d.akunMap.get(a) ?? '', s > 0 ? s : null, s < 0 ? -s : null] };
        });
        const saldoEkuitas = sum([...sa.values()], (x) => x);
        if (saldoEkuitas) baris.push({ sel: ['3.1.1.01', d.akunMap.get('3.1.1.01') ?? 'Ekuitas Saldo Awal', null, saldoEkuitas] });
        baris.push({ sel: ['', 'JUMLAH', sum(baris, (b) => Number(b.sel[2] ?? 0)), sum(baris, (b) => Number(b.sel[3] ?? 0))], tebal: true, latar: true } as BarisLap);
        return lap(d, kode, ['NERACA SALDO', `Per ${tglPanjang(akhirBulan(ta, bulan))}`], [
          { jenis: 'tabel', kolom: [T('Kode Akun', 60), T('Nama Akun', '*'), U('Debet', 95), U('Kredit', 95)], baris },
        ], { draft: items.some((j) => j.draft) });
      }
      const pilih = p.akun ? [p.akun] : akunList;
      const blok: Blok[] = [];
      for (const a of pilih) {
        let saldo = sa.get(a) ?? 0;
        const nd = normalDebet(a);
        const baris: BarisLap[] = [{ sel: ['', '', 'Saldo awal', null, null, saldo], tebal: true }];
        for (const j of items) for (const b of j.baris.filter((x) => x.akun === a)) {
          saldo += nd ? b.debet - b.kredit : b.kredit - b.debet;
          baris.push({ sel: [tglID(j.tgl), j.no, j.uraian, b.debet || null, b.kredit || null, saldo] });
        }
        blok.push({ jenis: 'tabel', judul: `${a} ${d.akunMap.get(a) ?? ''}`, kolom: [T('Tanggal', 55), T('No. Bukti', 80), T('Uraian', '*'), U('Debet', 80), U('Kredit', 80), U('Saldo', 85)], baris });
      }
      return lap(d, kode, ['BUKU BESAR', `Januari s.d. ${nmBulan(bulan)} ${ta}`], blok, { orientasi: 'landscape', draft: items.some((j) => j.draft) });
    }
    case 'lra':
    case 'lpj': {
      const pst = butuhPosting();
      const sampai = kode === 'lpj' ? 12 : p.semester === 1 ? 6 : 12;
      const real = realisasiPerKey(d.ledger, sampai);
      const baris = strukturApbdes(d, pst.rincian, real, kode === 'lpj');
      const judul = kode === 'lpj' ? ['LAPORAN PERTANGGUNGJAWABAN REALISASI PELAKSANAAN APBDes', `Tahun Anggaran ${ta}`] : ['LAPORAN REALISASI PELAKSANAAN APBDes', sampai === 6 ? `Semester Pertama Tahun Anggaran ${ta}` : `Semester Akhir Tahun Anggaran ${ta}`];
      return lap(d, kode, judul, [
        { jenis: 'tabel', kolom: [T('Kode', 55), T('Uraian', '*'), U('Anggaran', 90), U('Realisasi', 90), U('Lebih/(Kurang)', 90)], baris },
        ttdKades(d),
      ], { orientasi: kode === 'lpj' ? 'portrait' : 'portrait' });
    }
    case 'lraSumberDana': {
      const pst = butuhPosting();
      const sampai = p.semester === 1 ? 6 : 12;
      const real = realisasiPerKey(d.ledger, sampai);
      const sds = [...new Set(pst.rincian.map((r) => r.sumberDana))].sort();
      const kel: [string, SnapshotRincian['kelompok']][] = [['Pendapatan', 'PENDAPATAN'], ['Belanja', 'BELANJA'], ['Penerimaan Pembiayaan', 'PEMBIAYAAN1'], ['Pengeluaran Pembiayaan', 'PEMBIAYAAN2']];
      const baris: BarisLap[] = [];
      for (const sd of sds) {
        baris.push({ sel: [sd, '', null, null, null, ''], tebal: true });
        for (const [lbl, k] of kel) {
          const rs = pst.rincian.filter((r) => r.sumberDana === sd && r.kelompok === k);
          if (!rs.length) continue;
          const a = sum(rs, (r) => r.nilai), rr = sum(rs, (r) => real.get(keyRinci(r.kdKeg, r.kdRek, r.sumberDana)) ?? 0);
          baris.push({ sel: ['', lbl, a, rr, rr - a, pct(rr, a)], indent: 1 });
        }
      }
      return lap(d, kode, ['LAPORAN REALISASI PER SUMBER DANA', `${sampai === 6 ? 'Semester I' : 'Sampai dengan Desember'} ${ta}`], [
        { jenis: 'tabel', kolom: [T('Sumber Dana', 60), T('Uraian', '*'), U('Anggaran', 90), U('Realisasi', 90), U('Lebih/(Kurang)', 90), T('%', 45, 'kanan')], baris },
        ttdKades(d),
      ]);
    }
    default:
      throw new Error(`Laporan ${kode} belum tersedia.`);
  }
}

/** Saldo kas per jenis untuk ringkasan di pratinjau (dipakai halaman laporan). */
export function saldoKasRingkas(d: DataLap): Record<JenisKas, number> {
  const s: Record<JenisKas, number> = { BANK: d.saldoAwal?.kasBank ?? 0, TUNAI: d.saldoAwal?.kasTunai ?? 0 };
  for (const l of d.ledger) if (l.kas) s[l.kas] += l.masuk - l.keluar;
  return s;
}

export const nomorUrut = (n: number) => padNo(n, 3);
