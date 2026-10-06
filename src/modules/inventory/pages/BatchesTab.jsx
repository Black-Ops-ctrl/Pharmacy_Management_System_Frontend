import { useState } from 'react';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import GlassSelect from '../../../components/common/GlassSelect';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import ExportButtons from '../../../components/common/ExportButtons';
import RowActions from '../../../components/common/RowActions';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { money, fmtDate } from '../../../utils/format';
import { printListReport, savePdfListReport, exportExcel } from '../../../utils/printFormat';
import BatchEditModal from './BatchEditModal';
import BatchTraceModal from './BatchTraceModal';
import { FONT, qtyUom } from './invUtils';
import StateRow from './StateRow';

const KEY = 'inv-batches';
const BASE = '/inventory/batches';
const statusColor = { 'Active': 'green', 'Near Expiry': 'amber', 'Expired': 'red', 'Consumed': 'gray' };

const BatchesTab = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [tracing, setTracing] = useState(null);
  const [editing, setEditing] = useState(null);

  const statuses = ['All Status', 'Active', 'Near Expiry', 'Expired', 'Consumed'];
  const { data: batches, loading, error, reload } = useApi(BASE, { from, to });

  const filtered = batches.filter((b) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (b.batch_no || '').toLowerCase().includes(q) ||
                          (b.medicine_name || '').toLowerCase().includes(q) ||
                          (b.supplier_name || '').toLowerCase().includes(q) ||
                          (b.grn_no || '').toLowerCase().includes(q);
    const matchesStatus = selectedStatus === 'All Status' || b.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const filterKey = JSON.stringify([searchTerm, selectedStatus, from, to]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const columns = [
    { key: 'batch', label: 'Batch' },
    { key: 'medicine', label: 'Medicine' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'grn', label: 'GRN' },
    { key: 'received', label: 'Received' },
    { key: 'expiry', label: 'Expiry' },
    { key: 'received_qty', label: 'Received Qty', align: 'right' },
    { key: 'remaining', label: 'Remaining', align: 'right' },
    { key: 'unit_cost', label: 'Unit Cost', align: 'right' },
    { key: 'value', label: 'Stock Value', align: 'right' },
    { key: 'status', label: 'Status' },
  ];
  const report = () => ({
    title: 'Batch Traceability',
    dateFrom: from,
    dateTo: to,
    columns,
    rows: filtered.map((b) => ({
      batch: b.batch_no,
      medicine: b.medicine_name,
      supplier: b.supplier_name || '',
      grn: b.grn_no || '',
      received: fmtDate(b.received_date),
      expiry: fmtDate(b.expiry),
      received_qty: qtyUom(b.received_qty, b.uom),
      remaining: qtyUom(b.qty, b.uom),
      unit_cost: money(b.unit_cost),
      value: money(b.stock_value),
      status: b.status,
    })),
    totals: { value: money(filtered.reduce((s, b) => s + (Number(b.stock_value) || 0), 0)) },
    fileName: 'Batches',
  });

  const handleDelete = async (b) => {
    if (!window.confirm(`Delete batch ${b.batch_no} of ${b.medicine_name}?`)) return;
    try {
      const { message } = await api.del(`${BASE}/${b.id}`);
      toast.success(message || 'Batch deleted');
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Batch Traceability"
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
          </>
        }
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search batch" />
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto animate-fade-in-up delay-300 relative z-10">
          <GlassSelect value={selectedStatus} onChange={setSelectedStatus} options={statuses} />
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1050px] sm:min-w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10" style={FONT}>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Batch</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Medicine</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Supplier</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">GRN</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Received</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Expiry</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Received Qty</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Remaining</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Unit Cost</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || error || currentItems.length === 0 ? (
                <StateRow colSpan={11} loading={loading} error={error} empty="No batches found" />
              ) : (
                currentItems.map((b, index) => (
                  <tr
                    key={b.id}
                    className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                    style={{ animationFillMode: 'both' }}
                  >
                    <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={FONT}>{b.batch_no}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={FONT}>
                      {b.medicine_name}
                      {b.branch_name && <div className="text-white/60 text-[10px]" style={FONT}>{b.branch_name}</div>}
                    </td>
                    <td className="px-2 py-1.5 text-white/80 text-[12px] whitespace-nowrap" style={FONT}>{b.supplier_name || '—'}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={FONT}>{b.grn_no || '—'}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={FONT}>{fmtDate(b.received_date) || '—'}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={FONT}>{fmtDate(b.expiry) || '—'}</td>
                    <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={FONT}>{qtyUom(b.received_qty, b.uom)}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={FONT}>{qtyUom(b.qty, b.uom)}</td>
                    <td className="px-2 py-1.5 text-white/80 text-[12px] whitespace-nowrap" style={FONT}>{money(b.unit_cost)}</td>
                    <td className="px-2 py-1.5"><StatusBadge label={b.status} color={statusColor[b.status]} /></td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <RowActions
                        onView={() => setTracing(b)}
                        onEdit={can(KEY, 'edit') ? () => setEditing(b) : undefined}
                        onDelete={can(KEY, 'delete') ? () => handleDelete(b) : undefined}
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

      {tracing && <BatchTraceModal batch={tracing} basePath={BASE} onClose={() => setTracing(null)} />}
      {editing && (
        <BatchEditModal batch={editing} basePath={BASE} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
    </>
  );
};

export default BatchesTab;
