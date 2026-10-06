import { useState } from 'react';
import { FaPlus, FaTrash, FaFileInvoice, FaClock, FaCheckCircle, FaMoneyBillWave, FaPrint, FaFilePdf } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import GlassSelect from '../../../components/common/GlassSelect';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import StatMini from '../../../components/common/StatMini';
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

const PO_STATUSES = ['Draft', 'Sent', 'Partially Received', 'Received', 'Cancelled'];
const emptyLine = () => ({ medicine_id: '', qty: '', unitCost: '' });

const PurchaseOrdersTab = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { data: orders, loading, error, reload } = useApi('/purchase-orders', { from: dateFrom, to: dateTo });
  const { data: supplierLov } = useApi('/lov/suppliers');
  const { data: medicineLov } = useApi('/lov/medicines', { all: 1 });
  const supplierOptions = supplierLov.map((s) => ({ value: s.id, label: s.name }));
  const medicineOptions = medicineLov.map((m) => ({ value: m.id, label: m.name }));

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingPO, setViewingPO] = useState(null);
  const [saving, setSaving] = useState(false);

  const statuses = ['All Status', ...PO_STATUSES];
  const statusColor = { 'Draft': 'gray', 'Sent': 'blue', 'Partially Received': 'amber', 'Received': 'green', 'Cancelled': 'red' };

  const [poSupplier, setPoSupplier] = useState('');
  const [poExpected, setPoExpected] = useState('');
  const [poStatus, setPoStatus] = useState('Draft');
  const [poNotes, setPoNotes] = useState('');
  const [lineItems, setLineItems] = useState([emptyLine()]);

  const q = searchTerm.toLowerCase();
  const filtered = orders.filter((o) => {
    const matchesSearch = (o.doc_no || '').toLowerCase().includes(q) || (o.supplier_name || '').toLowerCase().includes(q);
    const matchesStatus = selectedStatus === 'All Status' || o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const filterKey = JSON.stringify([searchTerm, selectedStatus, dateFrom, dateTo]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const listColumns = [
    { key: 'po', label: 'PO Number' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'date', label: 'Order Date' },
    { key: 'expected', label: 'Expected' },
    { key: 'count', label: 'Items', align: 'right' },
    { key: 'total', label: 'Total (Rs.)', align: 'right' },
    { key: 'status', label: 'Status' },
  ];
  const listRows = filtered.map(o => ({ po: o.doc_no, supplier: o.supplier_name, date: fmtDate(o.txn_date), expected: fmtDate(o.expected_date) || '—', count: o.item_count, total: money(o.total), status: o.status }));
  const listTotals = { total: money(filtered.reduce((s, o) => s + (o.total || 0), 0)) };
  const listArgs = { title: 'Purchases Report', dateFrom, dateTo, columns: listColumns, rows: listRows, totals: listTotals };
  const doPrintList = () => printListReport(listArgs);
  const doPdfList = () => savePdfListReport({ ...listArgs, fileName: 'Purchases_Report' });
  const doExcel = () => exportExcel({ fileName: 'Purchases', columns: listColumns, rows: listRows });

  const loadDoc = async (id) => {
    try {
      return await api.get(`/purchase-orders/${id}`);
    } catch (err) {
      toast.error('Could not load purchase order', err.message);
      return null;
    }
  };

  const recordFor = (d) => ({
    branch: d.branch_name,
    title: 'Purchase Order', subtitle: d.doc_no,
    info: [
      { label: 'PO Number', value: d.doc_no },
      { label: 'Order Date', value: fmtDate(d.txn_date) },
      { label: 'Expected Delivery', value: fmtDate(d.meta?.expected_date) || '—' },
      { label: 'Supplier', value: d.party_name },
      { label: 'Status', value: d.status },
      { label: 'Total (Rs.)', value: money(d.total) },
    ],
    items: {
      columns: [
        { key: 'medicine', label: 'Medicine' },
        { key: 'qty', label: 'Qty', align: 'right' },
        { key: 'unitCost', label: 'Unit Cost', align: 'right' },
        { key: 'amount', label: 'Amount', align: 'right' },
      ],
      rows: (d.items || []).map(it => ({ medicine: it.medicine, qty: it.qty, unitCost: money(it.unit_price), amount: money(it.amount) })),
      totals: { amount: money(d.total) },
    },
  });
  const printOne = async (o) => { const d = o.items ? o : await loadDoc(o.id); if (d) printRecord(recordFor(d)); };
  const pdfOne = async (o) => { const d = o.items ? o : await loadDoc(o.id); if (d) savePdfRecord({ ...recordFor(d), fileName: d.doc_no }); };
  const handleView = async (o) => { const d = await loadDoc(o.id); if (d) setViewingPO(d); };

  const pendingCount = orders.filter(o => o.status === 'Sent' || o.status === 'Partially Received').length;
  const receivedCount = orders.filter(o => o.status === 'Received').length;
  const purchaseValue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total || 0), 0);

  const addLineItem = () => setLineItems([...lineItems, emptyLine()]);
  const removeLineItem = (idx) => setLineItems(lineItems.filter((_, i) => i !== idx));
  const updateLineItem = (idx, field, value) => {
    setLineItems(lineItems.map((li, i) => i === idx ? { ...li, [field]: value } : li));
  };

  const orderTotal = lineItems.reduce((s, li) => s + ((parseFloat(li.qty) || 0) * (parseFloat(li.unitCost) || 0)), 0);

  const resetForm = () => {
    setEditingId(null);
    setPoSupplier('');
    setPoExpected('');
    setPoStatus('Draft');
    setPoNotes('');
    setLineItems([emptyLine()]);
  };
  const closeModal = () => { setShowModal(false); resetForm(); };

  const openCreate = () => { resetForm(); setShowModal(true); };
  const openEdit = async (o) => {
    const d = await loadDoc(o.id);
    if (!d) return;
    setEditingId(d.id);
    setPoSupplier(d.party_id || '');
    setPoExpected(fmtDate(d.meta?.expected_date) || '');
    setPoStatus(d.status || 'Draft');
    setPoNotes(d.notes || '');
    setLineItems((d.items || []).length
      ? d.items.map(it => ({ medicine_id: it.medicine_id, qty: String(it.qty), unitCost: String(it.unit_price) }))
      : [emptyLine()]);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!poSupplier) {
      toast.error('Supplier is required', 'Select a supplier');
      return;
    }
    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i];
      if (!li.medicine_id && !li.qty && !li.unitCost) continue;
      if (!li.medicine_id) { toast.error(`Line ${i + 1}: medicine is required`, 'Select a medicine'); return; }
      if (!Number.isInteger(Number(li.qty)) || Number(li.qty) <= 0) { toast.error(`Line ${i + 1}: invalid quantity`, 'Enter a whole number of units greater than 0'); return; }
      if (li.unitCost !== '' && !(Number(li.unitCost) >= 0)) { toast.error(`Line ${i + 1}: invalid unit cost`, 'Enter a cost of 0 or more'); return; }
    }
    const validItems = lineItems.filter(li => li.medicine_id && Number(li.qty) > 0);
    if (validItems.length === 0) {
      toast.error('No medicines added', 'Add at least one medicine with a quantity');
      return;
    }
    const body = {
      party_id: poSupplier,
      expected_date: poExpected || null,
      status: poStatus,
      notes: poNotes || null,
      items: validItems.map(li => ({ medicine_id: li.medicine_id, qty: Number(li.qty), unit_cost: Number(li.unitCost) || 0 })),
    };
    setSaving(true);
    try {
      const res = editingId ? await api.put(`/purchase-orders/${editingId}`, body) : await api.post('/purchase-orders', body);
      toast.success(res.message || (editingId ? 'Purchase order updated' : 'Purchase order created'));
      closeModal();
      reload();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (o) => {
    if (!window.confirm(`Delete purchase order ${o.doc_no}?`)) return;
    try {
      const res = await api.del(`/purchase-orders/${o.id}`);
      toast.success(res.message || 'Purchase order deleted');
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const canPrint = can('purchase-orders', 'print');

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        actions={
          <>
            <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
            <ExportButtons onPrint={canPrint ? doPrintList : undefined} onExcel={canPrint ? doExcel : undefined} onPdf={canPrint ? doPdfList : undefined} />
            {can('purchase-orders', 'create') && (
              <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <FaPlus size={12} /> Create PO
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <StatMini title="Total POs" value={`${orders.length}`} icon={FaFileInvoice} color="purple" delay={0.05} />
        <StatMini title="Pending Delivery" value={`${pendingCount}`} icon={FaClock} color="amber" delay={0.1} />
        <StatMini title="Received" value={`${receivedCount}`} icon={FaCheckCircle} color="green" delay={0.15} />
        <StatMini title="Purchase Value" value={money(purchaseValue)} icon={FaMoneyBillWave} color="blue" delay={0.2} />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search purchase order" />
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto animate-fade-in-up delay-300 relative z-10">
          <GlassSelect value={selectedStatus} onChange={setSelectedStatus} options={statuses} width="sm:w-[160px] md:w-[180px]" />
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[850px] sm:min-w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">PO Number</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Supplier</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Order Date</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Expected</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Items</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Total</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || error || currentItems.length === 0 ? (
                <tr className="animate-fade-in">
                  <td colSpan="8" className="px-3 py-6 text-center text-[14px] text-white/40" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {loading ? 'Loading…' : error ? error : 'No purchase orders found'}
                  </td>
                </tr>
              ) : (
                currentItems.map((o, index) => (
                  <tr
                    key={o.id}
                    className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                    style={{ animationFillMode: 'both' }}
                  >
                    <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{o.doc_no}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{o.supplier_name}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{fmtDate(o.txn_date)}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{fmtDate(o.expected_date) || '—'}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{o.item_count}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(o.total)}</td>
                    <td className="px-2 py-1.5"><StatusBadge label={o.status} color={statusColor[o.status]} /></td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <RowActions
                        onView={() => handleView(o)}
                        onEdit={can('purchase-orders', 'edit') ? () => openEdit(o) : undefined}
                        onPrint={canPrint ? () => printOne(o) : undefined}
                        onPdf={canPrint ? () => pdfOne(o) : undefined}
                        onDelete={can('purchase-orders', 'delete') ? () => handleDelete(o) : undefined}
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
          title={editingId ? 'Edit Purchase Order' : 'Create Purchase Order'}
          icon={<FaFileInvoice className="text-white text-xs" />}
          onClose={closeModal}
          maxWidth="max-w-2xl"
          footer={
            <>
              <button onClick={closeModal} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {saving ? 'Saving…' : editingId ? 'Update PO' : poStatus === 'Draft' ? 'Save as Draft' : 'Save PO'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <FormSelect label="Supplier" required options={supplierOptions} value={poSupplier} placeholder="Select supplier" onChange={(e) => setPoSupplier(e.target.value)} />
            <FormInput label="Expected Delivery Date" type="date" value={poExpected} onChange={(e) => setPoExpected(e.target.value)} />
            <FormSelect label="Status" options={editingId ? PO_STATUSES : ['Draft', 'Sent']} value={poStatus} onChange={(e) => setPoStatus(e.target.value)} />
          </div>

          <div className="flex items-center justify-between mb-1.5">
            <p className="text-white/70 text-[11px] uppercase tracking-wider" style={{ fontFamily: 'Poppins, sans-serif' }}>Line Items</p>
            <button onClick={addLineItem} className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-sm text-purple-300 text-[12px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <FaPlus size={8} /> Add Item
            </button>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
            {lineItems.map((li, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1.5 items-end p-2 rounded-sm bg-white/5 border border-white/20 animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'both' }}>
                <div className="col-span-12 sm:col-span-5">
                  <label className="text-white text-[13px] mb-0.5 block" style={{ fontFamily: 'Poppins, sans-serif' }}>Medicine</label>
                  <SearchableSelect
                    value={li.medicine_id}
                    onChange={(v) => updateLineItem(idx, 'medicine_id', v)}
                    options={medicineOptions}
                    placeholder="Select medicine"
                  />
                </div>
                <div className="col-span-5 sm:col-span-3">
                  <FormInput label="Qty (Units)" inputMode="numeric" placeholder="Enter quantity" value={li.qty} onChange={(e) => updateLineItem(idx, 'qty', e.target.value)} />
                </div>
                <div className="col-span-5 sm:col-span-3">
                  <FormInput label="Unit Cost (Rs.)" inputMode="decimal" placeholder="Enter unit cost" value={li.unitCost} onChange={(e) => updateLineItem(idx, 'unitCost', e.target.value)} />
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  <button onClick={() => removeLineItem(idx)} disabled={lineItems.length === 1} className="w-7 h-7 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <FaTrash size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 p-3 rounded-sm bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-white/20 text-center">
            <p className="text-white text-[10px] uppercase tracking-wider" style={{ fontFamily: 'Poppins, sans-serif' }}>Order Total</p>
            <p className="text-white text-lg font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(orderTotal)}</p>
          </div>
        </GlassModal>
      )}

      {viewingPO && (
        <GlassModal
          title={`${viewingPO.doc_no} — ${viewingPO.party_name || ''}`}
          icon={<FaFileInvoice className="text-white text-xs" />}
          onClose={() => setViewingPO(null)}
          maxWidth="max-w-md"
          footer={
            <>
              <button onClick={() => setViewingPO(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Close</button>
              {canPrint && <button onClick={() => printOne(viewingPO)} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}><FaPrint size={10} /> Print</button>}
              {canPrint && <button onClick={() => pdfOne(viewingPO)} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}><FaFilePdf size={10} /> PDF</button>}
            </>
          }
        >
          <div className="flex justify-between items-center py-1.5 border-b border-white/20 mb-2">
            <span className="text-white text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Status</span>
            <StatusBadge label={viewingPO.status} color={statusColor[viewingPO.status]} />
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-white/20 mb-2">
            <span className="text-white text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Order Date / Expected</span>
            <span className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{fmtDate(viewingPO.txn_date)} / {fmtDate(viewingPO.meta?.expected_date) || '—'}</span>
          </div>
          <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>Items</p>
          <div className="space-y-1.5">
            {(viewingPO.items || []).map((it, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded-sm bg-white/5 border border-white/20 animate-fade-in-left" style={{ animationDelay: `${0.1 + i * 0.08}s`, animationFillMode: 'both' }}>
                <div>
                  <p className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{it.medicine}</p>
                  <p className="text-white/60 text-[11px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{it.qty} × {money(it.unit_price)}</p>
                </div>
                <span className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(it.amount)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-sm bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-white/20 text-center">
            <p className="text-white text-[10px] uppercase tracking-wider" style={{ fontFamily: 'Poppins, sans-serif' }}>Total</p>
            <p className="text-white text-lg font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(viewingPO.total)}</p>
          </div>
        </GlassModal>
      )}
    </>
  );
};

export default PurchaseOrdersTab;
