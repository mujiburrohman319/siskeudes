import { beforeEach, describe, expect, it } from 'vitest';
import * as O from './organisasi';
import { P } from './paths';
import { createLocalStore } from './store/local';
import type { DataStore } from './store/types';
import type { Pendaftaran, UserProfile } from './types';

const TA = 2026;
let store: DataStore;

const dataDaftar: O.DataPendaftaran = {
  jenis: 'KABUPATEN', namaInstansi: 'Kabupaten Kapuas Hulu', provinsi: 'Kalimantan Barat',
  namaPj: 'Budi Santoso', jabatan: 'Kepala DPMD', hp: '081234567890',
};

beforeEach(() => {
  store = createLocalStore({ persist: false });
});

describe('usulKodePemda', () => {
  it('membuat kode dari nama', () => {
    expect(O.usulKodePemda('Kabupaten Kapuas Hulu', 'KABUPATEN')).toBe('kab-kapuas-hulu');
    expect(O.usulKodePemda('Kota Pontianak', 'KOTA')).toBe('kota-pontianak');
    expect(O.usulKodePemda('Universitas Tanjungpura', 'LEMBAGA')).toBe('lbg-universitas-tanjungpura');
  });
});

describe('pendaftaran organisasi', () => {
  it('daftar → setujui: membuat pemda, referensi, dan profil Admin Kabupaten', async () => {
    const u = await store.auth.signUp('budi@kapuashulu.go.id', 'rahasia1');
    await O.ajukanPendaftaran(store, u, dataDaftar);
    const p = (await store.get<Pendaftaran>(P.pendaftaran(u.uid)))!;
    expect(p.status).toBe('MENUNGGU');
    expect(await store.get(P.user(u.uid))).toBeNull();

    await O.setujuiPendaftaran(store, p, { pemdaId: 'kab-kapuas-hulu', nama: p.namaInstansi, provinsi: p.provinsi }, 'super', TA);
    const prof = (await store.get<UserProfile>(P.user(u.uid)))!;
    expect(prof).toMatchObject({ role: 'ADMIN_KAB', pemdaId: 'kab-kapuas-hulu', aktif: true, nama: 'Budi Santoso' });
    expect(await store.get(P.pemda('kab-kapuas-hulu'))).toMatchObject({ nama: 'Kabupaten Kapuas Hulu' });
    expect((await store.list(P.refAkun('kab-kapuas-hulu'))).length).toBeGreaterThan(10);
    expect(await store.get(P.konfigurasi('kab-kapuas-hulu', TA))).not.toBeNull();
    expect((await store.get<Pendaftaran>(P.pendaftaran(u.uid)))!.status).toBe('DISETUJUI');
  });

  it('menolak data tidak lengkap, pengajuan ganda, dan kode pemda yang sudah dipakai', async () => {
    const u = await store.auth.signUp('a@b.id', 'rahasia1');
    await expect(O.ajukanPendaftaran(store, u, { ...dataDaftar, namaPj: ' ' })).rejects.toThrow(/penanggung jawab/);
    await O.ajukanPendaftaran(store, u, dataDaftar);
    await expect(O.ajukanPendaftaran(store, u, dataDaftar)).rejects.toThrow(/sedang ditinjau/);

    await O.siapkanPemda(store, { pemdaId: 'kab-kapuas-hulu', nama: 'X', provinsi: 'Y' }, TA);
    const p = (await store.get<Pendaftaran>(P.pendaftaran(u.uid)))!;
    await expect(O.setujuiPendaftaran(store, p, { pemdaId: 'kab-kapuas-hulu', nama: 'X', provinsi: 'Y' }, 's', TA)).rejects.toThrow(/sudah dipakai/);
    await expect(O.setujuiPendaftaran(store, p, { pemdaId: 'Kode Salah!', nama: 'X', provinsi: 'Y' }, 's', TA)).rejects.toThrow(/huruf kecil/);
  });

  it('ditolak dengan alasan, lalu boleh mengajukan ulang', async () => {
    const u = await store.auth.signUp('c@d.id', 'rahasia1');
    await O.ajukanPendaftaran(store, u, dataDaftar);
    const p = (await store.get<Pendaftaran>(P.pendaftaran(u.uid)))!;
    await expect(O.tolakPendaftaran(store, p, '', 's')).rejects.toThrow(/Alasan/);
    await O.tolakPendaftaran(store, p, 'Gunakan email dinas.', 's');
    expect(await store.get(P.pendaftaran(u.uid))).toMatchObject({ status: 'DITOLAK', alasan: 'Gunakan email dinas.' });
    await O.ajukanPendaftaran(store, u, dataDaftar);
    expect((await store.get<Pendaftaran>(P.pendaftaran(u.uid)))!.status).toBe('MENUNGGU');
  });

  it('Super Admin membuatkan organisasi + akun admin yang bisa langsung masuk', async () => {
    await O.buatOrganisasi(store, { pemdaId: 'kota-pontianak', nama: 'Kota Pontianak', provinsi: 'Kalimantan Barat', jenis: 'KOTA' },
      { nama: 'Admin Kota', email: 'Admin@Pontianak.go.id', password: 'rahasia1' }, TA);
    await store.auth.signIn('admin@pontianak.go.id', 'rahasia1');
    const users = await store.list<UserProfile>(P.users());
    expect(users.find((x) => x.email === 'admin@pontianak.go.id')).toMatchObject({ role: 'ADMIN_KAB', pemdaId: 'kota-pontianak' });
  });
});
