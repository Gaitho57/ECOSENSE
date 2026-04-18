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
import AnalyticsPage from './pages/dashboard/AnalyticsPage';

// Sub-Module Activations
import BaselinePage from './pages/projects/BaselinePage';
import PredictionsPage from './pages/projects/PredictionsPage';
import GISPage from './pages/projects/GISPage';
import CommunityPage from './pages/projects/CommunityPage';
import ReportPage from './pages/projects/ReportPage';
import ReportEditorPage from './pages/projects/ReportEditorPage';
import CompliancePage from './pages/projects/CompliancePage';

import SettingsPage from './pages/settings/SettingsPage';
import VerificationPage from './pages/public/VerificationPage';
import ParticipationPortal from './pages/public/ParticipationPortal';

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

        {/* Public pages — no authentication required */}
        <Route path="/verify/:projectToken" element={<VerificationPage />} />
        <Route path="/public/participate/:projectToken" element={<ParticipationPortal />} />

        {/* Authenticated Application Architecture */}
        <Route path="/dashboard" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
             <Route index element={<DashboardPage />} />
             <Route path="projects" element={<ProjectsPage />} />
             <Route path="projects/:projectId" element={<ProjectOverviewPage />} />
             
             {/* Sub Module Endpoints natively integrated and actively spanning layout limits smoothly */}
             <Route path="projects/:projectId/monitoring" element={<MonitoringPage />} />
             <Route path="projects/:projectId/esg" element={<ESGPage />} />
             
             <Route path="projects/:projectId/baseline" element={<BaselinePage />} />
             <Route path="projects/:projectId/predictions" element={<PredictionsPage />} />
             <Route path="projects/:projectId/map" element={<GISPage />} />
             <Route path="projects/:projectId/community" element={<CommunityPage />} />
             <Route path="projects/:projectId/report" element={<ReportPage />} />
             <Route path="projects/:projectId/report-editor" element={<ReportEditorPage />} />
             <Route path="projects/:projectId/compliance" element={<CompliancePage />} />
             
             <Route path="settings" element={<SettingsPage />} />
             {/* Sprint 4C — Firm-wide analytics */}
             <Route path="analytics" element={<AnalyticsPage />} />
        </Route>

        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
