import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AcceptInvitePage from './pages/auth/AcceptInvitePage';

import DashboardPage from './pages/dashboard/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectOverviewPage from './pages/projects/ProjectOverviewPage';
import MonitoringPage from './pages/projects/MonitoringPage';
import ESGPage from './pages/projects/ESGPage';
import SettingsPage from './pages/settings/SettingsPage';
import VerificationPage from './pages/public/VerificationPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Unauthenticated Marketing Footprints */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Auth Pipes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />

        {/* Public Decentralized Blockchain Tool */}
        <Route path="/verify/:projectToken" element={<VerificationPage />} />

        {/* Authenticated Application Architecture */}
        <Route path="/dashboard" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
             <Route index element={<DashboardPage />} />
             <Route path="projects" element={<ProjectsPage />} />
             <Route path="projects/:projectId" element={<ProjectOverviewPage />} />
             
             {/* Sub Module Endpoints natively matching the requirements actively spanning layout limits smoothly */}
             <Route path="projects/:projectId/monitoring" element={<MonitoringPage />} />
             <Route path="projects/:projectId/esg" element={<ESGPage />} />
             {/* Mock visual placeholders mapping other UI segments strictly omitted per exact spec mapping  */}
             <Route path="projects/:projectId/baseline" element={<div className="p-10 font-black text-gray-300 text-3xl">Baseline Viewer Module</div>} />
             <Route path="projects/:projectId/predictions" element={<div className="p-10 font-black text-gray-300 text-3xl">AI Prediction Module</div>} />
             <Route path="projects/:projectId/map" element={<div className="p-10 font-black text-gray-300 text-3xl">GIS Viewer Module</div>} />
             <Route path="projects/:projectId/community" element={<div className="p-10 font-black text-gray-300 text-3xl">Community Module</div>} />
             <Route path="projects/:projectId/report" element={<div className="p-10 font-black text-gray-300 text-3xl">Report Configuration Module</div>} />
             <Route path="projects/:projectId/compliance" element={<div className="p-10 font-black text-gray-300 text-3xl">Compliance Checks Module</div>} />
             
             <Route path="settings" element={<SettingsPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
