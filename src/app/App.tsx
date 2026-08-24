import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { ErrorBoundary } from '@/components/ui';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
