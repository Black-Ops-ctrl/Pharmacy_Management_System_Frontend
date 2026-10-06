export const FONT = { fontFamily: 'Poppins, sans-serif' };

export const qtyUom = (qty, uom) => `${Number(qty) || 0}${uom ? ` ${uom}` : ''}`;

export const signedQtyUom = (qty, uom) => {
  const n = Number(qty) || 0;
  return `${n > 0 ? '+' : ''}${n}${uom ? ` ${uom}` : ''}`;
};

export const daysLeftText = (d) => {
  if (d === null || d === undefined) return '—';
  if (d < 0) return `Expired ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ago`;
  if (d === 0) return 'Expires today';
  return `${d} day${d === 1 ? '' : 's'}`;
};

export const btnCancel = 'px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all';
export const btnSave = 'px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
