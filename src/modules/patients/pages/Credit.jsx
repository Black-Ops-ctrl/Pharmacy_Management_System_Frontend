import { useState } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import { FaMoneyBillWave, FaHandHoldingUsd, FaFileInvoice, FaUsers, FaExclamationCircle, FaEdit } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import StatMini from '../../../components/common/StatMini';
import GlassModal from '../../../components/common/GlassModal';
import ExportButtons from '../../../components/common/ExportButtons';
import RowActions, { IconBtn } from '../../../components/common/RowActions';
import { FormInput, FormSelect } from '../../../components/common/FormField';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { money, fmtDate } from '../../../utils/format';
import { printListReport, savePdfListReport, exportExcel, printRecord, savePdfRecord, exportRecordExcel } from '../../../utils/printFormat';

const font = { fontFamily: 'Poppins, sans-serif' };
const statusColor = { 'Clear': 'green', 'Within Limit': 'blue', 'Near Limit': 'amber', 'Over Limit': 'red' };
const METHODS = ['Cash', 'Card', 'JazzCash', 'EasyPaisa', 'Bank Transfer'];

const LIST_COLUMNS = [
  { key: 'code', label: 'Code' },
  { key: 'customer', label: 'Customer' },
  { key: 'phone', label: 'Phone' },
  { key: 'limit', label: 'Credit Limit', align: 'right' },
  { key: 'balance', label: 'Balance', align: 'right' },
  { key: 'lastPayment', label: 'Last Payment' },
  { key: 'status', label: 'Status' },
];

const LEDGER_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'ref', label: 'Ref' },
  { key: 'type', label: 'Type' },
  { key: 'method', label: 'Method' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'running', label: 'Balance', align: 'right' },
];

const withRunning = (account) => {
  let bal = Number(account.balance) || 0;
  return (account.entries || []).map((e) => {
    const row = { ...e, running: bal };
    bal -= Number(e.amount) || 0;
    return row;
  });
};

