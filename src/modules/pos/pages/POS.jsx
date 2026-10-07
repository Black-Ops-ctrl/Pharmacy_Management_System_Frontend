import { useState, useEffect, useRef, useMemo } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import SearchableSelect from '../../../components/common/SearchableSelect';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { money } from '../../../utils/format';
import { printReceipt } from '../../../utils/receipt';
import { getCompany } from '../../../config/company';
import {
  FaSearch, FaChevronLeft, FaChevronRight, FaPlus, FaMinus,
  FaTrash, FaShoppingCart, FaPrint
} from 'react-icons/fa';

const WALK_IN = { kind: 'walk_in', id: 'walk_in', name: 'Walk-in Customer' };
const ONLINE = { kind: 'online', id: 'online', name: 'Online Order' };

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Card', label: 'Card' },
  { value: 'Credit', label: 'Credit' },
  { value: 'Digital', label: 'Digital Payment' },
  { value: 'COD', label: 'COD' },
];

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const unitOf = (m) => m.uom_name || 'Unit';
const qtyText = (n, m) => `${Number(n) || 0} ${unitOf(m)}`;
const ym = (d) => (d ? String(d).slice(0, 7) : '—');
const daysUntil = (d) => {
  if (!d) return Infinity;
  const t = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((t - now) / 86400000);
};

const allocatePreview = (batches, units, preferredId) => {
  const sorted = [...(batches || [])].sort((a, b) => {
    if (preferredId) {
      if (a.id === preferredId) return -1;
      if (b.id === preferredId) return 1;
    }
    return String(a.expiry || '9999').localeCompare(String(b.expiry || '9999')) || a.id - b.id;
  });
  let left = units;
  const allocations = [];
  for (const b of sorted) {
    if (left <= 0) break;
    const take = Math.min(left, Number(b.qty) || 0);
    if (take > 0) {
      allocations.push({ batchNo: b.batch_no, qty: take, nearExpiry: daysUntil(b.expiry) <= 90 });
      left -= take;
    }
  }
  return { allocations, shortage: Math.max(0, left) };
};

