import { useState } from 'react';
import { FaEye, FaPrint, FaFilePdf, FaFileExcel, FaTimes, FaFileAlt } from 'react-icons/fa';
import SearchableSelect from '../../../components/common/SearchableSelect';
import GlassModal from '../../../components/common/GlassModal';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { money, num, fmtDate, today } from '../../../utils/format';
import { printListReport, printRecord, savePdfListReport, savePdfRecord, exportExcel } from '../../../utils/printFormat';

const REPORTS = [
  {
    key: 'sale-invoices', label: 'Sale Invoices', title: 'Sale Invoices Report', recordTitle: 'Sale Invoice',
    columns: [
      { key: 'ref', label: 'Invoice No' },
      { key: 'date', label: 'Date', date: true },
      { key: 'party', label: 'Customer' },
      { key: 'branch', label: 'Branch' },
      { key: 'payment', label: 'Payment' },
      { key: 'count', label: 'Items', align: 'right' },
      { key: 'status', label: 'Status' },
      { key: 'amount', label: 'Total (Rs.)', align: 'right', money: true, total: true },
    ],
  },
  {
    key: 'sale-returns', label: 'Sale Returns', title: 'Sale Returns Report', recordTitle: 'Sale Return',
    columns: [
      { key: 'ref', label: 'Return Ref' },
      { key: 'date', label: 'Date', date: true },
      { key: 'invoice', label: 'Against Invoice' },
      { key: 'party', label: 'Customer' },
      { key: 'medicine', label: 'Medicine' },
      { key: 'qty', label: 'Qty', align: 'right' },
      { key: 'refund', label: 'Refund' },
      { key: 'reason', label: 'Reason' },
      { key: 'amount', label: 'Amount (Rs.)', align: 'right', money: true, total: true },
    ],
  },
  {
    key: 'purchases', label: 'Purchases (PO)', title: 'Purchases Report', recordTitle: 'Purchase Order',
    columns: [
      { key: 'ref', label: 'PO No' },
      { key: 'date', label: 'Date', date: true },
      { key: 'party', label: 'Supplier' },
      { key: 'branch', label: 'Branch' },
      { key: 'count', label: 'Items', align: 'right' },
      { key: 'qty', label: 'Total Qty', align: 'right' },
      { key: 'status', label: 'Status' },
      { key: 'amount', label: 'Total (Rs.)', align: 'right', money: true, total: true },
    ],
  },
  {
    key: 'grn', label: 'Goods Receiving (GRN)', title: 'GRN Report', recordTitle: 'Goods Receipt Note',
    columns: [
      { key: 'ref', label: 'GRN No' },
      { key: 'date', label: 'Date', date: true },
      { key: 'invoice', label: 'Against PO' },
      { key: 'party', label: 'Supplier' },
      { key: 'branch', label: 'Branch' },
      { key: 'count', label: 'Lines', align: 'right' },
      { key: 'qty', label: 'Total Qty', align: 'right' },
      { key: 'status', label: 'Status' },
      { key: 'amount', label: 'Total Cost (Rs.)', align: 'right', money: true, total: true },
    ],
  },
  {
    key: 'purchase-returns', label: 'Purchase Returns', title: 'Purchase Returns Report', recordTitle: 'Purchase Return',
    columns: [
      { key: 'ref', label: 'Return Ref' },
      { key: 'date', label: 'Date', date: true },
      { key: 'invoice', label: 'Against GRN' },
      { key: 'party', label: 'Supplier' },
      { key: 'medicine', label: 'Medicine' },
      { key: 'batch', label: 'Batch' },
      { key: 'qty', label: 'Qty', align: 'right' },
      { key: 'reason', label: 'Reason' },
      { key: 'amount', label: 'Amount (Rs.)', align: 'right', money: true, total: true },
    ],
  },
];

const LINE_COLUMNS = [
  { key: 'medicine', label: 'Medicine' },
  { key: 'batch', label: 'Batch' },
  { key: 'qty', label: 'Qty', align: 'right' },
  { key: 'price', label: 'Price', align: 'right', money: true },
  { key: 'amount', label: 'Amount', align: 'right', money: true },
];

const fmtCell = (col, val) => {
  if (col.money) return money(val);
  if (col.date) return fmtDate(val);
  return String(val ?? '');
};
const firstOfMonth = () => `${today().slice(0, 8)}01`;

