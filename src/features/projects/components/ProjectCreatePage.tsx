import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants';
import { ProjectForm } from './ProjectForm';

export function ProjectCreatePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl">
      <Link
        to={ROUTES.PROJECTS}
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 transition-colors mb-4"
      >
        <ArrowLeft size={15} /> Back to Projects
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">New Legal Aid Project</h1>
        <p className="text-surface-500 mt-0.5 text-sm">
          Create a new legal aid project. It starts in draft status.
        </p>
      </div>

      <Card>
        <ProjectForm
          onCancel={() => navigate(ROUTES.PROJECTS)}
          onSaved={(project) => navigate(ROUTES.PROJECT_DETAIL.replace(':projectId', project.id))}
        />
      </Card>
    </div>
  );
}
