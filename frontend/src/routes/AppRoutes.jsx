import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../common/components/AppLayout';
import LandingPage from '../modules/auth/pages/LandingPage';
import LoginPage from '../modules/auth/pages/LoginPage';
import SignupPage from '../modules/auth/pages/SignupPage';
import UpdatePasswordPage from '../modules/auth/pages/UpdatePasswordPage';
import DashboardPage from '../modules/user_management/pages/DashboardPage';
import AddUserPage from '../modules/user_management/pages/AddUserPage';
import ManageUsersPage from '../modules/user_management/pages/ManageUsersPage';
import ExtractionLogsPage from '../modules/user_management/pages/ExtractionLogsPage';
import ConnectDataPage from '../modules/denials/pages/ConnectDataPage';
import PendingDenialsPage from '../modules/denials/pages/PendingDenialsPage';
import CompletedActionsPage from '../modules/denials/pages/CompletedActionsPage';
import AppealCreatePage from '../modules/appeals/pages/AppealCreatePage';
import UserPerformancePage from '../modules/dashboards/pages/UserPerformancePage';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/denials/pending" element={<PendingDenialsPage status="pending" />} />
          <Route path="/denials/in-process" element={<PendingDenialsPage status="in_process" />} />
          <Route path="/denials/completed" element={<CompletedActionsPage />} />
          <Route path="/appeals/create/:denialId" element={<AppealCreatePage />} />
          <Route path="/dashboards/user-performance" element={<UserPerformancePage />} />
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/users/add" element={<AddUserPage />} />
            <Route path="/users/manage" element={<ManageUsersPage />} />
            <Route path="/settings/logs" element={<ExtractionLogsPage />} />
            <Route path="/connect-data" element={<ConnectDataPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
