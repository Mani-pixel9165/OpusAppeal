import { Eye, EyeOff } from 'lucide-react';

export default function PasswordField({ label, visible, onToggleVisibility, error, helper, ...props }) {
  return (
    <label className="field password-field">
      <span>{label}</span>
      <div className="password-input-wrap">
        <input {...props} type={visible ? 'text' : 'password'} />
        <button
          type="button"
          className="password-toggle"
          onClick={onToggleVisibility}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {helper ? <small className="field-helper">{helper}</small> : null}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

