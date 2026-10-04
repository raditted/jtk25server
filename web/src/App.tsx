import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ToastContainer from './components/Toast';

import Home from './pages/Home';
import Jadwal from './pages/Jadwal';
import KalenderPage from './pages/Kalender';
import PengumumanPage from './pages/Pengumuman';
import RuanganPage from './pages/Ruangan';
import Privacy from './pages/Privacy';

import Login from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminJadwal from './pages/admin/AdminJadwal';
import AdminKalender from './pages/admin/AdminKalender';
import AdminPengumuman from './pages/admin/AdminPengumuman';
import AdminPengganti from './pages/admin/AdminPengganti';
import AdminRuangan from './pages/admin/AdminRuangan';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // The API clears the stored token on 401/403; mirror that by leaving the
  // admin area instead of leaving a stale page rendered.
  useEffect(() => {
    if (!isAuthenticated) navigate('/admin/login', { replace: true });
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

/** Admin routes get the dedicated shell rather than the public header/footer. */
function AdminPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminPage><AdminDashboard /></AdminPage>} />
          <Route path="/admin/jadwal" element={<AdminPage><AdminJadwal /></AdminPage>} />
          <Route path="/admin/kalender" element={<AdminPage><AdminKalender /></AdminPage>} />
          <Route path="/admin/pengumuman" element={<AdminPage><AdminPengumuman /></AdminPage>} />
          <Route path="/admin/pengganti" element={<AdminPage><AdminPengganti /></AdminPage>} />
          <Route path="/admin/ruangan" element={<AdminPage><AdminRuangan /></AdminPage>} />

          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/jadwal" element={<Layout><Jadwal /></Layout>} />
          <Route path="/kalender" element={<Layout><KalenderPage /></Layout>} />
          <Route path="/pengumuman" element={<Layout><PengumumanPage /></Layout>} />
          <Route path="/ruangan" element={<Layout><RuanganPage /></Layout>} />
          <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
        </Routes>
          <ToastContainer />
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
