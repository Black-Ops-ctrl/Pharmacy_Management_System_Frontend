import { FaPills, FaTags, FaRuler } from 'react-icons/fa';

const CustomTabBar = ({ activeTab, setActiveTab, allowed }) => {
  const tabs = [
    { id: 'medicines', label: 'Medicines', icon: <FaPills size={12} /> },
    { id: 'categories', label: 'Categories', icon: <FaTags size={12} /> },
    { id: 'uoms', label: 'UOMs', icon: <FaRuler size={12} /> },
  ].filter((t) => !allowed || allowed.includes(t.id));

  return (
    <div className="tab-scroll flex flex-nowrap items-center justify-start gap-1 sm:gap-1.5 md:gap-2 mb-3 sm:mb-4 p-1 bg-transparent rounded-full border border-white/40 overflow-x-auto max-w-full">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`
            relative flex items-center gap-1 sm:gap-1.5 md:gap-2 
            px-3 sm:px-4 md:px-5 
            py-1 sm:py-1 md:py-1.5
            rounded-full text-[12px] sm:text-[13px] md:text-[14px] 
            transition-all duration-300 ease-in-out whitespace-nowrap
            ${activeTab === tab.id 
              ? 'bg-gradient-to-r from-purple-500 via-purple-700 to-indigo-700 text-white border border-white/40' 
              : 'text-white hover:bg-white/20'
            }
          `} style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          <span className={`transition-all duration-300 ${activeTab === tab.id ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]' : 'text-white'}`}>
            {tab.icon}
          </span>
          
          <span className="tracking-wide inline">{tab.label}</span>
          
          {activeTab === tab.id && (
            <>
              <span className="absolute -z-10 inset-0 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 blur-xl" />
              <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-purple-400/10 via-white/5 to-indigo-400/10 blur-sm -z-10" />
            </>
          )}
        </button>
      ))}
    </div>
  );
};

export default CustomTabBar;