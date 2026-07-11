import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';
import { ROUTES } from '@/constants';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-8">
      <div className="text-center max-w-md animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-surface-900 mb-2">Access Denied</h1>
        <p className="text-surface-500 mb-8">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <Button
          variant="secondary"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate(ROUTES.HOME)}
        >
          Go Back Home
        </Button>
      </div>
    </div>
  );
}
