import { Link } from 'react-router-dom';
import opusLogo from '../../../assets/opus_logo.jfif';

export default function LandingNavbar() {
  return (
    <header className="landing-navbar">
      <Link className="landing-brand" to="/">
        <img src={opusLogo} alt="Opus Appeal Tracking Portal logo" />
        <span>Opus Appeal Tracking Portal</span>
      </Link>
      <Link className="landing-button landing-button-outline" to="/login">Login</Link>
    </header>
  );
}
