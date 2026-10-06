import { useState } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import { FaPrint, FaChartLine, FaChartBar, FaChartPie, FaBoxes } from 'react-icons/fa';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import PageHeader from '../../../components/common/PageHeader';
import StatMini from '../../../components/common/StatMini';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import PrintReportsPanel from '../components/PrintReportsPanel';
import useApi from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { money, num, fmtDate, today, daysAgo } from '../../../utils/format';
import { getCompany } from '../../../config/company';

const PIE_COLORS = ['#10b981', '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

const tooltipStyle = {
  backgroundColor: '#2a1b3e',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '4px',
  fontSize: '13px',
  fontFamily: 'Poppins, sans-serif',
  color: '#fff',
};

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ChartCard = ({ title, icon, children, delay, empty, emptyText }) => (
  <div className="p-3 rounded-sm bg-white/5 backdrop-blur-lg border border-white/10 animate-fade-in-up" style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}>
    <div className="flex items-center gap-2 mb-2">
      <span className="text-purple-300">{icon}</span>
      <p className="text-white text-[13px] uppercase tracking-wider" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</p>
    </div>
    <div className="h-[220px] sm:h-[240px]">
      {empty ? (
        <div className="h-full flex items-center justify-center text-white/40 text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{emptyText}</div>
      ) : children}
    </div>
  </div>
);

const TopMedTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ ...tooltipStyle, padding: '6px 8px' }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.name}</div>
      <div>Sold: {num(d.qty)}</div>
      <div>Units: {num(d.units)}</div>
      <div>Revenue: {money(d.revenue)}</div>
    </div>
  );
};

const emptyAnalytics = { summary: {}, trend: [], top_medicines: [], payment_split: [], branch_sales: [], invoices: [] };

const Reports = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [reportView, setReportView] = useState('analytics');
  const tabBtn = (v) => `px-4 py-1.5 rounded-sm text-[14px] font-medium transition-all ${reportView === v ? 'bg-gradient-to-r from-purple-500 via-purple-700 to-indigo-700 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/30'}`;

  const [startDate, setStartDate] = useState(daysAgo(6));
  const [endDate, setEndDate] = useState(today());

  const { data, loading, error } = useApi('/reports/analytics', { from: startDate, to: endDate },
    { initial: emptyAnalytics, enabled: reportView === 'analytics' });
  const a = data || emptyAnalytics;
  const s = a.summary || {};
  const totalSales = Number(s.total_sales) || 0;
  const totalPurchases = Number(s.total_purchases) || 0;
  const grossProfit = Number(s.gross_profit) || 0;
  const invoiceCount = Number(s.invoices) || 0;

  const salesTrend = (a.trend || []).map((t) => ({ ...t, day: String(t.day).length === 10 ? String(t.day).slice(5) : t.day }));
  const trendEmpty = !salesTrend.some((t) => Number(t.sales) || Number(t.purchases));
  const topMedicines = a.top_medicines || [];
  const paymentSplit = a.payment_split || [];
  const branchSales = a.branch_sales || [];
  const invoices = a.invoices || [];

  const emptyText = loading ? 'Loading…' : error || 'No data for this date range.';

  const handlePrint = () => {
    const period = `${startDate || 'Beginning'} to ${endDate || 'Today'}`;
    const trendRows = salesTrend.map((t) => `<tr><td>${esc(t.day)}</td><td>${money(t.sales)}</td><td>${money(t.purchases)}</td></tr>`).join('');
    const topRows = topMedicines.map((m) => `<tr><td>${esc(m.name)}</td><td>${num(m.qty)}</td><td>${num(m.units)}</td><td>${money(m.revenue)}</td></tr>`).join('');
    const payRows = paymentSplit.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.value}%</td><td>${money(p.total)}</td></tr>`).join('');
    const branchRows = branchSales.map((b) => `<tr><td>${esc(b.branch)}</td><td>${money(b.sales)}</td></tr>`).join('');
    const invoiceRows = invoices.slice(0, 40).map((x) =>
      `<tr><td>${esc(x.invoice)}</td><td>${esc(fmtDate(x.date))}</td><td>${esc(x.branch)}</td><td>${esc(x.payment)}</td><td>${money(x.total)}</td></tr>`
    ).join('');
    const co = getCompany();
    const contact = [co.phone ? `Ph: ${co.phone}` : '', co.ntn ? `NTN: ${co.ntn}` : '', co.email || '', co.website || ''].filter(Boolean);
    const letterhead = `<div class="lh">
    ${co.logo ? `<img src="${co.logo}" alt=""/>` : ''}
    ${co.name ? `<div class="lh-name">${esc(co.name)}</div>` : ''}
    ${co.address ? `<div class="lh-addr">${esc(co.address)}</div>` : ''}
    ${contact.length ? `<div class="lh-ct">${contact.map(esc).join(' &nbsp;|&nbsp; ')}</div>` : ''}
  </div>`;
    const none = (cols) => `<tr><td colspan="${cols}" style="color:#999">No data</td></tr>`;
    const html = `<!DOCTYPE html>
