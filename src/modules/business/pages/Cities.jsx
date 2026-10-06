import { useState } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import { FaPlus, FaCity } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import Pagination from '../../../components/common/Pagination';
import GlassModal from '../../../components/common/GlassModal';
import RowActions from '../../../components/common/RowActions';
import { FormInput } from '../../../components/common/FormField';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

const emptyForm = { name: '' };
const font = { fontFamily: 'Poppins, sans-serif' };
const th = 'px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap';

const Cities = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: cities, loading, error, reload } = useApi('/cities');

  const q = searchTerm.toLowerCase();
  const filtered = cities.filter((c) => !q || (c.name || '').toLowerCase().includes(q));

  const [prevSearch, setPrevSearch] = useState(searchTerm);
  if (prevSearch !== searchTerm) { setPrevSearch(searchTerm); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const canEdit = can('cities', 'edit');
  const canDelete = can('cities', 'delete');

  const closeForm = () => { setShowModal(false); setEditingCity(null); setForm(emptyForm); };
  const handleAdd = () => { setEditingCity(null); setForm(emptyForm); setShowModal(true); };
  const handleEdit = (c) => { setEditingCity(c); setForm({ name: c.name || '' }); setShowModal(true); };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete city "${c.name}"?`)) return;
    try {
      const { message } = await api.del(`/cities/${c.id}`);
      toast.success(message || 'City deleted', c.name);
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) { toast.error('City name is required', 'Enter the city name'); return; }
    const body = { name, status: 'Active' };
    setSaving(true);
    try {
      const { message } = editingCity
        ? await api.put(`/cities/${editingCity.id}`, body)
        : await api.post('/cities', body);
      toast.success(message || (editingCity ? 'City updated' : 'City added'), name);
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
          title="Cities"
          actions={can('cities', 'create') && (
            <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={font}>
              <FaPlus size={12} /> Add City
            </button>
          )}
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search city" />
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/10" style={font}>
                  <th className={th}>#</th>
                  <th className={th}>City Name</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading || error || currentItems.length === 0 ? (
                  <tr className="animate-fade-in">
                    <td colSpan="3" className="px-3 py-6 text-center text-[14px] text-white/40" style={font}>
                      {error || (loading ? 'Loading…' : 'No cities found')}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((c, index) => (
                    <tr
                      key={c.id}
                      className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                      style={{ animationFillMode: 'both' }}
                    >
                      <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={font}>{startIndex + index + 1}</td>
                      <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={font}>{c.name}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <RowActions
                          onEdit={canEdit ? () => handleEdit(c) : undefined}
                          onDelete={canDelete ? () => handleDelete(c) : undefined}
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

        {showModal && (
          <GlassModal
            title={editingCity ? 'Edit City' : 'Add New City'}
            icon={<FaCity className="text-white text-xs" />}
            maxWidth="max-w-md"
            onClose={closeForm}
            footer={
              <>
                <button onClick={closeForm} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={font}>
                  {saving ? 'Saving…' : `${editingCity ? 'Update' : 'Save'} City`}
                </button>
              </>
            }
          >
            <div className="grid grid-cols-1 gap-2">
              <FormInput label="City Name" required placeholder="Enter city name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </GlassModal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Cities;
