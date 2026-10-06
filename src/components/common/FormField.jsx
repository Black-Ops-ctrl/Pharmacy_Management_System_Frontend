import SearchableSelect from './SearchableSelect';

export const FormInput = ({ label, required, ...props }) => (
  <div>
    <label className="text-white text-[13px] mb-0.5 block" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {label} {required && '*'}
    </label>
    <input
      {...props}
      className={`w-full bg-white/5 border border-white/70 rounded-sm px-2.5 py-1.5 text-white text-[12px] focus:outline-none focus:border-purple-400 focus:ring-purple-400 ${props.readOnly ? 'opacity-80 cursor-default border-white/40' : ''}`}
      style={{ fontFamily: 'Poppins, sans-serif' }}
    />
  </div>
);

export const FormSelect = ({ label, required, options, value, onChange, placeholder }) => (
  <div>
    <label className="text-white text-[13px] mb-0.5 block" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {label} {required && '*'}
    </label>
    <SearchableSelect
      value={value}
      options={options}
      placeholder={placeholder || 'Select...'}
      onChange={(val) => onChange && onChange({ target: { value: val } })}
    />
  </div>
);

export const FormTextarea = ({ label, required, ...props }) => (
  <div>
    <label className="text-white text-[13px] mb-0.5 block" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {label} {required && '*'}
    </label>
    <textarea
      {...props}
      rows={props.rows || 2}
      className="w-full bg-white/5 border border-white/70 rounded-sm px-2.5 py-1.5 text-white text-[12px] focus:outline-none focus:border-purple-400 focus:ring-purple-400 resize-none"
      style={{ fontFamily: 'Poppins, sans-serif' }}
    />
  </div>
);
