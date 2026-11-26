import type { Ctx } from '../paths';
import type { Desa, KonfigurasiKab } from '../types';
import { ambilData } from './data';
import { buatLaporan, type ParamLap } from './generator';

/** Susun laporan lalu unduh sebagai PDF (bawaan) atau Excel. */
export async function cetakLaporan(kode: string, o: ParamLap & { ctx: Ctx; desa: Desa; konfig: KonfigurasiKab; format?: 'pdf' | 'xlsx' }) {
  const d = await ambilData(o.ctx, o.desa, o.konfig);
  const lap = buatLaporan(kode, d, o);
  if (o.format === 'xlsx') {
    const { unduhExcel } = await import('./excel');
    await unduhExcel(lap);
  } else {
    const { unduhPdf } = await import('./pdf');
    await unduhPdf(lap, o.konfig.kertas ?? 'A4');
  }
  return lap;
}
