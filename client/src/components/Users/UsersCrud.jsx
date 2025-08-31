import React, { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../../services/api';
import './UsersCrud.css';

const EmptyForm = { username: '', email: '', full_name: '', role: '' };

const UsersCrud = ({ onChange }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EmptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getUsers();
        if (mounted) setUsers(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load users');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadUsers();
    return () => { mounted = false; };
  }, []);

  const startEdit = (user) => {
    setEditingId(user.Id);
    setForm({ username: user.Username, email: user.Email, full_name: user.FullName || '', role: user.Role || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EmptyForm);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.email.trim() || !form.full_name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createUser(form);
      setUsers((prev) => [created, ...prev]);
      setForm(EmptyForm);
      onChange?.({ type: 'create', user: created });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create user');
      alert('Failed to create user: ' + (err.message));
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingId || !form.username.trim() || !form.email.trim()) return;
    setSavingId(editingId);
    setError(null);
    try {
      const updated = await updateUser(editingId, form);
      setUsers((prev) => prev.map((u) => (u.Id === editingId ? updated : u)));
      setEditingId(null);
      setForm(EmptyForm);
      onChange?.({ type: 'update', user: updated });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update user');
      alert('Failed to update user: ' + (err.message));
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    setError(null);
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.Id !== id));
      onChange?.({ type: 'delete', id });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to delete user');
      alert('Failed to delete user: ' + (err.message));
    }
  };

  return (
    <div className="users-crud-container">
      <h2 className="crud-title">Users Management</h2>

      <form onSubmit={editingId ? handleSave : handleCreate} className="crud-form">
        <div className="form-row">
          <input
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
            required
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
        </div>
        <input
          placeholder="Full name"
          value={form.full_name}
          onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
          required
        />
        <input
          placeholder="Role (optional)"
          value={form.role}
          onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
        />
        <div className="form-actions">
          <button type="submit" disabled={creating || !!savingId}>
            {editingId ? (savingId ? 'Saving…' : 'Save') : creating ? 'Creating…' : 'Create'}
          </button>
          {editingId && <button type="button" onClick={cancelEdit}>Cancel</button>}
        </div>
      </form>

      {error && <div className="crud-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="no-users">No users yet</div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Full name</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.Id}>
                  <td>{editingId === user.Id ? <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /> : user.Username}</td>
                  <td>{editingId === user.Id ? <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /> : user.Email}</td>
                  <td>{editingId === user.Id ? <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /> : user.FullName || '—'}</td>
                  <td>{editingId === user.Id ? <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /> : user.Role || 'member'}</td>
                  <td className="actions-cell">
                    {editingId === user.Id ? (
                      <>
                        <button onClick={handleSave} disabled={!!savingId}>{savingId ? 'Saving…' : 'Save'}</button>
                        <button onClick={cancelEdit}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(user)}>Edit</button>
                        <button onClick={() => handleDelete(user.Id)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsersCrud;
