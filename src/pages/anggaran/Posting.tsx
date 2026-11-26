import { Alert, Button, Card, Col, Form, Input, Popconfirm, Row, Select, Table, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { DateInput, Uang } from '../../components/Input';
import { useAksi, useApp } from '../../context/App';
import { hariIni, tglID } from '../../lib/format';
import { statusKegiatanWajib, validasiPosting } from '../../lib/keuangan';
import * as L from '../../lib/layanan';
import { useAnggaran, useTa } from '../../lib/useTa';
import type { JenisPosting, Posting as TPosting, RincianAnggaran } from '../../lib/types';

const JENIS: Record<JenisPosting, string> = { AWAL: 'Awal Tahun (Perdes APBDes)', PERGESERAN: 'Pergeseran (Perkades)', PERUBAHAN: 'Perubahan (Perdes Perubahan APBDes)' };

export default function Posting() {
  const { sesi, konfig, kegiatanMap, hak, readOnly } = useApp();
  const aksi = useAksi();
  const [form] = Form.useForm();
  const { data: rincian } = useTa<RincianAnggaran>('rincian');
  const { postings, posting } = useAnggaran();
  const jenis = Form.useWatch('jenis', form) as JenisPosting | undefined;
  const masalah = useMemo(() => validasiPosting(rincian, konfig.kegiatanWajib, jenis ?? (posting ? 'PERGESERAN' : 'AWAL'), postings.length > 0), [rincian, konfig, jenis, posting, postings.length]);
  const wajib = statusKegiatanWajib(rincian, konfig.kegiatanWajib);
  const ro = readOnly || !hak('posting', 'tambah');

  const kirim = async (v: { jenis: JenisPosting; tgl: string; dasarHukum: string; tglDasarHukum?: string }) => {
    const r = await aksi(() => L.postingApbdes(sesi!, v, konfig.kegiatanWajib), 'Posting APBDes berhasil');
    if (r?.peringatan.length) r.peringatan.forEach((p) => console.warn(p.pesan));
    if (r) form.resetFields();
  };

  return (
    <>
      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card title="Posting APBDes">
            <Typography.Paragraph type="secondary">Posting mengunci salinan anggaran sebagai dasar pelaksanaan (SPP, pencairan, laporan). Perubahan berikutnya dilakukan lewat Pergeseran atau Perubahan.</Typography.Paragraph>
            {masalah.map((m, i) => <Alert key={i} style={{ marginBottom: 6 }} type={m.level} showIcon message={m.pesan} />)}
            {!masalah.length && <Alert style={{ marginBottom: 6 }} type="success" showIcon message="Rancangan anggaran siap diposting." />}
            <Form form={form} layout="vertical" disabled={ro} onFinish={kirim} initialValues={{ jenis: posting ? 'PERGESERAN' : 'AWAL', tgl: hariIni() }} style={{ marginTop: 12 }}>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="jenis" label="Jenis Posting" rules={[{ required: true }]}>
                  <Select options={(Object.keys(JENIS) as JenisPosting[]).map((k) => ({ value: k, label: JENIS[k], disabled: k === 'AWAL' ? !!posting : !posting }))} />
                </Form.Item></Col>
                <Col span={12}><Form.Item name="tgl" label="Tanggal Posting" rules={[{ required: true }]}><DateInput /></Form.Item></Col>
                <Col span={12}><Form.Item name="dasarHukum" label="Nomor Perdes/Perkades" rules={[{ required: true }]}><Input placeholder="mis. Perdes No. 1 Tahun 2026" /></Form.Item></Col>
                <Col span={12}><Form.Item name="tglDasarHukum" label="Tanggal Perdes/Perkades"><DateInput /></Form.Item></Col>
              </Row>
              {!ro && <Button type="primary" htmlType="submit" disabled={masalah.some((m) => m.level === 'error')}>Posting</Button>}
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Status kegiatan wajib">
            <Table size="small" rowKey="kdKeg" pagination={false} dataSource={wajib}
              columns={[
                { title: 'Kegiatan', dataIndex: 'kdKeg', render: (k: string) => `${k} ${kegiatanMap.get(k) ?? ''}` },
                { title: '', dataIndex: 'sudah', width: 90, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Sudah' : 'Belum'}</Tag> },
              ]} />
          </Card>
        </Col>
      </Row>
      <Card title="Riwayat Posting" extra={!ro && posting && (
        <Popconfirm title="Batalkan posting terakhir?" description="Hanya bisa bila belum ada transaksi (untuk posting awal)." onConfirm={() => aksi(() => L.batalPostingTerakhir(sesi!), 'Posting dibatalkan')}>
          <Button danger>Batalkan Posting Terakhir</Button>
        </Popconfirm>
      )}>
        <Table<TPosting> size="small" rowKey="id" dataSource={postings} pagination={false}
          columns={[
            { title: 'No', dataIndex: 'no', width: 50 },
            { title: 'Jenis', dataIndex: 'jenis', render: (j: JenisPosting) => JENIS[j] },
            { title: 'Tanggal', dataIndex: 'tgl', render: tglID },
            { title: 'Dasar Hukum', dataIndex: 'dasarHukum' },
            { title: 'Pendapatan', align: 'right', render: (_, p) => <Uang v={p.total.pendapatan} /> },
            { title: 'Belanja', align: 'right', render: (_, p) => <Uang v={p.total.belanja} /> },
            { title: 'Pembiayaan Neto', align: 'right', render: (_, p) => <Uang v={p.total.pembiayaan1 - p.total.pembiayaan2} /> },
            { title: 'Oleh', dataIndex: 'oleh' },
          ]} />
      </Card>
    </>
  );
}
