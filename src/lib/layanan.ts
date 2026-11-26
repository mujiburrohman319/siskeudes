// Layanan transaksi: semua aturan bisnis yang mengubah data keuangan ada di sini,
// sehingga halaman UI tetap tipis dan aturan bisa diuji (lihat layanan.test.ts).
// Saat dipindah ke produksi, fungsi-fungsi ini dapat dijalankan di Cloud Functions (callable)
// tanpa mengubah logikanya.
import { bulanDari, padNo, sekarangISO, sum, uid } from './format';
import {
  cekPeriodeTerbuka, keyRinci, kelompokDariRek, komitmenSpp, nilaiRab, petaAnggaran, postingTerakhir,
  realisasiPerKey, saldoKas, saldoPajak, sisaPagu, totalAnggaran, validasiPosting,
} from './keuangan';
import { P, taCol, taDoc, type Ctx, type TaCol } from './paths';
import { KD_SILPA } from './referensi';
import type { DataStore, WriteOp } from './store/types';
import type {
  BuktiPengeluaran, JenisKas, JenisPosting, Jurnal, Ledger, Mutasi, Penerimaan, Pengembalian,
  PenutupanKas, Posting, RincianAnggaran, SaldoAwal, SetorPajak, Spp,
} from './types';

export interface Sesi {
  store: DataStore;
  ctx: Ctx;
  oleh: string; // nama/email pengguna untuk jejak
}

type WithLedger = { _ledger?: string[] };

const list = <T>(s: Sesi, c: TaCol) => s.store.list<T>(taCol(s.ctx, c));
const get = <T>(s: Sesi, c: TaCol, id: string) => s.store.get<T>(taDoc(s.ctx, c, id));

function auditOp(s: Sesi, aksi: string, ref: string, catatan?: string): WriteOp {
  return {
    type: 'set',
    path: taDoc(s.ctx, 'audit', uid('a')),
    data: { waktu: sekarangISO(), oleh: s.oleh, aksi, ref, catatan },
  };
}

function monitoringOp(s: Sesi, patch: Record<string, unknown>): WriteOp {
  return {
    type: 'set',
    path: `${P.monitoring(s.ctx.pemdaId)}/${s.ctx.ta}_${s.ctx.desaId}`,
    data: { ...patch, ta: s.ctx.ta, desaId: s.ctx.desaId, diperbarui: sekarangISO() },
    merge: true,
  };
}

const ledgerOp = (s: Sesi, l: Ledger): WriteOp => ({ type: 'set', path: taDoc(s.ctx, 'ledger', l.id), data: l });

async function nomor(s: Sesi, jenis: string): Promise<string> {
  const n = await s.store.nextNumber(taDoc(s.ctx, 'counter', jenis));
  return `${padNo(n)}/${jenis}/${s.ctx.ta}`;
}

async function penutupan(s: Sesi) {
  return list<PenutupanKas>(s, 'penutupanKas');
}

async function anggaranBerlaku(s: Sesi) {
  const p = postingTerakhir(await list<Posting>(s, 'posting'));
  if (!p) throw new Error('APBDes belum diposting. Lakukan Posting APBDes terlebih dahulu.');
  return p;
}

async function cekSaldoCukup(s: Sesi, kas: JenisKas, tgl: string, keluarNeto: number, abaikanRef?: string) {
  if (keluarNeto <= 0) return;
  const ledger = (await list<Ledger>(s, 'ledger')).filter((l) => l.refId !== abaikanRef);
  const awal = await get<SaldoAwal>(s, 'saldoAwal', 'main');
  const pada = saldoKas(ledger, awal, tgl)[kas];
  const akhir = saldoKas(ledger, awal)[kas];
  const tersedia = Math.min(pada, akhir);
  if (tersedia < keluarNeto) {
    throw new Error(`Saldo kas ${kas === 'BANK' ? 'bank' : 'tunai'} tidak cukup: tersedia ${tersedia.toLocaleString('id-ID')}, dibutuhkan ${keluarNeto.toLocaleString('id-ID')}.`);
  }
}

// ===================== PENGANGGARAN =====================

