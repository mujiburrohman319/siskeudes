import { App as AntApp } from 'antd';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useCol, useDocu } from '../lib/hooks';
import { cmpKode } from '../lib/keuangan';
import type { Sesi } from '../lib/layanan';
import { P, type Ctx } from '../lib/paths';
import { konfigurasiDefault } from '../lib/seed';
import { store } from '../lib/store';
import type { AuthUser } from '../lib/store/types';
import {
  ROLE_KAB, ROLE_READONLY, type AksiMenu, type Desa, type Kecamatan, type KonfigurasiKab, type Pemda,
  type RefAkun, type RefKegiatan, type RefSumberDana, type Role, type UserProfile,
} from '../lib/types';

export type AksiSpp = 'buat' | 'verifikasi' | 'setujui' | 'cairkan' | 'spj';

const AKSI_SPP: Record<AksiSpp, Role[]> = {
  buat: ['OPERATOR_DESA', 'PKA', 'KAUR_KEU', 'MAHASISWA', 'ADMIN_KAB', 'SUPERADMIN', 'DOSEN'],
  verifikasi: ['SEKDES', 'OPERATOR_DESA', 'MAHASISWA', 'ADMIN_KAB', 'SUPERADMIN', 'DOSEN'],
  setujui: ['KADES', 'OPERATOR_DESA', 'MAHASISWA', 'ADMIN_KAB', 'SUPERADMIN', 'DOSEN'],
  cairkan: ['KAUR_KEU', 'OPERATOR_DESA', 'MAHASISWA', 'ADMIN_KAB', 'SUPERADMIN', 'DOSEN'],
  spj: ['PKA', 'KAUR_KEU', 'OPERATOR_DESA', 'MAHASISWA', 'ADMIN_KAB', 'SUPERADMIN', 'DOSEN'],
};

interface AppState {
  authUser: AuthUser | null;
  authReady: boolean;
  profile: UserProfile | null;
  pemda: Pemda | null;
  ta: number;
  setTa: (ta: number) => void;
  desaId: string | null;
  setDesaId: (id: string | null) => void;
  desa: Desa | null;
  desaList: Desa[];
  kecamatan: Kecamatan[];
  konfig: KonfigurasiKab;
  akun: RefAkun[];
  akunMap: Map<string, string>;
  kegiatanRef: RefKegiatan[];
  kegiatanMap: Map<string, string>;
  sumberDana: RefSumberDana[];
  ctx: Ctx | null;
  sesi: Sesi | null;
  isKab: boolean;
  readOnly: boolean;
  hak: (menu: string, aksi: AksiMenu) => boolean;
  bisaSpp: (aksi: AksiSpp) => boolean;
}

const C = createContext<AppState | null>(null);

export function useApp() {
  const v = useContext(C);
  if (!v) throw new Error('useApp di luar AppProvider');
  return v;
}

/** Versi yang menjamin desa sudah dipilih (dipakai halaman tingkat desa). */
export function useDesa() {
  const a = useApp();
  if (!a.ctx || !a.sesi || !a.desa) throw new Error('Desa belum dipilih');
  return { ...a, ctx: a.ctx, sesi: a.sesi, desa: a.desa };
}

const TA_KEY = 'siskeudes-web:ta';
const DESA_KEY = 'siskeudes-web:desa';

