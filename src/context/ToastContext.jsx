import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { FaCheck, FaTimes, FaInfo, FaExclamationTriangle } from 'react-icons/fa';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext) || { success: () => {}, error: () => {}, info: () => {}, warn: () => {} };

let _id = 0;

const CONF = {
  success: { cls: 'border-emerald-400 bg-[#221d55]', ic: 'bg-emerald-500', Icon: FaCheck, title: 'text-white', desc: 'text-white/80', close: 'text-white/70 hover:text-white' },
  error: { cls: 'border-red-400 bg-[#221d55]', ic: 'bg-red-500', Icon: FaTimes, title: 'text-white', desc: 'text-white/80', close: 'text-white/70 hover:text-white' },
  info: { cls: 'border-blue-400 bg-[#221d55]', ic: 'bg-blue-500', Icon: FaInfo, title: 'text-white', desc: 'text-white/80', close: 'text-white/70 hover:text-white' },
  warn: { cls: 'border-amber-400 bg-[#221d55]', ic: 'bg-amber-500', Icon: FaExclamationTriangle, title: 'text-white', desc: 'text-white/80', close: 'text-white/70 hover:text-white' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((type, title, desc, ms) => {
    const id = ++_id;
    const life = ms || (type === 'error' ? 5000 : 3200);
    setToasts((t) => (t.some((x) => x.type === type && x.title === title && x.desc === desc) ? t : [...t.slice(-5), { id, type, title, desc }]));
    setTimeout(() => remove(id), life);
  }, [remove]);

  const api = useMemo(() => ({
    success: (title, desc, ms) => push('success', title, desc, ms),
    error: (title, desc, ms) => push('error', title, desc, ms),
    info: (title, desc, ms) => push('info', title, desc, ms),
    warn: (title, desc, ms) => push('warn', title, desc, ms),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-[300px] max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((t) => {
          const c = CONF[t.type] || CONF.info;
          const Icon = c.Icon;
          return (
            <div key={t.id} className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg border ${c.cls} shadow-xl shadow-black/30 animate-slide-in-right`} style={{ fontFamily: 'Poppins, sans-serif' }}>
              <span className={`w-5 h-5 rounded-full ${c.ic} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <Icon size={10} className="text-white" />
              </span>
              <div className="flex-1 min-w-0">
                <div className={`${c.title} text-[14px] font-semibold leading-tight`}>{t.title}</div>
                {t.desc && <div className={`${c.desc} text-[13px] mt-0.5 leading-snug`}>{t.desc}</div>}
              </div>
              <button onClick={() => remove(t.id)} className={`${c.close} text-[13px] flex-shrink-0`} aria-label="Dismiss">
                <FaTimes size={11} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
