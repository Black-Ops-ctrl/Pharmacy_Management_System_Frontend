import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import PageHeader from '../../../components/common/PageHeader';
import { FormInput, FormSelect } from '../../../components/common/FormField';
import api from '../../../config/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useCompany } from '../../../context/CompanyContext';
import { imageFileToDataURL } from '../../../utils/image';
import { buildReceiptHtml, receiptSettings } from '../../../utils/receipt';

const font = { fontFamily: 'Poppins, sans-serif' };
const FIELDS = ['name', 'phone', 'address', 'ntn', 'email', 'website', 'top_bar_text', 'print_footer_note', 'receipt_header', 'receipt_thanks', 'receipt_policy'];
const YES_NO = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];
const WIDTHS = [{ value: '80', label: '80 mm (standard)' }, { value: '58', label: '58 mm (small)' }];
const COPIES = ['1', '2', '3'];
const SAMPLE_SALE = {
  doc_no: 'INV-2026-0001', txn_date: new Date().toISOString(), user_name: 'Cashier', party_name: 'Walk-in Customer',
  payment_method: 'Cash', subtotal: 378, discount: 0, total: 378, meta: {},
  lines: [
    { medicine: 'Panadol 500mg', qty: 20, unit: 'Tablet', price: 3.5, amount: 70 },
    { medicine: 'Risek 20mg', qty: 14, unit: 'Capsule', price: 22, amount: 308 },
  ],
};
const card = 'bg-white/10 backdrop-blur-lg border border-white/40 rounded-md p-3 sm:p-4';
const section = 'sm:col-span-2 text-purple-200 text-[12px] uppercase tracking-widest mt-1';

const toForm = (c) => ({
  ...Object.fromEntries(FIELDS.map((k) => [k, (c && c[k]) || ''])),
  receipt_width: String(c && Number(c.receipt_width) === 58 ? 58 : 80),
  receipt_copies: String((c && c.receipt_copies) || 1),
  receipt_show_logo: c && c.receipt_show_logo === false ? 'no' : 'yes',
  receipt_show_barcode: c && c.receipt_show_barcode === false ? 'no' : 'yes',
  max_discount_pct: c && c.max_discount_pct !== undefined && c.max_discount_pct !== null ? String(Number(c.max_discount_pct)) : '10',
});

