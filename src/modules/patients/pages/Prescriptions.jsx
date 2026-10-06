import { useState } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import { FaPlus, FaFilePrescription, FaTrash } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import GlassSelect from '../../../components/common/GlassSelect';
import SearchableSelect from '../../../components/common/SearchableSelect';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import GlassModal from '../../../components/common/GlassModal';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import ExportButtons from '../../../components/common/ExportButtons';
import RowActions from '../../../components/common/RowActions';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormField';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { fmtDate, today } from '../../../utils/format';
import { printListReport, savePdfListReport, exportExcel, printRecord, savePdfRecord, exportRecordExcel } from '../../../utils/printFormat';

const font = { fontFamily: 'Poppins, sans-serif' };
const STATUS_OPTIONS = ['Pending', 'Partially Dispensed', 'Dispensed', 'Expired'];
const statusColor = { 'Pending': 'amber', 'Partially Dispensed': 'blue', 'Dispensed': 'green', 'Expired': 'red' };

const emptyForm = () => ({ party_id: '', doctor: '', hospital: '', rx_date: today(), status: 'Pending', notes: '' });

const LIST_COLUMNS = [
  { key: 'doc_no', label: 'Rx No' },
  { key: 'patient', label: 'Patient' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'hospital', label: 'Hospital / Clinic' },
  { key: 'date', label: 'Date' },
  { key: 'medicines', label: 'Medicines' },
  { key: 'status', label: 'Status' },
];

const ITEM_COLUMNS = [
  { key: 'medicine', label: 'Medicine' },
  { key: 'dosage', label: 'Dosage' },
  { key: 'qty', label: 'Qty', align: 'right' },
  { key: 'dispensed', label: 'Dispensed', align: 'right' },
];

const inputCls = 'bg-white/10 border border-white/25 rounded-sm px-1.5 py-1 text-white text-[12px] focus:outline-none focus:border-purple-400';

