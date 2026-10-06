import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCompany, findBranch } from '../config/company';

const branchOf = (branch, info) => {
  if (branch) return findBranch(branch);
  const row = (info || []).find((p) => String(p.label).toLowerCase() === 'branch');
  return row ? findBranch(row.value) : null;
};

function letterhead(branch) {
  const c = getCompany();
  const b = branch && (branch.address || branch.phone || branch.name) ? branch : null;
  const address = (b && b.address) || c.address || '';
  const phone = (b && b.phone) || c.phone || '';
  return {
    name: c.name || '',
    branchName: b ? b.name || '' : '',
    address,
    contact: [phone ? `Ph: ${phone}` : '', c.ntn ? `NTN: ${c.ntn}` : '', c.email || '', c.website || ''].filter(Boolean),
    note: c.print_footer_note || '',
    logo: c.logo || null,
  };
}

const esc = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CSS = `
  *{box-sizing:border-box}
  body{margin:0;background:#fff;color:#111;font-family:'Poppins',Arial,sans-serif;}
  .page{padding:30px 34px 22px;font-size:12px}
  .head{text-align:center}
  .head .logo{height:58px;object-fit:contain}
  .head .logo{display:block;margin:0 auto;max-width:180px;background:none}
  .head .name{font-size:20px;font-weight:800;letter-spacing:.04em;margin-top:6px;color:#111}
  .head .branch{font-size:12px;font-weight:700;color:#222;margin-top:2px}
  .head .addr{font-size:11px;color:#333;margin-top:2px}
  .head .contact{font-size:10px;color:#555;margin-top:2px}
  .rule{border:0;border-top:2px solid #111;margin:12px 0}
  .title{text-align:center;font-size:14px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin:6px 0 10px}
  .meta{display:flex;justify-content:space-between;font-size:11px;color:#333;border:1px solid #ccc;background:#f6f6f6;padding:6px 10px;border-radius:4px;margin-bottom:8px}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{padding:7px 9px;text-align:left;font-size:11px}
  th{background:#2b2b2b;color:#fff;font-size:10.5px;text-transform:uppercase;letter-spacing:.03em}
  td{border-bottom:1px solid #e2e2e2}
  .num{text-align:right;white-space:nowrap}
  tfoot td{border-top:2px solid #2b2b2b;background:#f2f2f2;font-weight:700}
  .tot-l{text-align:right}
  .kv{width:100%;border-collapse:collapse;margin-top:4px}
  .kv td{border-bottom:1px solid #eee;font-size:11.5px;padding:6px 8px}
  .kv td.k{color:#555;width:45%}
  .kv td.v{font-weight:600;text-align:right}
  .sub{font-size:11px;color:#333;text-align:center;margin:2px 0 10px}
  .ib{width:100%;border-collapse:collapse;margin-bottom:10px}
  .ib td{border:1px solid #c8c8c8;padding:5px 8px;font-size:11px}
  .ib td.k{background:#f1f1f4;color:#444;width:17%}
  .ib td.v{font-weight:600;width:33%}
  .sysnote{margin-top:20px;text-align:center;font-style:italic;color:#555;font-size:11px}
  @page{size:auto;margin:0}
  @media print{ .page{padding:12mm 12mm 10mm} }
`;

