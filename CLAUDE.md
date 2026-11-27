# CLAUDE.md — SISKEUDES-Web

Web clone of Siskeudes 2.0.8 (Indonesian village finance app). UI text, identifiers, and docs are in **Bahasa Indonesia**; keep it that way.

## Stack
React 18 + TypeScript (strict) + Vite 5 + Ant Design 5 + Firebase 11 (Auth, Firestore, Functions v2). Reports: pdfmake 0.2 + ExcelJS (lazy-loaded). Tests: Vitest.

## Commands
- `npm run dev` — dev server (local mode if no `.env`)
- `npm test` — business-logic + report tests (must stay green)
- `npm run typecheck` / `npm run build`
- `cd functions && npm run build` — Cloud Functions
- `npm start` — serve `dist/` on `$PORT` (Firebase App Hosting entrypoint, `server.mjs`; config in `apphosting.yaml`). **Do not remove the `start` script** — App Hosting rollouts fail without it.

## Architecture (read these first)
- `src/lib/store/` — **DataStore abstraction**. `local.ts` (localStorage, used for simulation/classroom and tests) and `firebase.ts` (Firestore). `index.ts` picks Firebase when `VITE_FIREBASE_PROJECT_ID` is set. All app code goes through this interface (`list/get/set/remove/write(batch)/subscribe/nextNumber/auth`). Don't call Firestore SDK directly from pages.
- `src/lib/paths.ts` — Firestore layout: `pemda/{p}/desa/{d}/ta/{ta}/{koleksi}/{id}`; desa-level `perangkat, rekeningBank, rpjm, umum`; pemda-level `refAkun, refKegiatan, refSumberDana, konfigurasi/{ta}, pesan, monitoring, kecamatan, desa`; `users/{uid}`.
- `src/lib/types.ts` — all domain types. Money is **integer rupiah**.
- `src/lib/keuangan.ts` — pure functions (sisa pagu, saldo kas/pajak/panjar, LRA, jurnal otomatis, validasi posting). Unit-tested.
- `src/lib/layanan.ts` — **all write-side business rules** (posting, SPP flow, pencairan, SPJ, penerimaan, pajak, mutasi, penutupan kas, kunci, jurnal). Pages call these; they validate, then write the source doc + `ledger` rows + `audit` + `monitoring` in one batch.
- **Ledger model**: every cash/realisation event is a `ledger` doc (`jenis`, `kas` BANK/TUNAI/null, `masuk`, `keluar`, `realisasi`, `kdKeg`, `kdRek`, `sumberDana`, `pajak`). BKU, buku pembantu, LRA, jurnal all derive from ledger. Source docs store `_ledger: string[]` for deletion.
- `src/lib/laporan/` — `generator.ts` builds a format-neutral `Laporan` model; `pdf.ts`, `excel.ts`, and the preview in `pages/laporan/Laporan.tsx` render it. Add a report = add to `DAFTAR_LAPORAN` + a `case` in `buatLaporan`.
- `src/context/App.tsx` — session (profile, pemda, desa aktif, TA, konfigurasi, referensi), `hak(menu, aksi)` button permissions, `bisaSpp(aksi)` role checks, `useAksi()` error/success wrapper.
- `src/lib/organisasi.ts` — organisation onboarding: self-registration (`pendaftaran/{uid}`, status MENUNGGU/DISETUJUI/DITOLAK), Super Admin approval (creates pemda + referensi + ADMIN_KAB profile), and direct creation. Tested in `organisasi.test.ts`. Logged-in users without a profile see `pages/StatusAkun.tsx`.
- `src/components/CrudPage.tsx` — generic list+modal form used by most master/transaction pages.
- `src/menu.ts` — menu tree (keys double as hak-menu keys).
- `firestore.rules` — tenant isolation, read-only roles, month-lock via `penutupanKas`, immutable audit/posted jurnal.
- `functions/src/index.ts` — `buatUser` callable (Admin SDK) for Tambah User / Create All User.

## Conventions
- Business rule changes go in `layanan.ts`/`keuangan.ts` with a test in `layanan.test.ts` or `laporan/laporan.test.ts`.
- Error messages thrown from layanan are user-facing Indonesian sentences.
- Firestore rejects `undefined`; stores call `clean()` — keep it that way.
- Dates are ISO `YYYY-MM-DD` strings; month = `bulanDari(tgl)`.

## Status / known gaps (backlog, in priority order)
1. **Firestore rules are not yet emulator-tested** (emulator download was blocked where this was built). Write tests with `@firebase/rules-unit-testing` covering: desa isolation, KECAMATAN read-only scope, locked month rejects ledger writes, posted jurnal immutable.
2. Move `layanan.ts` write operations into Cloud Functions callables for production (rules cannot enforce sisa pagu/saldo). Keep local mode calling them directly.
3. Hak menu (`konfigurasi.hakMenu`) is enforced in UI only; add rules enforcement if needed.
4. R2 features from the PRD: Daftar Nominatif Siltap (SPP ber-DN, ekspor-impor), XML bukti potong PPh Unifikasi (Coretax), pembiayaan RPJM→RKP→anggaran link, pesan statis per desa, monitoring realisasi.
5. R3: Ekspor OMSPAN (Excel cut-off), import Siskeudes desktop DB, modul pengawasan (Siswaskeudes-like), BigQuery.
6. Lampiran: currently URL field only; add Firebase Storage upload (PDF/JPG ≤5 MB) with Storage rules.
7. Verify reference code lists (`src/lib/referensi.ts`) against the official Permendagri 20/2018 lampiran + SE Mendagri 100.3.2.3/4716/SJ (2026).
8. Tutup buku tahunan + carry-forward SiLPA/saldo to next TA.
