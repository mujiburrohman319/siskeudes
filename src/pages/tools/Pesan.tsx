import { CrudPage } from '../../components/CrudPage';
import { useApp } from '../../context/App';
import { hariIni } from '../../lib/format';
import { P } from '../../lib/paths';
import { store } from '../../lib/store';
import type { Pesan } from '../../lib/types';

export default function PesanPage() {
  const { pemda, desaList, profile } = useApp();
  if (!pemda) return null;
  return (
    <CrudPage<Pesan> title="Pesan Teks ke Desa" menuKey="pesan" col={P.pesan(pemda.id)}
      deskripsi="Pesan tampil sebagai ikon lonceng di aplikasi desa. Gunakan hanya untuk koordinasi pengelolaan keuangan desa."
      defaults={{ tgl: hariIni(), untukDesa: 'ALL' }}
      sort={(a, b) => b.tgl.localeCompare(a.tgl)}
      onSave={async (v, e) => { const id = e?.id ?? `m${Date.now()}`; await store.set(`${P.pesan(pemda.id)}/${id}`, { ...e, ...v, oleh: profile?.nama }); }}
      fields={[
        { name: 'tgl', label: 'Tanggal', type: 'date', required: true, width: 100 },
        { name: 'untukDesa', label: 'Untuk', type: 'select', required: true, options: [{ value: 'ALL', label: 'Seluruh desa' }, ...desaList.map((d) => ({ value: d.id, label: d.nama }))] },
        { name: 'judul', label: 'Judul', required: true },
        { name: 'isi', label: 'Isi Pesan', type: 'textarea', required: true },
        { name: 'oleh', label: 'Pengirim', form: false },
      ]} />
  );
}
