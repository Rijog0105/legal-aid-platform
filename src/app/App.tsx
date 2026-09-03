import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { ErrorBoundary } from '@/components/ui';
import { InstallPromptCard } from '@/components/pwa/InstallPromptCard';
import { NetworkStatusBar } from '@/components/pwa/NetworkStatusBar';
import { useSyncEngine } from '@/hooks/useSyncEngine';

export default function App() {
  useSyncEngine();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
        <InstallPromptCard />
        <NetworkStatusBar />
      </AuthProvider>
    </ErrorBoundary>
  );
}