export function AppProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [ta, setTaState] = useState<number>(() => Number(localStorage.getItem(TA_KEY)) || new Date().getFullYear());
  const [desaPilih, setDesaPilih] = useState<string | null>(() => localStorage.getItem(DESA_KEY));

  useEffect(() => store.auth.onChange((u) => { setAuthUser(u); setAuthReady(true); }), []);

  const { data: profile } = useDocu<UserProfile>(authUser ? P.user(authUser.uid) : null);
  const pemdaId = profile?.pemdaId ?? null;
  const { data: pemda } = useDocu<Pemda>(pemdaId ? P.pemda(pemdaId) : null);
  const { data: desaList } = useCol<Desa>(pemdaId ? P.desaCol(pemdaId) : null);
  const { data: kecamatan } = useCol<Kecamatan>(pemdaId ? P.kecamatan(pemdaId) : null);
  const { data: konfigDoc } = useDocu<KonfigurasiKab>(pemdaId ? P.konfigurasi(pemdaId, ta) : null);
  const { data: akunRaw } = useCol<RefAkun>(pemdaId ? P.refAkun(pemdaId) : null);
  const { data: kegRaw } = useCol<RefKegiatan>(pemdaId ? P.refKegiatan(pemdaId) : null);
  const { data: sumberDana } = useCol<RefSumberDana>(pemdaId ? P.refSumberDana(pemdaId) : null);

  const isKab = !!profile && ROLE_KAB.includes(profile.role);
  const readOnly = !!profile && ROLE_READONLY.includes(profile.role);

  // Desa aktif: user desa terkunci ke desanya; user kabupaten memilih (kecamatan dibatasi wilayahnya).
  const desaTersedia = useMemo(() => {
    const list = [...desaList].sort((a, b) => a.kode.localeCompare(b.kode));
    if (profile?.role === 'KECAMATAN' && profile.kecId) return list.filter((d) => d.kecId === profile.kecId);
    return list;
  }, [desaList, profile]);
  const desaId = profile ? (isKab ? desaPilih : profile.desaId ?? null) : null;
  const desa = desaTersedia.find((d) => d.id === desaId) ?? (isKab ? null : desaList.find((d) => d.id === desaId) ?? null);

  const setTa = useCallback((t: number) => { localStorage.setItem(TA_KEY, String(t)); setTaState(t); }, []);
  const setDesaId = useCallback((id: string | null) => {
    if (id) localStorage.setItem(DESA_KEY, id);
    else localStorage.removeItem(DESA_KEY);
    setDesaPilih(id);
  }, []);

  const akun = useMemo(() => [...akunRaw].sort((a, b) => cmpKode(a.kode, b.kode)), [akunRaw]);
  const kegiatanRef = useMemo(() => [...kegRaw].sort((a, b) => cmpKode(a.kode, b.kode)), [kegRaw]);
  const akunMap = useMemo(() => new Map(akun.map((a) => [a.kode, a.nama])), [akun]);
  const kegiatanMap = useMemo(() => new Map(kegiatanRef.map((a) => [a.kode, a.nama])), [kegiatanRef]);
  const konfig = useMemo(() => ({ ...konfigurasiDefault(), ...(konfigDoc ?? {}) }), [konfigDoc]);

  const ctx = useMemo<Ctx | null>(() => (pemdaId && desa ? { pemdaId, desaId: desa.id, ta } : null), [pemdaId, desa, ta]);
  const sesi = useMemo<Sesi | null>(() => (ctx && profile ? { store, ctx, oleh: profile.nama || profile.email } : null), [ctx, profile]);

  const hak = useCallback((menu: string, aksi: AksiMenu) => {
    if (!profile) return false;
    if (readOnly && aksi !== 'cetak') return false;
    const g = profile.grup || profile.role;
    const perGrup = konfig.hakMenu?.[g]?.[menu]?.[aksi];
    const perUser = konfig.hakMenu?.[`uid:${profile.uid}`]?.[menu]?.[aksi];
    return perUser ?? perGrup ?? true;
  }, [profile, readOnly, konfig]);

  const bisaSpp = useCallback((aksi: AksiSpp) => !!profile && AKSI_SPP[aksi].includes(profile.role), [profile]);

  const value: AppState = {
    authUser, authReady, profile, pemda, ta, setTa, desaId, setDesaId, desa: desa ?? null, desaList: desaTersedia,
    kecamatan, konfig, akun, akunMap, kegiatanRef, kegiatanMap, sumberDana, ctx, sesi, isKab, readOnly, hak, bisaSpp,
  };
  return <C.Provider value={value}><AntApp>{children}</AntApp></C.Provider>;
}

/** Bungkus aksi async dengan notifikasi sukses/galat. */
export function useAksi() {
  const { message, modal } = AntApp.useApp();
  return useCallback(async <T,>(fn: () => Promise<T>, sukses?: string): Promise<T | undefined> => {
    try {
      const r = await fn();
      if (sukses) message.success(sukses);
      return r;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('\n')) modal.error({ title: 'Tidak dapat diproses', content: <div style={{ whiteSpace: 'pre-line' }}>{msg}</div> });
      else message.error(msg);
      return undefined;
    }
  }, [message, modal]);
}
