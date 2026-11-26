import { Button, Card, Select, Space, Table, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { MoneyInput, Uang } from '../../components/Input';
import { useAksi, useApp } from '../../context/App';
import { BULAN, sum } from '../../lib/format';
import { bagiRata, cmpKode } from '../../lib/keuangan';
import * as L from '../../lib/layanan';
import { useTa } from '../../lib/useTa';
import type { KelompokAnggaran, RincianAnggaran } from '../../lib/types';

const LABEL: Record<KelompokAnggaran, string> = { PENDAPATAN: 'Pendapatan', BELANJA: 'Belanja', PEMBIAYAAN1: 'Penerimaan Pembiayaan', PEMBIAYAAN2: 'Pengeluaran Pembiayaan' };

export default function Rak() {
  const { sesi, akunMap, hak, readOnly } = useApp();
  const aksi = useAksi();
  const { data } = useTa<RincianAnggaran>('rincian');
  const [kel, setKel] = useState<KelompokAnggaran>('BELANJA');
  const [draft, setDraft] = useState<Record<string, number[]>>({});
  useEffect(() => { setDraft({}); }, [data]);
  const ro = readOnly || !hak('rak', 'ubah');

  const rows = useMemo(() => data.filter((r) => r.kelompok === kel)
    .sort((a, b) => cmpKode(a.kdKeg ?? '0', b.kdKeg ?? '0') || cmpKode(a.kdRek, b.kdRek)), [data, kel]);
  const rakOf = (r: RincianAnggaran) => draft[r.id] ?? r.rak ?? Array(12).fill(0);
  const setBulan = (r: RincianAnggaran, i: number, v: number) => setDraft((d) => ({ ...d, [r.id]: rakOf(r).map((x, j) => (j === i ? v : x)) }));
  const ubah = Object.keys(draft).length;
  const salah = rows.filter((r) => sum(rakOf(r), (x) => x) !== r.nilai).length;

  const simpan = () => aksi(async () => {
    for (const [id, rak] of Object.entries(draft)) await L.simpanRak(sesi!, id, rak);
  }, 'RAK tersimpan');

  return (
    <Card title="Rencana Anggaran Kas Desa (RAK)" extra={
      <Space>
        <Select value={kel} onChange={setKel} style={{ width: 220 }} options={(Object.keys(LABEL) as KelompokAnggaran[]).map((k) => ({ value: k, label: LABEL[k] }))} />
        {!ro && <Button onClick={() => setDraft(Object.fromEntries(rows.map((r) => [r.id, bagiRata(r.nilai)])))}>Bagi rata semua</Button>}
        {!ro && <Button type="primary" disabled={!ubah} onClick={simpan}>Simpan ({ubah})</Button>}
      </Space>
    }>
      <Typography.Paragraph type="secondary">
        Jumlah RAK setiap rincian wajib sama dengan anggarannya sebelum posting. Bila kontrol RAK aktif, SPP hanya dapat diajukan sebesar RAK kumulatif sampai bulan SPP.
        {salah > 0 && <Tag color="red" style={{ marginLeft: 8 }}>{salah} rincian belum sesuai</Tag>}
      </Typography.Paragraph>
      <Table<RincianAnggaran> size="small" rowKey="id" dataSource={rows} pagination={false} scroll={{ x: 'max-content', y: 600 }}
        columns={[
          { title: 'Kegiatan', dataIndex: 'kdKeg', fixed: 'left', width: 70 },
          { title: 'Rekening', dataIndex: 'kdRek', fixed: 'left', width: 220, render: (k: string, r) => <span title={akunMap.get(k)}>{k} {(akunMap.get(k) ?? '').slice(0, 24)} ({r.sumberDana})</span> },
          { title: 'Anggaran', dataIndex: 'nilai', width: 130, align: 'right', render: (v: number) => <Uang v={v} /> },
          ...BULAN.map((b, i) => ({
            title: b.slice(0, 3), key: `b${i}`, width: 130,
            render: (_: unknown, r: RincianAnggaran) => ro ? <Uang v={rakOf(r)[i]} /> : <MoneyInput value={rakOf(r)[i]} onChange={(v) => setBulan(r, i, v)} />,
          })),
          {
            title: 'Selisih', key: 'sel', width: 120, fixed: 'right', align: 'right',
            render: (_: unknown, r: RincianAnggaran) => { const d = r.nilai - sum(rakOf(r), (x) => x); return <Typography.Text type={d ? 'danger' : 'success'}><Uang v={d} /></Typography.Text>; },
          },
          { title: '', key: 'a', width: 90, fixed: 'right', render: (_: unknown, r: RincianAnggaran) => !ro && <Button size="small" onClick={() => setDraft((d) => ({ ...d, [r.id]: bagiRata(r.nilai) }))}>Bagi rata</Button> },
        ]} />
    </Card>
  );
}
