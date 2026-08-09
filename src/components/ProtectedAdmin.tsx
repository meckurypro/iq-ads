// src/components/ProtectedAdmin.tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../lib/useAdminAuth';

interface ProtectedAdminProps {
  children: ReactNode;
}

// Wraps any /admin/* route. Redirects to /admin/login if there's no
// session, or if the session exists but the profile role isn't
// 'admin' (see PROFILES_TABLE / ROLE_COLUMN in useAdminAuth.ts).
//
// This is a UI gate only, not a security boundary — every real
// admin write still needs to be enforced server-side via RLS or a
// SECURITY DEFINER function against profiles.role = 'admin'.
export default function ProtectedAdmin({ children }: ProtectedAdminProps) {
  const { loading, isAdmin } = useAdminAuth();

  if (loading) {
    // Avoid a flash of denied/allowed content while the profile
    // role lookup is in flight.
    return null;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
