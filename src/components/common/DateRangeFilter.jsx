import { FaTimes } from 'react-icons/fa';

const cls = 'bg-white/10 border border-white/40 rounded-sm px-2 py-1.5 text-white text-[13px] focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 [color-scheme:dark]';

const DateRangeFilter = ({ from, to, onFromChange, onToChange, onClear, clearable = true }) => (
  <div className="flex items-center gap-1.5">
    <input type="date" value={from || ''} max={to || undefined} onChange={(e) => onFromChange(e.target.value)}
      aria-label="From date" title="From date" className={cls} style={{ fontFamily: 'Poppins, sans-serif' }} />
    <span className="text-white/40 text-[13px]">–</span>
    <input type="date" value={to || ''} min={from || undefined} onChange={(e) => onToChange(e.target.value)}
      aria-label="To date" title="To date" className={cls} style={{ fontFamily: 'Poppins, sans-serif' }} />
    {clearable && (from || to) && (
      <button type="button" onClick={onClear || (() => { onFromChange(''); onToChange(''); })} title="Clear dates"
        className="w-7 h-7 rounded-sm bg-white/10 hover:bg-white/20 text-white/70 flex items-center justify-center transition-all">
        <FaTimes size={11} />
      </button>
    )}
  </div>
);

export default DateRangeFilter;
