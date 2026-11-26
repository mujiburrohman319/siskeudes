import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Popconfirm, Space, Table, Typography, Upload } from 'antd';
import { useAksi, useApp } from '../../context/App';
import { tglID } from '../../lib/format';
import { P, type TaCol } from '../../lib/paths';
import { isiContohApbdes } from '../../lib/seed';
import { MODE_FIREBASE, store } from '../../lib/store';
import { resetLocal } from '../../lib/store/local';
import { useTa } from '../../lib/useTa';
import type { Audit } from '../../lib/types';

const KOLEKSI: TaCol[] = ['rkp', 'kegiatan', 'rincian', 'posting', 'spp', 'penerimaan', 'setorPajak', 'mutasi', 'pengembalian', 'penutupanKas', 'ledger', 'jurnal', 'saldoAwal', 'counter', 'audit'];

export default function BackupPage() {
  const { ctx, desa, isKab, profile, readOnly } = useApp();
  const aksi = useAksi();
  const { message } = App.useApp();
  const { data: audit } = useTa<Audit>('audit');

  const ekspor = () => aksi(async () => {
    const out: Record<string, unknown[]> = {};
    for (const c of KOLEKSI) out[c] = await store.list(`${P.ta(ctx!)}/${c}`);
    const blob = new Blob([JSON.stringify({ versi: 1, ctx, desa, dibuat: new Date().toISOString(), data: out }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_${desa!.kode}_${ctx!.ta}.json`;
    a.click();
  });

  const impor = (file: File) => {
    void aksi(async () => {
      const j = JSON.parse(await file.text()) as { data: Record<string, { id: string }[]> };
      const ops = Object.entries(j.data).flatMap(([c, rows]) => rows.map((r) => ({ type: 'set' as const, path: `${P.ta(ctx!)}/${c}/${r.id}`, data: r })));
      await store.write(ops);
      message.success(`${ops.length} dokumen dipulihkan.`);
    });
    return false;
  };

  if (!ctx || !desa) return <Alert type="info" showIcon message="Pilih desa terlebih dahulu." />;
  return (
    <>
      <Card title={`Backup Data Desa ${desa.nama} — TA ${ctx.ta}`}>
        <Space wrap>
          <Button icon={<DownloadOutlined />} onClick={ekspor}>Ekspor (JSON)</Button>
          {isKab && !readOnly && <Upload accept=".json" showUploadList={false} beforeUpload={impor}><Button icon={<UploadOutlined />}>Pulihkan dari file</Button></Upload>}
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>File backup berisi seluruh data anggaran dan penatausahaan desa untuk tahun terpilih. Pemulihan menimpa dokumen dengan ID yang sama.</Typography.Paragraph>
      </Card>
      <Card title="Data Simulasi / Praktikum">
        <Typography.Paragraph>Isi desa ini dengan APBDes contoh yang seimbang (Rp 1,23 miliar), lengkap dengan RAK, posting, dan beberapa transaksi, untuk latihan.</Typography.Paragraph>
        <Space wrap>
          {!readOnly && <Popconfirm title="Isi APBDes contoh ke desa ini?" description="Data contoh ditambahkan ke data yang ada." onConfirm={() => aksi(() => isiContohApbdes(store, ctx, profile?.nama ?? 'contoh', { posting: false }), 'Rancangan APBDes contoh dibuat. Lanjutkan ke menu Posting.')}>
            <Button>Isi rancangan APBDes contoh</Button>
          </Popconfirm>}
          {!readOnly && <Popconfirm title="Isi APBDes contoh + posting + transaksi?" onConfirm={() => aksi(() => isiContohApbdes(store, ctx, profile?.nama ?? 'contoh', { posting: true, transaksi: true }), 'Data contoh lengkap dibuat.')}>
            <Button type="primary">Isi contoh lengkap (posting + transaksi)</Button>
          </Popconfirm>}
          {!MODE_FIREBASE && <Popconfirm title="Hapus SEMUA data lokal di browser ini?" okButtonProps={{ danger: true }} onConfirm={() => { resetLocal(); location.reload(); }}>
            <Button danger>Reset seluruh data lokal</Button>
          </Popconfirm>}
        </Space>
      </Card>
      <Card title="Jejak Audit">
        <Table size="small" rowKey="id" dataSource={[...audit].sort((a, b) => b.waktu.localeCompare(a.waktu))} pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Waktu', dataIndex: 'waktu', render: (w: string) => `${tglID(w)} ${w.slice(11, 19)}` },
            { title: 'Oleh', dataIndex: 'oleh' },
            { title: 'Aksi', dataIndex: 'aksi' },
            { title: 'Ref', dataIndex: 'ref' },
            { title: 'Catatan', dataIndex: 'catatan' },
          ]} />
      </Card>
    </>
  );
}
