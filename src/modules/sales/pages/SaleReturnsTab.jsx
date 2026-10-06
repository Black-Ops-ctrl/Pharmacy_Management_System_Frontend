import { useState } from 'react';
import useBarcodeScanner from '../../../hooks/useBarcodeScanner';
import { FaPlus, FaUndoAlt, FaEye, FaFilePdf, FaPrint } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import GlassModal from '../../../components/common/GlassModal';
import ExportButtons from '../../../components/common/ExportButtons';
import RowActions from '../../../components/common/RowActions';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormField';
import { savePdfListReport, exportExcel, printRecord, savePdfRecord } from '../../../utils/printFormat';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { money, num, fmtDate, fmtDateTime } from '../../../utils/format';

const refundMethods = ['Cash Refund', 'Store Credit', 'Exchange'];
const emptyForm = { invoiceId: '', lineKey: '', qty: '', refundMethod: refundMethods[0], reason: '' };
const lineKeyOf = (l) => `${l.medicine_id}|${l.sale_type}`;

const itemQty = (it) => {
  const f = Number(it.meta?.factor) || 1;
  return `${num((Number(it.qty) || 0) / f)} ${it.meta?.unit_label || ''}`.trim();
};

const SaleReturnsTab = () => {
  const { can } = useAuth();
  const toast = useToast();
  const cPrint = can('sale-returns', 'print');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [invoiceLines, setInvoiceLines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(false);

  const { data: returns, loading, error, reload } = useApi('/sale-returns', { from: dateFrom, to: dateTo });
  const { data: saleLov } = useApi('/lov/sales', null, { enabled: showAddModal });

  const statusColor = { 'Completed': 'green', 'Pending Approval': 'amber', 'Rejected': 'red' };

  const filtered = returns.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (r.doc_no || '').toLowerCase().includes(q) ||
      (r.invoice_no || '').toLowerCase().includes(q) ||
      (r.customer_name || '').toLowerCase().includes(q) ||
      (r.medicines || '').toLowerCase().includes(q);
  });

  const filterKey = [searchTerm, dateFrom, dateTo].join('|');
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const listColumns = [
    { key: 'ref', label: 'Return Ref' },
    { key: 'date', label: 'Date' },
    { key: 'invoice', label: 'Invoice' },
    { key: 'customer', label: 'Customer' },
    { key: 'medicine', label: 'Medicine(s)' },
    { key: 'refundMethod', label: 'Refund Method' },
    { key: 'amount', label: 'Amount (Rs.)', align: 'right' },
    { key: 'status', label: 'Status' },
  ];
  const listRows = filtered.map((r) => ({
    ref: r.doc_no, date: fmtDate(r.txn_date), invoice: r.invoice_no || '', customer: r.customer_name || 'Walk-in Customer',
    medicine: r.qty_summary || r.medicines || '', refundMethod: r.refund_method || '', amount: money(r.total), status: r.status || '',
  }));
  const listTotals = { amount: money(filtered.reduce((s, r) => s + (Number(r.total) || 0), 0)) };
  const listArgs = { title: 'Sale Returns Report', dateFrom, dateTo, columns: listColumns, rows: listRows, totals: listTotals };
  const doPdfList = () => savePdfListReport({ ...listArgs, fileName: 'Sale_Returns_Report' });
  const doExcel = () => exportExcel({ fileName: 'Sale_Returns', columns: listColumns, rows: listRows });

  const loadReturn = async (id) => {
    try {
      return await api.get(`/sale-returns/${id}`);
    } catch (err) {
      toast.error('Could not load return', err.message);
      return null;
    }
  };
  const recordFor = (r) => ({
    title: 'Sale Return', subtitle: r.doc_no,
    info: [
      { label: 'Return Ref', value: r.doc_no },
      { label: 'Date', value: fmtDateTime(r.txn_date) },
      { label: 'Against Invoice', value: r.ref_doc_no || '' },
      { label: 'Customer', value: r.party_name || 'Walk-in Customer' },
      { label: 'Branch', value: r.branch_name || '' },
      { label: 'Refund Method', value: r.meta?.refund_method || '' },
      { label: 'Reason', value: r.meta?.reason || '' },
      { label: 'Status', value: r.status || '' },
    ],
    items: {
      columns: [
        { key: 'medicine', label: 'Medicine' },
        { key: 'batch', label: 'Batch' },
        { key: 'qty', label: 'Qty', align: 'right' },
        { key: 'amount', label: 'Amount', align: 'right' },
      ],
      rows: (r.items || []).map((it) => ({ medicine: it.medicine, batch: it.batch_no || '', qty: itemQty(it), amount: money(it.amount) })),
      totals: { amount: money(r.total) },
    },
  });
  const printOne = async (row) => { const r = row.items ? row : await loadReturn(row.id); if (r) printRecord(recordFor(r)); };
  const pdfOne = async (row) => { const r = row.items ? row : await loadReturn(row.id); if (r) savePdfRecord({ ...recordFor(r), fileName: r.doc_no }); };
  const viewOne = async (row) => { const r = await loadReturn(row.id); if (r) setViewing(r); };

  const deleteOne = async (r) => {
    if (!window.confirm(`Delete return ${r.doc_no}?`)) return;
    try {
      const res = await api.del(`/sale-returns/${r.id}`);
      toast.success(res.message || 'Sale return deleted');
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const openAdd = () => { setForm(emptyForm); setInvoiceLines([]); setShowAddModal(true); };
  const closeAdd = () => { if (!saving) setShowAddModal(false); };

  const pickInvoice = async (id) => {
    setForm((f) => ({ ...f, invoiceId: id, lineKey: '', qty: '' }));
    setInvoiceLines([]);
    if (!id) return;
    setLinesLoading(true);
    try {
      const d = await api.get(`/sale-returns/invoice/${id}/lines`);
      setInvoiceLines(d?.lines || []);
    } catch (err) {
      toast.error('Could not load invoice lines', err.message);
    } finally {
      setLinesLoading(false);
    }
  };

  useBarcodeScanner(showAddModal, (code) => {
    const c = String(code || '').replace(/\s+/g, '').toUpperCase();
    if (!c) return;
    const s = saleLov.find((x) => String(x.doc_no).toUpperCase() === c);
    if (!s) { toast.error('Invoice not found', `${c} is not in the recent invoices list`); return; }
    toast.success('Invoice scanned', s.doc_no);
    pickInvoice(s.id);
  });

  const invoiceOptions = saleLov.map((s) => ({
    value: s.id,
    label: `${s.doc_no} — ${s.customer_name || 'Walk-in Customer'} — ${money(s.total)}`,
  }));
  const lineOptions = invoiceLines.map((l) => ({
    value: lineKeyOf(l),
    label: `${l.medicine} — sold ${num(l.qty)} ${l.unit}, returnable ${num(l.returnable_qty)}`,
  }));
  const selLine = invoiceLines.find((l) => lineKeyOf(l) === form.lineKey);
  const refundPreview = selLine ? (Number(form.qty) || 0) * (Number(selLine.price) || 0) : 0;

  const handleSave = async () => {
    if (!form.invoiceId) { toast.error('Invoice is required', 'Select an invoice'); return; }
    if (!selLine) { toast.error('Medicine is required', 'Select a medicine'); return; }
    const qty = Number(form.qty);
    if (!form.qty || !(qty > 0)) { toast.error('Invalid quantity', 'Enter a quantity greater than 0'); return; }
    if (qty > Number(selLine.returnable_qty)) {
      toast.error('Invalid quantity', `Only ${num(selLine.returnable_qty)} ${selLine.unit} can be returned`);
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/sale-returns', {
        ref_txn_id: Number(form.invoiceId),
        refund_method: form.refundMethod,
        reason: form.reason,
        items: [{ medicine_id: selLine.medicine_id, sale_type: selLine.sale_type, qty }],
      });
      toast.success(res.message || 'Sale return saved');
      setShowAddModal(false);
      setForm(emptyForm);
      setInvoiceLines([]);
      reload();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Sale Returns"
        actions={
          <>
            <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
            <ExportButtons onExcel={cPrint ? doExcel : undefined} onPdf={cPrint ? doPdfList : undefined} />
            {can('sale-returns', 'create') && (
              <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <FaPlus size={12} /> New Return
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search sale return" />
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[850px] sm:min-w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Return Ref</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Date</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Invoice</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Customer</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Medicine(s)</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Refund Method</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Amount</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || error || currentItems.length === 0 ? (
                <tr className="animate-fade-in">
                  <td colSpan="9" className="px-3 py-6 text-center text-[14px] text-white/40" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {loading ? 'Loading…' : error || 'No sale returns found'}
                  </td>
                </tr>
              ) : (
                currentItems.map((r, index) => (
                  <tr
                    key={r.id}
                    className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                    style={{ animationFillMode: 'both' }}
                  >
                    <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{r.doc_no}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{fmtDate(r.txn_date)}</td>
                    <td className="px-2 py-1.5 text-white/80 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{r.invoice_no}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{r.customer_name || 'Walk-in Customer'}</td>
                    <td className="px-2 py-1.5 text-white text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{r.qty_summary || r.medicines}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{r.refund_method}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(r.total)}</td>
                    <td className="px-2 py-1.5"><StatusBadge label={r.status} color={statusColor[r.status] || 'gray'} /></td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <RowActions
                        onView={() => viewOne(r)}
                        onPrint={cPrint ? () => printOne(r) : undefined}
                        onPdf={cPrint ? () => pdfOne(r) : undefined}
                        onDelete={can('sale-returns', 'delete') ? () => deleteOne(r) : undefined}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} />
      </div>

      {viewing && (
        <GlassModal
          title={`Sale Return ${viewing.doc_no}`}
          icon={<FaEye className="text-white text-xs" />}
          onClose={() => setViewing(null)}
          maxWidth="max-w-md"
          footer={
            <>
              <button onClick={() => setViewing(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Close</button>
              {cPrint && <button onClick={() => pdfOne(viewing)} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <FaFilePdf size={10} /> PDF
              </button>}
              {cPrint && <button onClick={() => printOne(viewing)} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <FaPrint size={10} /> Print
              </button>}
            </>
          }
        >
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              ['Against Invoice', viewing.ref_doc_no],
              ['Date / Time', fmtDateTime(viewing.txn_date)],
              ['Customer', viewing.party_name || 'Walk-in Customer'],
              ['Refund Method', viewing.meta?.refund_method],
            ].map(([label, value]) => (
              <div key={label} className="p-2 rounded-sm bg-white/5 border border-white/20">
                <p className="text-white/60 text-[11px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{label}</p>
                <p className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{value || '—'}</p>
              </div>
            ))}
          </div>
          {viewing.meta?.reason && (
            <div className="p-2 mb-3 rounded-sm bg-white/5 border border-white/20">
              <p className="text-white/60 text-[11px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Reason</p>
              <p className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{viewing.meta.reason}</p>
            </div>
          )}
          <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>Returned Items</p>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
            {(viewing.items || []).map((it, i) => (
              <div key={it.id || i} className="flex justify-between items-center p-2 rounded-sm bg-white/5 border border-white/20">
                <div>
                  <p className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{it.medicine}</p>
                  <p className="text-white/60 text-[11px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Batch: {it.batch_no || '—'} — {itemQty(it)}</p>
                </div>
                <span className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(it.amount)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-sm bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-white/20 text-center">
            <p className="text-white text-[10px] uppercase tracking-wider" style={{ fontFamily: 'Poppins, sans-serif' }}>Refund Total</p>
            <p className="text-white text-lg font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(viewing.total)}</p>
          </div>
        </GlassModal>
      )}

      {showAddModal && (
        <GlassModal
          title="New Sale Return"
          icon={<FaUndoAlt className="text-white text-xs" />}
          onClose={closeAdd}
          footer={
            <>
              <button onClick={closeAdd} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ fontFamily: 'Poppins, sans-serif' }}>{saving ? 'Saving…' : 'Save Return'}</button>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="sm:col-span-2">
              <FormSelect label="Invoice" required placeholder="Select invoice" options={invoiceOptions} value={form.invoiceId} onChange={(e) => pickInvoice(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <FormSelect
                label="Medicine"
                required
                placeholder={linesLoading ? 'Loading…' : 'Select medicine'}
                options={lineOptions}
                value={form.lineKey}
                onChange={(e) => setForm({ ...form, lineKey: e.target.value, qty: '' })}
              />
            </div>
            <FormInput
              label={`Quantity${selLine ? ` (${selLine.unit}, max ${num(selLine.returnable_qty)})` : ''}`}
              required
              type="text"
              inputMode="numeric"
              placeholder="Enter quantity"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
            />
            <FormSelect label="Refund Method" options={refundMethods} value={form.refundMethod} onChange={(e) => setForm({ ...form, refundMethod: e.target.value })} />
            <div className="sm:col-span-2">
              <FormTextarea label="Reason" placeholder="Enter reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            {selLine && (
              <div className="sm:col-span-2 p-2 rounded-sm bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-white/20 flex justify-between items-center">
                <span className="text-white/70 text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Refund amount ({num(Number(form.qty) || 0)} {selLine.unit} × {money(selLine.price)})
                </span>
                <span className="text-white text-[14px] font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(refundPreview)}</span>
              </div>
            )}
          </div>
        </GlassModal>
      )}
    </>
  );
};

export default SaleReturnsTab;