const CompanyProfile = () => {
  const { can } = useAuth();
  const toast = useToast();
  const { company, loaded, apply } = useCompany();
  const canEdit = can('company-profile', 'edit');

  const [form, setForm] = useState(() => toForm(company));
  const [logo, setLogo] = useState({ url: company.logo || null, name: company.logo_name || '', info: '' });
  const [logoChanged, setLogoChanged] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const reset = (c) => {
    setForm(toForm(c));
    setLogo({ url: c.logo || null, name: c.logo_name || '', info: '' });
    setLogoChanged(false);
  };
  useEffect(() => { if (loaded) reset(company); }, [loaded]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickFile = async (file) => {
    if (!file) return;
    try {
      const img = await imageFileToDataURL(file);
      setLogo({ url: img.url, name: file.name, info: `${img.type} · ${img.width} × ${img.height}` });
      setLogoChanged(true);
    } catch (err) {
      toast.error('Could not use this file', err.message);
    }
  };
  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    if (!canEdit) return;
    pickFile(e.dataTransfer.files && e.dataTransfer.files[0]);
  };
  const removeLogo = () => { setLogo({ url: null, name: '', info: '' }); setLogoChanged(true); };

  const save = async () => {
    const miss = [['name', 'Pharmacy name'], ['phone', 'Phone'], ['address', 'Head office address']]
      .filter(([k]) => !form[k].trim()).map(([, l]) => l);
    if (miss.length) { toast.error(`${miss[0]} is required`, `Enter the ${miss[0].toLowerCase()}`); return; }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { toast.error('Invalid email', 'Enter a valid email address'); return; }
    const maxDisc = Number(form.max_discount_pct);
    if (form.max_discount_pct === '' || !Number.isFinite(maxDisc) || maxDisc < 0 || maxDisc > 100) { toast.error('Invalid maximum discount', 'Enter a maximum discount from 0 to 100%'); return; }
    const body = Object.fromEntries(FIELDS.map((k) => [k, form[k].trim()]));
    if (logoChanged) { body.logo = logo.url || null; body.logo_name = logo.url ? logo.name : null; }
    body.receipt_width = Number(form.receipt_width);
    body.receipt_copies = Number(form.receipt_copies);
    body.receipt_show_logo = form.receipt_show_logo === 'yes';
    body.receipt_show_barcode = form.receipt_show_barcode === 'yes';
    body.max_discount_pct = maxDisc;
    setSaving(true);
    try {
      const { data, message } = await api.put('/company', body);
      apply(data);
      reset(data);
      toast.success(message || 'Pharmacy settings saved', data.name);
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const ro = !canEdit;
  const previewCompany = {
    ...company, ...form, logo: logo.url,
    receipt_width: Number(form.receipt_width), receipt_copies: 1,
    receipt_show_logo: form.receipt_show_logo === 'yes', receipt_show_barcode: form.receipt_show_barcode === 'yes',
  };
  const previewHtml = buildReceiptHtml(SAMPLE_SALE, previewCompany, receiptSettings(previewCompany))
    .replace('</style>', `${Number(form.receipt_width) === 58 ? '' : '.r{zoom:.85}'}</style>`);
  const pick = (k) => (e) => { if (!ro) setForm((f) => ({ ...f, [k]: e.target.value })); };

  return (
    <DashboardLayout>
      <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in p-1">
        <PageHeader title="Pharmacy Settings" />

        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-2 sm:gap-3 items-start">
          <div className="flex flex-col gap-2 sm:gap-3">
          <div className={card}>
            <h3 className="text-white text-[15px] mb-2" style={font}>Logo</h3>
            <div
              role="button"
              tabIndex={ro ? -1 : 0}
              aria-label="Upload logo"
              onClick={() => !ro && fileRef.current && fileRef.current.click()}
              onKeyDown={(e) => { if (!ro && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fileRef.current && fileRef.current.click(); } }}
              onDragOver={(e) => { e.preventDefault(); if (!ro) setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`h-44 sm:h-48 rounded-md border-[1.5px] border-dashed grid place-items-center p-3 transition-colors
                ${dragOver ? 'border-purple-300 bg-white/10' : 'border-white/45'} ${ro ? 'cursor-default' : 'cursor-pointer hover:border-white/70'}`}
            >
              {logo.url ? (
                <img src={logo.url} alt="Logo" className="block max-w-full max-h-[150px] sm:max-h-[166px] object-contain" style={{ background: 'none' }} />
              ) : (
                <span className="text-white/60 text-[13px] text-center" style={font}>Drop an image here or click to upload</span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.svg,.ico,.bmp,.webp,.avif,.jfif"
              aria-label="Logo file"
              className="hidden"
              onChange={(e) => { pickFile(e.target.files && e.target.files[0]); e.target.value = ''; }}
            />
            {logo.url && (logo.name || logo.info) && (
              <div className="flex justify-between gap-2 mt-2 text-white/70 text-[12px]" style={font}>
                <span className="truncate">{logo.name}</span><span className="flex-none">{logo.info}</span>
              </div>
            )}
            {canEdit && (
              <div className="flex gap-1.5 mt-2">
                <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/40 rounded-sm text-white text-[13px] transition-all" style={font}>
                  {logo.url ? 'Change' : 'Upload'}
                </button>
                {logo.url && (
                  <button type="button" onClick={removeLogo} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/60 rounded-sm text-white text-[13px] transition-all" style={font}>
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={card}>
            <h3 className="text-white text-[15px] mb-2" style={font}>Receipt Preview</h3>
            <div className="rounded-md p-2" style={{ background: '#d9d9de' }}>
              <iframe title="Receipt preview" srcDoc={previewHtml} className="block w-full h-[520px] bg-white" style={{ border: 0 }} />
            </div>
          </div>
          </div>

          <div className={card}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className={section} style={font}>Pharmacy</div>
              <FormInput label="Pharmacy Name" required placeholder="Enter pharmacy name" maxLength={120} readOnly={ro} value={form.name} onChange={set('name')} />
              <FormInput label="Phone" required placeholder="Enter phone number" maxLength={40} readOnly={ro} value={form.phone} onChange={set('phone')} />
              <div className="sm:col-span-2">
                <FormInput label="Head Office Address" required placeholder="Enter head office address" maxLength={500} readOnly={ro} value={form.address} onChange={set('address')} />
              </div>
              <FormInput label="NTN" placeholder="Enter NTN" maxLength={40} readOnly={ro} value={form.ntn} onChange={set('ntn')} />
              <FormInput label="Email" type="email" placeholder="Enter email" maxLength={120} readOnly={ro} value={form.email} onChange={set('email')} />
              <div className="sm:col-span-2">
                <FormInput label="Website" placeholder="Enter website" maxLength={120} readOnly={ro} value={form.website} onChange={set('website')} />
              </div>

              <div className={section} style={font}>Screen &amp; Prints</div>
              <div className="sm:col-span-2">
                <FormInput label="Top Bar Text" placeholder="Enter top bar text" maxLength={160} readOnly={ro} value={form.top_bar_text} onChange={set('top_bar_text')} />
              </div>
              <div className="sm:col-span-2">
                <FormInput label="Print Footer Note" placeholder="Enter print footer note" maxLength={300} readOnly={ro} value={form.print_footer_note} onChange={set('print_footer_note')} />
              </div>

              <div className={section} style={font}>POS Billing</div>
              <FormInput label="Maximum Discount (%)" required type="text" inputMode="decimal" placeholder="e.g. 10" maxLength={6} readOnly={ro}
                value={form.max_discount_pct} onChange={(e) => { if (/^\d{0,3}(\.\d{0,2})?$/.test(e.target.value)) set('max_discount_pct')(e); }} />
              <div className="hidden sm:block" />

              <div className={section} style={font}>POS Receipt (Thermal Printer)</div>
              <FormSelect label="Printer Paper Width" options={WIDTHS} value={form.receipt_width} onChange={pick('receipt_width')} />
              <FormSelect label="Number of Copies" options={COPIES} value={form.receipt_copies} onChange={pick('receipt_copies')} />
              <FormSelect label="Show Logo on Receipt" options={YES_NO} value={form.receipt_show_logo} onChange={pick('receipt_show_logo')} />
              <FormSelect label="Show Barcode (Invoice No.)" options={YES_NO} value={form.receipt_show_barcode} onChange={pick('receipt_show_barcode')} />
              <div className="sm:col-span-2">
                <FormInput label="Receipt Header Line" placeholder="e.g. Licensed Pharmacy · DSL No. LHR-04512" maxLength={160} readOnly={ro} value={form.receipt_header} onChange={set('receipt_header')} />
              </div>
              <div className="sm:col-span-2">
                <FormInput label="Thank-you Message" placeholder="e.g. Thank you for shopping with us!" maxLength={200} readOnly={ro} value={form.receipt_thanks} onChange={set('receipt_thanks')} />
              </div>
              <div className="sm:col-span-2">
                <FormInput label="Return Policy" placeholder="e.g. Medicines can be returned within 7 days with receipt" maxLength={300} readOnly={ro} value={form.receipt_policy} onChange={set('receipt_policy')} />
              </div>
            </div>

            {canEdit && (
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-white/25">
                <button type="button" onClick={() => reset(company)} disabled={saving} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all disabled:opacity-50" style={font}>Cancel</button>
                <button type="button" onClick={save} disabled={saving} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={font}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CompanyProfile;
