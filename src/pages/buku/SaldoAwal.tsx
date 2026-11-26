import { Button, Card, Col, Form, Input, Row, Typography } from 'antd';
import { useEffect } from 'react';
import { MoneyInput } from '../../components/Input';
import { useAksi, useApp } from '../../context/App';
import * as L from '../../lib/layanan';
import { useSaldoAwal } from '../../lib/useTa';
import type { SaldoAwal } from '../../lib/types';

export default function SaldoAwalPage() {
  const { sesi, hak, readOnly, ta } = useApp();
  const aksi = useAksi();
  const [form] = Form.useForm<SaldoAwal>();
  const { data } = useSaldoAwal();
  useEffect(() => { form.setFieldsValue(data ?? { kasBank: 0, kasTunai: 0, panjar: 0, utangPajak: 0 }); }, [data, form]);
  const ro = readOnly || !hak('saldoawal', 'ubah');
  return (
    <Card title={`Saldo Awal per 1 Januari ${ta}`}>
      <Typography.Paragraph type="secondary">Saldo kas awal biasanya sama dengan SiLPA tahun lalu. Saldo awal tidak dapat diubah setelah ada penutupan kas. User desa tidak perlu memilih desa (fitur 2.0.8 no. 20).</Typography.Paragraph>
      <Form form={form} layout="vertical" disabled={ro} style={{ maxWidth: 720 }} onFinish={(v) => aksi(() => L.simpanSaldoAwal(sesi!, v), 'Saldo awal tersimpan')}>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="kasBank" label="Kas di Bank"><MoneyInput /></Form.Item></Col>
          <Col span={12}><Form.Item name="kasTunai" label="Kas Tunai"><MoneyInput /></Form.Item></Col>
          <Col span={12}><Form.Item name="panjar" label="Panjar belum dipertanggungjawabkan"><MoneyInput /></Form.Item></Col>
          <Col span={12}><Form.Item name="utangPajak" label="Utang pajak belum disetor"><MoneyInput /></Form.Item></Col>
          <Col span={24}><Form.Item name="keterangan" label="Keterangan"><Input.TextArea rows={2} /></Form.Item></Col>
        </Row>
        {!ro && <Button type="primary" htmlType="submit">Simpan</Button>}
      </Form>
    </Card>
  );
}
