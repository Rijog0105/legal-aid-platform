import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageLoader } from '@/components/ui';

export default function App() {
  /* Initialize auth — this sets up the onAuthStateChange listener */
  const { isInitialized } = useAuth();

  if (!isInitialized) {
    return <PageLoader message="Initializing..." />;
  }

  return <RouterProvider router={router} />;
}
