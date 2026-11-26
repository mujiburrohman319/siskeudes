import { Button, Card, Col, Form, Input, InputNumber, Row } from 'antd';
import { useEffect } from 'react';
import { CrudPage } from '../../components/CrudPage';
import { AkunSelect, KegiatanSelect, SumberDanaSelect, Uang } from '../../components/Input';
import { useAksi, useApp } from '../../context/App';
import { useDocu } from '../../lib/hooks';
import { desaCol, P } from '../../lib/paths';
import { store } from '../../lib/store';
import type { RpjmKegiatan, RpjmVisi } from '../../lib/types';

export default function Rpjm() {
  const { ctx, kegiatanMap, akunMap, hak, readOnly, ta } = useApp();
  const [form] = Form.useForm();
  const aksi = useAksi();
  const path = ctx ? `${P.desa(ctx)}/umum/rpjm` : null;
  const { data: visi } = useDocu<RpjmVisi>(path);
  useEffect(() => { form.setFieldsValue(visi ?? { periodeAwal: ta, periodeAkhir: ta + 5 }); }, [visi, form, ta]);
  if (!ctx || !path) return null;
  const awal = visi?.periodeAwal ?? ta;
  const akhir = visi?.periodeAkhir ?? ta + 5;
  const tahunOpsi = Array.from({ length: Math.max(1, akhir - awal + 1) }, (_, i) => ({ value: awal + i, label: String(awal + i) }));
  const ro = readOnly || !hak('rpjm', 'ubah');

  return (
    <>
      <Card title="Visi dan Misi RPJM Desa">
        <Form form={form} layout="vertical" disabled={ro} onFinish={(v) => aksi(() => store.set(path, v, true), 'Tersimpan')}>
          <Row gutter={16}>
            <Col md={4}><Form.Item name="periodeAwal" label="Periode awal" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col md={4}><Form.Item name="periodeAkhir" label="Periode akhir" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col md={16}><Form.Item name="visi" label="Visi"><Input.TextArea rows={2} /></Form.Item></Col>
            <Col span={24}><Form.Item name="misi" label="Misi"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>
          {!ro && <Button type="primary" htmlType="submit">Simpan</Button>}
        </Form>
      </Card>
      <CrudPage<RpjmKegiatan> title="Kegiatan & Pembiayaan RPJM Desa" menuKey="rpjm" col={desaCol(ctx, 'rpjm')}
        deskripsi="Pembiayaan (mis. Penyertaan Modal Desa) dapat direncanakan di RPJMDes dan akan tersedia di RKPDes (fitur 2.0.8 no. 7)."
        defaults={{ jenis: 'KEGIATAN', tahun: [ta] }}
        sort={(a, b) => (a.kdKeg ?? a.kdRek ?? '').localeCompare(b.kdKeg ?? b.kdRek ?? '')}
        modalWidth={760}
        fields={[
          { name: 'jenis', label: 'Jenis', type: 'select', required: true, width: 110, options: [{ value: 'KEGIATAN', label: 'Kegiatan' }, { value: 'PEMBIAYAAN', label: 'Pembiayaan' }] },
          { name: 'kdKeg', label: 'Kegiatan (untuk jenis Kegiatan)', input: <KegiatanSelect allowClear />, render: (v) => (v ? `${v} ${kegiatanMap.get(v as string) ?? ''}` : '') },
          { name: 'kdRek', label: 'Rekening Pembiayaan (untuk jenis Pembiayaan)', input: <AkunSelect prefix="6.2" allowClear />, render: (v) => (v ? `${v} ${akunMap.get(v as string) ?? ''}` : '') },
          { name: 'uraian', label: 'Uraian/Nama Kegiatan', required: true },
          { name: 'lokasi', label: 'Lokasi', table: false },
          { name: 'volume', label: 'Volume', table: false },
          { name: 'sasaran', label: 'Sasaran/Manfaat', table: false },
          { name: 'tahun', label: 'Tahun Pelaksanaan', type: 'multiselect', required: true, options: tahunOpsi },
          { name: 'biaya', label: 'Perkiraan Biaya per Tahun', type: 'money', required: true, render: (v) => <Uang v={v as number} /> },
          { name: 'sumberDana', label: 'Sumber Dana', input: <SumberDanaSelect /> },
        ]} />
    </>
  );
}
