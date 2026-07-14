import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui';
import { ROUTES } from '@/constants';
import { CampForm } from './CampForm';

export function CampCreatePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl">
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
