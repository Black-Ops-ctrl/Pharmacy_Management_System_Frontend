import { useState, useMemo } from 'react';
import { FaPlus, FaExchangeAlt } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import GlassSelect from '../../../components/common/GlassSelect';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import GlassModal from '../../../components/common/GlassModal';
import ExportButtons from '../../../components/common/ExportButtons';
import RowActions from '../../../components/common/RowActions';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormField';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { money, fmtDate, fmtDateTime } from '../../../utils/format';
import { printListReport, savePdfListReport, exportExcel } from '../../../utils/printFormat';
import { FONT, signedQtyUom, btnCancel, btnSave } from './invUtils';
import StateRow from './StateRow';

const KEY = 'inv-adjustments';
const ADJ_TYPES = ['Damage', 'Expiry Write-off', 'Theft / Loss', 'Count Correction', 'Return to Supplier'];
const types = ['All Types', ...ADJ_TYPES, 'Stock Cleared'];
const typeColor = { 'Damage': 'amber', 'Expiry Write-off': 'red', 'Theft / Loss': 'red', 'Count Correction': 'blue', 'Return to Supplier': 'purple', 'Stock Cleared': 'gray' };

const batchLabel = (b) =>
  `${b.batch_no} — ${b.branch_name || 'No branch'} — qty ${b.qty} — exp ${b.expiry ? String(b.expiry).slice(0, 7) : 'n/a'}`;

const AdjustmentModal = ({ editing, medicines, onClose, onSaved }) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => editing ? {
    medicine_id: editing.medicine_id || '',
    batch_id: editing.batch_id || '',
    adj_type: editing.adj_type || 'Damage',
    qty: editing.adj_type === 'Count Correction'
      ? `${editing.delta > 0 ? '+' : ''}${editing.delta}`
      : String(Math.abs(Number(editing.delta) || 0)),
    reason: editing.reason || '',
  } : { medicine_id: '', batch_id: '', adj_type: 'Damage', qty: '', reason: '' });

  const batchParams = { medicine_id: form.medicine_id, include_id: editing?.batch_id || '' };
  const { data: batches, loading: batchesLoading } = useApi('/lov/batches', batchParams, { enabled: !!form.medicine_id });
  const batchOptions = (form.medicine_id ? batches : []).map((b) => ({ value: b.id, label: batchLabel(b) }));
  const medOptions = medicines.map((m) => ({ value: m.id, label: `${m.name}${m.generic ? ` (${m.generic})` : ''}` }));
  const uom = medicines.find((m) => String(m.id) === String(form.medicine_id))?.uom_name || '';
  const isCorrection = form.adj_type === 'Count Correction';
  const typeOptions = editing && editing.adj_type && !ADJ_TYPES.includes(editing.adj_type) ? [...ADJ_TYPES, editing.adj_type] : ADJ_TYPES;

  const handleSave = async () => {
    if (!form.medicine_id) { toast.error('Medicine is required', 'Select a medicine'); return; }
    if (!form.batch_id) { toast.error('Batch is required', 'Select a batch'); return; }
    const raw = String(form.qty).trim();
    const n = Number(raw);
    if (!raw || !Number.isInteger(n) || n === 0) { toast.error('Invalid quantity', isCorrection ? 'Enter a whole number like 5 to add or -3 to remove' : 'Enter a whole number greater than 0'); return; }
    if (!isCorrection && n < 0) { toast.error('Invalid quantity', 'Enter a number greater than 0. This type always reduces stock'); return; }
    setSaving(true);
    try {
      const body = { batch_id: Number(form.batch_id), adj_type: form.adj_type, qty: n, reason: form.reason.trim() };
      const { message } = editing
        ? await api.put(`/inventory/adjustments/${editing.id}`, body)
        : await api.post('/inventory/adjustments', body);
      toast.success(message || 'Adjustment saved');
      onSaved();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassModal
      title={editing ? `Edit Adjustment ${editing.doc_no}` : 'New Stock Adjustment'}
      icon={<FaExchangeAlt className="text-white text-xs" />}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={btnCancel} style={FONT}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={btnSave} style={FONT}>{saving ? 'Saving…' : 'Save Adjustment'}</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormSelect label="Medicine" required options={medOptions} value={form.medicine_id} placeholder="Select medicine"
          onChange={(e) => setForm((f) => ({ ...f, medicine_id: e.target.value, batch_id: String(e.target.value) === String(f.medicine_id) ? f.batch_id : '' }))} />
        <FormSelect label="Batch" required options={batchOptions} value={form.batch_id}
          placeholder={batchesLoading ? 'Loading…' : 'Select batch'}
          onChange={(e) => setForm((f) => ({ ...f, batch_id: e.target.value }))} />
        <FormSelect label="Adjustment Type" required options={typeOptions} value={form.adj_type} onChange={(e) => setForm((f) => ({ ...f, adj_type: e.target.value }))} />
        <FormInput label={`Quantity${uom ? ` (${uom})` : ''}`} required type="text" inputMode="numeric"
          placeholder="Enter quantity" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} />
        <div className="sm:col-span-2">
          <FormTextarea label="Reason" placeholder="Enter reason" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
        </div>
      </div>
    </GlassModal>
  );
};

