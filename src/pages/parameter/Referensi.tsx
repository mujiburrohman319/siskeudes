import { Tabs, Tag } from 'antd';
import { CrudPage } from '../../components/CrudPage';
import { useApp } from '../../context/App';
import { cmpKode } from '../../lib/keuangan';
import { P } from '../../lib/paths';
import { store } from '../../lib/store';
import type { RefAkun, RefKegiatan, RefSumberDana } from '../../lib/types';

const levelAkun = (k: string) => {
  const n = k.split('.').length;
  return n === 1 ? 'AKUN' : n === 2 ? 'KELOMPOK' : n === 3 ? 'JENIS' : 'OBJEK';
};
const levelKeg = (k: string) => {
  const n = k.split('.').length;
  return n === 1 ? 'BIDANG' : n === 2 ? 'SUBBIDANG' : 'KEGIATAN';
};

export default function Referensi() {
  const { pemda, isKab, readOnly } = useApp();
  if (!pemda) return null;
  const ro = !isKab || readOnly;
  const indent = (kode: string, nama: string) => <span style={{ paddingLeft: (kode.split('.').length - 1) * 14, fontWeight: kode.split('.').length < 3 ? 600 : undefined }}>{nama}</span>;
  return (
    <Tabs items={[
      {
        key: 'akun', label: 'Kode Rekening (Lampiran A.2)', children: (
          <CrudPage<RefAkun> title="Kode Rekening" menuKey="referensi" col={P.refAkun(pemda.id)} readOnly={ro}
            sort={(a, b) => cmpKode(a.kode, b.kode)} idFrom={(v) => v.kode!}
            deskripsi="Daftar awal adalah contoh mengikuti pola Permendagri 20/2018. Admin Kabupaten wajib mencocokkan dengan lampiran resmi dan perubahannya. Hanya level Objek (4 segmen) yang dapat dipakai di anggaran."
            onSave={async (v, e) => { await store.set(`${P.refAkun(pemda.id)}/${e?.id ?? v.kode}`, { kode: v.kode, nama: v.nama, level: levelAkun(v.kode!) }); }}
            fields={[
              { name: 'kode', label: 'Kode', required: true, width: 120 },
              { name: 'nama', label: 'Uraian', required: true, render: (v, r) => indent(r.kode, v as string) },
              { name: 'level', label: 'Level', form: false, width: 110, render: (v) => <Tag>{v as string}</Tag> },
            ]} />
        ),
      },
      {
        key: 'keg', label: 'Bidang & Kegiatan (Lampiran A.1)', children: (
          <CrudPage<RefKegiatan> title="Bidang/Kegiatan" menuKey="referensi" col={P.refKegiatan(pemda.id)} readOnly={ro}
            sort={(a, b) => cmpKode(a.kode, b.kode)} idFrom={(v) => v.kode!}
            onSave={async (v, e) => { await store.set(`${P.refKegiatan(pemda.id)}/${e?.id ?? v.kode}`, { kode: v.kode, nama: v.nama, level: levelKeg(v.kode!) }); }}
            fields={[
              { name: 'kode', label: 'Kode', required: true, width: 100 },
              { name: 'nama', label: 'Uraian', required: true, render: (v, r) => indent(r.kode, v as string) },
              { name: 'level', label: 'Level', form: false, width: 110, render: (v) => <Tag>{v as string}</Tag> },
            ]} />
        ),
      },
      {
        key: 'sd', label: 'Sumber Dana', children: (
          <CrudPage<RefSumberDana> title="Sumber Dana" menuKey="referensi" col={P.refSumberDana(pemda.id)} readOnly={ro}
            sort={(a, b) => a.kode.localeCompare(b.kode)} idFrom={(v) => v.kode!}
            fields={[
              { name: 'kode', label: 'Kode', required: true, width: 90 },
              { name: 'nama', label: 'Nama', required: true },
              { name: 'kdRekPendapatan', label: 'Rekening Pendapatan Terkait', width: 200 },
            ]} />
        ),
      },
    ]} />
  );
}
