import { DeleteOutlined, EditOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { DateInput, MoneyInput, Uang } from '../../components/Input';
import { useAksi, useApp } from '../../context/App';
import { hariIni, sum, tglID } from '../../lib/format';
import { jurnalDariLedger } from '../../lib/keuangan';
import * as L from '../../lib/layanan';
import { AKUN_NERACA } from '../../lib/referensi';
import { useTa } from '../../lib/useTa';
import type { Jurnal, JurnalBaris, Ledger } from '../../lib/types';

export default function JurnalPage() {
  const { sesi, akun, akunMap, hak, readOnly } = useApp();
  const aksi = useAksi();
  const { data: ledger } = useTa<Ledger>('ledger');
  const { data: jurnal } = useTa<Jurnal>('jurnal');
  const [edit, setEdit] = useState<Partial<Jurnal> | null>(null);
  const [form] = Form.useForm();
  const ro = readOnly || !hak('jurnal', 'ubah');
  const nama = (k: string) => akunMap.get(k) ?? AKUN_NERACA[k] ?? '';
  const opsiAkun = [
    ...Object.entries(AKUN_NERACA).map(([k, v]) => ({ value: k, label: `${k} ${v}` })),
    ...akun.filter((a) => a.level === 'OBJEK').map((a) => ({ value: a.kode, label: `${a.kode} ${a.nama}` })),
  ];

  const otomatis = useMemo(() => [...ledger].sort((a, b) => a.tgl.localeCompare(b.tgl) || a.noBukti.localeCompare(b.noBukti))
    .map((l) => ({ l, baris: jurnalDariLedger(l) })).filter((x) => x.baris.length), [ledger]);

  const buka = (j: Partial<Jurnal> | null) => {
    const v = j ?? { tgl: hariIni(), uraian: '', baris: [{ akun: '', debet: 0, kredit: 0 }, { akun: '', debet: 0, kredit: 0 }] };
    setEdit(v);
    form.setFieldsValue(v);
  };
  const simpan = async () => {
    const v = await form.validateFields();
    const ok = await aksi(() => L.simpanJurnal(sesi!, { ...v, id: edit?.id, baris: (v.baris as JurnalBaris[]).map((b) => ({ akun: b.akun, debet: b.debet || 0, kredit: b.kredit || 0 })) }), 'Jurnal tersimpan');
    if (ok !== undefined) setEdit(null);
  };

  return (
    <Card title="Jurnal">
      <Tabs items={[
        {
          key: 'auto', label: `Jurnal otomatis dari transaksi (${otomatis.length})`, children: (
            <Table size="small" rowKey={(x) => x.l.id} dataSource={otomatis} pagination={{ pageSize: 30 }}
              columns={[
                { title: 'Tanggal', width: 95, render: (_, x) => tglID(x.l.tgl) },
                { title: 'No. Bukti', width: 130, render: (_, x) => x.l.noBukti },
                { title: 'Uraian', render: (_, x) => x.l.uraian },
                { title: 'Akun', render: (_, x) => x.baris.map((b, i) => <div key={i} style={{ paddingLeft: b.kredit ? 24 : 0 }}>{b.akun} {nama(b.akun)}</div>) },
                { title: 'Debet', align: 'right', render: (_, x) => x.baris.map((b, i) => <div key={i}>{b.debet ? <Uang v={b.debet} /> : <>&nbsp;</>}</div>) },
                { title: 'Kredit', align: 'right', render: (_, x) => x.baris.map((b, i) => <div key={i}>{b.kredit ? <Uang v={b.kredit} /> : <>&nbsp;</>}</div>) },
              ]} />
          ),
        },
        {
          key: 'umum', label: `Jurnal umum/penyesuaian (${jurnal.length})`, children: (
            <>
              {!ro && <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 12 }} onClick={() => buka(null)}>Tambah Jurnal</Button>}
              <Table<Jurnal> size="small" rowKey="id" dataSource={[...jurnal].sort((a, b) => a.tgl.localeCompare(b.tgl))}
                columns={[
                  { title: 'No', dataIndex: 'no', width: 120 },
                  { title: 'Tanggal', dataIndex: 'tgl', width: 95, render: tglID },
                  { title: 'Uraian', dataIndex: 'uraian' },
                  { title: 'Nilai', align: 'right', render: (_, j) => <Uang v={sum(j.baris, (b) => b.debet)} /> },
                  { title: 'Status', dataIndex: 'posted', render: (p: boolean) => (p ? <Tag color="green">Diposting</Tag> : <Tag color="orange">Draft</Tag>) },
                  {
                    title: '', render: (_, j) => !ro && !j.posted && (
                      <Space size={4}>
                        <Button size="small" icon={<EditOutlined />} onClick={() => buka(j)} />
                        <Popconfirm title="Posting jurnal? Setelah diposting tidak dapat diubah." onConfirm={() => aksi(() => L.postingJurnal(sesi!, j.id), 'Jurnal diposting')}><Button size="small" type="primary">Posting</Button></Popconfirm>
                        <Popconfirm title="Hapus jurnal?" onConfirm={() => aksi(() => L.hapusJurnal(sesi!, j.id), 'Terhapus')}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
                      </Space>
                    ),
                  },
                ]} />
            </>
          ),
        },
      ]} />
      <Modal open={!!edit} width={860} title="Jurnal Umum" onCancel={() => setEdit(null)} onOk={simpan} okText="Simpan" cancelText="Batal" destroyOnClose>
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={8}><Form.Item name="tgl" label="Tanggal" rules={[{ required: true }]}><DateInput /></Form.Item></Col>
            <Col span={16}><Form.Item name="uraian" label="Uraian" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Form.List name="baris">
            {(fields, { add, remove }) => (
              <>
                {fields.map((f) => (
                  <Space key={f.key} align="baseline" style={{ display: 'flex' }}>
                    <Form.Item name={[f.name, 'akun']} rules={[{ required: true }]} style={{ width: 420 }}><Select showSearch optionFilterProp="label" options={opsiAkun} placeholder="Akun" /></Form.Item>
                    <Form.Item name={[f.name, 'debet']}><MoneyInput style={{ width: 160 }} /></Form.Item>
                    <Form.Item name={[f.name, 'kredit']}><MoneyInput style={{ width: 160 }} /></Form.Item>
                    <MinusCircleOutlined onClick={() => remove(f.name)} />
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ akun: '', debet: 0, kredit: 0 })}>Tambah baris</Button>
              </>
            )}
          </Form.List>
          <Form.Item name="lampiranUrl" label="Tautan bukti" style={{ marginTop: 12 }}><Input /></Form.Item>
          <Typography.Text type="secondary">Kolom kiri debet, kanan kredit. Jumlah debet harus sama dengan kredit.</Typography.Text>
        </Form>
      </Modal>
    </Card>
  );
}
