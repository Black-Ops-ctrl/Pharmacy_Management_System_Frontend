import { useState } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import { FaPlus, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaWallet } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import GlassSelect from '../../../components/common/GlassSelect';
import SearchableSelect from '../../../components/common/SearchableSelect';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import StatMini from '../../../components/common/StatMini';
import GlassModal from '../../../components/common/GlassModal';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import ExportButtons from '../../../components/common/ExportButtons';
import RowActions from '../../../components/common/RowActions';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormField';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { money, fmtDate, fmtDateTime, today } from '../../../utils/format';
import { printListReport, savePdfListReport, exportExcel, printRecord, savePdfRecord, exportRecordExcel } from '../../../utils/printFormat';

const font = { fontFamily: 'Poppins, sans-serif' };
const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Supplier Payment', 'POS Sales', 'Credit Recovery', 'Miscellaneous'];
const METHODS = ['Cash', 'Bank Transfer', 'Card', 'JazzCash', 'EasyPaisa'];

const emptyForm = () => ({ entry_date: today(), entry_type: 'Expense', category: 'Rent', amount: '', method: 'Cash', branch_id: '', note: '' });

const LIST_COLUMNS = [
  { key: 'ref', label: 'Ref' },
  { key: 'date', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'method', label: 'Method' },
  { key: 'branch', label: 'Branch' },
  { key: 'note', label: 'Note' },
  { key: 'amount', label: 'Amount', align: 'right' },
];

const signed = (e) => `${e.entry_type === 'Income' ? '+' : '-'} ${money(e.amount)}`;

