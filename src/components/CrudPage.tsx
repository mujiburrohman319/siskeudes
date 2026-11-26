import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState, type ReactNode } from 'react';
import { useAksi, useApp } from '../context/App';
import { tglID, uid } from '../lib/format';
import { useCol } from '../lib/hooks';
import { store } from '../lib/store';
import { DateInput, MoneyInput, Uang } from './Input';

export interface Field<T> {
  name: keyof T & string;
  label: string;
  type?: 'text' | 'number' | 'money' | 'date' | 'select' | 'textarea' | 'switch' | 'custom' | 'multiselect';
  options?: { value: string | number; label: string }[];
  required?: boolean;
  table?: boolean;
  form?: boolean;
  width?: number;
  render?: (v: unknown, row: T) => ReactNode;
  input?: ReactNode;
  help?: string;
}

interface Props<T extends { id: string }> {
  title: string;
  menuKey: string;
  col: string | null;
  fields: Field<T>[];
  sort?: (a: T, b: T) => number;
  idFrom?: (v: Partial<T>) => string;
  defaults?: Partial<T>;
  onSave?: (values: Partial<T>, editing: T | null) => Promise<void>;
  onDelete?: (row: T) => Promise<void>;
  filter?: (row: T) => boolean;
  toolbar?: ReactNode;
  readOnly?: boolean;
  deskripsi?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  modalWidth?: number;
  summary?: (rows: T[]) => ReactNode;
  /** false = data tidak dapat diubah, hanya tambah/hapus (transaksi) */
  editable?: boolean;
}

export function CrudPage<T extends { id: string }>(p: Props<T>) {
  const { hak } = useApp();
  const aksi = useAksi();
  const { data, loading } = useCol<T>(p.col);
  const [editing, setEditing] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  const [cari, setCari] = useState('');
  const [form] = Form.useForm();
  const ro = p.readOnly;
  const bisaTambah = !ro && hak(p.menuKey, 'tambah');
  const bisaUbah = !ro && p.editable !== false && hak(p.menuKey, 'ubah');
  const bisaHapus = !ro && hak(p.menuKey, 'hapus');

  const rows = useMemo(() => {
    let r = p.filter ? data.filter(p.filter) : data;
    if (cari) {
      const q = cari.toLowerCase();
      r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(q));
    }
    return p.sort ? [...r].sort(p.sort) : r;
  }, [data, p.filter, p.sort, cari]);

  const buka = (row: T | null) => {
    setEditing(row);
    form.resetFields();
    form.setFieldsValue(row ?? p.defaults ?? {});
    setOpen(true);
  };

  const simpan = async () => {
    const v = (await form.validateFields()) as Partial<T>;
    const ok = await aksi(async () => {
      if (p.onSave) await p.onSave(v, editing);
      else {
        const id = editing?.id ?? (p.idFrom ? p.idFrom(v) : uid());
        await store.set(`${p.col}/${id}`, { ...(editing ?? {}), ...v }, false);
      }
      return true;
    }, 'Tersimpan');
    if (ok) setOpen(false);
  };

  const columns: ColumnsType<T> = [
    ...p.fields.filter((f) => f.table !== false).map((f) => ({
      title: f.label,
      dataIndex: f.name,
      key: f.name,
      width: f.width,
      align: (f.type === 'money' || f.type === 'number' ? 'right' : undefined) as 'right' | undefined,
      sorter: f.type === 'money' || f.type === 'number'
        ? (a: T, b: T) => Number(a[f.name] ?? 0) - Number(b[f.name] ?? 0)
        : (a: T, b: T) => String(a[f.name] ?? '').localeCompare(String(b[f.name] ?? '')),
      render: (v: unknown, row: T) => {
        if (f.render) return f.render(v, row);
        if (f.type === 'money') return <Uang v={v as number} />;
        if (f.type === 'date') return tglID(v as string);
        if (f.type === 'switch') return v ? 'Ya' : '-';
        if (f.type === 'select') return f.options?.find((o) => o.value === v)?.label ?? String(v ?? '');
        if (f.type === 'multiselect') return Array.isArray(v) ? v.join(', ') : '';
        return v as ReactNode;
      },
    })),
    {
      title: '', key: '_aksi', width: 120, fixed: 'right',
      render: (_: unknown, row: T) => (
        <Space size={4}>
          {p.rowActions?.(row)}
          {bisaUbah && <Button size="small" icon={<EditOutlined />} onClick={() => buka(row)} />}
          {bisaHapus && (
            <Popconfirm title="Hapus data ini?" okText="Hapus" cancelText="Batal"
              onConfirm={() => aksi(async () => (p.onDelete ? p.onDelete(row) : store.remove(`${p.col}/${row.id}`)), 'Terhapus')}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title={p.title} extra={
      <Space>
        <Input allowClear prefix={<SearchOutlined />} placeholder="Cari" value={cari} onChange={(e) => setCari(e.target.value)} style={{ width: 200 }} />
        {p.toolbar}
        {bisaTambah && <Button type="primary" icon={<PlusOutlined />} onClick={() => buka(null)}>Tambah</Button>}
      </Space>
    }>
      {p.deskripsi && <Typography.Paragraph type="secondary">{p.deskripsi}</Typography.Paragraph>}
      <Table<T> rowKey="id" size="small" loading={loading} dataSource={rows} columns={columns} scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        summary={p.summary ? () => p.summary!(rows) : undefined} />
      <Modal open={open} title={`${editing ? 'Ubah' : 'Tambah'} ${p.title}`} onCancel={() => setOpen(false)} onOk={simpan}
        okText="Simpan" cancelText="Batal" width={p.modalWidth ?? 640} destroyOnClose>
        <Form form={form} layout="vertical" preserve={false}>
          {p.fields.filter((f) => f.form !== false).map((f) => (
            <Form.Item key={f.name} name={f.name as string} label={f.label} help={f.help}
              rules={f.required ? [{ required: true, message: `${f.label} wajib diisi` }] : undefined}
              valuePropName={f.type === 'switch' ? 'checked' : 'value'}>
              {f.input ?? (
                f.type === 'money' ? <MoneyInput /> :
                f.type === 'number' ? <InputNumber style={{ width: '100%' }} /> :
                f.type === 'date' ? <DateInput /> :
                f.type === 'select' ? <Select options={f.options} showSearch optionFilterProp="label" /> :
                f.type === 'multiselect' ? <Select mode="multiple" options={f.options} /> :
                f.type === 'textarea' ? <Input.TextArea rows={3} /> :
                f.type === 'switch' ? <Switch /> :
                <Input />
              )}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </Card>
  );
}
