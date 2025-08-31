import React, { useState, useEffect } from 'react';
import TaskCard from './TaskCard';
import AddTaskForm from './AddTaskForm';
import { fetchTasksByProject, getUsers, updateProject, deleteProject } from '../../services/api'; // <-- הוסף את deleteProject
import './ProjectCard.css';

const ProjectCard = ({ project, expanded, onExpand, onDeleted }) => { // <-- הוסף onDeleted
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [name, setName] = useState(project.Name || '');
  const [description, setDescription] = useState(project.Description || '');
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      const allUsers = await getUsers();
      setUsers(Array.isArray(allUsers) ? allUsers : []);
    };
    loadUsers();
  }, []);

  useEffect(() => {
    if (project?.Id && expanded) loadTasks(project.Id);
  }, [project, expanded]);

  const loadTasks = async (projId) => {
    const data = await fetchTasksByProject(projId);
    setTasks(Array.isArray(data) ? data : []);
  };

  const handleUpdateProject = async () => {
    setUpdating(true);
    try {
      await updateProject(project.Id, { name, description });
      alert('Project updated successfully!');
      setEditing(false);
    } catch (err) {
      console.error('Failed to update project', err);
      alert('Failed to update project');
    } finally {
      setUpdating(false);
    }
  };

  // פונקציה למחיקת הפרויקט
  const handleDeleteProject = async () => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteProject(project.Id);
      alert('Project deleted successfully!');
      if (onDeleted) onDeleted(project.Id); // מודיע לרשימה למחוק אותו
    } catch (err) {
      console.error('Failed to delete project', err);
      alert('Failed to delete project');
    }
  };

  return (
    <div className={`project-card ${expanded ? 'expanded' : ''}`}>
      <div className="project-header" onClick={onExpand}>
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#542468' }}>{name}</span>
        <span className={`arrow ${expanded ? 'expanded' : ''}`}></span>
      </div>

      {expanded && (
        <div className="project-body">
          {editing ? (
            <>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={updating}
                style={{ width: '100%', fontSize: '1.2rem', fontWeight: 'bold', padding: '8px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '12px' }}
              />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={updating}
                placeholder="Project description..."
                style={{ width: '100%', borderRadius: '8px', padding: '8px', fontSize: '0.95rem', border: '1px solid #ccc', resize: 'vertical', marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button onClick={handleUpdateProject} disabled={updating} style={{ backgroundColor: '#542468', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                  {updating ? 'Saving…' : 'Save Project'}
                </button>
                <button onClick={() => setEditing(false)} disabled={updating} style={{ backgroundColor: '#ccc', color: '#333', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ width: '100%', borderRadius: '8px', padding: '8px', fontSize: '0.95rem', border: '1px solid #eee', backgroundColor: '#f9f9f9', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                {description || 'No description'}
              </p>

              {/* כפתור עריכה */}
              <button onClick={() => setEditing(true)} style={{ backgroundColor: '#542468', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginBottom: '8px' }}>
                עריכה
              </button>

              {/* כפתור מחיקה */}
              <button onClick={handleDeleteProject} style={{ backgroundColor: '#e53935', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginBottom: '16px' }}>
                מחיקה
              </button>
            </>
          )}

          <div className="tasks-section">
            <AddTaskForm projectId={project.Id} onTaskAdded={() => loadTasks(project.Id)} />
            {tasks.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#666' }}>No tasks yet.</p>
            ) : (
              tasks.map(task => (
                <TaskCard key={task.Id} task={task} users={users} onStatusChange={() => loadTasks(project.Id)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCard;