function shell({ title, subtitle, metaLeft, metaRight, bodyHtml, branch }) {
  const h = letterhead(branch);
  const meta = (metaLeft || metaRight)
    ? `<div class="meta"><span>${metaLeft || ''}</span><span>${metaRight || ''}</span></div>`
    : '';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${esc(title)}</title><style>${CSS}</style></head>
    <body><div class="page">
      <div class="head">
        ${h.logo ? `<img src="${h.logo}" class="logo" alt=""/>` : ''}
        ${h.name ? `<div class="name">${esc(h.name)}</div>` : ''}
        ${h.branchName ? `<div class="branch">${esc(h.branchName)}</div>` : ''}
        ${h.address ? `<div class="addr">${esc(h.address)}</div>` : ''}
        ${h.contact.length ? `<div class="contact">${h.contact.map(esc).join(' &nbsp;|&nbsp; ')}</div>` : ''}
      </div>
      <hr class="rule"/>
      <div class="title">${esc(title)}</div>
      ${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ''}
      ${meta}
      ${bodyHtml}
      ${h.note ? `<div class="sysnote">${esc(h.note)}</div>` : ''}
    </div></body></html>`;
}

function printHtml(html) {
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  const cleanup = () => setTimeout(() => { try { document.body.removeChild(iframe); } catch { } }, 1200);
  const fire = () => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch { } cleanup(); };
  const img = doc.querySelector('img');
  if (img && !img.complete) { img.onload = fire; img.onerror = fire; setTimeout(fire, 1800); }
  else { setTimeout(fire, 350); }
}

export function printListReport({ title, dateFrom, dateTo, columns, rows, totals }) {
  const now = new Date();
  const gen = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
              now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const range = (dateFrom || dateTo) ? `${dateFrom || '…'} to ${dateTo || '…'}` : 'All dates';

  const thead = `<tr>${columns.map(c => `<th class="${c.align === 'right' ? 'num' : ''}">${esc(c.label)}</th>`).join('')}</tr>`;
  const tbody = rows.length
    ? rows.map(r => `<tr>${columns.map(c => `<td class="${c.align === 'right' ? 'num' : ''}">${esc(r[c.key])}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${columns.length}" style="text-align:center;color:#777;padding:14px">No records in this date range.</td></tr>`;

  let tfoot = '';
  if (totals) {
    const firstIdx = 0;
    const cells = columns.map((c, i) => {
      if (i === firstIdx) return `<td class="tot-l">Total</td>`;
      if (c.key in totals) return `<td class="${c.align === 'right' ? 'num' : ''}">${esc(totals[c.key])}</td>`;
      return `<td></td>`;
    }).join('');
    tfoot = `<tfoot><tr>${cells}</tr></tfoot>`;
  }

  const bodyHtml = `<table><thead>${thead}</thead><tbody>${tbody}</tbody>${tfoot}</table>`;
  printHtml(shell({
    title,
    metaLeft: `<b>Date Range:</b> ${esc(range)}`,
    metaRight: `<b>Generated:</b> ${esc(gen)}`,
    bodyHtml,
  }));
}

export function printRecord({ title, subtitle, info = [], items, branch }) {
  const pairs = [];
  for (let i = 0; i < info.length; i += 2) pairs.push(info.slice(i, i + 2));
  const kv = info.length
    ? `<table class="ib">${pairs.map(r => `<tr>${r.map(p => `<td class="k">${esc(p.label)}</td><td class="v">${esc(p.value)}</td>`).join('')}${r.length < 2 ? '<td class="k"></td><td class="v"></td>' : ''}</tr>`).join('')}</table>`
    : '';
  let itemsHtml = '';
  if (items && items.rows && items.rows.length) {
    const thead = `<tr>${items.columns.map(c => `<th class="${c.align === 'right' ? 'num' : ''}">${esc(c.label)}</th>`).join('')}</tr>`;
    const tbody = items.rows.map(r => `<tr>${items.columns.map(c => `<td class="${c.align === 'right' ? 'num' : ''}">${esc(r[c.key])}</td>`).join('')}</tr>`).join('');
    let tfoot = '';
    if (items.totals) {
      const cells = items.columns.map((c, i) => {
        if (i === 0) return `<td class="tot-l">Total</td>`;
        if (c.key in items.totals) return `<td class="${c.align === 'right' ? 'num' : ''}">${esc(items.totals[c.key])}</td>`;
        return `<td></td>`;
      }).join('');
      tfoot = `<tfoot><tr>${cells}</tr></tfoot>`;
    }
    itemsHtml = `<table><thead>${thead}</thead><tbody>${tbody}</tbody>${tfoot}</table>`;
  }
  printHtml(shell({ title, subtitle, bodyHtml: kv + itemsHtml, branch: branchOf(branch, info) }));
}

const moneyRe = /^(?:Rs\.?\s*)?-?[\d,]+(?:\.\d+)?$/;
const toCell = (v, numeric = false) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if ((numeric || /^Rs\.?\s/.test(s)) && moneyRe.test(s) && /\d/.test(s) && !/^0\d/.test(s.replace(/^Rs\.?\s*/, ''))) {
    const n = Number(s.replace(/^Rs\.?\s*/, '').replace(/,/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return s;
};

const csvCell = (v) => {
  const s = String(v == null ? '' : v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const safeName = (v) => String(v || 'report').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'report';

export function downloadCsv(lines, fileName) {
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${safeName(fileName)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const tableLines = (columns, rows, totals) => {
  const lines = [columns.map((c) => csvCell(c.label)).join(',')];
  (rows || []).forEach((r) => lines.push(columns.map((c) => csvCell(toCell(r[c.key], c.align === 'right'))).join(',')));
  if (totals) lines.push(columns.map((c, i) => (i === 0 ? 'Total' : csvCell(c.key in totals ? toCell(totals[c.key], true) : ''))).join(','));
  return lines;
};

export function exportCsv({ fileName, title, columns, rows, totals }) {
  downloadCsv(tableLines(columns, rows, totals), fileName || title);
}

export const exportExcel = exportCsv;

let _logoKey = null;
let _logoData = null;
function getLogoDataUrl() {
  const src = getCompany().logo;
  if (!src) return Promise.resolve(null);
  if (src === _logoKey) return Promise.resolve(_logoData);
  return new Promise((resolve) => {
    const done = (v) => { _logoKey = src; _logoData = v; resolve(v); };
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || 300, h = img.naturalHeight || 300;
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          done({ url: c.toDataURL('image/png'), w, h });
        } catch { done(null); }
      };
      img.onerror = () => done(null);
      img.src = src;
    } catch { done(null); }
  });
}

function nowStr() {
  const n = new Date();
  return n.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
         n.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

async function pdfHeader(doc, branch) {
  const pageW = doc.internal.pageSize.getWidth();
  const hd = letterhead(branch);
  let y = 40;
  const logo = await getLogoDataUrl();
  if (logo && logo.url) {
    const h = 46, w = Math.min(120, (logo.w / logo.h) * h);
    doc.addImage(logo.url, 'PNG', (pageW - w) / 2, y, w, h);
    y += h + 10;
  }
  if (hd.name) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(17);
    doc.text(hd.name, pageW / 2, y, { align: 'center' }); y += 15;
  }
  if (hd.branchName) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(40);
    doc.text(hd.branchName, pageW / 2, y, { align: 'center' }); y += 12;
  }
  if (hd.address) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60);
    doc.text(hd.address, pageW / 2, y, { align: 'center' }); y += 12;
  }
  if (hd.contact.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90);
    doc.text(hd.contact.join('   |   '), pageW / 2, y, { align: 'center' }); y += 8;
  }
  doc.setDrawColor(20); doc.setLineWidth(1.3); doc.line(40, y, pageW - 40, y); y += 6;
  return y;
}

function pdfFooter(doc, y) {
  const note = getCompany().print_footer_note;
  if (!note) return;
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(100);
  doc.text(note, pageW / 2, y + 22, { align: 'center' });
}

const rightCols = (columns) => {
  const s = {};
  columns.forEach((c, i) => { if (c.align === 'right') s[i] = { halign: 'right' }; });
  return s;
};

export async function savePdfListReport({ title, dateFrom, dateTo, columns, rows, totals, fileName }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = await pdfHeader(doc);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(17);
  doc.text(String(title).toUpperCase(), pageW / 2, y + 16, { align: 'center' }); y += 26;
  const range = (dateFrom || dateTo) ? `${dateFrom || '…'} to ${dateTo || '…'}` : 'All dates';
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60);
  doc.text(`Date Range: ${range}`, 40, y + 6);
  doc.text(`Generated: ${nowStr()}`, pageW - 40, y + 6, { align: 'right' }); y += 10;

  autoTable(doc, {
    startY: y + 6,
    head: [columns.map((c) => c.label)],
    body: rows.length ? rows.map((r) => columns.map((c) => r[c.key])) : [[{ content: 'No records in this date range.', colSpan: columns.length, styles: { halign: 'center', textColor: 120 } }]],
    foot: totals ? [columns.map((c, i) => (i === 0 ? 'Total' : (c.key in totals ? totals[c.key] : '')))] : undefined,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4, lineColor: [225, 225, 225], textColor: 30 },
    headStyles: { fillColor: [43, 43, 43], textColor: 255, fontSize: 10, halign: 'left' },
    footStyles: { fillColor: [242, 242, 242], textColor: 20, fontStyle: 'bold' },
    columnStyles: rightCols(columns),
    margin: { left: 40, right: 40 },
  });
  pdfFooter(doc, doc.lastAutoTable.finalY);
  doc.save((fileName || title) + '.pdf');
}

