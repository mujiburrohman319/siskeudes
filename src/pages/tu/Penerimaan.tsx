import { Card, Table } from 'antd';
import { useMemo } from 'react';
import { CrudPage } from '../../components/CrudPage';
import { AkunSelect, KasSelect, SumberDanaSelect, Uang } from '../../components/Input';
import { useApp } from '../../context/App';
import { hariIni } from '../../lib/format';
import { cmpKode } from '../../lib/keuangan';
import * as L from '../../lib/layanan';
import { taCol } from '../../lib/paths';
import { useAnggaran } from '../../lib/useTa';
import type { Penerimaan } from '../../lib/types';
import { useTa } from '../../lib/useTa';

export default function PenerimaanPage() {
  const { ctx, sesi, akunMap } = useApp();
  const { posting } = useAnggaran();
  const { data: terima } = useTa<Penerimaan>('penerimaan');
  const rekTerima = useMemo(() => [...new Set((posting?.rincian ?? []).filter((r) => r.kelompok === 'PENDAPATAN' || r.kelompok === 'PEMBIAYAAN1').map((r) => r.kdRek))], [posting]);
  const target = useMemo(() => {
    const m = new Map<string, { kode: string; sd: string; anggaran: number; realisasi: number }>();
    for (const r of posting?.rincian ?? []) {
      if (r.kelompok !== 'PENDAPATAN' && r.kelompok !== 'PEMBIAYAAN1') continue;
      m.set(`${r.kdRek}|${r.sumberDana}`, { kode: r.kdRek, sd: r.sumberDana, anggaran: r.nilai, realisasi: 0 });
    }
    for (const t of terima) {
      const x = m.get(`${t.kdRek}|${t.sumberDana}`);
      if (x) x.realisasi += t.nilai;
    }
    return [...m.values()].sort((a, b) => cmpKode(a.kode, b.kode));
  }, [posting, terima]);
  if (!ctx) return null;
  return (
    <>
      <CrudPage<Penerimaan> title="Penerimaan Desa (Pendapatan & Penerimaan Pembiayaan)" menuKey="penerimaan" col={taCol(ctx, 'penerimaan')}
        deskripsi="Penerimaan dicatat ke Buku Kas Umum dan Buku Pembantu Bank/Tunai. Penerimaan SiLPA (6.1.1.01) hanya mencatat realisasi, karena kasnya sudah ada di saldo awal."
        defaults={{ tgl: hariIni(), kas: 'BANK' }}
        sort={(a, b) => b.tgl.localeCompare(a.tgl) || b.noBukti.localeCompare(a.noBukti)}
        onSave={async (v, e) => { await L.simpanPenerimaan(sesi!, { ...(e ?? {}), ...(v as Penerimaan), id: e?.id }); }}
        onDelete={(r) => L.hapusTransaksi(sesi!, 'penerimaan', r.id)}
        fields={[
          { name: 'noBukti', label: 'No. Bukti (TBP)', width: 130, help: 'Kosongkan untuk penomoran otomatis' },
          { name: 'tgl', label: 'Tanggal', type: 'date', required: true, width: 100 },
          { name: 'kdRek', label: 'Rekening', required: true, input: <AkunSelect pilihan={rekTerima} />, render: (v) => `${v} ${akunMap.get(v as string) ?? ''}` },
          { name: 'sumberDana', label: 'Sumber Dana', required: true, width: 90, input: <SumberDanaSelect /> },
          { name: 'uraian', label: 'Uraian', required: true },
          { name: 'penyetor', label: 'Penyetor', table: false },
          { name: 'kas', label: 'Kas', required: true, width: 80, input: <KasSelect />, render: (v) => (v === 'BANK' ? 'Bank' : 'Tunai') },
          { name: 'nilai', label: 'Nilai', type: 'money', required: true },
          { name: 'lampiranUrl', label: 'Tautan Bukti', table: false },
        ]} />
      <Card title="Target dan Realisasi Penerimaan">
        <Table size="small" pagination={false} rowKey={(r) => r.kode + r.sd} dataSource={target}
          columns={[
            { title: 'Rekening', dataIndex: 'kode', render: (k: string) => `${k} ${akunMap.get(k) ?? ''}` },
            { title: 'Sumber', dataIndex: 'sd' },
            { title: 'Anggaran', dataIndex: 'anggaran', align: 'right', render: (v: number) => <Uang v={v} /> },
            { title: 'Realisasi', dataIndex: 'realisasi', align: 'right', render: (v: number) => <Uang v={v} /> },
            { title: 'Sisa', align: 'right', render: (_, r) => <Uang v={r.anggaran - r.realisasi} /> },
          ]} />
      </Card>
    </>
  );
}
