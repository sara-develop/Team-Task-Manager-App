import { useState, useEffect } from 'react';
import { updateTask, deleteTask } from '../../services/api';
import { toast } from 'react-toastify';
import './TaskCard.css';

const TaskCard = ({ task, onStatusChange, users = [] }) => {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(task.Title || '');
  const [status, setStatus] = useState(task.Status || 'Open');
  const [assigneeId, setAssigneeId] = useState(task.AssigneeId || '');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  // ----------- COMMENTS STATE -----------
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const assigneeName = assigneeId
    ? users.find(u => u.Id === assigneeId)?.Username || 'Unassigned'
    : 'Unassigned';

  // ---------- Fetch comments ----------
  useEffect(() => {
    if (!expanded) return; // נטען רק כשהכרטיס נפתח

    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const res = await fetch(`http://localhost:3001/tasks/${task.Id}/comments`);
        const data = await res.json();
        setComments(data);
      } catch (err) {
        console.error('Failed to fetch comments', err);
      } finally {
        setLoadingComments(false);
      }
    };

    fetchComments();
  }, [expanded, task.Id]);

  // ---------- Add comment ----------
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`http://localhost:3001/tasks/${task.Id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'current-user-id', content: newComment })
      });
      const added = await res.json();
      setComments(prev => [...prev, added]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment', err);
      toast.error('Failed to add comment');
    }
  };

  // ---------- Delete comment ----------
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await fetch(`http://localhost:3001/tasks/${task.Id}/comments/${commentId}`, { method: 'DELETE' });
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment', err);
      toast.error('Failed to delete comment');
    }
  };

  // ---------- Task update/delete ----------
  const handleUpdate = async () => {
    setUpdating(true);
    setError(null);
    try {
      const updatedTask = await updateTask(task.Id, { Title: title, AssigneeId: assigneeId, Status: status });
      if (updatedTask.message?.includes('Assignee removed')) {
        setAssigneeId('');
        toast.warning('Assignee removed due to max tasks.');
      } else {
        setAssigneeId(updatedTask.task?.AssigneeId || '');
      }
      setStatus(updatedTask.task?.Status || status);
      setTitle(updatedTask.task?.Title || title);
      onStatusChange && onStatusChange(updatedTask.task || updatedTask);
    } catch (err) {
      console.error('Failed to update task', err);
      setError(err.response?.data?.error || 'Failed to update task');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(task.Id);
      toast.success('Task deleted successfully!');
      onStatusChange && onStatusChange();
    } catch (err) {
      console.error('Failed to delete task', err);
      toast.error('Failed to delete task');
    }
  };

  return (
    <div className="task-card">
      <div className="task-card-header" onClick={() => setExpanded(!expanded)}>
        <strong>{task.Title}</strong>
        <span className={`arrow ${expanded ? 'expanded' : ''}`}></span>
      </div>

      {expanded && (
        <div className="task-card-body">
          <div className="task-field">
            <label>Title:</label>
            <input value={title} onChange={e => setTitle(e.target.value)} disabled={updating} />
          </div>

          <div className="task-field">
            <label>Assigned:</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} disabled={updating}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.Id} value={u.Id}>{u.Username}</option>)}
            </select>
          </div>

          <div className="task-field">
            <label>Status:</label>
            <select value={status} onChange={e => setStatus(e.target.value)} disabled={updating}>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>

          {task.Description && <div className="task-field"><p>{task.Description}</p></div>}
          {error && <div style={{ color: 'crimson' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleUpdate} disabled={updating}>
              {updating ? 'Updating…' : 'Update Task'}
            </button>
            <button onClick={handleDelete} disabled={updating} style={{ backgroundColor: 'crimson', color: 'white' }}>
              Delete
            </button>
          </div>

          {/* -------- COMMENTS SECTION -------- */}
          <div className="comments-section" style={{ marginTop: '16px' }}>
            <h4>Comments</h4>

            {loadingComments && <p>Loading comments...</p>}
            {comments.map(c => (
              <div key={c._id} className="comment">
                <p><strong>{c.userId}</strong>: {c.content}</p>
                <button onClick={() => handleDeleteComment(c._id)} style={{ fontSize: '0.8rem' }}>Delete</button>
              </div>
            ))}

            <div className="add-comment">
              <input
                placeholder="Add a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
              />
              <button onClick={handleAddComment}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
