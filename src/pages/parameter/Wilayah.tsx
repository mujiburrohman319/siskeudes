import { CrudPage } from '../../components/CrudPage';
import { useApp } from '../../context/App';
import { P } from '../../lib/paths';
import type { Desa, Kecamatan } from '../../lib/types';

export default function Wilayah() {
  const { pemda, kecamatan } = useApp();
  if (!pemda) return null;
  return (
    <>
      <CrudPage<Kecamatan> title="Kecamatan" menuKey="wilayah" col={P.kecamatan(pemda.id)}
        sort={(a, b) => a.kode.localeCompare(b.kode)}
        fields={[
          { name: 'kode', label: 'Kode', required: true, width: 120 },
          { name: 'nama', label: 'Nama Kecamatan', required: true },
        ]} />
      <CrudPage<Desa> title="Desa" menuKey="wilayah" col={P.desaCol(pemda.id)}
        sort={(a, b) => a.kode.localeCompare(b.kode)}
        deskripsi="Kode desa mengikuti kode wilayah Kemendagri (10 digit, mis. 61.01.01.2001)."
        fields={[
          { name: 'kode', label: 'Kode Desa', required: true, width: 150 },
          { name: 'nama', label: 'Nama Desa', required: true },
          { name: 'kecId', label: 'Kecamatan', type: 'select', required: true, options: kecamatan.map((k) => ({ value: k.id, label: k.nama })) },
        ]} />
    </>
  );
}
