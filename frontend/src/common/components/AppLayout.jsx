import { Activity, BarChart3, ChevronDown, Database, FileSpreadsheet, LogOut, Settings, UserPlus, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { codeDescriptionService } from '../services/codeDescriptionService';
import { denialService } from '../services/denialService';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const [denialsOpen, setDenialsOpen] = useState(false);
  const [dashboardsOpen, setDashboardsOpen] = useState(false);
  const [denialCounts, setDenialCounts] = useState({ pending: null, inProcess: null, completed: null });
  const denialsDropdownRef = useRef(null);
  const dashboardsDropdownRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const denialsActive = location.pathname.startsWith('/denials');
  const dashboardsActive = location.pathname.startsWith('/dashboards');
  const [extractionStatus, setExtractionStatus] = useState({});
  const extractionRunning = useMemo(
    () => Object.values(extractionStatus).some((item) => item?.running),
    [extractionStatus],
  );

  useEffect(() => {
    if (user?.role !== 'admin') return;
    codeDescriptionService
      .status()
      .then((response) => setExtractionStatus(response.data.status || {}))
      .catch(() => {});
  }, [user?.role]);

  useEffect(() => {
    const loadDenialCounts = async () => {
      try {
        const [pendingResponse, inProcessResponse, completedResponse] = await Promise.all([
          denialService.listPending(),
          denialService.listInProcess(),
          denialService.listCompleted(),
        ]);
        setDenialCounts({
          pending: pendingResponse.data.denials?.length ?? 0,
          inProcess: inProcessResponse.data.denials?.length ?? 0,
          completed: completedResponse.data.denials?.length ?? 0,
        });
      } catch {
        setDenialCounts({ pending: null, inProcess: null, completed: null });
      }
    };

    loadDenialCounts();
  }, [location.pathname]);

  useEffect(() => {
    if (!denialsOpen && !dashboardsOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (denialsOpen && !denialsDropdownRef.current?.contains(event.target)) {
        setDenialsOpen(false);
      }
      if (dashboardsOpen && !dashboardsDropdownRef.current?.contains(event.target)) {
        setDashboardsOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [denialsOpen, dashboardsOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand-link" to="/denials/pending">Opus Appeal Tracker Flow</Link>
        <nav className="main-tabs" aria-label="Primary navigation">
          <div className="nav-dropdown-wrapper" ref={denialsDropdownRef}>
            <button
              className={`nav-dropdown-trigger${denialsActive ? ' active' : ''}`}
              type="button"
              onClick={() => {
                setDenialsOpen((value) => !value);
                setDashboardsOpen(false);
              }}
            >
              <FileSpreadsheet size={16} />
              Denials
              <ChevronDown size={14} />
            </button>
            {denialsOpen ? (
              <div className="nav-dropdown-menu">
                <NavLink to="/denials/pending" onClick={() => setDenialsOpen(false)}>Pending Denials {denialCounts.pending !== null ? `(${denialCounts.pending})` : ''}</NavLink>
                <NavLink to="/denials/in-process" onClick={() => setDenialsOpen(false)}>In Process Denials {denialCounts.inProcess !== null ? `(${denialCounts.inProcess})` : ''}</NavLink>
                <NavLink to="/denials/completed" onClick={() => setDenialsOpen(false)}>Completed Actions {denialCounts.completed !== null ? `(${denialCounts.completed})` : ''}</NavLink>
              </div>
            ) : null}
          </div>
          <div className="nav-dropdown-wrapper" ref={dashboardsDropdownRef}>
            <button
              className={`nav-dropdown-trigger${dashboardsActive ? ' active' : ''}`}
              type="button"
              onClick={() => {
                setDashboardsOpen((value) => !value);
                setDenialsOpen(false);
              }}
            >
              <BarChart3 size={16} />
              Dashboards
              <ChevronDown size={14} />
            </button>
            {dashboardsOpen ? (
              <div className="nav-dropdown-menu">
                <NavLink to="/dashboards/user-performance" onClick={() => setDashboardsOpen(false)}>User Performance</NavLink>
              </div>
            ) : null}
          </div>
          {user?.role === 'admin' ? <NavLink to="/connect-data"><Database size={16} />Connect to Data</NavLink> : null}
        </nav>
        <div className="topbar-actions">
          <div className="user-context" title={`${user?.username || 'User'} - ${user?.role || ''}`}>
            <strong>{user?.username || 'User'}</strong>
            <span>{user?.role}</span>
          </div>
          <button className="icon-button" type="button" aria-label="Settings" onClick={() => setOpen((value) => !value)}>
            <Settings size={19} />
            {extractionRunning ? <span className="settings-running-dot" /> : null}
          </button>
          {open ? (
            <nav className="settings-menu" aria-label="Settings menu">
              <div className="settings-user-summary">
                <strong>{user?.username || 'User'}</strong>
                <span>{user?.role}</span>
              </div>
              {user?.role === 'admin' ? (
                <>
                  <Link to="/users/add" onClick={() => setOpen(false)}><UserPlus size={16} />Add Users</Link>
                  <Link to="/users/manage" onClick={() => setOpen(false)}><Users size={16} />Manage Users</Link>
                  <Link to="/settings/logs" onClick={() => setOpen(false)}>
                    <Activity size={16} />
                    Logs
                    {extractionRunning ? <span className="settings-menu-running-dot" /> : null}
                  </Link>
                </>
              ) : null}
              <button type="button" onClick={handleLogout}><LogOut size={16} />Logout</button>
            </nav>
          ) : null}
        </div>
      </header>
      <main className="workspace">
        <Outlet />
      </main>
    </div>
  );
}
