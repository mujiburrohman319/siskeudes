import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined, PlusOutlined, PrinterOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, Descriptions, Dropdown, Form, Input, Modal, Popconfirm, Row, Segmented, Select, Space, Table, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { BuktiEditor, type RekPilihan } from '../../components/BuktiEditor';
import { DateInput, KasSelect, MoneyInput, StatusTag, Uang } from '../../components/Input';
import { useAksi, useApp } from '../../context/App';
import { hariIni, sum, tglID } from '../../lib/format';
import { cmpKode, keyRinci, komitmenSpp, sisaPagu } from '../../lib/keuangan';
import * as L from '../../lib/layanan';
import { cetakLaporan } from '../../lib/laporan/cetak';
import { useAnggaran, useTa } from '../../lib/useTa';
import type { BuktiPengeluaran, JenisKas, JenisSpp, KegiatanAnggaran, Pengembalian, Spp, SppRincian, StatusSpp } from '../../lib/types';

const JENIS: Record<JenisSpp, string> = { PANJAR: 'Panjar', DEFINITIF: 'Definitif', PEMBIAYAAN: 'Pembiayaan' };

interface Draft {
  id?: string;
  tgl: string;
  jenis: JenisSpp;
  kdKeg?: string;
  uraian: string;
  kas: JenisKas;
  nilai: Record<string, number>; // key kdRek|sumberDana
  bukti: BuktiPengeluaran[];
}

