import { App, Button } from 'antd';
import { useMemo } from 'react';
import { CrudPage } from '../../components/CrudPage';
import { KegiatanSelect, Uang } from '../../components/Input';
import { useAksi, useApp } from '../../context/App';
import { cmpKode } from '../../lib/keuangan';
import { taCol, taDoc } from '../../lib/paths';
import { store } from '../../lib/store';
import { useDesaCol, useTa } from '../../lib/useTa';
import type { KegiatanAnggaran, Perangkat, RincianAnggaran, RkpKegiatan } from '../../lib/types';

export default function Kegiatan() {
  const { ctx, kegiatanMap, hak, readOnly } = useApp();
  const aksi = useAksi();
  const { message } = App.useApp();
  const { data: rkp } = useTa<RkpKegiatan>('rkp');
  const { data: keg } = useTa<KegiatanAnggaran>('kegiatan');
  const { data: rincian } = useTa<RincianAnggaran>('rincian');
  const { data: perangkat } = useDesaCol<Perangkat>('perangkat');
  const pagu = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rincian) if (r.kdKeg) m.set(r.kdKeg, (m.get(r.kdKeg) ?? 0) + r.nilai);
    return m;
  }, [rincian]);
  if (!ctx) return null;

  const ambil = async () => {
    const ada = new Set(keg.map((k) => k.kdKeg));
    const baru = rkp.filter((r) => r.jenis === 'KEGIATAN' && r.kdKeg && !ada.has(r.kdKeg));
    const n = await aksi(async () => {
      await store.write(baru.map((r) => ({
        type: 'set' as const, path: taDoc(ctx, 'kegiatan', r.kdKeg!),
        data: { kdKeg: r.kdKeg, nama: kegiatanMap.get(r.kdKeg!) ?? r.uraian, pelaksana: r.pelaksana, lokasi: r.lokasi, keluaran: r.volume },
      })));
      return baru.length;
    });
    if (n !== undefined) message.info(`${n} kegiatan ditarik dari RKPDes.`);
  };

  const opsiPelaksana = perangkat.filter((p) => p.pelaksana).map((p) => ({ value: `${p.jabatan} - ${p.nama}`, label: `${p.jabatan} - ${p.nama}` }));
  return (
    <CrudPage<KegiatanAnggaran> title="Kegiatan APBDes" menuKey="kegiatan" col={taCol(ctx, 'kegiatan')}
      sort={(a, b) => cmpKode(a.kdKeg, b.kdKeg)}
      toolbar={!readOnly && hak('kegiatan', 'tambah') && <Button onClick={ambil}>Ambil dari RKPDes</Button>}
      onSave={async (v, e) => {
        const kd = (e?.kdKeg ?? v.kdKeg)!;
        await store.set(taDoc(ctx, 'kegiatan', kd), { ...e, ...v, kdKeg: kd, nama: kegiatanMap.get(kd) ?? v.nama });
      }}
      onDelete={async (row) => {
        if (rincian.some((r) => r.kdKeg === row.kdKeg)) throw new Error('Hapus dulu rincian anggaran kegiatan ini.');
        await store.remove(taDoc(ctx, 'kegiatan', row.id));
      }}
      fields={[
        { name: 'kdKeg', label: 'Kode', required: true, width: 90, input: <KegiatanSelect /> },
        { name: 'nama', label: 'Nama Kegiatan', form: false },
        { name: 'pelaksana', label: 'Pelaksana Kegiatan', type: 'select', options: opsiPelaksana, help: 'Daftar dari Data Umum Desa > Pelaksana Kegiatan' },
        { name: 'lokasi', label: 'Lokasi' },
        { name: 'waktu', label: 'Waktu Pelaksanaan', table: false },
        { name: 'keluaran', label: 'Keluaran/Output' },
        { name: 'id', label: 'Pagu', form: false, render: (_, r) => <Uang v={pagu.get(r.kdKeg)} /> },
      ]} />
  );
}
