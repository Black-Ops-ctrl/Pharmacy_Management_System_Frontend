import { useState, useRef, useEffect, useMemo } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import AnchoredDropdown from './AnchoredDropdown';

const norm = (o) => (o && typeof o === 'object' ? { value: o.value, label: o.label ?? String(o.value) } : { value: o, label: String(o) });

const SearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select',
  disabled = false,
  emptyText = 'No matches',
  buttonClassName = 'w-full bg-white/5 border border-white/70 rounded-sm px-2.5 py-1.5 text-white text-[12px] focus-within:border-purple-400',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typed, setTyped] = useState(false);
  const [hi, setHi] = useState(0);
  const anchorRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const list = useMemo(() => options.map(norm), [options]);
  const current = list.find((o) => String(o.value) === String(value ?? ''));
  const shown = useMemo(() => {
    const q = typed ? query.trim().toLowerCase() : '';
    return q ? list.filter((o) => o.label.toLowerCase().includes(q)) : list;
  }, [list, query, typed]);

  const close = () => { setOpen(false); setTyped(false); setQuery(''); };
  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setHi(Math.max(0, list.findIndex((o) => o === current)));
  };
  const pick = (o) => { if (onChange) onChange(o.value); close(); };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[hi];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [hi, open]);

  const onKey = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(shown.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[hi]) pick(shown[hi]); }
    else if (e.key === 'Tab') close();
  };

  return (
    <>
      <div
        ref={anchorRef}
        className={`${buttonClassName} lov-box flex items-center justify-between gap-1 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text'}`}
        onMouseDown={(e) => {
          if (disabled) return;
          if (e.target !== inputRef.current) e.preventDefault();
          if (inputRef.current) inputRef.current.focus();
          if (open && e.target !== inputRef.current) close();
          else if (!open) openList();
        }}
        style={{ fontFamily: 'Poppins, sans-serif' }}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-label={placeholder}
          autoComplete="off"
          disabled={disabled}
          value={open ? (typed ? query : '') : current ? current.label : ''}
          placeholder={current ? current.label : placeholder}
          onChange={(e) => { setQuery(e.target.value); setTyped(true); setHi(0); if (!open) setOpen(true); }}
          onFocus={(e) => e.target.select()}
          onKeyDown={onKey}
          className="flex-1 min-w-0 bg-transparent border-0 p-0 m-0 outline-none placeholder-white/40 truncate"
          style={{ fontSize: 'inherit', fontFamily: 'inherit', color: 'inherit' }}
        />
        <FaChevronDown className={`text-white/40 text-[11px] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      <AnchoredDropdown anchorRef={anchorRef} open={open} onClose={close}>
        <div className="bg-[#2a1b3e] border border-white/40 rounded-sm shadow-xl shadow-purple-500/20 overflow-hidden animate-fade-in">
          <div ref={listRef} className="max-h-[186px] overflow-y-auto custom-scrollbar" role="listbox">
            {shown.length === 0 ? (
              <div className="px-3 py-2 text-white/40 text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{emptyText}</div>
            ) : (
              shown.map((opt, i) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={String(value) === String(opt.value)}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => pick(opt)}
                  className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${
                    String(value) === String(opt.value) ? 'text-white bg-purple-500/20' : i === hi ? 'text-white bg-white/10' : 'text-white/70'
                  }`}
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      </AnchoredDropdown>
    </>
  );
};

export default SearchableSelect;
