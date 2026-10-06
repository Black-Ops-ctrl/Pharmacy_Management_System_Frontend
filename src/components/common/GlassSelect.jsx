import SearchableSelect from './SearchableSelect';

const GlassSelect = ({ value, onChange, options = [], width = 'sm:w-[140px] md:w-[160px]' }) => (
  <div className="relative w-full sm:w-auto">
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={String(value || '')}
      buttonClassName={`w-full ${width} bg-white/10 border border-white/40 rounded-sm px-2.5 py-2.5 text-white text-[13px] transition-all duration-300 hover:bg-white/15 focus-within:border-purple-400 min-h-[42px]`}
    />
  </div>
);

export default GlassSelect;
