import { redirect } from 'next/navigation';

// The middleware (lib/supabase/proxy.ts) handles auth-gating.
// Authenticated users hitting "/" get redirected here to /notes.
// Unauthenticated users are sent to /auth/login by middleware.
export default function Home() {
  redirect('/notes');
}
