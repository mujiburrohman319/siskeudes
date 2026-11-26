import { P, desaCol, taCol, taDoc, type Ctx } from '../paths';
import { store } from '../store';
import type { DataStore } from '../store/types';
import type {
  Desa, Jurnal, KegiatanAnggaran, Kecamatan, KonfigurasiKab, Ledger, Pemda, Penerimaan, Posting, ProfilDesa,
  RefAkun, RefKegiatan, RincianAnggaran, RkpKegiatan, RpjmKegiatan, RpjmVisi, SaldoAwal, SetorPajak, Spp,
} from '../types';
import { AKUN_NERACA } from '../referensi';
import { postingTerakhir } from '../keuangan';

export interface DataLap {
  ctx: Ctx;
  pemda: Pemda | null;
  kec: Kecamatan | undefined;
  desa: Desa;
  profil: ProfilDesa;
  konfig: KonfigurasiKab;
  akunMap: Map<string, string>;
  kegMap: Map<string, string>;
  rincian: RincianAnggaran[];
  kegiatan: KegiatanAnggaran[];
  postings: Posting[];
  posting: Posting | null;
  spp: Spp[];
  penerimaan: Penerimaan[];
  setorPajak: SetorPajak[];
  ledger: Ledger[];
  saldoAwal: SaldoAwal | null;
  jurnal: Jurnal[];
  rpjm: RpjmKegiatan[];
  rpjmVisi: RpjmVisi | null;
  rkp: RkpKegiatan[];
}

export function ambilData(ctx: Ctx, desa: Desa, konfig: KonfigurasiKab): Promise<DataLap> {
  return ambilDataDari(store, ctx, desa, konfig);
}

export async function ambilDataDari(store: DataStore, ctx: Ctx, desa: Desa, konfig: KonfigurasiKab): Promise<DataLap> {
  const L = <T,>(c: Parameters<typeof taCol>[1]) => store.list<T>(taCol(ctx, c));
  const [pemda, kecs, profil, akun, keg, rincian, kegiatan, postings, spp, penerimaan, setorPajak, ledger, saldoAwal, jurnal, rpjm, rpjmVisi, rkp] = await Promise.all([
    store.get<Pemda>(P.pemda(ctx.pemdaId)),
    store.list<Kecamatan>(P.kecamatan(ctx.pemdaId)),
    store.get<ProfilDesa>(`${P.desa(ctx)}/umum/profil`),
    store.list<RefAkun>(P.refAkun(ctx.pemdaId)),
    store.list<RefKegiatan>(P.refKegiatan(ctx.pemdaId)),
    L<RincianAnggaran>('rincian'),
    L<KegiatanAnggaran>('kegiatan'),
    L<Posting>('posting'),
    L<Spp>('spp'),
    L<Penerimaan>('penerimaan'),
    L<SetorPajak>('setorPajak'),
    L<Ledger>('ledger'),
    store.get<SaldoAwal>(taDoc(ctx, 'saldoAwal', 'main')),
    L<Jurnal>('jurnal'),
    store.list<RpjmKegiatan>(desaCol(ctx, 'rpjm')),
    store.get<RpjmVisi>(`${P.desa(ctx)}/umum/rpjm`),
    L<RkpKegiatan>('rkp'),
  ]);
  const akunMap = new Map<string, string>(Object.entries(AKUN_NERACA));
  for (const a of akun) akunMap.set(a.kode, a.nama);
  return {
    ctx, pemda, kec: kecs.find((k) => k.id === desa.kecId), desa, profil: profil ?? {}, konfig,
    akunMap, kegMap: new Map(keg.map((k) => [k.kode, k.nama])),
    rincian, kegiatan, postings, posting: postingTerakhir(postings), spp, penerimaan, setorPajak,
    ledger: [...ledger].sort((a, b) => a.tgl.localeCompare(b.tgl) || a.id.localeCompare(b.id)),
    saldoAwal, jurnal, rpjm, rpjmVisi, rkp,
  };
}
