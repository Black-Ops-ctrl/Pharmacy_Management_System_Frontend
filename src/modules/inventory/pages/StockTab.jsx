import { useState, useMemo } from 'react';
import { FaBoxes, FaExclamationTriangle, FaTimesCircle, FaWarehouse } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import GlassSelect from '../../../components/common/GlassSelect';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import StatMini from '../../../components/common/StatMini';
import GlassModal from '../../../components/common/GlassModal';
import ExportButtons from '../../../components/common/ExportButtons';
import RowActions from '../../../components/common/RowActions';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { money, fmtDate } from '../../../utils/format';
import { printListReport, savePdfListReport, exportExcel } from '../../../utils/printFormat';
import { FONT, qtyUom, btnCancel } from './invUtils';
import StateRow from './StateRow';

const KEY = 'inv-stock';
const statusColor = { 'In Stock': 'green', 'Low Stock': 'amber', 'Out of Stock': 'red' };
const batchColor = { 'Active': 'green', 'Near Expiry': 'amber', 'Expired': 'red', 'Consumed': 'gray' };

const StockViewModal = ({ item, onClose }) => {
  const { data: batches, loading, error } = useApi(`/inventory/stock/${item.medicine_id}`, { branch_id: item.branch_id || '' });
  return (
    <GlassModal
      title={`${item.name} — Batch-wise Stock`}
      icon={<FaBoxes className="text-white text-xs" />}
      onClose={onClose}
      maxWidth="max-w-md"
      footer={<button onClick={onClose} className={btnCancel} style={FONT}>Close</button>}
    >
      <div className="space-y-2">
        <div className="flex justify-between items-center py-1.5 border-b border-white/20">
          <span className="text-white text-[12px]" style={FONT}>Branch</span>
          <span className="text-white text-[14px]" style={FONT}>{item.branch_name || '—'}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-white/20">
          <span className="text-white text-[12px]" style={FONT}>Total On Hand</span>
          <span className="text-white text-[14px] font-medium" style={FONT}>{qtyUom(item.on_hand, item.uom)}</span>
        </div>
        {item.expired_qty > 0 && (
          <div className="flex justify-between items-center py-1.5 border-b border-white/20">
            <span className="text-white text-[12px]" style={FONT}>Expired (not sellable)</span>
            <span className="text-red-400 text-[14px]" style={FONT}>{qtyUom(item.expired_qty, item.uom)}</span>
          </div>
        )}
        {loading ? (
          <p className="text-white/40 text-[13px] py-3 text-center" style={FONT}>Loading…</p>
        ) : error ? (
          <p className="text-white/40 text-[13px] py-3 text-center" style={FONT}>{error}</p>
        ) : batches.length === 0 ? (
          <p className="text-white/40 text-[13px] py-3 text-center" style={FONT}>Out of stock</p>
        ) : (
          <div className="mt-2">
            <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1.5" style={FONT}>Active Batches</p>
            {batches.map((b, i) => (
              <div key={b.id} className="flex justify-between items-center p-2 mb-1.5 rounded-sm bg-white/5 border border-white/20 animate-fade-in-left" style={{ animationDelay: `${0.1 + i * 0.08}s`, animationFillMode: 'both' }}>
                <div>
                  <p className="text-white text-[13px]" style={FONT}>{b.batch_no} {b.status !== 'Active' && <StatusBadge label={b.status} color={batchColor[b.status]} />}</p>
                  <p className="text-white/60 text-[11px]" style={FONT}>Expiry: {fmtDate(b.expiry) || '—'}{!item.branch_id && b.branch_name ? ` — ${b.branch_name}` : ''}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-white text-[12px]" style={FONT}>{qtyUom(b.qty, item.uom)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassModal>
  );
};

const StockTab = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewing, setViewing] = useState(null);

  const statuses = ['All Status', 'In Stock', 'Low Stock', 'Out of Stock'];
  const { data: stockItems, loading, error, reload } = useApi('/inventory/stock');
  const { data: branchList } = useApi('/lov/branches');
  const branches = useMemo(() => ['All Branches', ...branchList.map((b) => b.name)], [branchList]);

  const filtered = stockItems.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (item.name || '').toLowerCase().includes(q) ||
                          (item.generic || '').toLowerCase().includes(q) ||
                          (item.code || '').toLowerCase().includes(q);
    const matchesStatus = selectedStatus === 'All Status' || item.status === selectedStatus;
    const matchesBranch = selectedBranch === 'All Branches' || item.branch_name === selectedBranch;
    return matchesSearch && matchesStatus && matchesBranch;
  });

  const filterKey = JSON.stringify([searchTerm, selectedStatus, selectedBranch]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const totalSkus = new Set(stockItems.map((i) => i.medicine_id)).size;
  const totalValue = stockItems.reduce((sum, i) => sum + (Number(i.stock_value) || 0), 0);
  const lowCount = stockItems.filter((i) => i.status === 'Low Stock').length;
  const outCount = stockItems.filter((i) => i.status === 'Out of Stock').length;

  const columns = [
    { key: 'medicine', label: 'Medicine' },
    { key: 'generic', label: 'Generic' },
    { key: 'branch', label: 'Branch' },
    { key: 'on_hand', label: 'On Hand', align: 'right' },
    { key: 'expired', label: 'Expired', align: 'right' },
    { key: 'value', label: 'Stock Value', align: 'right' },
    { key: 'status', label: 'Status' },
  ];
  const exportRows = () => filtered.map((i) => ({
    medicine: i.name,
    generic: i.generic || '',
    branch: i.branch_name || '—',
    on_hand: qtyUom(i.on_hand, i.uom),
    expired: i.expired_qty > 0 ? qtyUom(i.expired_qty, i.uom) : '',
    value: money(i.stock_value),
    status: i.status,
  }));
  const totals = () => ({ value: money(filtered.reduce((s, i) => s + (Number(i.stock_value) || 0), 0)) });
  const report = () => ({ title: 'Stock Overview', columns, rows: exportRows(), totals: totals(), fileName: 'Stock-Overview' });

  const handleDelete = async (item) => {
    if (!window.confirm(`Clear all stock of ${item.name} at ${item.branch_name}?`)) return;
    try {
      const { message } = await api.del(`/inventory/stock/${item.medicine_id}`, { branch_id: item.branch_id });
      toast.success(message || 'Stock cleared');
      reload();
    } catch (err) {
      toast.error('Could not clear stock', err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Stock Overview"
        actions={can(KEY, 'print') && (
          <ExportButtons
            onPrint={() => printListReport(report())}
            onExcel={() => exportExcel(report())}
            onPdf={() => savePdfListReport(report())}
          />
        )}
      />

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <StatMini title="Total SKUs" value={`${totalSkus} items`} icon={FaBoxes} color="purple" delay={0.05} />
        <StatMini title="Stock Value" value={money(totalValue)} icon={FaWarehouse} color="green" delay={0.1} />
        <StatMini title="Low Stock" value={`${lowCount} items`} icon={FaExclamationTriangle} color="amber" delay={0.15} />
        <StatMini title="Out of Stock" value={`${outCount} items`} icon={FaTimesCircle} color="red" delay={0.2} />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search medicine" />
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto animate-fade-in-up delay-300 relative z-10">
          <GlassSelect value={selectedStatus} onChange={setSelectedStatus} options={statuses} />
          <GlassSelect value={selectedBranch} onChange={setSelectedBranch} options={branches} width="sm:w-[160px] md:w-[180px]" />
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px] sm:min-w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10" style={FONT}>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Medicine</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Branch</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">On Hand</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Stock Value</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || error || currentItems.length === 0 ? (
                <StateRow colSpan={6} loading={loading} error={error} empty="No stock records found" />
              ) : (
                currentItems.map((item, index) => (
                  <tr
                    key={`${item.medicine_id}-${item.branch_id ?? 'none'}`}
                    className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                    style={{ animationFillMode: 'both' }}
                  >
                    <td className="px-2 py-1.5">
                      <div className="whitespace-nowrap">
                        <div className="text-white text-[12px]" style={FONT}>{item.name}</div>
                        {item.generic && <div className="text-white/70 text-[10px] truncate" style={FONT}>{item.generic}</div>}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={FONT}>{item.branch_name || '—'}</td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={FONT}>
                      {qtyUom(item.on_hand, item.uom)}
                      {item.expired_qty > 0 && <div className="text-red-400 text-[10px]" style={FONT}>{qtyUom(item.expired_qty, item.uom)} expired</div>}
                    </td>
                    <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={FONT}>{money(item.stock_value)}</td>
                    <td className="px-2 py-1.5"><StatusBadge label={item.status} color={statusColor[item.status]} /></td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <RowActions
                        onView={() => setViewing(item)}
                        onDelete={can(KEY, 'delete') && item.branch_id && (item.on_hand + item.expired_qty) > 0 ? () => handleDelete(item) : undefined}
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

      {viewing && <StockViewModal item={viewing} onClose={() => setViewing(null)} />}
    </>
  );
};

export default StockTab;
