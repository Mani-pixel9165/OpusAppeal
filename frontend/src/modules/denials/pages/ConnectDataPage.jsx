import { CheckCircle2, Database, ShieldCheck, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import Button from '../../../common/components/Button';
import ConfirmationModal from '../../../common/components/ConfirmationModal';
import { denialService } from '../../../common/services/denialService';
import '../styles/denials.css';

const emptyPreviewStats = {
  exact_duplicates: 0,
  second_time_denials: 0,
  fresh_denials: 0
};

const requiredColumns = [
  ['Patient', 'Patient name tied to the denied claim.'],
  ['Claim ID', 'Unique claim identifier from the source system.'],
  ['Service Date', 'Date or date range of service for the denial.'],
  ['Billed Amt', 'Total amount billed for the claim line.'],
  ['Payment Amt', 'Amount paid by the payer, if any.'],
  ['Payer', 'Insurance payer responsible for the denial.'],
  ['Provider', 'Rendering or billing provider name.'],
  ['Practice', 'Practice or facility associated with the claim.'],
  ['Procedure', 'Procedure, CPT, or service code.'],
  ['Modifier', 'Modifier associated with the procedure code.'],
  ['Reason', 'Denial reason or adjustment code.'],
  ['Remark', 'Remark code from the EOB or remittance.'],
  ['Assigned To', 'Optional source assignee; system uploads as unassigned.'],
  ['EOB Date', 'Date on the EOB or payer response.'],
  ['Notes', 'Additional claim or appeal notes.'],
  ['Date Added', 'Date the row was added to the source file.']
];

export default function ConnectDataPage() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [rowCount, setRowCount] = useState(0);
  const [previewStats, setPreviewStats] = useState(emptyPreviewStats);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const fileExtension = file?.name?.split('.').pop()?.toUpperCase() || 'FILE';
  const fileSize = file ? `${(file.size / 1024).toFixed(file.size > 1024 * 1024 ? 1 : 0)} ${file.size > 1024 * 1024 ? 'MB' : 'KB'}` : '';
  const isSuccess = message.includes('success');
  const noRowsToUpload = rowCount > 0 && previewStats.exact_duplicates === rowCount;

  const chooseFile = () => inputRef.current?.click();

  const previewFile = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    setMessage('');
    setFile(nextFile);
    setRowCount(0);
    setPreviewStats(emptyPreviewStats);
    event.target.value = '';
  };

  const previewUpload = async () => {
    if (!file) {
      setMessage('Choose a file before uploading.');
      return;
    }
    setMessage('');
    setLoading(true);
    try {
      const response = await denialService.previewUpload(file);
      setRowCount(response.data.row_count);
      setPreviewStats({
        exact_duplicates: response.data.exact_duplicates,
        second_time_denials: response.data.second_time_denials,
        fresh_denials: response.data.fresh_denials
      });
      setConfirmOpen(true);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const upload = async () => {
    if (!file) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await denialService.upload(file);
      setMessage(`${response.data.uploaded_count} denials uploaded successfully. ${response.data.discarded_duplicates} exact duplicates discarded.`);
      setConfirmOpen(false);
      setFile(null);
      setPreviewStats(emptyPreviewStats);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="connect-page">
      <div className="connect-hero">
        <span>Data import</span>
        <h1>Connect Your Denial Data</h1>
        <p>Securely import denial records from Excel into your appeal workflow.</p>
      </div>

      <div className="connect-layout">
        <section className={`upload-card ${file ? 'has-file' : ''}`}>
          <div className="upload-card-header">
            <div className="upload-icon-shell">
              <Upload size={26} />
            </div>
            <div>
              <h2>Upload denial files</h2>
              <p>Import denial records from Excel files.</p>
            </div>
          </div>

          {file ? (
            <div className="selected-file-card">
              <div className="selected-file-icon">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <strong>{file.name}</strong>
                <span>{fileExtension} File - {fileSize} - Ready to upload</span>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="upload-progress" role="status" aria-live="polite">
              <span className="loading-spinner" />
              <div>
                <strong>{confirmOpen ? 'Uploading...' : 'Reading file'}</strong>
                <p>{confirmOpen ? 'Saving records to the database.' : 'Checking duplicates and counting rows.'}</p>
              </div>
            </div>
          ) : null}

          {message ? <p className={`upload-message ${isSuccess ? 'success' : 'error'}`}>{message}</p> : null}

          <div className="upload-actions">
            <Button variant="secondary" type="button" onClick={chooseFile} disabled={loading}>
              Choose File
            </Button>
            <Button type="button" onClick={previewUpload} disabled={loading || !file}>
              {loading ? <span className="button-spinner" /> : null}
              {loading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>

          <input
            ref={inputRef}
            className="hidden-input"
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xltx,.xltm,.xls,.xlsb"
            onChange={previewFile}
          />
        </section>

        <aside className="connect-info-panel">
          <div className="info-panel-icon">
            <ShieldCheck size={24} />
          </div>
          <h2>Import checklist</h2>
          <p>Files are validated before upload so your denial queue stays structured and assignment-ready.</p>
          <ul>
            <li>
              <button className="checklist-link" type="button" onClick={() => setColumnsOpen(true)}>
                Required denial columns
              </button>
              <span> are checked first.</span>
            </li>
            <li>Exact duplicates are discarded during upload.</li>
            <li>Second-time denials and fresh denials are confirmed before saving.</li>
          </ul>
          <div className="info-stat">
            <Database size={18} />
            <span>Organization-scoped data import</span>
          </div>
        </aside>
      </div>

      <ConfirmationModal
        open={confirmOpen}
        title="Upload denial records?"
        description={noRowsToUpload ? 'All rows in this file already exist. There are no new denial records to upload.' : 'Exact duplicates will be discarded. Fresh and second-time denials will be added to the workspace.'}
        confirmLabel="Confirm Upload"
        loadingLabel="Uploading..."
        loading={loading}
        confirmDisabled={noRowsToUpload}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={upload}
      >
        {noRowsToUpload ? <p className="no-upload-warning">No rows to upload. Please choose a different file or close this confirmation.</p> : null}
        <div className="upload-confirm-summary">
          <dl className="upload-confirm-list">
            <div>
              <dt>Exact Duplicates</dt>
              <dd>{previewStats.exact_duplicates.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Second Time Denials</dt>
              <dd>{previewStats.second_time_denials.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Fresh Denials</dt>
              <dd>{previewStats.fresh_denials.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Total Rows</dt>
              <dd>{rowCount.toLocaleString()} denial rows</dd>
            </div>
            <div>
              <dt>File</dt>
              <dd>{file?.name}</dd>
            </div>
          </dl>
        </div>
      </ConfirmationModal>

      <ConfirmationModal
        open={columnsOpen}
        title="Required denial columns"
        description="Your upload file must include these columns so denial records can be imported correctly."
        showCloseIcon
        hideActions
        modalClassName="columns-modal"
        onCancel={() => setColumnsOpen(false)}
        onConfirm={() => setColumnsOpen(false)}
      >
        <div className="required-columns-list">
          {requiredColumns.map(([name, description]) => (
            <article key={name}>
              <strong>{name}</strong>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </ConfirmationModal>
    </section>
  );
}
