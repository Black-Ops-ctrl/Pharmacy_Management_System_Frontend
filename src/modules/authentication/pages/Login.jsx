import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginLayout from '../layout/LoginLayout';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { ALL_PAGES } from '../../../config/permissions';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthed } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const target = (u) => {
    const can = (k) => u.role === 'Super Admin' || !!(u.permissions && u.permissions[k] && u.permissions[k].view);
    const from = location.state && location.state.from;
    const fromPage = from && ALL_PAGES.find((p) => p.route === from);
    if (fromPage && can(fromPage.key)) return from;
    const first = ALL_PAGES.find((p) => can(p.key));
    return first ? first.route : '/dashboard';
  };

  useEffect(() => { if (isAuthed && !success) navigate('/dashboard', { replace: true }); }, [isAuthed, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      toast.error('Login failed', 'Enter username and password.');
      return;
    }
    setIsLoading(true); setError('');
    const res = await login(formData.username, formData.password);
    if (!res.ok) {
      setError(res.error);
      toast.error('Login failed', res.error);
      setIsLoading(false);
      return;
    }
    setSuccess('Login successful — redirecting…');
    toast.success('Login successful', `Welcome, ${res.user.name}.`);
    navigate(target(res.user), { replace: true });
  };

  return (
    <LoginLayout>
      <LoginForm
        formData={formData}
        handleChange={handleChange}
        handleLogin={handleLogin}
        isLoading={isLoading}
        error={error}
        success={success}
      />
    </LoginLayout>
  );
};

export default Login;
