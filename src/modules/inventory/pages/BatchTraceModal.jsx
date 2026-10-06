import { FaLayerGroup, FaArrowDown, FaArrowUp } from 'react-icons/fa';
import GlassModal from '../../../components/common/GlassModal';
import useApi from '../../../hooks/useApi';
import { money, fmtDate } from '../../../utils/format';
import { FONT, btnCancel, qtyUom } from './invUtils';

const BatchTraceModal = ({ batch, basePath = '/inventory/batches', onClose }) => {
  const { data: d, loading, error } = useApi(`${basePath}/${batch.id}`, undefined, { initial: null });
  const info = d || batch;
  const movements = (d && d.movements) || [];

  const cell = (label, value) => (
    <div className="p-2 rounded-sm bg-white/5 border border-white/20">
      <p className="text-white/60 text-[11px]" style={FONT}>{label}</p>
      <p className="text-white text-[13px]" style={FONT}>{value || '—'}</p>
    </div>
  );

  return (
    <GlassModal
      title={`Batch ${info.batch_no} — Trace History`}
      icon={<FaLayerGroup className="text-white text-xs" />}
      onClose={onClose}
      maxWidth="max-w-md"
      footer={<button onClick={onClose} className={btnCancel} style={FONT}>Close</button>}
    >
      <div className="grid grid-cols-2 gap-2 mb-3">
        {cell('Medicine', info.medicine_name)}
        {cell('Supplier', info.supplier_name)}
        {cell('Branch', info.branch_name)}
        {cell('GRN Ref', info.grn_no)}
        {cell('Unit Cost', money(info.unit_cost))}
        {cell('Expiry', fmtDate(info.expiry))}
        {cell('Received', `${fmtDate(info.received_date)} — ${qtyUom(info.received_qty, info.uom)}`)}
        {cell('Remaining', qtyUom(info.qty, info.uom))}
      </div>

      <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1.5" style={FONT}>Movement Timeline</p>
      <div className="space-y-1.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
        {loading ? (
          <p className="text-white/40 text-[13px] py-3 text-center" style={FONT}>Loading…</p>
        ) : error ? (
          <p className="text-white/40 text-[13px] py-3 text-center" style={FONT}>{error}</p>
        ) : movements.length === 0 ? (
          <p className="text-white/40 text-[13px] py-3 text-center" style={FONT}>No movements recorded</p>
        ) : movements.map((m, i) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded-sm bg-white/5 border border-white/20 animate-fade-in-left" style={{ animationDelay: `${0.1 + i * 0.08}s`, animationFillMode: 'both' }}>
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${m.type === 'in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {m.type === 'in' ? <FaArrowDown size={10} /> : <FaArrowUp size={10} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-center">
                <p className="text-white text-[12px]" style={FONT}>{m.ref}</p>
                <span className={`text-[12px] ${m.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`} style={FONT}>
                  {m.type === 'in' ? '+' : '-'}{qtyUom(m.qty, info.uom)}
                </span>
              </div>
              <p className="text-white/60 text-[11px]" style={FONT}>{fmtDate(m.date)} — {m.note}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassModal>
  );
};

export default BatchTraceModal;
