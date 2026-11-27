import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Firebase App Hosting menyediakan FIREBASE_WEBAPP_CONFIG (JSON config web app) saat build.
// Petakan ke VITE_FIREBASE_* bila belum diisi, agar build App Hosting otomatis memakai Firebase
// (tanpa ini aplikasi jatuh ke mode lokal). Variabel VITE_* yang diisi manual tetap diutamakan.
(() => {
  const raw = process.env.FIREBASE_WEBAPP_CONFIG;
  if (!raw) return;
  let cfg: Record<string, string>;
  try {
    cfg = JSON.parse(raw);
  } catch {
    console.warn('[vite] FIREBASE_WEBAPP_CONFIG bukan JSON yang valid; diabaikan.');
    return;
  }
  const peta: Record<string, string> = {
    apiKey: 'VITE_FIREBASE_API_KEY',
    authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
    projectId: 'VITE_FIREBASE_PROJECT_ID',
    storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'VITE_FIREBASE_APP_ID',
  };
  for (const [k, env] of Object.entries(peta)) {
    if (!process.env[env] && cfg[k]) process.env[env] = cfg[k];
  }
  console.log(`[vite] Konfigurasi Firebase dari App Hosting: proyek ${process.env.VITE_FIREBASE_PROJECT_ID}, database ${process.env.VITE_FIREBASE_DATABASE_ID || '(default)'}`);
})();

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          antd: ['antd', '@ant-design/icons'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
        },
      },
    },
  },
  test: { environment: 'node' },
} as never);
