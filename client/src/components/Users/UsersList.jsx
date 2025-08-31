import React, { useEffect, useState } from 'react';
import { getUsers } from '../../services/api';
import './UsersList.css';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="users-container">
      <h2 className="users-title">Users</h2>
      {users.length === 0 ? (
        <p className="no-users">No users found.</p>
      ) : (
        <div className="users-list">
          {users.map((u, index) => (
            <div key={u.id ?? u.Username ?? index} className="user-card">
              <strong>{u.Username}</strong>
              <span className="user-email">{u.Email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UsersList;
