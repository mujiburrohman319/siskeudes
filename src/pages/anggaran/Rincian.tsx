import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Tabs, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { AkunSelect, MoneyInput, SumberDanaSelect, Uang } from '../../components/Input';
import { useAksi, useApp } from '../../context/App';
import { sum } from '../../lib/format';
import { bagiRata, cmpKode, nilaiRab } from '../../lib/keuangan';
import * as L from '../../lib/layanan';
import { taDoc } from '../../lib/paths';
import { KD_SILPA } from '../../lib/referensi';
import { store } from '../../lib/store';
import { useAnggaran, useTa } from '../../lib/useTa';
import type { KegiatanAnggaran, KelompokAnggaran, RabItem, RincianAnggaran } from '../../lib/types';

const PREFIX: Record<KelompokAnggaran, string> = { PENDAPATAN: '4', BELANJA: '5', PEMBIAYAAN1: '6.1', PEMBIAYAAN2: '6.2' };

function RabEditor({ value, onChange, disabled }: { value: RabItem[]; onChange: (v: RabItem[]) => void; disabled?: boolean }) {
  const set = (i: number, patch: Partial<RabItem>) => onChange(value.map((r, j) => (i === j ? { ...r, ...patch } : r)));
  return (
    <>
      <Table<RabItem & { _i: number }> size="small" pagination={false} rowKey="_i" dataSource={value.map((r, i) => ({ ...r, _i: i }))}
        columns={[
          { title: 'Uraian', render: (_, r) => <Input disabled={disabled} value={r.uraian} onChange={(e) => set(r._i, { uraian: e.target.value })} /> },
          { title: 'Volume', width: 100, render: (_, r) => <InputNumber disabled={disabled} style={{ width: '100%' }} value={r.volume} min={0} onChange={(v) => set(r._i, { volume: Number(v) || 0 })} /> },
          { title: 'Satuan', width: 100, render: (_, r) => <Input disabled={disabled} value={r.satuan} onChange={(e) => set(r._i, { satuan: e.target.value })} /> },
          { title: 'Harga Satuan', width: 160, render: (_, r) => <MoneyInput disabled={disabled} value={r.harga} onChange={(v) => set(r._i, { harga: v })} /> },
          { title: 'Jumlah', width: 140, align: 'right', render: (_, r) => <Uang v={Math.round(r.volume * r.harga)} /> },
          { title: '', width: 40, render: (_, r) => !disabled && <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onChange(value.filter((_, j) => j !== r._i))} /> },
        ]}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={4} align="right"><b>Jumlah RAB</b></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><Uang v={nilaiRab({ rab: value })} tebal /></Table.Summary.Cell>
            <Table.Summary.Cell index={2} />
          </Table.Summary.Row>
        )} />
      {!disabled && <Button style={{ marginTop: 8 }} icon={<PlusOutlined />} onClick={() => onChange([...value, { uraian: '', volume: 1, satuan: 'Paket', harga: 0 }])}>Tambah baris RAB</Button>}
    </>
  );
}

