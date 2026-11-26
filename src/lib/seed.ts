// Data awal: referensi, wilayah contoh, pengguna demo, dan APBDes contoh.
// Semua nama desa dan angka bersifat fiktif untuk latihan.
import { bagiRata } from './keuangan';
import * as L from './layanan';
import { P, taDoc, type Ctx } from './paths';
import { KEGIATAN_WAJIB_DEFAULT, REF_AKUN, REF_KEGIATAN, REF_SUMBER_DANA } from './referensi';
import type { DataStore, WriteOp } from './store/types';
import type { KelompokAnggaran, KonfigurasiKab, RabItem, Role } from './types';

export const DEMO_PEMDA = 'sambas-demo';

export async function seedReferensi(store: DataStore, pemdaId: string) {
  const ops: WriteOp[] = [
    ...REF_AKUN.map((r) => ({ type: 'set' as const, path: `${P.refAkun(pemdaId)}/${r.id}`, data: r })),
    ...REF_KEGIATAN.map((r) => ({ type: 'set' as const, path: `${P.refKegiatan(pemdaId)}/${r.id}`, data: r })),
    ...REF_SUMBER_DANA.map((r) => ({ type: 'set' as const, path: `${P.refSumberDana(pemdaId)}/${r.id}`, data: r })),
  ];
  await store.write(ops);
}

export function konfigurasiDefault(): KonfigurasiKab {
  return { kontrolRAK: true, kertas: 'A4', kegiatanWajib: KEGIATAN_WAJIB_DEFAULT, wajibLampiran: false, hakMenu: {} };
}

/** Membuat pemda contoh + pengguna demo (hanya mode lokal). */
export async function seedDemo(store: DataStore, ta: number) {
  const p = DEMO_PEMDA;
  if (await store.get(P.pemda(p))) return false;
  await store.write([
    { type: 'set', path: P.pemda(p), data: { nama: 'Kabupaten Sambas (Contoh)', provinsi: 'Kalimantan Barat', ibukota: 'Sambas', simulasi: true } },
    { type: 'set', path: `${P.kecamatan(p)}/kec01`, data: { kode: '61.01.01', nama: 'Sambas' } },
    { type: 'set', path: `${P.kecamatan(p)}/kec02`, data: { kode: '61.01.02', nama: 'Tebas' } },
    { type: 'set', path: `${P.desaCol(p)}/desa01`, data: { kode: '61.01.01.2001', nama: 'Sungai Harapan', kecId: 'kec01' } },
    { type: 'set', path: `${P.desaCol(p)}/desa02`, data: { kode: '61.01.01.2002', nama: 'Tanjung Makmur', kecId: 'kec01' } },
    { type: 'set', path: `${P.desaCol(p)}/desa03`, data: { kode: '61.01.02.2001', nama: 'Pantai Sejahtera', kecId: 'kec02' } },
    { type: 'set', path: P.konfigurasi(p, ta), data: konfigurasiDefault() },
  ]);
  await seedReferensi(store, p);
  const u = (email: string, password: string, nama: string, role: Role, desaId?: string, kecId?: string) => ({
    email, password, profile: { nama, role, grup: role, pemdaId: p, desaId, kecId, aktif: true },
  });
  await store.auth.createUsers([
    u('admin@demo.id', 'admin123', 'Admin DPMD Sambas', 'ADMIN_KAB'),
    u('kecamatan@demo.id', 'kec123', 'Operator Kec. Sambas', 'KECAMATAN', undefined, 'kec01'),
    u('operator@demo.id', 'desa123', 'Operator Desa Sungai Harapan', 'OPERATOR_DESA', 'desa01', 'kec01'),
    u('kades@demo.id', 'desa123', 'H. Abdul Rahman', 'KADES', 'desa01', 'kec01'),
    u('sekdes@demo.id', 'desa123', 'Siti Aminah', 'SEKDES', 'desa01', 'kec01'),
    u('kaur@demo.id', 'desa123', 'Rudi Hartono', 'KAUR_KEU', 'desa01', 'kec01'),
    u('mahasiswa@demo.id', 'mhs123', 'Mahasiswa Simulasi', 'MAHASISWA', 'desa02', 'kec01'),
  ]);
  return true;
}

