import { useMemo } from 'react';
import { CrudPage } from '../../components/CrudPage';
import { AkunSelect, KasSelect, KegiatanSelect, SumberDanaSelect } from '../../components/Input';
import { useApp } from '../../context/App';
import { hariIni } from '../../lib/format';
import * as L from '../../lib/layanan';
import { taCol } from '../../lib/paths';
import { useAnggaran, useTa } from '../../lib/useTa';
import type { KegiatanAnggaran, Pengembalian } from '../../lib/types';

export default function PengembalianPage() {
  const { ctx, sesi, akunMap } = useApp();
  const { posting } = useAnggaran();
  const { data: kegiatan } = useTa<KegiatanAnggaran>('kegiatan');
  const rekBelanja = useMemo(() => [...new Set((posting?.rincian ?? []).filter((r) => r.kelompok === 'BELANJA').map((r) => r.kdRek))], [posting]);
  if (!ctx) return null;
  return (
    <CrudPage<Pengembalian> title="Pengembalian Belanja" menuKey="pengembalian" col={taCol(ctx, 'pengembalian')} editable={false}
      deskripsi="Pengembalian belanja tahun berjalan (mis. kelebihan bayar) mengurangi realisasi dan menambah kas."
      defaults={{ tgl: hariIni(), kas: 'BANK' }}
      sort={(a, b) => b.tgl.localeCompare(a.tgl)}
      onSave={async (v) => { await L.simpanPengembalian(sesi!, v as Pengembalian); }}
      onDelete={(r) => L.hapusTransaksi(sesi!, 'pengembalian', r.id)}
      fields={[
        { name: 'noBukti', label: 'No. Bukti', form: false },
        { name: 'tgl', label: 'Tanggal', type: 'date', required: true },
        { name: 'kdKeg', label: 'Kegiatan', required: true, input: <KegiatanSelect pilihan={kegiatan.map((k) => ({ kode: k.kdKeg, nama: k.nama }))} /> },
        { name: 'kdRek', label: 'Rekening', required: true, input: <AkunSelect pilihan={rekBelanja} />, render: (v) => `${v} ${akunMap.get(v as string) ?? ''}` },
        { name: 'sumberDana', label: 'Sumber Dana', required: true, input: <SumberDanaSelect /> },
        { name: 'uraian', label: 'Uraian', required: true },
        { name: 'kas', label: 'Ke Kas', required: true, input: <KasSelect />, render: (v) => (v === 'BANK' ? 'Bank' : 'Tunai') },
        { name: 'nilai', label: 'Nilai', type: 'money', required: true },
        { name: 'lampiranUrl', label: 'Tautan Bukti', table: false },
      ]} />
  );
}