export async function simpanRincian(s: Sesi, input: Partial<RincianAnggaran> & Pick<RincianAnggaran, 'kelompok' | 'kdRek' | 'sumberDana'>) {
  const k = input.kelompok;
  const pref = k === 'PENDAPATAN' ? '4' : k === 'BELANJA' ? '5' : k === 'PEMBIAYAAN1' ? '6.1' : '6.2';
  if (!input.kdRek?.startsWith(pref)) throw new Error(`Kode rekening untuk ${k} harus diawali ${pref}.`);
  if (k === 'BELANJA' && !input.kdKeg) throw new Error('Pilih kegiatan untuk rincian belanja.');
  if (!input.sumberDana) throw new Error('Pilih sumber dana.');
  const rab = (input.rab ?? []).map((x) => ({ ...x, volume: Number(x.volume) || 0, harga: Math.round(Number(x.harga) || 0) }));
  const nilai = nilaiRab({ rab });
  const id = input.id ?? uid('r');
  const kdKeg = k === 'BELANJA' ? input.kdKeg : undefined;
  const semua = await list<RincianAnggaran>(s, 'rincian');
  const dup = semua.find((r) => r.id !== id && keyRinci(r.kdKeg, r.kdRek, r.sumberDana) === keyRinci(kdKeg, input.kdRek, input.sumberDana));
  if (dup) throw new Error('Rincian dengan kegiatan, rekening, dan sumber dana yang sama sudah ada. Tambahkan baris RAB pada rincian tersebut.');
  const rak = input.rak && input.rak.length === 12 ? input.rak.map((x) => Math.round(Number(x) || 0)) : Array(12).fill(0);
  const row: RincianAnggaran = { id, kelompok: k, kdKeg, kdRek: input.kdRek, sumberDana: input.sumberDana, rab, nilai, rak };
  await s.store.set(taDoc(s.ctx, 'rincian', id), row);
  return row;
}

export async function simpanRak(s: Sesi, id: string, rak: number[]) {
  if (rak.length !== 12) throw new Error('RAK harus 12 bulan.');
  await s.store.set(taDoc(s.ctx, 'rincian', id), { rak: rak.map((x) => Math.round(Number(x) || 0)) }, true);
}

/** Otomatisasi rincian SiLPA 6.1.1.01 untuk setiap sumber dana (fitur 2.0.8 no. 10). */
export async function buatSilpaOtomatis(s: Sesi, sumberDana: string[]): Promise<number> {
  const semua = await list<RincianAnggaran>(s, 'rincian');
  const ops: WriteOp[] = [];
  for (const sd of sumberDana) {
    if (semua.some((r) => r.kdRek === KD_SILPA && r.sumberDana === sd)) continue;
    const id = uid('r');
    ops.push({
      type: 'set',
      path: taDoc(s.ctx, 'rincian', id),
      data: {
        kelompok: 'PEMBIAYAAN1', kdRek: KD_SILPA, sumberDana: sd,
        rab: [{ uraian: `SiLPA ${sd} tahun ${s.ctx.ta - 1}`, volume: 1, satuan: 'Tahun', harga: 0 }],
        nilai: 0, rak: Array(12).fill(0),
      },
    });
  }
  if (ops.length) await s.store.write(ops);
  return ops.length;
}

export async function postingApbdes(
  s: Sesi,
  inp: { jenis: JenisPosting; tgl: string; dasarHukum: string; tglDasarHukum?: string },
  kegiatanWajib: string[],
) {
  const rincian = await list<RincianAnggaran>(s, 'rincian');
  const postings = await list<Posting>(s, 'posting');
  if (!inp.dasarHukum?.trim()) throw new Error('Isi nomor Perdes/Perkades sebagai dasar posting.');
  const masalah = validasiPosting(rincian, kegiatanWajib, inp.jenis, postings.length > 0);
  const err = masalah.filter((m) => m.level === 'error');
  if (err.length) throw new Error(err.map((m) => m.pesan).join('\n'));
  const no = postings.length ? Math.max(...postings.map((p) => p.no)) + 1 : 1;
  const snapshot = rincian.map((r) => ({
    id: r.id, kelompok: r.kelompok, kdKeg: r.kdKeg, kdRek: r.kdRek, sumberDana: r.sumberDana, nilai: r.nilai, rak: r.rak,
  }));
  const total = totalAnggaran(snapshot);
  const p: Posting = { id: `P${no}`, no, jenis: inp.jenis, tgl: inp.tgl, dasarHukum: inp.dasarHukum, tglDasarHukum: inp.tglDasarHukum, rincian: snapshot, total, oleh: s.oleh };
  await s.store.write([
    { type: 'set', path: taDoc(s.ctx, 'posting', p.id), data: p },
    monitoringOp(s, { postingTerakhir: inp.jenis, postingNo: no, postingTgl: inp.tgl, anggaranBelanja: total.belanja }),
    auditOp(s, `POSTING_${inp.jenis}`, p.id, inp.dasarHukum),
  ]);
  return { posting: p, peringatan: masalah.filter((m) => m.level === 'warning') };
}

