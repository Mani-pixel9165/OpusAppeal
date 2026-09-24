import { AlertTriangle, CalendarDays, ChevronRight, Clock, DollarSign, Layers, TrendingUp, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appealService } from '../../../common/services/appealService';
import { denialService } from '../../../common/services/denialService';
import '../styles/dashboards.css';

const DAY_MS = 24 * 60 * 60 * 1000;
const GROUP_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'category', label: 'Denial Category' },
  { value: 'payer', label: 'Payer' },
  { value: 'code', label: 'Denial Code' },
];
const ACTION_BUCKETS = ['Appeal', 'Routine Adjustment', 'Writeoff', 'Appealed Outside Appealio', 'Others'];
const ACTION_COLORS = {
  Appeal: '#0f6c7b',
  'Routine Adjustment': '#2f80ed',
  Writeoff: '#c05a2b',
  'Appealed Outside Appealio': '#7c4dff',
  Others: '#60747c',
};
const TAT_BUCKETS = [
  { label: '0-15', min: 0, max: 15 },
  { label: '16-30', min: 16, max: 30 },
  { label: '31-45', min: 31, max: 45 },
  { label: '46-60', min: 46, max: 60 },
  { label: '61-120', min: 61, max: 120 },
  { label: '120+', min: 121, max: Infinity },
];

