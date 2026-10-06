import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAuth } from '../../../context/AuthContext';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  return (
    <div className="min-h-screen w-full flex overflow-x-hidden">
      <div
        className="fixed inset-0 z-0 app-theme-bg"
      />

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 relative z-10 flex flex-col min-h-screen transition-all duration-300 ease-in-out lg:ml-60">
        <Header setSidebarOpen={setSidebarOpen} onLogout={handleLogout} />
        <main className="flex-1 min-w-0 overflow-x-hidden p-2 md:p-4 mt-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