export async function batalPostingTerakhir(s: Sesi) {
  const postings = await list<Posting>(s, 'posting');
  const p = postingTerakhir(postings);
  if (!p) throw new Error('Belum ada posting.');
  const spp = await list<Spp>(s, 'spp');
  const tx = await list<Ledger>(s, 'ledger');
  if (p.no === 1 && (spp.length || tx.length)) throw new Error('Posting awal tidak bisa dibatalkan karena sudah ada transaksi.');
  const sebelum = postings.filter((x) => x.no !== p.no).sort((a, b) => b.no - a.no)[0];
  await s.store.write([
    { type: 'delete', path: taDoc(s.ctx, 'posting', p.id) },
    monitoringOp(s, sebelum
      ? { postingTerakhir: sebelum.jenis, postingNo: sebelum.no, postingTgl: sebelum.tgl, anggaranBelanja: sebelum.total.belanja }
      : { postingTerakhir: null, postingNo: 0, postingTgl: null, anggaranBelanja: 0 }),
    auditOp(s, 'BATAL_POSTING', p.id),
  ]);
}

// ===================== PENERIMAAN =====================

export async function simpanPenerimaan(s: Sesi, inp: Omit<Penerimaan, 'id' | 'noBukti'> & { id?: string; noBukti?: string }) {
  if (!(inp.nilai > 0)) throw new Error('Nilai harus lebih dari 0.');
  const tutup = await penutupan(s);
  cekPeriodeTerbuka(inp.tgl, tutup, s.ctx.ta);
  const kel = kelompokDariRek(inp.kdRek);
  if (kel !== 'PENDAPATAN' && kel !== 'PEMBIAYAAN1') throw new Error('Penerimaan hanya untuk rekening pendapatan (4) atau penerimaan pembiayaan (6.1).');
  const p = await anggaranBerlaku(s);
  if (!p.rincian.some((r) => r.kdRek === inp.kdRek && r.sumberDana === inp.sumberDana)) {
    throw new Error(`Rekening ${inp.kdRek} dengan sumber dana ${inp.sumberDana} tidak ada dalam APBDes yang diposting.`);
  }
  const lama = inp.id ? await get<Penerimaan & WithLedger>(s, 'penerimaan', inp.id) : null;
  if (lama) cekPeriodeTerbuka(lama.tgl, tutup, s.ctx.ta);
  const id = inp.id ?? uid('t');
  const noBukti = inp.noBukti || lama?.noBukti || (await nomor(s, 'TBP'));
  const silpa = inp.kdRek === KD_SILPA;
  const l: Ledger = {
    id: `${id}_0`, tgl: inp.tgl, bulan: bulanDari(inp.tgl), noBukti, uraian: inp.uraian,
    jenis: silpa ? 'SILPA' : kel === 'PENDAPATAN' ? 'PENDAPATAN' : 'PEMBIAYAAN_TERIMA',
    kas: silpa ? null : inp.kas, masuk: inp.nilai, keluar: 0, kdRek: inp.kdRek, sumberDana: inp.sumberDana,
    refType: 'penerimaan', refId: id, realisasi: inp.nilai,
  };
  const ops: WriteOp[] = [];
  for (const lid of lama?._ledger ?? []) ops.push({ type: 'delete', path: taDoc(s.ctx, 'ledger', lid) });
  ops.push({ type: 'set', path: taDoc(s.ctx, 'penerimaan', id), data: { ...inp, id, noBukti, _ledger: [l.id] } });
  ops.push(ledgerOp(s, l));
  ops.push(auditOp(s, lama ? 'UBAH_PENERIMAAN' : 'TAMBAH_PENERIMAAN', id, `${noBukti} ${inp.nilai}`));
  await s.store.write(ops);
  return id;
}

/** Hapus dokumen transaksi beserta baris bukunya. */
export async function hapusTransaksi(s: Sesi, col: 'penerimaan' | 'setorPajak' | 'mutasi' | 'pengembalian', id: string) {
  const d = await get<{ tgl: string } & WithLedger>(s, col, id);
  if (!d) return;
  cekPeriodeTerbuka(d.tgl, await penutupan(s), s.ctx.ta);
  const ops: WriteOp[] = (d._ledger ?? []).map((lid) => ({ type: 'delete' as const, path: taDoc(s.ctx, 'ledger', lid) }));
  ops.push({ type: 'delete', path: taDoc(s.ctx, col, id) });
  ops.push(auditOp(s, `HAPUS_${col.toUpperCase()}`, id));
  await s.store.write(ops);
}

// ===================== SPP =====================

