import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../common/components/Button';
import FormField from '../../../common/components/FormField';
import { authService } from '../../../common/services/authService';
import AuthFormHeader from '../components/AuthFormHeader';
import PasswordField from '../components/PasswordField';
import { getPasswordIssues, passwordsDoNotMatch, passwordRequirements } from '../utils/passwordValidation';
import '../styles/auth.css';

const initialForm = {
  organization_name: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  username: '',
  password: '',
  confirm_password: ''
};

export default function SignupPage() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const passwordIssues = getPasswordIssues(form.password);
  const confirmMismatch = passwordsDoNotMatch(form.password, form.confirm_password);

  const updateField = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    if (passwordIssues.length || confirmMismatch) {
      setMessage('Please resolve the password requirements before creating the account.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await authService.registerOrganization(form);
      navigate('/login', { state: { message: 'Organization registered. Please log in.' } });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="center-page">
      <form className="form-card" onSubmit={submit}>
        <AuthFormHeader title="Organization Sign Up" subtitle="Create the first administrator account for your organization." />
        <FormField label="Organization Name" name="organization_name" value={form.organization_name} onChange={updateField} />
        <FormField label="First Name" name="first_name" value={form.first_name} onChange={updateField} />
        <FormField label="Middle Name (Optional)" name="middle_name" value={form.middle_name} onChange={updateField} />
        <FormField label="Last Name" name="last_name" value={form.last_name} onChange={updateField} />
        <FormField label="Email ID" name="email" type="email" value={form.email} onChange={updateField} />
        <FormField label="Username" name="username" value={form.username} onChange={updateField} />
        <PasswordField
          label="Password"
          name="password"
          value={form.password}
          onChange={updateField}
          visible={showPassword}
          onToggleVisibility={() => setShowPassword((value) => !value)}
        />
        {form.password ? (
          <div className="password-rules" aria-label="Password requirements">
            {passwordRequirements.map((requirement) => {
              const valid = requirement.test(form.password);
              return (
                <span className={valid ? 'rule-valid' : 'rule-invalid'} key={requirement.id}>
                  {valid ? '✓' : '•'} {requirement.label}
                </span>
              );
            })}
          </div>
        ) : null}
        <PasswordField
          label="Confirm Password"
          name="confirm_password"
          value={form.confirm_password}
          onChange={updateField}
          visible={showConfirmPassword}
          onToggleVisibility={() => setShowConfirmPassword((value) => !value)}
          error={confirmMismatch ? "Passwords don't match." : ''}
          helper={form.confirm_password && !confirmMismatch ? 'Passwords match.' : ''}
        />
        {message ? <p className="form-message error">{message}</p> : null}
        <Button disabled={loading}>{loading ? 'Creating...' : 'Create Admin Account'}</Button>
        <p className="auth-switch-text">Already registered? <Link className="text-link" to="/login">Sign in</Link></p>
      </form>
    </main>
  );
}
