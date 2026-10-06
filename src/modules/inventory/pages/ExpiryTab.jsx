import { useState, useMemo } from 'react';
import { FaExclamationTriangle, FaSkullCrossbones, FaClock, FaCalendarAlt } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import GlassSelect from '../../../components/common/GlassSelect';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import StatMini from '../../../components/common/StatMini';
import ExportButtons from '../../../components/common/ExportButtons';
import RowActions from '../../../components/common/RowActions';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { money, fmtDate } from '../../../utils/format';
import { printListReport, savePdfListReport, exportExcel } from '../../../utils/printFormat';
import BatchEditModal from './BatchEditModal';
import BatchTraceModal from './BatchTraceModal';
import { FONT, qtyUom, daysLeftText } from './invUtils';
import StateRow from './StateRow';

const KEY = 'inv-expiry';
const BASE = '/inventory/expiry';

const WINDOW_DAYS = { 'Within 30 Days': 30, 'Within 90 Days': 90, 'Within 180 Days': 180, 'Within 365 Days': 365 };
const windows = ['All Windows', 'Expired', ...Object.keys(WINDOW_DAYS)];

const alertOf = (d) => {
  if (d < 0) return { label: 'Expired', color: 'red' };
  if (d <= 30) return { label: 'Within 30 Days', color: 'red' };
  if (d <= 90) return { label: 'Within 90 Days', color: 'amber' };
  if (d <= 180) return { label: 'Within 180 Days', color: 'blue' };
  return { label: 'Within 365 Days', color: 'gray' };
};

const ExpiryTab = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWindow, setSelectedWindow] = useState('All Windows');
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);

  const { data: items, loading, error, reload } = useApi(BASE, { days: 365 });
  const { data: branchList } = useApi('/lov/branches');
  const branches = useMemo(() => ['All Branches', ...branchList.map((b) => b.name)], [branchList]);

  const inWindow = (d, w) => {
    if (w === 'All Windows') return true;
    if (w === 'Expired') return d < 0;
    return d >= 0 && d <= WINDOW_DAYS[w];
  };

  const filtered = items.filter((i) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (i.medicine_name || '').toLowerCase().includes(q) ||
                          (i.batch_no || '').toLowerCase().includes(q) ||
                          (i.supplier_name || '').toLowerCase().includes(q);
    const matchesBranch = selectedBranch === 'All Branches' || i.branch_name === selectedBranch;
    return matchesSearch && matchesBranch && inWindow(i.days_left, selectedWindow);
  });

  const filterKey = JSON.stringify([searchTerm, selectedWindow, selectedBranch]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const expiredCount = items.filter((i) => i.days_left < 0).length;
  const critical30 = items.filter((i) => i.days_left >= 0 && i.days_left <= 30).length;
  const within90 = items.filter((i) => i.days_left >= 0 && i.days_left <= 90).length;
  const riskValue = items.filter((i) => i.days_left <= 30).reduce((s, i) => s + (Number(i.stock_value) || 0), 0);

  const columns = [
    { key: 'medicine', label: 'Medicine' },
    { key: 'batch', label: 'Batch' },
    { key: 'branch', label: 'Branch' },
    { key: 'expiry', label: 'Expiry' },
    { key: 'days', label: 'Days Left' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'value', label: 'Value', align: 'right' },
    { key: 'status', label: 'Status' },
  ];
  const report = () => ({
    title: `Expiry Alerts${selectedWindow !== 'All Windows' ? ` — ${selectedWindow}` : ''}`,
    columns,
    rows: filtered.map((i) => ({
      medicine: i.medicine_name,
      batch: i.batch_no,
      branch: i.branch_name || '—',
      expiry: fmtDate(i.expiry),
      days: daysLeftText(i.days_left),
      qty: qtyUom(i.qty, i.uom),
      value: money(i.stock_value),
      status: alertOf(i.days_left).label,
    })),
    totals: { value: money(filtered.reduce((s, i) => s + (Number(i.stock_value) || 0), 0)) },
    fileName: 'Expiry-Alerts',
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
        title="Expiry Alerts"
        actions={can(KEY, 'print') && (
          <ExportButtons
            onPrint={() => printListReport(report())}
            onExcel={() => exportExcel(report())}
            onPdf={() => savePdfListReport(report())}
          />
        )}
      />

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <StatMini title="Expired Batches" value={`${expiredCount} batches`} icon={FaSkullCrossbones} color="red" delay={0.05} />
        <StatMini title="Expiring in 30 Days" value={`${critical30} batches`} icon={FaExclamationTriangle} color="amber" delay={0.1} />
        <StatMini title="Expiring in 90 Days" value={`${within90} batches`} icon={FaClock} color="blue" delay={0.15} />
        <StatMini title="Value at Risk" value={money(riskValue)} icon={FaCalendarAlt} color="purple" delay={0.2} />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search medicine" />
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto animate-fade-in-up delay-300 relative z-10">
          <GlassSelect value={selectedWindow} onChange={setSelectedWindow} options={windows} width="sm:w-[160px] md:w-[180px]" />
          <GlassSelect value={selectedBranch} onChange={setSelectedBranch} options={branches} width="sm:w-[160px] md:w-[180px]" />
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px] sm:min-w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10" style={FONT}>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Medicine</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Batch</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Branch</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Expiry</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Days Left</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Qty</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Value</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || error || currentItems.length === 0 ? (
                <StateRow colSpan={9} loading={loading} error={error} empty="No expiry alerts" />
              ) : (
                currentItems.map((i, index) => {
                  const a = alertOf(i.days_left);
                  return (
                    <tr
                      key={i.id}
                      className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                      style={{ animationFillMode: 'both' }}
                    >
                      <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={FONT}>{i.medicine_name}</td>
                      <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={FONT}>{i.batch_no}</td>
                      <td className="px-2 py-1.5 text-white/80 text-[12px] whitespace-nowrap" style={FONT}>{i.branch_name || '—'}</td>
                      <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={FONT}>{fmtDate(i.expiry)}</td>
                      <td className={`px-2 py-1.5 text-[12px] whitespace-nowrap ${i.days_left < 0 ? 'text-red-400' : i.days_left <= 30 ? 'text-amber-400' : 'text-white/80'}`} style={FONT}>{daysLeftText(i.days_left)}</td>
                      <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={FONT}>{qtyUom(i.qty, i.uom)}</td>
                      <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={FONT}>{money(i.stock_value)}</td>
                      <td className="px-2 py-1.5"><StatusBadge label={a.label} color={a.color} /></td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <RowActions
                          onView={() => setViewing(i)}
                          onEdit={can(KEY, 'edit') ? () => setEditing(i) : undefined}
                          onDelete={can(KEY, 'delete') ? () => handleDelete(i) : undefined}
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

      {viewing && <BatchTraceModal batch={viewing} basePath={BASE} onClose={() => setViewing(null)} />}
      {editing && (
        <BatchEditModal batch={editing} basePath={BASE} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
    </>
  );
};

export default ExpiryTab;