export async function simpanSpp(
  s: Sesi,
  inp: Omit<Spp, 'id' | 'noSpp' | 'status'> & { id?: string },
  kontrolRAK: boolean,
) {
  const tutup = await penutupan(s);
  cekPeriodeTerbuka(inp.tgl, tutup, s.ctx.ta);
  const lama = inp.id ? await get<Spp>(s, 'spp', inp.id) : null;
  if (lama && !['DRAFT', 'DITOLAK'].includes(lama.status)) throw new Error('SPP yang sudah diverifikasi tidak dapat diubah.');
  if (inp.jenis !== 'PEMBIAYAAN' && !inp.kdKeg) throw new Error('Pilih kegiatan.');
  const rincian = inp.rincian.filter((r) => r.nilai > 0);
  if (!rincian.length) throw new Error('Isi minimal satu rincian SPP dengan nilai lebih dari 0.');
  for (const r of rincian) {
    const kel = kelompokDariRek(r.kdRek);
    if (inp.jenis === 'PEMBIAYAAN' && kel !== 'PEMBIAYAAN2') throw new Error('SPP Pembiayaan hanya untuk rekening 6.2.');
    if (inp.jenis !== 'PEMBIAYAAN' && kel !== 'BELANJA') throw new Error('SPP kegiatan hanya untuk rekening belanja (5).');
  }
  const p = await anggaranBerlaku(s);
  const peta = petaAnggaran(p.rincian);
  const spps = await list<Spp>(s, 'spp');
  const kom = komitmenSpp(spps, await list<Pengembalian>(s, 'pengembalian'), inp.id);
  const keg = inp.jenis === 'PEMBIAYAAN' ? undefined : inp.kdKeg;
  const perKey = new Map<string, number>();
  for (const r of rincian) perKey.set(keyRinci(keg, r.kdRek, r.sumberDana), (perKey.get(keyRinci(keg, r.kdRek, r.sumberDana)) ?? 0) + r.nilai);
  for (const [k, v] of perKey) {
    const a = peta.get(k);
    if (!a) throw new Error(`Rekening ${k.split('|')[1]} (${k.split('|')[2]}) tidak ada di anggaran kegiatan ini.`);
    const sp = sisaPagu({ anggaran: a, komitmen: kom.get(k) ?? 0, tglSpp: inp.tgl, kontrolRAK });
    if (v > sp.tersedia) {
      throw new Error(`Nilai SPP rekening ${a.kdRek} (${a.sumberDana}) ${v.toLocaleString('id-ID')} melebihi sisa pagu ${Math.max(sp.tersedia, 0).toLocaleString('id-ID')}${kontrolRAK ? ' menurut jadwal Anggaran Kas (RAK) sampai bulan SPP' : ''}.`);
    }
  }
  let bukti: BuktiPengeluaran[] = [];
  if (inp.jenis !== 'PANJAR') {
    bukti = (inp.bukti ?? []).filter((b) => b.nilai > 0);
    if (!bukti.length) throw new Error('SPP definitif/pembiayaan wajib dilengkapi bukti pengeluaran.');
    const perKeyBukti = new Map<string, number>();
    for (const b of bukti) {
      if (!b.penerima) throw new Error(`Isi nama penerima pada bukti ${b.noBukti || ''}.`);
      const pj = sum(b.pajak ?? [], (x) => x.nilai);
      if (pj > b.nilai) throw new Error('Pajak tidak boleh melebihi nilai bukti.');
      const k = keyRinci(keg, b.kdRek, b.sumberDana);
      perKeyBukti.set(k, (perKeyBukti.get(k) ?? 0) + b.nilai);
    }
    for (const [k, v] of perKey) {
      if ((perKeyBukti.get(k) ?? 0) !== v) throw new Error(`Jumlah bukti rekening ${k.split('|')[1]} (${k.split('|')[2]}) harus sama dengan rincian SPP (${v.toLocaleString('id-ID')}).`);
    }
    if ([...perKeyBukti.keys()].some((k) => !perKey.has(k))) throw new Error('Ada bukti dengan rekening yang tidak ada di rincian SPP.');
  }
  const id = inp.id ?? uid('s');
  const noSpp = lama?.noSpp ?? (await nomor(s, 'SPP'));
  const spp: Spp = { ...inp, id, noSpp, status: 'DRAFT', rincian, bukti, kdKeg: keg };
  delete (spp as Partial<Spp>).ditolak;
  await s.store.write([
    { type: 'set', path: taDoc(s.ctx, 'spp', id), data: spp },
    auditOp(s, lama ? 'UBAH_SPP' : 'BUAT_SPP', id, noSpp),
  ]);
  return spp;
}

export async function hapusSpp(s: Sesi, id: string) {
  const d = await get<Spp>(s, 'spp', id);
  if (!d) return;
  if (!['DRAFT', 'DITOLAK'].includes(d.status)) throw new Error('Hanya SPP berstatus Draft/Ditolak yang dapat dihapus.');
  await s.store.write([{ type: 'delete', path: taDoc(s.ctx, 'spp', id) }, auditOp(s, 'HAPUS_SPP', id, d.noSpp)]);
}

export async function verifikasiSpp(s: Sesi, id: string, setuju: boolean, catatan?: string) {
  const d = await get<Spp>(s, 'spp', id);
  if (!d || d.status !== 'DRAFT') throw new Error('Hanya SPP berstatus Draft yang dapat diverifikasi.');
  const jejak = { oleh: s.oleh, tgl: sekarangISO(), catatan };
  await s.store.write([
    { type: 'set', path: taDoc(s.ctx, 'spp', id), data: setuju ? { status: 'DIVERIFIKASI', verifikasi: jejak } : { status: 'DITOLAK', ditolak: jejak }, merge: true },
    auditOp(s, setuju ? 'VERIFIKASI_SPP' : 'TOLAK_SPP', id, catatan),
  ]);
}

