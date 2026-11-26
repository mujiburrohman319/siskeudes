import { KeyOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons';
import { App, Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useAksi, useApp } from '../../context/App';
import { useCol } from '../../lib/hooks';
import { P } from '../../lib/paths';
import { store } from '../../lib/store';
import { ROLE_LABEL, type Role, type UserProfile } from '../../lib/types';

const ROLE_DESA: Role[] = ['OPERATOR_DESA', 'KADES', 'SEKDES', 'KAUR_KEU', 'PKA', 'MAHASISWA'];

export default function UsersPage() {
  const { pemda, desaList, kecamatan, profile, readOnly } = useApp();
  const aksi = useAksi();
  const { message } = App.useApp();
  const { data: users, loading } = useCol<UserProfile>(pemda ? P.users() : null, pemda ? ['pemdaId', pemda.id] : undefined);
  const [cari, setCari] = useState('');
  const [mode, setMode] = useState<'baru' | 'ubah' | 'semua' | null>(null);
  const [edit, setEdit] = useState<UserProfile | null>(null);
  const [form] = Form.useForm();
  const desaNama = (id?: string) => desaList.find((d) => d.id === id)?.nama ?? '';
  const rows = useMemo(() => users.filter((u) => !cari || `${u.email} ${u.nama} ${desaNama(u.desaId)}`.toLowerCase().includes(cari.toLowerCase())), [users, cari, desaList]); // eslint-disable-line react-hooks/exhaustive-deps
  const opsiRole = (Object.keys(ROLE_LABEL) as Role[]).filter((r) => r !== 'SUPERADMIN' || profile?.role === 'SUPERADMIN').map((r) => ({ value: r, label: ROLE_LABEL[r] }));
  if (!pemda) return null;

  const simpan = async () => {
    const v = await form.validateFields();
    const desa = desaList.find((d) => d.id === v.desaId);
    if (mode === 'baru') {
      const ok = await aksi(() => store.auth.createUsers([{ email: v.email, password: v.password, profile: { nama: v.nama, role: v.role, grup: v.grup || v.role, pemdaId: pemda.id, desaId: v.desaId, kecId: desa?.kecId ?? v.kecId, aktif: true } }]), 'User dibuat');
      if (ok) setMode(null);
    } else if (mode === 'ubah' && edit) {
      const ok = await aksi(() => store.set(P.user(edit.uid ?? (edit as unknown as { id: string }).id), { nama: v.nama, role: v.role, grup: v.grup || v.role, desaId: v.desaId ?? null, kecId: desa?.kecId ?? v.kecId ?? null, aktif: v.aktif }, true), 'User diperbarui');
      if (ok) setMode(null);
    } else if (mode === 'semua') {
      // Create All User (fitur 2.0.8 no. 2): satu user per desa, terhubung ke kode desanya.
      const ada = new Set(users.map((u) => u.email));
      const items = desaList.map((d) => ({
        email: `${v.awalan}${d.kode.replace(/\./g, '')}@${v.domain}`.toLowerCase(),
        password: v.password,
        profile: { nama: `${ROLE_LABEL[v.role as Role]} ${d.nama}`, role: v.role, grup: v.grup || v.role, pemdaId: pemda.id, desaId: d.id, kecId: d.kecId, aktif: true },
      })).filter((x) => !ada.has(x.email));
      const ok = await aksi(() => store.auth.createUsers(items));
      if (ok) { message.success(`${items.length} user dibuat untuk ${desaList.length} desa.`); setMode(null); }
    }
  };

  return (
    <Card title="Pengaturan UserID" extra={!readOnly && (
      <Space>
        <Input.Search allowClear placeholder="Cari email/nama/desa" onChange={(e) => setCari(e.target.value)} style={{ width: 240 }} />
        <Button icon={<UserAddOutlined />} type="primary" onClick={() => { form.resetFields(); form.setFieldsValue({ role: 'OPERATOR_DESA' }); setMode('baru'); }}>Tambah User</Button>
        <Button icon={<TeamOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ role: 'OPERATOR_DESA', awalan: 'desa', domain: 'siskeudes.id' }); setMode('semua'); }}>Create All User</Button>
      </Space>
    )}>
      <Table<UserProfile> size="small" rowKey={(u) => u.uid ?? (u as unknown as { id: string }).id} loading={loading} dataSource={rows} pagination={{ pageSize: 30 }}
        columns={[
          { title: 'Email', dataIndex: 'email', sorter: (a, b) => a.email.localeCompare(b.email) },
          { title: 'Nama', dataIndex: 'nama', sorter: (a, b) => a.nama.localeCompare(b.nama) },
          { title: 'Peran', dataIndex: 'role', render: (r: Role) => ROLE_LABEL[r], filters: opsiRole.map((o) => ({ text: o.label, value: o.value })), onFilter: (v, u) => u.role === v },
          { title: 'Grup Menu', dataIndex: 'grup' },
          { title: 'Desa', dataIndex: 'desaId', render: desaNama, sorter: (a, b) => desaNama(a.desaId).localeCompare(desaNama(b.desaId)) },
          { title: 'Aktif', dataIndex: 'aktif', render: (v: boolean) => (v === false ? <Tag color="red">Nonaktif</Tag> : <Tag color="green">Aktif</Tag>) },
          {
            title: '', render: (_, u) => !readOnly && (
              <Space size={4}>
                <Button size="small" onClick={() => { setEdit(u); form.setFieldsValue({ ...u, aktif: u.aktif !== false }); setMode('ubah'); }}>Ubah</Button>
                <Button size="small" icon={<KeyOutlined />} onClick={() => aksi(() => store.auth.resetPassword(u.email), 'Reset kata sandi dikirim/diatur ke 123456 (mode lokal)')} />
              </Space>
            ),
          },
        ]} />
      <Modal open={!!mode} title={mode === 'semua' ? 'Create All User — satu user untuk setiap desa' : mode === 'baru' ? 'Tambah User' : 'Ubah User'} onCancel={() => setMode(null)} onOk={simpan} okText="Simpan" cancelText="Batal" destroyOnClose>
        <Form form={form} layout="vertical">
          {mode === 'semua' ? (
            <>
              <Typography.Paragraph type="secondary">Email dibentuk dari awalan + kode desa tanpa titik, mis. desa6101012001@siskeudes.id. Desa yang sudah punya email sama dilewati.</Typography.Paragraph>
              <Form.Item name="role" label="Peran/Grup user" rules={[{ required: true }]}><Select options={opsiRole.filter((o) => ROLE_DESA.includes(o.value))} /></Form.Item>
              <Form.Item name="awalan" label="Awalan email" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="domain" label="Domain email" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="password" label="Kata sandi awal" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
            </>
          ) : (
            <>
              {mode === 'baru' && <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>}
              {mode === 'baru' && <Form.Item name="password" label="Kata sandi" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>}
              <Form.Item name="nama" label="Nama" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="role" label="Peran" rules={[{ required: true }]}><Select options={opsiRole} /></Form.Item>
              <Form.Item name="grup" label="Grup hak menu" extra="Kosongkan agar sama dengan peran."><Input /></Form.Item>
              <Form.Item name="desaId" label="Desa (untuk peran desa)"><Select allowClear showSearch optionFilterProp="label" options={desaList.map((d) => ({ value: d.id, label: `${d.kode} ${d.nama}` }))} /></Form.Item>
              <Form.Item name="kecId" label="Kecamatan (untuk operator kecamatan)"><Select allowClear options={kecamatan.map((k) => ({ value: k.id, label: k.nama }))} /></Form.Item>
              {mode === 'ubah' && <Form.Item name="aktif" label="Aktif" valuePropName="checked"><Switch /></Form.Item>}
            </>
          )}
        </Form>
      </Modal>
    </Card>
  );
}
