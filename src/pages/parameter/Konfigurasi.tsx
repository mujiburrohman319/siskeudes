import { Button, Card, Form, Select, Switch, Typography } from 'antd';
import { useEffect } from 'react';
import { useAksi, useApp } from '../../context/App';
import { P } from '../../lib/paths';
import { store } from '../../lib/store';

export default function Konfigurasi() {
  const { pemda, ta, konfig, kegiatanRef, readOnly } = useApp();
  const [form] = Form.useForm();
  const aksi = useAksi();
  useEffect(() => { form.setFieldsValue(konfig); }, [konfig, form]);
  if (!pemda) return null;
  const opsiKeg = kegiatanRef.filter((k) => k.level === 'KEGIATAN').map((k) => ({ value: k.kode, label: `${k.kode} ${k.nama}` }));
  return (
    <Card title={`Setting Konfigurasi Kabupaten — TA ${ta}`}>
      <Form form={form} layout="vertical" style={{ maxWidth: 720 }} disabled={readOnly}
        onFinish={(v) => aksi(() => store.set(P.konfigurasi(pemda.id, ta), v, true), 'Konfigurasi tersimpan')}>
        <Form.Item name="kontrolRAK" label="Kontrol Anggaran Kas (RAK) saat membuat SPP" valuePropName="checked"
          extra="Bila aktif, pagu SPP hanya sebesar RAK kumulatif sampai bulan SPP (fitur 2.0.8 no. 11).">
          <Switch />
        </Form.Item>
        <Form.Item name="kegiatanWajib" label="Kegiatan wajib dianggarkan sebelum Posting Awal Tahun"
          extra="Status hijau/merah tampil di menu Posting (fitur 2.0.8 no. 9).">
          <Select mode="multiple" options={opsiKeg} optionFilterProp="label" />
        </Form.Item>
        <Form.Item name="kertas" label="Ukuran kertas cetak">
          <Select options={[{ value: 'A4', label: 'A4 (210 × 297 mm)' }, { value: 'F4', label: 'F4/Folio (215 × 330 mm)' }]} />
        </Form.Item>
        <Form.Item name="wajibLampiran" label="Wajibkan tautan bukti (lampiran) pada transaksi" valuePropName="checked"><Switch /></Form.Item>
        <Button type="primary" htmlType="submit">Simpan</Button>
      </Form>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>Konfigurasi berlaku untuk seluruh desa di kabupaten pada tahun anggaran terpilih.</Typography.Paragraph>
    </Card>
  );
}
