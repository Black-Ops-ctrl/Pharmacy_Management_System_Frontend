import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from './AuthContext';
import { getCompany, setCompany, setBranches } from '../config/company';

const CompanyContext = createContext({ company: getCompany(), loaded: false, reload: () => {}, apply: () => {} });

const TITLE = 'Pharmacy Management System';

export const CompanyProvider = ({ children }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [company, setState] = useState(getCompany);
  const [loaded, setLoaded] = useState(false);

  const apply = useCallback((p) => {
    setCompany(p);
    setState(getCompany());
  }, []);

  const reload = useCallback(async () => {
    try { apply(await api.get('/company')); } catch { }
    setLoaded(true);
  }, [apply]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!user) { setBranches([]); return; }
    api.get('/lov/branches', { all: 1 }).then(setBranches).catch(() => {});
  }, [user, pathname]);

  useEffect(() => {
    document.title = company.name ? `${company.name} — ${TITLE}` : TITLE;
  }, [company.name]);

  return <CompanyContext.Provider value={{ company, loaded, reload, apply }}>{children}</CompanyContext.Provider>;
};

export const useCompany = () => useContext(CompanyContext);