function FormSpp({ draft, setDraft, spps, onClose }: { draft: Draft; setDraft: (d: Draft) => void; spps: Spp[]; onClose: () => void }) {
  const { sesi, konfig, akunMap, kegiatanMap } = useApp();
  const aksi = useAksi();
  const { posting } = useAnggaran();
  const { data: kegiatan } = useTa<KegiatanAnggaran>('kegiatan');
  const { data: pengembalian } = useTa<Pengembalian>('pengembalian');
  const kom = useMemo(() => komitmenSpp(spps, pengembalian, draft.id), [spps, pengembalian, draft.id]);
  const keg = draft.jenis === 'PEMBIAYAAN' ? undefined : draft.kdKeg;

  const barisAnggaran = useMemo(() => (posting?.rincian ?? [])
    .filter((r) => (draft.jenis === 'PEMBIAYAAN' ? r.kelompok === 'PEMBIAYAAN2' : r.kelompok === 'BELANJA' && r.kdKeg === draft.kdKeg))
    .sort((a, b) => cmpKode(a.kdRek, b.kdRek))
    .map((a) => {
      const sp = sisaPagu({ anggaran: a, komitmen: kom.get(keyRinci(keg, a.kdRek, a.sumberDana)) ?? 0, tglSpp: draft.tgl || hariIni(), kontrolRAK: konfig.kontrolRAK });
      return { ...a, key: `${a.kdRek}|${a.sumberDana}`, ...sp };
    }), [posting, draft.jenis, draft.kdKeg, draft.tgl, kom, keg, konfig.kontrolRAK]);

  const pilihan: RekPilihan[] = barisAnggaran.filter((b) => (draft.nilai[b.key] ?? 0) > 0).map((b) => ({ kdRek: b.kdRek, sumberDana: b.sumberDana }));
  const total = sum(Object.values(draft.nilai), (x) => x);
  const kegOpsi = kegiatan.filter((k) => posting?.rincian.some((r) => r.kdKeg === k.kdKeg)).sort((a, b) => cmpKode(a.kdKeg, b.kdKeg));

  const isiBuktiOtomatis = () => setDraft({
    ...draft,
    bukti: barisAnggaran.filter((b) => (draft.nilai[b.key] ?? 0) > 0).map((b, i) => ({
      id: `b${Date.now()}${i}`, noBukti: '', tgl: draft.tgl, penerima: '', uraian: akunMap.get(b.kdRek) ?? '', kdRek: b.kdRek, sumberDana: b.sumberDana, nilai: draft.nilai[b.key], pajak: [],
    })),
  });

  const simpan = async () => {
    const rincian: SppRincian[] = Object.entries(draft.nilai).filter(([, v]) => v > 0).map(([k, v]) => ({ kdRek: k.split('|')[0], sumberDana: k.split('|')[1], nilai: v }));
    const ok = await aksi(() => L.simpanSpp(sesi!, { id: draft.id, tgl: draft.tgl, jenis: draft.jenis, kdKeg: keg, uraian: draft.uraian, kas: draft.kas, rincian, bukti: draft.jenis === 'PANJAR' ? [] : draft.bukti }, konfig.kontrolRAK), 'SPP tersimpan sebagai Draft');
    if (ok) onClose();
  };

  return (
    <Modal open width={1100} title={draft.id ? 'Ubah SPP' : 'Buat SPP'} onCancel={onClose} onOk={simpan} okText="Simpan" cancelText="Batal" destroyOnClose>
      <Row gutter={12}>
        <Col span={8}><Typography.Text type="secondary">Jenis SPP</Typography.Text><Segmented block value={draft.jenis} onChange={(v) => setDraft({ ...draft, jenis: v as JenisSpp, nilai: {}, bukti: [] })} options={(Object.keys(JENIS) as JenisSpp[]).map((k) => ({ value: k, label: JENIS[k] }))} /></Col>
        <Col span={4}><Typography.Text type="secondary">Tanggal</Typography.Text><DateInput value={draft.tgl} onChange={(v) => setDraft({ ...draft, tgl: v })} /></Col>
        <Col span={4}><Typography.Text type="secondary">Dibayar dari</Typography.Text><KasSelect value={draft.kas} onChange={(v) => setDraft({ ...draft, kas: v as JenisKas })} /></Col>
        <Col span={8}><Typography.Text type="secondary">Uraian</Typography.Text><Input value={draft.uraian} onChange={(e) => setDraft({ ...draft, uraian: e.target.value })} /></Col>
        {draft.jenis !== 'PEMBIAYAAN' && (
          <Col span={24} style={{ marginTop: 8 }}><Typography.Text type="secondary">Kegiatan</Typography.Text>
            <Select style={{ width: '100%' }} showSearch optionFilterProp="label" value={draft.kdKeg} onChange={(v) => setDraft({ ...draft, kdKeg: v, nilai: {}, bukti: [] })}
              options={kegOpsi.map((k) => ({ value: k.kdKeg, label: `${k.kdKeg} ${k.nama ?? kegiatanMap.get(k.kdKeg)}` }))} />
          </Col>
        )}
      </Row>
      <Typography.Title level={5} style={{ marginTop: 16 }}>Rincian SPP {konfig.kontrolRAK && <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>(pagu = RAK kumulatif s.d. bulan SPP)</Typography.Text>}</Typography.Title>
      <Table size="small" rowKey="key" pagination={false} dataSource={barisAnggaran}
        locale={{ emptyText: draft.jenis === 'PEMBIAYAAN' ? 'Tidak ada pengeluaran pembiayaan di APBDes' : 'Pilih kegiatan' }}
        columns={[
          { title: 'Rekening', render: (_, b) => `${b.kdRek} ${akunMap.get(b.kdRek) ?? ''}` },
          { title: 'Sumber', dataIndex: 'sumberDana', width: 70 },
          { title: 'Anggaran', dataIndex: 'nilai', align: 'right', width: 130, render: (v: number) => <Uang v={v} /> },
          { title: 'Pagu tersedia', dataIndex: 'tersedia', align: 'right', width: 130, render: (v: number) => <Typography.Text type={v <= 0 ? 'danger' : undefined}><Uang v={v} /></Typography.Text> },
          { title: 'Nilai SPP', width: 170, render: (_, b) => <MoneyInput value={draft.nilai[b.key]} onChange={(v) => setDraft({ ...draft, nilai: { ...draft.nilai, [b.key]: v } })} /> },
        ]}
        summary={() => <Table.Summary.Row><Table.Summary.Cell index={0} colSpan={4} align="right"><b>Jumlah SPP</b></Table.Summary.Cell><Table.Summary.Cell index={1} align="right"><Uang v={total} tebal /></Table.Summary.Cell></Table.Summary.Row>} />
      {draft.jenis !== 'PANJAR' && (
        <>
          <Space style={{ marginTop: 16, marginBottom: 8 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>Bukti Pengeluaran</Typography.Title>
            <Button size="small" onClick={isiBuktiOtomatis} disabled={!pilihan.length}>Buat bukti per rincian</Button>
          </Space>
          <BuktiEditor value={draft.bukti} onChange={(b) => setDraft({ ...draft, bukti: b })} pilihan={pilihan} tglDefault={draft.tgl} />
        </>
      )}
      {draft.jenis === 'PANJAR' && <Alert style={{ marginTop: 12 }} type="info" showIcon message="SPP Panjar: bukti dilengkapi saat SPJ setelah panjar dicairkan." />}
    </Modal>
  );
}

function SpjModal({ spp, onClose }: { spp: Spp; onClose: () => void }) {
  const { sesi } = useApp();
  const aksi = useAksi();
  const [tgl, setTgl] = useState(hariIni());
  const [kasSisa, setKasSisa] = useState<JenisKas>(spp.kas);
  const [bukti, setBukti] = useState<BuktiPengeluaran[]>([]);
  const total = sum(spp.rincian, (r) => r.nilai);
  const real = sum(bukti, (b) => b.nilai);
  const simpan = async () => {
    const ok = await aksi(() => L.spjPanjar(sesi!, spp.id, { tgl, bukti, kasSisa }), 'SPJ tersimpan');
    if (ok !== undefined) onClose();
  };
  return (
    <Modal open width={1000} title={`SPJ Panjar ${spp.noSpp}`} onCancel={onClose} onOk={simpan} okText="Simpan SPJ" cancelText="Batal">
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={6}><Typography.Text type="secondary">Tanggal SPJ</Typography.Text><DateInput value={tgl} onChange={setTgl} /></Col>
        <Col span={6}><Typography.Text type="secondary">Sisa panjar disetor ke</Typography.Text><KasSelect value={kasSisa} onChange={(v) => setKasSisa(v as JenisKas)} /></Col>
        <Col span={12}>
          <Descriptions size="small" column={3}>
            <Descriptions.Item label="Panjar"><Uang v={total} /></Descriptions.Item>
            <Descriptions.Item label="Realisasi"><Uang v={real} /></Descriptions.Item>
            <Descriptions.Item label="Sisa"><Uang v={total - real} /></Descriptions.Item>
          </Descriptions>
        </Col>
      </Row>
      <BuktiEditor value={bukti} onChange={setBukti} pilihan={spp.rincian} tglDefault={tgl} />
    </Modal>
  );
}

export default function SppPage() {
  const { sesi, bisaSpp, hak, readOnly, kegiatanMap, desa, konfig, ctx } = useApp();
  const aksi = useAksi();
  const { data: spps } = useTa<Spp>('spp');
  const { posting } = useAnggaran();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [spj, setSpj] = useState<Spp | null>(null);
  const [cair, setCair] = useState<Spp | null>(null);
  const [tglCair, setTglCair] = useState(hariIni());
  const [tolak, setTolak] = useState<{ spp: Spp; tahap: 'verifikasi' | 'setujui' } | null>(null);
  const [catatan, setCatatan] = useState('');
  const [filter, setFilter] = useState<StatusSpp | 'SEMUA'>('SEMUA');
  const ro = readOnly;

  const rows = useMemo(() => [...spps].filter((s) => filter === 'SEMUA' || s.status === filter).sort((a, b) => b.noSpp.localeCompare(a.noSpp)), [spps, filter]);

  const ubah = (s: Spp | null) => setDraft(s
    ? { id: s.id, tgl: s.tgl, jenis: s.jenis, kdKeg: s.kdKeg, uraian: s.uraian, kas: s.kas, nilai: Object.fromEntries(s.rincian.map((r) => [`${r.kdRek}|${r.sumberDana}`, r.nilai])), bukti: s.bukti ?? [] }
    : { tgl: hariIni(), jenis: 'DEFINITIF', uraian: '', kas: 'BANK', nilai: {}, bukti: [] });

  const cetak = (s: Spp, jenis: string) => aksi(() => cetakLaporan(jenis, { ctx: ctx!, desa: desa!, konfig, sppId: s.id }));

  return (
    <Card title="SPP Kegiatan, Pencairan, dan SPJ" extra={
      <Space>
        <Select value={filter} onChange={setFilter} style={{ width: 200 }} options={[{ value: 'SEMUA', label: 'Semua status' }, ...['DRAFT', 'DIVERIFIKASI', 'DISETUJUI', 'DICAIRKAN', 'SELESAI', 'DITOLAK'].map((s) => ({ value: s, label: s }))]} />
        {!ro && bisaSpp('buat') && hak('spp', 'tambah') && <Button type="primary" icon={<PlusOutlined />} disabled={!posting} onClick={() => ubah(null)}>Buat SPP</Button>}
      </Space>
    }>
      {!posting && <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="APBDes belum diposting. SPP baru dapat dibuat setelah posting." />}
      <Typography.Paragraph type="secondary">Alur: PKA membuat SPP → Sekretaris Desa memverifikasi → Kepala Desa menyetujui → Kaur Keuangan mencairkan → (panjar) PKA menyampaikan SPJ.</Typography.Paragraph>
      <Table<Spp> size="small" rowKey="id" dataSource={rows} scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowRender: (s) => (
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="Rincian" span={2}>{s.rincian.map((r) => <div key={r.kdRek + r.sumberDana}>{r.kdRek} ({r.sumberDana}): <Uang v={r.nilai} /></div>)}</Descriptions.Item>
              <Descriptions.Item label="Verifikasi">{s.verifikasi ? `${s.verifikasi.oleh}, ${tglID(s.verifikasi.tgl)}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="Persetujuan">{s.persetujuan ? `${s.persetujuan.oleh}, ${tglID(s.persetujuan.tgl)}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="Pencairan">{s.pencairan ? `${s.pencairan.noBukti}, ${tglID(s.pencairan.tgl)}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="SPJ">{s.spj ? <>{tglID(s.spj.tgl)} — realisasi <Uang v={sum(s.spj.bukti, (b) => b.nilai)} />, sisa <Uang v={s.spj.sisa} /></> : '-'}</Descriptions.Item>
              {s.ditolak && <Descriptions.Item label="Ditolak" span={2}>{s.ditolak.oleh}: {s.ditolak.catatan}</Descriptions.Item>}
            </Descriptions>
          ),
        }}
        columns={[
          { title: 'No. SPP', dataIndex: 'noSpp', width: 130 },
          { title: 'Tanggal', dataIndex: 'tgl', width: 95, render: tglID },
          { title: 'Jenis', dataIndex: 'jenis', width: 90, render: (j: JenisSpp) => JENIS[j] },
          { title: 'Kegiatan', dataIndex: 'kdKeg', render: (k?: string) => (k ? `${k} ${kegiatanMap.get(k) ?? ''}` : 'Pembiayaan') },
          { title: 'Uraian', dataIndex: 'uraian' },
          { title: 'Nilai', align: 'right', width: 130, render: (_, s) => <Uang v={sum(s.rincian, (r) => r.nilai)} /> },
          { title: 'Status', dataIndex: 'status', width: 140, render: (v: string) => <StatusTag s={v} /> },
          {
            title: 'Aksi', key: 'a', fixed: 'right', width: 260, render: (_, s) => (
              <Space size={4} wrap>
                {!ro && ['DRAFT', 'DITOLAK'].includes(s.status) && bisaSpp('buat') && <Button size="small" icon={<EditOutlined />} onClick={() => ubah(s)} />}
                {!ro && ['DRAFT', 'DITOLAK'].includes(s.status) && bisaSpp('buat') && hak('spp', 'hapus') && (
                  <Popconfirm title="Hapus SPP?" onConfirm={() => aksi(() => L.hapusSpp(sesi!, s.id), 'Terhapus')}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
                )}
                {!ro && s.status === 'DRAFT' && bisaSpp('verifikasi') && <>
                  <Button size="small" icon={<CheckOutlined />} onClick={() => aksi(() => L.verifikasiSpp(sesi!, s.id, true), 'SPP diverifikasi')}>Verifikasi</Button>
                  <Button size="small" danger icon={<CloseOutlined />} onClick={() => { setCatatan(''); setTolak({ spp: s, tahap: 'verifikasi' }); }} />
                </>}
                {!ro && s.status === 'DIVERIFIKASI' && bisaSpp('setujui') && <>
                  <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => aksi(() => L.setujuiSpp(sesi!, s.id, true), 'SPP disetujui')}>Setujui</Button>
                  <Button size="small" danger icon={<CloseOutlined />} onClick={() => { setCatatan(''); setTolak({ spp: s, tahap: 'setujui' }); }} />
                </>}
                {!ro && s.status === 'DISETUJUI' && bisaSpp('cairkan') && <Button size="small" type="primary" onClick={() => { setTglCair(hariIni() < s.tgl ? s.tgl : hariIni()); setCair(s); }}>Cairkan</Button>}
                {!ro && s.status === 'DICAIRKAN' && bisaSpp('spj') && <Button size="small" type="primary" onClick={() => setSpj(s)}>SPJ</Button>}
                {!ro && ['DICAIRKAN', 'SELESAI'].includes(s.status) && !s.spj && bisaSpp('cairkan') && (
                  <Popconfirm title="Batalkan pencairan?" onConfirm={() => aksi(() => L.batalCairSpp(sesi!, s.id), 'Pencairan dibatalkan')}><Button size="small">Batal cair</Button></Popconfirm>
                )}
                {hak('spp', 'cetak') && (
                  <Dropdown menu={{ items: [
                    { key: 'spp1', label: 'SPP 1 – Surat Permintaan Pembayaran', onClick: () => cetak(s, 'spp1') },
                    { key: 'spp2', label: 'SPP 2 – Rincian/Pernyataan Tanggung Jawab', onClick: () => cetak(s, 'spp2') },
                    { key: 'sptb', label: 'SPP 3 – SPTB (Daftar Bukti)', onClick: () => cetak(s, 'sptb') },
                    { key: 'kw', label: 'Kuitansi', onClick: () => cetak(s, 'kuitansi') },
                  ] }}><Button size="small" icon={<PrinterOutlined />} /></Dropdown>
                )}
              </Space>
            ),
          },
        ]} />
      {draft && <FormSpp draft={draft} setDraft={setDraft} spps={spps} onClose={() => setDraft(null)} />}
      {spj && <SpjModal spp={spj} onClose={() => setSpj(null)} />}
      <Modal open={!!cair} title={`Pencairan ${cair?.noSpp}`} okText="Cairkan" cancelText="Batal" onCancel={() => setCair(null)}
        onOk={async () => { const r = await aksi(() => L.cairkanSpp(sesi!, cair!.id, tglCair), 'Dana dicairkan dan dicatat di Buku Kas Umum'); if (r !== undefined) setCair(null); }}>
        <Form layout="vertical"><Form.Item label="Tanggal pencairan"><DateInput value={tglCair} onChange={setTglCair} /></Form.Item></Form>
        {cair && <Typography.Text>Nilai <Uang v={sum(cair.rincian, (r) => r.nilai)} tebal /> dari kas {cair.kas === 'BANK' ? 'bank' : 'tunai'}; potongan pajak dicatat sebagai pungutan.</Typography.Text>}
      </Modal>
      <Modal open={!!tolak} title="Tolak SPP" okText="Tolak" okButtonProps={{ danger: true }} cancelText="Batal" onCancel={() => setTolak(null)}
        onOk={async () => {
          const f = tolak!.tahap === 'verifikasi' ? L.verifikasiSpp : L.setujuiSpp;
          const r = await aksi(() => f(sesi!, tolak!.spp.id, false, catatan), 'SPP dikembalikan ke pembuat');
          if (r !== undefined) setTolak(null);
        }}>
        <Input.TextArea rows={3} placeholder="Alasan penolakan" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
      </Modal>
    </Card>
  );
}
