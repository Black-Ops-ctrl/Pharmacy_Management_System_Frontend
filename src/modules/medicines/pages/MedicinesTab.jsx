import { createPortal } from 'react-dom';
import { useState, useRef, useCallback } from 'react';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import useBarcodeScanner from '../../../hooks/useBarcodeScanner';
import { money, num } from '../../../utils/format';
import { exportExcel } from '../../../utils/printFormat';
import FilterBar from '../components/FilterBar';
import MedicineTable from '../components/MedicineTable';
import SearchableSelect from '../../../components/common/SearchableSelect';
import ImportButton from '../../../components/common/ImportButton';
import { FaFileExcel, FaPlus, FaTimes, FaEye } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

const FONT = { fontFamily: 'Poppins, sans-serif' };
const INPUT = 'w-full bg-white/5 border border-white/70 rounded-none px-2.5 py-1.5 text-white text-[12px] placeholder-white/40 focus:outline-none focus:border-purple-400';
const READONLY = 'w-full bg-white/5 border border-white/40 rounded-none px-2.5 py-1.5 text-white text-[12px] opacity-80 cursor-default focus:outline-none';

const emptyForm = {
  name: '', generic: '', uom_id: '', category_id: '', box_size: '', pack_size: '',
  price: '', discount: '', barcode: '', status: 'Active',
};

const IMPORT_COLUMNS = [
  { key: 'name', label: 'Medicine Name' },
  { key: 'generic', label: 'Generic Name' },
  { key: 'category', label: 'Category' },
  { key: 'uom', label: 'UOM' },
  { key: 'box_size', label: 'Box Contains (Strips)' },
  { key: 'pack_size', label: 'Strip Contains (Units)' },
  { key: 'price', label: 'Unit Price' },
  { key: 'discount', label: 'Discount (%)' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'status', label: 'Status' },
];

const salePriceOf = (price, discount) => {
  const p = parseFloat(price) || 0;
  const d = parseFloat(discount) || 0;
  return (p - (p * d / 100)).toFixed(2);
};

const packTypeOf = (box, pack) => {
  if (box && pack) return `${box} x ${pack}`;
  if (box || pack) return `${box || 1} x ${pack || 1}`;
  return '';
};

const decimal = (v) => {
  const s = v.replace(/[^0-9.]/g, '');
  const i = s.indexOf('.');
  return i === -1 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '');
};

const Label = ({ children }) => <label className="text-white text-[13px] mb-0.5 block" style={FONT}>{children}</label>;

