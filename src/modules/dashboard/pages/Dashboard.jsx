import { useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import StatCard from '../components/StatCard';
import { TopMedicinesAndSalesTrend, PaymentAndExpiry } from '../components/Charts';
import useApi from '../../../hooks/useApi';
import { money } from '../../../utils/format';
import salesIcon from '../../../assets/icons/sales.png';
import profitIcon from '../../../assets/icons/profit.png';
import lowStockIcon from '../../../assets/icons/low_stock.png';
import outOfStockIcon from '../../../assets/icons/out_of_stock.png';
import pendingIcon from '../../../assets/icons/pending.png';
import expiredIcon from '../../../assets/icons/expired.png';
import calendarIcon from '../../../assets/icons/calendar.png';
import onlineOrderIcon from '../../../assets/icons/online_order.png';

const REFRESH_MS = 60000;

const count = (n, one, many) => `${Number(n) || 0} ${(Number(n) || 0) === 1 ? one : many}`;

const Dashboard = () => {
  const { data, loading, error, reload } = useApi('/reports/dashboard', null, { initial: null });

  useEffect(() => {
    const t = setInterval(() => reload(), REFRESH_MS);
    return () => clearInterval(t);
  }, [reload]);

  const s = data?.stats || {};
  const show = (fn) => (!data ? (loading ? '…' : '—') : fn());

  const allStats = [
    { title: "Today's Sales", value: show(() => money(s.today_sales)), icon: salesIcon, color: 'transparent' },
    { title: "Today's Profit", value: show(() => money(s.today_profit)), icon: profitIcon, color: 'transparent' },
    { title: 'Low Stock Items', value: show(() => count(s.low_stock, 'item', 'items')), icon: lowStockIcon, color: 'transparent' },
    { title: 'Out of Stock Items', value: show(() => count(s.out_of_stock, 'item', 'items')), icon: outOfStockIcon, color: 'transparent' },
    { title: 'Pending Purchase Orders', value: show(() => count(s.pending_pos, 'order', 'orders')), icon: pendingIcon, color: 'transparent' },
    { title: 'Expired Medicines', value: show(() => count(s.expired, 'batch', 'batches')), icon: expiredIcon, color: 'transparent' },
    { title: 'Expiring (≤ 30 days)', value: show(() => count(s.expiring_30, 'batch', 'batches')), icon: calendarIcon, color: 'transparent' },
    { title: 'Today Online Orders', value: show(() => count(s.today_online_orders, 'order', 'orders')), icon: onlineOrderIcon, color: 'transparent' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-2 sm:space-y-3 md:space-y-4">
        {error && !data && (
          <p className="text-red-400 text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>{error}</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2 md:gap-3">
          {allStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
        <TopMedicinesAndSalesTrend
          topMedicines={data?.top_medicines || []}
          salesTrend={data?.sales_trend || []}
          loading={loading && !data}
        />
        <PaymentAndExpiry
          paymentMethods={data?.payment_methods || []}
          expiry={data?.expiry || null}
          loading={loading && !data}
        />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
