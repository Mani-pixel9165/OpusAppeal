import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../common/components/Button';
import FormField from '../../../common/components/FormField';
import { useAuth } from '../../../common/context/AuthContext';
import { authService } from '../../../common/services/authService';
import '../styles/auth.css';

export default function UpdatePasswordPage() {
  const [form, setForm] = useState({ password: '', confirm_password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const updateField = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await authService.updatePassword(form);
      logout();
      navigate('/login', { state: { message: 'Password updated. Please log in.' } });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="center-page">
      <form className="form-card" onSubmit={submit}>
        <h1>Update Password</h1>
        <FormField label="Password" name="password" type="password" value={form.password} onChange={updateField} />
        <FormField label="Confirm Password" name="confirm_password" type="password" value={form.confirm_password} onChange={updateField} />
        {message ? <p className="form-message error">{message}</p> : null}
        <Button disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button>
      </form>
    </main>
  );
}

