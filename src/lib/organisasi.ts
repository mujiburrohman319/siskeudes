// Layanan organisasi: pendaftaran mandiri pemda/lembaga, persetujuan Super Admin,
// dan pembuatan organisasi langsung oleh Super Admin ("dibuatkan").
import { sekarangISO } from './format';
import { P } from './paths';
import { konfigurasiDefault, seedReferensi } from './seed';
import type { AuthUser, DataStore } from './store/types';
import type { JenisInstansi, Pendaftaran } from './types';

export type DataPendaftaran = Pick<Pendaftaran, 'jenis' | 'namaInstansi' | 'provinsi' | 'namaPj' | 'jabatan' | 'hp' | 'catatan'>;

export interface DataOrganisasi {
  pemdaId: string;
  nama: string;
  provinsi: string;
  jenis?: JenisInstansi;
}

const KODE_VALID = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

/** "Kabupaten Kapuas Hulu" → "kab-kapuas-hulu"; "Kota Pontianak" → "kota-pontianak". */
export function usulKodePemda(nama: string, jenis?: JenisInstansi): string {
  const dasar = nama.toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/^(pemerintah\s+)?(kabupaten|kab\.?|kota)\s+/, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const awalan = jenis === 'KOTA' ? 'kota' : jenis === 'LEMBAGA' ? 'lbg' : 'kab';
  return `${awalan}-${dasar}`.slice(0, 40).replace(/-+$/, '');
}

function wajib(v: unknown, label: string) {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`${label} wajib diisi.`);
}

/** Pengguna yang sudah membuat akun login mengajukan pendaftaran organisasinya. */
export async function ajukanPendaftaran(store: DataStore, user: AuthUser, d: DataPendaftaran) {
  wajib(d.namaInstansi, 'Nama instansi');
  wajib(d.provinsi, 'Provinsi');
  wajib(d.namaPj, 'Nama penanggung jawab');
  wajib(d.jabatan, 'Jabatan');
  wajib(d.hp, 'Nomor HP/WhatsApp');
  if (!d.jenis) throw new Error('Jenis instansi wajib dipilih.');
  const lama = await store.get<Pendaftaran>(P.pendaftaran(user.uid));
  if (lama?.status === 'MENUNGGU') throw new Error('Pendaftaran Anda sedang ditinjau.');
  if (lama?.status === 'DISETUJUI') throw new Error('Pendaftaran Anda sudah disetujui.');
  const doc: Pendaftaran = {
    uid: user.uid,
    email: user.email.toLowerCase(),
    jenis: d.jenis,
    namaInstansi: d.namaInstansi.trim(),
    provinsi: d.provinsi.trim(),
    namaPj: d.namaPj.trim(),
    jabatan: d.jabatan.trim(),
    hp: d.hp.trim(),
    catatan: d.catatan?.trim() || undefined,
    status: 'MENUNGGU',
    tglDaftar: sekarangISO(),
  };
  await store.set(P.pendaftaran(user.uid), doc);
}

/** Membuat dokumen pemda + konfigurasi TA + referensi bawaan. Gagal bila kode sudah dipakai. */
export async function siapkanPemda(store: DataStore, o: DataOrganisasi, ta: number) {
  wajib(o.nama, 'Nama organisasi');
  wajib(o.provinsi, 'Provinsi');
  if (!KODE_VALID.test(o.pemdaId)) throw new Error('Kode organisasi hanya boleh huruf kecil, angka, dan tanda hubung (3–40 karakter).');
  if (await store.get(P.pemda(o.pemdaId))) throw new Error(`Kode organisasi "${o.pemdaId}" sudah dipakai. Gunakan kode lain.`);
  await store.write([
    { type: 'set', path: P.pemda(o.pemdaId), data: { nama: o.nama.trim(), provinsi: o.provinsi.trim(), jenis: o.jenis ?? 'KABUPATEN', dibuat: sekarangISO() } },
    { type: 'set', path: P.konfigurasi(o.pemdaId, ta), data: konfigurasiDefault() },
  ]);
  await seedReferensi(store, o.pemdaId);
}

/** Super Admin menyetujui pendaftaran: buat organisasi, jadikan pendaftar Admin Kabupaten. */
export async function setujuiPendaftaran(store: DataStore, p: Pendaftaran, o: DataOrganisasi, oleh: string, ta: number) {
  if (p.status !== 'MENUNGGU') throw new Error('Hanya pendaftaran berstatus menunggu yang dapat disetujui.');
  await siapkanPemda(store, { ...o, jenis: o.jenis ?? p.jenis }, ta);
  await store.write([
    {
      type: 'set', path: P.user(p.uid),
      data: { uid: p.uid, email: p.email, nama: p.namaPj, role: 'ADMIN_KAB', grup: 'ADMIN_KAB', pemdaId: o.pemdaId, aktif: true },
    },
    {
      type: 'set', path: P.pendaftaran(p.uid), merge: true,
      data: { status: 'DISETUJUI', pemdaId: o.pemdaId, diprosesOleh: oleh, tglProses: sekarangISO() },
    },
  ]);
}

export async function tolakPendaftaran(store: DataStore, p: Pendaftaran, alasan: string, oleh: string) {
  if (p.status !== 'MENUNGGU') throw new Error('Hanya pendaftaran berstatus menunggu yang dapat ditolak.');
  wajib(alasan, 'Alasan penolakan');
  await store.set(P.pendaftaran(p.uid), { status: 'DITOLAK', alasan: alasan.trim(), diprosesOleh: oleh, tglProses: sekarangISO() }, true);
}

/** Super Admin membuatkan organisasi beserta akun Admin Kabupaten-nya secara langsung. */
export async function buatOrganisasi(
  store: DataStore, o: DataOrganisasi, admin: { nama: string; email: string; password: string }, ta: number,
) {
  wajib(admin.nama, 'Nama admin');
  wajib(admin.email, 'Email admin');
  if (!admin.password || admin.password.length < 6) throw new Error('Kata sandi admin minimal 6 karakter.');
  await siapkanPemda(store, o, ta);
  await store.auth.createUsers([{
    email: admin.email.trim().toLowerCase(),
    password: admin.password,
    profile: { nama: admin.nama.trim(), role: 'ADMIN_KAB', grup: 'ADMIN_KAB', pemdaId: o.pemdaId, aktif: true },
  }]);
}
