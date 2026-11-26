// Render Laporan → Excel (.xlsx) dengan ExcelJS (dimuat dinamis).
import type { Laporan } from './model';

export async function unduhExcel(l: Laporan) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SISKEUDES-Web';
  const ws = wb.addWorksheet(l.kode.slice(0, 30), { pageSetup: { orientation: l.orientasi, paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const lebar = Math.max(4, ...l.blok.map((b) => (b.jenis === 'tabel' ? b.kolom.length : 3)));
  const judul = (t: string, bold = true) => {
    const r = ws.addRow([t]);
    ws.mergeCells(r.number, 1, r.number, lebar);
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(1).font = { bold };
  };
  judul(`PEMERINTAH ${l.kop.pemda.toUpperCase()}`);
  judul(`KECAMATAN ${l.kop.kecamatan.toUpperCase()} — DESA ${l.kop.desa.toUpperCase()}`);
  l.judul.forEach((j, i) => judul(j, i === 0));
  if (l.draft) judul('*** DRAFT ***');
  ws.addRow([]);
  const lebarKolom: number[] = Array(lebar).fill(12);
  for (const b of l.blok) {
    if (b.jenis === 'teks') ws.addRow([b.teks]).font = { bold: b.tebal, italic: b.miring };
    else if (b.jenis === 'kv') b.pasangan.forEach(([k, v]) => ws.addRow([k, ':', v]));
    else if (b.jenis === 'ttd') {
      ws.addRow([]);
      ws.addRow(b.kolom.map((t) => t.jabatan));
      ws.addRow([]); ws.addRow([]);
      ws.addRow(b.kolom.map((t) => t.nama ?? '(..........)')).font = { bold: true };
    } else if (b.jenis === 'tabel') {
      if (b.judul) ws.addRow([b.judul]).font = { bold: true };
      const h = ws.addRow(b.kolom.map((k) => k.judul));
      h.font = { bold: true };
      h.eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EFE9' } };
        c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
      for (const r of b.baris) {
        const row = ws.addRow(b.kolom.map((_, i) => r.sel[i] ?? null));
        if (r.tebal) row.font = { bold: true };
        b.kolom.forEach((k, i) => {
          const c = row.getCell(i + 1);
          c.border = { top: { style: 'hair' }, bottom: { style: 'hair' }, left: { style: 'thin' }, right: { style: 'thin' } };
          if (k.uang) { c.numFmt = '#,##0;(#,##0)'; c.alignment = { horizontal: 'right' }; }
          if (i === 1 && r.indent) c.alignment = { indent: r.indent };
          if (r.latar) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
          const len = String(r.sel[i] ?? '').length;
          lebarKolom[i] = Math.min(60, Math.max(lebarKolom[i], k.uang ? 16 : len + 2));
        });
      }
      ws.addRow([]);
    }
  }
  lebarKolom.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${l.namaFile}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
