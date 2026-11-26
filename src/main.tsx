import { ConfigProvider, Result, Spin } from 'antd';
import idID from 'antd/locale/id_ID';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context/App';
import { Layout } from './Layout';
import './styles.css';
import { tema } from './theme';
import { store } from './lib/store';
import Beranda from './pages/Beranda';
import DataUmum from './pages/DataUmum';
import Login from './pages/Login';
import StatusAkun from './pages/StatusAkun';
import Organisasi from './pages/file/Organisasi';
import Kegiatan from './pages/anggaran/Kegiatan';
import Posting from './pages/anggaran/Posting';
import Rak from './pages/anggaran/Rak';
import Rincian from './pages/anggaran/Rincian';
import Jurnal from './pages/buku/Jurnal';
import SaldoAwal from './pages/buku/SaldoAwal';
import HakMenu from './pages/file/HakMenu';
import Users from './pages/file/Users';
import LaporanPage from './pages/laporan/Laporan';
import Konfigurasi from './pages/parameter/Konfigurasi';
import Perangkat from './pages/parameter/Perangkat';
import Referensi from './pages/parameter/Referensi';
import Wilayah from './pages/parameter/Wilayah';
import Rkp from './pages/perencanaan/Rkp';
import Rpjm from './pages/perencanaan/Rpjm';
import Backup from './pages/tools/Backup';
import Kunci from './pages/tools/Kunci';
import Monitoring from './pages/tools/Monitoring';
import Pesan from './pages/tools/Pesan';
import Mutasi from './pages/tu/Mutasi';
import Pajak from './pages/tu/Pajak';
import Penerimaan from './pages/tu/Penerimaan';
import Pengembalian from './pages/tu/Pengembalian';
import Spp from './pages/tu/Spp';

dayjs.locale('id');

function Shell() {
  const { authReady, authUser, profile, profileLoading } = useApp();
  if (!authReady) return <Spin fullscreen />;
  if (!authUser) return <Login />;
  if (!profile) return profileLoading ? <Spin fullscreen tip="Memuat profil…" /> : <StatusAkun />;
  if (profile.aktif === false) return <Result status="403" title="Akun dinonaktifkan" extra={<a onClick={() => store.auth.signOut()}>Keluar</a>} />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Beranda />} />
        <Route path="/file/organisasi" element={<Organisasi />} />
        <Route path="/file/user" element={<Users />} />
        <Route path="/file/hak-menu" element={<HakMenu />} />
        <Route path="/parameter/wilayah" element={<Wilayah />} />
        <Route path="/parameter/referensi" element={<Referensi />} />
        <Route path="/parameter/perangkat" element={<Perangkat />} />
        <Route path="/parameter/konfigurasi" element={<Konfigurasi />} />
        <Route path="/data-umum" element={<DataUmum />} />
        <Route path="/perencanaan/rpjm" element={<Rpjm />} />
        <Route path="/perencanaan/rkp" element={<Rkp />} />
        <Route path="/anggaran/kegiatan" element={<Kegiatan />} />
        <Route path="/anggaran/rincian" element={<Rincian />} />
        <Route path="/anggaran/rak" element={<Rak />} />
        <Route path="/anggaran/posting" element={<Posting />} />
        <Route path="/tu/penerimaan" element={<Penerimaan />} />
        <Route path="/tu/spp" element={<Spp />} />
        <Route path="/tu/pajak" element={<Pajak />} />
        <Route path="/tu/mutasi" element={<Mutasi />} />
        <Route path="/tu/pengembalian" element={<Pengembalian />} />
        <Route path="/buku/saldo-awal" element={<SaldoAwal />} />
        <Route path="/buku/jurnal" element={<Jurnal />} />
        <Route path="/laporan" element={<LaporanPage />} />
        <Route path="/tools/monitoring" element={<Monitoring />} />
        <Route path="/tools/pesan" element={<Pesan />} />
        <Route path="/tools/kunci" element={<Kunci />} />
        <Route path="/tools/backup" element={<Backup />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={idID} theme={tema}>
      <BrowserRouter>
        <AppProvider>
          <Shell />
        </AppProvider>
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>,
);
