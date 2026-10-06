import { useState } from 'react';
import { FaPlus, FaTruckLoading, FaTrash, FaPrint, FaFilePdf } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import GlassModal from '../../../components/common/GlassModal';
import ExportButtons from '../../../components/common/ExportButtons';
import RowActions from '../../../components/common/RowActions';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import { FormInput, FormSelect } from '../../../components/common/FormField';
import SearchableSelect from '../../../components/common/SearchableSelect';
import { printListReport, savePdfListReport, exportExcel, printRecord, savePdfRecord } from '../../../utils/printFormat';
import { money, fmtDate } from '../../../utils/format';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

const emptyLine = () => ({ id: null, medicineId: '', batchNo: '', expiry: '', qty: '', unitCost: '' });
const NO_PO = '';
const toMonth = (v) => (v ? fmtDate(v).slice(0, 7) : '');

const GRNTab = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { data: grns, loading, error, reload } = useApi('/grn', { from: dateFrom, to: dateTo });
  const { data: supplierLov } = useApi('/lov/suppliers');
  const { data: branchLov } = useApi('/lov/branches');
  const { data: medicineLov } = useApi('/lov/medicines', { all: 1 });

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingPoId, setEditingPoId] = useState(null);
  const [viewingGRN, setViewingGRN] = useState(null);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [poId, setPoId] = useState(NO_PO);
  const [lines, setLines] = useState([emptyLine()]);

  const { data: poLov } = useApi('/lov/purchase-orders', editingPoId ? { include_id: editingPoId } : {}, { enabled: showModal });
  const poOptions = [
    { value: NO_PO, label: '— No purchase order —' },
    ...poLov.filter(p => !supplierId || String(p.party_id) === String(supplierId)).map(p => ({ value: p.id, label: `${p.doc_no} — ${p.supplier_name} (${p.status})` })),
  ];
  const supplierOptions = supplierLov.map(s => ({ value: s.id, label: s.name }));
  const branchOptions = branchLov.map(b => ({ value: b.id, label: b.name }));
  const medicineOptions = medicineLov.map(m => ({ value: m.id, label: m.name }));

  const q = searchTerm.toLowerCase();
  const filtered = grns.filter((g) =>
    (g.doc_no || '').toLowerCase().includes(q) ||
    (g.ref_doc_no || '').toLowerCase().includes(q) ||
    (g.supplier_name || '').toLowerCase().includes(q) ||
    (g.branch_name || '').toLowerCase().includes(q)
  );

  const filterKey = JSON.stringify([searchTerm, dateFrom, dateTo]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const updateLine = (idx, field, value) => {
    setLines(lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };
  const addLine = () => setLines([...lines, emptyLine()]);
  const removeLine = (idx) => setLines(lines.length === 1 ? [emptyLine()] : lines.filter((_, i) => i !== idx));

  const resetForm = () => {
    setEditingId(null);
    setEditingPoId(null);
    setSupplierId('');
    setBranchId(branchLov.length === 1 ? branchLov[0].id : '');
    setPoId(NO_PO);
    setLines([emptyLine()]);
  };
  const closeModal = () => { setShowModal(false); resetForm(); };
  const openCreate = () => { resetForm(); setShowModal(true); };

  const loadDoc = async (id) => {
    try {
      return await api.get(`/grn/${id}`);
    } catch (err) {
      toast.error('Could not load GRN', err.message);
      return null;
    }
  };

  const openEdit = async (g) => {
    const d = await loadDoc(g.id);
    if (!d) return;
    setEditingId(d.id);
    setEditingPoId(d.ref_txn_id || null);
    setSupplierId(d.party_id || '');
    setBranchId(d.branch_id || '');
    setPoId(d.ref_txn_id || NO_PO);
    setLines((d.items || []).length
      ? d.items.map(it => ({ id: it.id, medicineId: it.medicine_id, batchNo: it.batch_no || '', expiry: toMonth(it.expiry), qty: String(it.qty), unitCost: String(it.unit_price ?? '') }))
      : [emptyLine()]);
    setShowModal(true);
  };

  const handleSupplierChange = (v) => {
    setSupplierId(v);
    const po = poLov.find(p => String(p.id) === String(poId));
    if (po && String(po.party_id) !== String(v)) setPoId(NO_PO);
  };

  const handlePoChange = async (v) => {
    setPoId(v);
    if (!v) return;
    const po = poLov.find(p => String(p.id) === String(v));
    if (po && !supplierId) setSupplierId(po.party_id);
    try {
      const items = await api.get(`/lov/purchase-orders/${v}/items`);
      const pending = (items || [])
        .map(it => ({ ...emptyLine(), medicineId: it.medicine_id, qty: String(Math.max(0, (it.ordered || 0) - (it.received || 0))), unitCost: String(it.unit_cost ?? '') }))
        .filter(l => Number(l.qty) > 0);
      if (pending.length) setLines(pending);
      else toast.info('Nothing pending', 'Everything on this purchase order is already received');
    } catch (err) {
      toast.error('Could not load PO items', err.message);
    }
  };

  const handleSave = async () => {
    if (!supplierId || !branchId) {
      toast.error(!supplierId ? 'Supplier is required' : 'Branch is required', !supplierId ? 'Select a supplier' : 'Select a branch');
      return;
    }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const n = `Line ${i + 1}`;
      if (!l.medicineId) { toast.error(`${n}: medicine is required`, 'Select a medicine'); return; }
      if (!l.batchNo.trim()) { toast.error(`${n}: batch number is required`, 'Enter the batch number'); return; }
      if (!l.expiry) { toast.error(`${n}: expiry is required`, 'Select the expiry month'); return; }
      if (!Number.isInteger(Number(l.qty)) || Number(l.qty) <= 0) { toast.error(`${n}: invalid quantity`, 'Enter a whole number of units greater than 0'); return; }
      if (l.unitCost !== '' && !(Number(l.unitCost) >= 0)) { toast.error(`${n}: invalid unit cost`, 'Enter a cost of 0 or more'); return; }
    }
    const body = {
      party_id: supplierId,
      branch_id: branchId,
      po_id: poId || null,
      lines: lines.map(l => ({
        ...(l.id ? { id: l.id } : {}),
        medicine_id: l.medicineId,
        batch_no: l.batchNo.trim(),
        expiry: l.expiry || null,
        qty: Number(l.qty),
        unit_cost: Number(l.unitCost) || 0,
      })),
    };
    setSaving(true);
    try {
      const res = editingId ? await api.put(`/grn/${editingId}`, body) : await api.post('/grn', body);
      toast.success(res.message || (editingId ? 'GRN updated' : 'GRN posted'));
      closeModal();
      reload();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g) => {
    if (!window.confirm(`Delete GRN ${g.doc_no}?`)) return;
    try {
      const res = await api.del(`/grn/${g.id}`);
      toast.success(res.message || 'GRN deleted');
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const handleView = async (g) => { const d = await loadDoc(g.id); if (d) setViewingGRN(d); };

  const listColumns = [
    { key: 'grn', label: 'GRN Number' },
    { key: 'po', label: 'Against PO' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'branch', label: 'Branch' },
    { key: 'date', label: 'Date' },
    { key: 'count', label: 'Items', align: 'right' },
    { key: 'value', label: 'Value (Rs.)', align: 'right' },
  ];
  const listRows = filtered.map(g => ({ grn: g.doc_no, po: g.ref_doc_no || '—', supplier: g.supplier_name, branch: g.branch_name, date: fmtDate(g.txn_date), count: g.item_count, value: money(g.total) }));
  const listTotals = { value: money(filtered.reduce((s, g) => s + (g.total || 0), 0)) };
  const listArgs = { title: 'GRN Report', dateFrom, dateTo, columns: listColumns, rows: listRows, totals: listTotals };
  const doPrintList = () => printListReport(listArgs);
  const doPdfList = () => savePdfListReport({ ...listArgs, fileName: 'GRN_Report' });
  const doExcel = () => exportExcel({ fileName: 'GRN', columns: listColumns, rows: listRows });
  const recordFor = (d) => ({
    title: 'Goods Receipt Note', subtitle: d.doc_no,
    info: [
      { label: 'GRN Number', value: d.doc_no },
      { label: 'Against PO', value: d.ref_doc_no || '—' },
      { label: 'Supplier', value: d.party_name },
      { label: 'Branch', value: d.branch_name || '—' },
      { label: 'Date', value: fmtDate(d.txn_date) },
      { label: 'Lines', value: (d.items || []).length },
      { label: 'Total Value (Rs.)', value: money(d.total) },
    ],
    items: {
      columns: [
        { key: 'medicine', label: 'Medicine' },
        { key: 'batch', label: 'Batch' },
        { key: 'expiry', label: 'Expiry' },
        { key: 'qty', label: 'Qty', align: 'right' },
        { key: 'unitCost', label: 'Unit Cost', align: 'right' },
        { key: 'amount', label: 'Amount', align: 'right' },
      ],
      rows: (d.items || []).map(l => ({ medicine: l.medicine, batch: l.batch_no || '—', expiry: toMonth(l.expiry) || '—', qty: l.qty, unitCost: money(l.unit_price), amount: money(l.amount) })),
      totals: { amount: money(d.total) },
    },
  });
  const printOne = async (g) => { const d = g.items ? g : await loadDoc(g.id); if (d) printRecord(recordFor(d)); };
  const pdfOne = async (g) => { const d = g.items ? g : await loadDoc(g.id); if (d) savePdfRecord({ ...recordFor(d), fileName: d.doc_no }); };

  const canPrint = can('grn', 'print');
  const modalTotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitCost) || 0), 0);

  return (
    <>
      <PageHeader
        title="Goods Receiving (GRN)"
        actions={
          <>
            <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
            <ExportButtons onPrint={canPrint ? doPrintList : undefined} onExcel={canPrint ? doExcel : undefined} onPdf={canPrint ? doPdfList : undefined} />
            {can('grn', 'create') && (
              <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <FaPlus size={12} /> Receive Goods
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search GRN" />
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[850px] sm:min-w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">GRN Number</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Against PO</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Supplier</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Branch</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Date</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Items</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Value</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || error || currentItems.length === 0 ? (
                <tr className="animate-fade-in">
                  <td colSpan="9" className="px-3 py-6 text-center text-[14px] text-white/40" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {loading ? 'Loading…' : error ? error : 'No GRNs found'}
                  </td>
                </tr>
              ) : (
                currentItems.map((g, index) => (
                  <tr
                    key={g.id}
                    className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                    style={{ animationFillMode: 'both' }}
                  >
                    <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{g.doc_no}</td>
                    <td className="px-2 py-1.5 text-white/80 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{g.ref_doc_no || '—'}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{g.supplier_name}</td>
                    <td className="px-2 py-1.5 text-white/80 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{g.branch_name || '—'}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{fmtDate(g.txn_date)}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{g.item_count}</td>
                    <td className="px-2 py-1.5 text-white/80 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(g.total)}</td>
                    <td className="px-2 py-1.5"><StatusBadge label="Posted" color="green" /></td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <RowActions
                        onView={() => handleView(g)}
                        onEdit={can('grn', 'edit') ? () => openEdit(g) : undefined}
                        onPrint={canPrint ? () => printOne(g) : undefined}
                        onPdf={canPrint ? () => pdfOne(g) : undefined}
                        onDelete={can('grn', 'delete') ? () => handleDelete(g) : undefined}
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
          title={editingId ? 'Edit GRN' : 'Receive Goods (New GRN)'}
          icon={<FaTruckLoading className="text-white text-xs" />}
          onClose={closeModal}
          maxWidth="max-w-2xl"
          footer={
            <>
              <button onClick={closeModal} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {saving ? 'Saving…' : editingId ? 'Update GRN' : 'Post GRN'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            <FormSelect label="Supplier" required options={supplierOptions} value={supplierId} placeholder="Select supplier" onChange={(e) => handleSupplierChange(e.target.value)} />
            <FormSelect label="Branch" required options={branchOptions} value={branchId} placeholder="Select branch" onChange={(e) => setBranchId(e.target.value)} />
            <FormSelect label="Against Purchase Order" options={poOptions} value={poId} placeholder="Select purchase order" onChange={(e) => handlePoChange(e.target.value)} />
          </div>

          <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>Received Lines</p>

          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {lines.map((line, idx) => (
              <div key={idx} className="p-2 rounded-sm bg-white/5 border border-white/15 relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-white/60 text-[11px] block mb-0.5" style={{ fontFamily: 'Poppins, sans-serif' }}>Medicine *</label>
                    <SearchableSelect
                      value={line.medicineId}
                      onChange={(v) => updateLine(idx, 'medicineId', v)}
                      options={medicineOptions}
                      placeholder="Select medicine"
                      buttonClassName="w-full px-2 py-1.5 bg-white/10 border border-white/25 rounded-sm text-white text-[13px] focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <FormInput label="Batch Number" required placeholder="Enter batch number" value={line.batchNo} onChange={(e) => updateLine(idx, 'batchNo', e.target.value)} />
                  <FormInput label="Expiry Date" type="month" value={line.expiry} onChange={(e) => updateLine(idx, 'expiry', e.target.value)} />
                  <div>
                    <div className="grid grid-cols-2 gap-2">
                      <FormInput label="Qty (Units)" required inputMode="numeric" placeholder="Enter quantity" value={line.qty} onChange={(e) => updateLine(idx, 'qty', e.target.value)} />
                      <FormInput label="Unit Cost (Rs.)" inputMode="decimal" placeholder="Enter unit cost" value={line.unitCost} onChange={(e) => updateLine(idx, 'unitCost', e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2 mt-0.5">
                      <p className="text-white/70 text-[11px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{money((Number(line.qty) || 0) * (Number(line.unitCost) || 0))}</p>
                    </div>
                  </div>
                </div>
                {lines.length > 1 && (
                  <button onClick={() => removeLine(idx)} className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-all">
                    <FaTrash size={8} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button onClick={addLine} className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-white/10 hover:bg-white/20 border border-white/25 text-white text-[12px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <FaPlus size={9} /> Add another line
            </button>
            <span className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Total: {money(modalTotal)}</span>
          </div>

        </GlassModal>
      )}

      {viewingGRN && (
        <GlassModal
          title={`${viewingGRN.doc_no} — ${viewingGRN.party_name || ''}`}
          icon={<FaTruckLoading className="text-white text-xs" />}
          onClose={() => setViewingGRN(null)}
          maxWidth="max-w-md"
          footer={
            <>
              <button onClick={() => setViewingGRN(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Close</button>
              {canPrint && <button onClick={() => printOne(viewingGRN)} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}><FaPrint size={10} /> Print</button>}
              {canPrint && <button onClick={() => pdfOne(viewingGRN)} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}><FaFilePdf size={10} /> PDF</button>}
            </>
          }
        >
          <div className="flex justify-between items-center py-1.5 border-b border-white/20 mb-2">
            <span className="text-white text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Against PO / Branch</span>
            <span className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{viewingGRN.ref_doc_no || '—'} / {viewingGRN.branch_name || '—'}</span>
          </div>
          <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>Received Lines</p>
          <div className="space-y-1.5">
            {(viewingGRN.items || []).map((l, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded-sm bg-white/5 border border-white/20 animate-fade-in-left" style={{ animationDelay: `${0.1 + i * 0.08}s`, animationFillMode: 'both' }}>
                <div>
                  <p className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{l.medicine}</p>
                  <p className="text-white/60 text-[11px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Batch: {l.batch_no || '—'} — Expiry: {toMonth(l.expiry) || '—'} — Cost: {money(l.unit_price)}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>+{l.qty}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-sm bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-white/20 text-center">
            <p className="text-white text-[10px] uppercase tracking-wider" style={{ fontFamily: 'Poppins, sans-serif' }}>Total Value</p>
            <p className="text-white text-lg font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(viewingGRN.total)}</p>
          </div>
        </GlassModal>
      )}
    </>
  );
};

export default GRNTab;
