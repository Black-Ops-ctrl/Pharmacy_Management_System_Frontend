import { useRef, useState } from 'react';
import { FaFileImport, FaFileCsv, FaDownload } from 'react-icons/fa';
import GlassModal from './GlassModal';
import api from '../../config/api';
import { useToast } from '../../context/ToastContext';
import { downloadCsv } from '../../utils/printFormat';

const FONT = { fontFamily: 'Poppins, sans-serif' };
const key = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function readRows(file) {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const isCsv = /\.csv$/i.test(file.name);
  const wb = isCsv
    ? XLSX.read(new TextDecoder('utf-8').decode(buf).replace(/^\uFEFF/, ''), { type: 'string', raw: true })
    : XLSX.read(buf, { type: 'array', cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
}

const mapRows = (rows, columns) => {
  const lookup = new Map();
  columns.forEach((c) => { lookup.set(key(c.label), c.key); lookup.set(key(c.key), c.key); });
  return rows
    .map((r, i) => {
      const out = { row: i + 2 };
      Object.entries(r).forEach(([h, v]) => { const k = lookup.get(key(h)); if (k) out[k] = String(v ?? '').trim(); });
      return out;
    })
    .filter((r) => columns.some((c) => r[c.key]));
};

const ImportButton = ({ title, endpoint, columns, templateName, onDone }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in"
        style={FONT}
      >
        <FaFileImport size={12} /> Import
      </button>
      {open && <ImportModal title={title} endpoint={endpoint} columns={columns} templateName={templateName} onDone={onDone} onClose={() => setOpen(false)} />}
    </>
  );
};

function ImportModal({ title, endpoint, columns, templateName, onDone, onClose }) {
  const toast = useToast();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const choose = (f) => {
    if (!f) return;
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) {
      setFile(null);
      toast.error('Wrong file type', 'Choose a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }
    setFile(f);
  };

  const template = () => downloadCsv([columns.map((c) => c.label).join(',')], templateName || title);

  const upload = async () => {
    if (!file) { toast.error('No file selected', 'Choose the file to import'); return; }
    setBusy(true);
    try {
      const rows = mapRows(await readRows(file), columns);
      if (!rows.length) throw new Error('The file has no rows with data. Use the template columns.');
      const res = await api.post(endpoint, { rows });
      toast.success(res.message || 'Imported');
      if (onDone) onDone();
      onClose();
    } catch (e) {
      const list = e.errors || [];
      if (!list.length) toast.error('Import failed', e.message || 'The file could not be imported', 7000);
      list.slice(0, 5).forEach((x) => toast.error(`Row ${x.row} · ${x.column}`, x.message, 9000));
      if (list.length > 5) toast.error('More problems in the file', `${list.length - 5} more. Fix these and upload again.`, 9000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassModal
      title={title}
      icon={<FaFileImport className="text-white text-xs" />}
      onClose={onClose}
      maxWidth="max-w-md"
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={FONT}>Cancel</button>
          <button onClick={upload} disabled={busy} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={FONT}>
            {busy ? 'Importing…' : 'Import'}
          </button>
        </>
      }
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current && input.current.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' && input.current) input.current.click(); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files && e.dataTransfer.files[0]); }}
        className={`flex flex-col items-center justify-center gap-1.5 p-6 border border-dashed cursor-pointer transition-all ${file ? 'border-emerald-400/70 bg-emerald-500/10' : 'border-white/50 bg-white/5 hover:bg-white/10'}`}
        style={FONT}
      >
        <FaFileCsv className="text-white/80 text-2xl" />
        <span className="text-white text-[14px] text-center break-all">{file ? file.name : 'Choose a CSV or Excel file'}</span>
        <span className="text-white/60 text-[12px]">{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : 'Click here or drop the file'}</span>
        <input
          ref={input}
          type="file"
          hidden
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={(e) => { choose(e.target.files && e.target.files[0]); e.target.value = ''; }}
        />
      </div>
      <button type="button" onClick={template} className="mt-2 flex items-center gap-1.5 text-purple-300 hover:text-white text-[13px] transition-colors" style={FONT}>
        <FaDownload size={10} /> Download template
      </button>
    </GlassModal>
  );
}

export default ImportButton;
