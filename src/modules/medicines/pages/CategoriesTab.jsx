import { createPortal } from 'react-dom';
import { useState } from 'react';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { FaPlus, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

const CategoriesTab = () => {
  const { can } = useAuth();
  const toast = useToast();
  const { data: categories, loading, error, reload } = useApi('/categories');

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [saving, setSaving] = useState(false);

  const closeModal = () => { setShowModal(false); setCategoryName(''); setEditingCategory(null); };
  const handleAdd = () => { setEditingCategory(null); setCategoryName(''); setShowModal(true); };
  const handleEdit = (cat) => { setEditingCategory(cat); setCategoryName(cat.name); setShowModal(true); };
  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try {
      const { message } = await api.del(`/categories/${cat.id}`);
      toast.success(message || 'Category deleted', cat.name);
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = categoryName.trim();
    if (!name) { toast.error('Category name is required', 'Enter the category name'); return; }
    setSaving(true);
    try {
      const { message } = editingCategory
        ? await api.put(`/categories/${editingCategory.id}`, { name })
        : await api.post('/categories', { name });
      toast.success(message || (editingCategory ? 'Category updated' : 'Category added'), name);
      closeModal();
      reload();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 animate-fade-in-up">
        <h1 className="text-md text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Categories</h1>
        {can('categories', 'create') && (
          <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 rounded-sm text-white text-[13px] font-semibold shadow-lg shadow-teal-500/25 transition-all duration-200 animate-zoom-in">
            <FaPlus size={12} /> Add Category
          </button>
        )}
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-3 py-2 text-white/60 text-[11px] font-medium uppercase">ID</th>
                <th className="px-3 py-2 text-white/60 text-[11px] font-medium uppercase">Category Name</th>
                <th className="px-3 py-2 text-white/60 text-[11px] font-medium uppercase">Medicines</th>
                <th className="px-3 py-2 text-white/60 text-[11px] font-medium uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || error || categories.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-3 py-6 text-center text-[14px] text-white/40">
                    {error || (loading ? 'Loading…' : 'No categories found')}
                  </td>
                </tr>
              ) : categories.map((cat) => (
                <tr key={cat.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-3 py-2 text-white/70 text-[12px]">{cat.id}</td>
                  <td className="px-3 py-2 text-white text-[12px]">{cat.name}</td>
                  <td className="px-3 py-2 text-white/70 text-[12px]">{cat.medicines}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {can('categories', 'edit') && (
                        <button onClick={() => handleEdit(cat)} className="w-7 h-7 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95">
                          <FaEdit size={12} />
                        </button>
                      )}
                      {can('categories', 'delete') && (
                        <button onClick={() => handleDelete(cat)} className="w-7 h-7 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-red-500/20 active:scale-95">
                          <FaTrash size={12} />
                        </button>
                      )}
                      {!can('categories', 'edit') && !can('categories', 'delete') && <span className="text-white/30 text-[12px]">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && createPortal(
        <div className="app-modal fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-fade-in">
          <div className="bg-gradient-to-br from-[#3b1d5e] to-[#1a0b2e] border border-white/60 rounded-sm w-full max-w-md p-4 animate-zoom-in">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/40">
              <h2 className="text-white text-base font-semibold">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={closeModal} className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/60 flex items-center justify-center">
                <FaTimes size={12} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Enter category name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-sm text-white text-[15px] placeholder-white/40 focus:outline-none focus:border-teal-400/60" autoFocus />
              <div className="flex gap-2 pt-3">
                <button type="submit" disabled={saving} className="disabled:opacity-50 disabled:cursor-not-allowed flex-1 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 rounded-sm text-white text-[14px] font-semibold">{saving ? 'Saving…' : `${editingCategory ? 'Update' : 'Add'} Category`}</button>
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-sm text-white/70 text-[14px]">Cancel</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CategoriesTab;