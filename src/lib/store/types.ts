export type WriteOp =
  | { type: 'set'; path: string; data: object; merge?: boolean }
  | { type: 'delete'; path: string };

export interface AuthUser {
  uid: string;
  email: string;
}

export interface NewUserInput {
  email: string;
  password: string;
  profile: Record<string, unknown>;
}

export interface AuthAdapter {
  onChange(cb: (u: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  /** Daftar akun login baru (tanpa profil) dan langsung masuk. Dipakai pendaftaran organisasi. */
  signUp(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  /** Membuat akun login + profil users/{uid}. Firebase: lewat Cloud Function (Admin SDK). */
  createUsers(items: NewUserInput[]): Promise<string[]>;
  resetPassword(email: string, newPassword?: string): Promise<void>;
}

export interface DataStore {
  kind: 'local' | 'firebase';
  list<T>(col: string, where?: [string, string]): Promise<T[]>;
  get<T>(path: string): Promise<T | null>;
  set(path: string, data: object, merge?: boolean): Promise<void>;
  remove(path: string): Promise<void>;
  /** Tulis beberapa dokumen secara atomik. */
  write(ops: WriteOp[]): Promise<void>;
  subscribe<T>(col: string, cb: (rows: T[]) => void, where?: [string, string]): () => void;
  subscribeDoc<T>(path: string, cb: (doc: T | null) => void): () => void;
  /** Penomoran berurutan (transaksi). */
  nextNumber(counterPath: string): Promise<number>;
  auth: AuthAdapter;
}

/** Hapus nilai undefined secara rekursif (Firestore menolak undefined). */
export function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map((x) => clean(x)) as unknown as T;
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (x !== undefined) out[k] = clean(x);
    }
    return out as T;
  }
  return v;
}

export const parentOf = (path: string) => path.split('/').slice(0, -1).join('/');
export const lastSeg = (path: string) => path.split('/').pop() as string;
