// PLACE AT: src/App.tsx (overwrite existing)
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedAdmin from './components/ProtectedAdmin';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* Public: sign-in screen for the shared Meckury AI admin account. */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Protected: bounces to /admin/login if there's no session or
          the signed-in account isn't role = 'admin'. */}
      <Route
        path="/admin/*"
        element={
          <ProtectedAdmin>
            <AdminDashboard />
          </ProtectedAdmin>
        }
      />
    </Routes>
  );
}
