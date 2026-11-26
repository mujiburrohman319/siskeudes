// Render Laporan → PDF dengan pdfmake (dimuat dinamis agar bundle awal ringan).
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { rp } from '../format';
import type { Blok, Laporan } from './model';

const F4 = { width: 609.45, height: 935.43 };

function sel(v: unknown, uang?: boolean): string {
  if (v === null || v === undefined || v === '') return '';
  if (uang && typeof v === 'number') return rp(v);
  return String(v);
}

function blokKeContent(b: Blok): Content {
  switch (b.jenis) {
    case 'teks':
      return { text: b.teks, bold: b.tebal, italics: b.miring, alignment: b.rata === 'tengah' ? 'center' : b.rata === 'kanan' ? 'right' : 'left', fontSize: b.ukuran ?? 9, margin: [0, 2, 0, 4] };
    case 'kv':
      return {
        table: { widths: [120, 8, '*'], body: b.pasangan.map(([k, v]) => [{ text: k }, { text: ':' }, { text: v }]) },
        layout: 'noBorders', fontSize: 9, margin: [0, 2, 0, 6],
      };
    case 'garis':
      return { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 760, y2: 4, lineWidth: 0.5, dash: { length: 3 } }], margin: [0, 8, 0, 8] };
    case 'halaman':
      return { text: '', pageBreak: 'after' };
    case 'ttd': {
      const n = b.kolom.length;
      return {
        margin: [0, 16, 0, 0], unbreakable: true,
        columns: b.kolom.map((t, i) => ({
          width: '*', alignment: 'center', fontSize: 9,
          stack: [
            { text: i === n - 1 && b.tempatTgl ? b.tempatTgl : ' ' },
            { text: t.atas ?? ' ' },
            { text: t.jabatan, bold: true },
            { text: '\n\n\n\n' },
            { text: t.nama ? t.nama : '(.................................)', bold: true, decoration: t.nama ? 'underline' : undefined },
          ],
        })),
      };
    }
    case 'tabel': {
      const header: TableCell[] = b.kolom.map((k) => ({ text: k.judul, bold: true, alignment: 'center', fillColor: '#e8efe9' }));
      const body: TableCell[][] = [header, ...b.baris.map((r) => b.kolom.map((k, i) => ({
        text: sel(r.sel[i], k.uang),
        alignment: k.rata === 'kanan' ? 'right' : k.rata === 'tengah' ? 'center' : 'left',
        bold: r.tebal,
        fillColor: r.latar ? '#f3f3f3' : undefined,
        margin: [i === 1 && r.indent ? r.indent * 6 : 0, 0, 0, 0],
      }) as TableCell))];
      const tbl: Content = {
        table: { headerRows: 1, widths: b.kolom.map((k) => k.lebar ?? 'auto'), body, dontBreakRows: true },
        layout: { hLineWidth: () => 0.4, vLineWidth: () => 0.4, hLineColor: () => '#888', vLineColor: () => '#888', paddingTop: () => 2, paddingBottom: () => 2 },
        fontSize: 7.5, margin: [0, 2, 0, 8],
      };
      return b.judul ? { stack: [{ text: b.judul, bold: true, fontSize: 9, margin: [0, 6, 0, 2] }, tbl] } : tbl;
    }
  }
}

export function definisiPdf(l: Laporan, kertas: 'A4' | 'F4'): TDocumentDefinitions {
  const dicetak = new Date().toLocaleString('id-ID');
  return {
    pageSize: kertas === 'F4' ? F4 : 'A4',
    pageOrientation: l.orientasi,
    pageMargins: [32, 32, 32, 40],
    watermark: l.draft ? { text: 'DRAFT', opacity: 0.12, bold: true } : undefined,
    defaultStyle: { fontSize: 9 },
    footer: (cur, total) => ({
      columns: [
        { text: `Dicetak oleh SISKEUDES-Web, ${dicetak}`, fontSize: 7, color: '#777' },
        { text: `Halaman ${cur} dari ${total}`, alignment: 'right', fontSize: 7, color: '#777' },
      ],
      margin: [32, 12, 32, 0],
    }),
    content: [
      { text: `PEMERINTAH ${l.kop.pemda.toUpperCase()}`, alignment: 'center', bold: true, fontSize: 10 },
      { text: `KECAMATAN ${l.kop.kecamatan.toUpperCase()} — DESA ${l.kop.desa.toUpperCase()}`, alignment: 'center', bold: true, fontSize: 10 },
      { canvas: [{ type: 'line', x1: 0, y1: 4, x2: l.orientasi === 'landscape' ? 770 : 530, y2: 4, lineWidth: 1 }], margin: [0, 2, 0, 6] },
      ...l.judul.map((j, i) => ({ text: j, alignment: 'center' as const, bold: i === 0, fontSize: i === 0 ? 11 : 9 })),
      { text: ' ', margin: [0, 0, 0, 4] },
      ...l.blok.map(blokKeContent),
    ],
  };
}

export async function unduhPdf(l: Laporan, kertas: 'A4' | 'F4') {
  const [{ default: pdfMake }, fonts] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]);
  const f = fonts as unknown as { pdfMake?: { vfs: Record<string, string> }; vfs?: Record<string, string>; default?: unknown };
  const vfs = f.pdfMake?.vfs ?? f.vfs ?? (f.default as { pdfMake?: { vfs: Record<string, string> }; vfs?: Record<string, string> })?.pdfMake?.vfs ?? (f.default as { vfs?: Record<string, string> })?.vfs ?? (f.default as Record<string, string>);
  (pdfMake as unknown as { vfs: Record<string, string> }).vfs = vfs;
  pdfMake.createPdf(definisiPdf(l, kertas)).download(`${l.namaFile}.pdf`);
}
