const denials = [
  { claim: 'CLM-24018', payer: 'Aetna', status: 'New', assigned: 'Maya' },
  { claim: 'CLM-24041', payer: 'BCBS', status: 'Review', assigned: 'Unassigned' },
  { claim: 'CLM-24102', payer: 'Cigna', status: 'Ready', assigned: 'Ethan' }
];

export default function DashboardPreview() {
  return (
    <section className="dashboard-preview" aria-label="Opus Appeal Tracking Portal dashboard preview">
      <div className="preview-glow" />
      <div className="preview-header">
        <div>
          <span className="preview-eyebrow">Live workspace</span>
          <h2>Pending Denials</h2>
        </div>
        <span className="preview-status">Secure</span>
      </div>

      <div className="preview-metrics">
        <article>
          <span>Open denials</span>
          <strong>428</strong>
        </article>
        <article>
          <span>Appeals ready</span>
          <strong>96</strong>
        </article>
        <article>
          <span>Upload queue</span>
          <strong>12</strong>
        </article>
      </div>

      <div className="preview-table">
        <div className="preview-table-head">
          <span>Claim ID</span>
          <span>Payer</span>
          <span>Status</span>
          <span>Assigned</span>
        </div>
        {denials.map((denial) => (
          <div className="preview-row" key={denial.claim}>
            <span>{denial.claim}</span>
            <span>{denial.payer}</span>
            <span className={`status-pill status-${denial.status.toLowerCase()}`}>{denial.status}</span>
            <span>{denial.assigned}</span>
          </div>
        ))}
      </div>

      <div className="preview-progress-card">
        <span>Claim workflow progress</span>
        <div className="preview-progress-track">
          <div />
        </div>
      </div>

      <div className="preview-summary-grid">
        <aside className="floating-card upload-card">
          <span>Excel integration</span>
          <strong>1,248 rows validated</strong>
        </aside>
        <aside className="floating-card team-card">
          <span>Team access</span>
          <strong>Role-based routing</strong>
        </aside>
      </div>
    </section>
  );
}
