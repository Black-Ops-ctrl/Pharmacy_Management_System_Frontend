import { useAuth } from '../../context/AuthContext';

const SessionTimeoutModal = () => {
  const { isAuthed, warnLeft, extendSession, logout } = useAuth();
  if (!isAuthed || !warnLeft) return null;
  const mm = String(Math.floor(warnLeft / 60)).padStart(2, '0');
  const ss = String(warnLeft % 60).padStart(2, '0');
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="bg-gradient-to-br from-[#2a1450] to-[#160726] border border-white/18 rounded-2xl p-6 max-w-sm w-full text-center animate-zoom-in shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-amber-500/18 border-2 border-amber-500 flex items-center justify-center text-2xl mx-auto mb-3">⏳</div>
        <h3 className="text-white text-base font-semibold mb-1">Session about to expire</h3>
        <p className="text-white/60 text-[14.5px]">You have been inactive.</p>
        <p className="text-white/60 text-[14.5px]">Auto logout in</p>
        <div className="text-amber-400 text-3xl font-extrabold my-3">{mm}:{ss}</div>
        <div className="flex gap-2.5">
          <button onClick={extendSession} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-[14.5px] font-semibold transition-all">Stay logged in</button>
          <button onClick={logout} className="flex-1 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/25 text-white text-[14.5px] font-semibold transition-all">Logout now</button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutModal;
