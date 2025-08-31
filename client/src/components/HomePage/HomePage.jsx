// src/components/HomePage.jsx
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Team Task Manager</h1>
        <p className="subtitle">Manage projects, assign tasks and see your Kanban board.</p>
      </header>

      <nav className="home-nav">
        <Link to="/kanban" className="home-nav-item">Kanban</Link>
        <Link to="/projects" className="home-nav-item">Projects</Link>
        <Link to="/users" className="home-nav-item">Users</Link>
        <Link to="/create-project" className="home-nav-item">Create Project</Link>
      </nav>

      <main className="home-main">
        <section className="home-card">
          <h2>Quick start</h2>
          <p>From here you can go to the Kanban board to view tasks or manage projects and users.</p>
          <div className="btn-container">
            <Link to="/kanban" className="btn-primary">Open Kanban</Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