<html>
<head>
<title>Sales &amp; Purchase Report — ${esc(period)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2430; margin: 24px; font-size: 12px; }
  h1 { font-size: 20px; margin: 0; color: #4c1d95; }
  .sub { color: #666; font-size: 11px; margin: 2px 0 16px; }
  .stats { display: flex; gap: 12px; margin-bottom: 18px; }
  .stat { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
  .stat .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #777; }
  .stat .value { font-size: 16px; font-weight: 600; margin-top: 2px; }
  h2 { font-size: 13px; margin: 20px 0 6px; color: #4c1d95; border-bottom: 1px solid #eee; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { text-align: left; background: #f4f1fa; padding: 5px 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1px solid #ddd; }
  td { padding: 4px 6px; border-bottom: 1px solid #f0f0f0; }
  .footer { margin-top: 24px; color: #999; font-size: 10px; text-align: center; }
  .lh { text-align: center; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
  .lh img { display: block; margin: 0 auto; height: 58px; max-width: 180px; object-fit: contain; background: none; }
  .lh-name { font-size: 20px; font-weight: 800; letter-spacing: .04em; margin-top: 6px; color: #111; }
  .lh-addr { font-size: 11px; color: #333; margin-top: 2px; }
  .lh-ct { font-size: 10px; color: #555; margin-top: 2px; }
  @page { size: auto; margin: 0; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  ${letterhead}
  <h1>Sales &amp; Purchase Report</h1>
  <div class="sub">Period: <b>${esc(period)}</b> &nbsp;|&nbsp; Generated: ${esc(new Date().toLocaleString())}</div>

  <div class="stats">
    <div class="stat"><div class="label">Total Sales</div><div class="value">${money(totalSales)}</div></div>
    <div class="stat"><div class="label">Total Purchases</div><div class="value">${money(totalPurchases)}</div></div>
    <div class="stat"><div class="label">Gross Profit</div><div class="value">${money(grossProfit)}</div></div>
    <div class="stat"><div class="label">Invoices</div><div class="value">${invoiceCount}</div></div>
  </div>

  <h2>Sales vs Purchases</h2>
  <table><thead><tr><th>Period</th><th>Sales</th><th>Purchases</th></tr></thead><tbody>${trendRows || none(3)}</tbody></table>

  <h2>Top Selling Medicines</h2>
  <table><thead><tr><th>Medicine</th><th>Qty Sold</th><th>Units</th><th>Revenue</th></tr></thead><tbody>${topRows || none(4)}</tbody></table>

  <h2>Payment Method Split</h2>
  <table><thead><tr><th>Method</th><th>Share (%)</th><th>Amount</th></tr></thead><tbody>${payRows || none(3)}</tbody></table>

  <h2>Branch-wise Sales</h2>
  <table><thead><tr><th>Branch</th><th>Sales</th></tr></thead><tbody>${branchRows || none(2)}</tbody></table>

  <h2>Invoices in Period (latest 40)</h2>
  <table><thead><tr><th>Invoice</th><th>Date</th><th>Branch</th><th>Payment</th><th>Total</th></tr></thead><tbody>${invoiceRows || none(5)}</tbody></table>

  ${co.print_footer_note ? `<div class="footer">${esc(co.print_footer_note)}</div>` : ''}
</body>
</html>`;
    const win = window.open('', '_blank');
    if (!win) { toast.error('Popup blocked', 'Allow popups for this site to print'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in p-1">
        <PageHeader
          title="Reports & Analytics"
          actions={
            reportView === 'analytics' ? (
              <div className="flex flex-wrap items-center gap-1.5 animate-zoom-in">
                <DateRangeFilter from={startDate} to={endDate} onFromChange={setStartDate} onToChange={setEndDate} />
                {can('reports', 'print') && (
                  <button onClick={handlePrint} disabled={loading} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-sm text-white text-[14px] transition-all duration-200 disabled:opacity-50" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    <FaPrint size={12} /> Print
                  </button>
                )}
              </div>
            ) : null
          }
        />

        <div className="flex gap-1.5 mb-3 animate-fade-in-up" style={{ fontFamily: 'Poppins, sans-serif' }}>
          <button onClick={() => setReportView('analytics')} className={tabBtn('analytics')}>Analytics</button>
          <button onClick={() => setReportView('print')} className={tabBtn('print')}>Print Reports</button>
        </div>

        {reportView === 'print' && <PrintReportsPanel />}

        {reportView === 'analytics' && (<>
        {error && (
          <div className="mb-2 px-2 py-1 rounded-sm bg-red-500/20 text-red-400 text-[13px] animate-fade-in-up" style={{ fontFamily: 'Poppins, sans-serif' }}>{error}</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <StatMini title="Total Sales" value={money(totalSales)} icon={FaChartLine} color="green" delay={0.05} />
          <StatMini title="Total Purchases" value={money(totalPurchases)} icon={FaBoxes} color="blue" delay={0.1} />
          <StatMini title="Gross Profit" value={money(grossProfit)} icon={FaChartBar} color="purple" delay={0.15} />
          <StatMini title="Invoices" value={`${invoiceCount}`} icon={FaChartPie} color="amber" delay={0.2} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ChartCard title="Sales vs Purchases" icon={<FaChartLine size={12} />} delay={0.1} empty={loading || trendEmpty} emptyText={emptyText}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Poppins, sans-serif' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Poppins, sans-serif' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'Poppins, sans-serif' }} />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} fill="url(#salesGrad)" name="Sales (Rs.)" />
                <Area type="monotone" dataKey="purchases" stroke="#8b5cf6" strokeWidth={2} fill="url(#purchGrad)" name="Purchases (Rs.)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Selling Medicines" icon={<FaChartBar size={12} />} delay={0.15} empty={loading || topMedicines.length === 0} emptyText={emptyText}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMedicines} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" tickFormatter={(n) => String(n).split(' ')[0]} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Poppins, sans-serif' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Poppins, sans-serif' }} axisLine={false} tickLine={false} />
                <Tooltip content={<TopMedTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="qty" name="Qty Sold" radius={[4, 4, 0, 0]}>
                  {topMedicines.map((entry, index) => (
                    <Cell key={index} fill={index % 2 === 0 ? '#8b5cf6' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Payment Method Split (%)" icon={<FaChartPie size={12} />} delay={0.2} empty={loading || paymentSplit.length === 0} emptyText={emptyText}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {paymentSplit.map((entry, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="rgba(255,255,255,0.1)" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} formatter={(v, n, item) => [`${v}% (${money(item && item.payload ? item.payload.total : 0)})`, n]} />
                <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'Poppins, sans-serif' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Branch-wise Sales (Rs.)" icon={<FaChartBar size={12} />} delay={0.25} empty={loading || branchSales.length === 0} emptyText={emptyText}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchSales} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Poppins, sans-serif' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="branch" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Poppins, sans-serif' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="sales" name="Sales (Rs.)" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        </>)}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
