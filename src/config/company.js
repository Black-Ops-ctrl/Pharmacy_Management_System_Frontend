export const CURRENCY = 'Rs.';

const EMPTY = {
  name: '',
  phone: '',
  address: '',
  ntn: '',
  email: '',
  website: '',
  top_bar_text: '',
  print_footer_note: '',
  logo: null,
  logo_name: '',
  receipt_width: 80,
  receipt_show_logo: true,
  receipt_show_barcode: true,
  receipt_copies: 1,
  receipt_header: '',
  receipt_thanks: '',
  receipt_policy: '',
  max_discount_pct: 10,
};

let company = { ...EMPTY };
let branches = [];

const clean = (p) => {
  const out = { ...EMPTY };
  Object.keys(EMPTY).forEach((k) => {
    const v = p && p[k];
    out[k] = v === undefined || v === null ? EMPTY[k] : v;
  });
  return out;
};

export const setCompany = (p) => { company = clean(p); };
export const getCompany = () => company;

export const setBranches = (list) => { branches = Array.isArray(list) ? list : []; };

export const findBranch = (b) => {
  if (!b) return null;
  if (typeof b === 'object') return b;
  const s = String(b).trim().toLowerCase();
  if (!s || s === '—') return null;
  return branches.find((x) => String(x.id) === s || String(x.name || '').trim().toLowerCase() === s) || { name: String(b).trim() };
};

export const topBarText = (c = company) =>
  c.top_bar_text || (c.name ? `WELCOME TO ${String(c.name).toUpperCase()}` : '');
