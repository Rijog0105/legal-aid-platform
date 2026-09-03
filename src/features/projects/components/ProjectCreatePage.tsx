import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FolderPlus } from 'lucide-react';
import { ROUTES } from '@/constants';
import { ProjectForm } from './ProjectForm';

export function ProjectCreatePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      <Link
        to={ROUTES.PROJECTS}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Projects
      </Link>

      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
          <FolderPlus size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Legal Aid Project</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Initialize project profile and location. Survey and Camp schedules are configured within the project.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        <ProjectForm
          onCancel={() => navigate(ROUTES.PROJECTS)}
          onSaved={(project) => navigate(ROUTES.PROJECT_DETAIL.replace(':projectId', project.id))}
        />
      </div>
    </div>
  );
}