export async function savePdfRecord({ title, subtitle, info = [], items, fileName, branch }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = await pdfHeader(doc, branchOf(branch, info));
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(17);
  doc.text(String(title).toUpperCase(), pageW / 2, y + 16, { align: 'center' }); y += 22;
  if (subtitle) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(70); doc.text(String(subtitle), pageW / 2, y + 8, { align: 'center' }); y += 12; }

  const pdfPairs = [];
  for (let i = 0; i < info.length; i += 2) {
    const r = info.slice(i, i + 2);
    pdfPairs.push([r[0].label, String(r[0].value), r[1] ? r[1].label : '', r[1] ? String(r[1].value) : '']);
  }
  const keyCol = { fillColor: [241, 241, 244], textColor: 68, cellWidth: (pageW - 80) * 0.17 };
  const valCol = { fontStyle: 'bold', textColor: 20, cellWidth: (pageW - 80) * 0.33 };
  autoTable(doc, {
    startY: y + 8,
    body: pdfPairs,
    theme: 'grid',
    styles: { fontSize: 11, cellPadding: 4, lineColor: [200, 200, 200], lineWidth: 0.5 },
    columnStyles: { 0: keyCol, 1: valCol, 2: keyCol, 3: valCol },
    margin: { left: 40, right: 40 },
  });
  let endY = doc.lastAutoTable.finalY;

  if (items && items.rows && items.rows.length) {
    autoTable(doc, {
      startY: endY + 14,
      head: [items.columns.map((c) => c.label)],
      body: items.rows.map((r) => items.columns.map((c) => r[c.key])),
      foot: items.totals ? [items.columns.map((c, i) => (i === 0 ? 'Total' : (c.key in items.totals ? items.totals[c.key] : '')))] : undefined,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4, lineColor: [225, 225, 225], textColor: 30 },
      headStyles: { fillColor: [43, 43, 43], textColor: 255, fontSize: 10 },
      footStyles: { fillColor: [242, 242, 242], textColor: 20, fontStyle: 'bold' },
      columnStyles: rightCols(items.columns),
      margin: { left: 40, right: 40 },
    });
    endY = doc.lastAutoTable.finalY;
  }
  pdfFooter(doc, endY);
  doc.save((fileName || subtitle || title) + '.pdf');
}

export function exportRecordCsv({ fileName, title, subtitle, info = [], items }) {
  const lines = [[csvCell(title || 'Record'), subtitle ? csvCell(subtitle) : ''].filter(Boolean).join(',')];
  info.forEach((p) => lines.push(`${csvCell(p.label)},${csvCell(toCell(p.value))}`));
  if (items && items.rows && items.rows.length) {
    lines.push('');
    lines.push(...tableLines(items.columns, items.rows, items.totals));
  }
  downloadCsv(lines, fileName || subtitle || title || 'record');
}

export const exportRecordExcel = exportRecordCsv;
