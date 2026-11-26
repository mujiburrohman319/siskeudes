import { BellOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Badge, Button, Dropdown, Empty, Layout as AL, List, Menu, Popover, Select, Space, Tag, Typography } from 'antd';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from './context/App';
import { tglID } from './lib/format';
import { useCol } from './lib/hooks';
import { P } from './lib/paths';
import { MODE_FIREBASE, store } from './lib/store';
import { ROLE_LABEL, type Pesan } from './lib/types';
import { MENU, SEMUA_MENU } from './menu';

const { Header, Sider, Content } = AL;

function PesanBell() {
  const { pemda, desa, isKab } = useApp();
  // Pesan statis: dimuat saat kembali ke beranda (fitur 2.0.8 no. 25) — di web cukup real time.
  const { data } = useCol<Pesan>(pemda ? P.pesan(pemda.id) : null);
  const list = data.filter((p) => isKab || p.untukDesa === 'ALL' || p.untukDesa === desa?.id).sort((a, b) => b.tgl.localeCompare(a.tgl));
  return (
    <Popover trigger="click" placement="bottomRight" title="Pesan dari Kabupaten"
      content={<div style={{ width: 360, maxHeight: 400, overflow: 'auto' }}>
        {list.length ? <List size="small" dataSource={list} renderItem={(p) => (
          <List.Item><List.Item.Meta title={<>{p.judul} <Typography.Text type="secondary" style={{ fontSize: 12 }}>{tglID(p.tgl)}</Typography.Text></>} description={<span style={{ whiteSpace: 'pre-line' }}>{p.isi}</span>} /></List.Item>
        )} /> : <Empty description="Tidak ada pesan" />}
      </div>}>
      <Badge count={list.length} size="small"><Button type="text" icon={<BellOutlined />} style={{ color: '#fff' }} /></Badge>
    </Popover>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const app = useApp();
  const { profile, pemda, ta, setTa, desaId, setDesaId, desaList, isKab, kecamatan } = app;
  const nav = useNavigate();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const items = useMemo(() => MENU.map((g) => ({
    key: g.key,
    label: g.label,
    children: g.items.filter((i) => !i.kab || isKab).map((i) => ({ key: i.path, label: <Link to={i.path}>{i.label}</Link> })),
  })).filter((g) => g.children.length), [isKab]);

  const aktif = SEMUA_MENU.find((m) => loc.pathname.startsWith(m.path));
  const grupAktif = MENU.find((g) => g.items.some((i) => i === aktif))?.key;
  const tahunOpsi = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 4 + i).map((t) => ({ value: t, label: `TA ${t}` }));
  const kecNama = (id: string) => kecamatan.find((k) => k.id === id)?.nama ?? '';

  return (
    <AL style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', background: '#1f6f43' }}>
        <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: 18, whiteSpace: 'nowrap' }}>SISKEUDES-Web</Link>
        <Typography.Text style={{ color: '#d9f2e3' }} ellipsis>{pemda?.nama}</Typography.Text>
        {!MODE_FIREBASE && <Tag color="gold">Mode Lokal / Simulasi</Tag>}
        <div style={{ flex: 1 }} />
        <Select size="small" value={ta} onChange={setTa} options={tahunOpsi} style={{ width: 100 }} />
        {isKab ? (
          <Select size="small" showSearch allowClear placeholder="Pilih desa" value={desaId ?? undefined} onChange={(v) => setDesaId(v ?? null)}
            style={{ width: 280 }} optionFilterProp="label"
            options={desaList.map((d) => ({ value: d.id, label: `${d.kode} ${d.nama} (Kec. ${kecNama(d.kecId)})` }))} />
        ) : (
          <Typography.Text style={{ color: '#fff' }}>Desa {app.desa?.nama}</Typography.Text>
        )}
        <PesanBell />
        <Dropdown menu={{
          items: [
            { key: 'role', label: profile ? ROLE_LABEL[profile.role] : '', disabled: true },
            { key: 'out', icon: <LogoutOutlined />, label: 'Keluar', onClick: () => store.auth.signOut() },
          ],
        }}>
          <Button type="text" style={{ color: '#fff' }} icon={<UserOutlined />}>{profile?.nama}</Button>
        </Dropdown>
      </Header>
      <AL>
        <Sider width={250} theme="light" collapsible collapsed={collapsed} onCollapse={setCollapsed} breakpoint="lg">
          <Menu mode="inline" selectedKeys={aktif ? [aktif.path] : []} defaultOpenKeys={grupAktif ? [grupAktif] : ['penatausahaan']}
            items={[{ key: '/', label: <Link to="/">Beranda</Link> }, ...items]} style={{ height: '100%', borderRight: 0 }} />
        </Sider>
        <Content style={{ padding: 16, background: '#f4f6f5' }}>
          {aktif?.desa && !app.desa ? (
            <Alert type="info" showIcon message="Pilih desa terlebih dahulu" description="Gunakan pilihan desa di bagian atas layar." action={<Button onClick={() => nav('/')}>Beranda</Button>} />
          ) : aktif?.kab && !isKab ? (
            <Alert type="warning" showIcon message="Menu ini khusus pengguna kabupaten." />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>{children}</Space>
          )}
        </Content>
      </AL>
    </AL>
  );
}
