const COLOR_MAP = {
  green:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  red:    'bg-red-500/20 text-red-400 border-red-500/40',
  amber:  'bg-amber-500/20 text-amber-400 border-amber-500/40',
  blue:   'bg-blue-500/20 text-blue-400 border-blue-500/40',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  gray:   'bg-white/10 text-white/70 border-white/40',
};

const StatusBadge = ({ label, color = 'gray' }) => {
  return (
    <span
      className={`px-1.5 py-0.5 rounded-full text-[11px] border whitespace-nowrap ${COLOR_MAP[color] || COLOR_MAP.gray}`}
      style={{ fontFamily: 'Poppins, sans-serif' }}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
