import { DeleteOutlined, EditOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Col, Form, Input, Modal, Row, Select, Space, Table } from 'antd';
import { useState } from 'react';
import { useApp } from '../context/App';
import { sum, uid } from '../lib/format';
import { useDesaCol } from '../lib/useTa';
import type { BuktiPengeluaran, Perangkat } from '../lib/types';
import { DateInput, MoneyInput, PAJAK_OPTIONS, Uang } from './Input';

export interface RekPilihan {
  kdRek: string;
  sumberDana: string;
}

/** Editor daftar bukti pengeluaran (kuitansi/nota) beserta potongan pajak dan tautan lampiran. */
export function BuktiEditor(p: {
  value: BuktiPengeluaran[];
  onChange: (v: BuktiPengeluaran[]) => void;
  pilihan: RekPilihan[];
  tglDefault: string;
  disabled?: boolean;
}) {
  const { akunMap } = useApp();
  const { data: perangkat } = useDesaCol<Perangkat>('perangkat');
  const [edit, setEdit] = useState<BuktiPengeluaran | null>(null);
  const [form] = Form.useForm();

  const buka = (b: BuktiPengeluaran | null) => {
    const v = b ?? { id: uid('b'), noBukti: '', tgl: p.tglDefault, penerima: '', uraian: '', kdRek: p.pilihan[0]?.kdRek ?? '', sumberDana: p.pilihan[0]?.sumberDana ?? '', nilai: 0, pajak: [] };
    setEdit(v);
    form.setFieldsValue({ ...v, rek: `${v.kdRek}|${v.sumberDana}` });
  };

  const simpan = async () => {
    const v = await form.validateFields();
    const [kdRek, sumberDana] = String(v.rek).split('|');
    const b: BuktiPengeluaran = { ...edit!, ...v, kdRek, sumberDana, pajak: (v.pajak ?? []).filter((x: { jenis?: string; nilai?: number }) => x?.jenis && x.nilai) };
    delete (b as unknown as Record<string, unknown>).rek;
    const ada = p.value.some((x) => x.id === b.id);
    p.onChange(ada ? p.value.map((x) => (x.id === b.id ? b : x)) : [...p.value, b]);
    setEdit(null);
  };

  const isiPenerima = (nama: string) => {
    const pr = perangkat.find((x) => x.nama === nama);
    if (pr) form.setFieldsValue({ npwp: pr.npwp, bank: pr.bank, noRekening: pr.noRekening });
  };

  return (
    <>
      <Table<BuktiPengeluaran> size="small" rowKey="id" pagination={false} dataSource={p.value}
        columns={[
          { title: 'No. Bukti', dataIndex: 'noBukti', width: 110 },
          { title: 'Penerima', dataIndex: 'penerima' },
          { title: 'Uraian', dataIndex: 'uraian' },
          { title: 'Rekening', dataIndex: 'kdRek', render: (k: string, r) => <span title={akunMap.get(k)}>{k} ({r.sumberDana})</span> },
          { title: 'Nilai', dataIndex: 'nilai', align: 'right', render: (v: number) => <Uang v={v} /> },
          { title: 'Pajak', align: 'right', render: (_, r) => <Uang v={sum(r.pajak ?? [], (x) => x.nilai)} /> },
          {
            title: '', width: 80, render: (_, r) => !p.disabled && (
              <Space size={4}>
                <Button size="small" icon={<EditOutlined />} onClick={() => buka(r)} />
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => p.onChange(p.value.filter((x) => x.id !== r.id))} />
              </Space>
            ),
          },
        ]}
        summary={(rows) => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={4} align="right"><b>Jumlah bukti</b></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><Uang v={sum([...rows], (r) => r.nilai)} tebal /></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><Uang v={sum([...rows], (r) => sum(r.pajak ?? [], (x) => x.nilai))} /></Table.Summary.Cell>
            <Table.Summary.Cell index={3} />
          </Table.Summary.Row>
        )} />
      {!p.disabled && (
        <Space style={{ marginTop: 8 }}>
          <Button icon={<PlusOutlined />} onClick={() => buka(null)} disabled={!p.pilihan.length}>Tambah Bukti</Button>
        </Space>
      )}
      <Modal open={!!edit} title="Bukti Pengeluaran" width={760} onCancel={() => setEdit(null)} onOk={simpan} okText="Simpan Bukti" cancelText="Batal" destroyOnClose>
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={8}><Form.Item name="noBukti" label="No. Bukti/Kuitansi"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="tgl" label="Tanggal" rules={[{ required: true }]}><DateInput /></Form.Item></Col>
            <Col span={8}><Form.Item name="nilai" label="Nilai (bruto)" rules={[{ required: true }]}><MoneyInput /></Form.Item></Col>
            <Col span={24}><Form.Item name="rek" label="Rekening" rules={[{ required: true }]}>
              <Select options={p.pilihan.map((r) => ({ value: `${r.kdRek}|${r.sumberDana}`, label: `${r.kdRek} ${akunMap.get(r.kdRek) ?? ''} (${r.sumberDana})` }))} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="penerima" label="Nama Penerima" rules={[{ required: true }]}>
              <AutoComplete options={perangkat.map((x) => ({ value: x.nama }))} onSelect={isiPenerima} filterOption={(i, o) => String(o?.value).toLowerCase().includes(i.toLowerCase())} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="alamat" label="Alamat"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="npwp" label="NPWP"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="bank" label="Bank"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="noRekening" label="No. Rekening"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="uraian" label="Uraian" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="lampiranUrl" label="Tautan bukti (Drive/arsip)" extra="Fitur 2.0.8 no. 17: tautan ke arsip digital bukti."><Input placeholder="https://..." /></Form.Item></Col>
          </Row>
          <Form.List name="pajak">
            {(fields, { add, remove }) => (
              <>
                {fields.map((f) => (
                  <Space key={f.key} align="baseline">
                    <Form.Item name={[f.name, 'jenis']} rules={[{ required: true }]}><Select style={{ width: 240 }} options={PAJAK_OPTIONS} placeholder="Jenis pajak" /></Form.Item>
                    <Form.Item name={[f.name, 'nilai']} rules={[{ required: true }]}><MoneyInput style={{ width: 180 }} /></Form.Item>
                    <MinusCircleOutlined onClick={() => remove(f.name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ jenis: 'PPN', nilai: 0 })} icon={<PlusOutlined />}>Tambah potongan/pungutan pajak</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
}
