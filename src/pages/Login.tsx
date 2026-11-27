import {
  AuditOutlined, FileDoneOutlined, LockOutlined, MailOutlined, SafetyCertificateOutlined, WalletOutlined,
} from '@ant-design/icons';
import { Alert, App, Avatar, Button, Checkbox, Divider, Form, Input, Modal, Result, Segmented, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { FieldsPendaftaran, nilaiAwalPendaftaran } from '../components/FormPendaftaran';
import { ajukanPendaftaran, type DataPendaftaran } from '../lib/organisasi';
import { seedDemo } from '../lib/seed';
import { MODE_FIREBASE, store } from '../lib/store';

const DEMO = [
  { email: 'superadmin@demo.id', pw: 'super123', peran: 'Super Admin (setujui pendaftaran organisasi)', warna: '#0f172a' },
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

/** Pesan galat Firebase Auth → kalimat Indonesia. */
export function pesanAuth(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const peta: Record<string, string> = {
    'auth/invalid-credential': 'Email atau kata sandi salah.',
    'auth/wrong-password': 'Email atau kata sandi salah.',
    'auth/user-not-found': 'Email atau kata sandi salah.',
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/email-already-in-use': 'Email sudah terdaftar. Silakan masuk, atau gunakan "Lupa kata sandi".',
    'auth/weak-password': 'Kata sandi minimal 6 karakter.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
    'auth/network-request-failed': 'Tidak dapat terhubung ke server. Periksa koneksi internet.',
    'auth/user-disabled': 'Akun ini dinonaktifkan.',
    'auth/operation-not-allowed': 'Login Email/Password belum diaktifkan di Firebase Authentication.',
    'auth/configuration-not-found': 'Firebase Authentication belum diaktifkan untuk proyek ini.',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'VITE_FIREBASE_API_KEY tidak valid.',
  };
  if (peta[code]) return peta[code];
  return e instanceof Error ? e.message.replace('Firebase: ', '') : 'Terjadi kesalahan.';
}

// Seed demo sekali per halaman (StrictMode menjalankan efek dua kali).
let seeding: Promise<unknown> | null = null;

function FormMasuk() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [dipilih, setDipilih] = useState<string>();

  const masuk = async (v: { email: string; password: string }) => {
    setBusy(true);
    try {
      await store.auth.signIn(v.email.trim(), v.password);
    } catch (e) {
      message.error(pesanAuth(e));
    } finally {
      setBusy(false);
    }
  };

  const lupa = () => {
    let email = form.getFieldValue('email') ?? '';
    modal.confirm({
      title: 'Atur ulang kata sandi',
      icon: null,
      content: (
        <>
          <Typography.Paragraph type="secondary">Kami akan mengirim tautan untuk membuat kata sandi baru ke email Anda.</Typography.Paragraph>
          <Input defaultValue={email} placeholder="nama@instansi.go.id" prefix={<MailOutlined />} onChange={(e) => { email = e.target.value; }} />
        </>
      ),
      okText: 'Kirim tautan',
      cancelText: 'Batal',
      onOk: async () => {
        if (!email.trim()) { message.error('Isi email terlebih dahulu.'); throw new Error('kosong'); }
        try {
          await store.auth.resetPassword(email.trim());
          message.success('Tautan atur ulang kata sandi telah dikirim. Periksa kotak masuk / spam.');
        } catch (e) {
          message.error(pesanAuth(e));
          throw e;
        }
      },
    });
  };

  return (
    <>
      <Form form={form} layout="vertical" onFinish={masuk} requiredMark={false} size="large">
        <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Email wajib diisi' }]}>
          <Input autoFocus prefix={<MailOutlined style={{ color: '#9aa8a1' }} />} placeholder="nama@instansi.go.id" autoComplete="username" />
        </Form.Item>
        <Form.Item name="password" label={<span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>Kata sandi
          {MODE_FIREBASE && <a onClick={(e) => { e.preventDefault(); lupa(); }} style={{ fontWeight: 500 }}>Lupa kata sandi?</a>}</span>}
          rules={[{ required: true, message: 'Kata sandi wajib diisi' }]} className="sk-label-penuh">
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
    </>
  );
}

function FormDaftar({ keMasuk }: { keMasuk: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [selesai, setSelesai] = useState(false);

  const daftar = async (v: DataPendaftaran & { email: string; password: string }) => {
    setBusy(true);
    try {
      const u = await store.auth.signUp(v.email.trim().toLowerCase(), v.password);
      await ajukanPendaftaran(store, u, v);
      setSelesai(true);
    } catch (e) {
      message.error(pesanAuth(e));
    } finally {
      setBusy(false);
    }
  };

  if (selesai) {
    return <Result status="success" title="Pendaftaran terkirim" subTitle="Super Admin akan meninjau data Anda. Anda akan bisa memakai aplikasi setelah disetujui."
      extra={<Button onClick={keMasuk}>Kembali</Button>} />;
  }

  return (
    <Form form={form} layout="vertical" onFinish={daftar} requiredMark={false} initialValues={nilaiAwalPendaftaran} scrollToFirstError>
      <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="Untuk pemerintah kabupaten/kota atau lembaga pelatihan."
        description="Setelah disetujui, akun ini menjadi Admin Kabupaten yang dapat menambahkan kecamatan, desa, dan pengguna desa." />
      <FieldsPendaftaran />
      <Divider plain style={{ fontSize: 12, color: '#7b8a83', margin: '4px 0 12px' }}>Akun Admin</Divider>
      <Form.Item name="email" label="Email dinas" rules={[{ required: true, message: 'Email wajib diisi' }, { type: 'email', message: 'Format email tidak valid' }]}>
        <Input prefix={<MailOutlined style={{ color: '#9aa8a1' }} />} placeholder="nama@instansi.go.id" autoComplete="email" />
      </Form.Item>
      <Form.Item name="password" label="Kata sandi" rules={[{ required: true, message: 'Kata sandi wajib diisi' }, { min: 8, message: 'Minimal 8 karakter' }]} hasFeedback>
        <Input.Password prefix={<LockOutlined style={{ color: '#9aa8a1' }} />} autoComplete="new-password" />
      </Form.Item>
      <Form.Item name="password2" label="Ulangi kata sandi" dependencies={['password']} hasFeedback
        rules={[{ required: true, message: 'Ulangi kata sandi' }, ({ getFieldValue }) => ({ validator: (_, v) => (!v || v === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('Kata sandi tidak sama'))) })]}>
        <Input.Password prefix={<LockOutlined style={{ color: '#9aa8a1' }} />} autoComplete="new-password" />
      </Form.Item>
      <Form.Item name="setuju" valuePropName="checked" rules={[{ validator: (_, v) => (v ? Promise.resolve() : Promise.reject(new Error('Centang untuk melanjutkan'))) }]}>
        <Checkbox>Data yang saya isi benar dan saya berwenang mewakili instansi ini.</Checkbox>
      </Form.Item>
      <Button type="primary" htmlType="submit" block size="large" loading={busy}>Kirim Pendaftaran</Button>
    </Form>
  );
}

export default function Login() {
  const [tab, setTab] = useState<'masuk' | 'daftar'>('masuk');
  const [info, setInfo] = useState(false);

  useEffect(() => {
    if (!MODE_FIREBASE && !seeding) seeding = seedDemo(store, new Date().getFullYear()).catch(() => undefined);
  }, []);

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
          <h2>{tab === 'masuk' ? 'Selamat datang 👋' : 'Daftarkan organisasi'}</h2>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
            {tab === 'masuk' ? 'Masuk menggunakan akun Anda untuk melanjutkan.' : 'Ajukan akses untuk pemda atau lembaga Anda.'}
          </Typography.Paragraph>
          <Segmented block size="large" value={tab} onChange={(v) => setTab(v as 'masuk' | 'daftar')} style={{ marginBottom: 24 }}
            options={[{ value: 'masuk', label: 'Masuk' }, { value: 'daftar', label: 'Daftar Organisasi' }]} />
          {tab === 'masuk' ? <FormMasuk /> : <FormDaftar keMasuk={() => setTab('masuk')} />}
          <Typography.Paragraph type="secondary" style={{ marginTop: 20, fontSize: 13, textAlign: 'center' }}>
            Pengguna desa (operator, kades, sekdes, kaur)? <a onClick={() => setInfo(true)}>Cara mendapatkan akun</a>
          </Typography.Paragraph>
        </div>
      </section>

      <Modal open={info} onCancel={() => setInfo(false)} footer={<Button type="primary" onClick={() => setInfo(false)}>Mengerti</Button>} title="Cara mendapatkan akun">
        <ol style={{ paddingLeft: 18, lineHeight: 1.7 }}>
          <li><b>Pemerintah kabupaten/kota atau lembaga</b> mendaftar lewat tab <i>Daftar Organisasi</i>. Super Admin meninjau dan menyetujui.</li>
          <li>Setelah disetujui, <b>Admin Kabupaten</b> mengisi kecamatan &amp; desa (Parameter › Data Wilayah).</li>
          <li>Admin Kabupaten <b>membuatkan akun pengguna desa</b> di File › Pengaturan UserID (satu per satu atau sekaligus untuk semua desa).</li>
          <li>Pengguna desa tidak perlu mendaftar sendiri — minta email &amp; kata sandi ke Admin Kabupaten (DPMD) Anda.</li>
        </ol>
      </Modal>
    </div>
  );
}
