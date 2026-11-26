import { App, Button } from 'antd';
import { CrudPage } from '../../components/CrudPage';
import { AkunSelect, KegiatanSelect, SumberDanaSelect, Uang } from '../../components/Input';
import { useAksi, useApp } from '../../context/App';
import { sum, uid } from '../../lib/format';
import { taCol } from '../../lib/paths';
import { store } from '../../lib/store';
import { useDesaCol, useTa } from '../../lib/useTa';
import type { Perangkat, RkpKegiatan, RpjmKegiatan } from '../../lib/types';

export default function Rkp() {
  const { ctx, ta, kegiatanMap, akunMap, hak, readOnly } = useApp();
  const aksi = useAksi();
  const { message } = App.useApp();
  const { data: rpjm } = useDesaCol<RpjmKegiatan>('rpjm');
  const { data: rkp } = useTa<RkpKegiatan>('rkp');
  const { data: perangkat } = useDesaCol<Perangkat>('perangkat');
  if (!ctx) return null;

  const ambil = async () => {
    const n = await aksi(async () => {
    const sudah = new Set(rkp.map((r) => r.rpjmId));
    const baru = rpjm.filter((r) => r.tahun?.includes(ta) && !sudah.has(r.id));
    await store.write(baru.map((r) => {
      const id = uid('k');
      return {
        type: 'set' as const, path: `${taCol(ctx, 'rkp')}/${id}`,
        data: { rpjmId: r.id, jenis: r.jenis, kdKeg: r.kdKeg, kdRek: r.kdRek, uraian: r.uraian, lokasi: r.lokasi, volume: r.volume, sasaran: r.sasaran, biaya: r.biaya, sumberDana: r.sumberDana, pola: 'SWAKELOLA', prioritas: 1 },
      };
    }));
    return baru.length;
    });
    if (n !== undefined) message.info(`${n} kegiatan/pembiayaan ditarik dari RPJMDes ${ta}.`);
  };

  const pelaksana = perangkat.filter((p) => p.pelaksana).map((p) => ({ value: `${p.jabatan} - ${p.nama}`, label: `${p.jabatan} - ${p.nama}` }));
  return (
    <CrudPage<RkpKegiatan> title={`RKP Desa Tahun ${ta}`} menuKey="rkp" col={taCol(ctx, 'rkp')} modalWidth={760}
      toolbar={!readOnly && hak('rkp', 'tambah') && <Button onClick={ambil}>Ambil dari RPJMDes {ta}</Button>}
      defaults={{ jenis: 'KEGIATAN', pola: 'SWAKELOLA', prioritas: 1 }}
      sort={(a, b) => (a.kdKeg ?? a.kdRek ?? '').localeCompare(b.kdKeg ?? b.kdRek ?? '')}
      summary={(rows) => <tr><td colSpan={4} style={{ textAlign: 'right', fontWeight: 600, padding: 8 }}>Jumlah</td><td style={{ textAlign: 'right', padding: 8 }}><Uang v={sum(rows, (r) => r.biaya)} tebal /></td><td colSpan={4} /></tr>}
      fields={[
        { name: 'jenis', label: 'Jenis', type: 'select', required: true, width: 110, options: [{ value: 'KEGIATAN', label: 'Kegiatan' }, { value: 'PEMBIAYAAN', label: 'Pengeluaran Pembiayaan' }] },
        { name: 'kdKeg', label: 'Kegiatan', input: <KegiatanSelect allowClear />, render: (v) => (v ? `${v} ${kegiatanMap.get(v as string) ?? ''}` : '') },
        { name: 'kdRek', label: 'Rekening Pembiayaan', input: <AkunSelect prefix="6.2" allowClear />, render: (v) => (v ? `${v} ${akunMap.get(v as string) ?? ''}` : '') },
        { name: 'uraian', label: 'Uraian', required: true },
        { name: 'biaya', label: 'Pagu', type: 'money', required: true },
        { name: 'sumberDana', label: 'Sumber Dana', input: <SumberDanaSelect /> },
        { name: 'pola', label: 'Pola Pelaksanaan', type: 'select', options: [{ value: 'SWAKELOLA', label: 'Swakelola' }, { value: 'KERJASAMA', label: 'Kerja sama antar desa' }, { value: 'PIHAK_KETIGA', label: 'Kerja sama pihak ketiga' }] },
        { name: 'pelaksana', label: 'Pelaksana', type: 'select', options: pelaksana },
        { name: 'prioritas', label: 'Prioritas', type: 'number', width: 90 },
        { name: 'lokasi', label: 'Lokasi', table: false },
        { name: 'volume', label: 'Volume', table: false },
        { name: 'sasaran', label: 'Sasaran', table: false },
      ]} />
  );
}
