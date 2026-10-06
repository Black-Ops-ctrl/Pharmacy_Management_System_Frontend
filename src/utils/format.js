import { CURRENCY } from '../config/company';

const cur = CURRENCY;

export const money = (v) => `${cur} ${(Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
export const num = (v, digits = 2) => (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: digits });

const pad = (n) => String(n).padStart(2, '0');
export const fmtDate = (v) => {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const fmtDateTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const today = () => fmtDate(new Date());
export const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return fmtDate(d); };

export const inRange = (v, from, to) => {
  const d = fmtDate(v);
  return (!from || d >= from) && (!to || d <= to);
};
