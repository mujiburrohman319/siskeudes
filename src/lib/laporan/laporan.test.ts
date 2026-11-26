import { describe, expect, it } from 'vitest';
import { isiContohApbdes, konfigurasiDefault, seedDemo, DEMO_PEMDA } from '../seed';
import { createLocalStore } from '../store/local';
import type { Ctx } from '../paths';
import type { Desa, Spp } from '../types';
import { DAFTAR_LAPORAN, buatLaporan } from './generator';
import type { DataLap } from './data';
import { definisiPdf } from './pdf';

// ambilData memakai store global; di sini kita susun DataLap memakai store lokal pengujian.
async function data(): Promise<DataLap> {
  const store = createLocalStore({ persist: false });
  const ta = 2026;
  await seedDemo(store, ta);
  const ctx: Ctx = { pemdaId: DEMO_PEMDA, desaId: 'desa01', ta };
  await isiContohApbdes(store, ctx, 'uji', { posting: true, transaksi: true });
  const { ambilDataDari } = await import('./data');
  const desa = (await store.get<Desa>(`pemda/${DEMO_PEMDA}/desa/desa01`))!;
  return ambilDataDari(store, ctx, desa, konfigurasiDefault());
}

describe('laporan', () => {
  it('semua laporan dapat disusun dan dibuat definisi PDF-nya', async () => {
    const d = await data();
    const spp = d.spp[0] as Spp;
    for (const def of DAFTAR_LAPORAN) {
      const l = buatLaporan(def.kode, d, { bulan: 12, semester: 2, sppId: spp.id, kdKeg: '1.1.01' });
      expect(l.blok.length, def.kode).toBeGreaterThan(0);
      const doc = definisiPdf(l, 'F4');
      expect(doc.content).toBeTruthy();
    }
  });

  it('LRA: baris SILPA tahun berjalan konsisten dengan saldo kas', async () => {
    const d = await data();
    const l = buatLaporan('lra', d, { semester: 2 });
    const tabel = l.blok.find((b) => b.jenis === 'tabel');
    if (tabel?.jenis !== 'tabel') throw new Error('tabel tidak ada');
    const silpa = tabel.baris.find((b) => b.sel[1] === 'SILPA/SiLPA TAHUN BERJALAN')!;
    expect(silpa.sel[2]).toBe(0); // anggaran seimbang
    // realisasi: pendapatan 100 jt − belanja 6,2 jt + SiLPA 20 jt = 113,8 jt
    expect(silpa.sel[3]).toBe(113_800_000);
    // = saldo kas akhir (112,88 jt bank + 1 jt tunai) − pajak belum disetor (80 rb)
    expect(113_880_000 - 80_000).toBe(silpa.sel[3]);
  });

  it('BKU: saldo akhir sama dengan saldo kas bank + tunai', async () => {
    const d = await data();
    const l = buatLaporan('bku', d, { bulan: 12 });
    const t = l.blok[0];
    if (t.jenis !== 'tabel') throw new Error();
    const akhir = t.baris[t.baris.length - 1].sel.at(-1);
    expect(akhir).toBe(113_880_000);
  });

  it('SPP belum dicairkan diberi watermark DRAFT', async () => {
    const d = await data();
    d.spp = d.spp.map((s) => ({ ...s, status: 'DISETUJUI' as const }));
    expect(buatLaporan('spp1', d, { sppId: d.spp[0].id }).draft).toBe(true);
  });

  it('neraca saldo seimbang', async () => {
    const d = await data();
    const l = buatLaporan('neracaSaldo', d, { bulan: 12 });
    const t = l.blok[0];
    if (t.jenis !== 'tabel') throw new Error();
    const j = t.baris[t.baris.length - 1].sel;
    expect(j[2]).toBe(j[3]);
  });
});

