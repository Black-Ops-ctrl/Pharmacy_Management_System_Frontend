import { useState } from 'react';
import { FaPlus, FaUndoAlt, FaPrint, FaFilePdf } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import GlassModal from '../../../components/common/GlassModal';
import ExportButtons from '../../../components/common/ExportButtons';
import RowActions from '../../../components/common/RowActions';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormField';
import { printListReport, savePdfListReport, exportExcel, printRecord, savePdfRecord } from '../../../utils/printFormat';
import { money, fmtDate } from '../../../utils/format';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

const REASONS = ['Short Expiry', 'Damaged in Transit', 'Wrong Item Delivered', 'Quality Issue', 'Overstock'];
const PR_STATUSES = ['Pending', 'Dispatched', 'Credited', 'Rejected'];
const statusColor = { 'Pending': 'amber', 'Dispatched': 'blue', 'Credited': 'green', 'Rejected': 'red' };
const emptyForm = () => ({ supplier: '', medicine: '', batch: '', qty: '', reason: REASONS[0], status: 'Pending', note: '' });

const PurchaseReturnsTab = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { data: returns, loading, error, reload } = useApi('/purchase-returns', { from: dateFrom, to: dateTo });
  const { data: supplierLov } = useApi('/lov/suppliers');
  const { data: medicineLov } = useApi('/lov/medicines', { all: 1 });

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const batchParams = { medicine_id: form.medicine };
  if (editing?.batch_id) batchParams.include_id = editing.batch_id;
  const { data: batchLov } = useApi('/lov/batches', batchParams, { enabled: showModal && !!form.medicine });

  const supplierOptions = supplierLov.map(s => ({ value: s.id, label: s.name }));
  const medicineOptions = medicineLov.map(m => ({ value: m.id, label: m.name }));
  const batchesForMed = form.medicine ? batchLov.filter(b => String(b.medicine_id) === String(form.medicine)) : [];
  const batchOptions = batchesForMed.map(b => ({
    value: b.id,
    label: `${b.batch_no} — ${b.branch_name || '—'} — qty ${b.qty} — exp ${(fmtDate(b.expiry) || '').slice(0, 7) || '—'}${b.supplier_name ? ` — ${b.supplier_name}` : ''}`,
  }));
  const selectedBatch = batchesForMed.find(b => String(b.id) === String(form.batch));
  const allowedQty = selectedBatch
    ? selectedBatch.qty + (editing && String(editing.batch_id) === String(selectedBatch.id) ? editing.qty : 0)
    : 0;

  const q = searchTerm.toLowerCase();
  const filtered = returns.filter((r) =>
    (r.doc_no || '').toLowerCase().includes(q) ||
    (r.supplier_name || '').toLowerCase().includes(q) ||
    (r.medicines || '').toLowerCase().includes(q) ||
    (r.batches || '').toLowerCase().includes(q)
  );

  const filterKey = JSON.stringify([searchTerm, dateFrom, dateTo]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const loadDoc = async (id) => {
    try {
      return await api.get(`/purchase-returns/${id}`);
    } catch (err) {
      toast.error('Could not load purchase return', err.message);
      return null;
    }
  };

  const listColumns = [
    { key: 'ref', label: 'Ref' },
    { key: 'date', label: 'Date' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'medicine', label: 'Medicine' },
    { key: 'batch', label: 'Batch' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'reason', label: 'Reason' },
    { key: 'amount', label: 'Amount (Rs.)', align: 'right' },
    { key: 'status', label: 'Status' },
  ];
  const listRows = filtered.map(r => ({ ref: r.doc_no, date: fmtDate(r.txn_date), supplier: r.supplier_name, medicine: r.medicines, batch: r.batches, qty: r.total_qty, reason: r.reason || '—', amount: money(r.total), status: r.status }));
  const listTotals = { amount: money(filtered.reduce((s, r) => s + (r.total || 0), 0)) };
  const listArgs = { title: 'Purchase Returns Report', dateFrom, dateTo, columns: listColumns, rows: listRows, totals: listTotals };
  const doPrintList = () => printListReport(listArgs);
  const doPdfList = () => savePdfListReport({ ...listArgs, fileName: 'Purchase_Returns_Report' });
  const doExcel = () => exportExcel({ fileName: 'Purchase_Returns', columns: listColumns, rows: listRows });
  const recordFor = (d) => ({
    branch: d.branch_name,
    title: 'Purchase Return', subtitle: d.doc_no,
    info: [
      { label: 'Return Ref', value: d.doc_no },
      { label: 'Date', value: fmtDate(d.txn_date) },
      { label: 'Supplier', value: d.party_name },
      { label: 'Reason', value: d.meta?.reason || '—' },
      { label: 'Status', value: d.status },
      { label: 'Note', value: d.notes || '—' },
      { label: 'Amount (Rs.)', value: money(d.total) },
    ],
    items: {
      columns: [
        { key: 'medicine', label: 'Medicine' },
        { key: 'batch', label: 'Batch' },
        { key: 'qty', label: 'Qty', align: 'right' },
        { key: 'unitCost', label: 'Unit Cost', align: 'right' },
        { key: 'amount', label: 'Amount', align: 'right' },
      ],
      rows: (d.items || []).map(it => ({ medicine: it.medicine, batch: it.batch_no || '—', qty: it.qty, unitCost: money(it.unit_price), amount: money(it.amount) })),
      totals: { amount: money(d.total) },
    },
  });
  const printOne = async (r) => { const d = r.items ? r : await loadDoc(r.id); if (d) printRecord(recordFor(d)); };
  const pdfOne = async (r) => { const d = r.items ? r : await loadDoc(r.id); if (d) savePdfRecord({ ...recordFor(d), fileName: d.doc_no }); };
  const handleView = async (r) => { const d = await loadDoc(r.id); if (d) setViewing(d); };

  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm()); };
  const openCreate = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = async (r) => {
    const d = await loadDoc(r.id);
    if (!d) return;
    const it = (d.items || [])[0] || {};
    setEditing({ id: d.id, batch_id: it.batch_id, qty: it.qty || 0 });
    setForm({
      supplier: d.party_id || '',
      medicine: it.medicine_id || '',
      batch: it.batch_id || '',
      qty: it.qty != null ? String(it.qty) : '',
      reason: d.meta?.reason || REASONS[0],
      status: d.status || 'Pending',
      note: d.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.supplier) { toast.error('Supplier is required', 'Select a supplier'); return; }
    if (!form.medicine) { toast.error('Medicine is required', 'Select a medicine'); return; }
    if (!form.batch) { toast.error('Batch is required', batchOptions.length ? 'Select a batch' : 'This medicine has no batch with stock'); return; }
    const qty = Number(form.qty);
    if (!form.qty || !Number.isInteger(qty) || qty <= 0) { toast.error('Invalid quantity', 'Enter a whole number of units greater than 0'); return; }
    if (selectedBatch && qty > allowedQty) { toast.error('Not enough stock', `Only ${allowedQty} units are available in this batch`); return; }
    const body = {
      party_id: form.supplier,
      reason: form.reason,
      note: form.note || null,
      status: form.status,
      items: [{ batch_id: form.batch, qty }],
    };
    setSaving(true);
    try {
      const res = editing ? await api.put(`/purchase-returns/${editing.id}`, body) : await api.post('/purchase-returns', body);
      toast.success(res.message || (editing ? 'Purchase return updated' : 'Purchase return saved'));
      closeModal();
      reload();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete purchase return ${r.doc_no}?`)) return;
    try {
      const res = await api.del(`/purchase-returns/${r.id}`);
      toast.success(res.message || 'Purchase return deleted');
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const canPrint = can('purchase-returns', 'print');

  return (
    <>
      <PageHeader
        title="Purchase Returns"
        actions={
          <>
            <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
            <ExportButtons onPrint={canPrint ? doPrintList : undefined} onExcel={canPrint ? doExcel : undefined} onPdf={canPrint ? doPdfList : undefined} />
            {can('purchase-returns', 'create') && (
              <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <FaPlus size={12} /> New Return
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search purchase return" />
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[950px] sm:min-w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Ref</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Date</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Supplier</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Medicine</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Batch</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Qty</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Reason</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Value</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || error || currentItems.length === 0 ? (
                <tr className="animate-fade-in">
                  <td colSpan="10" className="px-3 py-6 text-center text-[14px] text-white/40" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {loading ? 'Loading…' : error ? error : 'No purchase returns found'}
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
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{r.supplier_name}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{r.medicines || '—'}</td>
                    <td className="px-2 py-1.5 text-white/80 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{r.batches || '—'}</td>
                    <td className="px-2 py-1.5 text-red-400 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>-{r.total_qty}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{r.reason || '—'}</td>
                    <td className="px-2 py-1.5 text-white/80 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(r.total)}</td>
                    <td className="px-2 py-1.5"><StatusBadge label={r.status} color={statusColor[r.status]} /></td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <RowActions
                        onView={() => handleView(r)}
                        onEdit={can('purchase-returns', 'edit') ? () => openEdit(r) : undefined}
                        onPrint={canPrint ? () => printOne(r) : undefined}
                        onPdf={canPrint ? () => pdfOne(r) : undefined}
                        onDelete={can('purchase-returns', 'delete') ? () => handleDelete(r) : undefined}
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

      {showModal && (
        <GlassModal
          title={editing ? 'Edit Purchase Return' : 'New Purchase Return'}
          icon={<FaUndoAlt className="text-white text-xs" />}
          onClose={closeModal}
          footer={
            <>
              <button onClick={closeModal} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {saving ? 'Saving…' : editing ? 'Update Return' : 'Save Return'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FormSelect label="Supplier" required options={supplierOptions} value={form.supplier} placeholder="Select supplier" onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            <FormSelect label="Medicine" required options={medicineOptions} value={form.medicine} placeholder="Select medicine" onChange={(e) => setForm({ ...form, medicine: e.target.value, batch: '' })} />
            <div className="sm:col-span-2">
              <FormSelect label="Batch" required options={batchOptions} value={form.batch} placeholder="Select batch" onChange={(e) => setForm({ ...form, batch: e.target.value })} />
            </div>
            <FormInput label="Quantity (Units)" required inputMode="numeric" placeholder="Enter quantity" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
            <FormSelect label="Reason" options={REASONS} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <FormSelect label="Status" options={PR_STATUSES} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
            <div className="sm:col-span-2">
              <FormTextarea label="Note" placeholder="Enter note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
        </GlassModal>
      )}

      {viewing && (
        <GlassModal
          title={`${viewing.doc_no} — ${viewing.party_name || ''}`}
          icon={<FaUndoAlt className="text-white text-xs" />}
          onClose={() => setViewing(null)}
          maxWidth="max-w-md"
          footer={
            <>
              <button onClick={() => setViewing(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Close</button>
              {canPrint && <button onClick={() => printOne(viewing)} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}><FaPrint size={10} /> Print</button>}
              {canPrint && <button onClick={() => pdfOne(viewing)} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}><FaFilePdf size={10} /> PDF</button>}
            </>
          }
        >
          {[
            ['Date', fmtDate(viewing.txn_date)],
            ['Reason', viewing.meta?.reason || '—'],
            ['Note', viewing.notes || '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/20">
              <span className="text-white text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{label}</span>
              <span className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{value}</span>
            </div>
          ))}
          <div className="flex justify-between items-center py-1.5 border-b border-white/20 mb-2">
            <span className="text-white text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Status</span>
            <StatusBadge label={viewing.status} color={statusColor[viewing.status]} />
          </div>
          <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>Returned Items</p>
          <div className="space-y-1.5">
            {(viewing.items || []).map((it, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded-sm bg-white/5 border border-white/20 animate-fade-in-left" style={{ animationDelay: `${0.1 + i * 0.08}s`, animationFillMode: 'both' }}>
                <div>
                  <p className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{it.medicine}</p>
                  <p className="text-white/60 text-[11px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Batch: {it.batch_no || '—'} — {it.qty} × {money(it.unit_price)}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>-{it.qty}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-sm bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-white/20 text-center">
            <p className="text-white text-[10px] uppercase tracking-wider" style={{ fontFamily: 'Poppins, sans-serif' }}>Return Value</p>
            <p className="text-white text-lg font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(viewing.total)}</p>
          </div>
        </GlassModal>
      )}
    </>
  );
};

export default PurchaseReturnsTab;
