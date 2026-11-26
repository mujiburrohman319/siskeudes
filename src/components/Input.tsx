import { DatePicker, InputNumber, Select, Tag } from 'antd';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useApp } from '../context/App';
import { PAJAK_LABEL } from '../lib/referensi';
import type { JenisPajak } from '../lib/types';

/** Input rupiah: tampil 1.500.000, nilai integer. */
export function MoneyInput(props: { value?: number; onChange?: (v: number) => void; disabled?: boolean; style?: React.CSSProperties; min?: number }) {
  return (
    <InputNumber<number>
      style={{ width: '100%', ...props.style }}
      value={props.value}
      min={props.min ?? 0}
      step={1000}
      disabled={props.disabled}
      formatter={(v) => (v === undefined || v === null || (v as unknown) === '' ? '' : Number(v).toLocaleString('id-ID'))}
      parser={(v) => Number((v ?? '').replace(/[^\d-]/g, '')) || 0}
      onChange={(v) => props.onChange?.(Math.round(Number(v) || 0))}
    />
  );
}

/** DatePicker yang memakai string ISO YYYY-MM-DD. */
export function DateInput(props: { value?: string; onChange?: (v: string) => void; disabled?: boolean; picker?: 'date' | 'month' }) {
  return (
    <DatePicker
      style={{ width: '100%' }}
      format="DD/MM/YYYY"
      value={props.value ? dayjs(props.value) : null}
      disabled={props.disabled}
      onChange={(d) => props.onChange?.(d ? d.format('YYYY-MM-DD') : '')}
    />
  );
}

/** Pilih rekening objek (level 4) dengan awalan tertentu. */
export function AkunSelect(props: { value?: string; onChange?: (v: string) => void; prefix?: string | string[]; pilihan?: string[]; disabled?: boolean; allowClear?: boolean }) {
  const { akun } = useApp();
  const opts = useMemo(() => {
    const prefs = props.prefix ? (Array.isArray(props.prefix) ? props.prefix : [props.prefix]) : null;
    return akun
      .filter((a) => a.level === 'OBJEK')
      .filter((a) => !prefs || prefs.some((p) => a.kode.startsWith(p)))
      .filter((a) => !props.pilihan || props.pilihan.includes(a.kode))
      .map((a) => ({ value: a.kode, label: `${a.kode}  ${a.nama}` }));
  }, [akun, props.prefix, props.pilihan]);
  return (
    <Select showSearch allowClear={props.allowClear} disabled={props.disabled} value={props.value} onChange={props.onChange}
      options={opts} optionFilterProp="label" placeholder="Pilih kode rekening" popupMatchSelectWidth={false} />
  );
}

/** Pilih kegiatan dari referensi (level kegiatan) atau daftar tertentu. */
export function KegiatanSelect(props: { value?: string; onChange?: (v: string) => void; pilihan?: { kode: string; nama: string }[]; disabled?: boolean; allowClear?: boolean }) {
  const { kegiatanRef } = useApp();
  const opts = useMemo(() => {
    const src = props.pilihan ?? kegiatanRef.filter((k) => k.level === 'KEGIATAN');
    return src.map((k) => ({ value: k.kode, label: `${k.kode}  ${k.nama}` }));
  }, [kegiatanRef, props.pilihan]);
  return (
    <Select showSearch allowClear={props.allowClear} disabled={props.disabled} value={props.value} onChange={props.onChange}
      options={opts} optionFilterProp="label" placeholder="Pilih kegiatan" popupMatchSelectWidth={false} />
  );
}

export function SumberDanaSelect(props: { value?: string; onChange?: (v: string) => void; pilihan?: string[]; disabled?: boolean; mode?: 'multiple' }) {
  const { sumberDana } = useApp();
  const opts = sumberDana
    .filter((s) => !props.pilihan || props.pilihan.includes(s.kode))
    .map((s) => ({ value: s.kode, label: `${s.kode} - ${s.nama}` }));
  return <Select value={props.value} onChange={props.onChange} options={opts} disabled={props.disabled} mode={props.mode} placeholder="Sumber dana" />;
}

export function KasSelect(props: { value?: string; onChange?: (v: string) => void; disabled?: boolean }) {
  return <Select value={props.value} onChange={props.onChange} disabled={props.disabled}
    options={[{ value: 'BANK', label: 'Kas di Bank' }, { value: 'TUNAI', label: 'Kas Tunai' }]} />;
}

export const PAJAK_OPTIONS = (Object.keys(PAJAK_LABEL) as JenisPajak[]).map((k) => ({ value: k, label: PAJAK_LABEL[k] }));

export function Uang({ v, tebal }: { v: number | undefined; tebal?: boolean }) {
  const n = Math.round(v ?? 0);
  const s = Math.abs(n).toLocaleString('id-ID');
  return <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: tebal ? 600 : undefined }}>{n < 0 ? `(${s})` : s}</span>;
}

const STATUS_WARNA: Record<string, string> = {
  DRAFT: 'default', DIVERIFIKASI: 'blue', DISETUJUI: 'geekblue', DICAIRKAN: 'orange', SELESAI: 'green', DITOLAK: 'red',
};
export function StatusTag({ s }: { s: string }) {
  const label: Record<string, string> = { DRAFT: 'Draft', DIVERIFIKASI: 'Diverifikasi', DISETUJUI: 'Disetujui', DICAIRKAN: 'Dicairkan (panjar)', SELESAI: 'Selesai', DITOLAK: 'Ditolak' };
  return <Tag color={STATUS_WARNA[s]}>{label[s] ?? s}</Tag>;
}
