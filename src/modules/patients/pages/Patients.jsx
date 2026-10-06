import { useState } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import { FaPlus, FaUserMd } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import GlassSelect from '../../../components/common/GlassSelect';
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
import { money, fmtDate } from '../../../utils/format';
import { printListReport, savePdfListReport, exportExcel, printRecord, savePdfRecord } from '../../../utils/printFormat';

const font = { fontFamily: 'Poppins, sans-serif' };

const emptyForm = { name: '', phone: '', cnic: '', gender: 'Male', age: '', city: '', allergies: '', address: '', creditAllowed: 'No', creditLimit: '' };

const LIST_COLUMNS = [
  { key: 'code', label: 'MRN' },
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'cnic', label: 'CNIC' },
  { key: 'genderAge', label: 'Gender / Age' },
  { key: 'city', label: 'City' },
  { key: 'allergies', label: 'Allergies' },
  { key: 'credit', label: 'Credit' },
  { key: 'visits', label: 'Visits', align: 'right' },
  { key: 'lastVisit', label: 'Last Visit' },
];

const genderAge = (p) => [p.gender, p.age].filter((v) => v !== null && v !== undefined && v !== '').join(' / ');
const creditLabel = (p) => (p.credit_allowed ? `Allowed (limit ${money(p.credit_limit)})` : 'Not Allowed');

