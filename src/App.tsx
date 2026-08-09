import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AdminPlaceholder from './pages/AdminPlaceholder';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* Real admin auth + dashboard will replace this once the
          Meckury AI schema is shared and the shared Supabase
          client + RLS policies are wired up. */}
      <Route path="/admin/*" element={<AdminPlaceholder />} />
    </Routes>
  );
}
