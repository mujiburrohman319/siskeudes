import { Card, Progress, Select, Space, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { Uang } from '../../components/Input';
import { useApp } from '../../context/App';
import { BULAN, tglID } from '../../lib/format';
import { useCol } from '../../lib/hooks';
import { P } from '../../lib/paths';
import type { Monitoring } from '../../lib/types';

export default function MonitoringPage() {
  const { pemda, ta, desaList, kecamatan, setDesaId } = useApp();
  const { data } = useCol<Monitoring>(pemda ? P.monitoring(pemda.id) : null);
  const [kec, setKec] = useState<string | undefined>();
  const rows = useMemo(() => desaList.filter((d) => !kec || d.kecId === kec).map((d) => ({ desa: d, m: data.find((x) => x.id === `${ta}_${d.id}`) })), [desaList, data, ta, kec]);
  const sudahPosting = rows.filter((r) => r.m?.postingNo).length;
  const blnLalu = new Date().getMonth(); // bulan sebelumnya (1-12) yang seharusnya sudah ditutup
  const tertib = rows.filter((r) => (r.m?.bulanTutup ?? 0) >= blnLalu).length;
  return (
    <Card title={`Monitoring Desa — TA ${ta}`} extra={
      <Select allowClear placeholder="Semua kecamatan" style={{ width: 220 }} value={kec} onChange={setKec} options={kecamatan.map((k) => ({ value: k.id, label: k.nama }))} />
    }>
      <Space size={32} style={{ marginBottom: 16 }}>
        <div><div>Progres posting APBDes</div><Progress percent={rows.length ? Math.round((sudahPosting / rows.length) * 100) : 0} format={() => `${sudahPosting}/${rows.length}`} style={{ width: 260 }} /></div>
        <div><div>Penutupan kas s.d. bulan lalu</div><Progress percent={rows.length ? Math.round((tertib / rows.length) * 100) : 0} format={() => `${tertib}/${rows.length}`} style={{ width: 260 }} status="active" /></div>
      </Space>
      <Table size="small" rowKey={(r) => r.desa.id} dataSource={rows} pagination={{ pageSize: 50 }}
        onRow={(r) => ({ onDoubleClick: () => setDesaId(r.desa.id) })}
        columns={[
          { title: 'Kode', render: (_, r) => r.desa.kode, width: 120 },
          { title: 'Desa', render: (_, r) => r.desa.nama },
          { title: 'Kecamatan', render: (_, r) => kecamatan.find((k) => k.id === r.desa.kecId)?.nama },
          { title: 'Posting', render: (_, r) => (r.m?.postingNo ? <Tag color="green">{r.m.postingTerakhir} #{r.m.postingNo} ({tglID(r.m.postingTgl)})</Tag> : <Tag color="red">Belum</Tag>) },
          { title: 'Anggaran Belanja', align: 'right', render: (_, r) => <Uang v={r.m?.anggaranBelanja} /> },
          { title: 'Kas ditutup s.d.', render: (_, r) => (r.m?.bulanTutup ? <Tag color={r.m.bulanTutup >= blnLalu ? 'green' : 'orange'}>{BULAN[r.m.bulanTutup - 1]}</Tag> : <Tag color="red">Belum</Tag>) },
        ]} />
      <div style={{ color: '#888', fontSize: 12 }}>Klik dua kali baris untuk membuka desa. Di versi desktop fitur ini hanya untuk database SQL Server; di sini berlaku untuk semua desa.</div>
    </Card>
  );
}
