import JsBarcode from 'jsbarcode';
import { getCompany, findBranch } from '../config/company';

const esc = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const amt = (v) => (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const stamp = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const receiptSettings = (c = getCompany()) => ({
  width: Number(c.receipt_width) === 58 ? 58 : 80,
  showLogo: c.receipt_show_logo !== false,
  showBarcode: c.receipt_show_barcode !== false,
  copies: Math.min(3, Math.max(1, Number(c.receipt_copies) || 1)),
  header: c.receipt_header || '',
  thanks: c.receipt_thanks || '',
  policy: c.receipt_policy || '',
});

const barcodeSvg = (text, small) => {
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, text, { format: 'CODE128', width: small ? 1 : 1.3, height: small ? 26 : 32, displayValue: false, margin: 0 });
    return new XMLSerializer().serializeToString(svg);
  } catch {
    return '';
  }
};

export function buildReceiptHtml(sale, company = getCompany(), settings = receiptSettings(company)) {
  const s = settings;
  const small = s.width === 58;
  const W = small ? 184 : 280;
  const br = findBranch(sale.branch_id) || findBranch(sale.branch_name) || {};
  const address = br.address || company.address || '';
  const contact = [company.phone ? `Ph: ${company.phone}` : '', company.ntn ? `NTN: ${company.ntn}` : ''].filter(Boolean);
  const cust = sale.party_name || (sale.meta && sale.meta.customer_name) || 'Walk-in Customer';
  const lines = sale.lines || [];
  const units = lines.reduce((a, l) => a + (Number(l.qty) || 0), 0);
  const pct = sale.meta && sale.meta.discount_pct;
  const kv = (k, v, cls = '') => `<div class="kv ${cls}"><span>${k}</span><span>${v}</span></div>`;
  const one = `<div class="r">
${s.showLogo && company.logo ? `<img class="logo" src="${company.logo}" alt=""/>` : ''}
${company.name ? `<div class="c name">${esc(company.name)}</div>` : ''}
${br.name ? `<div class="c b">${esc(br.name)}</div>` : ''}
${address ? `<div class="c">${esc(address)}</div>` : ''}
${contact.length ? `<div class="c">${contact.map(esc).join(' | ')}</div>` : ''}
${s.header ? `<div class="c">${esc(s.header)}</div>` : ''}
<div class="ln2"></div>
<div class="c title">SALE RECEIPT</div>
${kv('Invoice:', `<b>${esc(sale.doc_no)}</b>`)}
${kv('Date:', esc(stamp(sale.txn_date)))}
${sale.user_name ? kv('Cashier:', esc(sale.user_name)) : ''}
${kv('Customer:', esc(cust))}
<div class="ln"></div>
<div class="th"><span>Item</span><span>Amount</span></div>
<div class="ln"></div>
${lines.map((l) => `<div class="it"><div class="nm">${esc(l.medicine)}</div><div class="sub"><span>${esc(Number(l.qty))} ${esc(l.unit || '')} × ${amt(l.price)}</span><span>${amt(l.amount)}</span></div></div>`).join('')}
<div class="ln"></div>
${kv(`Items: ${lines.length} &nbsp; Qty: ${units}`, '')}
${kv('Subtotal', amt(sale.subtotal))}
${Number(sale.discount) ? kv(`Discount${pct ? ` (${esc(pct)}%)` : ''}`, `-${amt(sale.discount)}`) : ''}
<div class="ln2"></div>
${kv('TOTAL', `Rs. ${amt(sale.total)}`, 'grand')}
<div class="ln2"></div>
${kv('Payment:', `<b>${esc(sale.payment_method || '')}</b>`)}
${sale.payment_method === 'Credit' ? `<div class="box ft">Charged to credit account of ${esc(cust)}</div>` : ''}
<div class="ln"></div>
${s.thanks ? `<div class="c b">${esc(s.thanks)}</div>` : ''}
${s.policy ? `<div class="c ft" style="margin-top:3px">${esc(s.policy)}</div>` : ''}
${s.showBarcode && sale.doc_no ? `<div class="bc">${barcodeSvg(sale.doc_no, small)}</div>` : ''}
${company.print_footer_note ? `<div class="c ft" style="margin-top:4px">${esc(company.print_footer_note)}</div>` : ''}
</div>`;
  const copies = Array.from({ length: s.copies }, () => one).join('<div class="cut"></div>');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(sale.doc_no || 'Receipt')}</title><style>
@page{size:${s.width}mm auto;margin:0}
*{box-sizing:border-box}html,body{margin:0;background:#fff}
.r{width:${W}px;margin:0 auto;padding:${small ? 6 : 10}px ${small ? 2 : 4}px 14px;font-family:Arial,Helvetica,sans-serif;color:#000;font-size:${small ? 10 : 11.5}px;line-height:1.35}
.c{text-align:center}.b{font-weight:700}
.logo{height:${small ? 34 : 44}px;max-width:90%;object-fit:contain;filter:grayscale(1) contrast(1.4);display:block;margin:0 auto 2px}
.name{font-size:${small ? 14 : 17}px;font-weight:800;letter-spacing:.02em}
.ln{border-top:1px dashed #000;margin:5px 0}.ln2{border-top:2px solid #000;margin:5px 0}
.kv{display:flex;justify-content:space-between;gap:6px}
.title{font-weight:800;letter-spacing:.15em;font-size:${small ? 11 : 12.5}px;margin:2px 0}
.it{margin:3px 0}.it .nm{font-weight:700}.it .sub{display:flex;justify-content:space-between}
.th{display:flex;justify-content:space-between;font-weight:700;font-size:${small ? 9 : 10.5}px}
.grand{font-size:${small ? 14 : 17}px;font-weight:800}
.box{border:1.5px solid #000;padding:3px 5px;margin-top:4px}
.ft{font-size:${small ? 9 : 10}px}
.bc{text-align:center;margin-top:6px}.bc svg{max-width:100%}
.cut{border-top:1px dashed #000;margin:10px 0;page-break-after:always}
</style></head><body>${copies}</body></html>`;
}

export function printReceipt(sale) {
  const html = buildReceiptHtml(sale);
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  const cleanup = () => setTimeout(() => { try { document.body.removeChild(iframe); } catch { } }, 1500);
  let done = false;
  const fire = () => { if (done) return; done = true; try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch { } cleanup(); };
  const img = doc.querySelector('img');
  if (img && !img.complete) { img.onload = fire; img.onerror = fire; setTimeout(fire, 1800); }
  else { setTimeout(fire, 300); }
}
