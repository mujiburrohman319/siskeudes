import { Button, Card, Col, Popconfirm, Row, Statistic, Table, Tag } from 'antd';
import { CrudPage } from '../../components/CrudPage';
import { KasSelect, Uang } from '../../components/Input';
import { useAksi, useApp } from '../../context/App';
import { BULAN, hariIni, tglID } from '../../lib/format';
import { saldoKas } from '../../lib/keuangan';
import * as L from '../../lib/layanan';
import { taCol } from '../../lib/paths';
import { useSaldoAwal, useTa } from '../../lib/useTa';
import type { Ledger, Mutasi, PenutupanKas } from '../../lib/types';

export default function MutasiPage() {
  const { ctx, sesi, hak, readOnly } = useApp();
  const aksi = useAksi();
  const { data: ledger } = useTa<Ledger>('ledger');
  const { data: tutup } = useTa<PenutupanKas>('penutupanKas');
  const { data: awal } = useSaldoAwal();
  if (!ctx) return null;
  const kas = saldoKas(ledger, awal);
  const maks = tutup.length ? Math.max(...tutup.map((t) => t.bulan)) : 0;
  const ro = readOnly || !hak('mutasi', 'ubah');
  const baris = BULAN.map((nama, i) => ({ bulan: i + 1, nama, t: tutup.find((x) => x.bulan === i + 1) }));
  return (
    <>
      <Row gutter={16}>
        <Col span={8}><Card><Statistic title="Saldo Kas di Bank" value={kas.BANK} formatter={(v) => <Uang v={Number(v)} />} /></Card></Col>
        <Col span={8}><Card><Statistic title="Saldo Kas Tunai" value={kas.TUNAI} formatter={(v) => <Uang v={Number(v)} />} /></Card></Col>
        <Col span={8}><Card><Statistic title="Jumlah Kas" value={kas.BANK + kas.TUNAI} formatter={(v) => <Uang v={Number(v)} />} /></Card></Col>
      </Row>
      <CrudPage<Mutasi> title="Mutasi Kas (Bank ↔ Tunai)" menuKey="mutasi" col={taCol(ctx, 'mutasi')} editable={false}
        defaults={{ tgl: hariIni(), dari: 'BANK', ke: 'TUNAI' }}
        sort={(a, b) => b.tgl.localeCompare(a.tgl)}
        onSave={async (v) => { await L.simpanMutasi(sesi!, v as Mutasi); }}
        onDelete={(r) => L.hapusTransaksi(sesi!, 'mutasi', r.id)}
        fields={[
          { name: 'noBukti', label: 'No. Bukti', form: false },
          { name: 'tgl', label: 'Tanggal', type: 'date', required: true },
          { name: 'dari', label: 'Dari', required: true, input: <KasSelect />, render: (v) => (v === 'BANK' ? 'Bank' : 'Tunai') },
          { name: 'ke', label: 'Ke', required: true, input: <KasSelect />, render: (v) => (v === 'BANK' ? 'Bank' : 'Tunai') },
          { name: 'uraian', label: 'Uraian', required: true },
          { name: 'nilai', label: 'Nilai', type: 'money', required: true },
        ]} />
      <Card title="Penutupan Kas Bulanan" extra={<span>Tutup kas setiap bulan agar transaksi bulan tersebut terkunci (fitur 2.0.8 no. 12).</span>}>
        <Table size="small" rowKey="bulan" pagination={false} dataSource={baris}
          columns={[
            { title: 'Bulan', dataIndex: 'nama' },
            { title: 'Status', render: (_, r) => (r.t ? <><Tag color="green">Ditutup</Tag>{r.t.dikunciKab && <Tag color="purple">Dikunci Kabupaten</Tag>}</> : <Tag>Terbuka</Tag>) },
            { title: 'Saldo Bank', align: 'right', render: (_, r) => (r.t ? <Uang v={r.t.saldoBank} /> : '') },
            { title: 'Saldo Tunai', align: 'right', render: (_, r) => (r.t ? <Uang v={r.t.saldoTunai} /> : '') },
            { title: 'Ditutup', render: (_, r) => (r.t ? `${r.t.oleh}, ${tglID(r.t.tgl)}` : '') },
            {
              title: '', render: (_, r) => !ro && (
                r.bulan === maks + 1 ? (
                  <Popconfirm title={`Tutup kas ${r.nama}?`} description="Transaksi bertanggal bulan ini tidak dapat diubah lagi." onConfirm={() => aksi(() => L.tutupKasBulanan(sesi!, r.bulan), 'Kas ditutup')}>
                    <Button size="small" type="primary">Tutup Kas</Button>
                  </Popconfirm>
                ) : r.bulan === maks && !r.t?.dikunciKab ? (
                  <Popconfirm title={`Buka kembali kas ${r.nama}?`} onConfirm={() => aksi(() => L.bukaTutupKas(sesi!, r.bulan), 'Penutupan dibuka')}>
                    <Button size="small">Buka</Button>
                  </Popconfirm>
                ) : null
              ),
            },
          ]} />
      </Card>
    </>
  );
}
