import { useNavigate, useLocation } from 'react-router-dom';
import { FolderKanban, Plus, Search, MapPin, Calendar, AlertCircle, CheckCircle, X, ArrowRight } from 'lucide-react';
import { ProjectStatusBadge, Spinner } from '@/components/ui';
import { PROJECT_STATUS, ROUTES, type ProjectStatus } from '@/constants';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { deriveProjectStatus } from '@/utils/projectLifecycle';

const ALL_STATUSES: Array<ProjectStatus | null> = [
  null,
  PROJECT_STATUS.DRAFT,
  PROJECT_STATUS.ACTIVE,
  PROJECT_STATUS.COMPLETED,
  PROJECT_STATUS.ARCHIVED,
];

const STATUS_LABELS: Record<ProjectStatus, string> = {
  [PROJECT_STATUS.DRAFT]: 'Draft',
  [PROJECT_STATUS.ACTIVE]: 'Active',
  [PROJECT_STATUS.COMPLETED]: 'Completed',
  [PROJECT_STATUS.ARCHIVED]: 'Archived',
};

export function ProjectListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const deletedProjectName = (location.state as { deletedProjectName?: string } | null)
    ?.deletedProjectName ?? null;

  const { projects, isLoading, error, search, setSearch, statusFilter, setStatusFilter } =
    useProjects();

  const goToDetail = (id: string) => navigate(ROUTES.PROJECT_DETAIL.replace(':projectId', id));

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* ─── Deletion Success Banner ─── */}
      {deletedProjectName && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm shadow-xs animate-fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>
              <span className="font-bold">{deletedProjectName}</span> has been permanently removed.
            </span>
          </span>
          <button
            type="button"
            onClick={() => navigate(ROUTES.PROJECTS, { replace: true })}
            className="text-emerald-500 hover:text-emerald-700 transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Legal Aid Projects</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
              {projects.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse and manage all institutional legal aid camps, survey operations, and generated reports.
          </p>
        </div>

        <button
          id="btn-add-project"
          onClick={() => navigate(ROUTES.PROJECT_CREATE)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>

      {/* ─── Search & Status Filters ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            id="projects-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by camp name or village…"
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {ALL_STATUSES.map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status ?? 'all'}
                id={`filter-${status ?? 'all'}`}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {status ? STATUS_LABELS[status] : 'All Projects'}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Error Notification ─── */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Project Grid ─── */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <FolderKanban size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {search || statusFilter ? 'No matching projects found' : 'No projects created yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            {search || statusFilter
              ? 'Try modifying your search keywords or active filters.'
              : 'Create your first legal aid project to start planning surveys and camps.'}
          </p>
          {!search && !statusFilter && (
            <button
              onClick={() => navigate(ROUTES.PROJECT_CREATE)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const derivedStatus = deriveProjectStatus(project);

            return (
              <div
                key={project.id}
                onClick={() => goToDetail(project.id)}
                className="group bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
                      {project.camp_name}
                    </h3>
                    <ProjectStatusBadge status={derivedStatus} />
                  </div>

                  {project.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                      {project.description}
                    </p>
                  )}

                  <div className="space-y-2 pt-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-indigo-500 shrink-0" />
                      <span className="font-medium">{project.camp_date || 'Date not set'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-emerald-500 shrink-0" />
                      <span className="font-medium truncate">
                        {project.village_name}, {project.taluk || project.district}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                  <span className="text-[11px] font-semibold text-slate-400 capitalize">
                    {derivedStatus}
                  </span>
                  <div className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Manage</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
