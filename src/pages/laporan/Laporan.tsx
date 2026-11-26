import { FileExcelOutlined, FilePdfOutlined, EyeOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, Empty, Form, List, Row, Select, Space, Spin, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useAksi, useApp } from '../../context/App';
import { BULAN, rp } from '../../lib/format';
import { ambilData } from '../../lib/laporan/data';
import { DAFTAR_LAPORAN, buatLaporan, type ParamLap } from '../../lib/laporan/generator';
import type { Laporan } from '../../lib/laporan/model';
import { useTa } from '../../lib/useTa';
import type { KegiatanAnggaran, Spp } from '../../lib/types';

function Pratinjau({ l }: { l: Laporan }) {
  return (
    <div style={{ background: '#fff', padding: 24, border: '1px solid #ddd', position: 'relative', overflowX: 'auto', fontSize: 12 }}>
      {l.draft && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', fontSize: 120, fontWeight: 700, color: 'rgba(0,0,0,0.06)', transform: 'rotate(-30deg)' }}>DRAFT</div>}
      <div style={{ textAlign: 'center', fontWeight: 700 }}>PEMERINTAH {l.kop.pemda.toUpperCase()}</div>
      <div style={{ textAlign: 'center', fontWeight: 700 }}>KECAMATAN {l.kop.kecamatan.toUpperCase()} — DESA {l.kop.desa.toUpperCase()}</div>
      <hr />
      {l.judul.map((j, i) => <div key={i} style={{ textAlign: 'center', fontWeight: i ? 400 : 700, fontSize: i ? 12 : 14 }}>{j}</div>)}
      <div style={{ height: 12 }} />
      {l.blok.map((b, bi) => {
        if (b.jenis === 'teks') return <p key={bi} style={{ fontWeight: b.tebal ? 700 : 400, fontStyle: b.miring ? 'italic' : undefined, textAlign: b.rata === 'tengah' ? 'center' : b.rata === 'kanan' ? 'right' : 'left' }}>{b.teks}</p>;
        if (b.jenis === 'garis') return <hr key={bi} style={{ borderStyle: 'dashed' }} />;
        if (b.jenis === 'halaman') return <div key={bi} style={{ borderTop: '2px dotted #bbb', margin: '24px 0' }} />;
        if (b.jenis === 'kv') return (
          <table key={bi} style={{ marginBottom: 8 }}><tbody>{b.pasangan.map(([k, v]) => <tr key={k}><td style={{ paddingRight: 8, verticalAlign: 'top', whiteSpace: 'nowrap' }}>{k}</td><td style={{ verticalAlign: 'top' }}>:</td><td style={{ paddingLeft: 6 }}>{v}</td></tr>)}</tbody></table>
        );
        if (b.jenis === 'ttd') return (
          <div key={bi} style={{ display: 'flex', marginTop: 16 }}>{b.kolom.map((t, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div>{i === b.kolom.length - 1 ? b.tempatTgl : ' '}</div><div>{t.atas ?? ' '}</div><div style={{ fontWeight: 700 }}>{t.jabatan}</div>
              <div style={{ height: 48 }} /><div style={{ fontWeight: 700, textDecoration: t.nama ? 'underline' : undefined }}>{t.nama ?? '(.................)'}</div>
            </div>
          ))}</div>
        );
        return (
          <div key={bi} style={{ marginBottom: 12 }}>
            {b.judul && <div style={{ fontWeight: 700, margin: '8px 0 4px' }}>{b.judul}</div>}
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead><tr>{b.kolom.map((k, i) => <th key={i} style={{ border: '1px solid #999', background: '#e8efe9', padding: '2px 4px' }}>{k.judul}</th>)}</tr></thead>
              <tbody>{b.baris.map((r, ri) => (
                <tr key={ri} style={{ fontWeight: r.tebal ? 700 : 400, background: r.latar ? '#f3f3f3' : undefined }}>
                  {b.kolom.map((k, i) => {
                    const v = r.sel[i];
                    return <td key={i} style={{ border: '1px solid #ccc', padding: '1px 4px', textAlign: k.rata === 'kanan' ? 'right' : k.rata === 'tengah' ? 'center' : 'left', paddingLeft: i === 1 && r.indent ? 4 + r.indent * 12 : 4, whiteSpace: k.uang ? 'nowrap' : undefined, fontVariantNumeric: 'tabular-nums' }}>
                      {v === null || v === undefined ? '' : k.uang && typeof v === 'number' ? rp(v) : String(v)}
                    </td>;
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export default function LaporanPage() {
  const { ctx, desa, konfig, hak, kegiatanMap } = useApp();
  const aksi = useAksi();
  const [kode, setKode] = useState('lra');
  const [param, setParam] = useState<ParamLap>({ bulan: new Date().getMonth() + 1, semester: 1 });
  const [lap, setLap] = useState<Laporan | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: spp } = useTa<Spp>('spp');
  const { data: kegiatan } = useTa<KegiatanAnggaran>('kegiatan');
  const def = DAFTAR_LAPORAN.find((d) => d.kode === kode)!;
  const grup = useMemo(() => [...new Set(DAFTAR_LAPORAN.map((d) => d.grup))], []);

  const susun = async () => {
    setBusy(true);
    const l = await aksi(async () => buatLaporan(kode, await ambilData(ctx!, desa!, konfig), param));
    setBusy(false);
    if (l) setLap(l);
    return l;
  };
  const unduh = async (fmt: 'pdf' | 'xlsx') => {
    const l = lap?.kode === kode ? lap : await susun();
    if (!l) return;
    await aksi(async () => {
      if (fmt === 'pdf') { const { unduhPdf } = await import('../../lib/laporan/pdf'); await unduhPdf(l, konfig.kertas); }
      else { const { unduhExcel } = await import('../../lib/laporan/excel'); await unduhExcel(l); }
    });
  };

  if (!ctx || !desa) return null;
  return (
    <Row gutter={16}>
      <Col xs={24} lg={7}>
        <Card title="Daftar Laporan" styles={{ body: { padding: 0, maxHeight: '75vh', overflow: 'auto' } }}>
          {grup.map((g) => (
            <div key={g}>
              <Typography.Text strong style={{ display: 'block', padding: '8px 16px', background: '#f6f8f7' }}>{g}</Typography.Text>
              <List size="small" dataSource={DAFTAR_LAPORAN.filter((d) => d.grup === g)} renderItem={(d) => (
                <List.Item onClick={() => { setKode(d.kode); setLap(null); }} style={{ cursor: 'pointer', paddingLeft: 24, background: d.kode === kode ? '#e6f4ea' : undefined }}>{d.nama}</List.Item>
              )} />
            </div>
          ))}
        </Card>
      </Col>
      <Col xs={24} lg={17}>
        <Card title={def.nama} extra={
          <Space>
            <Button icon={<EyeOutlined />} onClick={susun} loading={busy}>Pratinjau</Button>
            {hak('laporan', 'cetak') && <Button type="primary" icon={<FilePdfOutlined />} onClick={() => unduh('pdf')}>PDF ({konfig.kertas})</Button>}
            {hak('laporan', 'cetak') && <Button icon={<FileExcelOutlined />} onClick={() => unduh('xlsx')}>Excel</Button>}
          </Space>
        }>
          <Form layout="inline" style={{ marginBottom: 12 }}>
            {def.param?.includes('bulan') && <Form.Item label="s.d. bulan"><Select style={{ width: 140 }} value={param.bulan} onChange={(v) => setParam({ ...param, bulan: v })} options={BULAN.map((b, i) => ({ value: i + 1, label: b }))} /></Form.Item>}
            {def.param?.includes('semester') && <Form.Item label="Periode"><Select style={{ width: 200 }} value={param.semester} onChange={(v) => setParam({ ...param, semester: v })} options={[{ value: 1, label: 'Semester I (Jan–Jun)' }, { value: 2, label: 'Sampai Desember' }]} /></Form.Item>}
            {def.param?.includes('kegiatan') && <Form.Item label="Kegiatan"><Select allowClear style={{ width: 360 }} placeholder={kode === 'bukuKegiatan' ? 'Pilih kegiatan' : 'Semua kegiatan'} value={param.kdKeg} onChange={(v) => setParam({ ...param, kdKeg: v })} options={kegiatan.map((k) => ({ value: k.kdKeg, label: `${k.kdKeg} ${k.nama ?? kegiatanMap.get(k.kdKeg)}` }))} showSearch optionFilterProp="label" /></Form.Item>}
            {def.param?.includes('spp') && <Form.Item label="SPP"><Select style={{ width: 360 }} value={param.sppId} onChange={(v) => setParam({ ...param, sppId: v })} options={[...spp].sort((a, b) => b.noSpp.localeCompare(a.noSpp)).map((s) => ({ value: s.id, label: `${s.noSpp} — ${s.uraian}` }))} showSearch optionFilterProp="label" /></Form.Item>}
          </Form>
          {busy ? <Spin /> : lap && lap.kode === kode ? <Pratinjau l={lap} /> : <Empty description="Klik Pratinjau untuk menampilkan laporan" />}
          <Alert style={{ marginTop: 12 }} type="info" showIcon message="Laporan dari data yang belum final (SPP belum dicairkan, jurnal belum diposting, APBDes belum diposting) diberi watermark DRAFT." />
        </Card>
      </Col>
    </Row>
  );
}
