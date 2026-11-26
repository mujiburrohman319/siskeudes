import { Button, Card, Col, Form, Input, Row, Switch, Table, Typography } from 'antd';
import { useEffect } from 'react';
import { DateInput } from '../components/Input';
import { useAksi, useApp } from '../context/App';
import { useDocu } from '../lib/hooks';
import { desaCol, P } from '../lib/paths';
import { store } from '../lib/store';
import { useDesaCol } from '../lib/useTa';
import type { Perangkat, ProfilDesa } from '../lib/types';

export default function DataUmum() {
  const { ctx, desa, hak, readOnly } = useApp();
  const [form] = Form.useForm();
  const aksi = useAksi();
  const path = ctx ? `${P.desa(ctx)}/umum/profil` : null;
  const { data } = useDocu<ProfilDesa>(path);
  const { data: perangkat } = useDesaCol<Perangkat>('perangkat');
  useEffect(() => { form.setFieldsValue(data ?? {}); }, [data, form]);
  if (!ctx || !path) return null;
  const ro = readOnly || !hak('dataumum', 'ubah');

  const muatPelaksana = () => aksi(async () => {
    await store.write(perangkat.map((p) => ({ type: 'set' as const, path: `${desaCol(ctx, 'perangkat')}/${p.id}`, data: { pelaksana: true }, merge: true })));
  }, 'Pelaksana dimuat dari Parameter Perangkat Desa. Nonaktifkan yang bukan pelaksana kegiatan.');

  return (
    <>
      <Card title={`Data Umum Desa ${desa?.nama} (${desa?.kode})`}>
        <Form form={form} layout="vertical" disabled={ro} onFinish={(v) => aksi(() => store.set(path, v, true), 'Tersimpan')}>
          <Row gutter={16}>
            <Col md={12}><Form.Item name="alamat" label="Alamat Kantor Desa"><Input /></Form.Item></Col>
            <Col md={6}><Form.Item name="telepon" label="Telepon"><Input /></Form.Item></Col>
            <Col md={6}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
            <Col md={8}><Form.Item name="namaKades" label="Nama Kepala Desa"><Input /></Form.Item></Col>
            <Col md={8}><Form.Item name="namaSekdes" label="Nama Sekretaris Desa"><Input /></Form.Item></Col>
            <Col md={8}><Form.Item name="namaKaurKeu" label="Nama Kaur Keuangan"><Input /></Form.Item></Col>
            <Col md={6}><Form.Item name="noPerdesApbdes" label="No. Perdes APBDes"><Input /></Form.Item></Col>
            <Col md={6}><Form.Item name="tglPerdesApbdes" label="Tanggal Perdes"><DateInput /></Form.Item></Col>
            <Col md={6}><Form.Item name="noPerkadesPenjabaran" label="No. Perkades Penjabaran"><Input /></Form.Item></Col>
            <Col md={6}><Form.Item name="tglPerkadesPenjabaran" label="Tanggal Perkades"><DateInput /></Form.Item></Col>
          </Row>
          <Typography.Paragraph type="secondary">Nomor Perdes APBDes awal dipakai pada cetakan SPP1, termasuk setelah ada Perkades perubahan (fitur 2.0.8 no. 18).</Typography.Paragraph>
          {!ro && <Button type="primary" htmlType="submit">Simpan</Button>}
        </Form>
      </Card>
      <Card title="Pelaksana Kegiatan" extra={!ro && <Button onClick={muatPelaksana}>Muat dari Perangkat Desa</Button>}>
        <Table size="small" rowKey="id" pagination={false} dataSource={perangkat}
          columns={[
            { title: 'Nama', dataIndex: 'nama' },
            { title: 'Jabatan', dataIndex: 'jabatan' },
            {
              title: 'Pelaksana Kegiatan', dataIndex: 'pelaksana', render: (v: boolean, r: Perangkat) => (
                <Switch checked={!!v} disabled={ro} onChange={(c) => aksi(() => store.set(`${desaCol(ctx, 'perangkat')}/${r.id}`, { pelaksana: c }, true))} />
              ),
            },
          ]} />
      </Card>
    </>
  );
}
