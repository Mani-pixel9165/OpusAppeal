import { CalendarDays, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { codeDescriptionService } from '../../../common/services/codeDescriptionService';
import '../styles/users.css';

const LOG_TYPES = [
  { key: 'remark', label: 'Remark Code Description Extraction' },
  { key: 'reason', label: 'Reason Code Description Extraction' },
];

const todayValue = () => new Date().toISOString().slice(0, 10);
const monthStartValue = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};
const dateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
const dateOnly = (value) => (value ? new Date(value).toLocaleDateString() : '-');

export default function ExtractionLogsPage() {
  const [activeType, setActiveType] = useState('remark');
  const [dateFrom, setDateFrom] = useState(monthStartValue());
  const [dateTo, setDateTo] = useState(todayValue());
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const activeMeta = useMemo(() => LOG_TYPES.find((item) => item.key === activeType), [activeType]);

  const loadStatus = () => {
    codeDescriptionService
      .status()
      .then((response) => setStatus(response.data.status || {}))
      .catch(() => {});
  };

  const loadLogs = () => {
    setLoading(true);
    setMessage('');
    codeDescriptionService
      .logs({ code_type: activeType, from: dateFrom, to: dateTo })
      .then((response) => setLogs(response.data.logs || []))
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStatus();
    const timer = window.setInterval(loadStatus, 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [activeType]);

  return (
    <section className="admin-logs-page">
      <div className="admin-logs-header">
        <div>
          <span>Settings</span>
          <h1>Logs</h1>
        </div>
      </div>

      <div className="admin-logs-layout">
        <aside className="admin-log-tabs" aria-label="Extraction log types">
          {LOG_TYPES.map((item) => (
            <button
              key={item.key}
              className={activeType === item.key ? 'active' : ''}
              type="button"
              onClick={() => setActiveType(item.key)}
            >
              <FileText size={16} />
              <span>{item.label}</span>
              {status[item.key]?.running ? <i className="running-dot" aria-label="Running" /> : null}
            </button>
          ))}
        </aside>

        <div className="admin-log-panel">
          <div className="admin-log-panel-header">
            <div>
              <h2>
                {activeMeta?.label}
                {status[activeType]?.running ? <i className="running-dot inline" aria-label="Running" /> : null}
              </h2>
              <p>Scheduled logs show for the selected date range only. Newest runs appear first.</p>
            </div>
            <div className="admin-log-date-filters">
              <label>
                <span>From</span>
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </label>
              <label>
                <span>To</span>
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </label>
              <button type="button" onClick={loadLogs}>
                <CalendarDays size={15} />
                Show
              </button>
            </div>
          </div>

          {message ? <p className="form-message error">{message}</p> : null}

          <div className="admin-log-table-shell">
            <table className="admin-log-table">
              <thead>
                <tr>
                  <th>Run Date</th>
                  <th>Started Extraction At</th>
                  <th>Stopped Extraction At</th>
                  <th>Modified Updates</th>
                  <th>New Starts</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7">Loading logs...</td></tr>
                ) : null}
                {!loading && logs.map((log) => (
                  <tr key={log.id}>
                    <td>{dateOnly(log.started_at)}</td>
                    <td>{dateTime(log.started_at)}</td>
                    <td>{dateTime(log.stopped_at)}</td>
                    <td>{log.modified_updates}</td>
                    <td>{log.new_starts}</td>
                    <td>
                      <span className={`log-status ${log.status}`}>
                        {log.status === 'running' ? <i className="running-dot" aria-label="Running" /> : null}
                        {log.status}
                      </span>
                    </td>
                    <td>{log.message || '-'}</td>
                  </tr>
                ))}
                {!loading && !logs.length ? (
                  <tr><td colSpan="7">No logs found for this date range.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
