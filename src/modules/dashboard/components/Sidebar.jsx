import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaHome, 
  FaShoppingCart, 
  FaBoxes, 
  FaPills, 
  FaClipboardList,
  FaTruck, 
  FaUsers, 
  FaUserMd,
  FaFilePrescription,
  FaMoneyBillWave,
  FaChartLine, 
  FaCity,
  FaStore,
  FaUserTie,
  FaLightbulb,
  FaFileAlt,
  FaShoppingBag,
  FaCog,
  FaUserShield,
  FaBuilding,
  FaDatabase,
  FaChevronDown,
  FaChevronRight,
  FaSignOutAlt,
  FaFileInvoice,
  FaHandshake,
} from 'react-icons/fa';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { ROUTE_PAGES } from '../../../config/permissions';

const Sidebar = ({ sidebarOpen, setSidebarOpen, onLogout }) => {
  const navigate = useNavigate();
  const { can, user } = useAuth();
  const { company } = useCompany();
  const canRoute = (path) => { const ks = ROUTE_PAGES[path]; return !ks ? true : ks.some((k) => can(k, 'view')); };
  const here = window.location.pathname;
  const moduleOf = {
    '/medicines': 'catalog', '/inventory': 'catalog', '/purchasing': 'buying', '/suppliers': 'buying',
    '/patients': 'patients', '/prescriptions': 'patients', '/credit': 'patients',
    '/finance': 'business', '/branches': 'business', '/cities': 'business', '/employees': 'business',
    '/reports': 'insights', '/online-orders': 'insights', '/admin': 'system', '/company-profile': 'system', '/database-backup': 'system',
  };
  const [expandedModules, setExpandedModules] = useState({
    catalog: false,
    buying: false,
    patients: false,
    business: false,
    insights: false,
    system: false,
    ...(moduleOf[here] ? { [moduleOf[here]]: true } : {}),
  });

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const toggleModule = (module) => {
    setExpandedModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    {
      type: 'single',
      icon: FaHome,
      label: 'Overview',
      path: '/dashboard',
      active: window.location.pathname === '/dashboard'
    },
    {
      type: 'single',
      icon: FaShoppingCart,
      label: 'POS / Billing',
      path: '/pos',
      active: window.location.pathname === '/pos'
    },
    {
      type: 'single',
      icon: FaFileInvoice,
      label: 'Sale Invoices',
      path: '/sale-invoices',
      active: window.location.pathname === '/sale-invoices'
    },
    {
      type: 'module',
      icon: FaBoxes,
      label: 'Catalog & Stock',
      key: 'catalog',
      subItems: [
        { icon: FaPills, label: 'Medicines', path: '/medicines' },
        { icon: FaClipboardList, label: 'Inventory', path: '/inventory' }
      ]
    },
    {
      type: 'module',
      icon: FaTruck,
      label: 'Buying',
      key: 'buying',
      subItems: [
        { icon: FaShoppingCart, label: 'Purchasing', path: '/purchasing' },
        { icon: FaHandshake, label: 'Suppliers', path: '/suppliers' }
      ]
    },
    {
      type: 'module',
      icon: FaUsers,
      label: 'Patients',
      key: 'patients',
      subItems: [
        { icon: FaUserMd, label: 'Patients', path: '/patients' },
        { icon: FaFilePrescription, label: 'Prescriptions', path: '/prescriptions' },
        { icon: FaFileInvoice, label: 'Credit', path: '/credit' }
      ]
    },
    {
      type: 'module',
      icon: FaChartLine,
      label: 'Business',
      key: 'business',
      subItems: [
        { icon: FaMoneyBillWave, label: 'Finance', path: '/finance' },
        { icon: FaStore, label: 'Branches', path: '/branches' },
        { icon: FaCity, label: 'Cities', path: '/cities' },
        { icon: FaUserTie, label: 'Employees', path: '/employees' }
      ]
    },
    {
      type: 'module',
      icon: FaLightbulb,
      label: 'Insights',
      key: 'insights',
      subItems: [
        { icon: FaFileAlt, label: 'Reports', path: '/reports' },
        { icon: FaShoppingBag, label: 'Online Orders', path: '/online-orders' }
      ]
    },
    {
      type: 'module',
      icon: FaCog,
      label: 'System',
      key: 'system',
      subItems: [
        { icon: FaBuilding, label: 'Pharmacy Settings', path: '/company-profile' },
        { icon: FaUserShield, label: 'Admin', path: '/admin' },
        { icon: FaDatabase, label: 'Database Backup', path: '/database-backup' }
      ]
    }
  ];

  const visibleItems = menuItems
    .map((item) => {
      if (item.type === 'single') return canRoute(item.path) ? item : null;
      const subs = item.subItems.filter((s) => canRoute(s.path));
      return subs.length ? { ...item, subItems: subs } : null;
    })
    .filter(Boolean);

  return (
    <>
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <div className={`fixed top-0 left-0 z-50 w-72 lg:w-60 h-screen bg-white/10 backdrop-blur-lg backdrop-filter border-r border-white/40 transition-transform duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        <div className="flex-shrink-0 border-b border-white/40 py-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col items-center justify-center px-3">
            {company.logo && (
              <img
                src={company.logo}
                alt={company.name || 'Logo'}
                className="block max-w-full w-auto h-12 sm:h-14 md:h-16 lg:h-20 object-contain animate-zoom-in"
                style={{ animationDelay: '0.2s', background: 'none' }}
              />
            )}

            {company.name && (
              <h1 className="text-white mb-1 sm:mb-2 mt-1 text-[12px] sm:text-xs md:text-sm text-center truncate w-full animate-fade-in" style={{ fontFamily: 'poppins, sans-serif', animationDelay: '0.3s' }}>
                {company.name}
              </h1>
            )}
          </div>
        </div>

        <div 
          className={`flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 sm:px-3 transition-all duration-300 ${
            isProfileOpen ? 'blur-[2px] pointer-events-none' : ''
          }`}
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none' 
          }}
        >
          <style>
            {`
              .flex-1::-webkit-scrollbar,
              .flex-1 *::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                background: transparent !important;
              }
              .flex-1 * {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
              }
            `}
          </style>
          <nav className="space-y-0.5">
            {visibleItems.map((item, index) => {
              const delay = 0.1 + (index * 0.05);
              
              if (item.type === 'single') {
                return (
                  <button
                    key={index}
                    onClick={() => handleNavigation(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-sm
                      transition-all duration-200 text-sm animate-slide-in
                      ${item.active 
                        ? 'bg-white/20 text-white shadow-lg shadow-purple-500/10' 
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                      }
                    `}
                    style={{ 
                      fontFamily: 'Poppins, sans-serif',
                      animationDelay: `${delay}s`
                    }}
                  >
                    <item.icon className={`text-sm sm:text-base flex-shrink-0 ${item.active ? 'text-purple-300' : ''}`} />
                    <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                    {item.active && (
                      <span className="ml-auto w-1 h-5 sm:w-1.5 sm:h-6 bg-gradient-to-b from-purple-400 to-indigo-500 rounded-full flex-shrink-0"></span>
                    )}
                  </button>
                );
              }

              if (item.type === 'module') {
                const isExpanded = expandedModules[item.key];
                return (
                  <div key={index} className="space-y-0.5 animate-slide-in" style={{ animationDelay: `${delay}s` }}>
                    <button
                      onClick={() => toggleModule(item.key)}
                      className={`
                        w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg
                        transition-all duration-200 text-sm
                        text-white/60 hover:text-white hover:bg-white/10
                      `}
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      <item.icon className="text-sm sm:text-base flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium truncate flex-1 text-left">{item.label}</span>
                      {isExpanded ? (
                        <FaChevronDown className="text-[12px] sm:text-xs flex-shrink-0 transition-transform duration-200" />
                      ) : (
                        <FaChevronRight className="text-[12px] sm:text-xs flex-shrink-0 transition-transform duration-200" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="ml-6 sm:ml-8 space-y-0.5 border-l border-white/10 pl-2 sm:pl-3">
                        {item.subItems.map((subItem, subIndex) => (
                          <button
                            key={subIndex}
                            onClick={() => handleNavigation(subItem.path)}
                            className={`
                              w-full flex items-center gap-3 px-3 py-1.5 sm:py-2 rounded-lg
                              transition-all duration-200 text-sm animate-fade-in-left
                              ${here === subItem.path ? 'text-white bg-white/15' : 'text-white/50 hover:text-white hover:bg-white/5'}
                            `}
                            style={{ 
                              fontFamily: 'Poppins, sans-serif',
                              animationDelay: `${delay + 0.1 + (subIndex * 0.05)}s`
                            }}
                          >
                            <subItem.icon className="text-[12px] sm:text-xs flex-shrink-0" />
                            <span className="text-[12px] sm:text-xs truncate">{subItem.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </nav>
        </div>

        <div className="flex-shrink-0 p-3 sm:p-4 border-t border-white/10 bg-white/5 relative animate-fade-in-up" style={{ animationDelay: '0.5s' }} ref={profileRef}>
          <button
            onClick={toggleProfile}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-sm bg-white/10 hover:bg-white/20 transition-all duration-200"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-white text-[12px] sm:text-xs truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {user?.name || 'User'}
              </p>
              <p className="text-white/40 text-[12px] sm:text-xs truncate">{user?.role || ''}</p>
            </div>
            <FaChevronDown className={`text-white/40 text-[12px] sm:text-xs transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 mx-2 bg-white/10 backdrop-blur-lg backdrop-filter rounded-sm border border-white/40 py-1 overflow-hidden z-20 animate-bounce-in">
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2 sm:py-2.5 text-red-400 hover:bg-red-500/10 transition-colors text-xs sm:text-sm" 
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                <FaSignOutAlt className="text-red-400 text-sm sm:text-base" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;