export async function setujuiSpp(s: Sesi, id: string, setuju: boolean, catatan?: string) {
  const d = await get<Spp>(s, 'spp', id);
  if (!d || d.status !== 'DIVERIFIKASI') throw new Error('Hanya SPP yang sudah diverifikasi Sekretaris Desa yang dapat disetujui.');
  const jejak = { oleh: s.oleh, tgl: sekarangISO(), catatan };
  await s.store.write([
    { type: 'set', path: taDoc(s.ctx, 'spp', id), data: setuju ? { status: 'DISETUJUI', persetujuan: jejak } : { status: 'DITOLAK', ditolak: jejak }, merge: true },
    auditOp(s, setuju ? 'SETUJUI_SPP' : 'TOLAK_SPP', id, catatan),
  ]);
}

export async function cairkanSpp(s: Sesi, id: string, tgl: string) {
  const d = await get<Spp & WithLedger>(s, 'spp', id);
  if (!d || d.status !== 'DISETUJUI') throw new Error('Hanya SPP yang sudah disetujui Kepala Desa yang dapat dicairkan.');
  cekPeriodeTerbuka(tgl, await penutupan(s), s.ctx.ta);
  if (tgl < d.tgl) throw new Error('Tanggal pencairan tidak boleh sebelum tanggal SPP.');
  const noBukti = await nomor(s, 'BKT');
  const total = sum(d.rincian, (r) => r.nilai);
  const pajak = sum(d.bukti ?? [], (b) => sum(b.pajak ?? [], (x) => x.nilai));
  await cekSaldoCukup(s, d.kas, tgl, total - pajak);
  const bln = bulanDari(tgl);
  const L: Ledger[] = [];
  const keg = d.jenis === 'PEMBIAYAAN' ? undefined : d.kdKeg;
  if (d.jenis === 'PANJAR') {
    L.push({ id: `${id}_c0`, tgl, bulan: bln, noBukti, uraian: `Panjar: ${d.uraian}`, jenis: 'PANJAR', kas: d.kas, masuk: 0, keluar: total, kdKeg: keg, refType: 'spp', refId: id });
  } else {
    d.bukti.forEach((b, i) => {
      L.push({
        id: `${id}_c${i}`, tgl, bulan: bln, noBukti: b.noBukti || noBukti, uraian: `${b.uraian} (${b.penerima})`,
        jenis: d.jenis === 'PEMBIAYAAN' ? 'PEMBIAYAAN_KELUAR' : 'BELANJA', kas: d.kas, masuk: 0, keluar: b.nilai,
        kdKeg: keg, kdRek: b.kdRek, sumberDana: b.sumberDana, refType: 'spp', refId: id, realisasi: b.nilai,
      });
      (b.pajak ?? []).filter((x) => x.nilai > 0).forEach((x, j) => {
        L.push({
          id: `${id}_c${i}p${j}`, tgl, bulan: bln, noBukti: b.noBukti || noBukti, uraian: `Pungut ${x.jenis} atas ${b.uraian}`,
          jenis: 'PUNGUT_PAJAK', kas: d.kas, masuk: x.nilai, keluar: 0, pajak: x.jenis, kdKeg: keg, refType: 'spp', refId: id,
        });
      });
    });
  }
  const status = d.jenis === 'PANJAR' ? 'DICAIRKAN' : 'SELESAI';
  await s.store.write([
    ...L.map((l) => ledgerOp(s, l)),
    { type: 'set', path: taDoc(s.ctx, 'spp', id), data: { status, pencairan: { oleh: s.oleh, tgl, noBukti }, _ledger: L.map((l) => l.id) }, merge: true },
    auditOp(s, 'CAIRKAN_SPP', id, `${d.noSpp} ${total}`),
  ]);
}

export async function batalCairSpp(s: Sesi, id: string) {
  const d = await get<Spp & WithLedger>(s, 'spp', id);
  if (!d || !['DICAIRKAN', 'SELESAI'].includes(d.status) || d.spj) throw new Error('Hanya pencairan tanpa SPJ yang dapat dibatalkan.');
  cekPeriodeTerbuka(d.pencairan!.tgl, await penutupan(s), s.ctx.ta);
  await s.store.write([
    ...(d._ledger ?? []).map((l) => ({ type: 'delete' as const, path: taDoc(s.ctx, 'ledger', l) })),
    { type: 'set', path: taDoc(s.ctx, 'spp', id), data: { ...d, status: 'DISETUJUI', pencairan: null, _ledger: [] } },
    auditOp(s, 'BATAL_CAIR_SPP', id, d.noSpp),
  ]);
}

