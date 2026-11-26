import { Card, Table } from 'antd';
import { useMemo } from 'react';
import { CrudPage } from '../../components/CrudPage';
import { KasSelect, PAJAK_OPTIONS, Uang } from '../../components/Input';
import { useApp } from '../../context/App';
import { hariIni } from '../../lib/format';
import * as L from '../../lib/layanan';
import { taCol } from '../../lib/paths';
import { PAJAK_LABEL } from '../../lib/referensi';
import { useTa } from '../../lib/useTa';
import type { JenisPajak, Ledger, SetorPajak } from '../../lib/types';

export default function PajakPage() {
  const { ctx, sesi } = useApp();
  const { data: ledger } = useTa<Ledger>('ledger');
  const rekap = useMemo(() => (Object.keys(PAJAK_LABEL) as JenisPajak[]).map((j) => {
    const pungut = ledger.filter((l) => l.pajak === j && l.jenis === 'PUNGUT_PAJAK').reduce((t, l) => t + l.masuk, 0);
    const setor = ledger.filter((l) => l.pajak === j && l.jenis === 'SETOR_PAJAK').reduce((t, l) => t + l.keluar, 0);
    return { jenis: j, pungut, setor, saldo: pungut - setor };
  }), [ledger]);
  if (!ctx) return null;
  return (
    <>
      <Card title="Rekap Pajak">
        <Table size="small" pagination={false} rowKey="jenis" dataSource={rekap}
          columns={[
            { title: 'Jenis Pajak', dataIndex: 'jenis', render: (j: JenisPajak) => PAJAK_LABEL[j] },
            { title: 'Dipungut/Dipotong', dataIndex: 'pungut', align: 'right', render: (v: number) => <Uang v={v} /> },
            { title: 'Disetor', dataIndex: 'setor', align: 'right', render: (v: number) => <Uang v={v} /> },
            { title: 'Belum Disetor', dataIndex: 'saldo', align: 'right', render: (v: number) => <Uang v={v} tebal /> },
          ]} />
      </Card>
      <CrudPage<SetorPajak> title="Penyetoran Pajak" menuKey="pajak" col={taCol(ctx, 'setorPajak')} editable={false}
        deskripsi="Isi NTPN dan kode billing dari bukti setor. Ekspor XML bukti potong PPh Unifikasi untuk Coretax direncanakan di rilis R2."
        defaults={{ tgl: hariIni(), kas: 'BANK', jenis: 'PPN' }}
        sort={(a, b) => b.tgl.localeCompare(a.tgl)}
        onSave={async (v) => { await L.simpanSetorPajak(sesi!, v as SetorPajak); }}
        onDelete={(r) => L.hapusTransaksi(sesi!, 'setorPajak', r.id)}
        fields={[
          { name: 'noBukti', label: 'No. Bukti', width: 130, help: 'Kosongkan untuk penomoran otomatis' },
          { name: 'tgl', label: 'Tanggal', type: 'date', required: true },
          { name: 'jenis', label: 'Jenis Pajak', type: 'select', required: true, options: PAJAK_OPTIONS },
          { name: 'kodeBilling', label: 'Kode Billing' },
          { name: 'ntpn', label: 'NTPN' },
          { name: 'kas', label: 'Dari Kas', required: true, input: <KasSelect />, render: (v) => (v === 'BANK' ? 'Bank' : 'Tunai') },
          { name: 'nilai', label: 'Nilai', type: 'money', required: true },
          { name: 'lampiranUrl', label: 'Tautan Bukti', table: false },
        ]} />
    </>
  );
}