const Patients = () => {
  const { can } = useAuth();
  const toast = useToast();
  const cCreate = can('patients', 'create');
  const cEdit = can('patients', 'edit');
  const cDelete = can('patients', 'delete');
  const cPrint = can('patients', 'print');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGender, setSelectedGender] = useState('All Genders');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [viewingPatient, setViewingPatient] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const genders = ['All Genders', 'Male', 'Female'];

  const { data: patients, loading, error, reload } = useApi('/patients', { from: dateFrom, to: dateTo });
  const { data: cityList } = useApi('/lov/cities');
  const cityOptions = cityList.map((c) => c.name);

  const filtered = patients.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (p.name || '').toLowerCase().includes(q) ||
                          (p.phone || '').includes(searchTerm) ||
                          (p.cnic || '').includes(searchTerm) ||
                          (p.code || '').toLowerCase().includes(q);
    const matchesGender = selectedGender === 'All Genders' || p.gender === selectedGender;
    return matchesSearch && matchesGender;
  });

  const filterKey = [searchTerm, selectedGender, dateFrom, dateTo].join('|');
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const listRows = () => filtered.map((p) => ({
    code: p.code,
    name: p.name,
    phone: p.phone || '',
    cnic: p.cnic || '',
    genderAge: genderAge(p),
    city: p.city || '',
    allergies: p.allergies || 'None',
    credit: creditLabel(p),
    visits: p.total_visits || 0,
    lastVisit: fmtDate(p.last_visit) || '—',
  }));
  const listArgs = () => ({ title: 'Patients', dateFrom, dateTo, columns: LIST_COLUMNS, rows: listRows(), fileName: 'patients' });
  const handlePrintList = () => printListReport(listArgs());
  const handlePdfList = () => savePdfListReport(listArgs());
  const handleCsvList = () => exportExcel(listArgs());

  const patientRecord = (p) => ({
    title: 'Patient Record',
    subtitle: `${p.code} — ${p.name}`,
    fileName: `patient-${p.code}`,
    info: [
      { label: 'MRN', value: p.code },
      { label: 'Name', value: p.name },
      { label: 'Phone', value: p.phone || '' },
      { label: 'CNIC', value: p.cnic || '' },
      { label: 'Gender', value: p.gender || '' },
      { label: 'Age', value: p.age ?? '' },
      { label: 'City', value: p.city || '' },
      { label: 'Address', value: p.address || '' },
      { label: 'Allergies', value: p.allergies || 'None' },
      { label: 'Credit Allowed', value: p.credit_allowed ? 'Yes' : 'No' },
      { label: 'Credit Limit', value: money(p.credit_limit) },
      { label: 'Credit Balance', value: money(p.balance) },
      { label: 'Total Visits', value: p.total_visits || 0 },
      { label: 'Last Visit', value: fmtDate(p.last_visit) || '—' },
    ],
  });

  const handleAdd = () => { setEditingPatient(null); setForm(emptyForm); setShowAddModal(true); };
  const handleEdit = (p) => {
    setEditingPatient(p);
    setForm({
      name: p.name || '', phone: p.phone || '', cnic: p.cnic || '', gender: p.gender || 'Male',
      age: p.age === null || p.age === undefined ? '' : String(p.age), city: p.city || '', allergies: p.allergies || '',
      address: p.address || '', creditAllowed: p.credit_allowed ? 'Yes' : 'No',
      creditLimit: p.credit_limit ? String(p.credit_limit) : '',
    });
    setShowAddModal(true);
  };
  const closeForm = () => { setShowAddModal(false); setEditingPatient(null); };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete patient ${p.name} (${p.code})?`)) return;
    try {
      const { message } = await api.del(`/patients/${p.id}`);
      toast.success(message || 'Patient deleted');
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Full name is required', 'Enter the patient name'); return; }
    if (!form.phone.trim()) { toast.error('Phone is required', 'Enter the phone number'); return; }
    if (!/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) { toast.error('Invalid phone number', 'Use digits only, like 0300-1234567'); return; }
    if (form.cnic.trim() && !/^\d{5}-?\d{7}-?\d$/.test(form.cnic.trim())) { toast.error('Invalid CNIC', 'Enter 13 digits, like 42101-1234567-1'); return; }
    if (form.age !== '' && !(Number(form.age) >= 0 && Number(form.age) <= 130)) {
      toast.error('Invalid age', 'Enter an age between 0 and 130');
      return;
    }
    const allowed = form.creditAllowed === 'Yes';
    if (allowed && form.creditLimit !== '' && !(Number(form.creditLimit) >= 0)) {
      toast.error('Invalid credit limit', 'Enter a limit of 0 or more');
      return;
    }
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      cnic: form.cnic.trim(),
      gender: form.gender,
      age: form.age === '' ? '' : Number(form.age),
      city: form.city,
      allergies: form.allergies.trim(),
      address: form.address.trim(),
      credit_allowed: allowed,
      credit_limit: allowed ? Number(form.creditLimit) || 0 : 0,
    };
    setSaving(true);
    try {
      const { message } = editingPatient
        ? await api.put(`/patients/${editingPatient.id}`, body)
        : await api.post('/patients', body);
      toast.success(message || 'Patient saved');
      closeForm();
      setForm(emptyForm);
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
          title="Patients"
          actions={
            <>
              <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
              {cPrint && <ExportButtons onPrint={handlePrintList} onExcel={handleCsvList} onPdf={handlePdfList} />}
              {cCreate && (
                <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={font}>
                  <FaPlus size={12} /> Add Patient
                </button>
              )}
            </>
          }
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search patient" />
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto animate-fade-in-up delay-300 relative z-10">
            <GlassSelect value={selectedGender} onChange={setSelectedGender} options={genders} />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px] sm:min-w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/10" style={font}>
                  {['MRN', 'Name', 'Phone', 'CNIC', 'Gender / Age', 'City', 'Allergies', 'Credit', 'Visits', 'Last Visit'].map((h) => (
                    <th key={h} className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading || error || currentItems.length === 0 ? (
                  <tr className="animate-fade-in">
                    <td colSpan="11" className="px-3 py-6 text-center text-[14px] text-white/40" style={font}>
                      {loading ? 'Loading…' : error || 'No patients found'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((p, index) => (
                    <tr
                      key={p.id}
                      className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                      style={{ animationFillMode: 'both' }}
                    >
                      <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={font}>{p.code}</td>
                      <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={font}>{p.name}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{p.phone}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{p.cnic || '—'}</td>
                      <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={font}>{genderAge(p) || '—'}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{p.city || '—'}</td>
                      <td className="px-2 py-1.5">
                        {!p.allergies || p.allergies === 'None'
                          ? <span className="text-white/40 text-[12px]" style={font}>None</span>
                          : <StatusBadge label={p.allergies} color="red" />}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="whitespace-nowrap">
                          <StatusBadge label={p.credit_allowed ? 'Allowed' : 'Not Allowed'} color={p.credit_allowed ? 'green' : 'gray'} />
                          {p.credit_allowed && (
                            <div className="text-white/60 text-[10px] mt-0.5" style={font}>Bal {money(p.balance)} / {money(p.credit_limit)}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={font}>{p.total_visits || 0}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{fmtDate(p.last_visit) || '—'}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <RowActions
                          onView={() => setViewingPatient(p)}
                          onEdit={cEdit ? () => handleEdit(p) : undefined}
                          onPrint={cPrint ? () => printRecord(patientRecord(p)) : undefined}
                          onPdf={cPrint ? () => savePdfRecord(patientRecord(p)) : undefined}
                          onDelete={cDelete ? () => handleDelete(p) : undefined}
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
            title={editingPatient ? `Edit Patient — ${editingPatient.code}` : 'Add New Patient'}
            icon={<FaUserMd className="text-white text-xs" />}
            onClose={closeForm}
            footer={
              <>
                <button onClick={closeForm} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={font}>
                  {saving ? 'Saving…' : `${editingPatient ? 'Update' : 'Save'} Patient`}
                </button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              <FormInput label="Full Name" required placeholder="Enter full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <FormInput label="Phone" required placeholder="Enter phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <FormInput label="CNIC" placeholder="Enter CNIC" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
              <FormSelect label="Gender" options={['Male', 'Female']} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} />
              <FormInput label="Age" inputMode="numeric" placeholder="Enter age" value={form.age} onChange={(e) => { const v = e.target.value; if (/^\d*$/.test(v)) setForm({ ...form, age: v }); }} />
              <FormSelect
                label="City"
                options={cityOptions}
                value={form.city}
                placeholder="Select city"
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <FormInput label="Known Allergies" placeholder="Enter allergies" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
              <FormSelect label="Credit Allowed" options={['No', 'Yes']} value={form.creditAllowed} onChange={(e) => setForm({ ...form, creditAllowed: e.target.value })} />
              {form.creditAllowed === 'Yes' && (
                <FormInput label="Credit Limit (Rs.)" inputMode="numeric" placeholder="Enter credit limit" value={form.creditLimit} onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setForm({ ...form, creditLimit: v }); }} />
              )}
              <div className="sm:col-span-2 md:col-span-3">
                <FormTextarea label="Address" placeholder="Enter address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
          </GlassModal>
        )}

        {viewingPatient && (
          <GlassModal
            title="Patient Details"
            icon={<FaUserMd className="text-white text-xs" />}
            onClose={() => setViewingPatient(null)}
            maxWidth="max-w-md"
            footer={
              <button onClick={() => setViewingPatient(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={font}>Close</button>
            }
          >
            <div className="space-y-2">
              {[
                ['MRN', viewingPatient.code],
                ['Name', viewingPatient.name],
                ['Phone', viewingPatient.phone],
                ['CNIC', viewingPatient.cnic || '—'],
                ['Gender / Age', genderAge(viewingPatient) || '—'],
                ['City', viewingPatient.city || '—'],
                ['Address', viewingPatient.address || '—'],
                ['Credit Allowed', viewingPatient.credit_allowed ? 'Yes' : 'No'],
                ['Credit Limit', money(viewingPatient.credit_limit)],
                ['Credit Balance', money(viewingPatient.balance)],
                ['Total Visits', viewingPatient.total_visits || 0],
                ['Last Visit', fmtDate(viewingPatient.last_visit) || '—'],
                ['Registered', fmtDate(viewingPatient.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/20">
                  <span className="text-white text-[12px]" style={font}>{label}</span>
                  <span className="text-white text-[14px] text-right" style={font}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-1.5">
                <span className="text-white text-[12px]" style={font}>Allergies</span>
                {!viewingPatient.allergies || viewingPatient.allergies === 'None'
                  ? <span className="text-white/40 text-[13px]" style={font}>None</span>
                  : <StatusBadge label={viewingPatient.allergies} color="red" />}
              </div>
            </div>
          </GlassModal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Patients;