const Finance = () => {
  const { can } = useAuth();
  const toast = useToast();
  const cCreate = can('finance', 'create');
  const cEdit = can('finance', 'edit');
  const cDelete = can('finance', 'delete');
  const cPrint = can('finance', 'print');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const types = ['All Types', 'Income', 'Expense'];

  const { data: entries, loading, error, reload } = useApi('/finance', { from: dateFrom, to: dateTo });
  const { data: branchList } = useApi('/lov/branches', undefined, { enabled: showForm });
  const branchOptions = [{ value: '', label: 'No branch' }, ...branchList.map((b) => ({ value: b.id, label: b.name }))];

  const filtered = entries.filter((e) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (e.ref || '').toLowerCase().includes(q) ||
                          (e.category || '').toLowerCase().includes(q) ||
                          (e.note || '').toLowerCase().includes(q) ||
                          (e.branch_name || '').toLowerCase().includes(q);
    const matchesType = selectedType === 'All Types' || e.entry_type === selectedType;
    return matchesSearch && matchesType;
  });

  const filterKey = [searchTerm, selectedType, dateFrom, dateTo].join('|');
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const totalIncome = filtered.filter((e) => e.entry_type === 'Income').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalExpense = filtered.filter((e) => e.entry_type === 'Expense').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const net = totalIncome - totalExpense;

  const listArgs = () => ({
    title: 'Finance Entries', dateFrom, dateTo, columns: LIST_COLUMNS, fileName: 'finance-entries',
    rows: filtered.map((e) => ({
      ref: e.ref, date: fmtDate(e.entry_date), type: e.entry_type, category: e.category || '',
      method: e.method || '', branch: e.branch_name || '', note: e.note || '', amount: signed(e),
    })),
    totals: { note: `Income ${money(totalIncome)} · Expense ${money(totalExpense)}`, amount: money(net) },
  });

  const entryRecord = (e) => ({
    title: 'Finance Entry',
    subtitle: e.ref,
    fileName: `finance-${e.ref}`,
    info: [
      { label: 'Ref', value: e.ref },
      { label: 'Date', value: fmtDate(e.entry_date) },
      { label: 'Type', value: e.entry_type },
      { label: 'Category', value: e.category || '' },
      { label: 'Amount', value: money(e.amount) },
      { label: 'Payment Method', value: e.method || '' },
      { label: 'Branch', value: e.branch_name || '—' },
      { label: 'Note', value: e.note || '' },
      { label: 'Source Document', value: e.source_doc || 'Manual entry' },
      { label: 'Created By', value: e.created_by || '' },
      ...(e.created_at ? [{ label: 'Created At', value: fmtDateTime(e.created_at) }] : []),
    ],
  });

  const openAdd = () => { setEditingEntry(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (e) => {
    setEditingEntry(e);
    setForm({
      entry_date: fmtDate(e.entry_date) || today(),
      entry_type: e.entry_type || 'Expense',
      category: e.category || 'Miscellaneous',
      amount: String(e.amount ?? ''),
      method: e.method || 'Cash',
      branch_id: e.branch_id || '',
      note: e.note || '',
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingEntry(null); };

  const handleSave = async () => {
    if (!(Number(form.amount) > 0)) {
      toast.error('Invalid amount', 'Enter an amount greater than 0');
      return;
    }
    const body = {
      entry_date: form.entry_date || today(),
      entry_type: form.entry_type,
      category: form.category,
      method: form.method,
      amount: Number(form.amount),
      note: form.note.trim(),
      branch_id: form.branch_id || null,
    };
    setSaving(true);
    try {
      const { message } = editingEntry
        ? await api.put(`/finance/${editingEntry.id}`, body)
        : await api.post('/finance', body);
      toast.success(message || 'Entry saved');
      closeForm();
      reload();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e) => {
    if (!window.confirm(`Delete finance entry ${e.ref}?`)) return;
    try {
      const { message } = await api.del(`/finance/${e.id}`);
      toast.success(message || 'Entry deleted');
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in p-1">
        <PageHeader
          title="Finance"
          actions={
            <>
              <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
              {cPrint && (
                <ExportButtons
                  onPrint={() => printListReport(listArgs())}
                  onExcel={() => exportExcel(listArgs())}
                  onPdf={() => savePdfListReport(listArgs())}
                />
              )}
              {cCreate && (
                <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={font}>
                  <FaPlus size={12} /> Add Entry
                </button>
              )}
            </>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <StatMini title="Total Income" value={money(totalIncome)} icon={FaArrowUp} color="green" delay={0.05} />
          <StatMini title="Total Expense" value={money(totalExpense)} icon={FaArrowDown} color="red" delay={0.1} />
          <StatMini title="Net" value={money(net)} icon={FaWallet} color={net >= 0 ? 'green' : 'red'} delay={0.15} />
          <StatMini title="Entries" value={`${filtered.length}`} icon={FaMoneyBillWave} color="purple" delay={0.2} />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search entry" />
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto animate-fade-in-up delay-300 relative z-10">
            <GlassSelect value={selectedType} onChange={setSelectedType} options={types} />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[950px] sm:min-w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/10" style={font}>
                  {['Ref', 'Date', 'Type', 'Category', 'Method', 'Branch', 'Amount', 'Note'].map((h) => (
                    <th key={h} className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading || error || currentItems.length === 0 ? (
                  <tr className="animate-fade-in">
                    <td colSpan="9" className="px-3 py-6 text-center text-[14px] text-white/40" style={font}>
                      {loading ? 'Loading…' : error || 'No transactions found'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((e, index) => {
                    const auto = !!e.source_doc;
                    return (
                      <tr
                        key={e.id}
                        className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                        style={{ animationFillMode: 'both' }}
                      >
                        <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={font}>
                          {e.ref}
                          {auto && <span className="ml-1.5 align-middle"><StatusBadge label="Auto" color="purple" /></span>}
                        </td>
                        <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{fmtDate(e.entry_date)}</td>
                        <td className="px-2 py-1.5"><StatusBadge label={e.entry_type} color={e.entry_type === 'Income' ? 'green' : 'red'} /></td>
                        <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={font}>{e.category || '—'}</td>
                        <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{e.method || '—'}</td>
                        <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{e.branch_name || '—'}</td>
                        <td className={`px-2 py-1.5 text-[12px] whitespace-nowrap ${e.entry_type === 'Income' ? 'text-emerald-400' : 'text-red-400'}`} style={font}>
                          {signed(e)}
                        </td>
                        <td className="px-2 py-1.5 text-white/60 text-[11px] max-w-[180px] truncate" style={font} title={e.note || ''}>{e.note}</td>
                        <td className="px-2 py-1.5 text-right whitespace-nowrap">
                          <RowActions
                            onView={() => setViewingEntry(e)}
                            onEdit={cEdit && !auto ? () => openEdit(e) : undefined}
                            onPrint={cPrint ? () => printRecord(entryRecord(e)) : undefined}
                            onPdf={cPrint ? () => savePdfRecord(entryRecord(e)) : undefined}
                            onExcel={cPrint ? () => exportRecordExcel(entryRecord(e)) : undefined}
                            onDelete={cDelete && !auto ? () => handleDelete(e) : undefined}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} />
        </div>

        {showForm && (
          <GlassModal
            title={editingEntry ? `Edit Entry — ${editingEntry.ref}` : 'Add Entry'}
            icon={<FaMoneyBillWave className="text-white text-xs" />}
            onClose={closeForm}
            footer={
              <>
                <button onClick={closeForm} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={font}>
                  {saving ? 'Saving…' : editingEntry ? 'Update Entry' : 'Save Entry'}
                </button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormInput label="Date" type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
              <FormSelect label="Type" options={['Expense', 'Income']} value={form.entry_type} onChange={(e) => setForm({ ...form, entry_type: e.target.value })} />
              <FormSelect label="Category" options={CATEGORIES} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <FormInput label="Amount (Rs.)" required inputMode="decimal" placeholder="Enter amount" value={form.amount} onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setForm({ ...form, amount: v }); }} />
              <FormSelect label="Payment Method" options={METHODS} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} />
              <div>
                <label className="text-white text-[13px] mb-0.5 block" style={font}>Branch</label>
                <SearchableSelect value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })} options={branchOptions} placeholder="Select branch" />
              </div>
              <div className="sm:col-span-2">
                <FormTextarea label="Note" placeholder="Enter note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
          </GlassModal>
        )}

        {viewingEntry && (
          <GlassModal
            title={`Finance Entry — ${viewingEntry.ref}`}
            icon={<FaMoneyBillWave className="text-white text-xs" />}
            onClose={() => setViewingEntry(null)}
            maxWidth="max-w-md"
            footer={
              <button onClick={() => setViewingEntry(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Close</button>
            }
          >
            <div className="space-y-2">
              {entryRecord(viewingEntry).info.map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center gap-3 py-1.5 border-b border-white/20">
                  <span className="text-white text-[12px] whitespace-nowrap" style={font}>{label}</span>
                  <span className="text-white text-[14px] text-right" style={font}>{value}</span>
                </div>
              ))}
            </div>
          </GlassModal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Finance;
