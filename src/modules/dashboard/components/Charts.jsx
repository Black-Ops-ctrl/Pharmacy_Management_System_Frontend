import { money } from '../../../utils/format';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Empty = ({ text }) => (
  <div className="h-full flex items-center justify-center text-white/40 text-[12px] sm:text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>
    {text}
  </div>
);

const PAYMENT_LABELS = { Digital: 'Digital Payment' };
const PAYMENT_COLORS = ['from-blue-500 to-blue-600', 'from-purple-500 to-purple-600', 'from-green-500 to-green-600', 'from-orange-500 to-orange-600', 'from-pink-500 to-pink-600'];

const shortDay = (d) => {
  const dt = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const TopMedicines = ({ medicines = [], loading = false }) => {
  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-sm p-3 sm:p-4 border border-white/40 h-64 w-full overflow-hidden flex flex-col animate-slide-in-right animate-fade-in-up delay-100">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-white text-[12px] sm:text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Top Selling Medicines <span className="text-white/50 text-[11px] sm:text-[12px]">(last 30 days)</span>
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2.5">
        {loading && <Empty text="Loading…" />}
        {!loading && medicines.length === 0 && <Empty text="No sales in the last 30 days" />}
        {!loading && medicines.map((medicine, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-white text-[11px] sm:text-[12px] font-medium">{index + 1}</span>
                <span className="text-white text-[12px] sm:text-[14px] truncate max-w-[150px] sm:max-w-[150px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {medicine.name}
                </span>
              </div>
              <span className="text-white text-[11px] sm:text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {money(medicine.revenue)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, Number(medicine.percentage) || 0))}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SalesTrend = ({ trend = [], loading = false }) => {
  const data = trend.map((t) => ({ day: shortDay(t.day), value: Number(t.total) || 0 }));
  const hasSales = data.some((d) => d.value > 0);

  const lineColor = '#8b57ec';
  const gradId = 'sales-trend-gradient';

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-sm p-3 sm:p-4 border border-white/40 h-64 w-full overflow-hidden flex flex-col animate-slide-in-right animate-fade-in-up delay-200">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-white text-[12px] sm:text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Sales Trend
        </h3>
      </div>
      
      <div className="flex-1 w-full">
        {loading ? <Empty text="Loading…" /> : !hasSales ? <Empty text="No sales in the last 7 days" /> : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 16 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: 'rgb(255, 255, 255)' }}
              axisLine={false} tickLine={false} padding={{ left: 20, right: 20 }} tickMargin={6} interval={0}
            />
            <YAxis hide />
            <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <Tooltip
              contentStyle={{
                background: '#ffffff', border: '1px solid #af90f5',
                borderRadius: 6, fontSize: 12, color: '#ffffff', fontFamily: 'poppins, sans-serif',
              }}
              labelStyle={{ color: '#000000', fontSize: 11 }}
              formatter={(value) => [money(value), 'Sales']}
              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
            />
            <Area
              type="monotone" dataKey="value" name="Sales" stroke={lineColor} strokeWidth={2.5}
              fill={`url(#${gradId})`} dot={{ fill: lineColor, r: 3.5 }} animationDuration={1000} baseValue={0}
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>    
    </div>
  );
};

export const PaymentAndExpiry = ({ paymentMethods: methods = [], expiry = null, loading = false }) => {
  const expiryData = [
    { label: 'Expired', value: expiry?.expired ?? 0, color: 'bg-red-500' },
    { label: '≤ 30 days', value: expiry?.within_30 ?? 0, color: 'bg-yellow-500' },
    { label: '≤ 90 days', value: expiry?.within_90 ?? 0, color: 'bg-orange-500' },
    { label: 'Healthy', value: expiry?.healthy ?? 0, color: 'bg-green-500' },
  ];

  const paymentMethods = methods.map((m, i) => ({
    label: PAYMENT_LABELS[m.method] || m.method,
    percentage: Math.round((Number(m.percentage) || 0) * 10) / 10,
    total: m.total,
    color: PAYMENT_COLORS[i % PAYMENT_COLORS.length],
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 animate-zoom-in animate-fade-in delay-300">
      <div className="bg-white/5 backdrop-blur-lg rounded-sm p-3 sm:p-4 border border-white/40 min-h-52">
        <h3 className="text-white text-[12px] sm:text-sm mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Payment Methods
        </h3>
        <div className="space-y-2.5 pr-1">
          {loading && <p className="text-white/40 text-[12px]">Loading…</p>}
          {!loading && paymentMethods.length === 0 && <p className="text-white/40 text-[12px] sm:text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>No sales in the last 30 days</p>}
          {!loading && paymentMethods.map((method, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-white text-[11px] sm:text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {method.label}
                </span>
                <span className="text-white text-[11px] sm:text-[12px]" title={money(method.total)}>{method.percentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${method.color} rounded-full transition-all duration-500`}
                  style={{ width: `${method.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-lg rounded-sm p-3 sm:p-4 border border-white/40 min-h-52">
        <h3 className="text-white text-[12px] sm:text-sm mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Expiry Distribution
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {expiryData.map((item, index) => (
            <div 
              key={index} 
              className={`bg-white/5 rounded-sm p-2 sm:p-3 text-center animate-fade-in-up delay-${(index + 1) * 100}`}
            >
              <div className={`w-full h-1.5 ${item.color} rounded-full mb-1.5`} />
              <span className="text-white/40 text-[10px] sm:text-[11px] block">{item.label}</span>
              <span className="text-white text-[12px] sm:text-sm font-medium">{loading ? '…' : item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const TopMedicinesAndSalesTrend = ({ topMedicines = [], salesTrend = [], loading = false }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
      <TopMedicines medicines={topMedicines} loading={loading} />
      <SalesTrend trend={salesTrend} loading={loading} />
    </div>
  );
};