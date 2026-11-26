import { Alert, Button, Card, Input, Modal, Table, Tag } from 'antd';
import { useState } from 'react';
import { useAksi, useApp } from '../../context/App';
import { BULAN, tglID } from '../../lib/format';
import * as L from '../../lib/layanan';
import { useTa } from '../../lib/useTa';
import type { PenutupanKas } from '../../lib/types';

export default function KunciPage() {
  const { sesi, desa, readOnly } = useApp();
  const aksi = useAksi();
  const { data: tutup } = useTa<PenutupanKas>('penutupanKas');
  const [buka, setBuka] = useState<number | null>(null);
  const [alasan, setAlasan] = useState('');
  if (!desa || !sesi) return <Alert type="info" showIcon message="Pilih desa di bagian atas untuk mengunci penutupan kasnya." />;
  const rows = [...tutup].sort((a, b) => a.bulan - b.bulan);
  return (
    <Card title={`Kunci Transaksi Desa ${desa.nama}`}>
      <Alert style={{ marginBottom: 12 }} type="info" showIcon message="Kunci penutupan kas yang sudah dibuat desa agar tidak dapat dibuka kembali oleh desa (fitur 2.0.8 no. 12)." />
      <Table size="small" rowKey="id" pagination={false} dataSource={rows}
        columns={[
          { title: 'Bulan', dataIndex: 'bulan', render: (b: number) => BULAN[b - 1] },
          { title: 'Ditutup', render: (_, r: PenutupanKas) => `${r.oleh}, ${tglID(r.tgl)}` },
          { title: 'Status', dataIndex: 'dikunciKab', render: (v: boolean) => (v ? <Tag color="purple">Dikunci Kabupaten</Tag> : <Tag>Belum dikunci</Tag>) },
          {
            title: '', render: (_, r: PenutupanKas) => !readOnly && (r.dikunciKab
              ? <Button size="small" onClick={() => { setAlasan(''); setBuka(r.bulan); }}>Buka kunci</Button>
              : <Button size="small" type="primary" onClick={() => aksi(() => L.kunciPenutupan(sesi, r.bulan, true), 'Dikunci')}>Kunci</Button>),
          },
        ]} />
      {!rows.length && <Alert style={{ marginTop: 12 }} type="warning" message="Desa belum melakukan penutupan kas." />}
      <Modal open={buka !== null} title="Buka kunci penutupan kas" onCancel={() => setBuka(null)} okText="Buka kunci"
        onOk={async () => { const r = await aksi(() => L.kunciPenutupan(sesi, buka!, false, alasan), 'Kunci dibuka'); if (r !== undefined) setBuka(null); }}>
        <Input.TextArea rows={3} placeholder="Alasan (dicatat di jejak audit)" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
      </Modal>
    </Card>
  );
}