const isoDate = (date) => {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
};
const addDays = (value, days) => {
  const date = toDate(value);
  if (!date) return null;
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const toDate = (value) => {
  if (!value) return null;
  const date = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const daysBetween = (first, second) => {
  const start = toDate(first);
  const end = toDate(second);
  if (!start || !end) return null;
  return Math.floor((end - start) / DAY_MS);
};
const money = (value) => `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const number = (value) => Number(value || 0).toLocaleString();
const uniqueSorted = (items) => [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const splitCodes = (value) => (
  value ? String(value).split(/[,;|]+/).map((item) => item.trim()).filter(Boolean) : []
);

function actionBucket(denial) {
  const raw = denial.assigned_action?.name || (denial.appeal_status !== 'pending' ? 'Appeal' : '');
  const value = raw.toLowerCase();
  if (!raw || value === 'appeal') return 'Appeal';
  if (value.includes('routine')) return 'Routine Adjustment';
  if (value.includes('writeoff') || value.includes('write off')) return 'Writeoff';
  if (value.includes('outside')) return 'Appealed Outside Appealio';
  return 'Others';
}

function userName(denial) {
  const user = denial.action_completed_by || denial.appeal_completed_by || denial.action_assigned_by || denial.appeal_started_by || denial.assigned_to;
  return user?.full_name || user?.username || 'Unassigned';
}

function completedDate(denial) {
  return denial.action_completed_at || denial.appeal_completed_at || denial.completed_at || denial.package_created_at || null;
}

function denialDate(denial) {
  return denial.date_added || denial.eob_date || denial.service_date;
}

function appealDeadline(denial) {
  return addDays(denial.eob_date || denial.date_added, 60);
}

function valueOf(denial) {
  const billed = Number(denial.billed_amt || 0);
  const paid = Number(denial.payment_amt || 0);
  return Math.max(billed - paid, billed, 0);
}

function groupValue(denial, groupBy) {
  if (groupBy === 'user') return userName(denial);
  if (groupBy === 'category') return denial.denial_categories?.[0] || 'Uncategorized';
  if (groupBy === 'payer') return denial.payer || 'Unknown payer';
  if (groupBy === 'code') return splitCodes(denial.reason)[0]?.toUpperCase() || 'No code';
  return 'Unknown';
}

function LoadingBlock({ label = 'Loading...' }) {
  return <div className="dashboard-section-loading">{label}</div>;
}

function KpiCard({ title, value, subvalue, tone, icon: Icon, loading, onClick }) {
  return (
    <button className={`dashboard-kpi-card tone-${tone}`} type="button" onClick={onClick}>
      <span className="kpi-icon"><Icon size={20} /></span>
      <span className="kpi-title">{title}</span>
      {loading ? <LoadingBlock /> : (
        <>
          <strong>{value}</strong>
          <small>{subvalue}</small>
        </>
      )}
      <ChevronRight size={18} className="kpi-arrow" />
    </button>
  );
}

function StackedBarChart({ rows, loading, onSegmentClick }) {
  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  if (loading) return <LoadingBlock label="Loading productivity..." />;
  if (!rows.length) return <div className="dashboard-empty">No completed productivity data for the selected filters.</div>;

  return (
    <div className="stacked-chart">
      {rows.slice(0, 12).map((row) => (
        <div className="stacked-row" key={row.group}>
          <div className="stacked-label" title={row.group}>{row.group}</div>
          <div className="stacked-track" title={`${row.group}: ${row.total} completed`}>
            {ACTION_BUCKETS.map((bucket) => {
              const count = row.buckets[bucket] || 0;
              if (!count) return null;
              return (
                <button
                  key={bucket}
                  type="button"
                  className="stacked-segment"
                  style={{
                    width: `${Math.max((count / maxTotal) * 100, 2)}%`,
                    background: ACTION_COLORS[bucket],
                  }}
                  title={`${bucket}: ${count} of ${row.total}`}
                  onClick={() => onSegmentClick({ group: row.group, action: bucket })}
                />
              );
            })}
          </div>
          <strong>{row.total}</strong>
        </div>
      ))}
    </div>
  );
}

function TatChart({ rows, loading, onBucketClick }) {
  if (loading) return <LoadingBlock label="Loading TAT..." />;
  const max = Math.max(...rows.flatMap((row) => TAT_BUCKETS.map((bucket) => row.buckets[bucket.label] || 0)), 1);
  return (
    <div className="tat-table-shell">
      <table className="tat-table">
        <thead>
          <tr>
            <th>Group</th>
            {TAT_BUCKETS.map((bucket) => <th key={bucket.label}>{bucket.label}</th>)}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.group}>
              <td>{row.group}</td>
              {TAT_BUCKETS.map((bucket) => (
                <td key={bucket.label}>
                  <button
                    type="button"
                    className="tat-heat-cell"
                    style={{ '--heat': (row.buckets[bucket.label] || 0) / max }}
                    onClick={() => onBucketClick(row.group, bucket.label)}
                  >
                    {row.buckets[bucket.label] || 0}
                  </button>
                </td>
              ))}
              <td><strong>{row.total}</strong></td>
            </tr>
          ))}
          {!rows.length ? (
            <tr><td colSpan={TAT_BUCKETS.length + 2}>No completed TAT data for the selected filters.</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function DonutChart({ rows, loading, onSliceClick }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  let offset = 25;
  if (loading) return <LoadingBlock label="Loading actions..." />;
  return (
    <div className="donut-layout">
      <svg className="donut-chart" viewBox="0 0 42 42" role="img" aria-label="Action Distribution">
        <circle className="donut-bg" cx="21" cy="21" r="15.915" />
        {rows.map((row) => {
          const dash = total ? (row.count / total) * 100 : 0;
          const currentOffset = offset;
          offset -= dash;
          return (
            <circle
              key={row.name}
              className="donut-slice"
              cx="21"
              cy="21"
              r="15.915"
              stroke={ACTION_COLORS[row.name]}
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={currentOffset}
              onClick={() => onSliceClick(row.name)}
            >
              <title>{`${row.name}: ${row.count} (${total ? Math.round((row.count / total) * 100) : 0}%)`}</title>
            </circle>
          );
        })}
        <text x="21" y="20" textAnchor="middle">{number(total)}</text>
        <text x="21" y="24" textAnchor="middle">claims</text>
      </svg>
      <div className="donut-legend">
        {rows.map((row) => (
          <button key={row.name} type="button" onClick={() => onSliceClick(row.name)}>
            <i style={{ background: ACTION_COLORS[row.name] }} />
            <span>{row.name}</span>
            <strong>{row.count} ({total ? Math.round((row.count / total) * 100) : 0}%)</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function UserPerformancePage() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const oneYearAgo = useMemo(() => addDays(today, -365), [today]);
  const [fromDate, setFromDate] = useState(isoDate(oneYearAgo));
  const [toDate, setToDate] = useState(isoDate(today));
  const [practiceFilter, setPracticeFilter] = useState([]);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [groupBy, setGroupBy] = useState('user');
  const [data, setData] = useState({ pending: [], inProcess: [], completed: [] });
  const [loading, setLoading] = useState({ pending: true, inProcess: true, completed: true });
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading({ pending: true, inProcess: true, completed: true });
    Promise.allSettled([
      denialService.listPending(),
      denialService.listInProcess(),
      denialService.listCompleted(),
      appealService.listPackages(),
    ]).then(([pending, inProcess, completed, packages]) => {
      if (pending.status === 'fulfilled') {
        setData((current) => ({ ...current, pending: pending.value.data.denials || [] }));
      } else setMessage(pending.reason?.message || 'Unable to load pending denials.');
      setLoading((current) => ({ ...current, pending: false }));

      if (inProcess.status === 'fulfilled') {
        setData((current) => ({ ...current, inProcess: inProcess.value.data.denials || [] }));
      } else setMessage(inProcess.reason?.message || 'Unable to load in process denials.');
      setLoading((current) => ({ ...current, inProcess: false }));

      if (completed.status === 'fulfilled') {
        const completedDenials = completed.value.data.denials || [];
        const packageRows = packages.status === 'fulfilled' ? packages.value.data.packages || [] : [];
        const rowsById = new Map(completedDenials.map((row) => [String(row.id), row]));
        packageRows.forEach((item) => {
          if (!item.denial) return;
          const id = String(item.denial.id);
          rowsById.set(id, {
            ...item.denial,
            package_created_at: item.createdAt,
            appeal_completed_at: item.denial.appeal_completed_at || item.createdAt,
          });
        });
        setData((current) => ({ ...current, completed: [...rowsById.values()] }));
      } else setMessage(completed.reason?.message || 'Unable to load completed denials.');
      setLoading((current) => ({ ...current, completed: false }));
    });
  }, []);

  const allRows = useMemo(() => [...data.pending, ...data.inProcess, ...data.completed], [data]);
  const practices = useMemo(() => uniqueSorted(allRows.map((item) => item.practice)), [allRows]);

  const filtered = useMemo(() => {
    const from = toDateValue(fromDate);
    const to = toDateValue(toDate);
    const practiceSet = new Set(practiceFilter);
    const byPractice = (row) => !practiceSet.size || practiceSet.has(row.practice);
    const inRange = (dateValue) => {
      const value = toDateValue(dateValue);
      if (!value) return true;
      return (!from || value >= from) && (!to || value <= to);
    };
    return {
      pending: data.pending.filter((row) => byPractice(row) && inRange(row.date_added || row.eob_date)),
      inProcess: data.inProcess.filter((row) => byPractice(row) && inRange(row.action_assigned_at || row.appeal_started_at || row.date_added)),
      completed: data.completed.filter((row) => byPractice(row) && inRange(completedDate(row) || row.date_added)),
    };
  }, [data, fromDate, toDate, practiceFilter]);

  const kpis = useMemo(() => {
    const openRows = [...filtered.pending, ...filtered.inProcess];
    const todayValue = new Date();
    const nearRows = openRows.filter((row) => {
      const deadline = appealDeadline(row);
      if (!deadline) return false;
      const daysRemaining = daysBetween(todayValue, deadline);
      return daysRemaining !== null && daysRemaining >= 0 && daysRemaining < 5;
    });
    const criticalRows = openRows.filter((row) => {
      const deadline = appealDeadline(row);
      if (!deadline) return false;
      return todayValue > deadline;
    });
    return {
      completedCount: filtered.completed.length,
      completedValue: filtered.completed.reduce((sum, row) => sum + valueOf(row), 0),
      pendingCount: openRows.length,
      pendingValue: openRows.reduce((sum, row) => sum + valueOf(row), 0),
      nearCount: nearRows.length,
      nearValue: nearRows.reduce((sum, row) => sum + valueOf(row), 0),
      criticalCount: criticalRows.length,
      criticalValue: criticalRows.reduce((sum, row) => sum + valueOf(row), 0),
    };
  }, [filtered]);

  const productivityRows = useMemo(() => {
    const map = new Map();
    filtered.completed.forEach((row) => {
      const group = userName(row);
      const bucket = actionBucket(row);
      if (!map.has(group)) {
        map.set(group, { group, total: 0, buckets: Object.fromEntries(ACTION_BUCKETS.map((item) => [item, 0])) });
      }
      const current = map.get(group);
      current.total += 1;
      current.buckets[bucket] += 1;
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filtered.completed]);

  const groupedTatRows = useMemo(() => {
    const map = new Map();
    filtered.completed.forEach((row) => {
      const group = groupValue(row, groupBy);
      const tat = daysBetween(denialDate(row), completedDate(row));
      if (tat === null) return;
      const bucket = TAT_BUCKETS.find((item) => tat >= item.min && tat <= item.max);
      if (!bucket) return;
      if (!map.has(group)) {
        map.set(group, {
          group,
          total: 0,
          buckets: Object.fromEntries(TAT_BUCKETS.map((item) => [item.label, 0])),
        });
      }
      const current = map.get(group);
      current.total += 1;
      current.buckets[bucket.label] += 1;
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filtered.completed, groupBy]);

  const actionRows = useMemo(() => ACTION_BUCKETS.map((name) => ({
    name,
    count: filtered.completed.filter((row) => actionBucket(row) === name).length,
  })), [filtered.completed]);

  const dashboardLoading = loading.pending || loading.inProcess || loading.completed;
  const drill = (path, extra = {}) => {
    const params = new URLSearchParams({
      from: fromDate,
      to: toDate,
      ...(practiceFilter.length ? { practice: practiceFilter.join('|') } : {}),
      ...extra,
    });
    navigate(`${path}?${params.toString()}`);
  };

  return (
    <section className="dashboard-page user-performance-page">
      <div className="dashboard-hero">
        <div>
          <span>Appeal Operations Dashboard</span>
          <h1>User Performance</h1>
        </div>
        <div className="dashboard-filter-panel">
          <label><span>From Date</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
          <label><span>To Date</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
          <div className="dashboard-practice-filter">
            <span>Practice</span>
            <button type="button" onClick={() => setPracticeOpen((value) => !value)}>
              {practiceFilter.length ? `${practiceFilter[0]}${practiceFilter.length > 1 ? ` +${practiceFilter.length - 1}` : ''}` : 'All practices'}
              <ChevronRight size={14} />
            </button>
            {practiceOpen ? (
              <div className="dashboard-practice-menu">
                {practices.map((practice) => (
                  <label key={practice}>
                    <input
                      type="checkbox"
                      checked={practiceFilter.includes(practice)}
                      onChange={() => setPracticeFilter((current) => (
                        current.includes(practice) ? current.filter((item) => item !== practice) : [...current, practice]
                      ))}
                    />
                    <span>{practice}</span>
                  </label>
                ))}
                {!practices.length ? <p>No practices available</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {message ? <p className="form-message error">{message}</p> : null}

      <div className="dashboard-kpi-grid">
        <KpiCard title="Appeals Completed" value={number(kpis.completedCount)} subvalue={`${money(kpis.completedValue)} completed value`} tone="green" icon={TrendingUp} loading={loading.completed} onClick={() => drill('/denials/completed')} />
        <KpiCard title="Appeals Pending" value={number(kpis.pendingCount)} subvalue={`${money(kpis.pendingValue)} pending value`} tone="blue" icon={DollarSign} loading={loading.pending || loading.inProcess} onClick={() => drill('/denials/pending')} />
        <KpiCard title="Appeals Near Deadline" value={number(kpis.nearCount)} subvalue={`${money(kpis.nearValue)} <5 days`} tone="amber" icon={Clock} loading={dashboardLoading} onClick={() => drill('/denials/in-process', { deadline: 'near' })} />
        <KpiCard title="Appeals Crossed Deadlines" value={number(kpis.criticalCount)} subvalue={`${money(kpis.criticalValue)} crossed deadline`} tone="red" icon={AlertTriangle} loading={dashboardLoading} onClick={() => drill('/denials/in-process', { deadline: 'critical' })} />
      </div>

      <section className="dashboard-card hero-chart-card">
        <div className="dashboard-card-heading">
          <div>
            <span><Users size={15} /> Productivity Distribution</span>
            <h2>Completed claims by operational action</h2>
          </div>
        </div>
        <StackedBarChart rows={productivityRows} loading={loading.completed} onSegmentClick={({ group, action }) => drill('/denials/completed', { groupBy: 'user', group, action })} />
      </section>

      <div className="dashboard-lower-grid">
        <section className="dashboard-card">
          <div className="dashboard-card-heading">
            <div>
              <span><CalendarDays size={15} /> TAT Distribution</span>
              <h2>Completed date minus denial date</h2>
            </div>
            <label className="group-by-select">
              <span>Group By</span>
              <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
                {GROUP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <TatChart rows={groupedTatRows} loading={loading.completed} onBucketClick={(group, bucket) => drill('/denials/completed', { tat: bucket, groupBy, group })} />
        </section>
        <section className="dashboard-card">
          <div className="dashboard-card-heading">
            <div>
              <span><Layers size={15} /> Action Distribution</span>
              <h2>Completion mix by action type</h2>
            </div>
          </div>
          <DonutChart rows={actionRows} loading={loading.completed} onSliceClick={(action) => drill('/denials/completed', { action })} />
        </section>
      </div>
    </section>
  );
}

function toDateValue(value) {
  const date = toDate(value);
  return date ? isoDate(date) : '';
}
