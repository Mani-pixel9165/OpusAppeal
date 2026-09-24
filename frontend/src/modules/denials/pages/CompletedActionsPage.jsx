import { Download, Eye } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../../../common/components/Button';
import { appealService } from '../../../common/services/appealService';
import { denialService } from '../../../common/services/denialService';
import '../styles/denials.css';

const money = (value) => (
  value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
    ? '-'
    : `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
);
const isPdfFile = (fileName = '') => String(fileName).toLowerCase().endsWith('.pdf');
const isImageFile = (fileName = '') => /\.(png|jpe?g|gif|webp|bmp)$/i.test(String(fileName || ''));

const date = (value) => {
  if (!value) return '-';
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return text;
  return new Date(text).toLocaleDateString();
};

const packagePages = (appealPackage) => [
  ...(appealPackage?.letters || []).map((letter, index) => ({
    id: letter.id || `letter-${index}`,
    title: `Claim Form ${index + 1}: ${letter.name || letter.templateName || 'Letter'}`,
    html: letter.pdfHtml || letter.content || '',
  })),
  ...(appealPackage?.documents || []).map((documentItem, index) => ({
    id: `document-${index}`,
    title: `Document ${index + 1}: ${documentItem.type === 'Others' ? documentItem.name || 'Other Document' : documentItem.type}`,
    fileName: documentItem.fileName,
    fileUrl: documentItem.id ? appealService.documentFileUrl(documentItem.id) : '',
  })),
];

const packetHtml = (appealPackage) => packagePages(appealPackage).map((page) => (
  page.html
    ? `<section class="completed-print-page"><h2>${page.title}</h2>${page.html}</section>`
    : page.fileUrl && isPdfFile(page.fileName)
      ? `<section class="completed-print-page completed-print-document"><h2>${page.title}</h2><iframe src="${page.fileUrl}" style="width:100%;height:9.4in;border:0;"></iframe></section>`
      : page.fileUrl && isImageFile(page.fileName)
        ? `<section class="completed-print-page completed-print-document"><h2>${page.title}</h2><img src="${page.fileUrl}" style="max-width:100%;max-height:9.2in;object-fit:contain;" /></section>`
      : `<section class="completed-print-page completed-print-document"><h2>${page.title}</h2><p>${page.fileName || '-'}</p></section>`
)).join('');

const actionLabel = (denial) => {
  if (!denial.assigned_action?.name) return 'Appeal';
  if (denial.assigned_action.name.toLowerCase() === 'other' && denial.action_other_description) {
    return `Other: ${denial.action_other_description}`;
  }
  return denial.assigned_action.name;
};

const userDisplayName = (user) => {
  if (!user) return '';
  return user.full_name || user.username || '';
};

const workflowAgentName = (denial) => userDisplayName(
  denial.action_completed_by
  || denial.appeal_completed_by
  || denial.action_assigned_by
  || denial.appeal_started_by
  || denial.assigned_to
);

export default function CompletedActionsPage() {
  const location = useLocation();
  const [denials, setDenials] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    setMessage('');
    Promise.all([
      denialService.listCompleted(),
      appealService.listPackages(),
    ])
      .then(([denialsResponse, packagesResponse]) => {
        setDenials(denialsResponse.data.denials || []);
        setPackages(packagesResponse.data.packages || []);
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, []);

  const packageByDenialId = useMemo(() => {
    const map = new Map();
    packages.forEach((item) => map.set(String(item.denialId), item));
    return map;
  }, [packages]);

  const filteredDenials = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const from = params.get('from') || '';
    const to = params.get('to') || '';
    const practices = params.get('practice') ? params.get('practice').split('|').filter(Boolean) : [];
    const action = params.get('action') || '';
    const practiceSet = new Set(practices);
    return denials.filter((denial) => {
      const completed = String(denial.action_completed_at || denial.appeal_completed_at || packageByDenialId.get(String(denial.id))?.createdAt || '').slice(0, 10);
      if (from && completed && completed < from) return false;
      if (to && completed && completed > to) return false;
      if (practiceSet.size && !practiceSet.has(denial.practice)) return false;
      if (action && actionLabel(denial) !== action && !(action === 'Appeal' && !denial.assigned_action)) return false;
      return true;
    });
  }, [denials, location.search, packageByDenialId]);

  const openPackage = (denial) => {
    setSelectedPackage(packageByDenialId.get(String(denial.id)) || { denial, letters: [], documents: [] });
  };

  const printPackage = (appealPackage) => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Appeal Packet</title>
          <style>
            body { margin: 0; background: #eef3f6; font-family: Arial, sans-serif; }
            .completed-print-page { width: 8.5in; min-height: 11in; box-sizing: border-box; margin: 24px auto; padding: 0.6in; background: #fff; color: #111827; page-break-after: always; }
            .completed-print-page h2 { margin: 0 0 18px; font-size: 16px; color: #0b2239; }
            .completed-print-document { display: grid; place-items: center; align-content: center; gap: 12px; text-align: center; }
            @media print { body { background: #fff; } .completed-print-page { margin: 0; box-shadow: none; } }
          </style>
        </head>
        <body>${packetHtml(appealPackage)}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const pageHeader = (
    <header className="denials-page-header">
      <div className="section-heading">
        <span>Appeal Queue</span>
        <h1>Completed Actions</h1>
      </div>
    </header>
  );

  if (loading) {
    return (
      <section className="denials-page completed-actions-page">
        {pageHeader}
        <div className="denials-loading-screen" role="status" aria-live="polite">
          <div className="denials-loading-orbit" aria-hidden="true">
            <span className="denials-loading-mark" />
          </div>
          <strong>Fetching completed actions</strong>
          <p>Loading packed appeal actions for this session.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="denials-page completed-actions-page">
      {pageHeader}
      {message ? <p className="form-message error">{message}</p> : null}
      <div className="denials-workspace-card">
        <div className="denials-grid-toolbar">
          <div className="worklist-meta">
            <span>{filteredDenials.length} completed</span>
            <strong>Packed appeal actions ready to view or download.</strong>
          </div>
        </div>
        <div className="denials-table-shell">
          <table className="denials-table completed-actions-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Claim ID</th>
                <th>Service Date</th>
                <th>Billed Amt</th>
                <th>Payer</th>
                <th>Provider</th>
                <th>Completed</th>
                <th>Action Type</th>
                <th>Agent Name</th>
                <th>Packet</th>
              </tr>
            </thead>
            <tbody>
              {filteredDenials.map((denial) => {
                const appealPackage = packageByDenialId.get(String(denial.id));
                return (
                  <tr key={denial.id}>
                    <td><span className="cell-primary">{denial.patient || '-'}</span></td>
                    <td><span className="cell-primary">{denial.claim_id || '-'}</span></td>
                    <td>{date(denial.service_date_display || denial.service_date)}</td>
                    <td>{money(denial.billed_amt)}</td>
                    <td>{denial.payer || '-'}</td>
                    <td><span className="cell-primary">{denial.provider || '-'}</span><span className="cell-muted">{denial.practice || '-'}</span></td>
                    <td>{date(denial.action_completed_at || denial.appeal_completed_at || appealPackage?.createdAt)}</td>
                    <td><span className="action-chip" title={denial.action_notes ? `Notes: ${denial.action_notes}` : undefined}>{actionLabel(denial)}</span></td>
                    <td><span className="cell-primary">{workflowAgentName(denial) || '-'}</span></td>
                    <td>
                      {appealPackage ? (
                        <div className="completed-action-buttons">
                          <button type="button" title="View packed appeal" onClick={() => openPackage(denial)}>
                            <Eye size={16} />
                          </button>
                          <button type="button" title="Download as PDF" onClick={() => printPackage(appealPackage || { denial, letters: [], documents: [] })}>
                            <Download size={16} />
                          </button>
                        </div>
                      ) : <span className="empty-text">-</span>}
                    </td>
                  </tr>
                );
              })}
              {!filteredDenials.length ? (
                <tr>
                  <td className="empty-cell" colSpan={10}>No completed actions found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPackage ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal completed-package-modal" role="dialog" aria-modal="true" aria-labelledby="completed-package-title">
            <button className="modal-close-button" type="button" onClick={() => setSelectedPackage(null)} aria-label="Close packed appeal">x</button>
            <div className="completed-package-heading">
              <div>
                <span>Packed Appeal</span>
                <h2 id="completed-package-title">{selectedPackage.denial?.patient || selectedPackage.denial?.claim_id || 'Appeal Packet'}</h2>
              </div>
              <Button type="button" onClick={() => printPackage(selectedPackage)}>
                <Download size={16} />
                Download PDF
              </Button>
            </div>
            <div className="completed-package-preview">
              {packagePages(selectedPackage).map((page) => (
                <article key={page.id} className="completed-package-page">
                  <h3>{page.title}</h3>
                  {page.html ? (
                    <div dangerouslySetInnerHTML={{ __html: page.html }} />
                  ) : page.fileUrl && isPdfFile(page.fileName) ? (
                    <iframe className="completed-document-frame" src={page.fileUrl} title={page.title} />
                  ) : page.fileUrl && isImageFile(page.fileName) ? (
                    <div className="completed-image-frame">
                      <img src={page.fileUrl} alt={page.title} />
                    </div>
                  ) : (
                    <p>{page.fileName || '-'}</p>
                  )}
                </article>
              ))}
              {!packagePages(selectedPackage).length ? <p className="empty-cell">No packed appeal content was found for this action.</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
