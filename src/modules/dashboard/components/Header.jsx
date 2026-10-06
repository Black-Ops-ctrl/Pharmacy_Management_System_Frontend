import { FaBars } from 'react-icons/fa';
import { useCompany } from '../../../context/CompanyContext';
import { topBarText } from '../../../config/company';

const Header = ({ setSidebarOpen }) => {
  const { company } = useCompany();

  return (
    <header className="sticky top-0 z-20 bg-white/5 backdrop-blur-lg backdrop-filter border-b border-white/40 px-4 sm:px-6 py-3 sm:py-4 animate-fade-in-down">
      <div className="flex items-center justify-between">
        
        <div className="flex items-center flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/60 hover:text-white lg:hidden transition-colors flex-shrink-0 animate-zoom-in delay-300"
          >
            <FaBars size={20} />
          </button>
        </div>
        
        <div className="flex-1 flex items-center justify-center min-w-0 px-2">
          <h2 
            className="text-white text-md sm:text-md md:text-lg truncate text-center animate-fade-in delay-200" 
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {topBarText(company)}
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0"></div>
      </div>
    </header>
  );
};

export default Header;