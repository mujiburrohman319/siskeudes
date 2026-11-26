import { CloudDownloadOutlined, DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useAksi, useApp } from '../../context/App';
import { uid } from '../../lib/format';
import { useCol } from '../../lib/hooks';
import { P } from '../../lib/paths';
import { store } from '../../lib/store';
import type { Desa, Kecamatan } from '../../lib/types';
import {
  ambilDesa, ambilKabupaten, ambilKecamatan, ambilProvinsi, deteksiWilayahPemda,
  digitKodeWilayah, formatKodeKemendagri, PROVINSI_ID, type WilayahItem,
} from '../../lib/wilayahId';

export default function Wilayah() {
  const { pemda, kecamatan, hak, readOnly } = useApp();
  const aksi = useAksi();
  const { data: desaRows, loading: loadingDesa } = useCol<Desa>(pemda ? P.desaCol(pemda.id) : null);

  const [provList, setProvList] = useState<WilayahItem[]>(PROVINSI_ID);
  const [provId, setProvId] = useState<string | undefined>();
  const [kabList, setKabList] = useState<WilayahItem[]>([]);
  const [kabId, setKabId] = useState<string | undefined>();
  const [loadingKab, setLoadingKab] = useState(false);

  const [kecRef, setKecRef] = useState<WilayahItem[]>([]);
  const [loadingKecRef, setLoadingKecRef] = useState(false);

  // Modal Kecamatan
  const [openKec, setOpenKec] = useState(false);
  const [editKec, setEditKec] = useState<Kecamatan | null>(null);
  const [manualKec, setManualKec] = useState(false);
  const [cariKec, setCariKec] = useState('');
  const [fKec] = Form.useForm();

  // Modal Desa
  const [openDesa, setOpenDesa] = useState(false);
  const [editDesa, setEditDesa] = useState<Desa | null>(null);
  const [manualDesa, setManualDesa] = useState(false);
  const [cariDesa, setCariDesa] = useState('');
  const [desaRef, setDesaRef] = useState<WilayahItem[]>([]);
  const [loadingDesaRef, setLoadingDesaRef] = useState(false);
  const [fDesa] = Form.useForm();

  const kecIdDipilih = Form.useWatch('kecId', fDesa) as string | undefined;

  useEffect(() => {
    void ambilProvinsi().then(setProvList);
  }, []);

  useEffect(() => {
    let batal = false;
    void deteksiWilayahPemda(pemda).then((r) => {
      if (batal) return;
      if (r.provId) setProvId(r.provId);
      if (r.kabId) setKabId(r.kabId);
    });
    return () => { batal = true; };
  }, [pemda]);

  useEffect(() => {
    let batal = false;
    if (!provId) {
      setKabList([]);
      return;
    }
    setLoadingKab(true);
    void ambilKabupaten(provId)
      .then((list) => { if (!batal) setKabList(list); })
      .catch(() => { if (!batal) setKabList([]); })
      .finally(() => { if (!batal) setLoadingKab(false); });
    return () => { batal = true; };
  }, [provId]);

  useEffect(() => {
    let batal = false;
    if (!kabId) {
      setKecRef([]);
      return;
    }
    setLoadingKecRef(true);
    void ambilKecamatan(kabId)
      .then((list) => { if (!batal) setKecRef(list); })
      .catch(() => { if (!batal) setKecRef([]); })
      .finally(() => { if (!batal) setLoadingKecRef(false); });
    return () => { batal = true; };
  }, [kabId]);

  useEffect(() => {
    let batal = false;
    const kecObj = kecamatan.find((k) => k.id === kecIdDipilih);
    const kode6 = digitKodeWilayah(kecObj?.kode).slice(0, 6);
    if (kode6.length !== 6) {
      setDesaRef([]);
      return;
    }
    setLoadingDesaRef(true);
    void ambilDesa(kode6)
      .then((list) => { if (!batal) setDesaRef(list); })
      .catch(() => { if (!batal) setDesaRef([]); })
      .finally(() => { if (!batal) setLoadingDesaRef(false); });
    return () => { batal = true; };
  }, [kecIdDipilih, kecamatan]);

  const kecSorted = useMemo(() => {
    const q = cariKec.trim().toLowerCase();
    return [...kecamatan]
      .filter((k) => !q || k.kode.toLowerCase().includes(q) || k.nama.toLowerCase().includes(q))
      .sort((a, b) => a.kode.localeCompare(b.kode));
  }, [kecamatan, cariKec]);

  const desaSorted = useMemo(() => {
    const q = cariDesa.trim().toLowerCase();
    return [...desaRows]
      .filter((d) => {
        if (!q) return true;
        const kn = kecamatan.find((k) => k.id === d.kecId)?.nama ?? '';
        return d.kode.toLowerCase().includes(q) || d.nama.toLowerCase().includes(q) || kn.toLowerCase().includes(q);
      })
      .sort((a, b) => a.kode.localeCompare(b.kode));
  }, [desaRows, kecamatan, cariDesa]);

  if (!pemda) return null;

  const bisaTambah = !readOnly && hak('wilayah', 'tambah');
  const bisaUbah = !readOnly && hak('wilayah', 'ubah');
  const bisaHapus = !readOnly && hak('wilayah', 'hapus');

  const kodeKecSudah = new Set(kecamatan.map((k) => digitKodeWilayah(k.kode)));
  const kodeDesaSudah = new Set(desaRows.map((d) => digitKodeWilayah(d.kode)));

  const bukaKec = (row: Kecamatan | null) => {
    setEditKec(row);
    setManualKec(!!row || !kabId);
    fKec.resetFields();
    if (row) fKec.setFieldsValue(row);
    setOpenKec(true);
  };

  const simpanKec = async () => {
    const v = await fKec.validateFields();
    const ok = await aksi(async () => {
      const id = editKec?.id ?? uid();
      const raw = String(v.kode).trim();
      const kode = /^[\d.]+$/.test(raw) ? formatKodeKemendagri(raw) : raw;
      await store.set(`${P.kecamatan(pemda.id)}/${id}`, { kode, nama: String(v.nama).trim() }, false);
      return true;
    }, 'Kecamatan tersimpan');
    if (ok) setOpenKec(false);
  };

  const muatSemuaKecamatan = async () => {
    const baru = kecRef.filter((k) => !kodeKecSudah.has(k.id));
    if (!baru.length) {
      await aksi(async () => { throw new Error('Semua kecamatan dari kabupaten ini sudah terdaftar.'); });
      return;
    }
    await aksi(
      () => store.write(baru.map((k) => ({
        type: 'set' as const,
        path: `${P.kecamatan(pemda.id)}/${k.id}`,
        data: { kode: k.kode, nama: k.nama },
      }))),
      `${baru.length} kecamatan ditambahkan sesuai kode Kemendagri`,
    );
  };

  const bukaDesa = (row: Desa | null) => {
    setEditDesa(row);
    setManualDesa(!!row);
    fDesa.resetFields();
    if (row) fDesa.setFieldsValue(row);
    else if (kecamatan.length === 1) fDesa.setFieldsValue({ kecId: kecamatan[0]!.id });
    setOpenDesa(true);
  };

  const simpanDesa = async () => {
    const v = await fDesa.validateFields();
    const ok = await aksi(async () => {
      const id = editDesa?.id ?? uid();
      const raw = String(v.kode).trim();
      const kode = /^[\d.]+$/.test(raw) ? formatKodeKemendagri(raw) : raw;
      await store.set(`${P.desaCol(pemda.id)}/${id}`, { kode, nama: String(v.nama).trim(), kecId: v.kecId }, false);
      return true;
    }, 'Desa tersimpan');
    if (ok) setOpenDesa(false);
  };

  const muatDesaKecamatan = async () => {
    const kecObj = kecamatan.find((k) => k.id === kecIdDipilih);
    if (!kecObj) return;
    const baru = desaRef.filter((d) => !kodeDesaSudah.has(d.id));
    if (!baru.length) {
      await aksi(async () => { throw new Error('Semua desa/kelurahan di kecamatan ini sudah terdaftar.'); });
      return;
    }
    const ok = await aksi(
      () => store.write(baru.map((d) => ({
        type: 'set' as const,
        path: `${P.desaCol(pemda.id)}/${d.id}`,
        data: { kode: d.kode, nama: d.nama, kecId: kecObj.id },
      }))),
      `${baru.length} desa/kelurahan di Kec. ${kecObj.nama} ditambahkan`,
    );
    if (ok) setOpenDesa(false);
  };

  return (
    <>
      <Card size="small" title="Acuan Wilayah Kemendagri">
        <Row gutter={12} align="middle">
          <Col xs={24} md={10}>
            <div style={{ fontSize: 12, color: '#5d6b64', marginBottom: 4 }}>Provinsi</div>
            <Select
              showSearch
              allowClear
              style={{ width: '100%' }}
              optionFilterProp="label"
              placeholder="Pilih provinsi"
              value={provId}
              options={provList.map((p) => ({ value: p.id, label: `${p.kode} — ${p.nama}` }))}
              onChange={(v) => { setProvId(v); setKabId(undefined); }}
            />
          </Col>
          <Col xs={24} md={14}>
            <div style={{ fontSize: 12, color: '#5d6b64', marginBottom: 4 }}>Kabupaten / Kota</div>
            <Select
              showSearch
              allowClear
              loading={loadingKab}
              disabled={!provId}
              style={{ width: '100%' }}
              optionFilterProp="label"
              placeholder={provId ? 'Pilih kabupaten / kota' : 'Pilih provinsi terlebih dahulu'}
              value={kabId}
              options={kabList.map((k) => ({ value: k.id, label: `${k.kode} — ${k.nama}` }))}
              onChange={(v) => setKabId(v)}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title="Kecamatan"
        extra={
          <Space wrap>
            <Input allowClear prefix={<SearchOutlined />} placeholder="Cari" value={cariKec} onChange={(e) => setCariKec(e.target.value)} style={{ width: 180 }} />
            {bisaTambah && kabId && kecRef.length > 0 && (
              <Popconfirm
                title={`Muat ${kecRef.filter((k) => !kodeKecSudah.has(k.id)).length} kecamatan yang belum ada?`}
                okText="Muat"
                cancelText="Batal"
                onConfirm={muatSemuaKecamatan}
              >
                <Button icon={<CloudDownloadOutlined />} loading={loadingKecRef}>Muat Semua Kecamatan</Button>
              </Popconfirm>
            )}
            {bisaTambah && <Button type="primary" icon={<PlusOutlined />} onClick={() => bukaKec(null)}>Tambah</Button>}
          </Space>
        }
      >
        <Table<Kecamatan>
          rowKey="id"
          size="small"
          dataSource={kecSorted}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          columns={[
            { title: 'Kode', dataIndex: 'kode', width: 140, sorter: (a, b) => a.kode.localeCompare(b.kode) },
            { title: 'Nama Kecamatan', dataIndex: 'nama', sorter: (a, b) => a.nama.localeCompare(b.nama) },
            {
              title: '', key: '_aksi', width: 100, fixed: 'right',
              render: (_, r) => (
                <Space size={4}>
                  {bisaUbah && <Button size="small" icon={<EditOutlined />} onClick={() => bukaKec(r)} />}
                  {bisaHapus && (
                    <Popconfirm title="Hapus kecamatan ini?" okText="Hapus" cancelText="Batal" onConfirm={() => aksi(() => store.remove(`${P.kecamatan(pemda.id)}/${r.id}`), 'Terhapus')}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card
        title="Desa"
        extra={
          <Space wrap>
            <Input allowClear prefix={<SearchOutlined />} placeholder="Cari" value={cariDesa} onChange={(e) => setCariDesa(e.target.value)} style={{ width: 200 }} />
            {bisaTambah && <Button type="primary" icon={<PlusOutlined />} onClick={() => bukaDesa(null)}>Tambah</Button>}
          </Space>
        }
      >
        <Typography.Paragraph type="secondary">
          Pilih kecamatan lalu pilih desa dari daftar Kemendagri — kode wilayah (10 digit, mis. <code>61.01.01.2001</code>) terisi otomatis.
        </Typography.Paragraph>
        <Table<Desa>
          rowKey="id"
          size="small"
          loading={loadingDesa}
          dataSource={desaSorted}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          columns={[
            { title: 'Kode Desa', dataIndex: 'kode', width: 160, sorter: (a, b) => a.kode.localeCompare(b.kode) },
            { title: 'Nama Desa', dataIndex: 'nama', sorter: (a, b) => a.nama.localeCompare(b.nama) },
            {
              title: 'Kecamatan', dataIndex: 'kecId',
              render: (v: string) => kecamatan.find((k) => k.id === v)?.nama ?? v,
              sorter: (a, b) => (kecamatan.find((k) => k.id === a.kecId)?.nama ?? '').localeCompare(kecamatan.find((k) => k.id === b.kecId)?.nama ?? ''),
            },
            {
              title: '', key: '_aksi', width: 100, fixed: 'right',
              render: (_, r) => (
                <Space size={4}>
                  {bisaUbah && <Button size="small" icon={<EditOutlined />} onClick={() => bukaDesa(r)} />}
                  {bisaHapus && (
                    <Popconfirm title="Hapus desa ini?" okText="Hapus" cancelText="Batal" onConfirm={() => aksi(() => store.remove(`${P.desaCol(pemda.id)}/${r.id}`), 'Terhapus')}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={openKec} title={`${editKec ? 'Ubah' : 'Tambah'} Kecamatan`} onCancel={() => setOpenKec(false)} onOk={simpanKec} okText="Simpan" cancelText="Batal" destroyOnClose>
        <Form form={fKec} layout="vertical" preserve={false}>
          {!editKec && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {manualKec ? 'Mode input manual' : 'Pilih dari daftar kecamatan Kemendagri'}
              </Typography.Text>
              <Space size={6}>
                <span style={{ fontSize: 12, color: '#7b8a83' }}>Manual</span>
                <Switch size="small" checked={manualKec} onChange={setManualKec} />
              </Space>
            </div>
          )}
          {!editKec && !manualKec && (
            <Form.Item label="Pilih Kecamatan (Kemendagri)">
              <Select
                showSearch
                loading={loadingKecRef}
                disabled={!kabId}
                optionFilterProp="label"
                placeholder={kabId ? 'Cari nama atau kode kecamatan' : 'Pilih Kabupaten/Kota di bagian atas terlebih dahulu'}
                options={kecRef.map((k) => ({
                  value: k.id,
                  label: `${k.kode} — ${k.nama}${kodeKecSudah.has(k.id) ? ' (sudah ada)' : ''}`,
                  disabled: kodeKecSudah.has(k.id),
                }))}
                onChange={(id) => {
                  const pilih = kecRef.find((k) => k.id === id);
                  if (pilih) fKec.setFieldsValue({ kode: pilih.kode, nama: pilih.nama });
                }}
              />
            </Form.Item>
          )}
          <Row gutter={12}>
            <Col xs={24} sm={10}>
              <Form.Item name="kode" label="Kode Kemendagri" rules={[{ required: true, message: 'Kode wajib diisi' }]}>
                <Input placeholder="61.01.01" readOnly={!editKec && !manualKec} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={14}>
              <Form.Item name="nama" label="Nama Kecamatan" rules={[{ required: true, message: 'Nama kecamatan wajib diisi' }]}>
                <Input placeholder="Sambas" readOnly={!editKec && !manualKec} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal open={openDesa} title={`${editDesa ? 'Ubah' : 'Tambah'} Desa`} onCancel={() => setOpenDesa(false)} onOk={simpanDesa} okText="Simpan" cancelText="Batal" destroyOnClose>
        <Form form={fDesa} layout="vertical" preserve={false}>
          {!editDesa && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {manualDesa ? 'Mode input manual' : 'Pilih dari daftar desa Kemendagri'}
              </Typography.Text>
              <Space size={6}>
                <span style={{ fontSize: 12, color: '#7b8a83' }}>Manual</span>
                <Switch size="small" checked={manualDesa} onChange={setManualDesa} />
              </Space>
            </div>
          )}
          <Form.Item name="kecId" label="Kecamatan" rules={[{ required: true, message: 'Pilih kecamatan' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Pilih kecamatan"
              options={[...kecamatan].sort((a, b) => a.kode.localeCompare(b.kode)).map((k) => ({ value: k.id, label: `${k.kode} — ${k.nama}` }))}
              onChange={() => {
                if (!editDesa && !manualDesa) fDesa.setFieldsValue({ kode: undefined, nama: undefined });
              }}
            />
          </Form.Item>
          {!editDesa && !manualDesa && (
            <Form.Item
              label={
                <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span>Pilih Desa (Kemendagri)</span>
                  {kecIdDipilih && desaRef.length > 0 && (
                    <Popconfirm
                      title={`Muat ${desaRef.filter((d) => !kodeDesaSudah.has(d.id)).length} desa/kelurahan di kecamatan ini?`}
                      okText="Muat Semua"
                      cancelText="Batal"
                      onConfirm={muatDesaKecamatan}
                    >
                      <a style={{ fontSize: 12, fontWeight: 500 }}>+ Muat semua desa kecamatan ini</a>
                    </Popconfirm>
                  )}
                </span>
              }
              className="sk-label-penuh"
            >
              <Select
                showSearch
                loading={loadingDesaRef}
                disabled={!kecIdDipilih}
                optionFilterProp="label"
                placeholder={kecIdDipilih ? 'Cari nama atau kode desa' : 'Pilih kecamatan terlebih dahulu'}
                options={desaRef.map((d) => {
                  const seg4 = digitKodeWilayah(d.id).slice(6, 7);
                  const jenis = seg4 === '1' ? 'Kel.' : 'Desa';
                  return {
                    value: d.id,
                    label: `${d.kode} — ${d.nama} (${jenis})${kodeDesaSudah.has(d.id) ? ' ✓' : ''}`,
                    disabled: kodeDesaSudah.has(d.id),
                  };
                })}
                onChange={(id) => {
                  const pilih = desaRef.find((d) => d.id === id);
                  if (pilih) fDesa.setFieldsValue({ kode: pilih.kode, nama: pilih.nama });
                }}
              />
            </Form.Item>
          )}
          <Row gutter={12}>
            <Col xs={24} sm={11}>
              <Form.Item
                name="kode"
                label={<span>Kode Desa Kemendagri {!editDesa && !manualDesa && <Tag color="green" style={{ marginLeft: 4 }}>Otomatis</Tag>}</span>}
                rules={[{ required: true, message: 'Kode desa wajib diisi' }]}
              >
                <Input placeholder="61.01.01.2001" readOnly={!editDesa && !manualDesa} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={13}>
              <Form.Item name="nama" label="Nama Desa" rules={[{ required: true, message: 'Nama desa wajib diisi' }]}>
                <Input placeholder="Pasar Melayu" readOnly={!editDesa && !manualDesa} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
