import { useMemo } from 'react';
import { useApp } from '../context/App';
import { useCol, useDocu } from './hooks';
import { petaAnggaran, postingTerakhir } from './keuangan';
import { desaCol, taCol, taDoc, type DesaCol, type TaCol } from './paths';
import type { Posting, SaldoAwal } from './types';

/** Langganan koleksi tingkat desa-tahun untuk desa aktif. */
export function useTa<T>(name: TaCol) {
  const { ctx } = useApp();
  return useCol<T>(ctx ? taCol(ctx, name) : null);
}

/** Langganan koleksi tingkat desa (lintas tahun). */
export function useDesaCol<T>(name: DesaCol) {
  const { ctx } = useApp();
  return useCol<T>(ctx ? desaCol(ctx, name) : null);
}

export function useSaldoAwal() {
  const { ctx } = useApp();
  return useDocu<SaldoAwal>(ctx ? taDoc(ctx, 'saldoAwal', 'main') : null);
}

/** Anggaran berlaku (posting terakhir). */
export function useAnggaran() {
  const { data: postings, loading } = useTa<Posting>('posting');
  return useMemo(() => {
    const p = postingTerakhir(postings);
    return { posting: p, postings: [...postings].sort((a, b) => a.no - b.no), peta: petaAnggaran(p?.rincian ?? []), loading };
  }, [postings, loading]);
}
