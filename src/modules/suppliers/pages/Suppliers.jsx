import { useState } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import { FaPlus, FaHandshake, FaTruck, FaFileInvoiceDollar, FaFileInvoice } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import GlassSelect from '../../../components/common/GlassSelect';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import StatMini from '../../../components/common/StatMini';
import GlassModal from '../../../components/common/GlassModal';
import RowActions from '../../../components/common/RowActions';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormField';
import { money, fmtDate } from '../../../utils/format';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

const emptyForm = { name: '', contactPerson: '', phone: '', email: '', city: '', ntn: '', licenseNo: '', paymentTerms: '30 Days Credit', address: '', status: 'Active' };
const STATUSES = ['Active', 'On Hold', 'Blacklisted'];
const PAYMENT_TERMS = ['Cash on Delivery', '15 Days Credit', '30 Days Credit', '45 Days Credit', '60 Days Credit'];
const statusColor = { 'Active': 'green', 'On Hold': 'amber', 'Blacklisted': 'red' };

const Suppliers = () => {
  const { can } = useAuth();
  const toast = useToast();
  const { data: suppliers, loading, error, reload } = useApi('/suppliers');
  const { data: cityLov } = useApi('/lov/cities');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const cityNames = cityLov.map(c => c.name);
  const cities = ['All Cities', ...cityNames];
  const statuses = ['All Status', ...STATUSES];
  const paymentTermsList = form.paymentTerms && !PAYMENT_TERMS.includes(form.paymentTerms) ? [...PAYMENT_TERMS, form.paymentTerms] : PAYMENT_TERMS;
  const formCities = form.city && !cityNames.includes(form.city) ? [...cityNames, form.city] : cityNames;

  const q = searchTerm.toLowerCase();
  const filtered = suppliers.filter((s) => {
    const matchesSearch = (s.name || '').toLowerCase().includes(q) ||
                          (s.code || '').toLowerCase().includes(q) ||
                          (s.contact_person || '').toLowerCase().includes(q) ||
                          (s.phone || '').includes(searchTerm);
    const matchesCity = selectedCity === 'All Cities' || s.city === selectedCity;
    const matchesStatus = selectedStatus === 'All Status' || s.status === selectedStatus;
    return matchesSearch && matchesCity && matchesStatus;
  });

  const filterKey = JSON.stringify([searchTerm, selectedCity, selectedStatus]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const totalPurchases = suppliers.reduce((s, x) => s + (x.total_purchases || 0), 0);
  const totalPOs = suppliers.reduce((s, x) => s + (x.po_count || 0), 0);

  const closeModal = () => { setShowAddModal(false); setEditingSupplier(null); setForm(emptyForm); };
  const handleAdd = () => { setEditingSupplier(null); setForm(emptyForm); setShowAddModal(true); };
  const handleEdit = (s) => {
    setEditingSupplier(s);
    setForm({
      name: s.name || '', contactPerson: s.contact_person || '', phone: s.phone || '', email: s.email || '', city: s.city || '',
      ntn: s.ntn || '', licenseNo: s.license_no || '', paymentTerms: s.payment_terms || '', address: s.address || '', status: s.status || 'Active',
    });
    setShowAddModal(true);
  };
  const handleDelete = async (s) => {
    if (!window.confirm(`Delete supplier ${s.name}?`)) return;
    try {
      const res = await api.del(`/suppliers/${s.id}`);
      toast.success(res.message || 'Supplier deleted');
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Supplier name is required', 'Enter the supplier name'); return; }
    if (!form.phone.trim()) { toast.error('Phone is required', 'Enter the phone number'); return; }
    if (form.phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) { toast.error('Invalid phone number', 'Use digits only, like 0300-1234567'); return; }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { toast.error('Invalid email', 'Enter a valid email address'); return; }
    const body = {
      name: form.name.trim(),
      contact_person: form.contactPerson || null,
      phone: form.phone.trim(),
      email: form.email || null,
      city: form.city || null,
      ntn: form.ntn || null,
      license_no: form.licenseNo || null,
      payment_terms: form.paymentTerms || null,
      address: form.address || null,
      status: form.status,
    };
    setSaving(true);
    try {
      const res = editingSupplier ? await api.put(`/suppliers/${editingSupplier.id}`, body) : await api.post('/suppliers', body);
      toast.success(res.message || (editingSupplier ? 'Supplier updated' : 'Supplier added'));
      closeModal();
      reload();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const viewRows = viewingSupplier ? [
    ['Code', viewingSupplier.code],
    ['Contact', [viewingSupplier.contact_person, viewingSupplier.phone].filter(Boolean).join(' — ')],
    ['Email', viewingSupplier.email],
    ['City', viewingSupplier.city],
    ['Address', viewingSupplier.address],
    ['NTN', viewingSupplier.ntn],
    ['Drug License No', viewingSupplier.license_no],
    ['Purchase Orders', viewingSupplier.po_count ?? 0],
    ['Total Returns', money(viewingSupplier.total_returns)],
    ['Last Supply', fmtDate(viewingSupplier.last_supply)],
  ] : [];

  return (
    <DashboardLayout>
      <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in p-1">
        <PageHeader
          title="Suppliers"
          actions={
            can('suppliers', 'create') ? (
              <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <FaPlus size={12} /> Add Supplier
              </button>
            ) : null
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <StatMini title="Total Suppliers" value={`${suppliers.length}`} icon={FaHandshake} color="purple" delay={0.05} />
          <StatMini title="Active" value={`${suppliers.filter(s => s.status === 'Active').length}`} icon={FaTruck} color="green" delay={0.1} />
          <StatMini title="Total Purchases" value={money(totalPurchases)} icon={FaFileInvoiceDollar} color="blue" delay={0.15} />
          <StatMini title="Purchase Orders" value={`${totalPOs}`} icon={FaFileInvoice} color="amber" delay={0.2} />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search supplier" />
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto animate-fade-in-up delay-300 relative z-10">
            <GlassSelect value={selectedCity} onChange={setSelectedCity} options={cities} />
            <GlassSelect value={selectedStatus} onChange={setSelectedStatus} options={statuses} />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[950px] sm:min-w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/10" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Supplier</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Contact</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">City</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">License No</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Terms</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Purchases</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading || error || currentItems.length === 0 ? (
                  <tr className="animate-fade-in">
                    <td colSpan="8" className="px-3 py-6 text-center text-[14px] text-white/40" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {loading ? 'Loading…' : error ? error : 'No suppliers found'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((s, index) => (
                    <tr
                      key={s.id}
                      className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                      style={{ animationFillMode: 'both' }}
                    >
                      <td className="px-2 py-1.5">
                        <div className="whitespace-nowrap">
                          <div className="text-white text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{s.name}</div>
                          <div className="text-white/70 text-[10px] truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>{s.code}{s.ntn ? ` — NTN: ${s.ntn}` : ''}</div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="whitespace-nowrap">
                          <div className="text-white text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{s.contact_person || '—'}</div>
                          <div className="text-white/70 text-[10px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{s.phone}</div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{s.city || '—'}</td>
                      <td className="px-2 py-1.5 text-white/80 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{s.license_no || '—'}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{s.payment_terms || '—'}</td>
                      <td className="px-2 py-1.5 text-emerald-400 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(s.total_purchases)}</td>
                      <td className="px-2 py-1.5"><StatusBadge label={s.status} color={statusColor[s.status]} /></td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <RowActions
                          onView={() => setViewingSupplier(s)}
                          onEdit={can('suppliers', 'edit') ? () => handleEdit(s) : undefined}
                          onDelete={can('suppliers', 'delete') ? () => handleDelete(s) : undefined}
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

        {showAddModal && (
          <GlassModal
            title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            onClose={closeModal}
            footer={
              <>
                <button onClick={closeModal} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {saving ? 'Saving…' : `${editingSupplier ? 'Update' : 'Save'} Supplier`}
                </button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              <FormInput label="Supplier Name" required placeholder="Enter supplier name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <FormInput label="Contact Person" placeholder="Enter contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              <FormInput label="Phone" required placeholder="Enter phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <FormInput label="Email" placeholder="Enter email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <FormSelect label="City" options={formCities} value={form.city} placeholder="Select city" onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <FormInput label="NTN" placeholder="Enter NTN" value={form.ntn} onChange={(e) => setForm({ ...form, ntn: e.target.value })} />
              <FormInput label="Drug License No" placeholder="Enter license number" value={form.licenseNo} onChange={(e) => setForm({ ...form, licenseNo: e.target.value })} />
              <FormSelect label="Payment Terms" options={paymentTermsList} value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} />
              <FormSelect label="Status" options={STATUSES} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
              <div className="sm:col-span-2 md:col-span-3">
                <FormTextarea label="Address" placeholder="Enter address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
          </GlassModal>
        )}

        {viewingSupplier && (
          <GlassModal
            title={`${viewingSupplier.name} — Details`}
            icon={<FaHandshake className="text-white text-xs" />}
            onClose={() => setViewingSupplier(null)}
            maxWidth="max-w-md"
            footer={
              <button onClick={() => setViewingSupplier(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Close</button>
            }
          >
            <div className="space-y-2">
              {viewRows.map(([label, value]) => (
                <div key={label} className="flex justify-between items-center gap-3 py-1.5 border-b border-white/20">
                  <span className="text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{label}</span>
                  <span className="text-white text-[14px] text-right" style={{ fontFamily: 'Poppins, sans-serif' }}>{value || value === 0 ? value : '—'}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-1.5 border-b border-white/20">
                <span className="text-white text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Payment Terms</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-white text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{viewingSupplier.payment_terms || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/20">
                <span className="text-white text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Status</span>
                <StatusBadge label={viewingSupplier.status} color={statusColor[viewingSupplier.status]} />
              </div>
              <div className="mt-3 p-3 rounded-sm bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-white/20 text-center">
                <p className="text-white text-[10px] uppercase tracking-wider" style={{ fontFamily: 'Poppins, sans-serif' }}>Total Purchases</p>
                <p className="text-white text-lg font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(viewingSupplier.total_purchases)}</p>
              </div>
            </div>
          </GlassModal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Suppliers;
