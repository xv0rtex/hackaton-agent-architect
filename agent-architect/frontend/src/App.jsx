import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ProjectProvider } from './context/ProjectContext';
import LandingPage from './pages/LandingPage';
import ConfiguratorPage from './pages/ConfiguratorPage';
import ChatPage from './pages/ChatPage'; // Keep for now if used, but we might remove it
import OrchestrationPage from './pages/OrchestrationPage';
import DryRunPage from './pages/DryRunPage';
import OfficePage from './pages/OfficePage';
import AgentsPage from './pages/AgentsPage';
import ProjectsDashboard from './pages/ProjectsDashboard';
import ExportPage from './pages/ExportPage';

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/projects" element={<ProjectsDashboard />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/project/:projectId/chat" element={<ConfiguratorPage />} />
        <Route path="/project/:projectId/orchestration" element={<OrchestrationPage />} />
        <Route path="/project/:projectId/dry-run" element={<DryRunPage />} />
        <Route path="/project/:projectId/workspace" element={<OfficePage />} />
        <Route path="/project/:projectId/office" element={<OfficePage />} />
        <Route path="/project/:projectId/export" element={<ExportPage />} />
        <Route path="/configurator" element={<Navigate to="/projects" replace />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ProjectProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </ProjectProvider>
  );
}

export default App;
