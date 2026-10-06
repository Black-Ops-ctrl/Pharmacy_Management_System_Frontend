import { useState } from 'react';
import { FaLayerGroup } from 'react-icons/fa';
import GlassModal from '../../../components/common/GlassModal';
import { FormInput } from '../../../components/common/FormField';
import api from '../../../config/api';
import { useToast } from '../../../context/ToastContext';
import { fmtDate } from '../../../utils/format';
import { FONT, btnCancel, btnSave } from './invUtils';

const BatchEditModal = ({ batch, basePath = '/inventory/batches', onClose, onSaved }) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    batch_no: batch.batch_no || '',
    expiry: fmtDate(batch.expiry) || '',
    unit_cost: batch.unit_cost ?? '',
    qty: batch.qty ?? '',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!String(form.batch_no).trim()) { toast.error('Batch number is required', 'Enter the batch number'); return; }
    const cost = Number(form.unit_cost);
    if (form.unit_cost === '' || !Number.isFinite(cost) || cost < 0) { toast.error('Invalid unit cost', 'Enter a cost of 0 or more'); return; }
    const qty = Number(form.qty);
    if (form.qty === '' || !Number.isInteger(qty) || qty < 0) { toast.error('Invalid quantity', 'Enter a whole number, 0 or more'); return; }
    setSaving(true);
    try {
      const { message } = await api.put(`${basePath}/${batch.id}`, {
        batch_no: String(form.batch_no).trim(),
        expiry: form.expiry || null,
        unit_cost: cost,
        qty,
      });
      toast.success(message || 'Batch updated');
      onSaved && onSaved();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassModal
      title={`Edit Batch — ${batch.medicine_name || ''}`}
      icon={<FaLayerGroup className="text-white text-xs" />}
      onClose={onClose}
      maxWidth="max-w-md"
      footer={
        <>
          <button onClick={onClose} className={btnCancel} style={FONT}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={btnSave} style={FONT}>{saving ? 'Saving…' : 'Save Batch'}</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FormInput label="Batch No" required placeholder="Enter batch number" value={form.batch_no} onChange={set('batch_no')} />
        <FormInput label="Expiry" type="date" value={form.expiry} onChange={set('expiry')} />
        <FormInput label="Unit Cost (Rs.)" required type="text" inputMode="decimal" placeholder="Enter unit cost" value={form.unit_cost} onChange={set('unit_cost')} />
        <FormInput label={`Quantity on hand${batch.uom ? ` (${batch.uom})` : ''}`} required type="text" inputMode="numeric" placeholder="Enter quantity" value={form.qty} onChange={set('qty')} />
      </div>
    </GlassModal>
  );
};

export default BatchEditModal;
