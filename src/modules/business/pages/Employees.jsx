import { useState } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import { FaPlus, FaUserTie, FaUsers, FaUserCheck, FaUserClock, FaUserSlash } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import GlassSelect from '../../../components/common/GlassSelect';
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
import { fmtDate, num, today } from '../../../utils/format';

const roles = ['Pharmacist', 'Branch Manager', 'Cashier', 'Salesman', 'Delivery Rider', 'Accountant'];
const shifts = ['Morning (9am - 5pm)', 'Evening (5pm - 1am)', 'Night (1am - 9am)', 'Full Day'];
const statuses = ['Active', 'On Leave', 'Terminated'];
const roleColor = { 'Pharmacist': 'purple', 'Branch Manager': 'blue', 'Cashier': 'green', 'Salesman': 'amber', 'Delivery Rider': 'red', 'Accountant': 'gray' };
const statusColor = (s) => (s === 'Active' ? 'green' : s === 'On Leave' ? 'amber' : 'red');
const font = { fontFamily: 'Poppins, sans-serif' };

const makeEmptyForm = () => ({ name: '', phone: '', cnic: '', job_role: 'Cashier', branch_id: '', shift: 'Morning (9am - 5pm)', joined_on: today(), status: 'Active' });

const Employees = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(makeEmptyForm);
  const [saving, setSaving] = useState(false);

  const { data: employees, loading, error, reload } = useApi('/employees');
  const { data: branchList } = useApi('/lov/branches');
  const branchOptions = branchList.map((b) => ({ value: b.id, label: b.name }));

  const q = searchTerm.toLowerCase();
  const filtered = employees.filter((e) => {
    const matchesSearch = !q ||
      (e.name || '').toLowerCase().includes(q) ||
      (e.phone || '').toLowerCase().includes(q) ||
      (e.cnic || '').toLowerCase().includes(q) ||
      (e.code || '').toLowerCase().includes(q);
    const matchesRole = selectedRole === 'All Roles' || e.job_role === selectedRole;
    const matchesBranch = selectedBranch === 'All Branches' || e.branch_name === selectedBranch;
    return matchesSearch && matchesRole && matchesBranch;
  });

  const filterKey = `${searchTerm}|${selectedRole}|${selectedBranch}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const stats = {
    total: employees.length,
    active: employees.filter((e) => e.status === 'Active').length,
    onLeave: employees.filter((e) => e.status === 'On Leave').length,
    terminated: employees.filter((e) => e.status === 'Terminated').length,
  };

  const closeForm = () => { setShowAddModal(false); setEditingEmployee(null); setForm(makeEmptyForm()); };
  const handleAdd = () => { setEditingEmployee(null); setForm(makeEmptyForm()); setShowAddModal(true); };
  const handleEdit = (e) => {
    setEditingEmployee(e);
    setForm({
      name: e.name || '', phone: e.phone || '', cnic: e.cnic || '', job_role: e.job_role || 'Cashier',
      branch_id: e.branch_id ?? '', shift: e.shift || 'Morning (9am - 5pm)', joined_on: fmtDate(e.joined_on) || today(),
      status: e.status || 'Active',
    });
    setShowAddModal(true);
  };
  const handleDelete = async (e) => {
    if (!window.confirm(`Delete employee "${e.name}" (${e.code})?`)) return;
    try {
      const { message } = await api.del(`/employees/${e.id}`);
      toast.success(message || 'Employee deleted', e.name);
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Full name is required', 'Enter the employee name'); return; }
    if (!form.phone.trim()) { toast.error('Phone is required', 'Enter the phone number'); return; }
    if (form.phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) { toast.error('Invalid phone number', 'Use digits only, like 0300-1234567'); return; }
    if (form.cnic.trim() && !/^\d{5}-?\d{7}-?\d$/.test(form.cnic.trim())) { toast.error('Invalid CNIC', 'Enter 13 digits, like 42101-1234567-1'); return; }
    const body = {
      name: form.name.trim(), phone: form.phone.trim(), cnic: form.cnic.trim(), job_role: form.job_role,
      branch_id: form.branch_id || null, shift: form.shift, joined_on: form.joined_on || today(), status: form.status,
    };
    setSaving(true);
    try {
      const { message } = editingEmployee
        ? await api.put(`/employees/${editingEmployee.id}`, body)
        : await api.post('/employees', body);
      toast.success(message || (editingEmployee ? 'Employee updated' : 'Employee added'), body.name);
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
          title="Employees"
          actions={can('employees', 'create') && (
            <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={font}>
              <FaPlus size={12} /> Add Employee
            </button>
          )}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <StatMini title="Total Employees" value={num(stats.total, 0)} icon={FaUsers} color="purple" delay={0.05} />
          <StatMini title="Active" value={num(stats.active, 0)} icon={FaUserCheck} color="green" delay={0.1} />
          <StatMini title="On Leave" value={num(stats.onLeave, 0)} icon={FaUserClock} color="amber" delay={0.15} />
          <StatMini title="Terminated" value={num(stats.terminated, 0)} icon={FaUserSlash} color="red" delay={0.2} />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search employee" />
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto animate-fade-in-up delay-300 relative z-10">
            <GlassSelect value={selectedRole} onChange={setSelectedRole} options={['All Roles', ...roles]} />
            <GlassSelect value={selectedBranch} onChange={setSelectedBranch} options={['All Branches', ...branchList.map((b) => b.name)]} width="sm:w-[160px] md:w-[180px]" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px] sm:min-w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/10" style={font}>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Code</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Employee</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">CNIC</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Role</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Branch</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Shift</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading || error ? (
                  <tr className="animate-fade-in">
                    <td colSpan="8" className="px-3 py-6 text-center text-[14px] text-white/40" style={font}>
                      {error || 'Loading…'}
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr className="animate-fade-in">
                    <td colSpan="8" className="px-3 py-6 text-center text-white/40 text-[14px]" style={font}>
                      No employees found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((emp, index) => (
                    <tr
                      key={emp.id}
                      className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                      style={{ animationFillMode: 'both' }}
                    >
                      <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={font}>{emp.code}</td>
                      <td className="px-2 py-1.5">
                        <div className="whitespace-nowrap">
                          <div className="text-white text-[12px]" style={font}>{emp.name}</div>
                          <div className="text-white/70 text-[10px]" style={font}>{emp.phone}</div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{emp.cnic || '—'}</td>
                      <td className="px-2 py-1.5">{emp.job_role ? <StatusBadge label={emp.job_role} color={roleColor[emp.job_role]} /> : <span className="text-white/40 text-[12px]">—</span>}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{emp.branch_name || '—'}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{emp.shift || '—'}</td>
                      <td className="px-2 py-1.5"><StatusBadge label={emp.status} color={statusColor(emp.status)} /></td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <RowActions
                          onView={() => setViewing(emp)}
                          onEdit={can('employees', 'edit') ? () => handleEdit(emp) : undefined}
                          onDelete={can('employees', 'delete') ? () => handleDelete(emp) : undefined}
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
            title="Employee Details"
            icon={<FaUserTie className="text-white text-xs" />}
            maxWidth="max-w-md"
            onClose={() => setViewing(null)}
            footer={<button onClick={() => setViewing(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Close</button>}
          >
            <div className="space-y-2">
              {[
                ['Code', viewing.code],
                ['Full Name', viewing.name],
                ['Phone', viewing.phone || '—'],
                ['CNIC', viewing.cnic || '—'],
                ['Role', viewing.job_role || '—'],
                ['Branch', viewing.branch_name || '—'],
                ['Shift', viewing.shift || '—'],
                ['Joined On', fmtDate(viewing.joined_on) || '—'],
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
            title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            icon={<FaUserTie className="text-white text-xs" />}
            onClose={closeForm}
            footer={
              <>
                <button onClick={closeForm} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={font}>
                  {saving ? 'Saving…' : `${editingEmployee ? 'Update' : 'Save'} Employee`}
                </button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              <FormInput label="Full Name" required placeholder="Enter full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <FormInput label="Phone" required placeholder="Enter phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <FormInput label="CNIC" placeholder="Enter CNIC" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
              <FormSelect label="Role" options={roles} value={form.job_role} onChange={(e) => setForm({ ...form, job_role: e.target.value })} />
              <FormSelect label="Branch" options={branchOptions} placeholder="Select branch" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} />
              <FormSelect label="Shift" options={shifts} value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} />
              <FormInput label="Joined On" type="date" value={form.joined_on} onChange={(e) => setForm({ ...form, joined_on: e.target.value })} />
              <FormSelect label="Status" options={statuses} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
            </div>
          </GlassModal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Employees;