function TabelKelompok({ kelompok, rows, kegiatan }: { kelompok: KelompokAnggaran; rows: RincianAnggaran[]; kegiatan: KegiatanAnggaran[] }) {
  const { akunMap, kegiatanMap, hak, readOnly, sesi, sumberDana } = useApp();
  const aksi = useAksi();
  const { message } = App.useApp();
  const [edit, setEdit] = useState<Partial<RincianAnggaran> | null>(null);
  const [kegFilter, setKegFilter] = useState<string | undefined>();
  const [form] = Form.useForm();
  const ro = readOnly || !hak('rincian', 'ubah');

  const tampil = useMemo(() => rows
    .filter((r) => r.kelompok === kelompok && (!kegFilter || r.kdKeg === kegFilter))
    .sort((a, b) => cmpKode(a.kdKeg ?? '0', b.kdKeg ?? '0') || cmpKode(a.kdRek, b.kdRek) || a.sumberDana.localeCompare(b.sumberDana)), [rows, kelompok, kegFilter]);

  const buka = (r: Partial<RincianAnggaran> | null) => {
    const v = r ?? { kelompok, kdKeg: kegFilter, rab: [{ uraian: '', volume: 1, satuan: 'Paket', harga: 0 }] };
    setEdit(v);
    form.setFieldsValue({ kdKeg: v.kdKeg, kdRek: v.kdRek, sumberDana: v.sumberDana, rab: v.rab ?? [] });
  };

  const simpan = async () => {
    const v = await form.validateFields();
    const rab = (v.rab as RabItem[]).filter((x) => x.uraian || x.harga);
    const nilai = nilaiRab({ rab });
    let rak = edit?.rak;
    let disesuaikan = false;
    if (!rak || sum(rak, (x) => x) !== nilai) { rak = bagiRata(nilai); disesuaikan = !!edit?.id; }
    const ok = await aksi(() => L.simpanRincian(sesi!, { ...edit, kelompok, kdKeg: v.kdKeg, kdRek: v.kdRek, sumberDana: v.sumberDana, rab, rak }), 'Rincian tersimpan');
    if (ok) {
      if (disesuaikan) message.info('RAK rincian ini dibagi rata otomatis karena nilainya berubah. Sesuaikan di menu Anggaran Kas.');
      setEdit(null);
    }
  };

  const buatSilpa = async () => {
    const sd = [...new Set(rows.map((r) => r.sumberDana))].filter((x) => x !== 'PBY');
    const pilih = sd.length ? sd : sumberDana.map((s) => s.kode);
    const n = await aksi(() => L.buatSilpaOtomatis(sesi!, pilih));
    if (n !== undefined) message.success(n ? `${n} rincian SiLPA dibuat. Isi nominalnya.` : 'Rincian SiLPA untuk semua sumber dana sudah ada.');
  };

  const opsiKeg = kegiatan.map((k) => ({ value: k.kdKeg, label: `${k.kdKeg} ${k.nama}` }));
  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        {kelompok === 'BELANJA' && <Select allowClear placeholder="Semua kegiatan" style={{ width: 420 }} value={kegFilter} onChange={setKegFilter} options={opsiKeg} showSearch optionFilterProp="label" />}
        {!ro && <Button type="primary" icon={<PlusOutlined />} onClick={() => buka(null)}>Tambah Rincian</Button>}
        {!ro && kelompok === 'PEMBIAYAAN1' && <Button onClick={buatSilpa}>Buat Rincian SiLPA per Sumber Dana</Button>}
        <Typography.Text strong>Jumlah: <Uang v={sum(tampil, (r) => r.nilai)} /></Typography.Text>
      </Space>
      <Table<RincianAnggaran> size="small" rowKey="id" dataSource={tampil} pagination={{ pageSize: 50 }}
        expandable={{ expandedRowRender: (r) => <RabEditor value={r.rab} onChange={() => undefined} disabled /> }}
        columns={[
          ...(kelompok === 'BELANJA' ? [{ title: 'Kegiatan', dataIndex: 'kdKeg', width: 260, render: (k: string) => <span>{k} {kegiatanMap.get(k)}</span> }] : []),
          { title: 'Kode Rek', dataIndex: 'kdRek', width: 100 },
          { title: 'Uraian Rekening', dataIndex: 'kdRek', render: (k: string) => akunMap.get(k) },
          { title: 'Sumber Dana', dataIndex: 'sumberDana', width: 100 },
          { title: 'Anggaran', dataIndex: 'nilai', width: 150, align: 'right', render: (v: number) => <Uang v={v} /> },
          {
            title: '', width: 90, render: (_: unknown, r: RincianAnggaran) => !ro && (
              <Space size={4}>
                <Button size="small" icon={<EditOutlined />} onClick={() => buka(r)} />
                {hak('rincian', 'hapus') && (
                  <Popconfirm title="Hapus rincian?" onConfirm={() => aksi(() => store.remove(taDoc(sesi!.ctx, 'rincian', r.id)), 'Terhapus')}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]} />
      <Modal open={!!edit} width={900} title={edit?.id ? 'Ubah Rincian Anggaran' : 'Tambah Rincian Anggaran'} onCancel={() => setEdit(null)} onOk={simpan} okText="Simpan" cancelText="Batal" destroyOnClose>
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            {kelompok === 'BELANJA' && <Col span={24}><Form.Item name="kdKeg" label="Kegiatan" rules={[{ required: true }]}><Select options={opsiKeg} showSearch optionFilterProp="label" /></Form.Item></Col>}
            <Col span={16}><Form.Item name="kdRek" label="Kode Rekening" rules={[{ required: true }]}><AkunSelect prefix={PREFIX[kelompok]} /></Form.Item></Col>
            <Col span={8}><Form.Item name="sumberDana" label="Sumber Dana" rules={[{ required: true }]}><SumberDanaSelect /></Form.Item></Col>
          </Row>
          <Form.Item name="rab" label="Rincian Anggaran Biaya (RAB)" valuePropName="value" trigger="onChange">
            <RabEditorField />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function RabEditorField(p: { value?: RabItem[]; onChange?: (v: RabItem[]) => void }) {
  return <RabEditor value={p.value ?? []} onChange={(v) => p.onChange?.(v)} />;
}

export default function Rincian() {
  const { data: rows } = useTa<RincianAnggaran>('rincian');
  const { data: kegiatan } = useTa<KegiatanAnggaran>('kegiatan');
  const { posting } = useAnggaran();
  const t = useMemo(() => {
    const g = (k: KelompokAnggaran) => sum(rows.filter((r) => r.kelompok === k), (r) => r.nilai);
    return { p: g('PENDAPATAN'), b: g('BELANJA'), p1: g('PEMBIAYAAN1'), p2: g('PEMBIAYAAN2') };
  }, [rows]);
  const kegUrut = [...kegiatan].sort((a, b) => cmpKode(a.kdKeg, b.kdKeg));
  const silpa = sum(rows.filter((r) => r.kdRek === KD_SILPA), (r) => r.nilai);
  return (
    <Card title="Isian Data Anggaran (Rancangan APBDes)">
      {posting && <Alert style={{ marginBottom: 12 }} type="info" showIcon message={`APBDes sudah diposting (No. ${posting.no}). Perubahan di sini berlaku setelah Posting Pergeseran/Perubahan.`} />}
      {!kegiatan.length && <Alert style={{ marginBottom: 12 }} type="warning" showIcon message="Belum ada kegiatan. Tambahkan di menu Penganggaran > Kegiatan sebelum mengisi belanja." />}
      <Row gutter={16} style={{ marginBottom: 12 }}>
        <Col><Typography.Text>Pendapatan <Uang v={t.p} tebal /></Typography.Text></Col>
        <Col><Typography.Text>Belanja <Uang v={t.b} tebal /></Typography.Text></Col>
        <Col><Typography.Text>Surplus/(Defisit) <Uang v={t.p - t.b} tebal /></Typography.Text></Col>
        <Col><Typography.Text>Pembiayaan Neto <Uang v={t.p1 - t.p2} tebal /></Typography.Text></Col>
        <Col><Typography.Text type={t.p - t.b + t.p1 - t.p2 === 0 ? 'success' : 'danger'}>SiLPA Berjalan <Uang v={t.p - t.b + t.p1 - t.p2} tebal /></Typography.Text></Col>
        <Col><Typography.Text type="secondary">(SiLPA tahun lalu <Uang v={silpa} />)</Typography.Text></Col>
      </Row>
      <Tabs items={[
        { key: 'P', label: 'Pendapatan', children: <TabelKelompok kelompok="PENDAPATAN" rows={rows} kegiatan={kegUrut} /> },
        { key: 'B', label: 'Belanja', children: <TabelKelompok kelompok="BELANJA" rows={rows} kegiatan={kegUrut} /> },
        { key: 'P1', label: 'Pembiayaan 1 (Penerimaan)', children: <TabelKelompok kelompok="PEMBIAYAAN1" rows={rows} kegiatan={kegUrut} /> },
        { key: 'P2', label: 'Pembiayaan 2 (Pengeluaran)', children: <TabelKelompok kelompok="PEMBIAYAAN2" rows={rows} kegiatan={kegUrut} /> },
      ]} />
    </Card>
  );
}
