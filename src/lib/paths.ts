// Struktur path Firestore: pemda → desa → tahun anggaran.
export interface Ctx {
  pemdaId: string;
  desaId: string;
  ta: number;
}

export const P = {
  user: (uid: string) => `users/${uid}`,
  users: () => 'users',
  pendaftaran: (uid: string) => `pendaftaran/${uid}`,
  pendaftaranCol: () => 'pendaftaran',
  pemda: (p: string) => `pemda/${p}`,
  pemdaCol: () => 'pemda',
  kecamatan: (p: string) => `pemda/${p}/kecamatan`,
  desaCol: (p: string) => `pemda/${p}/desa`,
  refAkun: (p: string) => `pemda/${p}/refAkun`,
  refKegiatan: (p: string) => `pemda/${p}/refKegiatan`,
  refSumberDana: (p: string) => `pemda/${p}/refSumberDana`,
  konfigurasi: (p: string, ta: number) => `pemda/${p}/konfigurasi/${ta}`,
  pesan: (p: string) => `pemda/${p}/pesan`,
  monitoring: (p: string) => `pemda/${p}/monitoring`,
  desa: (c: Pick<Ctx, 'pemdaId' | 'desaId'>) => `pemda/${c.pemdaId}/desa/${c.desaId}`,
  ta: (c: Ctx) => `pemda/${c.pemdaId}/desa/${c.desaId}/ta/${c.ta}`,
};

/** Koleksi di tingkat desa (lintas tahun). */
export type DesaCol = 'perangkat' | 'rekeningBank' | 'rpjm' | 'umum';
/** Koleksi di tingkat desa-tahun. */
export type TaCol =
  | 'rkp' | 'kegiatan' | 'rincian' | 'posting' | 'spp' | 'penerimaan' | 'setorPajak'
  | 'mutasi' | 'pengembalian' | 'penutupanKas' | 'ledger' | 'jurnal' | 'saldoAwal'
  | 'counter' | 'audit';

export const desaCol = (c: Pick<Ctx, 'pemdaId' | 'desaId'>, name: DesaCol) => `${P.desa(c)}/${name}`;
export const taCol = (c: Ctx, name: TaCol) => `${P.ta(c)}/${name}`;
export const taDoc = (c: Ctx, name: TaCol, id: string) => `${P.ta(c)}/${name}/${id}`;
