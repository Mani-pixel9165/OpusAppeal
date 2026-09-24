import { useEffect, useState } from 'react';
import { userService } from '../../../common/services/userService';
import '../styles/users.css';

export default function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    userService
      .listUsers()
      .then((response) => setUsers(response.data.users))
      .catch((error) => setMessage(error.message));
  }, []);

  return (
    <section className="content-panel">
      <div className="section-heading">
        <h1>Manage Users</h1>
      </div>
      {message ? <p className="form-message error">{message}</p> : null}
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email ID</th>
              <th>Role</th>
              <th>Status</th>
              <th>First Login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.full_name || [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ') || '-'}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.is_active ? 'Active' : 'Inactive'}</td>
                <td>{user.first_login_required ? 'Required' : 'Complete'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
