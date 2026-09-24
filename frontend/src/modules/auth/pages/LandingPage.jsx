import { Database, LockKeyhole, Route, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardPreview from '../components/DashboardPreview';
import FeatureCard from '../components/FeatureCard';
import LandingNavbar from '../components/LandingNavbar';
import '../styles/auth.css';

const features = [
  {
    icon: Route,
    title: 'Appeal Workflow Tracking',
    description: 'Track denials from intake to assignment with queues built for revenue cycle teams.'
  },
  {
    icon: UsersRound,
    title: 'Team Collaboration',
    description: 'Route work across admins and users with clean ownership and shared visibility.'
  },
  {
    icon: LockKeyhole,
    title: 'Secure Role-Based Access',
    description: 'Protect claim workflows with secure authentication and organization-scoped access.'
  },
  {
    icon: Database,
    title: 'Excel & Claim Data Integration',
    description: 'Bring denial files into one workspace with upload confirmation and structured review.'
  }
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <LandingNavbar />
      <section className="hero-section">
        <div className="hero-copy">
          <span className="hero-kicker">Opus Appeal Tracking Portal</span>
          <h1>Healthcare Appeal Management Built for Modern RCM Teams</h1>
          <p>
            Organize denials, manage appeals, onboard teams, and streamline revenue cycle workflows
            through a secure collaborative workspace.
          </p>
          <div className="trust-row" aria-label="Trust indicators">
            <span>Secure Workspace</span>
            <span>Team-Based Access</span>
            <span>Healthcare Workflow Ready</span>
          </div>
        </div>
        <DashboardPreview />
      </section>

      <section className="feature-section" id="features">
        <div className="section-intro">
          <span>Enterprise RCM workspace</span>
          <h2>Purpose-built tools for denial management teams</h2>
          <p>A focused operational layer for upload, assignment, review, and secure collaboration.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="landing-footer-strip">
        <div>
          <span>Security-ready workflows</span>
          <strong>Start with organization onboarding, then scale your appeal operations.</strong>
        </div>
        <Link className="landing-button landing-button-primary" to="/signup">Get Started</Link>
      </section>
    </main>
  );
}
