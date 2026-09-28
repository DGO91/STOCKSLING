import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage   from './pages/LandingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import WorkspacePage from './pages/WorkspacePage.jsx';
import HistoryPage   from './pages/HistoryPage.jsx';
import IntegrationsPage from './pages/IntegrationsPage.jsx';
import { LanguageProvider } from './pages/LanguageContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"          element={<LandingPage />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/workspace" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
            <Route path="/history"   element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
            
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
