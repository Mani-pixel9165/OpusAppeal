import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../../common/components/Button';
import FormField from '../../../common/components/FormField';
import { useAuth } from '../../../common/context/AuthContext';
import AuthFormHeader from '../components/AuthFormHeader';
import PasswordField from '../components/PasswordField';
import '../styles/auth.css';

export default function LoginPage() {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(useLocation().state?.message || '');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const updateField = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const result = await login(form);
      navigate(result.first_login_required ? '/update-password' : '/denials/pending');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="center-page">
      <form className="form-card" onSubmit={submit}>
        <AuthFormHeader title="Welcome back" subtitle="Sign in to continue managing pending denials." />
        <FormField label="Email or Username" name="identifier" value={form.identifier} onChange={updateField} />
        <PasswordField
          label="Password"
          name="password"
          value={form.password}
          onChange={updateField}
          visible={showPassword}
          onToggleVisibility={() => setShowPassword((value) => !value)}
        />
        {message ? <p className={`form-message ${message.includes('registered') ? 'success' : 'error'}`}>{message}</p> : null}
        <Button disabled={loading}>{loading ? 'Signing in...' : 'Login'}</Button>
      </form>
    </main>
  );
}
