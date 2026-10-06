import { FaSearch } from 'react-icons/fa';
import GlassSelect from '../../../components/common/GlassSelect';

const FilterBar = ({
  searchTerm, setSearchTerm,
  selectedCategory, setSelectedCategory,
  selectedUom, setSelectedUom,
  categoryOptions = [], uomOptions = [],
}) => (
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
    <div className="relative w-full sm:flex-1 animate-fade-in-up delay-100 z-10">
      <input
        type="text"
        placeholder="Search medicine"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full bg-white/10 border border-white/40 rounded-full pl-8 pr-3 py-2.5 text-white placeholder-white/70 text-[13px] focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300 hover:bg-white/15 min-h-[42px]"
        style={{ fontFamily: 'Poppins, sans-serif' }}
      />
      <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 text-xs transition-all duration-300 hover:text-white/60" />
    </div>
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto animate-fade-in-up delay-300 relative z-10">
      <GlassSelect value={selectedCategory} onChange={setSelectedCategory} options={['All Categories', ...categoryOptions]} />
      <GlassSelect value={selectedUom} onChange={setSelectedUom} options={['All UOM', ...uomOptions]} />
    </div>
  </div>
);

export default FilterBar;
