import { FaSearch } from 'react-icons/fa';

const SearchInput = ({ value, onChange, placeholder }) => {
  return (
    <div className="relative w-full sm:flex-1 animate-fade-in-up delay-100 z-10">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/10 border border-white/40 rounded-full pl-8 pr-3 py-2.5 text-white placeholder-white/70 text-[13px] focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300 hover:bg-white/15 min-h-[42px]"
        style={{ fontFamily: 'Poppins, sans-serif' }}
      />
      <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 text-xs transition-all duration-300 hover:text-white/60" />
    </div>
  );
};

export default SearchInput;