export async function spjPanjar(s: Sesi, id: string, inp: { tgl: string; bukti: BuktiPengeluaran[]; kasSisa: JenisKas }) {
  const d = await get<Spp & WithLedger>(s, 'spp', id);
  if (!d || d.jenis !== 'PANJAR' || d.status !== 'DICAIRKAN') throw new Error('SPJ hanya untuk SPP panjar yang sudah dicairkan.');
  cekPeriodeTerbuka(inp.tgl, await penutupan(s), s.ctx.ta);
  if (inp.tgl < d.pencairan!.tgl) throw new Error('Tanggal SPJ tidak boleh sebelum tanggal pencairan.');
  const bukti = inp.bukti.filter((b) => b.nilai > 0);
  if (!bukti.length) throw new Error('Isi bukti pertanggungjawaban.');
  const total = sum(d.rincian, (r) => r.nilai);
  const perKeyRinci = new Map(d.rincian.map((r) => [`${r.kdRek}|${r.sumberDana}`, r.nilai]));
  const perKeyBukti = new Map<string, number>();
  for (const b of bukti) {
    const k = `${b.kdRek}|${b.sumberDana}`;
    if (!perKeyRinci.has(k)) throw new Error(`Rekening ${b.kdRek} (${b.sumberDana}) tidak ada di rincian SPP panjar.`);
    perKeyBukti.set(k, (perKeyBukti.get(k) ?? 0) + b.nilai);
    if (!b.penerima) throw new Error('Isi nama penerima pada setiap bukti.');
  }
  for (const [k, v] of perKeyBukti) if (v > (perKeyRinci.get(k) ?? 0)) throw new Error(`Bukti rekening ${k.split('|')[0]} melebihi panjar untuk rekening tersebut.`);
  const realisasi = sum(bukti, (b) => b.nilai);
  const sisa = total - realisasi;
  const bln = bulanDari(inp.tgl);
  const noBukti = await nomor(s, 'SPJ');
  const L: Ledger[] = [];
  bukti.forEach((b, i) => {
    L.push({
      id: `${id}_s${i}`, tgl: inp.tgl, bulan: bln, noBukti: b.noBukti || noBukti, uraian: `SPJ ${b.uraian} (${b.penerima})`,
      jenis: 'SPJ_PANJAR', kas: null, masuk: 0, keluar: b.nilai, kdKeg: d.kdKeg, kdRek: b.kdRek, sumberDana: b.sumberDana,
      refType: 'spp', refId: id, realisasi: b.nilai,
    });
    (b.pajak ?? []).filter((x) => x.nilai > 0).forEach((x, j) => {
      L.push({
        id: `${id}_s${i}p${j}`, tgl: inp.tgl, bulan: bln, noBukti: b.noBukti || noBukti, uraian: `Pungut ${x.jenis} atas ${b.uraian}`,
        jenis: 'PUNGUT_PAJAK', kas: d.kas, masuk: x.nilai, keluar: 0, pajak: x.jenis, kdKeg: d.kdKeg, refType: 'spp', refId: id,
      });
    });
  });
  if (sisa > 0) {
    L.push({ id: `${id}_sk`, tgl: inp.tgl, bulan: bln, noBukti, uraian: `Pengembalian sisa panjar ${d.noSpp}`, jenis: 'KEMBALI_PANJAR', kas: inp.kasSisa, masuk: sisa, keluar: 0, kdKeg: d.kdKeg, refType: 'spp', refId: id });
  }
  await s.store.write([
    ...L.map((l) => ledgerOp(s, l)),
    {
      type: 'set', path: taDoc(s.ctx, 'spp', id),
      data: { status: 'SELESAI', spj: { tgl: inp.tgl, bukti, sisa, kasSisa: inp.kasSisa, oleh: s.oleh }, _ledger: [...(d._ledger ?? []), ...L.map((l) => l.id)] },
      merge: true,
    },
    auditOp(s, 'SPJ_PANJAR', id, `${d.noSpp} realisasi ${realisasi} sisa ${sisa}`),
  ]);
}

// ===================== PAJAK, MUTASI, PENGEMBALIAN =====================

