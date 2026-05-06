import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Lazy load pages for better initial footprint mapping and performance
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const AcceptInvitePage = lazy(() => import('./pages/auth/AcceptInvitePage'));

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const ProjectOverviewPage = lazy(() => import('./pages/projects/ProjectOverviewPage'));
const MonitoringPage = lazy(() => import('./pages/projects/MonitoringPage'));
const ESGPage = lazy(() => import('./pages/projects/ESGPage'));
const AnalyticsPage = lazy(() => import('./pages/dashboard/AnalyticsPage'));

// Sub-Module Activations
const BaselinePage = lazy(() => import('./pages/projects/BaselinePage'));
const PredictionsPage = lazy(() => import('./pages/projects/PredictionsPage'));
const GISPage = lazy(() => import('./pages/projects/GISPage'));
const CommunityPage = lazy(() => import('./pages/projects/CommunityPage'));
const ReportPage = lazy(() => import('./pages/projects/ReportPage'));
const ReportEditorPage = lazy(() => import('./pages/projects/ReportEditorPage'));
const CompliancePage = lazy(() => import('./pages/projects/CompliancePage'));

const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const BillingPage = lazy(() => import('./pages/billing/BillingPage'));
const VerificationPage = lazy(() => import('./pages/public/VerificationPage'));
const ParticipationPortal = lazy(() => import('./pages/public/ParticipationPortal'));

const LoadingFallback = () => (
  <div className="h-screen w-full bg-[#0f172a] flex flex-col items-center justify-center">
    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
    <div className="text-white font-black text-sm uppercase tracking-widest animate-pulse">Initializing EcoSense...</div>
  </div>
);

const KeepAlive = () => {
  useEffect(() => {
    const ping = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://cosense-eia-backend.onrender.com';
        await axios.get(`${apiUrl}/health/`);
        console.log('Keep-alive ping successful');
      } catch (err) {
        console.error('Keep-alive ping failed', err);
      }
    };
    
    // Ping every 10 minutes to stay within Render's 15m timeout
    const interval = setInterval(ping, 600000);
    ping();
    
    return () => clearInterval(interval);
  }, []);
  return null;
};

import { MapProvider } from './components/maps/MapContext';

function App() {
  return (
    <BrowserRouter>
      <MapProvider>
        <KeepAlive />
        <Suspense fallback={<LoadingFallback />}>
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
                 <Route path="billing" element={<BillingPage />} />
                 {/* Sprint 4C — Firm-wide analytics */}
                 <Route path="analytics" element={<AnalyticsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </MapProvider>
    </BrowserRouter>
  );
}

export default App;
