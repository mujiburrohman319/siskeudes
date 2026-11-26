import { beforeEach, describe, expect, it } from 'vitest';
import { terbilang } from './format';
import {
  jurnalDariLedger, lraPerRek, postingTerakhir, saldoKas, saldoPajak, saldoPanjar, totalAnggaran,
} from './keuangan';
import * as L from './layanan';
import { taCol, type Ctx } from './paths';
import { DEMO_PEMDA, isiContohApbdes, seedDemo } from './seed';
import { createLocalStore } from './store/local';
import type { DataStore } from './store/types';
import type { Ledger, Posting, SaldoAwal } from './types';

const TA = 2026;
const ctx: Ctx = { pemdaId: DEMO_PEMDA, desaId: 'desa01', ta: TA };
let store: DataStore;
let s: L.Sesi;

const ledger = () => store.list<Ledger>(taCol(ctx, 'ledger'));
const awal = () => store.get<SaldoAwal>(`${taCol(ctx, 'saldoAwal')}/main`);

beforeEach(async () => {
  store = createLocalStore({ persist: false });
  await seedDemo(store, TA);
  s = { store, ctx, oleh: 'penguji' };
});

describe('APBDes contoh', () => {
  it('seimbang dan dapat diposting', async () => {
    await isiContohApbdes(store, ctx, 'penguji', { posting: true });
    const p = postingTerakhir(await store.list<Posting>(taCol(ctx, 'posting')))!;
    const t = totalAnggaran(p.rincian);
    expect(t.pendapatan).toBe(1_230_000_000);
    expect(t.pendapatan - t.belanja + t.pembiayaan1 - t.pembiayaan2).toBe(0);
  });

  it('menolak posting awal kedua dan posting tanpa kegiatan wajib', async () => {
    await isiContohApbdes(store, ctx, 'penguji', { posting: true });
    await expect(L.postingApbdes(s, { jenis: 'AWAL', tgl: `${TA}-01-10`, dasarHukum: 'x' }, [])).rejects.toThrow(/sudah dilakukan/);
    const ctx2 = { ...ctx, desaId: 'desa03' };
    await L.simpanRincian({ ...s, ctx: ctx2 }, { kelompok: 'PENDAPATAN', kdRek: '4.2.1.01', sumberDana: 'DDS', rab: [{ uraian: 'DD', volume: 1, satuan: 'Th', harga: 10 }], rak: [10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    await expect(L.postingApbdes({ ...s, ctx: ctx2 }, { jenis: 'AWAL', tgl: `${TA}-01-10`, dasarHukum: 'x' }, ['1.1.01'])).rejects.toThrow(/wajib 1\.1\.01/);
  });

  it('menolak posting bila RAK tidak sama dengan anggaran', async () => {
    await L.simpanRincian(s, { kelompok: 'BELANJA', kdKeg: '1.1.01', kdRek: '5.1.1.01', sumberDana: 'ADD', rab: [{ uraian: 'x', volume: 12, satuan: 'OB', harga: 1000 }], rak: Array(12).fill(500) });
    await expect(L.postingApbdes(s, { jenis: 'AWAL', tgl: `${TA}-01-10`, dasarHukum: 'x' }, [])).rejects.toThrow(/RAK/);
  });
});

describe('Penatausahaan', () => {
  beforeEach(async () => {
    await isiContohApbdes(store, ctx, 'penguji', { posting: true, transaksi: true });
  });

  it('saldo kas sesuai perhitungan manual (BKU = Bank + Tunai)', async () => {
    const sal = saldoKas(await ledger(), await awal());
    // 20 jt + 100 jt − 4 jt + 50 rb − 2,2 jt + 230 rb − 200 rb − 1 jt (mutasi)
    expect(sal.BANK).toBe(112_880_000);
    expect(sal.TUNAI).toBe(1_000_000);
    const pj = saldoPajak(await ledger());
    expect(pj.PPN).toBe(0);
    expect(pj.PPH21).toBe(50_000);
    expect(pj.PPH22).toBe(30_000);
  });

  it('LRA: realisasi belanja dan pendapatan', async () => {
    const p = postingTerakhir(await store.list<Posting>(taCol(ctx, 'posting')))!;
    const rows = lraPerRek(p.rincian, await ledger());
    const get = (k: string) => rows.find((r) => r.kode === k)!;
    expect(get('5.1.1.01').realisasi).toBe(3_000_000);
    expect(get('5.2.1.01').realisasi).toBe(2_200_000);
    expect(get('4.2.3.01').realisasi).toBe(100_000_000);
    expect(get('6.1.1.01').realisasi).toBe(20_000_000);
  });

  it('setiap jurnal otomatis seimbang', async () => {
    for (const l of await ledger()) {
      const j = jurnalDariLedger(l);
      const d = j.reduce((t, b) => t + b.debet, 0);
      const k = j.reduce((t, b) => t + b.kredit, 0);
      expect(d).toBe(k);
    }
  });

  it('kontrol RAK: SPP melebihi jadwal anggaran kas ditolak', async () => {
    // Belanja jalan dijadwalkan mulai Juni; SPP bulan Maret harus ditolak.
    await expect(L.simpanSpp(s, {
      tgl: `${TA}-03-01`, jenis: 'PANJAR', kdKeg: '2.3.10', uraian: 'Uji', kas: 'BANK', bukti: [],
      rincian: [{ kdRek: '5.3.5.02', sumberDana: 'DDS', nilai: 1_000_000 }],
    }, true)).rejects.toThrow(/Anggaran Kas/);
    // Tanpa kontrol RAK, lolos.
    await expect(L.simpanSpp(s, {
      tgl: `${TA}-03-01`, jenis: 'PANJAR', kdKeg: '2.3.10', uraian: 'Uji', kas: 'BANK', bukti: [],
      rincian: [{ kdRek: '5.3.5.02', sumberDana: 'DDS', nilai: 1_000_000 }],
    }, false)).resolves.toBeTruthy();
  });

  it('SPP harus melalui verifikasi dan persetujuan sebelum dicairkan', async () => {
    const spp = await L.simpanSpp(s, {
      tgl: `${TA}-03-01`, jenis: 'PANJAR', kdKeg: '1.1.06', uraian: 'Rapat BPD', kas: 'BANK', bukti: [],
      rincian: [{ kdRek: '5.2.1.06', sumberDana: 'ADD', nilai: 1_000_000 }],
    }, true);
    await expect(L.cairkanSpp(s, spp.id, `${TA}-03-02`)).rejects.toThrow(/disetujui/);
    await expect(L.setujuiSpp(s, spp.id, true)).rejects.toThrow(/diverifikasi/);
  });

  it('panjar → SPJ → sisa kembali; saldo panjar nol', async () => {
    const spp = await L.simpanSpp(s, {
      tgl: `${TA}-03-01`, jenis: 'PANJAR', kdKeg: '1.1.06', uraian: 'Rapat BPD', kas: 'BANK', bukti: [],
      rincian: [{ kdRek: '5.2.1.06', sumberDana: 'ADD', nilai: 1_000_000 }],
    }, true);
    await L.verifikasiSpp(s, spp.id, true);
    await L.setujuiSpp(s, spp.id, true);
    await L.cairkanSpp(s, spp.id, `${TA}-03-02`);
    expect(saldoPanjar(await ledger())).toBe(1_000_000);
    await L.spjPanjar(s, spp.id, {
      tgl: `${TA}-03-10`, kasSisa: 'TUNAI',
      bukti: [{ id: 'b1', noBukti: 'NOTA-1', tgl: `${TA}-03-05`, penerima: 'RM Sederhana', uraian: 'Nasi kotak', kdRek: '5.2.1.06', sumberDana: 'ADD', nilai: 850_000, pajak: [] }],
    });
    expect(saldoPanjar(await ledger())).toBe(0);
    const sal = saldoKas(await ledger(), await awal());
    expect(sal.BANK).toBe(112_880_000 - 1_000_000);
    expect(sal.TUNAI).toBe(1_000_000 + 150_000);
  });

  it('penutupan kas mengunci bulan dan harus berurutan', async () => {
    await expect(L.tutupKasBulanan(s, 2)).rejects.toThrow(/bulan 1/);
    await L.tutupKasBulanan(s, 1);
    await expect(L.simpanPenerimaan(s, { tgl: `${TA}-01-30`, kdRek: '4.2.3.01', sumberDana: 'ADD', uraian: 'x', nilai: 1, kas: 'BANK' })).rejects.toThrow(/ditutup/);
    await L.kunciPenutupan(s, 1, true);
    await expect(L.bukaTutupKas(s, 1)).rejects.toThrow(/dikunci/);
  });

  it('saldo kas tidak boleh negatif', async () => {
    await expect(L.simpanMutasi(s, { tgl: `${TA}-02-20`, dari: 'TUNAI', ke: 'BANK', nilai: 5_000_000, uraian: 'x' })).rejects.toThrow(/tidak cukup/);
  });

  it('jurnal manual harus seimbang', async () => {
    await expect(L.simpanJurnal(s, { tgl: `${TA}-03-01`, uraian: 'x', baris: [{ akun: '1.1.1.01', debet: 10, kredit: 0 }, { akun: '3.1.1.01', debet: 0, kredit: 9 }] })).rejects.toThrow(/seimbang/);
  });
});

describe('format', () => {
  it('terbilang', () => {
    expect(terbilang(1_250_000)).toBe('Satu juta dua ratus lima puluh ribu rupiah');
    expect(terbilang(11_000)).toBe('Sebelas ribu rupiah');
    expect(terbilang(1_000)).toBe('Seribu rupiah');
  });
});
