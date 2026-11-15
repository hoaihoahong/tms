// Xuất báo cáo: IN, Word, Excel - cùng một bố cục chuẩn (tên phòng ban, chữ ký Trưởng phòng và người lập biểu)
import { esc, fmtDate } from './ui.js';

/* spec = { title, subtitle, landscape, blocks:[{ heading, columns:[{label,text,width,align}], rows:[] }] }
   ctx  = { settings, user, headName } */

const pad = (n) => String(n).padStart(2, '0');
function dateLine(settings) {
  const d = new Date();
  return `${settings.place ? settings.place + ', ' : ''}ngày ${pad(d.getDate())} tháng ${pad(d.getMonth() + 1)} năm ${d.getFullYear()}`;
}

export function reportHTML(spec, ctx) {
  const { settings: s, user, headName } = ctx;
  const blocks = spec.blocks.map((b) => {
    const cols = b.columns;
    const head = `<tr><th style="width:36px">STT</th>${cols.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr>`;
    const body = b.rows.length
      ? b.rows.map((r, i) => `<tr><td class="c">${i + 1}</td>${cols.map((c) => `<td class="${c.align === 'c' ? 'c' : ''}">${esc(c.text(r))}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length + 1}" class="c"><i>Không có dữ liệu</i></td></tr>`;
    return `${b.heading ? `<h2 class="ph">${esc(b.heading)}</h2>` : ''}${b.note ? `<p style="margin:.1rem 0 .3rem;font-size:11pt">${esc(b.note)}</p>` : ''}<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }).join('');
  return `<div class="rpt">
    <table class="lay"><tr>
      <td style="width:50%"><div class="org">${esc(s.org_name)}</div><div class="dept">${esc(s.dept_name)}</div><div>—————</div></td>
      <td style="width:50%"><div style="font-size:11pt">Ngày in: ${fmtDate(new Date().toISOString())}</div><div style="font-size:11pt">Người in: ${esc(user.full_name)}</div></td>
    </tr></table>
    <h1 class="rt">${esc(spec.title)}</h1>
    ${spec.subtitle ? `<div class="sub">${esc(spec.subtitle)}</div>` : ''}
    ${blocks}
    <table class="lay" style="margin-top:14px"><tr><td style="width:50%"></td><td style="width:50%;font-style:italic">${esc(dateLine(s))}</td></tr>
    <tr><td><b>NGƯỜI LẬP BIỂU</b><br><i>(Ký, ghi rõ họ tên)</i><div class="sp"></div><b style="text-transform:none">${esc(user.full_name)}</b><br>${esc(user.position || '')}</td>
    <td><b>${esc((s.head_title || 'Trưởng phòng').toUpperCase())}</b><br><i>(Ký, ghi rõ họ tên)</i><div class="sp"></div><b style="text-transform:none">${esc(headName || '')}</b></td></tr></table>
  </div>`;
}

/* ---------- IN ---------- */
export function printReport(spec, ctx) {
  const area = document.getElementById('printArea');
  area.innerHTML = reportHTML(spec, ctx);
  let st = document.getElementById('pageStyle');
  if (!st) { st = document.createElement('style'); st.id = 'pageStyle'; document.head.append(st); }
  st.textContent = `@page { size: A4 ${spec.landscape ? 'landscape' : 'portrait'}; margin: 14mm 12mm; }`;
  setTimeout(() => window.print(), 120);
}

/* ---------- WORD (.doc) ---------- */
const WORD_CSS = `
body{font-family:"Times New Roman",serif;font-size:13pt}
.org{text-transform:uppercase;font-size:12pt}.dept{font-weight:bold;text-transform:uppercase;font-size:12pt}
table.lay{width:100%;border:none;border-collapse:collapse}table.lay td{border:none;text-align:center;vertical-align:top;padding:0}
h1.rt{text-align:center;font-size:17pt;text-transform:uppercase;margin:14pt 0 2pt}
.sub{text-align:center;font-style:italic;font-size:12pt}
h2.ph{font-size:13pt;margin:12pt 0 3pt}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #000;padding:3pt 5pt;font-size:11pt;vertical-align:top}
th{background:#E7E7E7;text-align:center}td.c{text-align:center}
table.lay td,table.lay th{border:none}.sp{height:70pt}`;
export function exportWord(spec, ctx, filename) {
  const orient = spec.landscape ? 'landscape' : 'portrait';
  const size = spec.landscape ? '841.9pt 595.3pt' : '595.3pt 841.9pt';
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(spec.title)}</title>
<style>@page Section1{size:${size};mso-page-orientation:${orient};margin:1.8cm 1.5cm 1.8cm 1.5cm}div.Section1{page:Section1}${WORD_CSS}</style></head><body><div class="Section1">${reportHTML(spec, ctx)}</div></body></html>`;
  download(new Blob(['﻿', html], { type: 'application/msword' }), filename + '.doc');
}

/* ---------- EXCEL (.xlsx) ---------- */
export async function exportExcel(spec, ctx, filename) {
  const { settings: s, user, headName } = ctx;
  const wb = new ExcelJS.Workbook(); wb.creator = user.full_name; wb.created = new Date();
  const ws = wb.addWorksheet('Báo cáo', { views: [{ showGridLines: false }] });
  const ncol = Math.max(...spec.blocks.map((b) => b.columns.length)) + 1;
  const widths = Array(ncol).fill(10); widths[0] = 6;
  spec.blocks.forEach((b) => b.columns.forEach((c, i) => { widths[i + 1] = Math.max(widths[i + 1], Math.min(55, Math.round((c.width || 140) / 7.2))); }));
  ws.columns = widths.map((w) => ({ width: w }));
  const font = (o = {}) => ({ name: 'Times New Roman', size: 12, ...o });
  const merged = (row, text, f, al = 'left', h) => { ws.mergeCells(row, 1, row, ncol); const c = ws.getCell(row, 1); c.value = text; c.font = f; c.alignment = { horizontal: al, vertical: 'middle', wrapText: true }; if (h) ws.getRow(row).height = h; return c; };
  const half = Math.ceil(ncol / 2);
  const two = (row, l, r, fl, fr) => { ws.mergeCells(row, 1, row, half); ws.mergeCells(row, half + 1, row, ncol);
    const a = ws.getCell(row, 1), b = ws.getCell(row, half + 1); a.value = l; b.value = r; a.font = fl; b.font = fr;
    a.alignment = b.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; };
  let r = 1;
  two(r++, s.org_name.toUpperCase(), `Ngày in: ${fmtDate(new Date().toISOString())}`, font({ size: 11 }), font({ size: 11, italic: true }));
  two(r++, s.dept_name.toUpperCase(), `Người in: ${user.full_name}`, font({ bold: true, size: 12 }), font({ size: 11, italic: true }));
  two(r++, '—————', '', font(), font());
  r++;
  merged(r, spec.title.toUpperCase(), font({ bold: true, size: 16 }), 'center', 30); r++;
  if (spec.subtitle) { merged(r, spec.subtitle, font({ italic: true, size: 11 }), 'center'); r++; }
  r++;
  const thin = { style: 'thin', color: { argb: 'FF000000' } }; const border = { top: thin, left: thin, bottom: thin, right: thin };
  let firstHeader = null;
  spec.blocks.forEach((b) => {
    if (b.heading) { merged(r, b.heading, font({ bold: true }), 'left', 22); r++; }
    if (b.note) { merged(r, b.note, font({ size: 11 }), 'left'); r++; }
    const hr = ws.getRow(r); if (!firstHeader) firstHeader = r;
    ['STT', ...b.columns.map((c) => c.label)].forEach((t, i) => { const c = hr.getCell(i + 1); c.value = t; c.font = font({ bold: true, size: 11 }); c.border = border;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E7E7' } }; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
    hr.height = 26; r++;
    if (!b.rows.length) { ws.mergeCells(r, 1, r, b.columns.length + 1); const c = ws.getCell(r, 1); c.value = 'Không có dữ liệu'; c.font = font({ italic: true, size: 11 }); c.alignment = { horizontal: 'center' }; c.border = border; r++; }
    b.rows.forEach((row, i) => {
      const rr = ws.getRow(r);
      [String(i + 1), ...b.columns.map((c) => c.text(row))].forEach((t, k) => { const c = rr.getCell(k + 1); c.value = t; c.font = font({ size: 11 }); c.border = border;
        c.alignment = { vertical: 'top', wrapText: true, horizontal: k === 0 || b.columns[k - 1]?.align === 'c' ? 'center' : 'left' }; });
      r++;
    });
    r++;
  });
  r++;
  const sigR = ncol - half;
  ws.mergeCells(r, half + 1, r, ncol); const dl = ws.getCell(r, half + 1); dl.value = dateLine(s); dl.font = font({ italic: true, size: 11 }); dl.alignment = { horizontal: 'center' }; r++;
  const sig = (col1, col2, title, name, extra) => { ws.mergeCells(r, col1, r, col2); ws.mergeCells(r + 1, col1, r + 1, col2); ws.mergeCells(r + 5, col1, r + 5, col2); if (extra) ws.mergeCells(r + 6, col1, r + 6, col2);
    const a = ws.getCell(r, col1), b = ws.getCell(r + 1, col1), c = ws.getCell(r + 5, col1);
    a.value = title; a.font = font({ bold: true }); b.value = '(Ký, ghi rõ họ tên)'; b.font = font({ italic: true, size: 11 }); c.value = name; c.font = font({ bold: true });
    [a, b, c].forEach((x) => (x.alignment = { horizontal: 'center' }));
    if (extra) { const e = ws.getCell(r + 6, col1); e.value = extra; e.font = font({ size: 11 }); e.alignment = { horizontal: 'center' }; } };
  sig(1, half, 'NGƯỜI LẬP BIỂU', user.full_name, user.position || '');
  sig(half + 1, ncol, (s.head_title || 'Trưởng phòng').toUpperCase(), headName || '', '');
  ws.pageSetup = { paperSize: 9, orientation: spec.landscape ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: .5, right: .5, top: .6, bottom: .6, header: .3, footer: .3 }, horizontalCentered: true };
  if (firstHeader) ws.pageSetup.printTitlesRow = `${firstHeader}:${firstHeader}`;
  ws.headerFooter = { oddFooter: '&C&"Times New Roman"&10Trang &P / &N' };
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename + '.xlsx');
}

function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
