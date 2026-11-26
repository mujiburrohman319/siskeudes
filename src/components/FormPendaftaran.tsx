import { Col, Form, Input, Row, Select } from 'antd';
import { JENIS_INSTANSI_LABEL, type JenisInstansi } from '../lib/types';

export const OPSI_JENIS = (Object.keys(JENIS_INSTANSI_LABEL) as JenisInstansi[]).map((k) => ({ value: k, label: JENIS_INSTANSI_LABEL[k] }));

/** Isian data organisasi + penanggung jawab. Dipakai di halaman daftar dan pengajuan ulang. */
export function FieldsPendaftaran() {
  return (
    <>
      <Row gutter={12}>
        <Col xs={24} sm={10}>
          <Form.Item name="jenis" label="Jenis instansi" rules={[{ required: true, message: 'Pilih jenis instansi' }]}>
            <Select options={OPSI_JENIS} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={14}>
          <Form.Item name="namaInstansi" label="Nama instansi" rules={[{ required: true, message: 'Nama instansi wajib diisi' }]}>
            <Input placeholder="Kabupaten Sambas" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="provinsi" label="Provinsi" rules={[{ required: true, message: 'Provinsi wajib diisi' }]}>
        <Input placeholder="Kalimantan Barat" />
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
