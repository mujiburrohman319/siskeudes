import { Alert, Button, Card, Col, Descriptions, Form, Input, Progress, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Uang } from '../components/Input';
import { useAksi, useApp } from '../context/App';
import { P } from '../lib/paths';
import { konfigurasiDefault, seedReferensi } from '../lib/seed';
import { store } from '../lib/store';
import { BULAN, sum } from '../lib/format';
import { saldoKas, saldoPajak, saldoPanjar, statusKegiatanWajib } from '../lib/keuangan';
import { useAnggaran, useSaldoAwal, useTa } from '../lib/useTa';
import type { Ledger, PenutupanKas, RincianAnggaran, Spp } from '../lib/types';

function BerandaDesa() {
  const { desa, konfig, ta, kegiatanMap } = useApp();
  const { posting } = useAnggaran();
  const { data: ledger } = useTa<Ledger>('ledger');
  const { data: spp } = useTa<Spp>('spp');
  const { data: tutup } = useTa<PenutupanKas>('penutupanKas');
  const { data: rincian } = useTa<RincianAnggaran>('rincian');
  const { data: awal } = useSaldoAwal();

  const kas = saldoKas(ledger, awal);
  const pajak = saldoPajak(ledger);
  const real = useMemo(() => ({
    pendapatan: sum(ledger.filter((l) => l.kdRek?.startsWith('4')), (l) => l.realisasi ?? 0),
    belanja: sum(ledger.filter((l) => l.kdRek?.startsWith('5')), (l) => l.realisasi ?? 0),
  }), [ledger]);
  const t = posting?.total;
  const bulanTutup = tutup.length ? Math.max(...tutup.map((x) => x.bulan)) : 0;
  const wajib = statusKegiatanWajib(rincian, konfig.kegiatanWajib);
  const antre = (s: Spp['status']) => spp.filter((x) => x.status === s).length;

  return (
    <>
      <Typography.Title level={4} style={{ margin: 0 }}>Desa {desa?.nama} — Tahun Anggaran {ta}</Typography.Title>
      {!posting && <Alert type="warning" showIcon message="APBDes belum diposting" description={<>Lengkapi <Link to="/anggaran/rincian">Isian Data Anggaran</Link> dan <Link to="/anggaran/rak">RAK</Link>, lalu lakukan <Link to="/anggaran/posting">Posting APBDes</Link>.</>} />}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}><Card><Statistic title="Anggaran Pendapatan" value={t?.pendapatan ?? 0} formatter={(v) => <Uang v={Number(v)} />} />
          <Progress percent={t?.pendapatan ? Math.round((real.pendapatan / t.pendapatan) * 100) : 0} size="small" /><Typography.Text type="secondary">Realisasi <Uang v={real.pendapatan} /></Typography.Text></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Statistic title="Anggaran Belanja" value={t?.belanja ?? 0} formatter={(v) => <Uang v={Number(v)} />} />
          <Progress percent={t?.belanja ? Math.round((real.belanja / t.belanja) * 100) : 0} size="small" /><Typography.Text type="secondary">Realisasi <Uang v={real.belanja} /></Typography.Text></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Statistic title="Saldo Kas di Bank" value={kas.BANK} formatter={(v) => <Uang v={Number(v)} />} /><Typography.Text type="secondary">Kas tunai <Uang v={kas.TUNAI} /></Typography.Text></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Statistic title="Pajak belum disetor" value={sum(Object.values(pajak), (x) => x)} formatter={(v) => <Uang v={Number(v)} />} /><Typography.Text type="secondary">Panjar belum di-SPJ-kan <Uang v={saldoPanjar(ledger)} /></Typography.Text></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Status">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Posting terakhir">{posting ? <>{posting.jenis === 'AWAL' ? 'Awal Tahun' : posting.jenis === 'PERGESERAN' ? 'Pergeseran' : 'Perubahan'} (No. {posting.no}) — {posting.dasarHukum}</> : '-'}</Descriptions.Item>
              <Descriptions.Item label="Penutupan kas">{bulanTutup ? `sampai ${BULAN[bulanTutup - 1]}` : 'belum ada'}</Descriptions.Item>
              <Descriptions.Item label="SPP menunggu">
                <Space wrap size={4}><Tag>{antre('DRAFT')} draft / verifikasi</Tag><Tag color="blue">{antre('DIVERIFIKASI')} persetujuan Kades</Tag><Tag color="geekblue">{antre('DISETUJUI')} pencairan</Tag><Tag color="orange">{antre('DICAIRKAN')} panjar belum SPJ</Tag></Space>
              </Descriptions.Item>
              <Descriptions.Item label="Kontrol RAK">{konfig.kontrolRAK ? 'Aktif' : 'Tidak aktif'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Kegiatan wajib (dicek sebelum posting)">
            <Table size="small" pagination={false} rowKey="kdKeg" dataSource={wajib}
              columns={[
                { title: 'Kode', dataIndex: 'kdKeg', width: 90 },
                { title: 'Kegiatan', dataIndex: 'kdKeg', render: (k: string) => kegiatanMap.get(k) },
                { title: 'Status', dataIndex: 'sudah', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Sudah' : 'Belum'}</Tag> },
              ]} />
          </Card>
        </Col>
      </Row>
    </>
  );
}

/** Penyiapan pertama di mode Firebase: Super Admin membuat dokumen pemda + referensi. */
function SetupPemda() {
  const { profile, ta } = useApp();
  const aksi = useAksi();
  const pemdaId = profile!.pemdaId;
  const buat = (v: { nama: string; provinsi: string }) => aksi(async () => {
    await store.set(P.pemda(pemdaId), { nama: v.nama, provinsi: v.provinsi });
    await seedReferensi(store, pemdaId);
    await store.set(P.konfigurasi(pemdaId, ta), konfigurasiDefault());
  }, 'Pemda siap. Lanjutkan ke Parameter > Data Wilayah dan File > Pengaturan UserID.');
  return (
    <Card title={`Penyiapan Pemda "${pemdaId}"`}>
      <Typography.Paragraph>Dokumen pemda belum ada. Isi data di bawah untuk membuatnya beserta referensi kode rekening, kegiatan, dan sumber dana bawaan.</Typography.Paragraph>
      <Form layout="vertical" onFinish={buat} style={{ maxWidth: 480 }}>
        <Form.Item name="nama" label="Nama Pemda" rules={[{ required: true }]}><Input placeholder="Kabupaten Sambas" /></Form.Item>
        <Form.Item name="provinsi" label="Provinsi" rules={[{ required: true }]}><Input placeholder="Kalimantan Barat" /></Form.Item>
        <Button type="primary" htmlType="submit" disabled={profile?.role !== 'SUPERADMIN'}>Buat Pemda</Button>
        {profile?.role !== 'SUPERADMIN' && <Typography.Paragraph type="danger">Hanya Super Admin yang dapat membuat pemda.</Typography.Paragraph>}
      </Form>
    </Card>
  );
}

export default function Beranda() {
  const { desa, isKab, pemda, profile } = useApp();
  if (desa) return <BerandaDesa />;
  if (isKab && !pemda && profile?.pemdaId) return <SetupPemda />;
  return (
    <Card>
      <Typography.Title level={4}>Selamat datang di SISKEUDES-Web</Typography.Title>
      <Typography.Paragraph>{pemda?.nama}</Typography.Paragraph>
      {isKab ? (
        <Typography.Paragraph>Pilih desa di bagian atas untuk melihat atau mengentri data desa, atau buka <Link to="/tools/monitoring">Monitoring</Link> untuk ringkasan seluruh desa.</Typography.Paragraph>
      ) : (
        <Alert type="warning" message="Akun Anda belum terhubung ke desa. Hubungi Admin Kabupaten." />
      )}
    </Card>
  );
}
