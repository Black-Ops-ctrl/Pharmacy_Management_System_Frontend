import { createPortal } from 'react-dom';
import { FaTimes } from 'react-icons/fa';

const GlassModal = ({ title, icon, onClose, children, footer, maxWidth = 'max-w-xl' }) => {
  return createPortal(
    <div className="app-modal fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-fade-in">
      <div className={`bg-gradient-to-br from-[#3b1d5e] to-[#1a0b2e] border border-white/60 rounded-sm w-full ${maxWidth} max-h-[90vh] overflow-y-auto custom-scrollbar p-4 animate-zoom-in`}>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/40">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                {icon}
              </div>
            )}
            <h2 className="text-white text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/60 flex items-center justify-center transition-all"
          >
            <FaTimes size={12} />
          </button>
        </div>

        {children}

        {footer && (
          <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default GlassModal;
