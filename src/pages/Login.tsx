import { AuditOutlined, FileDoneOutlined, LockOutlined, MailOutlined, SafetyCertificateOutlined, WalletOutlined } from '@ant-design/icons';
import { Alert, App, Avatar, Button, Divider, Form, Input, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { MODE_FIREBASE, store } from '../lib/store';
import { seedDemo } from '../lib/seed';

const DEMO = [
  { email: 'admin@demo.id', pw: 'admin123', peran: 'Admin Kabupaten', warna: '#7c3aed' },
  { email: 'operator@demo.id', pw: 'desa123', peran: 'Operator Desa Sungai Harapan', warna: '#0f7a4d' },
  { email: 'sekdes@demo.id', pw: 'desa123', peran: 'Sekretaris Desa (verifikasi SPP)', warna: '#2563eb' },
  { email: 'kades@demo.id', pw: 'desa123', peran: 'Kepala Desa (persetujuan SPP)', warna: '#b45309' },
  { email: 'kaur@demo.id', pw: 'desa123', peran: 'Kaur Keuangan (pencairan)', warna: '#0891b2' },
  { email: 'kecamatan@demo.id', pw: 'kec123', peran: 'Operator Kecamatan (baca saja)', warna: '#64748b' },
  { email: 'mahasiswa@demo.id', pw: 'mhs123', peran: 'Mahasiswa – Desa Tanjung Makmur (kosong)', warna: '#db2777' },
];

const FITUR = [
  { ikon: <WalletOutlined />, judul: 'Penganggaran', ket: 'RPJM, RKP, APBDes & RAK' },
  { ikon: <FileDoneOutlined />, judul: 'Penatausahaan', ket: 'SPP, pencairan, SPJ, pajak' },
  { ikon: <AuditOutlined />, judul: 'Pembukuan', ket: 'Jurnal & buku pembantu otomatis' },
  { ikon: <SafetyCertificateOutlined />, judul: 'Laporan', ket: 'LRA, BKU — PDF & Excel' },
];

export default function Login() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [dipilih, setDipilih] = useState<string>();

  useEffect(() => {
    if (!MODE_FIREBASE) void seedDemo(store, new Date().getFullYear());
  }, []);

  const masuk = async (v: { email: string; password: string }) => {
    setBusy(true);
    try {
      await store.auth.signIn(v.email.trim(), v.password);
    } catch (e) {
      message.error(e instanceof Error ? e.message.replace('Firebase: ', '') : 'Gagal masuk');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sk-login">
      <section className="sk-login-kiri">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="sk-brand-logo">SK</span>
          <span style={{ fontWeight: 750, fontSize: 17 }}>SISKEUDES<span style={{ color: '#6ee7b7' }}>·</span>Web</span>
        </div>
        <div style={{ margin: '40px 0' }}>
          <h1>Kelola keuangan desa<br />dengan lebih mudah.</h1>
          <p>Perencanaan, penganggaran, penatausahaan, pembukuan, hingga pelaporan — semuanya dalam satu aplikasi web.</p>
          <div className="sk-fitur">
            {FITUR.map((f) => (
              <div key={f.judul} className="sk-fitur-item">{f.ikon}<div><b>{f.judul}</b><span>{f.ket}</span></div></div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(236,253,245,0.55)' }}>
          Tiruan untuk pembelajaran dan uji coba — bukan aplikasi resmi BPKP/Kemendagri.
        </div>
      </section>

      <section className="sk-login-kanan">
        <div className="sk-login-form">
          <h2>Selamat datang 👋</h2>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 28 }}>Masuk menggunakan akun Anda untuk melanjutkan.</Typography.Paragraph>
          <Form form={form} layout="vertical" onFinish={masuk} requiredMark={false} size="large">
            <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Email wajib diisi' }]}>
              <Input autoFocus prefix={<MailOutlined style={{ color: '#9aa8a1' }} />} placeholder="nama@desa.id" autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label="Kata sandi" rules={[{ required: true, message: 'Kata sandi wajib diisi' }]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#9aa8a1' }} />} placeholder="••••••••" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={busy}>Masuk</Button>
          </Form>
          {!MODE_FIREBASE && (
            <>
              <Divider plain style={{ fontSize: 12, color: '#7b8a83' }}>Akun demo · mode lokal</Divider>
              <Alert style={{ marginBottom: 12 }} type="info" showIcon message="Data tersimpan di browser ini. Pilih akun untuk mengisi otomatis." />
              <div className="sk-demo">
                {DEMO.map((d) => (
                  <button key={d.email} type="button" className={`sk-demo-item${dipilih === d.email ? ' aktif' : ''}`}
                    onClick={() => { setDipilih(d.email); form.setFieldsValue({ email: d.email, password: d.pw }); }}>
                    <Avatar size={34} style={{ background: d.warna, flexShrink: 0, fontWeight: 700 }}>{d.peran[0]}</Avatar>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="sk-demo-peran">{d.peran}</div>
                      <div className="sk-demo-email">{d.email} · {d.pw}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
