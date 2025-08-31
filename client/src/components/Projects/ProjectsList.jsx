import { useEffect, useState } from 'react';
import { fetchProjects } from '../../services/api';
import ProjectCardManual from './ProjectCard';
import './ProjectsList.css';

const ProjectsList = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjectId, setExpandedProjectId] = useState(null);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleExpand = (projId) => {
    setExpandedProjectId(prev => (prev === projId ? null : projId));
  };

  // פונקציה שתופעל אחרי מחיקת פרויקט
  const handleProjectDeleted = async (deletedId) => {
    // כאן אפשר לעשות fetch מחדש
    await loadProjects();
    if (expandedProjectId === deletedId) setExpandedProjectId(null);
  };

  if (loading) return <div className="loading">Loading projects...</div>;

  return (
    <div className="projects-container">
      <h2 className="projects-title">Projects</h2>
      {projects.length === 0 ? (
        <p className="no-projects">No projects found.</p>
      ) : (
        <div className="projects-list">
          {projects.map((p, index) => (
            <ProjectCardManual
              key={p._id ?? index}
              project={p}
              expanded={p.Id === expandedProjectId}
              onExpand={() => handleExpand(p.Id)}
              onDeleted={handleProjectDeleted} // <-- העברת הפונקציה
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsList;
