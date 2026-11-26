import { ClockCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import { App, Button, Card, Descriptions, Form, Result, Spin, Typography } from 'antd';
import { useState } from 'react';
import { FieldsPendaftaran, nilaiAwalPendaftaran } from '../components/FormPendaftaran';
import { useApp } from '../context/App';
import { tglID } from '../lib/format';
import { useDocu } from '../lib/hooks';
import { ajukanPendaftaran, type DataPendaftaran } from '../lib/organisasi';
import { P } from '../lib/paths';
import { store } from '../lib/store';
import { JENIS_INSTANSI_LABEL, type Pendaftaran } from '../lib/types';
import { pesanAuth } from './Login';

/** Ditampilkan bila pengguna sudah login tetapi belum punya profil (pendaftaran belum disetujui). */
export default function StatusAkun() {
  const { authUser } = useApp();
  const { message } = App.useApp();
  const { data: p, loading } = useDocu<Pendaftaran>(authUser ? P.pendaftaran(authUser.uid) : null);
  const [isi, setIsi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();
  const keluar = <Button icon={<LogoutOutlined />} onClick={() => store.auth.signOut()}>Keluar</Button>;

  const kirim = async (v: DataPendaftaran) => {
    setBusy(true);
    try {
      await ajukanPendaftaran(store, authUser!, v);
      setIsi(false);
      message.success('Pendaftaran terkirim.');
    } catch (e) {
      message.error(pesanAuth(e));
    } finally {
      setBusy(false);
    }
  };

  let isiKartu;
  if (loading) {
    isiKartu = <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;
  } else if (isi) {
    isiKartu = (
      <>
        <Typography.Title level={4} style={{ marginTop: 0 }}>Data organisasi</Typography.Title>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={kirim}
          initialValues={p ? { jenis: p.jenis, namaInstansi: p.namaInstansi, provinsi: p.provinsi, namaPj: p.namaPj, jabatan: p.jabatan, hp: p.hp, catatan: p.catatan } : nilaiAwalPendaftaran}>
          <FieldsPendaftaran />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setIsi(false)}>Batal</Button>
            <Button type="primary" htmlType="submit" loading={busy}>Kirim Pendaftaran</Button>
          </div>
        </Form>
      </>
    );
  } else if (p?.status === 'MENUNGGU') {
    isiKartu = (
      <Result icon={<ClockCircleOutlined style={{ color: '#d97706' }} />} title="Pendaftaran sedang ditinjau"
        subTitle="Super Admin akan memeriksa data organisasi Anda. Halaman ini otomatis terbuka setelah disetujui."
        extra={keluar}>
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Instansi">{p.namaInstansi} — {JENIS_INSTANSI_LABEL[p.jenis]}</Descriptions.Item>
          <Descriptions.Item label="Provinsi">{p.provinsi}</Descriptions.Item>
          <Descriptions.Item label="Penanggung jawab">{p.namaPj} ({p.jabatan})</Descriptions.Item>
          <Descriptions.Item label="Kontak">{p.email} · {p.hp}</Descriptions.Item>
          <Descriptions.Item label="Tanggal daftar">{tglID(p.tglDaftar)}</Descriptions.Item>
        </Descriptions>
      </Result>
    );
  } else if (p?.status === 'DITOLAK') {
    isiKartu = (
      <Result status="warning" title="Pendaftaran ditolak" subTitle={<>Alasan: <b>{p.alasan}</b></>}
        extra={[<Button key="ulang" type="primary" onClick={() => setIsi(true)}>Perbaiki & ajukan ulang</Button>, keluar]} />
    );
  } else if (p?.status === 'DISETUJUI') {
    isiKartu = <Result status="success" title="Pendaftaran disetujui" subTitle="Menyiapkan akun Anda…" extra={<Spin />} />;
  } else {
    isiKartu = (
      <Result status="info" title="Akun belum terhubung ke organisasi"
        subTitle={<>Akun <b>{authUser?.email}</b> belum memiliki profil. Pengguna desa: minta Admin Kabupaten (DPMD) menambahkan akun Anda. Pemerintah kabupaten/kota atau lembaga: daftarkan organisasi Anda.</>}
        extra={[<Button key="daftar" type="primary" onClick={() => setIsi(true)}>Daftarkan organisasi</Button>, keluar]} />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: 'linear-gradient(160deg,#072a1d 0%,#0b3d2b 55%,#0f6a44 100%)' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, color: '#fff' }}>
          <span className="sk-brand-logo">SK</span>
          <span style={{ fontWeight: 750, fontSize: 17 }}>SISKEUDES<span style={{ color: '#6ee7b7' }}>·</span>Web</span>
        </div>
        <Card>{isiKartu}</Card>
      </div>
    </div>
  );
}
