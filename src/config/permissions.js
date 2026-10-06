export const PERMISSION_GROUPS = [
  { group: '', pages: [
    { key: 'dashboard', label: 'Dashboard', route: '/dashboard', actions: [] },
    { key: 'pos', label: 'POS / Billing', route: '/pos', actions: ['create', 'print'] },
  ] },
  { group: 'Sales', pages: [
    { key: 'sale-invoices', label: 'Sale Invoices', route: '/sale-invoices', tab: 'invoices', actions: ['delete', 'print'] },
    { key: 'sale-returns', label: 'Sale Returns', route: '/sale-invoices', tab: 'returns', actions: ['create', 'delete', 'print'] },
  ] },
  { group: 'Catalog & Stock', pages: [
    { key: 'medicines', label: 'Medicines', route: '/medicines', tab: 'medicines', actions: ['create', 'edit', 'delete', 'print'] },
    { key: 'categories', label: 'Categories', route: '/medicines', tab: 'categories', actions: ['create', 'edit', 'delete'] },
    { key: 'uoms', label: 'UOMs', route: '/medicines', tab: 'uoms', actions: ['create', 'edit', 'delete'] },
    { key: 'inv-stock', label: 'Inventory — Stock', route: '/inventory', tab: 'stock', actions: ['delete', 'print'] },
    { key: 'inv-batches', label: 'Inventory — Batches', route: '/inventory', tab: 'batches', actions: ['edit', 'delete', 'print'] },
    { key: 'inv-adjustments', label: 'Inventory — Adjustments', route: '/inventory', tab: 'adjustments', actions: ['create', 'edit', 'delete', 'print'] },
    { key: 'inv-expiry', label: 'Inventory — Expiry Alerts', route: '/inventory', tab: 'expiry', actions: ['edit', 'delete', 'print'] },
  ] },
  { group: 'Buying', pages: [
    { key: 'purchase-orders', label: 'Purchase Orders', route: '/purchasing', tab: 'orders', actions: ['create', 'edit', 'delete', 'print'] },
    { key: 'grn', label: 'Goods Receiving (GRN)', route: '/purchasing', tab: 'grn', actions: ['create', 'edit', 'delete', 'print'] },
    { key: 'purchase-returns', label: 'Purchase Returns', route: '/purchasing', tab: 'returns', actions: ['create', 'edit', 'delete', 'print'] },
    { key: 'suppliers', label: 'Suppliers', route: '/suppliers', actions: ['create', 'edit', 'delete'] },
  ] },
  { group: 'Patients', pages: [
    { key: 'patients', label: 'Patients', route: '/patients', actions: ['create', 'edit', 'delete', 'print'] },
    { key: 'prescriptions', label: 'Prescriptions', route: '/prescriptions', actions: ['create', 'edit', 'delete', 'print'] },
    { key: 'credit', label: 'Credit', route: '/credit', actions: ['create', 'edit', 'delete', 'print'] },
  ] },
  { group: 'Business', pages: [
    { key: 'finance', label: 'Finance', route: '/finance', actions: ['create', 'edit', 'delete', 'print'] },
    { key: 'branches', label: 'Branches', route: '/branches', actions: ['create', 'edit', 'delete'] },
    { key: 'cities', label: 'Cities', route: '/cities', actions: ['create', 'edit', 'delete'] },
    { key: 'employees', label: 'Employees', route: '/employees', actions: ['create', 'edit', 'delete'] },
  ] },
  { group: 'Insights', pages: [
    { key: 'reports', label: 'Reports', route: '/reports', actions: ['print'] },
    { key: 'online-orders', label: 'Online Orders', route: '/online-orders', actions: ['edit', 'delete', 'print'] },
  ] },
  { group: 'System', pages: [
    { key: 'company-profile', label: 'Pharmacy Settings', route: '/company-profile', actions: ['edit'] },
    { key: 'admin', label: 'Admin (Users, Roles & Permissions)', route: '/admin', actions: ['create', 'edit', 'delete'] },
    { key: 'database-backup', label: 'Database Backup', route: '/database-backup', actions: ['create', 'edit', 'delete'] },
  ] },
];

export const ALL_PAGES = PERMISSION_GROUPS.flatMap((g) => g.pages);
export const ACTIONS = ['view', 'create', 'edit', 'delete', 'print'];

export const ROUTE_PAGES = ALL_PAGES.reduce((m, p) => {
  (m[p.route] = m[p.route] || []).push(p.key);
  return m;
}, {});

const pageByKey = ALL_PAGES.reduce((m, p) => { m[p.key] = p; return m; }, {});
export const pageActions = (key) => (pageByKey[key] ? pageByKey[key].actions : []);

export const SESSION_MS = 30 * 60 * 1000;
export const WARN_MS = 2 * 60 * 1000;
