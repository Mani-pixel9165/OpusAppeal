import { useState } from 'react';
import Button from '../../../common/components/Button';
import ConfirmationModal from '../../../common/components/ConfirmationModal';
import FormField from '../../../common/components/FormField';
import { userService } from '../../../common/services/userService';
import '../styles/users.css';

const initialForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  username: '',
  email: '',
  temporary_password: '',
};

export default function AddUserPage() {
  const [form, setForm] = useState(initialForm);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [createdPassword, setCreatedPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = (event) => {
    event.preventDefault();
    setConfirmOpen(true);
  };

  const createUser = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await userService.createUser(form);
      setCreatedPassword(response.data.temporary_password);
      setMessage('User created successfully.');
      setForm(initialForm);
      setConfirmOpen(false);
      setPasswordOpen(true);
      setCopied(false);
    } catch (error) {
      setMessage(error.message);
      setConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = async () => {
    await navigator.clipboard.writeText(createdPassword);
    setCopied(true);
  };

  return (
    <section className="content-panel">
      <form className="form-card compact" onSubmit={submit}>
        <h1>Add Users</h1>
        <FormField label="First Name" name="first_name" value={form.first_name} onChange={updateField} />
        <FormField label="Middle Name (Optional)" name="middle_name" value={form.middle_name} onChange={updateField} />
        <FormField label="Last Name" name="last_name" value={form.last_name} onChange={updateField} />
        <FormField label="Username" name="username" value={form.username} onChange={updateField} />
        <FormField label="Email ID" name="email" type="email" value={form.email} onChange={updateField} />
        <FormField label="Temporary Password" name="temporary_password" type="password" value={form.temporary_password} onChange={updateField} />
        {message ? <p className={`form-message ${message.includes('success') ? 'success' : 'error'}`}>{message}</p> : null}
        <Button>Create User</Button>
      </form>
      <ConfirmationModal
        open={confirmOpen}
        title="Create user?"
        description="This user will be linked to your organization and required to update their password on first login."
        loading={loading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={createUser}
      />
      <ConfirmationModal
        open={passwordOpen}
        title="Temporary password created"
        description="Copy this temporary password and share it securely with the user. They will be required to update it on first login."
        confirmLabel={copied ? 'Copied' : 'Copy Password'}
        cancelLabel="Close"
        loading={false}
        onCancel={() => setPasswordOpen(false)}
        onConfirm={copyPassword}
      >
        <p className="temp-password"><strong>{createdPassword}</strong></p>
      </ConfirmationModal>
    </section>
  );
}
