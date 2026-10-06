import { useState } from 'react';
import { FaEye, FaPrint, FaFileInvoice, FaMoneyBillWave, FaCreditCard, FaReceipt, FaTrash } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import GlassSelect from '../../../components/common/GlassSelect';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import StatMini from '../../../components/common/StatMini';
import GlassModal from '../../../components/common/GlassModal';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import { FaFilePdf, FaFileExcel } from 'react-icons/fa';
import { printListReport, printRecord, savePdfRecord, savePdfListReport, exportExcel } from '../../../utils/printFormat';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { money, fmtDate, fmtDateTime, today } from '../../../utils/format';

const customerOf = (inv) => inv.party_name || inv.meta?.customer_name || inv.customer_name || 'Walk-in Customer';

const InvoicesTab = () => {
  const { can } = useAuth();
  const toast = useToast();
  const cPrint = can('sale-invoices', 'print');
  const cDelete = can('sale-invoices', 'delete');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('All Payments');
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  const payments = ['All Payments', 'Cash', 'Card', 'Credit', 'Digital', 'COD'];
  const paymentColor = { 'Cash': 'green', 'Card': 'blue', 'Credit': 'amber', 'Digital': 'purple', 'COD': 'gray' };

  const { data: invoices, loading, error, reload } = useApi('/sales', { from: dateFrom, to: dateTo });
  const { data: branchList } = useApi('/lov/branches');
  const branches = ['All Branches', ...branchList.map((b) => b.name)];

  const filtered = invoices.filter((inv) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (inv.doc_no || '').toLowerCase().includes(q) ||
                          (inv.customer_name || '').toLowerCase().includes(q) ||
                          (inv.cashier || '').toLowerCase().includes(q);
    const matchesPayment = selectedPayment === 'All Payments' || inv.payment_method === selectedPayment;
    const matchesBranch = selectedBranch === 'All Branches' || inv.branch_name === selectedBranch;
    return matchesSearch && matchesPayment && matchesBranch;
  });

  const filterKey = [searchTerm, selectedPayment, selectedBranch, dateFrom, dateTo].join('|');
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const loadInvoice = async (id) => {
    try {
      return await api.get(`/sales/${id}`);
    } catch (err) {
      toast.error('Could not load invoice', err.message);
      return null;
    }
  };

  const invoiceRecord = (inv) => ({
    title: 'Sale Invoice',
    subtitle: inv.doc_no,
    info: [
      { label: 'Invoice No', value: inv.doc_no },
      { label: 'Date / Time', value: fmtDateTime(inv.txn_date) },
      { label: 'Customer', value: customerOf(inv) },
      { label: 'Branch', value: inv.branch_name || '' },
      { label: 'Cashier', value: inv.user_name || '' },
      { label: 'Payment', value: inv.payment_method || '' },
      { label: 'Subtotal', value: money(inv.subtotal) },
      { label: 'Discount', value: money(inv.discount) },
    ],
    items: {
      columns: [
        { key: 'medicine', label: 'Medicine' },
        { key: 'batch', label: 'Batch' },
        { key: 'qty', label: 'Qty', align: 'right' },
        { key: 'unit', label: 'Unit' },
        { key: 'price', label: 'Price', align: 'right' },
        { key: 'amount', label: 'Amount', align: 'right' },
      ],
      rows: (inv.lines || []).map((it) => ({ medicine: it.medicine, batch: it.batch || '', qty: it.qty, unit: it.unit, price: money(it.price), amount: money(it.amount) })),
      totals: { amount: money(inv.total) },
    },
  });
  const printInvoice = async (row) => { const inv = row.lines ? row : await loadInvoice(row.id); if (inv) printRecord(invoiceRecord(inv)); };
  const pdfInvoice = async (row) => { const inv = row.lines ? row : await loadInvoice(row.id); if (inv) savePdfRecord({ ...invoiceRecord(inv), fileName: inv.doc_no }); };
  const viewInvoice = async (row) => { const inv = await loadInvoice(row.id); if (inv) setViewingInvoice(inv); };

  const deleteInvoice = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.doc_no}?`)) return;
    try {
      const res = await api.del(`/sales/${inv.id}`);
      toast.success(res.message || 'Invoice deleted');
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const invoiceListArgs = {
    title: 'Sale Invoices Report',
    dateFrom, dateTo,
    columns: [
      { key: 'invoice', label: 'Invoice No' },
      { key: 'date', label: 'Date / Time' },
      { key: 'customer', label: 'Customer' },
      { key: 'branch', label: 'Branch' },
      { key: 'cashier', label: 'Cashier' },
      { key: 'payment', label: 'Payment' },
      { key: 'itemCount', label: 'Items', align: 'right' },
      { key: 'totalRs', label: 'Total (Rs.)', align: 'right' },
    ],
    rows: filtered.map((i) => ({
      invoice: i.doc_no, date: fmtDateTime(i.txn_date), customer: i.customer_name || 'Walk-in Customer', branch: i.branch_name || '',
      cashier: i.cashier || '', payment: i.status === 'Cancelled' ? 'Cancelled' : (i.payment_method || ''), itemCount: i.item_count, totalRs: (Number(i.total) || 0).toLocaleString(),
    })),
    totals: { totalRs: filtered.filter((i) => i.status !== 'Cancelled').reduce((s, i) => s + (Number(i.total) || 0), 0).toLocaleString() },
  };
  const printInvoiceList = () => printListReport(invoiceListArgs);
  const pdfInvoiceList = () => savePdfListReport({ ...invoiceListArgs, fileName: 'Sale_Invoices_Report' });
  const excelInvoiceList = () => exportExcel({ fileName: 'Sale_Invoices', columns: invoiceListArgs.columns, rows: invoiceListArgs.rows });

  const sum = (list) => list.filter((i) => i.status !== 'Cancelled').reduce((s, i) => s + (Number(i.total) || 0), 0);
  const todayStr = today();
  const todayTotal = sum(filtered.filter((i) => fmtDate(i.txn_date) === todayStr));
  const cashTotal = sum(filtered.filter((i) => i.payment_method === 'Cash'));
  const digitalTotal = sum(filtered.filter((i) => ['Card', 'Digital'].includes(i.payment_method)));

  return (
    <>
      <PageHeader
        title="Sale Invoices"
        actions={
          <>
            <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
            {cPrint && <button onClick={printInvoiceList} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <FaPrint size={12} /> Print
            </button>}
            {cPrint && <button onClick={excelInvoiceList} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <FaFileExcel size={12} /> Excel
            </button>}
            {cPrint && <button onClick={pdfInvoiceList} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <FaFilePdf size={12} /> PDF
            </button>}
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <StatMini title="Total Invoices" value={`${filtered.filter((i) => i.status !== 'Cancelled').length}`} icon={FaFileInvoice} color="purple" delay={0.05} />
        <StatMini title="Today's Sales" value={money(todayTotal)} icon={FaReceipt} color="green" delay={0.1} />
        <StatMini title="Cash Received" value={money(cashTotal)} icon={FaMoneyBillWave} color="amber" delay={0.15} />
        <StatMini title="Digital Payments" value={money(digitalTotal)} icon={FaCreditCard} color="blue" delay={0.2} />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search invoice" />
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto animate-fade-in-up delay-300 relative z-10">
          <GlassSelect value={selectedPayment} onChange={setSelectedPayment} options={payments} />
          <GlassSelect value={selectedBranch} onChange={setSelectedBranch} options={branches} width="sm:w-[160px] md:w-[180px]" />
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px] sm:min-w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Invoice No</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Date / Time</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Customer</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Branch</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Cashier</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Items</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Payment</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Total</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || error || currentItems.length === 0 ? (
                <tr className="animate-fade-in">
                  <td colSpan="9" className="px-3 py-6 text-center text-[14px] text-white/40" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {loading ? 'Loading…' : error || 'No invoices found'}
                  </td>
                </tr>
              ) : (
                currentItems.map((inv, index) => (
                  <tr
                    key={inv.id}
                    className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                    style={{ animationFillMode: 'both' }}
                  >
                    <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{inv.doc_no}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{fmtDateTime(inv.txn_date)}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{inv.customer_name || 'Walk-in Customer'}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{inv.branch_name}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{inv.cashier}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{inv.item_count}</td>
                    <td className="px-2 py-1.5">{inv.status === 'Cancelled' ? <StatusBadge label="Cancelled" color="red" /> : <StatusBadge label={inv.payment_method} color={paymentColor[inv.payment_method] || 'gray'} />}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(inv.total)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => viewInvoice(inv)} title="View" className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 text-white text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-white/10 active:scale-95">
                          <FaEye size={12} />
                        </button>
                        {cPrint && <button onClick={() => printInvoice(inv)} title="Print" className="w-7 h-7 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-amber-500/20 active:scale-95">
                          <FaPrint size={12} />
                        </button>}
                        {cPrint && <button onClick={() => pdfInvoice(inv)} title="Save PDF" className="w-7 h-7 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-rose-500/20 active:scale-95">
                          <FaFilePdf size={12} />
                        </button>}
                        {cDelete && <button onClick={() => deleteInvoice(inv)} title="Delete" className="w-7 h-7 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-red-500/20 active:scale-95">
                          <FaTrash size={12} />
                        </button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} />
      </div>

      {viewingInvoice && (
        <GlassModal
          title={`Invoice ${viewingInvoice.doc_no}`}
          icon={<FaReceipt className="text-white text-xs" />}
          onClose={() => setViewingInvoice(null)}
          maxWidth="max-w-md"
          footer={
            <>
              <button onClick={() => setViewingInvoice(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Close</button>
              {cPrint && <button onClick={() => pdfInvoice(viewingInvoice)} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <FaFilePdf size={10} /> PDF
              </button>}
              {cPrint && <button onClick={() => printInvoice(viewingInvoice)} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <FaPrint size={10} /> Print Invoice
              </button>}
            </>
          }
        >
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 rounded-sm bg-white/5 border border-white/20">
              <p className="text-white/60 text-[11px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Customer</p>
              <p className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{customerOf(viewingInvoice)}</p>
            </div>
            <div className="p-2 rounded-sm bg-white/5 border border-white/20">
              <p className="text-white/60 text-[11px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Date / Time</p>
              <p className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{fmtDateTime(viewingInvoice.txn_date)}</p>
            </div>
            <div className="p-2 rounded-sm bg-white/5 border border-white/20">
              <p className="text-white/60 text-[11px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Branch</p>
              <p className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{viewingInvoice.branch_name}</p>
            </div>
            <div className="p-2 rounded-sm bg-white/5 border border-white/20">
              <p className="text-white/60 text-[11px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Cashier / Payment</p>
              <p className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{viewingInvoice.user_name} — {viewingInvoice.payment_method}</p>
            </div>
          </div>

          <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>Items (with batch trace)</p>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
            {(viewingInvoice.lines || []).map((it, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded-sm bg-white/5 border border-white/20 animate-fade-in-left" style={{ animationDelay: `${0.1 + i * 0.08}s`, animationFillMode: 'both' }}>
                <div>
                  <p className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{it.medicine}</p>
                  <p className="text-white/60 text-[11px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Batch: {it.batch} — {it.qty} {it.unit} × {money(it.price)}</p>
                </div>
                <span className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(it.amount)}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1 border-t border-white/20 pt-2">
            <div className="flex justify-between text-[12px] text-white/70" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <span>Subtotal</span><span>{money(viewingInvoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[12px] text-emerald-400" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <span>Discount</span><span>- {money(viewingInvoice.discount)}</span>
            </div>
          </div>
          <div className="mt-2 p-3 rounded-sm bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-white/20 text-center">
            <p className="text-white text-[10px] uppercase tracking-wider" style={{ fontFamily: 'Poppins, sans-serif' }}>Grand Total</p>
            <p className="text-white text-lg font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(viewingInvoice.total)}</p>
          </div>
        </GlassModal>
      )}
    </>
  );
};

export default InvoicesTab;
