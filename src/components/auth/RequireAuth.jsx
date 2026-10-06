import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTE_PAGES, ALL_PAGES } from '../../config/permissions';

const RequireAuth = ({ children }) => {
  const { ready, isAuthed, can } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center bg-[#1a0b2e] text-white/70 text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>Loading…</div>;
  }
  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  const keys = ROUTE_PAGES[location.pathname];
  if (keys && keys.length && !keys.some((k) => can(k, 'view'))) {
    const first = ALL_PAGES.find((p) => can(p.key, 'view'));
    if (first && first.route !== location.pathname) return <Navigate to={first.route} replace />;
    return <div className="min-h-screen flex items-center justify-center bg-[#1a0b2e] text-white/70 text-sm">You do not have access to any page. Contact your administrator.</div>;
  }
  return children;
};

export default RequireAuth;