export async function simpanSetorPajak(s: Sesi, inp: Omit<SetorPajak, 'id' | 'noBukti'> & { noBukti?: string }) {
  if (!(inp.nilai > 0)) throw new Error('Nilai harus lebih dari 0.');
  cekPeriodeTerbuka(inp.tgl, await penutupan(s), s.ctx.ta);
  const ledger = await list<Ledger>(s, 'ledger');
  const saldo = saldoPajak(ledger)[inp.jenis];
  if (inp.nilai > saldo) throw new Error(`Nilai setoran melebihi saldo ${inp.jenis} yang dipungut (${saldo.toLocaleString('id-ID')}).`);
  await cekSaldoCukup(s, inp.kas, inp.tgl, inp.nilai);
  const id = uid('p');
  const noBukti = inp.noBukti || (await nomor(s, 'PJK'));
  const l: Ledger = { id: `${id}_0`, tgl: inp.tgl, bulan: bulanDari(inp.tgl), noBukti, uraian: `Setor ${inp.jenis}${inp.ntpn ? ` NTPN ${inp.ntpn}` : ''}`, jenis: 'SETOR_PAJAK', kas: inp.kas, masuk: 0, keluar: inp.nilai, pajak: inp.jenis, refType: 'setorPajak', refId: id };
  await s.store.write([
    { type: 'set', path: taDoc(s.ctx, 'setorPajak', id), data: { ...inp, id, noBukti, _ledger: [l.id] } },
    ledgerOp(s, l),
    auditOp(s, 'SETOR_PAJAK', id, `${inp.jenis} ${inp.nilai}`),
  ]);
}

export async function simpanMutasi(s: Sesi, inp: Omit<Mutasi, 'id' | 'noBukti'>) {
  if (inp.dari === inp.ke) throw new Error('Kas asal dan tujuan harus berbeda.');
  if (!(inp.nilai > 0)) throw new Error('Nilai harus lebih dari 0.');
  cekPeriodeTerbuka(inp.tgl, await penutupan(s), s.ctx.ta);
  await cekSaldoCukup(s, inp.dari, inp.tgl, inp.nilai);
  const id = uid('m');
  const noBukti = await nomor(s, 'MTS');
  const bln = bulanDari(inp.tgl);
  const L: Ledger[] = [
    { id: `${id}_k`, tgl: inp.tgl, bulan: bln, noBukti, uraian: inp.uraian, jenis: 'MUTASI_KELUAR', kas: inp.dari, kasLawan: inp.ke, masuk: 0, keluar: inp.nilai, refType: 'mutasi', refId: id },
    { id: `${id}_m`, tgl: inp.tgl, bulan: bln, noBukti, uraian: inp.uraian, jenis: 'MUTASI_MASUK', kas: inp.ke, kasLawan: inp.dari, masuk: inp.nilai, keluar: 0, refType: 'mutasi', refId: id },
  ];
  await s.store.write([
    { type: 'set', path: taDoc(s.ctx, 'mutasi', id), data: { ...inp, id, noBukti, _ledger: L.map((l) => l.id) } },
    ...L.map((l) => ledgerOp(s, l)),
    auditOp(s, 'MUTASI_KAS', id, `${inp.dari}->${inp.ke} ${inp.nilai}`),
  ]);
}

export async function simpanPengembalian(s: Sesi, inp: Omit<Pengembalian, 'id' | 'noBukti'>) {
  if (!(inp.nilai > 0)) throw new Error('Nilai harus lebih dari 0.');
  cekPeriodeTerbuka(inp.tgl, await penutupan(s), s.ctx.ta);
  const ledger = await list<Ledger>(s, 'ledger');
  const k = keyRinci(inp.kdKeg, inp.kdRek, inp.sumberDana);
  const real = realisasiPerKey(ledger).get(k) ?? 0;
  if (inp.nilai > real) throw new Error(`Pengembalian melebihi realisasi rekening tersebut (${real.toLocaleString('id-ID')}).`);
  const id = uid('k');
  const noBukti = await nomor(s, 'PBY');
  const l: Ledger = { id: `${id}_0`, tgl: inp.tgl, bulan: bulanDari(inp.tgl), noBukti, uraian: inp.uraian, jenis: 'PENGEMBALIAN', kas: inp.kas, masuk: inp.nilai, keluar: 0, kdKeg: inp.kdKeg, kdRek: inp.kdRek, sumberDana: inp.sumberDana, refType: 'pengembalian', refId: id, realisasi: -inp.nilai };
  await s.store.write([
    { type: 'set', path: taDoc(s.ctx, 'pengembalian', id), data: { ...inp, id, noBukti, _ledger: [l.id] } },
    ledgerOp(s, l),
    auditOp(s, 'PENGEMBALIAN_BELANJA', id, `${inp.kdRek} ${inp.nilai}`),
  ]);
}

// ===================== PENUTUPAN KAS =====================

const akhirBulan = (ta: number, b: number) => {
  const d = new Date(Date.UTC(ta, b, 0));
  return d.toISOString().slice(0, 10);
};

