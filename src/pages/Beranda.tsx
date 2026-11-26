import {
  ArrowRightOutlined, AuditOutlined, BankOutlined, CalendarOutlined, CheckCircleFilled, ClockCircleOutlined, DownloadOutlined,
  FileTextOutlined, LockOutlined, PlusOutlined, RiseOutlined, ShoppingCartOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Col, Descriptions, Form, Input, Progress, Row, Space, Table, Tag, Typography } from 'antd';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAksi, useApp } from '../context/App';
import { P } from '../lib/paths';
import { konfigurasiDefault, seedReferensi } from '../lib/seed';
import { store } from '../lib/store';
import { BULAN, rp, sum } from '../lib/format';
import { saldoKas, saldoPajak, saldoPanjar, statusKegiatanWajib } from '../lib/keuangan';
import { useAnggaran, useSaldoAwal, useTa } from '../lib/useTa';
import type { Ledger, PenutupanKas, RincianAnggaran, Spp } from '../lib/types';

function BerandaDesa() {
  const { desa, konfig, ta, kegiatanMap, profile } = useApp();
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

  const pct = (a: number, b?: number) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);
  const totalPajak = sum(Object.values(pajak), (x) => x);
  const jam = new Date().getHours();
  const sapa = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 19 ? 'Selamat sore' : 'Selamat malam';

  const kpi: { label: string; nilai: number; ikon: ReactNode; warna: string; latar: string; bawah: ReactNode }[] = [
    {
      label: 'Anggaran Pendapatan', nilai: t?.pendapatan ?? 0, ikon: <RiseOutlined />, warna: '#0f7a4d', latar: '#e7f6ee',
      bawah: <><Progress percent={pct(real.pendapatan, t?.pendapatan)} size="small" strokeColor="#0f7a4d" />Realisasi Rp {rp(real.pendapatan)}</>,
    },
    {
      label: 'Anggaran Belanja', nilai: t?.belanja ?? 0, ikon: <ShoppingCartOutlined />, warna: '#2563eb', latar: '#e8effd',
      bawah: <><Progress percent={pct(real.belanja, t?.belanja)} size="small" strokeColor="#2563eb" />Realisasi Rp {rp(real.belanja)}</>,
    },
    { label: 'Saldo Kas di Bank', nilai: kas.BANK, ikon: <BankOutlined />, warna: '#0891b2', latar: '#e3f5f9', bawah: <>Kas tunai <b>Rp {rp(kas.TUNAI)}</b></> },
    { label: 'Pajak belum disetor', nilai: totalPajak, ikon: <AuditOutlined />, warna: '#d97706', latar: '#fdf3e3', bawah: <>Panjar belum di-SPJ-kan <b>Rp {rp(saldoPanjar(ledger))}</b></> },
  ];

  const alur = [
    { label: 'Draft / verifikasi', n: antre('DRAFT'), warna: '#5d6b64' },
    { label: 'Menunggu Kades', n: antre('DIVERIFIKASI'), warna: '#2563eb' },
    { label: 'Siap dicairkan', n: antre('DISETUJUI'), warna: '#7c3aed' },
    { label: 'Panjar belum SPJ', n: antre('DICAIRKAN'), warna: '#d97706' },
  ];

  return (
    <>
      <div className="sk-hero">
        <div className="sk-hero-sapa">{sapa}, {profile?.nama?.split(' ')[0] ?? ''}</div>
        <h2>Desa {desa?.nama}</h2>
        <Space wrap size={[16, 8]} className="sk-hero-meta" style={{ display: 'flex' }}>
          <span><CalendarOutlined /> Tahun Anggaran {ta}</span>
          <span>{posting ? <><CheckCircleFilled style={{ color: '#6ee7b7' }} /> APBDes terposting</> : <><ClockCircleOutlined /> APBDes belum diposting</>}</span>
          <span><LockOutlined /> Kas ditutup {bulanTutup ? `s.d. ${BULAN[bulanTutup - 1]}` : '— belum ada'}</span>
        </Space>
        <Space wrap style={{ marginTop: 20, position: 'relative', zIndex: 1 }}>
          <Link to="/tu/spp"><Button type="primary" icon={<PlusOutlined />} style={{ background: '#fff', color: '#0a3d2a' }}>Buat SPP</Button></Link>
          <Link to="/tu/penerimaan"><Button icon={<DownloadOutlined />}>Penerimaan</Button></Link>
          <Link to="/laporan"><Button icon={<FileTextOutlined />}>Cetak Laporan</Button></Link>
        </Space>
      </div>

      {!posting && <Alert type="warning" showIcon message="APBDes belum diposting" description={<>Lengkapi <Link to="/anggaran/rincian">Isian Data Anggaran</Link> dan <Link to="/anggaran/rak">RAK</Link>, lalu lakukan <Link to="/anggaran/posting">Posting APBDes</Link>.</>} />}

      <Row gutter={[20, 20]}>
        {kpi.map((k) => (
          <Col key={k.label} xs={24} sm={12} xl={6}>
            <Card className="sk-kpi">
              <div className="sk-kpi-atas">
                <div>
                  <div className="sk-kpi-label">{k.label}</div>
                  <div className="sk-kpi-nilai"><small>Rp</small>{rp(k.nilai)}</div>
                </div>
                <span className="sk-kpi-ikon" style={{ color: k.warna, background: k.latar }}>{k.ikon}</span>
              </div>
              <div className="sk-kpi-bawah">{k.bawah}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card title="Alur SPP" extra={<Link to="/tu/spp">Lihat semua <ArrowRightOutlined /></Link>} style={{ height: '100%' }}>
            <div className="sk-alur">
              {alur.map((a) => (
                <div key={a.label} className="sk-alur-item">
                  <div className="sk-alur-angka" style={{ color: a.warna }}>{a.n}</div>
                  <div className="sk-alur-label">{a.label}</div>
                </div>
              ))}
            </div>
            <Descriptions column={1} size="small" style={{ marginTop: 20 }}>
              <Descriptions.Item label="Posting terakhir">{posting ? <>{posting.jenis === 'AWAL' ? 'Awal Tahun' : posting.jenis === 'PERGESERAN' ? 'Pergeseran' : 'Perubahan'} (No. {posting.no}) — {posting.dasarHukum}</> : '-'}</Descriptions.Item>
              <Descriptions.Item label="Penutupan kas">{bulanTutup ? `sampai ${BULAN[bulanTutup - 1]}` : 'belum ada'}</Descriptions.Item>
              <Descriptions.Item label="Kontrol RAK">{konfig.kontrolRAK ? <Tag color="green">Aktif</Tag> : <Tag>Tidak aktif</Tag>}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Kegiatan wajib" extra={<Typography.Text type="secondary" style={{ fontSize: 12 }}>dicek sebelum posting</Typography.Text>} style={{ height: '100%' }}>
            <Table size="small" pagination={false} rowKey="kdKeg" dataSource={wajib}
              columns={[
                { title: 'Kode', dataIndex: 'kdKeg', width: 90 },
                { title: 'Kegiatan', dataIndex: 'kdKeg', render: (k: string) => kegiatanMap.get(k) },
                { title: 'Status', dataIndex: 'sudah', render: (v: boolean) => (v ? <Tag icon={<CheckCircleFilled />} color="success">Sudah</Tag> : <Tag icon={<ClockCircleOutlined />} color="error">Belum</Tag>) },
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
