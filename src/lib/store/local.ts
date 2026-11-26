// Penyimpanan lokal (localStorage) untuk MODE LOKAL / SIMULASI.
// Meniru API Firestore yang dipakai aplikasi sehingga logika bisnis sama persis.
// Catatan: kata sandi di mode lokal disimpan tanpa enkripsi — hanya untuk latihan, bukan data asli.
import type { AuthAdapter, AuthUser, DataStore, NewUserInput, WriteOp } from './types';
import { clean, lastSeg, parentOf } from './types';

type Row = Record<string, unknown>;

export interface LocalOptions {
  storageKey?: string;
  persist?: boolean; // false untuk pengujian
}

export function createLocalStore(opts: LocalOptions = {}): DataStore {
  const key = opts.storageKey ?? 'siskeudes-web:db';
  const persist = opts.persist ?? typeof localStorage !== 'undefined';
  const data = new Map<string, Row>();
  const colListeners = new Map<string, Set<{ cb: (rows: unknown[]) => void; where?: [string, string] }>>();
  const docListeners = new Map<string, Set<(doc: unknown) => void>>();
  const authListeners = new Set<(u: AuthUser | null) => void>();

  if (persist) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, Row>)) data.set(k, v);
    } catch {
      /* abaikan data rusak */
    }
  }

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (!persist || !saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(key, JSON.stringify(Object.fromEntries(data)));
    } catch (e) {
      console.error('Gagal menyimpan ke localStorage', e);
      alert('Penyimpanan browser penuh. Ekspor backup lalu reset data lokal.');
    }
  };
  const save = () => {
    if (!persist) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 150);
  };
  if (persist && typeof window !== 'undefined') {
    // Pastikan tulisan terakhir tidak hilang saat halaman dimuat ulang/ditutup.
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  }

  const listSync = (col: string, where?: [string, string]) => {
    const out: unknown[] = [];
    for (const [p, v] of data) {
      if (parentOf(p) !== col) continue;
      if (where && v[where[0]] !== where[1]) continue;
      out.push({ ...structuredClone(v), id: lastSeg(p) });
    }
    return out;
  };
  const getSync = (path: string) => {
    const v = data.get(path);
    return v ? { ...structuredClone(v), id: lastSeg(path) } : null;
  };

  const notify = (paths: string[]) => {
    const cols = new Set(paths.map(parentOf));
    queueMicrotask(() => {
      cols.forEach((c) => colListeners.get(c)?.forEach((l) => l.cb(listSync(c, l.where))));
      paths.forEach((p) => docListeners.get(p)?.forEach((cb) => cb(getSync(p))));
    });
  };

  const applyOps = (ops: WriteOp[]) => {
    for (const op of ops) {
      if (op.type === 'delete') data.delete(op.path);
      else {
        const d = clean({ ...(op.data as Row) });
        delete d.id;
        const prev = op.merge ? data.get(op.path) ?? {} : {};
        data.set(op.path, { ...prev, ...structuredClone(d) });
      }
    }
    save();
    notify(ops.map((o) => o.path));
  };

  // ------------- auth -------------
  const sessionKey = `${key}:session`;
  let current: AuthUser | null = null;
  if (persist && typeof sessionStorage !== 'undefined') {
    try {
      const s = sessionStorage.getItem(sessionKey);
      if (s) current = JSON.parse(s);
    } catch {
      current = null;
    }
  }
  const setCurrent = (u: AuthUser | null) => {
    current = u;
    if (persist && typeof sessionStorage !== 'undefined') {
      if (u) sessionStorage.setItem(sessionKey, JSON.stringify(u));
      else sessionStorage.removeItem(sessionKey);
    }
    authListeners.forEach((cb) => cb(u));
  };

  const auth: AuthAdapter = {
    onChange(cb) {
      authListeners.add(cb);
      queueMicrotask(() => cb(current));
      return () => authListeners.delete(cb);
    },
    async signIn(email, password) {
      const rec = data.get(`_auth/${email.toLowerCase()}`) as { uid: string; password: string } | undefined;
      if (!rec || rec.password !== password) throw new Error('Email atau kata sandi salah.');
      setCurrent({ uid: rec.uid, email: email.toLowerCase() });
    },
    async signOut() {
      setCurrent(null);
    },
    async createUsers(items: NewUserInput[]) {
      const ops: WriteOp[] = [];
      const uids: string[] = [];
      for (const it of items) {
        const email = it.email.toLowerCase();
        if (data.has(`_auth/${email}`)) throw new Error(`Email ${email} sudah terdaftar.`);
        const u = `u_${Math.random().toString(36).slice(2, 12)}`;
        uids.push(u);
        ops.push({ type: 'set', path: `_auth/${email}`, data: { uid: u, password: it.password } });
        ops.push({ type: 'set', path: `users/${u}`, data: { ...it.profile, uid: u, email } });
      }
      applyOps(ops);
      return uids;
    },
    async resetPassword(email, newPassword) {
      const p = `_auth/${email.toLowerCase()}`;
      const rec = data.get(p);
      if (!rec) throw new Error('Email tidak ditemukan.');
      applyOps([{ type: 'set', path: p, data: { ...rec, password: newPassword ?? '123456' } }]);
    },
  };

  return {
    kind: 'local',
    async list<T>(col: string, where?: [string, string]) {
      return listSync(col, where) as T[];
    },
    async get<T>(path: string) {
      return getSync(path) as T | null;
    },
    async set(path, d, merge) {
      applyOps([{ type: 'set', path, data: d, merge }]);
    },
    async remove(path) {
      applyOps([{ type: 'delete', path }]);
    },
    async write(ops) {
      applyOps(ops);
    },
    subscribe<T>(col: string, cb: (rows: T[]) => void, where?: [string, string]) {
      const set = colListeners.get(col) ?? new Set();
      const l = { cb: cb as (rows: unknown[]) => void, where };
      set.add(l);
      colListeners.set(col, set);
      queueMicrotask(() => l.cb(listSync(col, where)));
      return () => set.delete(l);
    },
    subscribeDoc<T>(path: string, cb: (doc: T | null) => void) {
      const set = docListeners.get(path) ?? new Set();
      const f = cb as (doc: unknown) => void;
      set.add(f);
      docListeners.set(path, set);
      queueMicrotask(() => f(getSync(path)));
      return () => set.delete(f);
    },
    async nextNumber(counterPath) {
      const cur = (data.get(counterPath)?.n as number | undefined) ?? 0;
      applyOps([{ type: 'set', path: counterPath, data: { n: cur + 1 } }]);
      return cur + 1;
    },
    auth,
  };
}

/** Hapus seluruh data lokal (dipakai tombol "Reset data simulasi"). */
export function resetLocal(storageKey = 'siskeudes-web:db') {
  localStorage.removeItem(storageKey);
  sessionStorage.removeItem(`${storageKey}:session`);
}