const rab = (uraian: string, volume: number, satuan: string, harga: number): RabItem[] => [{ uraian, volume, satuan, harga }];

/** Mengisi APBDes contoh yang seimbang untuk satu desa, lalu (opsional) memposting dan membuat transaksi contoh. */
export async function isiContohApbdes(store: DataStore, ctx: Ctx, oleh: string, opsi: { posting?: boolean; transaksi?: boolean } = {}) {
  const s: L.Sesi = { store, ctx, oleh };
  const ta = ctx.ta;
  const ref = new Map(REF_KEGIATAN.map((k) => [k.kode, k.nama]));
  const keg = ['1.1.01', '1.1.02', '1.1.03', '1.1.04', '1.1.05', '1.1.06', '1.1.07', '1.4.04', '2.2.02', '2.3.10', '5.3.00'];
  await store.write([
    ...keg.map((k) => ({
      type: 'set' as const, path: taDoc(ctx, 'kegiatan', k),
      data: { kdKeg: k, nama: ref.get(k), pelaksana: k.startsWith('2') ? 'Kasi Kesejahteraan' : 'Kaur Umum', lokasi: 'Desa', waktu: '12 bulan', keluaran: '1 Tahun' },
    })),
    { type: 'set' as const, path: taDoc(ctx, 'saldoAwal', 'main'), data: { kasBank: 20_000_000, kasTunai: 0, panjar: 0, utangPajak: 0 } },
    {
      type: 'set' as const, path: `${P.desa(ctx)}/umum/profil`,
      data: { alamat: 'Jl. Desa No. 1', namaKades: 'H. Abdul Rahman', namaSekdes: 'Siti Aminah', namaKaurKeu: 'Rudi Hartono', noPerdesApbdes: `1 Tahun ${ta}`, tglPerdesApbdes: `${ta}-01-02`, noPerkadesPenjabaran: `1 Tahun ${ta}`, tglPerkadesPenjabaran: `${ta}-01-03` },
    },
  ]);
  const add = async (kelompok: KelompokAnggaran, kdRek: string, sumberDana: string, items: RabItem[], kdKeg?: string, rak?: number[]) => {
    const nilai = items.reduce((t, x) => t + x.volume * x.harga, 0);
    return L.simpanRincian(s, { kelompok, kdKeg, kdRek, sumberDana, rab: items, rak: rak ?? bagiRata(nilai) });
  };
  // Pendapatan (Rp 1,23 M)
  await add('PENDAPATAN', '4.2.1.01', 'DDS', rab('Dana Desa', 1, 'Tahun', 800_000_000), undefined, [0, 0, 0, 320_000_000, 0, 320_000_000, 0, 0, 160_000_000, 0, 0, 0]);
  await add('PENDAPATAN', '4.2.3.01', 'ADD', rab('Alokasi Dana Desa', 4, 'Triwulan', 100_000_000), undefined, [100_000_000, 0, 0, 100_000_000, 0, 0, 100_000_000, 0, 0, 100_000_000, 0, 0]);
  await add('PENDAPATAN', '4.2.2.01', 'PBH', rab('Bagi hasil pajak dan retribusi daerah', 1, 'Tahun', 30_000_000));
  // Belanja ADD (400 jt)
  await add('BELANJA', '5.1.1.01', 'ADD', rab('Siltap Kepala Desa', 12, 'OB', 3_000_000), '1.1.01');
  await add('BELANJA', '5.1.1.02', 'ADD', rab('Tunjangan Kepala Desa', 12, 'OB', 1_000_000), '1.1.01');
  await add('BELANJA', '5.1.2.01', 'ADD', rab('Siltap Perangkat Desa (6 orang)', 72, 'OB', 2_500_000), '1.1.02');
  await add('BELANJA', '5.1.2.02', 'ADD', rab('Tunjangan Perangkat Desa', 60, 'OB', 500_000), '1.1.02');
  await add('BELANJA', '5.1.3.01', 'ADD', rab('Iuran BPJS Kesehatan Kades', 12, 'OB', 800_000), '1.1.03');
  await add('BELANJA', '5.2.1.01', 'ADD', rab('ATK kantor desa', 1, 'Paket', 20_000_000), '1.1.04');
  await add('BELANJA', '5.2.5.01', 'ADD', rab('Langganan listrik kantor', 12, 'Bulan', 500_000), '1.1.04');
  await add('BELANJA', '5.1.4.01', 'ADD', rab('Tunjangan kedudukan BPD (5 orang)', 60, 'OB', 600_000), '1.1.05');
  await add('BELANJA', '5.2.1.06', 'ADD', rab('Makan minum rapat BPD', 1, 'Paket', 20_000_000), '1.1.06');
  await add('BELANJA', '5.2.2.03', 'ADD', rab('Insentif RT/RW (20 orang)', 240, 'OB', 150_000), '1.1.07');
  await add('BELANJA', '5.2.1.05', 'ADD', rab('Penggandaan dokumen APBDes/LPJ', 1, 'Paket', 10_000_000), '1.4.04');
  // Belanja PBH (30 jt)
  await add('BELANJA', '5.2.3.01', 'PBH', rab('Perjalanan dinas dalam kabupaten', 60, 'OH', 500_000), '1.1.04');
  // Belanja DDS (700 jt)
  await add('BELANJA', '5.2.1.06', 'DDS', rab('PMT balita dan ibu hamil', 1, 'Paket', 60_000_000), '2.2.02');
  await add('BELANJA', '5.2.2.03', 'DDS', rab('Insentif kader posyandu (10 orang)', 120, 'OB', 300_000), '2.2.02');
  await add('BELANJA', '5.3.5.01', 'DDS', rab('Upah tenaga kerja rabat beton 400 m', 1, 'Paket', 120_000_000), '2.3.10', [0, 0, 0, 0, 0, 30_000_000, 30_000_000, 30_000_000, 30_000_000, 0, 0, 0]);
  await add('BELANJA', '5.3.5.02', 'DDS', rab('Bahan rabat beton 400 m', 1, 'Paket', 280_000_000), '2.3.10', [0, 0, 0, 0, 0, 140_000_000, 140_000_000, 0, 0, 0, 0, 0]);
  await add('BELANJA', '5.4.1.01', 'DDS', rab('BLT Dana Desa (55 KPM x 12 bulan)', 660, 'KPM/bln', 300_000), '5.3.00');
  // Pembiayaan
  await L.buatSilpaOtomatis(s, ['DDS']);
  const semua = await store.list<{ id: string; kdRek: string; sumberDana: string }>(`${P.ta(ctx)}/rincian`);
  const silpa = semua.find((r) => r.kdRek === '6.1.1.01' && r.sumberDana === 'DDS')!;
  await L.simpanRincian(s, { id: silpa.id, kelompok: 'PEMBIAYAAN1', kdRek: '6.1.1.01', sumberDana: 'DDS', rab: rab('SiLPA DDS tahun lalu', 1, 'Tahun', 20_000_000), rak: [20_000_000, ...Array(11).fill(0)] });
  // Penyesuaian agar seimbang: PMD = 820 jt − belanja DDS
  const rincian = await store.list<{ kelompok: string; sumberDana: string; nilai: number }>(`${P.ta(ctx)}/rincian`);
  const belanjaDDS = rincian.filter((r) => r.kelompok === 'BELANJA' && r.sumberDana === 'DDS').reduce((t, r) => t + r.nilai, 0);
  const belanjaADD = rincian.filter((r) => r.kelompok === 'BELANJA' && r.sumberDana === 'ADD').reduce((t, r) => t + r.nilai, 0);
  await add('PEMBIAYAAN2', '6.2.2.01', 'DDS', rab('Penyertaan modal BUM Desa', 1, 'Paket', 820_000_000 - belanjaDDS), undefined, [0, 0, 0, 0, 0, 0, 0, 0, 820_000_000 - belanjaDDS, 0, 0, 0]);
  if (belanjaADD !== 400_000_000) {
    await add('BELANJA', '5.2.1.99', 'ADD', rab('Penyesuaian belanja barang', 1, 'Paket', 400_000_000 - belanjaADD), '1.1.04');
  }

  if (!opsi.posting) return;
  await L.postingApbdes(s, { jenis: 'AWAL', tgl: `${ta}-01-05`, dasarHukum: `Perdes No. 1 Tahun ${ta}`, tglDasarHukum: `${ta}-01-02` }, KEGIATAN_WAJIB_DEFAULT);

  if (!opsi.transaksi) return;
  await L.simpanPenerimaan(s, { tgl: `${ta}-01-06`, kdRek: '6.1.1.01', sumberDana: 'DDS', uraian: `Penerimaan SiLPA DDS ${ta - 1}`, nilai: 20_000_000, kas: 'BANK' });
  await L.simpanPenerimaan(s, { tgl: `${ta}-01-20`, kdRek: '4.2.3.01', sumberDana: 'ADD', uraian: 'Penerimaan ADD triwulan I', nilai: 100_000_000, kas: 'BANK', penyetor: 'BPKAD Kab. Sambas' });
  const bukti = (no: string, tgl: string, penerima: string, uraian: string, kdRek: string, sd: string, nilai: number, pajak: { jenis: 'PPN' | 'PPH21' | 'PPH22'; nilai: number }[] = []) =>
    ({ id: no, noBukti: no, tgl, penerima, uraian, kdRek, sumberDana: sd, nilai, pajak });
  const spp1 = await L.simpanSpp(s, {
    tgl: `${ta}-01-25`, jenis: 'DEFINITIF', kdKeg: '1.1.01', uraian: 'Siltap dan tunjangan Kepala Desa bulan Januari', kas: 'BANK',
    rincian: [{ kdRek: '5.1.1.01', sumberDana: 'ADD', nilai: 3_000_000 }, { kdRek: '5.1.1.02', sumberDana: 'ADD', nilai: 1_000_000 }],
    bukti: [
      bukti('KW-001', `${ta}-01-25`, 'H. Abdul Rahman', 'Siltap Kades Januari', '5.1.1.01', 'ADD', 3_000_000),
      bukti('KW-002', `${ta}-01-25`, 'H. Abdul Rahman', 'Tunjangan Kades Januari', '5.1.1.02', 'ADD', 1_000_000, [{ jenis: 'PPH21', nilai: 50_000 }]),
    ],
  }, true);
  await L.verifikasiSpp(s, spp1.id, true);
  await L.setujuiSpp(s, spp1.id, true);
  await L.cairkanSpp(s, spp1.id, `${ta}-01-26`);
  const spp2 = await L.simpanSpp(s, {
    tgl: `${ta}-02-10`, jenis: 'DEFINITIF', kdKeg: '1.1.04', uraian: 'Belanja ATK kantor desa', kas: 'BANK',
    rincian: [{ kdRek: '5.2.1.01', sumberDana: 'ADD', nilai: 2_200_000 }],
    bukti: [bukti('KW-003', `${ta}-02-10`, 'Toko Sinar Sambas', 'ATK kantor', '5.2.1.01', 'ADD', 2_200_000, [{ jenis: 'PPN', nilai: 200_000 }, { jenis: 'PPH22', nilai: 30_000 }])],
  }, true);
  await L.verifikasiSpp(s, spp2.id, true);
  await L.setujuiSpp(s, spp2.id, true);
  await L.cairkanSpp(s, spp2.id, `${ta}-02-11`);
  await L.simpanSetorPajak(s, { tgl: `${ta}-02-15`, jenis: 'PPN', nilai: 200_000, kas: 'BANK', ntpn: 'CONTOH0001' });
  await L.simpanMutasi(s, { tgl: `${ta}-02-16`, dari: 'BANK', ke: 'TUNAI', nilai: 1_000_000, uraian: 'Penarikan kas tunai untuk operasional' });
}
