// src/App.js
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';
import HomePage from './components/HomePage/HomePage';
import KanbanBoard from './components/Kanban/KanbanBoard';
import ProjectsList from './components/Projects/ProjectsList';
import UsersList from './components/Users/UsersList';
import CreateProjectForm from './components/Projects/CreateProjectForm';
import UsersCrud from './components/Users/UsersCrud';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <Router>
      <>
        <Routes>
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/kanban" element={<Layout><KanbanBoard /></Layout>} />
          <Route path="/projects" element={<Layout><ProjectsList /></Layout>} />
          <Route path="/users" element={<Layout><UsersList /></Layout>} />
          <Route path="/create-project" element={<Layout><CreateProjectForm /></Layout>} />
          <Route path="/users-management" element={<Layout><UsersCrud /></Layout>} />
          <Route path="*" element={<Layout><div style={{ padding: 20 }}>Page not found</div></Layout>} />
        </Routes>
        <ToastContainer position="top-right" autoClose={4000} theme="colored" />
      </>
    </Router>
  );
}

export default App;
