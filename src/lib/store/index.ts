import { createFirebaseStore } from './firebase';
import { createLocalStore } from './local';
import type { DataStore } from './types';

export const MODE_FIREBASE = !!import.meta.env.VITE_FIREBASE_PROJECT_ID;

export const store: DataStore = MODE_FIREBASE ? createFirebaseStore() : createLocalStore();

export * from './types';
