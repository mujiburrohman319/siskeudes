import { CrudPage } from '../../components/CrudPage';
import { useApp } from '../../context/App';
import { desaCol } from '../../lib/paths';
import type { Perangkat, RekeningBank } from '../../lib/types';

export const JABATAN = ['Kepala Desa', 'Sekretaris Desa', 'Kaur Keuangan', 'Kaur Umum dan Perencanaan', 'Kaur Tata Usaha dan Umum', 'Kasi Pemerintahan', 'Kasi Kesejahteraan', 'Kasi Pelayanan', 'Kepala Dusun', 'Ketua BPD', 'Anggota BPD', 'Ketua RT', 'Ketua RW', 'Staf'];

export default function PerangkatPage() {
  const { ctx } = useApp();
  if (!ctx) return null;
  return (
    <>
      <CrudPage<RekeningBank> title="Rekening Bank Desa" menuKey="perangkat" col={desaCol(ctx, 'rekeningBank')}
        deskripsi="Rekening kas desa. Pengguna desa tidak perlu memilih desa lagi (fitur 2.0.8 no. 6)."
        fields={[
          { name: 'bank', label: 'Nama Bank', required: true },
          { name: 'noRekening', label: 'Nomor Rekening', required: true },
          { name: 'atasNama', label: 'Atas Nama', required: true },
          { name: 'utama', label: 'Rekening Kas Desa Utama', type: 'switch' },
        ]} />
      <CrudPage<Perangkat> title="Perangkat Desa" menuKey="perangkat" col={desaCol(ctx, 'perangkat')}
        deskripsi="Dipakai untuk pelaksana kegiatan, SPP, dan daftar nominatif Siltap/tunjangan (fitur 2.0.8 no. 5)."
        sort={(a, b) => JABATAN.indexOf(a.jabatan) - JABATAN.indexOf(b.jabatan)}
        fields={[
          { name: 'nama', label: 'Nama', required: true },
          { name: 'jabatan', label: 'Jabatan', type: 'select', required: true, options: JABATAN.map((j) => ({ value: j, label: j })) },
          { name: 'nik', label: 'NIK', table: false },
          { name: 'npwp', label: 'NPWP' },
          { name: 'bank', label: 'Bank', table: false },
          { name: 'noRekening', label: 'No. Rekening' },
          { name: 'siltap', label: 'Siltap/bulan', type: 'money' },
          { name: 'tunjangan', label: 'Tunjangan/bulan', type: 'money' },
          { name: 'pelaksana', label: 'Pelaksana Kegiatan', type: 'switch' },
        ]} />
    </>
  );
}
