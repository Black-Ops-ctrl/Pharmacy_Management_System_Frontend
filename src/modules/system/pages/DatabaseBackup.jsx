import { useEffect, useState } from 'react';
import { FaDatabase, FaDownload, FaTrash, FaSave } from 'react-icons/fa';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import PageHeader from '../../../components/common/PageHeader';
import StatusBadge from '../../../components/common/StatusBadge';
import { FormInput, FormSelect } from '../../../components/common/FormField';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api, { API_BASE, getToken } from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { fmtDateTime } from '../../../utils/format';

const font = { fontFamily: 'Poppins, sans-serif' };
const card = 'bg-white/10 backdrop-blur-lg border border-white/40 rounded-md p-3 sm:p-4';
const section = 'sm:col-span-2 text-purple-200 text-[12px] uppercase tracking-widest mt-1';
const thCls = 'px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap';

const ON_OFF = [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }];
const PRESET_DAYS = ['1', '2', '3', '7'];
const FREQ = [
  { value: '1', label: 'Every day' },
  { value: '2', label: 'Every 2 days' },
  { value: '3', label: 'Every 3 days' },
  { value: '7', label: 'Every 7 days (weekly)' },
  { value: 'custom', label: 'Custom (enter days)' },
];
const KEEP = [
  { value: '15', label: 'Last 15 backups' },
  { value: '30', label: 'Last 30 backups' },
  { value: '60', label: 'Last 60 backups' },
  { value: '0', label: 'Keep all' },
];

const toForm = (s = {}) => {
  const days = String(s.every_days || 1);
  const keep = String(s.keep_count ?? 30);
  return {
    auto: s.enabled === false ? 'off' : 'on',
    freq: PRESET_DAYS.includes(days) ? days : 'custom',
    days,
    time: s.run_time || '23:00',
    keep: KEEP.some((k) => k.value === keep) ? keep : '30',
    folder: s.folder || '',
  };
};

const size = (b) => {
  const n = Number(b) || 0;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
};