const PrintReportsPanel = () => {
  const { can } = useAuth();
  const toast = useToast();
  const canPrint = can('reports', 'print');
  const [typeKey, setTypeKey] = useState(REPORTS[0].key);
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [viewing, setViewing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const report = REPORTS.find((r) => r.key === typeKey) || REPORTS[0];
  const { data, loading, error } = useApi('/reports/documents', { type: report.key, from, to });
  const rows = Array.isArray(data) ? data : [];
  const totalCol = report.columns.find((c) => c.total);
  const grand = totalCol ? rows.filter((r) => r.status !== 'Cancelled').reduce((s, r) => s + (Number(r[totalCol.key]) || 0), 0) : null;

  const listArgs = () => {
    const columns = report.columns.map((c) => ({ key: c.key, label: c.label, align: c.align }));
    const printRows = rows.map((r) => {
      const o = {};
      report.columns.forEach((c) => { o[c.key] = fmtCell(c, r[c.key]); });
      return o;
    });
    const totals = totalCol ? { [totalCol.key]: money(grand) } : undefined;
    return { title: report.title, dateFrom: from, dateTo: to, columns, rows: printRows, totals };
  };
  const guardEmpty = () => { if (!rows.length) { toast.warn('Nothing to export', 'No records in this date range'); return true; } return false; };
  const printList = () => { if (!guardEmpty()) printListReport(listArgs()); };
  const pdfList = () => { if (!guardEmpty()) savePdfListReport({ ...listArgs(), fileName: report.title.replace(/\s+/g, '_') }); };
  const excelList = () => { if (guardEmpty()) return; const a = listArgs(); exportExcel({ fileName: report.title.replace(/\s+/g, '_'), columns: a.columns, rows: a.rows }); };

  const loadDoc = async (r) => {
    setBusyId(r.id);
    try {
      return await api.get(`/reports/documents/${r.id}`);
    } catch (err) {
      toast.error('Could not load document', err.message);
      return null;
    } finally {
      setBusyId(null);
    }
  };
  const recordArgs = (r, doc) => {
    const info = report.columns
      .filter((c) => r[c.key] !== null && r[c.key] !== undefined && r[c.key] !== '')
      .map((c) => ({ label: c.label, value: fmtCell(c, r[c.key]) }));
    if (doc && Number(doc.discount)) info.push({ label: 'Discount', value: money(doc.discount) });
    if (doc && Number(doc.tax)) info.push({ label: 'Tax', value: money(doc.tax) });
    const lines = (doc && doc.lines) || [];
    const items = {
      columns: LINE_COLUMNS.map((c) => ({ key: c.key, label: c.label, align: c.align })),
      rows: lines.map((it) => {
        const o = {};
        LINE_COLUMNS.forEach((c) => { o[c.key] = fmtCell(c, it[c.key]); });
        return o;
      }),
      totals: { amount: money(lines.reduce((s, it) => s + (Number(it.amount) || 0), 0)) },
    };
    return { title: report.recordTitle, subtitle: r.ref, info, items };
  };
  const viewOne = async (r) => { const doc = await loadDoc(r); if (doc) setViewing({ row: r, doc }); };
  const printOne = async (r, doc) => { const d = doc || await loadDoc(r); if (d) printRecord(recordArgs(r, d)); };
  const pdfOne = async (r, doc) => { const d = doc || await loadDoc(r); if (d) savePdfRecord({ ...recordArgs(r, d), fileName: r.ref }); };

  const dateCls = 'bg-white/10 border border-white/40 rounded-sm px-2 py-1.5 text-white text-[13px] focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 [color-scheme:dark]';
  const colSpan = report.columns.length + 1;
  const msgRow = (text, cls = 'text-white/40') => (
    <tr><td colSpan={colSpan} className={`px-3 py-6 text-center ${cls} text-[14px]`} style={{ fontFamily: 'Poppins, sans-serif' }}>{text}</td></tr>
  );

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-col lg:flex-row lg:items-end gap-2 mb-3">
        <div className="w-full sm:w-56">
          <label className="text-white/60 text-[12px] uppercase tracking-wider block mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>Report Type</label>
          <SearchableSelect
            value={typeKey}
            onChange={setTypeKey}
            options={REPORTS.map((r) => ({ value: r.key, label: r.label }))}
            buttonClassName="w-full bg-white/10 border border-white/40 rounded-sm px-2.5 py-1.5 text-white text-[13px] focus:outline-none focus:border-purple-400"
          />
        </div>
        <div>
          <label className="text-white/60 text-[12px] uppercase tracking-wider block mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>From</label>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={dateCls} />
        </div>
        <div>
          <label className="text-white/60 text-[12px] uppercase tracking-wider block mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>To</label>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={dateCls} />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); }} title="Clear dates" className="w-8 h-8 rounded-sm bg-white/10 hover:bg-white/20 text-white/70 flex items-center justify-center transition-all">
            <FaTimes size={11} />
          </button>
        )}
        {canPrint && (
          <div className="lg:ml-auto flex items-center gap-1.5">
            <button onClick={printList} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <FaPrint size={12} /> Print
            </button>
            <button onClick={excelList} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <FaFileExcel size={12} /> Excel
            </button>
            <button onClick={pdfList} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <FaFilePdf size={12} /> PDF
            </button>
          </div>
        )}
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[850px] sm:min-w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {report.columns.map((c) => (
                  <th key={c.key} className={`px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
                ))}
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? msgRow('Loading…') : error ? msgRow(error, 'text-red-400') : rows.length === 0 ? msgRow('No records in this date range.') : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9">
                    {report.columns.map((c) => (
                      <td key={c.key} className={`px-2 py-1.5 text-white/90 text-[12px] whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                        {c.align === 'right' && !c.money ? num(r[c.key]) : fmtCell(c, r[c.key])}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => viewOne(r)} disabled={busyId === r.id} title="View" className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 text-white text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50">
                          <FaEye size={12} />
                        </button>
                        {canPrint && (
                          <button onClick={() => printOne(r)} disabled={busyId === r.id} title="Print" className="w-7 h-7 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50">
                            <FaPrint size={12} />
                          </button>
                        )}
                        {canPrint && (
                          <button onClick={() => pdfOne(r)} disabled={busyId === r.id} title="Save PDF" className="w-7 h-7 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50">
                            <FaFilePdf size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {grand != null && !loading && !error && rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/20 bg-white/5">
                  <td colSpan={report.columns.length - 1} className="px-2 py-2 text-right text-white text-[13px] font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>Total</td>
                  <td className="px-2 py-2 text-right text-white text-[13px] font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(grand)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <p className="text-white/40 text-[12.5px] mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {rows.length} record(s) · Print output uses the company letterhead (logo + name + info) with a "system generated" footer.
      </p>

      {viewing && (
        <GlassModal
          title={`${report.recordTitle} — ${viewing.row.ref}`}
          icon={<FaFileAlt className="text-white text-xs" />}
          maxWidth="max-w-3xl"
          onClose={() => setViewing(null)}
          footer={
            <>
              <button onClick={() => setViewing(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Close</button>
              {canPrint && (
                <button onClick={() => pdfOne(viewing.row, viewing.doc)} className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}><FaFilePdf size={10} /> PDF</button>
              )}
              {canPrint && (
                <button onClick={() => printOne(viewing.row, viewing.doc)} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}><FaPrint size={10} /> Print</button>
              )}
            </>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {recordArgs(viewing.row, viewing.doc).info.map((f) => (
              <div key={f.label} className="bg-white/5 border border-white/10 rounded-sm px-2 py-1.5">
                <div className="text-white/50 text-[11.5px] uppercase tracking-wider" style={{ fontFamily: 'Poppins, sans-serif' }}>{f.label}</div>
                <div className="text-white text-[13.5px] break-words" style={{ fontFamily: 'Poppins, sans-serif' }}>{f.value}</div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto custom-scrollbar border border-white/10 rounded-sm">
            <table className="w-full text-left border-collapse min-w-[480px]">
              <thead>
                <tr className="bg-white/5 border-b border-white/10" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {LINE_COLUMNS.map((c) => (
                    <th key={c.key} className={`px-2 py-1.5 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(viewing.doc.lines || []).length === 0 ? (
                  <tr><td colSpan={LINE_COLUMNS.length} className="px-3 py-4 text-center text-white/40 text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>No lines.</td></tr>
                ) : viewing.doc.lines.map((it, i) => (
                  <tr key={i} className="border-b border-white/10">
                    {LINE_COLUMNS.map((c) => (
                      <td key={c.key} className={`px-2 py-1.5 text-white/90 text-[12.5px] whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''}`} style={{ fontFamily: 'Poppins, sans-serif' }}>{fmtCell(c, it[c.key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {(viewing.doc.lines || []).length > 0 && (
                <tfoot>
                  <tr className="bg-white/5">
                    <td colSpan={LINE_COLUMNS.length - 1} className="px-2 py-1.5 text-right text-white text-[13px] font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>Total</td>
                    <td className="px-2 py-1.5 text-right text-white text-[13px] font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(viewing.doc.lines.reduce((s, it) => s + (Number(it.amount) || 0), 0))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </GlassModal>
      )}
    </div>
  );
};

export default PrintReportsPanel;
