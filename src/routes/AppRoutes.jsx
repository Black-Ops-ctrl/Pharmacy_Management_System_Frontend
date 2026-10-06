import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../modules/authentication/pages/Login';
import Dashboard from '../modules/dashboard/pages/Dashboard';
import POS from '../modules/pos/pages/POS';
import Medicines from '../modules/medicines/pages/Medicines';
import Inventory from '../modules/inventory/pages/Inventory';
import Suppliers from '../modules/suppliers/pages/Suppliers';
import Purchasing from '../modules/purchasing/pages/Purchasing';
import SaleInvoices from '../modules/sales/pages/SaleInvoices';
import Patients from '../modules/patients/pages/Patients';
import Prescriptions from '../modules/patients/pages/Prescriptions';
import Credit from '../modules/patients/pages/Credit';
import Finance from '../modules/business/pages/Finance';
import Cities from '../modules/business/pages/Cities';
import Branches from '../modules/business/pages/Branches';
import Employees from '../modules/business/pages/Employees';
import Reports from '../modules/insights/pages/Reports';
import OnlineOrders from '../modules/insights/pages/OnlineOrders';
import Admin from '../modules/system/pages/Admin';
import CompanyProfile from '../modules/system/pages/CompanyProfile';
import DatabaseBackup from '../modules/system/pages/DatabaseBackup';
import RequireAuth from '../components/auth/RequireAuth';

const P = (el) => <RequireAuth>{el}</RequireAuth>;

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={P(<Dashboard />)} />
      <Route path="/pos" element={P(<POS />)} />
      <Route path="/medicines" element={P(<Medicines />)} />
      <Route path="/inventory" element={P(<Inventory />)} />
      <Route path="/suppliers" element={P(<Suppliers />)} />
      <Route path="/purchasing" element={P(<Purchasing />)} />
      <Route path="/sale-invoices" element={P(<SaleInvoices />)} />
      <Route path="/patients" element={P(<Patients />)} />
      <Route path="/prescriptions" element={P(<Prescriptions />)} />
      <Route path="/credit" element={P(<Credit />)} />
      <Route path="/finance" element={P(<Finance />)} />
      <Route path="/cities" element={P(<Cities />)} />
      <Route path="/branches" element={P(<Branches />)} />
      <Route path="/employees" element={P(<Employees />)} />
      <Route path="/reports" element={P(<Reports />)} />
      <Route path="/online-orders" element={P(<OnlineOrders />)} />
      <Route path="/company-profile" element={P(<CompanyProfile />)} />
      <Route path="/admin" element={P(<Admin />)} />
      <Route path="/database-backup" element={P(<DatabaseBackup />)} />
      <Route path="/" element={P(<Navigate to="/dashboard" replace />)} />
      <Route path="*" element={P(<Navigate to="/dashboard" replace />)} />
    </Routes>
  );
};

export default AppRoutes;