const DatabaseBackup = () => {
  const { can } = useAuth();
  const toast = useToast();
  const canCreate = can('database-backup', 'create');
  const canEdit = can('database-backup', 'edit');
  const canDelete = can('database-backup', 'delete');
  const ro = !canEdit;

  const { data, setData, loading, error } = useApi('/backups', null, { initial: null });
  const [form, setForm] = useState(toForm());
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data && data.settings) setForm(toForm(data.settings)); }, [data]);

  const set = (k) => (e) => { if (!ro) setForm((f) => ({ ...f, [k]: e.target.value })); };
  const status = (data && data.status) || {};
  const backups = (data && data.backups) || [];

  const save = async () => {
    const days = form.freq === 'custom' ? Number(form.days) : Number(form.freq);
    if (!Number.isInteger(days) || days < 1 || days > 365) { toast.error('Invalid value', 'Enter how often to back up: 1 to 365 days'); return; }
    if (!form.time) { toast.error('Required', 'Enter the backup time'); return; }
    if (!form.folder.trim()) { toast.error('Required', 'Enter the folder where backups are saved'); return; }
    setSaving(true);
    try {
      const res = await api.put('/backups/settings', {
        enabled: form.auto === 'on', every_days: days, run_time: form.time, keep_count: Number(form.keep), folder: form.folder.trim(),
      });
      setData(res.data);
      toast.success(res.message || 'Backup settings saved');
    } catch (e) {
      toast.error('Could not save', e.message);
    } finally {
      setSaving(false);
    }
  };

  const backupNow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.post('/backups');
      setData(res.data);
      toast.success(res.message || 'Backup completed', res.data && res.data.file ? res.data.file.name : '');
    } catch (e) {
      toast.error('Backup failed', e.message.replace(/^Backup failed:\s*/, ''));
    } finally {
      setBusy(false);
    }
  };

  const download = async (b) => {
    try {
      const res = await fetch(`${API_BASE}/backups/${encodeURIComponent(b.name)}/download`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Download failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = b.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error('Could not download', e.message);
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete backup ${b.name}?`)) return;
    try {
      const res = await api.del(`/backups/${encodeURIComponent(b.name)}`);
      setData(res.data);
      toast.success(res.message || 'Backup deleted');
    } catch (e) {
      toast.error('Could not delete', e.message);
    }
  };

  const reset = () => { if (data && data.settings) setForm(toForm(data.settings)); };

  return (
    <DashboardLayout>
      <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in p-1">
        <PageHeader title="Database Backup" />

        <div className="space-y-3 animate-fade-in-up">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-2 sm:gap-3 items-start">
            <div className={card}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div className={section} style={font}>Auto Backup Schedule</div>
                <FormSelect label="Auto Backup" options={ON_OFF} value={form.auto} onChange={set('auto')} />
                <FormSelect label="How Often" options={FREQ} value={form.freq} onChange={set('freq')} />
                {form.freq === 'custom' && (
                  <FormInput label="Every (days)" type="number" min="1" max="365" step="1" required readOnly={ro} value={form.days}
                    onChange={(e) => { if (!ro && /^\d{0,3}$/.test(e.target.value)) setForm((f) => ({ ...f, days: e.target.value })); }} />
                )}
                <FormInput label="Backup Time" type="time" required readOnly={ro} value={form.time} onChange={set('time')} />
                <FormSelect label="Keep" options={KEEP} value={form.keep} onChange={set('keep')} />
                <div className="sm:col-span-2">
                  <FormInput label="Save Backups In (folder on the server PC)" required placeholder="e.g. D:\PharmacyBackups" maxLength={400} readOnly={ro} value={form.folder} onChange={set('folder')} />
                </div>
              </div>
              {canEdit && (
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-white/25">
                  <button type="button" onClick={reset} disabled={saving} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all disabled:opacity-50" style={font}>Cancel</button>
                  <button type="button" onClick={save} disabled={saving || !data} className="flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={font}>
                    <FaSave size={11} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className={card}>
              <h3 className="text-white text-[15px] mb-2" style={font}>Backup Now</h3>
              <p className="text-white/70 text-[12px] mb-3" style={font}>Takes a full backup of the database (all tables and data) right now.</p>
              {canCreate && (
                <button type="button" onClick={backupNow} disabled={busy || !data} className="w-full flex items-center justify-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={font}>
                  <FaDatabase size={12} /> {busy ? 'Backing up…' : 'Backup Now'}
                </button>
              )}
              <div className={`${canCreate ? 'mt-3 pt-3 border-t border-white/25' : ''} space-y-1.5 text-[12px]`} style={font}>
                <div className="flex justify-between gap-2"><span className="text-white/60">Last backup</span><span className="text-white">{status.last_backup_at ? fmtDateTime(status.last_backup_at) : '—'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-white/60">Next auto backup</span><span className="text-white">{status.next_backup_at ? fmtDateTime(status.next_backup_at) : 'Off'}</span></div>
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-white/60">Status</span>
                  {status.last_status ? <StatusBadge label={status.last_status} color={status.last_status === 'Successful' ? 'green' : 'red'} /> : <span className="text-white">—</span>}
                </div>
                {status.last_status === 'Failed' && status.last_message && (
                  <div className="text-red-300 text-[12px] break-words">{status.last_message}</div>
                )}
                <div className="flex justify-between gap-2"><span className="text-white/60">Total backups</span><span className="text-white">{status.total_backups || 0} · {size(status.total_size)}</span></div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[640px] sm:min-w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10" style={font}>
                    <th className={thCls}>Backup File</th>
                    <th className={thCls}>Date &amp; Time</th>
                    <th className={thCls}>Type</th>
                    <th className={thCls}>Size</th>
                    <th className={`${thCls} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !data ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-white/40 text-[13px]" style={font}>Loading…</td></tr>
                  ) : error && !data ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-red-400 text-[13px]" style={font}>{error}</td></tr>
                  ) : backups.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-white/40 text-[13px]" style={font}>No backups yet.</td></tr>
                  ) : backups.map((b) => (
                    <tr key={b.name} className="border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9">
                      <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={font}>{b.name}</td>
                      <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={font}>{fmtDateTime(b.created_at)}</td>
                      <td className="px-2 py-1.5"><StatusBadge label={b.type} color={b.type === 'Auto' ? 'blue' : 'purple'} /></td>
                      <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={font}>{size(b.size)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => download(b)} title="Download" className="w-7 h-7 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95">
                            <FaDownload size={12} />
                          </button>
                          {canDelete && (
                            <button onClick={() => remove(b)} title="Delete" className="w-7 h-7 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-red-500/20 active:scale-95">
                              <FaTrash size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DatabaseBackup;
