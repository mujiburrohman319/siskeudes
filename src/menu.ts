// Struktur menu meniru Siskeudes 2.0.8: File, Parameter, Data Entri, Laporan, Tools.
export interface MenuItemDef {
  key: string; // juga dipakai sebagai kunci hak menu
  path: string;
  label: string;
  kab?: boolean; // hanya peran kabupaten
  desa?: boolean; // perlu desa aktif
  superadmin?: boolean; // hanya Super Admin
}

export interface MenuGroup {
  key: string;
  label: string;
  items: MenuItemDef[];
}

export const MENU: MenuGroup[] = [
  {
    key: 'file', label: 'File', items: [
      { key: 'organisasi', path: '/file/organisasi', label: 'Organisasi & Pendaftaran', kab: true, superadmin: true },
      { key: 'user', path: '/file/user', label: 'Pengaturan UserID', kab: true },
      { key: 'hakmenu', path: '/file/hak-menu', label: 'Pengaturan Menu', kab: true },
    ],
  },
  {
    key: 'parameter', label: 'Parameter', items: [
      { key: 'wilayah', path: '/parameter/wilayah', label: 'Data Wilayah', kab: true },
      { key: 'referensi', path: '/parameter/referensi', label: 'Rekening, Kegiatan, Sumber Dana' },
      { key: 'perangkat', path: '/parameter/perangkat', label: 'Rekening Bank & Perangkat Desa', desa: true },
      { key: 'konfigurasi', path: '/parameter/konfigurasi', label: 'Setting Konfigurasi', kab: true },
    ],
  },
  {
    key: 'umum', label: 'Data Umum Desa', items: [
      { key: 'dataumum', path: '/data-umum', label: 'Data Umum Desa', desa: true },
    ],
  },
  {
    key: 'perencanaan', label: 'Perencanaan', items: [
      { key: 'rpjm', path: '/perencanaan/rpjm', label: 'RPJM Desa', desa: true },
      { key: 'rkp', path: '/perencanaan/rkp', label: 'RKP Desa', desa: true },
    ],
  },
  {
    key: 'penganggaran', label: 'Penganggaran', items: [
      { key: 'kegiatan', path: '/anggaran/kegiatan', label: 'Kegiatan', desa: true },
      { key: 'rincian', path: '/anggaran/rincian', label: 'Isian Data Anggaran', desa: true },
      { key: 'rak', path: '/anggaran/rak', label: 'Anggaran Kas Desa (RAK)', desa: true },
      { key: 'posting', path: '/anggaran/posting', label: 'Posting APBDes', desa: true },
    ],
  },
  {
    key: 'penatausahaan', label: 'Penatausahaan', items: [
      { key: 'penerimaan', path: '/tu/penerimaan', label: 'Penerimaan Desa', desa: true },
      { key: 'spp', path: '/tu/spp', label: 'SPP Kegiatan & Pencairan', desa: true },
      { key: 'pajak', path: '/tu/pajak', label: 'Penyetoran Pajak', desa: true },
      { key: 'mutasi', path: '/tu/mutasi', label: 'Mutasi & Penutupan Kas', desa: true },
      { key: 'pengembalian', path: '/tu/pengembalian', label: 'Pengembalian Belanja', desa: true },
    ],
  },
  {
    key: 'pembukuan', label: 'Pembukuan', items: [
      { key: 'saldoawal', path: '/buku/saldo-awal', label: 'Saldo Awal', desa: true },
      { key: 'jurnal', path: '/buku/jurnal', label: 'Jurnal', desa: true },
    ],
  },
  {
    key: 'laporan', label: 'Laporan', items: [
      { key: 'laporan', path: '/laporan', label: 'Cetak Laporan', desa: true },
    ],
  },
  {
    key: 'tools', label: 'Tools', items: [
      { key: 'monitoring', path: '/tools/monitoring', label: 'Monitoring', kab: true },
      { key: 'pesan', path: '/tools/pesan', label: 'Pesan Teks', kab: true },
      { key: 'kunci', path: '/tools/kunci', label: 'Kunci Transaksi Desa', kab: true },
      { key: 'backup', path: '/tools/backup', label: 'Backup & Data Simulasi' },
    ],
  },
];

export const SEMUA_MENU = MENU.flatMap((g) => g.items);
