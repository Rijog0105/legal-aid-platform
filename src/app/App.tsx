import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageLoader } from '@/components/ui';

export default function App() {
  /* Initialize auth — this sets up the onAuthStateChange listener */
  const { isInitialized, isLoading, isAuthenticated } = useAuth();

  console.log('[App] render — isInitialized:', isInitialized, '| isLoading:', isLoading, '| isAuthenticated:', isAuthenticated);

  if (!isInitialized) {
    console.log('[App] → rendering <PageLoader message="Initializing..." /> because isInitialized=false');
    return <PageLoader message="Initializing..." />;
  }

  console.log('[App] → rendering <RouterProvider>');
  return <RouterProvider router={router} />;
}
