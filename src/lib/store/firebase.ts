// Adapter Firebase (Auth + Firestore + Functions).
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator, createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import {
  collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, initializeFirestore,
  onSnapshot, persistentLocalCache, persistentMultipleTabManager, query, runTransaction, setDoc, where as fsWhere, writeBatch,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import type { DataStore, NewUserInput } from './types';
import { clean } from './types';

export function createFirebaseStore(): DataStore {
  const env = import.meta.env;
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  // Persistensi offline: entri tetap bisa dilakukan saat sinyal lemah.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const fbAuth = getAuth(app);
  const fns = getFunctions(app, 'asia-southeast2');
  if (env.VITE_USE_EMULATOR === 'true') {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(fbAuth, 'http://localhost:9099');
    connectFunctionsEmulator(fns, 'localhost', 5001);
  }

  const withId = (id: string, d: Record<string, unknown>) => ({ ...d, id });

  return {
    kind: 'firebase',
    async list<T>(col: string, where?: [string, string]) {
      const ref = where ? query(collection(db, col), fsWhere(where[0], '==', where[1])) : collection(db, col);
      const s = await getDocs(ref);
      return s.docs.map((d) => withId(d.id, d.data())) as T[];
    },
    async get<T>(path: string) {
      const s = await getDoc(doc(db, path));
      return (s.exists() ? withId(s.id, s.data()) : null) as T | null;
    },
    async set(path, data, merge) {
      const d = clean({ ...(data as Record<string, unknown>) });
      delete d.id;
      await setDoc(doc(db, path), d, { merge: !!merge });
    },
    async remove(path) {
      await deleteDoc(doc(db, path));
    },
    async write(ops) {
      // Firestore membatasi 500 operasi per batch.
      for (let i = 0; i < ops.length; i += 450) {
        const b = writeBatch(db);
        for (const op of ops.slice(i, i + 450)) {
          if (op.type === 'delete') b.delete(doc(db, op.path));
          else {
            const d = clean({ ...(op.data as Record<string, unknown>) });
            delete d.id;
            b.set(doc(db, op.path), d, { merge: !!op.merge });
          }
        }
        await b.commit();
      }
    },
    subscribe<T>(col: string, cb: (rows: T[]) => void, where?: [string, string]) {
      const ref = where ? query(collection(db, col), fsWhere(where[0], '==', where[1])) : collection(db, col);
      return onSnapshot(ref, (s) => cb(s.docs.map((d) => withId(d.id, d.data())) as T[]),
        (e) => { console.error(col, e); cb([]); });
    },
    subscribeDoc<T>(path: string, cb: (d: T | null) => void) {
      return onSnapshot(doc(db, path), (s) => cb((s.exists() ? withId(s.id, s.data()) : null) as T | null),
        (e) => { console.error(path, e); cb(null); });
    },
    async nextNumber(counterPath) {
      return runTransaction(db, async (tx) => {
        const ref = doc(db, counterPath);
        const s = await tx.get(ref);
        const n = ((s.exists() ? (s.data().n as number) : 0) ?? 0) + 1;
        tx.set(ref, { n });
        return n;
      });
    },
    auth: {
      onChange(cb) {
        return onAuthStateChanged(fbAuth, (u) => cb(u ? { uid: u.uid, email: u.email ?? '' } : null));
      },
      async signIn(email, password) {
        await signInWithEmailAndPassword(fbAuth, email, password);
      },
      async signUp(email, password) {
        const c = await createUserWithEmailAndPassword(fbAuth, email, password);
        return { uid: c.user.uid, email: c.user.email ?? email };
      },
      async signOut() {
        await signOut(fbAuth);
      },
      async createUsers(items: NewUserInput[]) {
        const call = httpsCallable<{ items: NewUserInput[] }, { uids: string[] }>(fns, 'buatUser');
        const res = await call({ items });
        return res.data.uids;
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(fbAuth, email);
      },
    },
  };
}
