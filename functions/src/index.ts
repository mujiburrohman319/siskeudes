// Cloud Functions SISKEUDES-Web.
// buatUser: membuat akun Firebase Auth + profil users/{uid} (dipakai "Tambah User" dan "Create All User").
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();
// Database Firestore bernama: atur FIRESTORE_DB di functions/.env (default "(default)").
const db = getFirestore(process.env.FIRESTORE_DB || '(default)');

interface Item {
  email: string;
  password: string;
  profile: { nama: string; role: string; grup?: string; pemdaId: string; desaId?: string; kecId?: string; aktif?: boolean };
}

const ROLE_ADMIN = ['SUPERADMIN', 'ADMIN_KAB', 'DOSEN'];

export const buatUser = onCall({ region: 'asia-southeast2' }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Harus login.');
  const caller = (await db.doc(`users/${req.auth.uid}`).get()).data();
  if (!caller || !ROLE_ADMIN.includes(caller.role)) throw new HttpsError('permission-denied', 'Hanya admin kabupaten yang dapat membuat user.');
  const items = (req.data?.items ?? []) as Item[];
  if (!Array.isArray(items) || !items.length || items.length > 500) throw new HttpsError('invalid-argument', 'Jumlah user 1–500 per permintaan.');
  const uids: string[] = [];
  const gagal: string[] = [];
  for (const it of items) {
    if (caller.role !== 'SUPERADMIN' && it.profile.pemdaId !== caller.pemdaId) throw new HttpsError('permission-denied', 'User harus di kabupaten yang sama.');
    if (it.profile.role === 'SUPERADMIN' && caller.role !== 'SUPERADMIN') throw new HttpsError('permission-denied', 'Tidak boleh membuat Super Admin.');
    try {
      const u = await getAuth().createUser({ email: it.email.toLowerCase(), password: it.password, displayName: it.profile.nama });
      await db.doc(`users/${u.uid}`).set({ ...it.profile, uid: u.uid, email: it.email.toLowerCase(), aktif: it.profile.aktif ?? true });
      uids.push(u.uid);
    } catch (e) {
      gagal.push(`${it.email}: ${(e as Error).message}`);
    }
  }
  if (gagal.length && !uids.length) throw new HttpsError('already-exists', gagal.join('\n'));
  return { uids, gagal };
});
