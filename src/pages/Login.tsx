import { Alert, App, Button, Card, Form, Input, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { MODE_FIREBASE, store } from '../lib/store';
import { seedDemo } from '../lib/seed';

const DEMO = [
  { email: 'admin@demo.id', pw: 'admin123', peran: 'Admin Kabupaten' },
  { email: 'operator@demo.id', pw: 'desa123', peran: 'Operator Desa Sungai Harapan' },
  { email: 'sekdes@demo.id', pw: 'desa123', peran: 'Sekretaris Desa (verifikasi SPP)' },
  { email: 'kades@demo.id', pw: 'desa123', peran: 'Kepala Desa (persetujuan SPP)' },
  { email: 'kaur@demo.id', pw: 'desa123', peran: 'Kaur Keuangan (pencairan)' },
  { email: 'kecamatan@demo.id', pw: 'kec123', peran: 'Operator Kecamatan (baca saja)' },
  { email: 'mahasiswa@demo.id', pw: 'mhs123', peran: 'Mahasiswa – Desa Tanjung Makmur (kosong)' },
];

export default function Login() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1f6f43,#2e8b57)', padding: 16 }}>
      <Card style={{ width: 520, maxWidth: '100%' }}>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>SISKEUDES-Web</Typography.Title>
        <Typography.Paragraph type="secondary">Sistem Keuangan Desa berbasis web — tiruan untuk pembelajaran dan uji coba, bukan aplikasi resmi BPKP/Kemendagri.</Typography.Paragraph>
        <Form form={form} layout="vertical" onFinish={masuk}>
          <Form.Item name="email" label="Email" rules={[{ required: true }]}><Input autoFocus /></Form.Item>
          <Form.Item name="password" label="Kata sandi" rules={[{ required: true }]}><Input.Password /></Form.Item>
          <Button type="primary" htmlType="submit" block loading={busy}>Masuk</Button>
        </Form>
        {!MODE_FIREBASE && (
          <>
            <Alert style={{ marginTop: 16 }} type="info" showIcon message="Mode lokal: data tersimpan di browser ini. Klik akun di bawah untuk mengisi otomatis." />
            <Table size="small" style={{ marginTop: 8 }} pagination={false} rowKey="email" dataSource={DEMO}
              onRow={(r) => ({ onClick: () => form.setFieldsValue({ email: r.email, password: r.pw }), style: { cursor: 'pointer' } })}
              columns={[{ title: 'Email', dataIndex: 'email' }, { title: 'Sandi', dataIndex: 'pw' }, { title: 'Peran', dataIndex: 'peran' }]} />
          </>
        )}
      </Card>
    </div>
  );
}