const POS = () => {
  const toast = useToast();
  const { can } = useAuth();

  const [pickedBranchId, setBranchId] = useState(null);
  const { data: branches } = useApi('/lov/branches');
  const branchId = pickedBranchId ?? (branches[0]?.id ?? null);
  const { data: customers, reload: reloadCustomers } = useApi('/lov/customers');
  const { data: categoryRows } = useApi('/lov/categories');
  const {
    data: medicines, loading: medsLoading, error: medsError, reload: reloadMedicines,
  } = useApi('/lov/medicines', { branch_id: branchId, with_batches: 1 }, { enabled: !!branchId });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const [selectedCustomer, setSelectedCustomer] = useState(WALK_IN);
  const [online, setOnline] = useState({ customer_name: '', phone: '', address: '' });

  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discount, setDiscount] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [categoryIndex, setCategoryIndex] = useState(0);

  const searchInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  // true while the qty is the untouched default (1) -> the next typed digit replaces it
  const qtyFreshRef = useRef(true);
  const categoryRefs = useRef([]);

  const categories = useMemo(() => ['All', ...categoryRows.map(c => c.name)], [categoryRows]);

  const filteredMedicines = medicines.filter(med => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || [med.name, med.generic, med.code, med.barcode]
      .some(v => (v || '').toString().toLowerCase().includes(q));
    const matchesCategory = selectedCategory === 'All' || med.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const branchOptions = branches.map(b => ({ value: b.id, label: b.name }));
  const customerOptions = [
    { value: WALK_IN.id, label: WALK_IN.name },
    { value: ONLINE.id, label: ONLINE.name },
    ...customers.map(c => ({ value: c.id, label: `${c.name}${c.phone ? ` (${c.phone})` : ''}` })),
  ];

  const changeBranch = (id) => {
    const next = Number(id);
    if (!next || next === branchId) return;
    if (cart.length && !window.confirm('Changing the branch will clear the cart. Continue?')) return;
    setCart([]);
    setSelectedMedicine(null);
    setBranchId(next);
  };

  const handleMedicineSelect = (med) => {
    qtyFreshRef.current = true;
    setQuantity(1);
    setSelectedMedicine(med);
  };

  const inCart = (medicineId, list = cart) => list.filter(i => i.id === medicineId).reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  const outOfStock = (m) => {
    toast.error('Out of stock', `${m.name} is out of stock`);
  };

  const addToCart = (medicine) => {
    const qty = parseInt(quantity, 10);
    const stock = Number(medicine.stock) || 0;
    if (stock <= 0) { outOfStock(medicine); return; }
    if (!qty || qty <= 0) { toast.error('Invalid quantity', 'Enter a quantity of 1 or more'); return; }
    const available = stock - inCart(medicine.id);
    if (available <= 0) {
      toast.warn('Not enough stock', `All ${qtyText(stock, medicine)} of ${medicine.name} are already in the cart`);
      return;
    }
    if (qty > available) {
      toast.warn('Not enough stock', `Only ${qtyText(available, medicine)} of ${medicine.name} available`);
      return;
    }
    const existingItem = cart.find(item => item.id === medicine.id);
    if (existingItem) {
      setCart(cart.map(item => (item.id === medicine.id ? { ...item, quantity: item.quantity + qty } : item)));
    } else {
      setCart([...cart, { ...medicine, quantity: qty, price: round2(medicine.sale_price), preferredBatchId: null }]);
    }
    setSelectedMedicine(null);
    qtyFreshRef.current = true;
    setQuantity(1);
    toast.success('Added to cart', `${medicine.name} — ${qtyText(qty, medicine)}`);
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
      return;
    }
    const med = cart.find(i => i.id === id);
    if (med && newQuantity > (Number(med.stock) || 0)) {
      toast.warn('Not enough stock', `Only ${qtyText(med.stock, med)} of ${med.name} available`);
      return;
    }
    setCart(cart.map(item => (item.id === id ? { ...item, quantity: newQuantity } : item)));
  };

  const setLineBatch = (id, batchId) => {
    setCart(cart.map(item => (item.id === id ? { ...item, preferredBatchId: batchId ? Number(batchId) : null } : item)));
  };

  const lineAllocation = (item) => allocatePreview(item.batches, Number(item.quantity) || 0, item.preferredBatchId);

  const clearCart = () => {
    if (cart.length && window.confirm('Are you sure you want to remove all items?')) {
      setCart([]);
    }
  };

  const totalAmount = round2(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0));
  const discountAmount = round2(totalAmount * (parseFloat(discount) || 0) / 100);
  const totalAfterDiscount = round2(totalAmount - discountAmount);

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setQuantity('');
    } else {
      const n = Number(value);
      if (!isNaN(n) && n > 0 && Number.isInteger(n)) {
        setQuantity(n);
      }
    }
  };

  const handleDiscountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setDiscount(value);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = searchTerm.trim().toLowerCase();
      const exact = term && medicines.find(m => (m.barcode || '').toLowerCase() === term);
      const only = !exact && filteredMedicines.length === 1 ? filteredMedicines[0] : null;
      const pick = exact || only;
      if (pick) {
        if (exact) setSearchTerm('');
        handleMedicineSelect(pick);
        if ((Number(pick.stock) || 0) <= 0) outOfStock(pick);
      }
      searchInputRef.current?.blur();
      setIsSearchFocused(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const items = document.querySelectorAll('.medicine-item');
      const visibleItems = Array.from(items).filter(el => el.style.display !== 'none');

      if (((e.ctrlKey && e.key === 'f') || e.key === '/') && !isSearchFocused) {
        const tag = e.target?.tagName;
        if (e.key === '/' && (tag === 'INPUT' || tag === 'TEXTAREA') && e.target !== quantityInputRef.current) return;
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
        return;
      }

      if (isSearchFocused) return;

      const tag = e.target?.tagName;
      if ((tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') && e.target !== quantityInputRef.current) return;

      if (e.key === 'Tab' && !selectedMedicine) {
        e.preventDefault();
        const nextIndex = (categoryIndex + 1) % categories.length;
        setCategoryIndex(nextIndex);
        setSelectedCategory(categories[nextIndex]);
        categoryRefs.current[nextIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
        return;
      }

      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !selectedMedicine) {
        e.preventDefault();
        let nextIndex;
        if (e.key === 'ArrowRight') {
          nextIndex = (categoryIndex + 1) % categories.length;
        } else {
          nextIndex = (categoryIndex - 1 + categories.length) % categories.length;
        }
        setCategoryIndex(nextIndex);
        setSelectedCategory(categories[nextIndex]);
        categoryRefs.current[nextIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();

        if (visibleItems.length === 0) return;

        let currentIndex = visibleItems.findIndex(el => el.classList.contains('selected'));
        let newIndex = currentIndex;

        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < visibleItems.length - 1 ? currentIndex + 1 : 0;
        } else if (e.key === 'ArrowUp') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : visibleItems.length - 1;
        }

        if (newIndex !== currentIndex || currentIndex === -1) {
          visibleItems.forEach(el => el.classList.remove('selected'));
          if (newIndex >= 0 && newIndex < visibleItems.length) {
            visibleItems[newIndex].classList.add('selected');
            const medId = Number(visibleItems[newIndex].dataset.id);
            const med = medicines.find(m => m.id === medId);
            if (med) {
              handleMedicineSelect(med);
              visibleItems[newIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
        }
        return;
      }

      if (selectedMedicine) {
        if (e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
          // When the qty box itself is focused, let the browser + onChange handle typing normally
          if (e.target === quantityInputRef.current) {
            qtyFreshRef.current = false;
            return;
          }
          e.preventDefault();
          const currentVal = String(quantity ?? '');
          // First digit replaces the default value; later digits are appended (so 10, 12, 19, 100 work)
          if (qtyFreshRef.current || currentVal === '' || currentVal === '0') {
            qtyFreshRef.current = false;
            setQuantity(parseInt(e.key, 10));
          } else {
            setQuantity(parseInt(currentVal + e.key, 10));
          }
          return;
        }
      }

      if (e.key === 'Enter' && selectedMedicine) {
        e.preventDefault();
        addToCart(selectedMedicine);
        return;
      }

      if (e.key === 'Escape') {
        setSelectedMedicine(null);
        document.querySelectorAll('.medicine-item').forEach(el => el.classList.remove('selected'));
        return;
      }

      if (e.ctrlKey && e.key === 'Delete') {
        clearCart();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedMedicine, quantity, isSearchFocused, categoryIndex, categories, cart, medicines]);

  const scrollCategories = (direction) => {
    const container = document.getElementById('categories-container');
    if (container) {
      const scrollAmount = 200;
      container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
  };

  const selectCustomer = (v) => {
    if (v === WALK_IN.id) setSelectedCustomer(WALK_IN);
    else if (v === ONLINE.id) setSelectedCustomer(ONLINE);
    else {
      const c = customers.find(x => String(x.id) === String(v));
      if (c) setSelectedCustomer({ ...c, kind: 'patient' });
    }
  };

  const handleCompleteSale = async () => {
    if (saving) return;
    if (!branchId) {
      toast.error('Branch is required', 'Select the branch');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty', 'Add medicines to the cart');
      return;
    }
    const kind = selectedCustomer.kind;
    if (kind === 'online') {
      if (!online.customer_name.trim()) { toast.error('Customer name is required', 'Enter the customer name'); return; }
      if (!online.phone.trim()) { toast.error('Phone is required', 'Enter the phone number'); return; }
      if (!/^[0-9+\-\s()]{7,20}$/.test(online.phone.trim())) { toast.error('Invalid phone number', 'Use digits only, like 0300-1234567'); return; }
      if (!online.address.trim()) { toast.error('Delivery address is required', 'Enter the delivery address'); return; }
    }
    if (paymentMethod === 'Credit') {
      if (kind !== 'patient') {
        toast.error('Credit not available', 'Select a registered patient for a credit sale');
        return;
      }
      if (!selectedCustomer.credit_allowed) {
        toast.error('Credit not available', `Credit is not allowed for ${selectedCustomer.name}`);
        return;
      }
    }
    const disc = parseFloat(discount) || 0;
    const maxRaw = getCompany().max_discount_pct;
    const maxDisc = maxRaw === null || maxRaw === undefined || maxRaw === '' ? 100 : Number(maxRaw);
    if (disc > maxDisc) {
      toast.error('Discount limit exceeded', `Maximum discount allowed is ${maxDisc}%`);
      return;
    }

    const body = {
      branch_id: branchId,
      customer_type: kind,
      party_id: kind === 'patient' ? selectedCustomer.id : null,
      payment_method: paymentMethod,
      discount_pct: disc,
      items: cart.map(item => ({
        medicine_id: item.id,
        qty: item.quantity,
        preferred_batch_id: item.preferredBatchId || null,
      })),
      online: kind === 'online'
        ? { customer_name: online.customer_name.trim(), phone: online.phone.trim(), address: online.address.trim() }
        : undefined,
    };

    setSaving(true);
    try {
      const { data } = await api.post('/sales', body);
      toast.success('Sale completed', `${data.doc_no} — ${money(data.total)}`);
      setLastSale(data);
      setCart([]);
      setDiscount('');
      setOnline({ customer_name: '', phone: '', address: '' });
      setSelectedCustomer(WALK_IN);
      setSelectedMedicine(null);
      reloadMedicines();
      reloadCustomers();
    } catch (err) {
      toast.error('Sale failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!lastSale) {
      toast.info('Nothing to print', 'Complete a sale first');
      return;
    }
    printReceipt(lastSale);
  };

  return (
    <DashboardLayout>
      <div className="w-full md:h-[calc(100vh-100px)] md:overflow-hidden flex flex-col gap-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 md:gap-3 md:flex-1 md:min-h-0 md:overflow-hidden">

          <div className="md:col-span-2 flex flex-col gap-2 min-h-0 overflow-hidden animate-fade-in">

            <div className="relative flex-shrink-0">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search medicine or scan barcode"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full py-2 px-4 pl-9 bg-white/10 backdrop-blur-lg border border-white/40 rounded-full text-white placeholder-white/70
                focus:outline-none focus:outline-2 focus:outline-purple-400 focus:outline-offset-2 focus:border-white transition-all text-xs"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              />
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm" />
            </div>

            <div className="relative flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => scrollCategories(-1)}
                className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/40 text-white flex items-center justify-center transition-all z-10 text-xs animate-zoom-in"
              >
                <FaChevronLeft size={10} />
              </button>

              <div
                id="categories-container"
                className="flex-1 overflow-x-auto scrollbar-hide flex gap-1.5 py-1.5 px-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {categories.map((cat, index) => (
                  <button
                    key={cat}
                    ref={(el) => (categoryRefs.current[index] = el)}
                    onClick={() => { setSelectedCategory(cat); setCategoryIndex(index); }}
                    className={`flex-shrink-0 px-2 sm:px-3 py-0.5 rounded-full text-[13px] transition-all whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-purple-500 via-purple-700 to-indigo-700 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/40'
                    }`}
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                onClick={() => scrollCategories(1)}
                className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all z-10 text-xs animate-zoom-in"
              >
                <FaChevronRight size={10} />
              </button>
            </div>

            <div className="h-[55vh] md:h-auto md:flex-1 min-h-0 overflow-hidden">
              <div className="bg-white/5 backdrop-blur-lg rounded-sm border border-white/40 p-2 h-full overflow-y-auto custom-scrollbar">
                {(medsLoading || (!branchId && !medsError)) ? (
                  <div className="text-center py-8 text-white/40 animate-fade-in">
                    <p className="text-sm">Loading medicines…</p>
                  </div>
                ) : medsError ? (
                  <div className="text-center py-8 text-red-400 animate-fade-in">
                    <p className="text-sm">{medsError}</p>
                  </div>
                ) : filteredMedicines.length === 0 ? (
                  <div className="text-center py-8 text-white/40 animate-fade-in">
                    <p className="text-sm">No medicines found</p>
                  </div>
                ) : (
                  filteredMedicines.map((med, index) => {
                    const fefo = (med.batches || [])[0] || null;
                    return (
                    <div
                      key={med.id}
                      data-id={med.id}
                      className={`medicine-item p-1 rounded-sm cursor-pointer transition-all hover:bg-white/10 ${
                        selectedMedicine?.id === med.id ? 'bg-white/20 border border-purple-400/60 selected' : 'border border-transparent'
                      } ${index !== filteredMedicines.length - 1 ? 'border-b border-white/10' : ''} animate-slide-in`}
                      onClick={() => { if (selectedMedicine?.id !== med.id) handleMedicineSelect(med); }}
                      style={{ display: 'block' }}
                    >
                      <div className="flex items-start justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-white font-medium text-[12px] sm:text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              {med.name}
                            </h4>
                            {med.generic && <span className="text-white/60 text-[13px]">{med.generic}</span>}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2.5 mt-0.5 text-white/60 text-[12px]">
                            <span>Batch: {fefo ? fefo.batch_no : '—'}</span>
                            <span className="text-white/20">|</span>
                            <span>Exp: {fefo ? ym(fefo.expiry) : '—'}</span>
                            <span className="text-white/20">|</span>
                            <span className={Number(med.stock) > 0 ? '' : 'text-red-400'}>Stock: {med.stock} {med.uom_name || ''}</span>
                            <span className="text-white/20">|</span>
                            <span>Pack: {med.pack_type || '—'}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2 self-center">
                          <p className="text-white text-[14px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {money(med.sale_price)}
                          </p>
                          <p className="text-white/60 text-[11px]" style={{ fontFamily: 'Poppins, sans-serif' }}>per {unitOf(med)}</p>
                        </div>
                      </div>

                      {selectedMedicine?.id === med.id && (
                        <div className="mt-1.5 pt-1.5 border-t border-white/10 animate-fade-in-up">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <div className="flex items-center gap-4 ml-auto">
                              <span className="text-white/70 text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                {money(med.sale_price)} / {unitOf(med)}
                              </span>
                              <input
                                ref={quantityInputRef}
                                type="text"
                                inputMode="numeric"
                                value={quantity}
                                onChange={handleQuantityChange}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.target.select()}
                                className="w-14 text-center bg-transparent text-white text-[13px] border border-white/20 rounded focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-all"
                                style={{ fontFamily: 'Poppins, sans-serif' }}
                                placeholder="Qty"
                                aria-label="Quantity"
                              />
                             <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  addToCart(med);
                                }}
                                className="px-4 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-sm text-[13px] font-semibold transition-all animate-zoom-in"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-1 flex flex-col min-h-0 md:overflow-hidden animate-slide-in-right">
            <div className="bg-white/5 backdrop-blur-lg rounded-sm border border-white/40 p-3 h-full overflow-y-auto custom-scrollbar flex flex-col">

              <div className="flex-shrink-0 mb-3 space-y-3">

                <div className="animate-fade-in-down">
                  <SearchableSelect
                    value={branchId ?? ''}
                    onChange={changeBranch}
                    options={branchOptions}
                    placeholder="Select branch"
                    buttonClassName="w-full py-1.5 px-2.5 bg-white/10 border border-white/40 rounded-sm text-white text-[12px] sm:text-[13px]"
                  />
                </div>

                <div className="animate-fade-in-down delay-100">
                  <SearchableSelect
                    value={selectedCustomer.id}
                    onChange={selectCustomer}
                    options={customerOptions}
                    placeholder="Select customer"
                    buttonClassName="w-full py-1.5 px-2.5 bg-white/10 border border-white/40 rounded-sm text-white text-[12px] sm:text-[13px]"
                  />
                  {selectedCustomer.kind === 'patient' && selectedCustomer.credit_allowed && (
                    <p className="text-amber-300/80 text-[11px] mt-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Credit: {money(selectedCustomer.balance)} / {money(selectedCustomer.credit_limit)}
                    </p>
                  )}
                </div>

                {selectedCustomer.kind === 'online' && (
                  <div className="space-y-1.5 animate-fade-in-down">
                    <input
                      type="text"
                      placeholder="Enter customer name"
                      value={online.customer_name}
                      onChange={(e) => setOnline({ ...online, customer_name: e.target.value })}
                      className="w-full py-1 px-2 bg-white/10 border border-white/40 rounded-sm text-white placeholder-white/40 text-[12px] focus:outline-none focus:ring-1 focus:ring-purple-400"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    />
                    <input
                      type="text"
                      placeholder="Enter phone number"
                      value={online.phone}
                      onChange={(e) => setOnline({ ...online, phone: e.target.value })}
                      className="w-full py-1 px-2 bg-white/10 border border-white/40 rounded-sm text-white placeholder-white/40 text-[12px] focus:outline-none focus:ring-1 focus:ring-purple-400"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    />
                    <input
                      type="text"
                      placeholder="Enter delivery address"
                      value={online.address}
                      onChange={(e) => setOnline({ ...online, address: e.target.value })}
                      className="w-full py-1 px-2 bg-white/10 border border-white/40 rounded-sm text-white placeholder-white/40 text-[12px] focus:outline-none focus:ring-1 focus:ring-purple-400"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    />
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 flex items-center justify-between mb-1.5 animate-fade-in">
                <h3 className="text-white text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <FaShoppingCart className="inline mr-1 text-purple-400 text-[13px]" />
                  Cart <span className="text-white/50">({cart.length})</span>
                </h3>
                <button
                  onClick={clearCart}
                  className="px-2 py-0.5 rounded-sm bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[12px] transition-all animate-zoom-in"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Delete All
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 min-h-[40px] custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-4 text-white/40 animate-fade-in">
                    <p className="text-[11px] sm:text-[12px]">Cart is empty</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="bg-white/5 rounded-lg p-1 animate-slide-in">
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                          >
                            <FaMinus size={5} />
                          </button>
                          <span className="text-white text-[10px] sm:text-[11px] w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                          >
                            <FaPlus size={5} />
                          </button>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center">
                          <span className="text-white text-[11px] sm:text-[12px] font-medium truncate w-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {item.name} <span className="text-white/40">— {qtyText(item.quantity, item)}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-white text-[11px] sm:text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {money(item.price * item.quantity)}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-4 h-4 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center ml-1"
                          >
                            <FaTrash size={8} />
                          </button>
                        </div>
                      </div>

                      {(() => {
                        const { allocations, shortage } = lineAllocation(item);
                        const hasNearExpiry = allocations.some(a => a.nearExpiry);
                        return (
                          <div className="mt-1 pt-1 border-t border-white/10 flex flex-wrap items-center gap-1">
                            <div className="min-w-[140px]">
                              <SearchableSelect
                                value={item.preferredBatchId || ''}
                                onChange={(v) => setLineBatch(item.id, v)}
                                options={[{ value: '', label: 'Auto (FEFO)' }, ...(item.batches || []).map(b => ({ value: b.id, label: `${b.batch_no} — exp ${ym(b.expiry)} (${b.qty})` }))]}
                                placeholder="Auto (FEFO)"
                                buttonClassName="w-full px-1.5 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white text-[10px] focus:outline-none focus:border-purple-400"
                              />
                            </div>
                            <span className="text-white/50 text-[10px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              {allocations.map(a => `${a.batchNo} ×${a.qty}`).join(' + ') || '—'}
                            </span>
                            {hasNearExpiry && (
                              <span className="px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                Near expiry
                              </span>
                            )}
                            {shortage > 0 && (
                              <span className="px-1 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                Short {shortage}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))
                )}
              </div>

              <div className="flex-shrink-0 border-t border-white/10 pt-2 mt-auto space-y-2 animate-fade-in-up">

                <div>
                  <p className="text-white/50 text-[11px] mb-1">Payment Method</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PAYMENT_METHODS.map(pm => (
                      <button
                        key={pm.value}
                        onClick={() => setPaymentMethod(pm.value)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                          paymentMethod === pm.value
                            ? 'bg-gradient-to-r from-purple-500 via-purple-700 to-indigo-700 text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/40'
                        }`}
                      >{pm.label}</button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between text-white text-[14px]">
                  <span>Subtotal</span>
                  <span>{money(totalAmount)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white text-[14px]">Discount (%)</span>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={discount}
                      onChange={handleDiscountChange}
                      placeholder="0"
                      className="w-16 px-2 py-1 pr-6 text-right bg-white/10 border border-white/40 rounded-sm text-white placeholder-white/40 text-[12px] focus:outline-none focus:ring-1 focus:ring-purple-400"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 text-[12px] pointer-events-none">%</span>
                  </div>
                </div>

                <div className="flex justify-between text-white text-[14px]">
                  <span>After Discount</span>
                  <span>{money(totalAfterDiscount)}</span>
                </div>

                <div className="flex justify-between text-white text-[15px] pt-1 border-t border-white/40">
                  <span>Total</span>
                  <span>{money(Math.max(0, totalAfterDiscount))}</span>
                </div>
              </div>

              {(can('pos', 'create') || can('pos', 'print')) && (
                <div className="flex-shrink-0 mt-2 flex gap-1.5 pt-1.5 border-t border-white/40 animate-fade-in-up delay-200">
                  {can('pos', 'create') && (
                    <button
                      onClick={handleCompleteSale}
                      disabled={saving}
                      className="flex-1 py-1.5 bg-gradient-to-r from-green-600 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-sm text-[12px] transition-all duration-200 shadow-lg hover:shadow-green-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving…' : 'Complete Sale'}
                    </button>
                  )}
                  {can('pos', 'print') && (
                    <button
                      onClick={handlePrint}
                      className="flex-1 py-1.5 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-sm text-[12px] transition-all duration-200 shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-1.5"
                    >
                      <FaPrint size={12} />
                      Print
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default POS;