const Credit = () => {
  const { can } = useAuth();
  const toast = useToast();
  const cCreate = can('credit', 'create');
  const cEdit = can('credit', 'edit');
  const cDelete = can('credit', 'delete');
  const cPrint = can('credit', 'print');

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewingAccount, setViewingAccount] = useState(null);
  const [payingAccount, setPayingAccount] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payNote, setPayNote] = useState('');
  const [editingAccount, setEditingAccount] = useState(null);
  const [editForm, setEditForm] = useState({ limit: '', allowed: 'Yes' });
  const [saving, setSaving] = useState(false);

  const { data: accounts, loading, error, reload } = useApi('/credit');

  const filtered = accounts.filter((a) => {
    const q = searchTerm.toLowerCase();
    return (a.customer || '').toLowerCase().includes(q) ||
           (a.code || '').toLowerCase().includes(q) ||
           (a.phone || '').includes(searchTerm);
  });

  const filterKey = searchTerm;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const totalOutstanding = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const overLimitCount = accounts.filter((a) => a.status === 'Over Limit').length;
  const totalCollected = accounts.reduce((s, a) => s + (Number(a.total_paid) || 0), 0);

  const loadAccount = async (id) => {
    try {
      return await api.get(`/credit/${id}`);
    } catch (err) {
      toast.error('Could not load account', err.message);
      return null;
    }
  };

  const listArgs = () => ({
    title: 'Credit Accounts', columns: LIST_COLUMNS, fileName: 'credit-accounts',
    rows: filtered.map((a) => ({
      code: a.code, customer: a.customer, phone: a.phone || '',
      limit: money(a.credit_limit), balance: money(a.balance),
      lastPayment: fmtDate(a.last_payment) || '—', status: a.status,
    })),
    totals: { balance: money(filtered.reduce((s, a) => s + (Number(a.balance) || 0), 0)) },
  });

  const statementRecord = (a) => ({
    title: 'Credit Account Statement',
    subtitle: `${a.code} — ${a.customer}`,
    fileName: `credit-statement-${a.code}`,
    info: [
      { label: 'Customer', value: a.customer },
      { label: 'Code', value: a.code },
      { label: 'Phone', value: a.phone || '' },
      { label: 'City', value: a.city || '' },
      { label: 'Credit Allowed', value: a.credit_allowed ? 'Yes' : 'No' },
      { label: 'Credit Limit', value: money(a.credit_limit) },
      { label: 'Total Credit Sales', value: money(a.total_credit_sales) },
      { label: 'Total Paid', value: money(a.total_paid) },
      { label: 'Outstanding Balance', value: money(a.balance) },
      { label: 'Status', value: a.status },
      { label: 'Last Payment', value: fmtDate(a.last_payment) || '—' },
    ],
    items: {
      columns: LEDGER_COLUMNS,
      rows: withRunning(a).map((e) => ({
        date: fmtDate(e.date), ref: e.ref, type: e.type, method: e.payment_method || '',
        amount: `${e.amount >= 0 ? '+' : '−'} ${money(Math.abs(e.amount))}`, running: money(e.running),
      })),
    },
  });

  const withStatement = (fn) => async (a) => {
    const d = await loadAccount(a.id);
    if (d) fn(statementRecord(d));
  };
  const handlePrint = withStatement(printRecord);
  const handlePdf = withStatement(savePdfRecord);
  const handleCsv = withStatement(exportRecordExcel);

  const handleView = async (a) => {
    const d = await loadAccount(a.id);
    if (d) setViewingAccount(d);
  };

  const openPay = (a) => { setPayingAccount(a); setPayAmount(''); setPayMethod('Cash'); setPayNote(''); };
  const closePay = () => { setPayingAccount(null); setPayAmount(''); setPayNote(''); };

  const handleReceivePayment = async () => {
    const amt = Number(payAmount);
    if (!(amt > 0)) {
      toast.error('Invalid amount', 'Enter the amount received');
      return;
    }
    if (amt > Number(payingAccount.balance) + 0.001) {
      toast.error('Invalid amount', `Amount cannot be more than the balance of ${money(payingAccount.balance)}`);
      return;
    }
    setSaving(true);
    try {
      const { message } = await api.post('/credit/payments', { party_id: payingAccount.id, amount: amt, method: payMethod, note: payNote.trim() });
      toast.success(message || 'Payment received');
      closePay();
      reload();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (entry) => {
    if (!window.confirm(`Delete payment ${entry.ref} of ${money(Math.abs(entry.amount))}?`)) return;
    try {
      const { message } = await api.del(`/credit/payments/${entry.id}`);
      toast.success(message || 'Payment deleted');
      reload();
      const d = await loadAccount(viewingAccount.id);
      setViewingAccount(d);
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const openEdit = (a) => {
    setEditingAccount(a);
    setEditForm({ limit: String(a.credit_limit ?? ''), allowed: a.credit_allowed ? 'Yes' : 'No' });
  };

  const handleSaveEdit = async () => {
    if (editForm.limit !== '' && !(Number(editForm.limit) >= 0)) {
      toast.error('Invalid credit limit', 'Enter a limit of 0 or more');
      return;
    }
    setSaving(true);
    try {
      const { message } = await api.put(`/credit/${editingAccount.id}`, {
        credit_limit: Number(editForm.limit) || 0,
        credit_allowed: editForm.allowed === 'Yes',
      });
      toast.success(message || 'Credit account updated');
      setEditingAccount(null);
      reload();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (a) => {
    if (!window.confirm(`Close the credit account of ${a.customer}?`)) return;
    try {
      const { message } = await api.del(`/credit/${a.id}`);
      toast.success(message || 'Credit account closed');
      reload();
    } catch (err) {
      toast.error('Could not close account', err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in p-1">
        <PageHeader
          title="Customer Credit"
          actions={cPrint ? (
            <ExportButtons
              onPrint={() => printListReport(listArgs())}
              onExcel={() => exportExcel(listArgs())}
              onPdf={() => savePdfListReport(listArgs())}
            />
          ) : null}
        />

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <StatMini title="Total Outstanding" value={money(totalOutstanding)} icon={FaFileInvoice} color="amber" delay={0.05} />
          <StatMini title="Credit Accounts" value={`${accounts.length}`} icon={FaUsers} color="purple" delay={0.1} />
          <StatMini title="Over Limit" value={`${overLimitCount} accounts`} icon={FaExclamationCircle} color="red" delay={0.15} />
          <StatMini title="Collected" value={money(totalCollected)} icon={FaHandHoldingUsd} color="green" delay={0.2} />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search customer" />
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px] sm:min-w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/10" style={font}>
                  {['Customer', 'Phone', 'Credit Limit', 'Balance', 'Last Payment', 'Status'].map((h) => (
                    <th key={h} className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading || error || currentItems.length === 0 ? (
                  <tr className="animate-fade-in">
                    <td colSpan="7" className="px-3 py-6 text-center text-[14px] text-white/40" style={font}>
                      {loading ? 'Loading…' : error || 'No credit accounts found'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((a, index) => (
                    <tr
                      key={a.id}
                      className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                      style={{ animationFillMode: 'both' }}
                    >
                      <td className="px-2 py-1.5">
                        <div className="whitespace-nowrap">
                          <div className="text-white text-[12px]" style={font}>{a.customer}</div>
                          <div className="text-white/70 text-[10px]" style={font}>{a.code}</div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{a.phone || '—'}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{money(a.credit_limit)}</td>
                      <td className={`px-2 py-1.5 text-[12px] whitespace-nowrap ${a.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`} style={font}>{money(a.balance)}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{fmtDate(a.last_payment) || '—'}</td>
                      <td className="px-2 py-1.5"><StatusBadge label={a.status} color={statusColor[a.status]} /></td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <RowActions
                          onView={() => handleView(a)}
                          onEdit={cEdit ? () => openEdit(a) : undefined}
                          onPrint={cPrint ? () => handlePrint(a) : undefined}
                          onPdf={cPrint ? () => handlePdf(a) : undefined}
                          onExcel={cPrint ? () => handleCsv(a) : undefined}
                          onDelete={cDelete ? () => handleClose(a) : undefined}
                        >
                          {cCreate && (
                            <IconBtn kind="pay" onClick={() => openPay(a)} disabled={!(a.balance > 0)} title={a.balance > 0 ? 'Receive Payment' : 'Nothing outstanding'} />
                          )}
                        </RowActions>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} />
        </div>

        {viewingAccount && (
          <GlassModal
            title={`${viewingAccount.customer} — Credit Ledger`}
            icon={<FaFileInvoice className="text-white text-xs" />}
            onClose={() => setViewingAccount(null)}
            maxWidth="max-w-lg"
            footer={
              <button onClick={() => setViewingAccount(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Close</button>
            }
          >
            <div className="mt-1 p-3 rounded-sm bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-white/20 text-center mb-3">
              <p className="text-white text-[10px] uppercase tracking-wider" style={font}>Outstanding Balance</p>
              <p className="text-white text-lg font-bold" style={font}>{money(viewingAccount.balance)}</p>
              <p className="text-white/50 text-[11px]" style={font}>
                Limit: {money(viewingAccount.credit_limit)} · Credit Sales: {money(viewingAccount.total_credit_sales)} · Paid: {money(viewingAccount.total_paid)}
              </p>
              <div className="mt-1"><StatusBadge label={viewingAccount.status} color={statusColor[viewingAccount.status]} /></div>
            </div>
            <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1.5" style={font}>Entries</p>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
              {withRunning(viewingAccount).length === 0 ? (
                <p className="text-white/40 text-[12px] text-center py-3" style={font}>No ledger entries</p>
              ) : withRunning(viewingAccount).map((e, i) => (
                <div key={`${e.txn_type}-${e.id}`} className="flex justify-between items-center gap-2 p-2 rounded-sm bg-white/5 border border-white/20 animate-fade-in-left" style={{ animationDelay: `${0.1 + i * 0.05}s`, animationFillMode: 'both' }}>
                  <div className="min-w-0">
                    <p className="text-white text-[12px]" style={font}>{e.ref}</p>
                    <p className="text-white/60 text-[11px]" style={font}>
                      {fmtDate(e.date)} — {e.type}{e.payment_method && e.type === 'Payment' ? ` (${e.payment_method})` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className={`text-[13px] ${e.amount >= 0 ? 'text-amber-400' : 'text-emerald-400'}`} style={font}>
                        {e.amount >= 0 ? '+' : '−'} {money(Math.abs(e.amount))}
                      </p>
                      <p className="text-white/50 text-[10px]" style={font}>Bal {money(e.running)}</p>
                    </div>
                    {cDelete && e.txn_type === 'credit_payment' && (
                      <IconBtn kind="delete" title="Delete payment" onClick={() => handleDeletePayment(e)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassModal>
        )}

        {payingAccount && (
          <GlassModal
            title={`Receive Payment — ${payingAccount.customer}`}
            icon={<FaMoneyBillWave className="text-white text-xs" />}
            onClose={closePay}
            maxWidth="max-w-sm"
            footer={
              <>
                <button onClick={closePay} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Cancel</button>
                <button onClick={handleReceivePayment} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={font}>
                  {saving ? 'Saving…' : 'Receive Payment'}
                </button>
              </>
            }
          >
            <div className="space-y-2">
              <div className="p-2 rounded-sm bg-white/5 border border-white/20 text-center">
                <p className="text-white/60 text-[11px]" style={font}>Current Outstanding</p>
                <p className="text-amber-400 text-sm font-medium" style={font}>{money(payingAccount.balance)}</p>
              </div>
              <FormInput label="Amount Received (Rs.)" required inputMode="decimal" placeholder="Enter amount" value={payAmount} onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setPayAmount(v); }} />
              <FormSelect label="Payment Method" options={METHODS} value={payMethod} onChange={(e) => setPayMethod(e.target.value)} />
              <FormInput label="Note" placeholder="Enter note" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
            </div>
          </GlassModal>
        )}

        {editingAccount && (
          <GlassModal
            title={`Edit Credit Account — ${editingAccount.customer}`}
            icon={<FaEdit className="text-white text-xs" />}
            onClose={() => setEditingAccount(null)}
            maxWidth="max-w-sm"
            footer={
              <>
                <button onClick={() => setEditingAccount(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={font}>
                  {saving ? 'Saving…' : 'Update Account'}
                </button>
              </>
            }
          >
            <div className="space-y-2">
              <FormInput label="Credit Limit (Rs.)" inputMode="numeric" placeholder="Enter credit limit" value={editForm.limit} onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setEditForm({ ...editForm, limit: v }); }} />
              <FormSelect label="Credit Allowed" options={['Yes', 'No']} value={editForm.allowed} onChange={(e) => setEditForm({ ...editForm, allowed: e.target.value })} />
            </div>
          </GlassModal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Credit;
