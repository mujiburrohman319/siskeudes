import {
  AppstoreOutlined, BankOutlined, BellOutlined, BookOutlined, CalendarOutlined, ControlOutlined, DownOutlined,
  EnvironmentOutlined, FileTextOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, ProjectOutlined,
  SwapOutlined, TeamOutlined, ToolOutlined, WalletOutlined,
} from '@ant-design/icons';
import { Alert, Avatar, Badge, Button, Drawer, Dropdown, Empty, Grid, Layout as AL, List, Menu, Popover, Select, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from './context/App';
import { tglID } from './lib/format';
import { useCol } from './lib/hooks';
import { P } from './lib/paths';
import { MODE_FIREBASE, store } from './lib/store';
import { ROLE_LABEL, type Pesan } from './lib/types';
import { MENU, SEMUA_MENU } from './menu';

const { Header, Sider, Content } = AL;

const IKON_GRUP: Record<string, ReactNode> = {
  file: <TeamOutlined />,
  parameter: <ControlOutlined />,
  umum: <BankOutlined />,
  perencanaan: <ProjectOutlined />,
  penganggaran: <WalletOutlined />,
  penatausahaan: <SwapOutlined />,
  pembukuan: <BookOutlined />,
  laporan: <FileTextOutlined />,
  tools: <ToolOutlined />,
};

function inisial(nama?: string) {
  return (nama ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join('');
}

function PesanBell() {
  const { pemda, desa, isKab } = useApp();
  // Pesan statis: dimuat saat kembali ke beranda (fitur 2.0.8 no. 25) — di web cukup real time.
  const { data } = useCol<Pesan>(pemda ? P.pesan(pemda.id) : null);
  const list = data.filter((p) => isKab || p.untukDesa === 'ALL' || p.untukDesa === desa?.id).sort((a, b) => b.tgl.localeCompare(a.tgl));
  return (
    <Popover trigger="click" placement="bottomRight" title="Pesan dari Kabupaten"
      content={<div style={{ width: 360, maxWidth: '80vw', maxHeight: 400, overflow: 'auto' }}>
        {list.length ? <List size="small" dataSource={list} renderItem={(p) => (
          <List.Item><List.Item.Meta title={<>{p.judul} <Typography.Text type="secondary" style={{ fontSize: 12 }}>{tglID(p.tgl)}</Typography.Text></>} description={<span style={{ whiteSpace: 'pre-line' }}>{p.isi}</span>} /></List.Item>
        )} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tidak ada pesan" />}
      </div>}>
      <Badge count={list.length} size="small" offset={[-4, 4]}>
        <Button type="text" shape="circle" size="large" icon={<BellOutlined />} aria-label="Pesan" />
      </Badge>
    </Popover>
  );
}

function Brand({ sub, ringkas }: { sub?: string; ringkas?: boolean }) {
  return (
    <Link to="/" className="sk-brand" style={ringkas ? { justifyContent: 'center', padding: 0 } : undefined}>
      <span className="sk-brand-logo">SK</span>
      {!ringkas && (
        <span className="sk-brand-teks">
          <div className="sk-brand-nama">SISKEUDES<span style={{ color: '#6ee7b7' }}>·</span>Web</div>
          <div className="sk-brand-sub">{sub ?? 'Sistem Keuangan Desa'}</div>
        </span>
      )}
    </Link>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const app = useApp();
  const { profile, pemda, ta, setTa, desaId, setDesaId, desaList, isKab, kecamatan } = app;
  const nav = useNavigate();
  const loc = useLocation();
  const layar = Grid.useBreakpoint();
  const mobile = !layar.lg;
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setDrawer(false), [loc.pathname]);

  const aktif = SEMUA_MENU.find((m) => loc.pathname.startsWith(m.path));
  const grupAktif = MENU.find((g) => g.items.some((i) => i === aktif));
  const [openKeys, setOpenKeys] = useState<string[]>([grupAktif?.key ?? 'penatausahaan']);
  useEffect(() => { if (grupAktif) setOpenKeys((k) => (k.includes(grupAktif.key) ? k : [...k, grupAktif.key])); }, [grupAktif]);

  const items = useMemo(() => MENU.map((g) => ({
    key: g.key,
    icon: IKON_GRUP[g.key],
    label: g.label,
    children: g.items.filter((i) => (!i.kab || isKab) && (!i.superadmin || profile?.role === 'SUPERADMIN')).map((i) => ({ key: i.path, label: <Link to={i.path}>{i.label}</Link> })),
  })).filter((g) => g.children.length), [isKab, profile?.role]);

  const tahunOpsi = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 4 + i).map((t) => ({ value: t, label: `TA ${t}` }));
  const kecNama = (id: string) => kecamatan.find((k) => k.id === id)?.nama ?? '';

  const menu = (ringkas: boolean) => (
    <>
      <Brand sub={pemda?.nama} ringkas={ringkas} />
      <div className="sk-sider-menu">
        <Menu theme="dark" mode="inline" selectedKeys={[aktif ? aktif.path : '/']}
          openKeys={ringkas ? undefined : openKeys} onOpenChange={(k) => setOpenKeys(k as string[])}
          items={[{ key: '/', icon: <AppstoreOutlined />, label: <Link to="/">Beranda</Link> }, ...items]}
          style={{ borderRight: 0 }} />
      </div>
      {!ringkas && !MODE_FIREBASE && (
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <Tag color="gold" style={{ margin: 0, width: '100%', textAlign: 'center', padding: '4px 0' }}>Mode Lokal / Simulasi</Tag>
        </div>
      )}
    </>
  );

  return (
    <AL style={{ minHeight: '100vh' }}>
      {mobile ? (
        <Drawer open={drawer} onClose={() => setDrawer(false)} placement="left" width={280} closable={false}
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#0b3326,#0e4733)' } }}>
          {menu(false)}
        </Drawer>
      ) : (
        <Sider className="sk-sider" width={264} collapsedWidth={76} collapsed={collapsed} trigger={null}>
          {menu(collapsed)}
        </Sider>
      )}
      <AL>
        <Header className="sk-header">
          <Button type="text" shape="circle" size="large" aria-label="Menu"
            icon={mobile || collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => (mobile ? setDrawer(true) : setCollapsed(!collapsed))} />
          <div className="sk-judul" style={{ flex: 1 }}>
            <div className="sk-judul-grup">{grupAktif?.label ?? 'SISKEUDES-Web'}</div>
            <div className="sk-judul-hal">{aktif?.label ?? 'Beranda'}</div>
          </div>
          <Space size={8} wrap={false}>
            <Select value={ta} onChange={setTa} options={tahunOpsi} style={{ width: 108 }} suffixIcon={<CalendarOutlined />} variant="filled" />
            {isKab ? (
              <Select showSearch allowClear placeholder="Pilih desa" value={desaId ?? undefined} onChange={(v) => setDesaId(v ?? null)}
                style={{ width: mobile ? 150 : 300 }} optionFilterProp="label" variant="filled" suffixIcon={<EnvironmentOutlined />}
                options={desaList.map((d) => ({ value: d.id, label: `${d.kode} ${d.nama} (Kec. ${kecNama(d.kecId)})` }))} />
            ) : (
              layar.md && <span className="sk-desa-pill"><EnvironmentOutlined />Desa {app.desa?.nama}</span>
            )}
            <PesanBell />
            <Dropdown trigger={['click']} menu={{
              items: [
                { key: 'role', label: <div><b>{profile?.nama}</b><div style={{ fontSize: 12, color: '#7b8a83' }}>{profile ? ROLE_LABEL[profile.role] : ''}</div></div>, disabled: true },
                { type: 'divider' },
                { key: 'out', icon: <LogoutOutlined />, label: 'Keluar', danger: true, onClick: () => { nav('/'); void store.auth.signOut(); } },
              ],
            }}>
              <div className="sk-user">
                <Avatar style={{ background: 'linear-gradient(135deg,#34d399,#0f7a4d)', fontWeight: 700 }}>{inisial(profile?.nama)}</Avatar>
                {layar.xl && (
                  <div>
                    <div className="sk-user-nama">{profile?.nama}</div>
                    <div className="sk-user-peran">{profile ? ROLE_LABEL[profile.role] : ''}</div>
                  </div>
                )}
                {layar.xl && <DownOutlined style={{ fontSize: 10, color: '#7b8a83' }} />}
              </div>
            </Dropdown>
          </Space>
        </Header>
        <Content className="sk-konten">
          {aktif?.desa && !app.desa ? (
            <Alert type="info" showIcon message="Pilih desa terlebih dahulu" description="Gunakan pilihan desa di bagian atas layar." action={<Button onClick={() => nav('/')}>Beranda</Button>} />
          ) : aktif?.kab && !isKab ? (
            <Alert type="warning" showIcon message="Menu ini khusus pengguna kabupaten." />
          ) : (
            <div className="sk-tumpuk">{children}</div>
          )}
        </Content>
      </AL>
    </AL>
  );
}
