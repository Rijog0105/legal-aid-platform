import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants';
import { CampForm } from './CampForm';

export function CampCreatePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl">
      <Link
        to={ROUTES.CAMPS}
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 transition-colors mb-4"
      >
        <ArrowLeft size={15} /> Back to Camps
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">New Camp</h1>
        <p className="text-surface-500 mt-0.5 text-sm">
          Create a new legal aid camp. It starts in draft status.
        </p>
      </div>

      <Card>
        <CampForm
          onCancel={() => navigate(ROUTES.CAMPS)}
          onSaved={(camp) => navigate(ROUTES.CAMP_DETAIL.replace(':campId', camp.id))}
        />
      </Card>
    </div>
  );
}