const MedicinesTab = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedUom, setSelectedUom] = useState('All UOM');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [viewingMedicine, setViewingMedicine] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const barcodeRef = useRef(null);
  const checkedCode = useRef('');
  const itemsPerPage = 12;

  const { data: medicines, loading, error, reload } = useApi('/medicines');
  const { data: categoryList } = useApi('/lov/categories');
  const { data: uomList } = useApi('/lov/uoms');

  const categoryOptions = categoryList.map((c) => ({ value: c.id, label: c.name }));
  const uomOptions = uomList.map((u) => ({ value: u.id, label: u.name }));

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));
  const packType = packTypeOf(form.box_size, form.pack_size);
  const finalPrice = form.price === '' && form.discount === '' ? '' : salePriceOf(form.price, form.discount);

  const q = searchTerm.trim().toLowerCase();
  const filteredMedicines = medicines.filter((med) => {
    const matchesSearch = !q || [med.name, med.generic, med.barcode, med.code].some((v) => (v || '').toLowerCase().includes(q));
    const matchesCategory = selectedCategory === 'All Categories' || med.category_name === selectedCategory;
    const matchesUom = selectedUom === 'All UOM' || med.uom_name === selectedUom;
    return matchesSearch && matchesCategory && matchesUom;
  });

  const filterKey = `${searchTerm}|${selectedCategory}|${selectedUom}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const checkBarcode = useCallback(async (code) => {
    const c = String(code || '').replace(/\s+/g, '');
    if (!c) return true;
    checkedCode.current = c;
    try {
      const res = await api.get('/medicines/barcode-check', { code: c, exclude_id: editingMedicine ? editingMedicine.id : undefined });
      if (res && res.used) {
        toast.error('Barcode already in use', `${c} is used by ${res.medicine.name} (${res.medicine.code})`);
        return false;
      }
      return true;
    } catch (err) {
      toast.error('Could not check barcode', err.message);
      return true;
    }
  }, [editingMedicine, toast]);

  const onScan = useCallback((code) => {
    setForm((f) => ({ ...f, barcode: code }));
    if (barcodeRef.current) barcodeRef.current.focus();
    checkBarcode(code);
  }, [checkBarcode]);

  useBarcodeScanner(showAddModal, onScan);

  const closeForm = () => { setShowAddModal(false); setEditingMedicine(null); setForm(emptyForm); checkedCode.current = ''; };

  const handleAddMedicine = () => { setEditingMedicine(null); setForm(emptyForm); checkedCode.current = ''; setShowAddModal(true); };

  const handleEdit = (med) => {
    setEditingMedicine(med);
    checkedCode.current = med.barcode || '';
    setForm({
      name: med.name || '',
      generic: med.generic || '',
      uom_id: med.uom_id ?? '',
      category_id: med.category_id ?? '',
      box_size: med.box_size != null ? String(med.box_size) : '',
      pack_size: med.pack_size != null ? String(med.pack_size) : '',
      price: med.price != null ? String(med.price) : '',
      discount: med.discount != null ? String(med.discount) : '',
      barcode: med.barcode || '',
      status: med.status || 'Active',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (med) => {
    if (!window.confirm(`Delete medicine "${med.name}"?`)) return;
    try {
      const { message } = await api.del(`/medicines/${med.id}`);
      toast.success(message || 'Medicine deleted', med.name);
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const handleSaveMedicine = async () => {
    if (!form.name.trim()) { toast.error('Medicine name is required', 'Enter the medicine name'); return; }
    if (!form.uom_id) { toast.error('UOM is required', 'Select a UOM'); return; }
    if (!form.category_id) { toast.error('Category is required', 'Select a category'); return; }
    if (form.price !== '' && !Number.isFinite(Number(form.price))) { toast.error('Invalid unit price', 'Enter a valid price'); return; }
    const discountNum = parseFloat(form.discount) || 0;
    if (discountNum < 0 || discountNum > 100) { toast.error('Invalid discount', 'Discount must be between 0 and 100'); return; }
    const barcode = form.barcode.replace(/\s+/g, '');
    if (barcode && barcode !== (editingMedicine?.barcode || '') && !(await checkBarcode(barcode))) return;
    const body = {
      name: form.name.trim(),
      generic: form.generic.trim(),
      category_id: form.category_id,
      uom_id: form.uom_id,
      box_size: parseInt(form.box_size, 10) || 1,
      pack_size: parseInt(form.pack_size, 10) || 1,
      price: parseFloat(form.price) || 0,
      discount: discountNum,
      barcode,
      status: form.status,
    };
    setSaving(true);
    try {
      const { message } = editingMedicine
        ? await api.put(`/medicines/${editingMedicine.id}`, body)
        : await api.post('/medicines', body);
      toast.success(message || (editingMedicine ? 'Medicine updated' : 'Medicine added'), body.name);
      closeForm();
      reload();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    exportExcel({
      fileName: 'Medicines', title: 'Medicines',
      columns: [
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'generic', label: 'Generic' },
        { key: 'category_name', label: 'Category' }, { key: 'uom_name', label: 'UOM' }, { key: 'pack_type', label: 'Pack Type' },
        { key: 'price', label: 'Unit Price', align: 'right' }, { key: 'discount', label: 'Discount %', align: 'right' }, { key: 'sale_price', label: 'Sale Price', align: 'right' },
        { key: 'stock', label: 'Stock', align: 'right' }, { key: 'barcode', label: 'Barcode' }, { key: 'status', label: 'Status' },
      ],
      rows: filteredMedicines,
    });
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 animate-fade-in-up">
        <h1 className="text-md text-white" style={FONT}>Medicines</h1>
        <div className="flex flex-wrap gap-1.5 mt-2 md:mt-0">
          {can('medicines', 'print') && (
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={FONT}>
              <FaFileExcel size={12} /> Excel
            </button>
          )}
          {can('medicines', 'create') && (
            <ImportButton title="Import Medicines" endpoint="/medicines/import" columns={IMPORT_COLUMNS} templateName="Medicines Template" onDone={reload} />
          )}
          {can('medicines', 'create') && (
            <button onClick={handleAddMedicine} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={FONT}>
              <FaPlus size={12} /> Add Medicine
            </button>
          )}
        </div>
      </div>

      <FilterBar
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
        selectedUom={selectedUom} setSelectedUom={setSelectedUom}
        categoryOptions={categoryList.map((c) => c.name)}
        uomOptions={uomList.map((u) => u.name)}
      />

      <MedicineTable
        medicines={filteredMedicines}
        loading={loading}
        error={error}
        onView={setViewingMedicine}
        onEdit={handleEdit}
        onDelete={handleDelete}
        canEdit={can('medicines', 'edit')}
        canDelete={can('medicines', 'delete')}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
      />

      {showAddModal && createPortal(
        <div className="app-modal fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-fade-in">
          <div className="bg-gradient-to-br from-[#3b1d5e] to-[#1a0b2e] border border-white/60 rounded-sm w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar p-4 animate-zoom-in">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/40">
              <h2 className="text-white text-base" style={FONT}>{editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}</h2>
              <button onClick={closeForm} className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/60 flex items-center justify-center transition-all">
                <FaTimes size={12} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              <div>
                <Label>Medicine Name *</Label>
                <input type="text" placeholder="Enter medicine name" value={form.name} onChange={(e) => set('name')(e.target.value)} className={INPUT} style={FONT} />
              </div>
              <div>
                <Label>Generic Name</Label>
                <input type="text" placeholder="Enter generic name" value={form.generic} onChange={(e) => set('generic')(e.target.value)} className={INPUT} style={FONT} />
              </div>
              <div>
                <Label>UOM *</Label>
                <SearchableSelect value={form.uom_id} onChange={set('uom_id')} options={uomOptions} placeholder="Select UOM" />
              </div>
              <div>
                <Label>Box Contains (Strips)</Label>
                <input type="text" inputMode="numeric" placeholder="Enter strips per box" value={form.box_size} onChange={(e) => set('box_size')(e.target.value.replace(/[^0-9]/g, ''))} className={INPUT} style={FONT} />
              </div>
              <div>
                <Label>Strip Contains (Units)</Label>
                <input type="text" inputMode="numeric" placeholder="Enter units per strip" value={form.pack_size} onChange={(e) => set('pack_size')(e.target.value.replace(/[^0-9]/g, ''))} className={INPUT} style={FONT} />
              </div>
              <div>
                <Label>Pack Type</Label>
                <input type="text" value={packType} readOnly tabIndex={-1} className={READONLY} style={FONT} />
              </div>
              <div>
                <Label>Unit Price (Rs.)</Label>
                <input type="text" inputMode="decimal" placeholder="Enter unit price" value={form.price} onChange={(e) => set('price')(decimal(e.target.value))} className={INPUT} style={FONT} />
              </div>
              <div>
                <Label>Discount (%)</Label>
                <input type="text" inputMode="decimal" placeholder="Enter discount" value={form.discount} onChange={(e) => set('discount')(decimal(e.target.value))} className={INPUT} style={FONT} />
              </div>
              <div>
                <Label>Sale Price (Rs.)</Label>
                <input type="text" value={finalPrice} readOnly tabIndex={-1} className={READONLY} style={FONT} />
              </div>
              <div>
                <Label>Category *</Label>
                <SearchableSelect value={form.category_id} onChange={set('category_id')} options={categoryOptions} placeholder="Select category" />
              </div>
              <div>
                <Label>Barcode</Label>
                <input
                  ref={barcodeRef}
                  type="text"
                  placeholder="Scan or enter barcode"
                  value={form.barcode}
                  onChange={(e) => set('barcode')(e.target.value.replace(/\s+/g, ''))}
                  onBlur={(e) => { const v = e.target.value; if (v && v !== checkedCode.current && v !== (editingMedicine?.barcode || '')) checkBarcode(v); }}
                  className={INPUT}
                  style={FONT}
                />
              </div>
              <div>
                <Label>Status</Label>
                <SearchableSelect value={form.status} onChange={set('status')} options={['Active', 'Inactive']} placeholder="Select status" />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-white/10">
              <button onClick={closeForm} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={FONT}>Cancel</button>
              <button onClick={handleSaveMedicine} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={FONT}>
                {saving ? 'Saving…' : `${editingMedicine ? 'Update' : 'Save'} Medicine`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {viewingMedicine && createPortal(
        <div className="app-modal fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-gradient-to-br from-[#2a1b3e] to-[#1a0b2e] border border-white/20 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar p-5 animate-zoom-in shadow-xl shadow-purple-500/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <FaEye className="text-white text-xs" />
                </div>
                <h2 className="text-white text-base font-semibold" style={FONT}>Medicine Details</h2>
              </div>
              <button onClick={() => setViewingMedicine(null)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/60 flex items-center justify-center transition-all duration-300">
                <FaTimes size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {[
                ['Code', viewingMedicine.code],
                ['Name', viewingMedicine.name],
                ['Generic', viewingMedicine.generic || '—'],
                ['Category', viewingMedicine.category_name, 'bg-purple-500/20'],
                ['UOM', viewingMedicine.uom_name, 'bg-blue-500/20'],
                ['Pack Type', viewingMedicine.pack_type],
                ['Barcode', viewingMedicine.barcode || '—'],
                ['Unit Price', money(viewingMedicine.price)],
                ['Discount', `${num(viewingMedicine.discount)}%`, null, 'text-emerald-400'],
                ['Stock', `${num(viewingMedicine.stock, 0)} ${viewingMedicine.uom_name || ''}`],
                ['Status', viewingMedicine.status],
              ].map(([label, value, pill, color]) => (
                <div key={label} className="flex justify-between items-center gap-3 py-1.5 border-b border-white/20">
                  <span className="text-white text-[12px]" style={FONT}>{label}</span>
                  {pill ? (
                    <span className={`px-2 py-0.5 rounded-full ${pill} text-white text-[12px]`} style={FONT}>{value}</span>
                  ) : (
                    <span className={`${color || 'text-white'} text-[14px] text-right break-all`} style={FONT}>{value}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 p-3 rounded-sm bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-white/20 text-center">
              <p className="text-white text-[10px] uppercase tracking-wider" style={FONT}>Sale Price per {viewingMedicine.uom_name || 'Unit'}</p>
              <p className="text-white text-lg font-bold" style={FONT}>{money(viewingMedicine.sale_price)}</p>
            </div>

            <button onClick={() => setViewingMedicine(null)} className="w-full mt-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-[12px] font-medium transition-all duration-300" style={FONT}>
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default MedicinesTab;
