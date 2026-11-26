import { Col, Form, Input, Row, Select, Switch, Tag } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { ambilKabupaten, ambilProvinsi, cariProvinsiDariNama, PROVINSI_ID, type WilayahItem } from '../lib/wilayahId';
import { JENIS_INSTANSI_LABEL, type JenisInstansi } from '../lib/types';

export const OPSI_JENIS = (Object.keys(JENIS_INSTANSI_LABEL) as JenisInstansi[]).map((k) => ({ value: k, label: JENIS_INSTANSI_LABEL[k] }));

/** Isian data organisasi + penanggung jawab. Dipakai di halaman daftar dan pengajuan ulang. */
export function FieldsPendaftaran() {
  const form = Form.useFormInstance();
  const jenis = (Form.useWatch('jenis', form) as JenisInstansi | undefined) ?? 'KABUPATEN';
  const provinsiNama = Form.useWatch('provinsi', form) as string | undefined;
  const kodeWilayah = Form.useWatch('kodeWilayah', form) as string | undefined;

  const [provList, setProvList] = useState<WilayahItem[]>(PROVINSI_ID);
  const [kabList, setKabList] = useState<WilayahItem[]>([]);
  const [loadingKab, setLoadingKab] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    void ambilProvinsi().then(setProvList);
  }, []);

  const provAktif = useMemo(() => cariProvinsiDariNama(provinsiNama, provList), [provinsiNama, provList]);

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
    if (jenis === 'KABUPATEN') return kabList.filter((k) => /^kabupaten\b/i.test(k.nama));
    if (jenis === 'KOTA') return kabList.filter((k) => /^kota\b/i.test(k.nama));
    return kabList;
  }, [kabList, jenis]);

  const pakaiDropdownKab = jenis !== 'LEMBAGA' && !manual;

  return (
    <>
      <Form.Item name="kodeWilayah" hidden><Input /></Form.Item>
      <Row gutter={12}>
        <Col xs={24} sm={10}>
          <Form.Item name="jenis" label="Jenis instansi" rules={[{ required: true, message: 'Pilih jenis instansi' }]}>
            <Select
              options={OPSI_JENIS}
              onChange={() => {
                if (jenis !== 'LEMBAGA') form.setFieldsValue({ namaInstansi: undefined, kodeWilayah: undefined });
              }}
            />
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
                if (pakaiDropdownKab) form.setFieldsValue({ namaInstansi: undefined, kodeWilayah: undefined });
              }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        name="namaInstansi"
        label={
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span>
              {jenis === 'KOTA' ? 'Kota' : jenis === 'KABUPATEN' ? 'Kabupaten' : 'Nama instansi'}{' '}
              {kodeWilayah && <Tag color="green" style={{ marginLeft: 4 }}>Kode Kemendagri: {kodeWilayah}</Tag>}
            </span>
            {jenis !== 'LEMBAGA' && (
              <span style={{ fontSize: 12, fontWeight: 400, color: '#7b8a83', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Manual <Switch size="small" checked={manual} onChange={(v) => setManual(v)} />
              </span>
            )}
          </span>
        }
        className="sk-label-penuh"
        rules={[{ required: true, message: 'Nama instansi wajib diisi' }]}
      >
        {pakaiDropdownKab ? (
          <Select
            showSearch
            allowClear
            loading={loadingKab}
            disabled={!provAktif}
            optionFilterProp="label"
            placeholder={provAktif ? `Pilih ${jenis === 'KOTA' ? 'kota' : 'kabupaten'}` : 'Pilih provinsi terlebih dahulu'}
            options={kabTersaring.map((k) => ({ value: k.nama, label: `${k.kode} — ${k.nama}` }))}
            onChange={(val) => {
              const dipilih = kabTersaring.find((k) => k.nama === val);
              form.setFieldValue('kodeWilayah', dipilih?.kode);
            }}
          />
        ) : (
          <Input placeholder={jenis === 'LEMBAGA' ? 'Politeknik / Universitas ...' : 'Kabupaten Sambas'} />
        )}
      </Form.Item>
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item name="namaPj" label="Nama penanggung jawab" rules={[{ required: true, message: 'Nama wajib diisi' }]}>
            <Input placeholder="Nama lengkap" autoComplete="name" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="jabatan" label="Jabatan" rules={[{ required: true, message: 'Jabatan wajib diisi' }]}>
            <Input placeholder="Kabid Pemdes, DPMD" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="hp" label="No. HP / WhatsApp" rules={[{ required: true, message: 'Nomor wajib diisi' }, { pattern: /^[+\d][\d\s-]{7,}$/, message: 'Nomor tidak valid' }]}>
        <Input placeholder="0812xxxxxxxx" autoComplete="tel" inputMode="tel" />
      </Form.Item>
      <Form.Item name="catatan" label="Catatan (opsional)">
        <Input.TextArea rows={2} placeholder="Mis. jumlah desa, kebutuhan pelatihan, dsb." />
      </Form.Item>
    </>
  );
}

export const nilaiAwalPendaftaran = { jenis: 'KABUPATEN' as JenisInstansi };
