import opusLogo from '../../../assets/opus_logo.jfif';

export default function AuthFormHeader({ title, subtitle }) {
  return (
    <div className="auth-form-header">
      <div className="auth-product-lockup">
        <img src={opusLogo} alt="Opus Appeal Tracking Portal logo" />
        <div>
          <strong>Opus Appeal Tracking Portal</strong>
          <span>Healthcare denial management</span>
        </div>
      </div>
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  );
}