const Prescriptions = () => {
  const { can } = useAuth();
  const toast = useToast();
  const cCreate = can('prescriptions', 'create');
  const cEdit = can('prescriptions', 'edit');
  const cDelete = can('prescriptions', 'delete');
  const cPrint = can('prescriptions', 'print');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [rxItems, setRxItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [viewingRx, setViewingRx] = useState(null);

  const statuses = ['All Status', ...STATUS_OPTIONS];

  const { data: prescriptions, loading, error, reload } = useApi('/prescriptions', { from: dateFrom, to: dateTo });
  const { data: customers } = useApi('/lov/customers', undefined, { enabled: showForm });
  const { data: medicines } = useApi('/lov/medicines', { all: 1 }, { enabled: showForm });

  const patientOptions = customers.map((c) => ({ value: c.id, label: [c.name, c.code, c.phone].filter(Boolean).join(' — ') }));
  const medicineOptions = medicines
    .filter((m) => !rxItems.some((it) => String(it.medicine_id) === String(m.id)))
    .map((m) => ({ value: m.id, label: m.generic ? `${m.name} — ${m.generic}` : m.name }));

  const filtered = prescriptions.filter((rx) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (rx.doc_no || '').toLowerCase().includes(q) ||
                          (rx.patient_name || '').toLowerCase().includes(q) ||
                          (rx.patient_code || '').toLowerCase().includes(q) ||
                          (rx.doctor || '').toLowerCase().includes(q) ||
                          (rx.hospital || '').toLowerCase().includes(q);
    const matchesStatus = selectedStatus === 'All Status' || rx.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const filterKey = [searchTerm, selectedStatus, dateFrom, dateTo].join('|');
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const loadRx = async (id) => {
    try {
      return await api.get(`/prescriptions/${id}`);
    } catch (err) {
      toast.error('Could not load prescription', err.message);
      return null;
    }
  };

  const listArgs = () => ({
    title: 'Prescriptions', dateFrom, dateTo, columns: LIST_COLUMNS, fileName: 'prescriptions',
    rows: filtered.map((rx) => ({
      doc_no: rx.doc_no,
      patient: [rx.patient_name, rx.patient_code].filter(Boolean).join(' — '),
      doctor: rx.doctor || '',
      hospital: rx.hospital || '',
      date: fmtDate(rx.rx_date),
      medicines: rx.medicines || '',
      status: rx.status,
    })),
  });

  const rxRecord = (d) => ({
    title: 'Prescription',
    subtitle: d.doc_no,
    fileName: `prescription-${d.doc_no}`,
    info: [
      { label: 'Rx No', value: d.doc_no },
      { label: 'Date', value: fmtDate(d.txn_date) },
      { label: 'Patient', value: d.party_name || '' },
      { label: 'MRN', value: d.party_code || '' },
      { label: 'Phone', value: d.party_phone || '' },
      { label: 'Doctor', value: d.meta?.doctor || '' },
      { label: 'Hospital / Clinic', value: d.meta?.hospital || '' },
      { label: 'Status', value: d.status || '' },
      { label: 'Notes', value: d.notes || '' },
    ],
    items: {
      columns: ITEM_COLUMNS,
      rows: (d.items || []).map((it) => ({
        medicine: it.medicine,
        dosage: it.meta?.dosage || it.description || '',
        qty: it.qty,
        dispensed: it.meta?.dispensed || 0,
      })),
    },
  });

  const withDetail = (fn) => async (rx) => {
    const d = await loadRx(rx.id);
    if (d) fn(rxRecord(d));
  };
  const handlePrint = withDetail(printRecord);
  const handlePdf = withDetail(savePdfRecord);
  const handleCsv = withDetail(exportRecordExcel);

  const handleView = async (rx) => {
    const d = await loadRx(rx.id);
    if (d) setViewingRx(d);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setRxItems([]);
    setShowForm(true);
  };

  const openEdit = async (rx) => {
    const d = await loadRx(rx.id);
    if (!d) return;
    setEditingId(d.id);
    setForm({
      party_id: d.party_id || '',
      doctor: d.meta?.doctor || '',
      hospital: d.meta?.hospital || '',
      rx_date: fmtDate(d.txn_date) || today(),
      status: d.status || 'Pending',
      notes: d.notes || '',
    });
    setRxItems((d.items || []).map((it) => ({
      medicine_id: it.medicine_id,
      name: it.medicine,
      qty: String(it.qty ?? 1),
      dosage: it.meta?.dosage || it.description || '',
      dispensed: String(it.meta?.dispensed ?? 0),
    })));
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setRxItems([]); };

  const addRxMed = (id) => {
    if (!id || rxItems.some((i) => String(i.medicine_id) === String(id))) return;
    const m = medicines.find((x) => String(x.id) === String(id));
    if (!m) return;
    setRxItems([...rxItems, { medicine_id: m.id, name: m.generic ? `${m.name} (${m.generic})` : m.name, qty: '1', dosage: '', dispensed: '0' }]);
  };
  const updateItem = (idx, field, val) => setRxItems(rxItems.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  const removeRxMed = (idx) => setRxItems(rxItems.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.party_id) { toast.error('Patient is required', 'Select a patient'); return; }
    if (!form.doctor.trim()) { toast.error('Doctor name is required', 'Enter the doctor name'); return; }
    if (rxItems.length === 0) { toast.error('No medicines added', 'Add at least one medicine'); return; }
    const bad = rxItems.find((it) => !(Number(it.qty) > 0));
    if (bad) { toast.error('Invalid quantity', `Enter a quantity of 1 or more for ${bad.name || 'each medicine'}`); return; }
    const body = {
      party_id: form.party_id,
      doctor: form.doctor.trim(),
      hospital: form.hospital.trim(),
      rx_date: form.rx_date || today(),
      status: form.status,
      notes: form.notes.trim(),
      items: rxItems.map((it) => ({
        medicine_id: it.medicine_id,
        qty: Number(it.qty) || 1,
        dosage: it.dosage.trim(),
        dispensed: Number(it.dispensed) || 0,
      })),
    };
    setSaving(true);
    try {
      const { message } = editingId
        ? await api.put(`/prescriptions/${editingId}`, body)
        : await api.post('/prescriptions', body);
      toast.success(message || 'Prescription saved');
      closeForm();
      reload();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rx) => {
    if (!window.confirm(`Delete prescription ${rx.doc_no}?`)) return;
    try {
      const { message } = await api.del(`/prescriptions/${rx.id}`);
      toast.success(message || 'Prescription deleted');
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in p-1">
        <PageHeader
          title="Prescriptions"
          actions={
            <>
              <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
              {cPrint && (
                <ExportButtons
                  onPrint={() => printListReport(listArgs())}
                  onExcel={() => exportExcel(listArgs())}
                  onPdf={() => savePdfListReport(listArgs())}
                />
              )}
              {cCreate && (
                <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={font}>
                  <FaPlus size={12} /> New Prescription
                </button>
              )}
            </>
          }
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search prescription" />
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto animate-fade-in-up delay-300 relative z-10">
            <GlassSelect value={selectedStatus} onChange={setSelectedStatus} options={statuses} width="sm:w-[170px] md:w-[190px]" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[950px] sm:min-w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/10" style={font}>
                  {['Rx No', 'Patient', 'Doctor', 'Hospital / Clinic', 'Date', 'Medicines', 'Status'].map((h) => (
                    <th key={h} className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading || error || currentItems.length === 0 ? (
                  <tr className="animate-fade-in">
                    <td colSpan="8" className="px-3 py-6 text-center text-[14px] text-white/40" style={font}>
                      {loading ? 'Loading…' : error || 'No prescriptions found'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((rx, index) => (
                    <tr
                      key={rx.id}
                      className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                      style={{ animationFillMode: 'both' }}
                    >
                      <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={font}>{rx.doc_no}</td>
                      <td className="px-2 py-1.5">
                        <div className="whitespace-nowrap">
                          <div className="text-white text-[12px]" style={font}>{rx.patient_name}</div>
                          <div className="text-white/70 text-[10px]" style={font}>{rx.patient_code}</div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={font}>{rx.doctor}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{rx.hospital || '—'}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{fmtDate(rx.rx_date)}</td>
                      <td className="px-2 py-1.5 text-white text-[12px] max-w-[220px] truncate" style={font} title={rx.medicines || ''}>
                        <span className="text-purple-300">{rx.item_count}</span>{rx.medicines ? ` — ${rx.medicines}` : ''}
                      </td>
                      <td className="px-2 py-1.5"><StatusBadge label={rx.status} color={statusColor[rx.status]} /></td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <RowActions
                          onView={() => handleView(rx)}
                          onEdit={cEdit ? () => openEdit(rx) : undefined}
                          onPrint={cPrint ? () => handlePrint(rx) : undefined}
                          onPdf={cPrint ? () => handlePdf(rx) : undefined}
                          onExcel={cPrint ? () => handleCsv(rx) : undefined}
                          onDelete={cDelete ? () => handleDelete(rx) : undefined}
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

        {showForm && (
          <GlassModal
            title={editingId ? 'Edit Prescription' : 'New Prescription'}
            icon={<FaFilePrescription className="text-white text-xs" />}
            onClose={closeForm}
            footer={
              <>
                <button onClick={closeForm} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={font}>
                  {saving ? 'Saving…' : editingId ? 'Update Prescription' : 'Save Prescription'}
                </button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormSelect label="Patient" required options={patientOptions} value={form.party_id} placeholder="Select patient" onChange={(e) => setForm({ ...form, party_id: e.target.value })} />
              <FormInput label="Doctor Name" required placeholder="Enter doctor name" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} />
              <FormInput label="Hospital / Clinic" placeholder="Enter hospital or clinic" value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })} />
              <FormInput label="Prescription Date" type="date" value={form.rx_date} onChange={(e) => setForm({ ...form, rx_date: e.target.value })} />
              <FormSelect label="Status" options={STATUS_OPTIONS} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
              <FormTextarea label="Notes" placeholder="Enter notes" rows={1} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="sm:col-span-2">
                <label className="text-white text-[13px] mb-0.5 block" style={font}>Add Medicines</label>
                <SearchableSelect
                  value=""
                  onChange={addRxMed}
                  options={medicineOptions}
                  placeholder="Select medicine"
                />
                {rxItems.length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    {rxItems.map((it, idx) => (
                      <div key={it.medicine_id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-sm bg-white/5 border border-white/20 animate-fade-in-up">
                        <span className="flex-1 min-w-[120px] text-white text-[13px] truncate" style={font} title={it.name}>{it.name}</span>
                        <div className="flex items-center gap-1">
                          <label className="text-white/50 text-[11px]" style={font}>Qty</label>
                          <input
                            type="text" inputMode="numeric" value={it.qty}
                            onChange={(e) => { const v = e.target.value; if (/^\d*$/.test(v)) updateItem(idx, 'qty', v); }}
                            className={`w-12 text-center ${inputCls}`} style={font}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-white/50 text-[11px]" style={font}>Dosage</label>
                          <input
                            type="text" value={it.dosage} placeholder="Enter dosage"
                            onChange={(e) => updateItem(idx, 'dosage', e.target.value)}
                            className={`w-40 placeholder-white/30 ${inputCls}`} style={font}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-white/50 text-[11px]" style={font}>Dispensed</label>
                          <input
                            type="text" inputMode="numeric" value={it.dispensed}
                            onChange={(e) => { const v = e.target.value; if (/^\d*$/.test(v)) updateItem(idx, 'dispensed', v); }}
                            className={`w-12 text-center ${inputCls}`} style={font}
                          />
                        </div>
                        <button onClick={() => removeRxMed(idx)} title="Remove" className="w-7 h-7 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-all">
                          <FaTrash size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/40 text-[12px] mt-1.5" style={font}>No medicines added</p>
                )}
              </div>
            </div>
          </GlassModal>
        )}

        {viewingRx && (
          <GlassModal
            title={`${viewingRx.doc_no} — ${viewingRx.party_name || ''}`}
            icon={<FaFilePrescription className="text-white text-xs" />}
            onClose={() => setViewingRx(null)}
            maxWidth="max-w-md"
            footer={
              <button onClick={() => setViewingRx(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Close</button>
            }
          >
            <div className="space-y-1 mb-2">
              {[
                ['Patient', [viewingRx.party_name, viewingRx.party_code].filter(Boolean).join(' — ')],
                ['Doctor', viewingRx.meta?.doctor || '—'],
                ['Hospital / Clinic', viewingRx.meta?.hospital || '—'],
                ['Date', fmtDate(viewingRx.txn_date)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/20">
                  <span className="text-white text-[12px]" style={font}>{label}</span>
                  <span className="text-white text-[14px] text-right" style={font}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-1.5 border-b border-white/20">
                <span className="text-white text-[12px]" style={font}>Status</span>
                <StatusBadge label={viewingRx.status} color={statusColor[viewingRx.status]} />
              </div>
              {viewingRx.notes && (
                <p className="text-white/70 text-[12px] pt-1" style={font}>{viewingRx.notes}</p>
              )}
            </div>
            <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1.5" style={font}>Prescribed Medicines</p>
            <div className="space-y-1.5">
              {(viewingRx.items || []).map((m, i) => {
                const dispensed = Number(m.meta?.dispensed) || 0;
                return (
                  <div key={m.id || i} className="flex justify-between items-center p-2 rounded-sm bg-white/5 border border-white/20 animate-fade-in-left" style={{ animationDelay: `${0.1 + i * 0.08}s`, animationFillMode: 'both' }}>
                    <div>
                      <p className="text-white text-[13px]" style={font}>{m.medicine} <span className="text-white/50 text-[11px]">× {m.qty}</span></p>
                      {(m.meta?.dosage || m.description) && <p className="text-white/60 text-[11px]" style={font}>{m.meta?.dosage || m.description}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[12px] ${dispensed > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`} style={font}>
                      {dispensed > 0 ? `Dispensed: ${dispensed}` : 'Not Dispensed'}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassModal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Prescriptions;
