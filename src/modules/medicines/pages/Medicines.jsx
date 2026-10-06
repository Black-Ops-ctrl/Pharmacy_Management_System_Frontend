import { useState } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import CustomTabBar from '../components/CustomTabBar';
import MedicinesTab from './MedicinesTab';
import CategoriesTab from './CategoriesTab';
import UOMsTab from './UOMsTab';
import { useAuth } from '../../../context/AuthContext';

const Medicines = () => {
  const { can } = useAuth();
  const allowed = ['medicines', 'categories', 'uoms'].filter((k) => can(k, 'view'));
  const [selectedTab, setActiveTab] = useState(allowed[0] || 'medicines');
  const activeTab = allowed.includes(selectedTab) ? selectedTab : (allowed[0] || selectedTab);

  return (
    <DashboardLayout>
      <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in p-1">
        <CustomTabBar activeTab={activeTab} setActiveTab={setActiveTab} allowed={allowed} />

        {activeTab === 'medicines' && can('medicines', 'view') && <MedicinesTab />}
        {activeTab === 'categories' && can('categories', 'view') && <CategoriesTab />}
        {activeTab === 'uoms' && can('uoms', 'view') && <UOMsTab />}
      </div>
    </DashboardLayout>
  );
};

export default Medicines;