const AdjustmentViewModal = ({ row, uomOf, onClose }) => {
  const { data: d, loading, error } = useApi(`/inventory/adjustments/${row.id}`, undefined, { initial: null });
  const lines = (d && d.items) || [];
  const info = [
    ['Ref', row.doc_no],
    ['Date', fmtDateTime(row.txn_date)],
    ['Type', row.adj_type],
    ['Branch', row.branch_name || '—'],
    ['By', row.created_by || '—'],
    ['Reason', row.reason || '—'],
  ];
  return (
    <GlassModal
      title={`Adjustment ${row.doc_no}`}
      icon={<FaExchangeAlt className="text-white text-xs" />}
      onClose={onClose}
      maxWidth="max-w-lg"
      footer={<button onClick={onClose} className={btnCancel} style={FONT}>Close</button>}
    >
      <div className="grid grid-cols-2 gap-2 mb-3">
        {info.map(([k, v]) => (
          <div key={k} className="p-2 rounded-sm bg-white/5 border border-white/20">
            <p className="text-white/60 text-[11px]" style={FONT}>{k}</p>
            <p className="text-white text-[13px] break-words" style={FONT}>{v}</p>
          </div>
        ))}
      </div>
      <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1.5" style={FONT}>Lines</p>
      <div className="border border-white/20 rounded-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10" style={FONT}>
              <th className="px-2 py-1.5 text-white text-[11px] font-medium uppercase">Medicine</th>
              <th className="px-2 py-1.5 text-white text-[11px] font-medium uppercase">Batch</th>
              <th className="px-2 py-1.5 text-white text-[11px] font-medium uppercase">Expiry</th>
              <th className="px-2 py-1.5 text-white text-[11px] font-medium uppercase text-right">Qty</th>
              <th className="px-2 py-1.5 text-white text-[11px] font-medium uppercase text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {loading || error || lines.length === 0 ? (
              <StateRow colSpan={5} loading={loading} error={error} empty="No lines" />
            ) : lines.map((l) => (
              <tr key={l.id} className="border-b border-white/10">
                <td className="px-2 py-1.5 text-white text-[12px]" style={FONT}>{l.medicine}</td>
                <td className="px-2 py-1.5 text-purple-300 text-[12px]" style={FONT}>{l.batch_no || '—'}</td>
                <td className="px-2 py-1.5 text-white/70 text-[12px]" style={FONT}>{fmtDate(l.expiry) || '—'}</td>
                <td className={`px-2 py-1.5 text-[12px] text-right whitespace-nowrap ${l.qty >= 0 ? 'text-emerald-400' : 'text-red-400'}`} style={FONT}>{signedQtyUom(l.qty, uomOf(l.medicine_id))}</td>
                <td className="px-2 py-1.5 text-white/80 text-[12px] text-right whitespace-nowrap" style={FONT}>{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassModal>
  );
};

const AdjustmentsTab = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [modal, setModal] = useState(null);
  const [viewing, setViewing] = useState(null);

  const { data: adjustments, loading, error, reload } = useApi('/inventory/adjustments', {
    from, to, type: selectedType === 'All Types' ? '' : selectedType,
  });
  const { data: medicines } = useApi('/lov/medicines', { all: 1 });
  const uomMap = useMemo(() => Object.fromEntries(medicines.map((m) => [m.id, m.uom_name])), [medicines]);
  const uomOf = (id) => uomMap[id] || '';

  const filtered = adjustments.filter((a) => {
    const q = searchTerm.toLowerCase();
    return (a.doc_no || '').toLowerCase().includes(q) ||
           (a.medicine_name || '').toLowerCase().includes(q) ||
           (a.batch_no || '').toLowerCase().includes(q) ||
           (a.reason || '').toLowerCase().includes(q);
  });

  const filterKey = JSON.stringify([searchTerm, selectedType, from, to]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const columns = [
    { key: 'ref', label: 'Ref' },
    { key: 'date', label: 'Date' },
    { key: 'medicine', label: 'Medicine' },
    { key: 'batch', label: 'Batch' },
    { key: 'type', label: 'Type' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'reason', label: 'Reason' },
    { key: 'by', label: 'By' },
  ];
  const report = () => ({
    title: `Stock Adjustments${selectedType !== 'All Types' ? ` — ${selectedType}` : ''}`,
    dateFrom: from,
    dateTo: to,
    columns,
    rows: filtered.map((a) => ({
      ref: a.doc_no,
      date: fmtDate(a.txn_date),
      medicine: a.medicine_name || '',
      batch: a.batch_no || '',
      type: a.adj_type,
      qty: signedQtyUom(a.delta, uomOf(a.medicine_id)),
      reason: a.reason || '',
      by: a.created_by || '',
    })),
    totals: { ref: `${filtered.length} adjustment${filtered.length === 1 ? '' : 's'}` },
    fileName: 'Stock-Adjustments',
  });

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete adjustment ${a.doc_no}?`)) return;
    try {
      const { message } = await api.del(`/inventory/adjustments/${a.id}`);
      toast.success(message || 'Adjustment deleted');
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Stock Adjustments"
        actions={
          <>
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
            {can(KEY, 'print') && (
              <ExportButtons
                onPrint={() => printListReport(report())}
                onExcel={() => exportExcel(report())}
                onPdf={() => savePdfListReport(report())}
              />
            )}
            {can(KEY, 'create') && (
              <button onClick={() => setModal({ editing: null })} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={FONT}>
                <FaPlus size={12} /> New Adjustment
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search adjustment" />
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto animate-fade-in-up delay-300 relative z-10">
          <GlassSelect value={selectedType} onChange={setSelectedType} options={types} width="sm:w-[160px] md:w-[180px]" />
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[950px] sm:min-w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10" style={FONT}>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Ref</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Date</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Medicine</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Batch</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Type</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Qty</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Reason</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">By</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || error || currentItems.length === 0 ? (
                <StateRow colSpan={9} loading={loading} error={error} empty={'No adjustments found'} />
              ) : (
                currentItems.map((a, index) => (
                  <tr
                    key={a.id}
                    className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                    style={{ animationFillMode: 'both' }}
                  >
                    <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={FONT}>{a.doc_no}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={FONT}>{fmtDate(a.txn_date)}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={FONT}>{a.medicine_name || '—'}</td>
                    <td className="px-2 py-1.5 text-white/80 text-[12px] whitespace-nowrap" style={FONT}>{a.batch_no || '—'}</td>
                    <td className="px-2 py-1.5"><StatusBadge label={a.adj_type} color={typeColor[a.adj_type]} /></td>
                    <td className={`px-2 py-1.5 text-[12px] whitespace-nowrap ${a.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`} style={FONT}>
                      {signedQtyUom(a.delta, uomOf(a.medicine_id))}
                    </td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] max-w-[200px] truncate" style={FONT} title={a.reason || ''}>{a.reason || '—'}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={FONT}>{a.created_by || '—'}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <RowActions
                        onView={() => setViewing(a)}
                        onEdit={can(KEY, 'edit') && a.line_count <= 1 ? () => setModal({ editing: a }) : undefined}
                        onDelete={can(KEY, 'delete') ? () => handleDelete(a) : undefined}
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

      {modal && (
        <AdjustmentModal
          editing={modal.editing}
          medicines={medicines}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); reload(); }}
        />
      )}
      {viewing && <AdjustmentViewModal row={viewing} uomOf={uomOf} onClose={() => setViewing(null)} />}
    </>
  );
};

export default AdjustmentsTab;
