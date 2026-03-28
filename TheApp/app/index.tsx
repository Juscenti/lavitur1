import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/ui';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingState fullScreen message="Signing in…" />;

  if (!session || !profile) return <Redirect href="/login" />;

  const allowed = ['admin', 'representative'];
  const role = profile.role?.toString().toLowerCase().trim();
  if (!allowed.includes(role || '')) {
    return (
      <Redirect
        href={{
          pathname: '/login',
          params: { reason: role ? 'not_authorized' : 'role_missing' },
        }}
      />
    );
  }

  return <Redirect href="/(tabs)/dashboard" />;
}
