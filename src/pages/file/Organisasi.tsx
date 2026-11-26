import { CheckOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Badge, Button, Card, Col, Descriptions, Divider, Form, Input, Modal, Row, Select, Space, Switch, Table, Tabs, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { OPSI_JENIS } from '../../components/FormPendaftaran';
import { useAksi, useApp } from '../../context/App';
import { tglID } from '../../lib/format';
import { useCol } from '../../lib/hooks';
import { buatOrganisasi, setujuiPendaftaran, tolakPendaftaran, usulKodePemda } from '../../lib/organisasi';
import { P } from '../../lib/paths';
import { store } from '../../lib/store';
import { ambilKabupaten, ambilProvinsi, cariProvinsiDariNama, PROVINSI_ID, type WilayahItem } from '../../lib/wilayahId';
import { JENIS_INSTANSI_LABEL, type JenisInstansi, type Pemda, type Pendaftaran, type StatusPendaftaran } from '../../lib/types';

const WARNA_STATUS: Record<StatusPendaftaran, string> = { MENUNGGU: 'gold', DISETUJUI: 'green', DITOLAK: 'red' };
const LABEL_STATUS: Record<StatusPendaftaran, string> = { MENUNGGU: 'Menunggu', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak' };
const kodeRule = [{ required: true, message: 'Kode wajib diisi' }, { pattern: /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, message: 'Huruf kecil, angka, tanda hubung (3–40)' }];

export default function OrganisasiPage() {
  const { profile, ta } = useApp();
  const aksi = useAksi();
  const { data: daftar, loading } = useCol<Pendaftaran & { id: string }>(P.pendaftaranCol());
  const { data: pemdaList, loading: loadingPemda } = useCol<Pemda & { id: string }>(P.pemdaCol());
  const [tab, setTab] = useState<StatusPendaftaran>('MENUNGGU');
  const [setuju, setSetuju] = useState<Pendaftaran | null>(null);
  const [tolak, setTolak] = useState<Pendaftaran | null>(null);
  const [baru, setBaru] = useState(false);
  const [manualBaru, setManualBaru] = useState(false);
  const [provList, setProvList] = useState<WilayahItem[]>(PROVINSI_ID);
  const [kabList, setKabList] = useState<WilayahItem[]>([]);
  const [loadingKab, setLoadingKab] = useState(false);
  const [fSetuju] = Form.useForm();
  const [fTolak] = Form.useForm();
  const [fBaru] = Form.useForm();
  const oleh = profile?.nama || profile?.email || 'Super Admin';

  const jenisBaru = (Form.useWatch('jenis', fBaru) as JenisInstansi | undefined) ?? 'KABUPATEN';
  const provBaru = Form.useWatch('provinsi', fBaru) as string | undefined;
  const kodeWilayahBaru = Form.useWatch('kodeWilayah', fBaru) as string | undefined;

  useEffect(() => {
    void ambilProvinsi().then(setProvList);
  }, []);

  const provAktif = useMemo(() => cariProvinsiDariNama(provBaru, provList), [provBaru, provList]);

  useEffect(() => {
    let batal = false;
    if (!provAktif) {
      setKabList([]);
      return;
    }
    setLoadingKab(true);
    void ambilKabupaten(provAktif.id)
      .then((list) => { if (!batal) setKabList(list); })
      .catch(() => { if (!batal) setKabList([]); })
      .finally(() => { if (!batal) setLoadingKab(false); });
    return () => { batal = true; };
  }, [provAktif?.id]);

  const kabTersaring = useMemo(() => {
    if (jenisBaru === 'KABUPATEN') return kabList.filter((k) => /^kabupaten\b/i.test(k.nama));
    if (jenisBaru === 'KOTA') return kabList.filter((k) => /^kota\b/i.test(k.nama));
    return kabList;
  }, [kabList, jenisBaru]);

  const hitung = (s: StatusPendaftaran) => daftar.filter((d) => d.status === s).length;
  const rows = useMemo(() => daftar.filter((d) => d.status === tab).sort((a, b) => b.tglDaftar.localeCompare(a.tglDaftar)), [daftar, tab]);

  if (profile?.role !== 'SUPERADMIN') {
    return <Card><Typography.Text type="warning">Menu ini khusus Super Admin.</Typography.Text></Card>;
  }

  const bukaSetuju = (p: Pendaftaran) => {
    fSetuju.setFieldsValue({ pemdaId: usulKodePemda(p.namaInstansi, p.jenis), nama: p.namaInstansi, provinsi: p.provinsi, kodeWilayah: p.kodeWilayah });
    setSetuju(p);
  };

  return (
    <>
      <Card title="Pendaftaran Organisasi" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { fBaru.resetFields(); setManualBaru(false); setBaru(true); }}>Buatkan Organisasi</Button>}>
        <Typography.Paragraph type="secondary">
          Pemerintah kabupaten/kota atau lembaga mendaftar dari halaman login. Setujui untuk membuat organisasi (beserta referensi rekening, kegiatan, sumber dana)
          dan menjadikan pendaftar <b>Admin Kabupaten</b>. Atau gunakan <b>Buatkan Organisasi</b> untuk membuat organisasi dan akun admin secara langsung.
        </Typography.Paragraph>
        <Tabs activeKey={tab} onChange={(k) => setTab(k as StatusPendaftaran)}
          items={(['MENUNGGU', 'DISETUJUI', 'DITOLAK'] as StatusPendaftaran[]).map((s) => ({
            key: s, label: <Space size={6}>{LABEL_STATUS[s]}<Badge count={hitung(s)} showZero color={s === 'MENUNGGU' ? '#d97706' : '#94a3b8'} size="small" /></Space>,
          }))} />
        <Table<Pendaftaran & { id: string }> rowKey="id" size="small" loading={loading} dataSource={rows} scroll={{ x: 'max-content' }}
          expandable={{ expandedRowRender: (p) => (
            <Descriptions size="small" column={{ xs: 1, md: 2 }}>
              <Descriptions.Item label="Jenis">{JENIS_INSTANSI_LABEL[p.jenis]}</Descriptions.Item>
              <Descriptions.Item label="Kode wilayah">{p.kodeWilayah || '-'}</Descriptions.Item>
              <Descriptions.Item label="Jabatan">{p.jabatan}</Descriptions.Item>
              <Descriptions.Item label="Catatan">{p.catatan || '-'}</Descriptions.Item>
              {p.pemdaId && <Descriptions.Item label="Kode organisasi">{p.pemdaId}</Descriptions.Item>}
              {p.alasan && <Descriptions.Item label="Alasan ditolak">{p.alasan}</Descriptions.Item>}
              {p.diprosesOleh && <Descriptions.Item label="Diproses">{p.diprosesOleh}, {tglID(p.tglProses)}</Descriptions.Item>}
            </Descriptions>
          ) }}
          columns={[
            { title: 'Tanggal', dataIndex: 'tglDaftar', width: 110, render: tglID },
            { title: 'Instansi', dataIndex: 'namaInstansi', render: (v, p) => <><b>{v}</b><div style={{ fontSize: 12, color: '#7b8a83' }}>{p.kodeWilayah ? `${p.kodeWilayah} · ` : ''}{p.provinsi}</div></> },
            { title: 'Penanggung jawab', dataIndex: 'namaPj', render: (v, p) => <>{v}<div style={{ fontSize: 12, color: '#7b8a83' }}>{p.email} · {p.hp}</div></> },
            { title: 'Status', dataIndex: 'status', render: (s: StatusPendaftaran) => <Tag color={WARNA_STATUS[s]}>{LABEL_STATUS[s]}</Tag> },
            {
              title: '', key: 'aksi', fixed: 'right', render: (_, p) => p.status === 'MENUNGGU' && (
                <Space size={4}>
                  <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => bukaSetuju(p)}>Setujui</Button>
                  <Button size="small" danger icon={<CloseOutlined />} onClick={() => { fTolak.resetFields(); setTolak(p); }}>Tolak</Button>
                </Space>
              ),
            },
          ]} />
      </Card>

      <Card title={`Daftar Organisasi (${pemdaList.length})`}>
        <Table<Pemda & { id: string }> rowKey="id" size="small" loading={loadingPemda} pagination={{ pageSize: 20 }}
          dataSource={[...pemdaList].sort((a, b) => a.nama.localeCompare(b.nama))}
          columns={[
            { title: 'Kode Org', dataIndex: 'id', width: 180 },
            { title: 'Kode Wilayah', dataIndex: 'kodeWilayah', width: 120, render: (v?: string) => v || '-' },
            { title: 'Nama', dataIndex: 'nama' },
            { title: 'Provinsi', dataIndex: 'provinsi' },
            { title: 'Jenis', dataIndex: 'jenis', render: (j?: JenisInstansi) => (j ? JENIS_INSTANSI_LABEL[j] : '-') },
          ]} />
      </Card>

      <Modal open={!!setuju} title="Setujui pendaftaran" okText="Setujui & buat organisasi" cancelText="Batal" onCancel={() => setSetuju(null)}
        onOk={async () => {
          const v = await fSetuju.validateFields();
          const ok = await aksi(async () => { await setujuiPendaftaran(store, setuju!, v, oleh, ta); return true; }, `${setuju!.namaInstansi} disetujui. ${setuju!.namaPj} kini Admin Kabupaten.`);
          if (ok) setSetuju(null);
        }}>
        <Typography.Paragraph type="secondary">{setuju?.namaPj} ({setuju?.email}) akan menjadi Admin Kabupaten organisasi ini.</Typography.Paragraph>
        <Form form={fSetuju} layout="vertical" requiredMark={false}>
          <Form.Item name="kodeWilayah" hidden><Input /></Form.Item>
          <Form.Item name="nama" label="Nama organisasi" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="provinsi" label="Provinsi" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="pemdaId" label="Kode organisasi" rules={kodeRule} extra="Dipakai sebagai ID data; tidak dapat diubah setelah dibuat."><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal open={!!tolak} title="Tolak pendaftaran" okText="Tolak" okButtonProps={{ danger: true }} cancelText="Batal" onCancel={() => setTolak(null)}
        onOk={async () => {
          const v = await fTolak.validateFields();
          const ok = await aksi(async () => { await tolakPendaftaran(store, tolak!, v.alasan, oleh); return true; }, 'Pendaftaran ditolak');
          if (ok) setTolak(null);
        }}>
        <Form form={fTolak} layout="vertical" requiredMark={false}>
          <Form.Item name="alasan" label="Alasan (ditampilkan ke pendaftar)" rules={[{ required: true, message: 'Isi alasan' }]}>
            <Input.TextArea rows={3} placeholder="Mis. gunakan email dinas resmi." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={baru} title="Buatkan organisasi" width={640} okText="Buat" cancelText="Batal" onCancel={() => setBaru(false)}
        onOk={async () => {
          const v = await fBaru.validateFields();
          const ok = await aksi(async () => {
            await buatOrganisasi(store, { pemdaId: v.pemdaId, nama: v.nama, kodeWilayah: v.kodeWilayah, provinsi: v.provinsi, jenis: v.jenis },
              { nama: v.adminNama, email: v.adminEmail, password: v.adminPassword }, ta);
            return true;
          }, `Organisasi ${v.nama} dibuat. Kirim email & kata sandi ke admin.`);
          if (ok) setBaru(false);
        }}>
        <Form form={fBaru} layout="vertical" requiredMark={false} initialValues={{ jenis: 'KABUPATEN' }}
          onValuesChange={(c, all) => { if ('nama' in c || 'jenis' in c) fBaru.setFieldValue('pemdaId', usulKodePemda(all.nama ?? '', all.jenis)); }}>
          <Form.Item name="kodeWilayah" hidden><Input /></Form.Item>
          <Row gutter={12}>
            <Col xs={24} sm={10}>
              <Form.Item name="jenis" label="Jenis" rules={[{ required: true }]}>
                <Select options={OPSI_JENIS} onChange={() => fBaru.setFieldsValue({ nama: undefined, kodeWilayah: undefined, pemdaId: undefined })} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={14}>
              <Form.Item name="provinsi" label="Provinsi" rules={[{ required: true, message: 'Pilih provinsi' }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Pilih provinsi"
                  options={provList.map((p) => ({ value: p.nama, label: `${p.kode} — ${p.nama}` }))}
                  onChange={() => {
                    if (jenisBaru !== 'LEMBAGA' && !manualBaru) fBaru.setFieldsValue({ nama: undefined, kodeWilayah: undefined, pemdaId: undefined });
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} sm={14}>
              <Form.Item
                name="nama"
                className="sk-label-penuh"
                label={
                  <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span>
                      Nama organisasi {kodeWilayahBaru && <Tag color="green" style={{ marginLeft: 4 }}>{kodeWilayahBaru}</Tag>}
                    </span>
                    {jenisBaru !== 'LEMBAGA' && (
                      <span style={{ fontSize: 12, fontWeight: 400, color: '#7b8a83', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        Manual <Switch size="small" checked={manualBaru} onChange={setManualBaru} />
                      </span>
                    )}
                  </span>
                }
                rules={[{ required: true }]}
              >
                {jenisBaru !== 'LEMBAGA' && !manualBaru ? (
                  <Select
                    showSearch
                    loading={loadingKab}
                    disabled={!provAktif}
                    optionFilterProp="label"
                    placeholder={provAktif ? 'Pilih kabupaten/kota' : 'Pilih provinsi dahulu'}
                    options={kabTersaring.map((k) => ({ value: k.nama, label: `${k.kode} — ${k.nama}` }))}
                    onChange={(val) => {
                      const dipilih = kabTersaring.find((k) => k.nama === val);
                      fBaru.setFieldsValue({
                        kodeWilayah: dipilih?.kode,
                        pemdaId: usulKodePemda(val, jenisBaru),
                      });
                    }}
                  />
                ) : (
                  <Input placeholder="Kabupaten Sambas" />
                )}
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}><Form.Item name="pemdaId" label="Kode organisasi" rules={kodeRule}><Input /></Form.Item></Col>
          </Row>
          <Divider plain style={{ fontSize: 12, color: '#7b8a83', margin: '0 0 12px' }}>Akun Admin Kabupaten</Divider>
          <Form.Item name="adminNama" label="Nama admin" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col xs={24} sm={12}><Form.Item name="adminEmail" label="Email" rules={[{ required: true }, { type: 'email', message: 'Email tidak valid' }]}><Input /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="adminPassword" label="Kata sandi awal" rules={[{ required: true }, { min: 8, message: 'Minimal 8 karakter' }]}><Input.Password /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
