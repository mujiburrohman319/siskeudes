import { Button, Card, Select, Space, Switch, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useAksi, useApp } from '../../context/App';
import { P } from '../../lib/paths';
import { store } from '../../lib/store';
import { ROLE_LABEL, type AksiMenu, type Role } from '../../lib/types';
import { MENU } from '../../menu';

const AKSI: AksiMenu[] = ['tambah', 'ubah', 'hapus', 'cetak'];

export default function HakMenu() {
  const { pemda, ta, konfig, readOnly } = useApp();
  const aksi = useAksi();
  const [grup, setGrup] = useState<string>('OPERATOR_DESA');
  const [matriks, setMatriks] = useState<Record<string, Partial<Record<AksiMenu, boolean>>>>({});
  useEffect(() => { setMatriks(konfig.hakMenu?.[grup] ?? {}); }, [konfig, grup]);
  if (!pemda) return null;
  const rows = MENU.flatMap((g) => g.items.filter((i) => !i.kab).map((i) => ({ ...i, grupLabel: g.label })));
  const set = (menu: string, a: AksiMenu, v: boolean) => setMatriks((m) => ({ ...m, [menu]: { ...m[menu], [a]: v } }));
  return (
    <Card title="Pengaturan Menu (Otorisasi Tombol)" extra={
      <Space>
        <Select style={{ width: 260 }} value={grup} onChange={setGrup} options={(Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: `Grup ${ROLE_LABEL[r]}` }))} />
        {!readOnly && <Button type="primary" onClick={() => aksi(() => store.set(P.konfigurasi(pemda.id, ta), { hakMenu: { ...konfig.hakMenu, [grup]: matriks } }, true), 'Hak menu tersimpan')}>Simpan</Button>}
      </Space>
    }>
      <Typography.Paragraph type="secondary">Matikan tombol Tambah/Ubah/Hapus/Cetak per menu untuk grup user desa (fitur 2.0.8 no. 1). Tombol yang dimatikan disembunyikan di aplikasi desa. Berlaku untuk TA {ta}.</Typography.Paragraph>
      <Table size="small" rowKey="key" pagination={false} dataSource={rows}
        columns={[
          { title: 'Menu', dataIndex: 'grupLabel', width: 140 },
          { title: 'Submenu', dataIndex: 'label' },
          ...AKSI.map((a) => ({
            title: a[0].toUpperCase() + a.slice(1), key: a, width: 90, align: 'center' as const,
            render: (_: unknown, r: { key: string }) => <Switch size="small" disabled={readOnly} checked={matriks[r.key]?.[a] !== false} onChange={(v) => set(r.key, a, v)} />,
          })),
        ]} />
    </Card>
  );
}