export async function tutupKasBulanan(s: Sesi, bulan: number) {
  const tutup = await penutupan(s);
  const maks = tutup.length ? Math.max(...tutup.map((t) => t.bulan)) : 0;
  if (bulan !== maks + 1) throw new Error(maks ? `Tutup kas berurutan: bulan berikutnya yang dapat ditutup adalah ${maks + 1}.` : 'Penutupan kas dimulai dari bulan 1 (Januari).');
  const ledger = await list<Ledger>(s, 'ledger');
  const awal = await get<SaldoAwal>(s, 'saldoAwal', 'main');
  const sal = saldoKas(ledger, awal, akhirBulan(s.ctx.ta, bulan));
  const id = String(bulan).padStart(2, '0');
  const doc: PenutupanKas = { id, bulan, tgl: sekarangISO(), saldoBank: sal.BANK, saldoTunai: sal.TUNAI, oleh: s.oleh };
  await s.store.write([
    { type: 'set', path: taDoc(s.ctx, 'penutupanKas', id), data: doc },
    monitoringOp(s, { bulanTutup: bulan }),
    auditOp(s, 'TUTUP_KAS', id),
  ]);
  return doc;
}

export async function bukaTutupKas(s: Sesi, bulan: number) {
  const tutup = await penutupan(s);
  const maks = Math.max(0, ...tutup.map((t) => t.bulan));
  if (bulan !== maks) throw new Error('Hanya penutupan kas bulan terakhir yang dapat dibuka.');
  const t = tutup.find((x) => x.bulan === bulan)!;
  if (t.dikunciKab) throw new Error('Penutupan kas ini sudah dikunci Kabupaten. Hubungi Admin Kabupaten.');
  await s.store.write([
    { type: 'delete', path: taDoc(s.ctx, 'penutupanKas', t.id) },
    monitoringOp(s, { bulanTutup: bulan - 1 }),
    auditOp(s, 'BUKA_TUTUP_KAS', t.id),
  ]);
}

/** Admin Kabupaten mengunci/membuka kunci penutupan kas desa. */
export async function kunciPenutupan(s: Sesi, bulan: number, kunci: boolean, alasan?: string) {
  const id = String(bulan).padStart(2, '0');
  const t = await get<PenutupanKas>(s, 'penutupanKas', id);
  if (!t) throw new Error('Desa belum menutup kas bulan tersebut.');
  if (!kunci && !alasan?.trim()) throw new Error('Isi alasan membuka kunci.');
  await s.store.write([
    { type: 'set', path: taDoc(s.ctx, 'penutupanKas', id), data: { dikunciKab: kunci, dikunciOleh: s.oleh }, merge: true },
    auditOp(s, kunci ? 'KUNCI_KAB' : 'BUKA_KUNCI_KAB', id, alasan),
  ]);
}

// ===================== PEMBUKUAN =====================

export async function simpanSaldoAwal(s: Sesi, d: SaldoAwal) {
  const tutup = await penutupan(s);
  if (tutup.length) throw new Error('Saldo awal tidak dapat diubah setelah ada penutupan kas.');
  await s.store.write([
    { type: 'set', path: taDoc(s.ctx, 'saldoAwal', 'main'), data: d },
    auditOp(s, 'SALDO_AWAL', 'main'),
  ]);
}

export async function simpanJurnal(s: Sesi, j: Omit<Jurnal, 'id' | 'no' | 'posted'> & { id?: string }) {
  cekPeriodeTerbuka(j.tgl, await penutupan(s), s.ctx.ta);
  const baris = j.baris.filter((b) => b.akun && (b.debet || b.kredit));
  if (baris.length < 2) throw new Error('Jurnal minimal dua baris.');
  const d = sum(baris, (b) => b.debet);
  const k = sum(baris, (b) => b.kredit);
  if (d !== k) throw new Error(`Jurnal tidak seimbang: debet ${d.toLocaleString('id-ID')} ≠ kredit ${k.toLocaleString('id-ID')}.`);
  const lama = j.id ? await get<Jurnal>(s, 'jurnal', j.id) : null;
  if (lama?.posted) throw new Error('Jurnal yang sudah diposting tidak dapat diubah.');
  const id = j.id ?? uid('j');
  const no = lama?.no ?? (await nomor(s, 'JU'));
  await s.store.write([
    { type: 'set', path: taDoc(s.ctx, 'jurnal', id), data: { ...j, id, no, baris, posted: false } },
    auditOp(s, lama ? 'UBAH_JURNAL' : 'TAMBAH_JURNAL', id),
  ]);
}

export async function postingJurnal(s: Sesi, id: string) {
  const j = await get<Jurnal>(s, 'jurnal', id);
  if (!j) return;
  cekPeriodeTerbuka(j.tgl, await penutupan(s), s.ctx.ta);
  await s.store.write([
    { type: 'set', path: taDoc(s.ctx, 'jurnal', id), data: { posted: true }, merge: true },
    auditOp(s, 'POSTING_JURNAL', id),
  ]);
}

export async function hapusJurnal(s: Sesi, id: string) {
  const j = await get<Jurnal>(s, 'jurnal', id);
  if (!j) return;
  if (j.posted) throw new Error('Jurnal yang sudah diposting tidak dapat dihapus.');
  await s.store.write([{ type: 'delete', path: taDoc(s.ctx, 'jurnal', id) }, auditOp(s, 'HAPUS_JURNAL', id)]);
}
