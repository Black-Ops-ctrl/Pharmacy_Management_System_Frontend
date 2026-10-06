import { useState } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import { FaMotorcycle, FaCheck, FaShoppingCart, FaClock, FaTruck, FaCheckCircle, FaBan, FaFilePdf, FaPrint } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import GlassSelect from '../../../components/common/GlassSelect';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import StatMini from '../../../components/common/StatMini';
import GlassModal from '../../../components/common/GlassModal';
import ExportButtons from '../../../components/common/ExportButtons';
import RowActions, { IconBtn } from '../../../components/common/RowActions';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import SearchableSelect from '../../../components/common/SearchableSelect';
import { FormInput } from '../../../components/common/FormField';
import { printListReport, savePdfListReport, exportExcel, printRecord, savePdfRecord, exportRecordExcel } from '../../../utils/printFormat';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { money, num, fmtDate, fmtDateTime, today } from '../../../utils/format';

const statuses = ['All Status', 'New', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
const statusColor = { 'New': 'purple', 'Preparing': 'amber', 'Out for Delivery': 'blue', 'Delivered': 'green', 'Cancelled': 'red' };
const nextStatus = { 'New': 'Preparing', 'Preparing': 'Out for Delivery', 'Out for Delivery': 'Delivered' };
const font = { fontFamily: 'Poppins, sans-serif' };

const OnlineOrders = () => {
  const { can } = useAuth();
  const toast = useToast();
  const cPrint = can('online-orders', 'print');
  const cEdit = can('online-orders', 'edit');
  const cDelete = can('online-orders', 'delete');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [riderOrder, setRiderOrder] = useState(null);
  const [riderPick, setRiderPick] = useState('');
  const [riderName, setRiderName] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: orders, loading, error, reload } = useApi('/online-orders', { from: dateFrom, to: dateTo });
  const { data: employees } = useApi('/lov/employees', null, { enabled: !!riderOrder });

  const filtered = orders.filter((o) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (o.order_no || '').toLowerCase().includes(q) ||
                          (o.customer_name || '').toLowerCase().includes(q) ||
                          (o.phone || '').includes(searchTerm);
    const matchesStatus = selectedStatus === 'All Status' || o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const filterKey = [searchTerm, selectedStatus, dateFrom, dateTo].join('|');
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const countOf = (st) => orders.filter((o) => o.status === st).length;
  const todayStr = today();
  const deliveredToday = orders.filter((o) => o.status === 'Delivered' && fmtDate(o.order_date) === todayStr).length;

  const listColumns = [
    { key: 'order', label: 'Order No' },
    { key: 'date', label: 'Date / Time' },
    { key: 'customer', label: 'Customer' },
    { key: 'phone', label: 'Phone' },
    { key: 'invoice', label: 'Invoice' },
    { key: 'payment', label: 'Payment' },
    { key: 'rider', label: 'Rider' },
    { key: 'status', label: 'Status' },
    { key: 'total', label: 'Total (Rs.)', align: 'right' },
  ];
  const listRows = filtered.map((o) => ({
    order: o.order_no, date: fmtDateTime(o.order_date), customer: o.customer_name || '', phone: o.phone || '',
    invoice: o.invoice_no || '', payment: o.payment || '', rider: o.rider || '', status: o.status, total: money(o.total),
  }));
  const listArgs = {
    title: 'Online Orders Report', dateFrom, dateTo, columns: listColumns, rows: listRows,
    totals: { total: money(filtered.reduce((s, o) => s + (Number(o.total) || 0), 0)) },
  };
  const doPrintList = () => printListReport(listArgs);
  const doPdfList = () => savePdfListReport({ ...listArgs, fileName: 'Online_Orders_Report' });
  const doCsvList = () => exportExcel({ fileName: 'Online_Orders', columns: listColumns, rows: listRows });

  const loadOrder = async (id) => {
    try {
      return await api.get(`/online-orders/${id}`);
    } catch (err) {
      toast.error('Could not load order', err.message);
      return null;
    }
  };
  const recordFor = (o) => ({
    title: 'Online Order', subtitle: o.order_no, fileName: o.order_no,
    info: [
      { label: 'Order No', value: o.order_no },
      { label: 'Date / Time', value: fmtDateTime(o.order_date) },
      { label: 'Customer', value: o.customer_name || '' },
      { label: 'Phone', value: o.phone || '' },
      { label: 'Address', value: o.address || '' },
      { label: 'Payment', value: o.payment || '' },
      { label: 'Rider', value: o.rider || '' },
      { label: 'Invoice No', value: o.invoice_no || '' },
      { label: 'Branch', value: o.branch_name || '' },
      { label: 'Status', value: o.status },
      { label: 'Subtotal', value: money(o.subtotal) },
      { label: 'Discount', value: money(o.discount) },
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
      rows: (o.items || []).map((it) => ({ medicine: it.medicine, batch: it.batch || '', qty: num(it.qty), unit: it.unit, price: money(it.price), amount: money(it.amount) })),
      totals: { amount: money(o.total) },
    },
  });
  const withDetail = (fn) => async (row) => { const o = row.items ? row : await loadOrder(row.id); if (o) fn(recordFor(o)); };
  const printOne = withDetail(printRecord);
  const pdfOne = withDetail(savePdfRecord);
  const csvOne = withDetail(exportRecordExcel);
  const viewOne = async (row) => { const o = await loadOrder(row.id); if (o) setViewingOrder(o); };

  const updateOrder = async (o, body) => {
    setBusy(true);
    try {
      const res = await api.put(`/online-orders/${o.id}`, body);
      toast.success(res.message || 'Order updated');
      reload();
      return true;
    } catch (err) {
      toast.error('Could not save', err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const advanceStatus = (o) => {
    const next = nextStatus[o.status];
    if (!next || busy) return;
    if (next === 'Out for Delivery' && !o.rider) {
      setRiderPick('');
      setRiderName('');
      setRiderOrder(o);
      return;
    }
    updateOrder(o, { status: next });
  };

  const cancelOrder = (o) => {
    if (busy) return;
    if (!window.confirm(`Cancel order ${o.order_no}?`)) return;
    updateOrder(o, { status: 'Cancelled' });
  };

  const riderOptions = [...employees]
    .sort((a, b) => (a.job_role === 'Delivery Rider' ? 0 : 1) - (b.job_role === 'Delivery Rider' ? 0 : 1) || String(a.name).localeCompare(String(b.name)))
    .map((e) => ({ value: e.name, label: e.job_role ? `${e.name} — ${e.job_role}` : e.name }));

  const saveRider = async () => {
    const rider = (riderName || riderPick || '').trim();
    if (!rider) { toast.error('Rider is required', 'Select a rider or enter a name'); return; }
    const ok = await updateOrder(riderOrder, { status: 'Out for Delivery', rider });
    if (ok) setRiderOrder(null);
  };

  const deleteOrder = async (o) => {
    if (!window.confirm(`Delete order ${o.order_no}?`)) return;
    try {
      const res = await api.del(`/online-orders/${o.id}`);
      toast.success(res.message || 'Order deleted');
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in p-1">
        <PageHeader
          title="Online Orders"
          actions={
            <>
              <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
              {cPrint && <ExportButtons onPrint={doPrintList} onExcel={doCsvList} onPdf={doPdfList} />}
            </>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <StatMini title="New Orders" value={`${countOf('New')}`} icon={FaShoppingCart} color="purple" delay={0.05} />
          <StatMini title="Preparing" value={`${countOf('Preparing')}`} icon={FaClock} color="amber" delay={0.1} />
          <StatMini title="Out for Delivery" value={`${countOf('Out for Delivery')}`} icon={FaTruck} color="blue" delay={0.15} />
          <StatMini title="Delivered Today" value={`${deliveredToday}`} icon={FaCheckCircle} color="green" delay={0.2} />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search order" />
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto animate-fade-in-up delay-300 relative z-10">
            <GlassSelect value={selectedStatus} onChange={setSelectedStatus} options={statuses} width="sm:w-[170px] md:w-[190px]" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px] sm:min-w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/10" style={font}>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Order No</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Time</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Customer</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Payment</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Rider</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Total</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading || error || currentItems.length === 0 ? (
                  <tr className="animate-fade-in">
                    <td colSpan="8" className="px-3 py-6 text-center text-[14px] text-white/40" style={font}>
                      {loading ? 'Loading…' : error || 'No online orders found'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((o, index) => (
                    <tr
                      key={o.id}
                      className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                      style={{ animationFillMode: 'both' }}
                    >
                      <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={font}>{o.order_no}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{fmtDateTime(o.order_date)}</td>
                      <td className="px-2 py-1.5">
                        <div className="whitespace-nowrap">
                          <div className="text-white text-[12px]" style={font}>{o.customer_name}</div>
                          <div className="text-white/70 text-[10px]" style={font}>{o.phone}</div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{o.payment}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{o.rider || '—'}</td>
                      <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={font}>{money(o.total)}</td>
                      <td className="px-2 py-1.5"><StatusBadge label={o.status} color={statusColor[o.status] || 'gray'} /></td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <RowActions
                          onView={() => viewOne(o)}
                          onPrint={cPrint ? () => printOne(o) : undefined}
                          onPdf={cPrint ? () => pdfOne(o) : undefined}
                          onExcel={cPrint ? () => csvOne(o) : undefined}
                          onDelete={cDelete ? () => deleteOrder(o) : undefined}
                        >
                          {cEdit && nextStatus[o.status] && (
                            <button onClick={() => advanceStatus(o)} disabled={busy} title={`Move to ${nextStatus[o.status]}`} className="w-7 h-7 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 disabled:opacity-40">
                              {o.status === 'Preparing' ? <FaMotorcycle size={12} /> : <FaCheck size={12} />}
                            </button>
                          )}
                          {cEdit && ['New', 'Preparing'].includes(o.status) && (
                            <IconBtn kind="delete" title="Cancel Order" disabled={busy} onClick={() => cancelOrder(o)}>
                              <FaBan size={12} />
                            </IconBtn>
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

        {viewingOrder && (
          <GlassModal
            title={`${viewingOrder.order_no} — ${viewingOrder.customer_name}`}
            icon={<FaShoppingCart className="text-white text-xs" />}
            onClose={() => setViewingOrder(null)}
            maxWidth="max-w-md"
            footer={
              <>
                <button onClick={() => setViewingOrder(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Close</button>
                {cPrint && <button onClick={() => pdfOne(viewingOrder)} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-sm text-white text-[13px] transition-all" style={font}>
                  <FaFilePdf size={10} /> PDF
                </button>}
                {cPrint && <button onClick={() => printOne(viewingOrder)} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-sm text-white text-[13px] transition-all" style={font}>
                  <FaPrint size={10} /> Print
                </button>}
              </>
            }
          >
            <div className="space-y-2 mb-3">
              <div className="p-2 rounded-sm bg-white/5 border border-white/20">
                <p className="text-white/60 text-[11px]" style={font}>Delivery Address</p>
                <p className="text-white text-[13px]" style={font}>{viewingOrder.address || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Phone', viewingOrder.phone],
                  ['Status', viewingOrder.status],
                  ['Payment', viewingOrder.payment],
                  ['Rider', viewingOrder.rider],
                  ['Invoice No', viewingOrder.invoice_no],
                  ['Branch', viewingOrder.branch_name],
                ].map(([label, value]) => (
                  <div key={label} className="p-2 rounded-sm bg-white/5 border border-white/20">
                    <p className="text-white/60 text-[11px]" style={font}>{label}</p>
                    <p className="text-white text-[13px]" style={font}>{value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1.5" style={font}>Items</p>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
              {(viewingOrder.items || []).map((it, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded-sm bg-white/5 border border-white/20 animate-fade-in-left" style={{ animationDelay: `${0.1 + i * 0.08}s`, animationFillMode: 'both' }}>
                  <div>
                    <p className="text-white text-[13px]" style={font}>{it.medicine}</p>
                    <p className="text-white/60 text-[11px]" style={font}>{num(it.qty)} {it.unit} × {money(it.price)}</p>
                  </div>
                  <span className="text-white text-[13px]" style={font}>{money(it.amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-white/20 pt-2">
              <div className="flex justify-between text-[12px] text-white/70" style={font}>
                <span>Subtotal</span><span>{money(viewingOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[12px] text-emerald-400" style={font}>
                <span>Discount</span><span>- {money(viewingOrder.discount)}</span>
              </div>
            </div>
            <div className="mt-2 p-3 rounded-sm bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-white/20 text-center">
              <p className="text-white text-[10px] uppercase tracking-wider" style={font}>Order Total</p>
              <p className="text-white text-lg font-bold" style={font}>{money(viewingOrder.total)}</p>
            </div>
          </GlassModal>
        )}

        {riderOrder && (
          <GlassModal
            title={`Assign Rider — ${riderOrder.order_no}`}
            icon={<FaMotorcycle className="text-white text-xs" />}
            onClose={() => { if (!busy) setRiderOrder(null); }}
            maxWidth="max-w-sm"
            footer={
              <>
                <button onClick={() => setRiderOrder(null)} disabled={busy} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Cancel</button>
                <button onClick={saveRider} disabled={busy} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={font}>{busy ? 'Saving…' : 'Send Out for Delivery'}</button>
              </>
            }
          >
            <div className="space-y-2">
              <div>
                <label className="text-white text-[13px] mb-0.5 block" style={font}>Rider</label>
                <SearchableSelect value={riderPick} onChange={(v) => { setRiderPick(v); setRiderName(''); }} options={riderOptions} placeholder="Select employee" />
              </div>
              <FormInput label="Rider Name" placeholder="Enter rider name" value={riderName} onChange={(e) => setRiderName(e.target.value)} />
            </div>
          </GlassModal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OnlineOrders;
