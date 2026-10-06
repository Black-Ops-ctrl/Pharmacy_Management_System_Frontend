import { useState } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import { FaPlus, FaStore, FaCheckCircle, FaUsers, FaMoneyBillWave } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import StatMini from '../../../components/common/StatMini';
import GlassModal from '../../../components/common/GlassModal';
import RowActions from '../../../components/common/RowActions';
import { FormInput, FormSelect } from '../../../components/common/FormField';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { money, num } from '../../../utils/format';

const emptyForm = { name: '', city: '', address: '', phone: '', manager: '', status: 'Active' };
const statusColor = (s) => (s === 'Active' ? 'green' : s === 'Opening Soon' ? 'amber' : 'red');
const font = { fontFamily: 'Poppins, sans-serif' };
const th = 'px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap';
const td = 'px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap';

const Branches = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: branchList, loading, error, reload } = useApi('/branches');
  const { data: cityList } = useApi('/lov/cities');
  const cities = cityList.map((c) => c.name);
  const cityOptions = form.city && !cities.includes(form.city) ? [form.city, ...cities] : cities;

  const q = searchTerm.toLowerCase();
  const filtered = branchList.filter((b) =>
    !q || [b.code, b.name, b.city, b.address, b.phone, b.manager].some((v) => (v || '').toLowerCase().includes(q))
  );

  const [prevSearch, setPrevSearch] = useState(searchTerm);
  if (prevSearch !== searchTerm) { setPrevSearch(searchTerm); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const stats = {
    total: branchList.length,
    active: branchList.filter((b) => b.status === 'Active').length,
    staff: branchList.reduce((s, b) => s + (Number(b.staff) || 0), 0),
    sales: branchList.reduce((s, b) => s + (Number(b.today_sales) || 0), 0),
  };

  const closeForm = () => { setShowAddModal(false); setEditingBranch(null); setForm(emptyForm); };
  const handleAdd = () => { setEditingBranch(null); setForm(emptyForm); setShowAddModal(true); };
  const handleEdit = (b) => {
    setEditingBranch(b);
    setForm({ name: b.name || '', city: b.city || '', address: b.address || '', phone: b.phone || '', manager: b.manager || '', status: b.status || 'Active' });
    setShowAddModal(true);
  };
  const handleDelete = async (b) => {
    if (!window.confirm(`Delete branch "${b.name}"?`)) return;
    try {
      const { message } = await api.del(`/branches/${b.id}`);
      toast.success(message || 'Branch deleted', b.name);
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Branch name is required', 'Enter the branch name'); return; }
    if (!form.address.trim()) { toast.error('Address is required', 'Enter the branch address'); return; }
    if (form.phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) { toast.error('Invalid phone number', 'Use digits only, like 0300-1234567'); return; }
    const body = {
      name: form.name.trim(), city: form.city, address: form.address.trim(),
      phone: form.phone.trim(), manager: form.manager.trim(), status: form.status,
    };
    setSaving(true);
    try {
      const { message } = editingBranch
        ? await api.put(`/branches/${editingBranch.id}`, body)
        : await api.post('/branches', body);
      toast.success(message || (editingBranch ? 'Branch updated' : 'Branch added'), body.name);
      closeForm();
      reload();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in p-1">
        <PageHeader
          title="Branches"
          actions={can('branches', 'create') && (
            <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={font}>
              <FaPlus size={12} /> Add Branch
            </button>
          )}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <StatMini title="Total Branches" value={num(stats.total, 0)} icon={FaStore} color="purple" delay={0.05} />
          <StatMini title="Active" value={num(stats.active, 0)} icon={FaCheckCircle} color="green" delay={0.1} />
          <StatMini title="Total Staff" value={num(stats.staff, 0)} icon={FaUsers} color="blue" delay={0.15} />
          <StatMini title="Today's Sales" value={money(stats.sales)} icon={FaMoneyBillWave} color="amber" delay={0.2} />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search branch" />
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px] sm:min-w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/10" style={font}>
                  <th className={th}>Code</th>
                  <th className={th}>Branch Name</th>
                  <th className={th}>City</th>
                  <th className={th}>Address</th>
                  <th className={th}>Phone</th>
                  <th className={th}>Manager</th>
                  <th className={th}>Staff</th>
                  <th className={th}>Today's Sales</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading || error || currentItems.length === 0 ? (
                  <tr className="animate-fade-in">
                    <td colSpan="10" className="px-3 py-6 text-center text-[14px] text-white/40" style={font}>
                      {error || (loading ? 'Loading…' : 'No branches found')}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((b, index) => (
                    <tr
                      key={b.id}
                      className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                      style={{ animationFillMode: 'both' }}
                    >
                      <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={font}>{b.code}</td>
                      <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={font}>{b.name}</td>
                      <td className={td} style={font}>{b.city || '—'}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] max-w-[220px] truncate" style={font} title={b.address || ''}>{b.address || '—'}</td>
                      <td className={td} style={font}>{b.phone || '—'}</td>
                      <td className={td} style={font}>{b.manager || '—'}</td>
                      <td className={td} style={font}>{num(b.staff, 0)}</td>
                      <td className="px-2 py-1.5 text-emerald-400 text-[12px] whitespace-nowrap" style={font}>{money(b.today_sales)}</td>
                      <td className="px-2 py-1.5"><StatusBadge label={b.status} color={statusColor(b.status)} /></td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <RowActions
                          onView={() => setViewing(b)}
                          onEdit={can('branches', 'edit') ? () => handleEdit(b) : undefined}
                          onDelete={can('branches', 'delete') ? () => handleDelete(b) : undefined}
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

        {viewing && (
          <GlassModal
            title="Branch Details"
            icon={<FaStore className="text-white text-xs" />}
            maxWidth="max-w-md"
            onClose={() => setViewing(null)}
            footer={<button onClick={() => setViewing(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Close</button>}
          >
            <div className="space-y-2">
              {[
                ['Code', viewing.code],
                ['Branch Name', viewing.name],
                ['City', viewing.city || '—'],
                ['Address', viewing.address || '—'],
                ['Phone', viewing.phone || '—'],
                ['Manager', viewing.manager || '—'],
                ['Staff', num(viewing.staff, 0)],
                ["Today's Sales", money(viewing.today_sales)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center gap-3 py-1.5 border-b border-white/20">
                  <span className="text-white text-[12px]" style={font}>{label}</span>
                  <span className="text-white text-[14px] text-right" style={font}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-1.5">
                <span className="text-white text-[12px]" style={font}>Status</span>
                <StatusBadge label={viewing.status} color={statusColor(viewing.status)} />
              </div>
            </div>
          </GlassModal>
        )}

        {showAddModal && (
          <GlassModal
            title={editingBranch ? 'Edit Branch' : 'Add New Branch'}
            icon={<FaStore className="text-white text-xs" />}
            onClose={closeForm}
            footer={
              <>
                <button onClick={closeForm} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={font}>
                  {saving ? 'Saving…' : `${editingBranch ? 'Update' : 'Save'} Branch`}
                </button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormInput label="Branch Name" required placeholder="Enter branch name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <FormSelect label="City" options={cityOptions} placeholder="Select city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <div className="sm:col-span-2">
                <FormInput label="Address" required placeholder="Enter address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <FormInput label="Phone" placeholder="Enter phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <FormInput label="Branch Manager" placeholder="Enter manager name" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
              <FormSelect label="Status" options={['Active', 'Opening Soon', 'Closed']} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
            </div>
          </GlassModal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Branches;
