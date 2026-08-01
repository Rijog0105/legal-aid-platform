import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Calendar,
  MapPin,
  Clock,
  X,
  AlertCircle,
  FileText,
  CheckCircle,
  ClipboardList,
  Layers,
  Users,
} from 'lucide-react';
import { Button, Card, ProjectStatusBadge, Spinner } from '@/components/ui';
import { PROJECT_STATUS, ROUTES, type ProjectStatus } from '@/constants';
import { useProject } from '@/features/projects/hooks/useProject';
import { updateProjectStatus } from '@/features/projects/services/projectService';
import { ProjectForm } from './ProjectForm';
import { ProjectPeopleTab } from './ProjectPeopleTab';
import { ActivitiesTab } from '@/features/activities';
import { PhotosTab } from '@/features/volunteer';
import { ReportPreparationTab } from './ReportPreparationTab';
import { BudgetTab } from '@/features/budget';
import { SurveySchedule } from './SurveySchedule';
import { CampSchedule } from './CampSchedule';

const STATUS_FLOW: Record<ProjectStatus, ProjectStatus[]> = {
  [PROJECT_STATUS.DRAFT]: [PROJECT_STATUS.ACTIVE],
  [PROJECT_STATUS.ACTIVE]: [PROJECT_STATUS.COMPLETED],
  [PROJECT_STATUS.COMPLETED]: [PROJECT_STATUS.ARCHIVED],
  [PROJECT_STATUS.ARCHIVED]: [],
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  [PROJECT_STATUS.DRAFT]: 'Draft',
  [PROJECT_STATUS.ACTIVE]: 'Active',
  [PROJECT_STATUS.COMPLETED]: 'Completed',
  [PROJECT_STATUS.ARCHIVED]: 'Archived',
};

type MainTab = 'overview' | 'survey' | 'camp' | 'report';
type SurveySubTab = 'dashboard' | 'schedule' | 'people' | 'attendance' | 'forms' | 'budget';
type CampSubTab = 'activities' | 'photos' | 'budget' | 'schedule' | 'people' | 'attendance' | 'guests';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, isLoading, error, setProject, reload } = useProject(projectId);
  
  // 2-Level Workspace Navigation States
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('overview');
  const [activeSurveySubTab, setActiveSurveySubTab] = useState<SurveySubTab>('dashboard');
  const [activeCampSubTab, setActiveCampSubTab] = useState<CampSubTab>('activities');

  const [showEdit, setShowEdit] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleStatusChange = async (status: ProjectStatus) => {
    if (!project) return;
    setStatusUpdating(true);
    setStatusError(null);
    try {
      const updated = await updateProjectStatus(project.id, status);
      setProject(updated);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <AlertCircle size={16} className="flex-shrink-0" />
        {error ?? 'Project not found'}
      </div>
    );
  }

  const nextStatuses = STATUS_FLOW[project.status];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ─── Back Link ─── */}
      <Link
        to={ROUTES.PROJECTS}
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 transition-colors"
      >
        <ArrowLeft size={15} /> Back to Projects
      </Link>

      {/* ─── Project Header ─── */}
      <div className="flex flex-wrap items-start justify-between gap-4 bg-white p-6 rounded-3xl border border-surface-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900">{project.camp_name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-surface-500">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-surface-400" /> {project.camp_date}
            </span>
            {(project.start_time || project.end_time) && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-surface-400" />
                {project.start_time ?? '—'} – {project.end_time ?? '—'}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-surface-400" />
              {project.village_name}, {project.taluk}, {project.district}
            </span>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-2">
          {nextStatuses.map((status) => (
            <Button
              key={status}
              size="sm"
              variant="secondary"
              isLoading={statusUpdating}
              onClick={() => handleStatusChange(status)}
            >
              Mark {STATUS_LABELS[status]}
            </Button>
          ))}
          <Button size="sm" variant="outline" leftIcon={<Pencil size={14} />} onClick={() => setShowEdit(true)}>
            Edit Details
          </Button>
        </div>
      </div>

      {statusError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {statusError}
        </div>
      )}

      {/* ─── Segmented Workspace Switcher Navigation (Top-Level) ─── */}
      <div className="flex bg-surface-100 p-1.5 rounded-2xl border border-surface-200/80 max-w-lg shadow-sm">
        <button
          onClick={() => setActiveMainTab('overview')}
          className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'overview'
              ? 'bg-white text-surface-900 shadow-sm border border-surface-200/30'
              : 'text-surface-500 hover:text-surface-800'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveMainTab('survey')}
          className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'survey'
              ? 'bg-white text-surface-900 shadow-sm border border-surface-200/30'
              : 'text-surface-500 hover:text-surface-800'
          }`}
        >
          Survey Phase
        </button>
        <button
          onClick={() => setActiveMainTab('camp')}
          className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'camp'
              ? 'bg-white text-surface-900 shadow-sm border border-surface-200/30'
              : 'text-surface-500 hover:text-surface-800'
          }`}
        >
          Camp Phase
        </button>
        <button
          onClick={() => setActiveMainTab('report')}
          className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'report'
              ? 'bg-white text-surface-900 shadow-sm border border-surface-200/30'
              : 'text-surface-500 hover:text-surface-800'
          }`}
        >
          Final Report
        </button>
      </div>

      {/* ─── Main Tab Content Render Area ─── */}

      {/* 1. OVERVIEW PAGE */}
      {activeMainTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Project Home Metadata */}
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-surface-900 border-b border-surface-100 pb-2">Project Home</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-surface-400 block uppercase tracking-wider">Project Name</span>
                  <span className="font-semibold text-surface-800 text-sm">{project.camp_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-surface-400 block uppercase tracking-wider">Village & location</span>
                  <span className="font-semibold text-surface-800 text-sm">{project.village_name}, {project.district}</span>
                </div>
                <div>
                  <span className="text-[10px] text-surface-400 block uppercase tracking-wider">State</span>
                  <span className="font-semibold text-surface-800 text-sm">{project.report_settings?.state ?? 'Karnataka'}</span>
                </div>
                {project.report_settings?.academic_year && (
                  <div>
                    <span className="text-[10px] text-surface-400 block uppercase tracking-wider">Academic Year</span>
                    <span className="font-semibold text-surface-800 text-sm">{project.report_settings.academic_year}</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-surface-400 block uppercase tracking-wider">Status</span>
                  <div className="mt-1">
                    <ProjectStatusBadge status={project.status} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Right Column: Progress & Settings */}
            <div className="space-y-6">
              <Card className="p-5">
                <h3 className="text-sm font-bold text-surface-900 mb-3">Project Phase Progress</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Survey Progress</h4>
                      <p className="text-base font-extrabold text-primary-700 mt-0.5">
                        {project.status === PROJECT_STATUS.DRAFT ? '0%' : project.status === PROJECT_STATUS.ACTIVE ? '60%' : '100%'}
                      </p>
                    </div>
                    <CheckCircle className="w-6 h-6 text-primary-500 opacity-80" />
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Camp Progress</h4>
                      <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                        {project.status === PROJECT_STATUS.DRAFT || project.status === PROJECT_STATUS.ACTIVE ? '0%' : '100%'}
                      </p>
                    </div>
                    <Layers className="w-6 h-6 text-emerald-500 opacity-80" />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Project Schedules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SurveySchedule project={project} onUpdate={reload} />
            <CampSchedule project={project} onUpdate={reload} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Description card */}
            {project.description && (
              <Card className="p-5 md:col-span-2">
                <h3 className="text-sm font-bold text-surface-900 mb-2">Project Description</h3>
                <p className="text-sm text-surface-600 leading-relaxed">{project.description}</p>
              </Card>
            )}

            {/* Recent Activity card */}
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-surface-900 border-b border-surface-100 pb-2">Recent Activity</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-surface-800">Project Initialized</p>
                    <p className="text-[10px] text-surface-400">Roster, budget, and activities created</p>
                  </div>
                </div>
                {project.allocated_budget && (
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-surface-800">Budget Configured</p>
                      <p className="text-[10px] text-surface-400">Allocated budget limit set</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 2. SURVEY PHASE */}
      {activeMainTab === 'survey' && (
        <div className="space-y-4">
          {/* Sub-Navigation */}
          <div className="flex items-center gap-1.5 border-b border-surface-100 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveSurveySubTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSurveySubTab === 'dashboard' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Survey Dashboard
            </button>
            <button
              onClick={() => setActiveSurveySubTab('schedule')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSurveySubTab === 'schedule' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Schedule Survey
            </button>
            <button
              onClick={() => setActiveSurveySubTab('people')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSurveySubTab === 'people' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Assign People
            </button>
            <button
              onClick={() => setActiveSurveySubTab('attendance')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSurveySubTab === 'attendance' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => setActiveSurveySubTab('forms')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSurveySubTab === 'forms' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Survey Forms
            </button>
            <button
              onClick={() => setActiveSurveySubTab('budget')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSurveySubTab === 'budget' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Survey Budget
            </button>
          </div>

          {/* Sub-Tab Contents */}
          {activeSurveySubTab === 'dashboard' && (
            <Card className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <ClipboardList size={24} />
              </div>
              <h3 className="text-base font-bold text-surface-900">Survey Dashboard</h3>
              <p className="text-xs text-surface-500 max-w-md mx-auto leading-relaxed">
                Aggregated survey metrics, response ratios, and list of submitted forms.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-100 text-surface-600 text-xs font-medium">
                <span>Phase Integration Target:</span>
                <span className="font-semibold text-primary-700">Phase 8 (Survey Engine)</span>
              </div>
            </Card>
          )}

          {activeSurveySubTab === 'schedule' && (
            <SurveySchedule project={project} onUpdate={reload} />
          )}

          {activeSurveySubTab === 'people' && (
            <ProjectPeopleTab campId={project.id} />
          )}

          {activeSurveySubTab === 'attendance' && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-base font-bold text-surface-900">Survey Phase Attendance</h3>
                <span className="text-xs text-surface-500 font-normal">
                  (Derived from survey delegation roster)
                </span>
              </div>
              <ProjectPeopleTab campId={project.id} />
            </Card>
          )}

          {activeSurveySubTab === 'forms' && (
            <Card className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-100 text-surface-600 flex items-center justify-center mx-auto">
                <FileText size={24} />
              </div>
              <h3 className="text-base font-bold text-surface-900">Survey Forms Integration</h3>
              <p className="text-xs text-surface-500 max-w-md mx-auto leading-relaxed">
                Survey forms will serve as the central module of the survey engine. Verification photos and survey photos will be integrated directly into individual survey submissions during Phase 8 implementation.
              </p>
            </Card>
          )}

          {activeSurveySubTab === 'budget' && (
            <BudgetTab campId={project.id} camp={project} onCampUpdate={reload} />
          )}
        </div>
      )}

      {/* 3. CAMP PHASE */}
      {activeMainTab === 'camp' && (
        <div className="space-y-4">
          {/* Sub-Navigation */}
          <div className="flex items-center gap-1.5 border-b border-surface-100 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveCampSubTab('activities')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCampSubTab === 'activities' ? 'bg-emerald-50 text-emerald-700' : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Activities
            </button>
            <button
              onClick={() => setActiveCampSubTab('photos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCampSubTab === 'photos' ? 'bg-emerald-50 text-emerald-700' : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Documentation Photos
            </button>
            <button
              onClick={() => setActiveCampSubTab('budget')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCampSubTab === 'budget' ? 'bg-emerald-50 text-emerald-700' : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Camp Budget
            </button>
            <button
              onClick={() => setActiveCampSubTab('schedule')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCampSubTab === 'schedule' ? 'bg-emerald-50 text-emerald-700' : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Schedule Camp
            </button>
            <button
              onClick={() => setActiveCampSubTab('people')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCampSubTab === 'people' ? 'bg-emerald-50 text-emerald-700' : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Assign People
            </button>
            <button
              onClick={() => setActiveCampSubTab('attendance')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCampSubTab === 'attendance' ? 'bg-emerald-50 text-emerald-700' : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => setActiveCampSubTab('guests')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCampSubTab === 'guests' ? 'bg-emerald-50 text-emerald-700' : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Guests & Dignitaries
            </button>
          </div>

          {/* Sub-Tab Contents */}
          {activeCampSubTab === 'activities' && (
            <ActivitiesTab campId={project.id} />
          )}

          {activeCampSubTab === 'photos' && (
            <PhotosTab campId={project.id} />
          )}

          {activeCampSubTab === 'budget' && (
            <BudgetTab campId={project.id} camp={project} onCampUpdate={reload} />
          )}

          {activeCampSubTab === 'schedule' && (
            <CampSchedule project={project} onUpdate={reload} />
          )}

          {activeCampSubTab === 'people' && (
            <ProjectPeopleTab campId={project.id} />
          )}

          {activeCampSubTab === 'attendance' && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-base font-bold text-surface-900">Camp Phase Attendance</h3>
                <span className="text-xs text-surface-500 font-normal">
                  (Derived from camp delegation roster)
                </span>
              </div>
              <ProjectPeopleTab campId={project.id} />
            </Card>
          )}

          {activeCampSubTab === 'guests' && (
            <Card className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-100 text-surface-600 flex items-center justify-center mx-auto">
                <Users size={24} />
              </div>
              <h3 className="text-base font-bold text-surface-900">Guests & Dignitaries Registry</h3>
              <p className="text-xs text-surface-500 max-w-md mx-auto leading-relaxed">
                Invite, track, and manage institutional faculty guests, village VIPs, and legal counsels.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* 4. FINAL REPORT */}
      {activeMainTab === 'report' && (
        <ReportPreparationTab
          projectId={project.id}
          onNavigateTab={(tabKey) => {
            if (tabKey === 'activities') setActiveMainTab('camp');
            if (tabKey === 'photos') setActiveMainTab('camp');
          }}
        />
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowEdit(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-900">Edit Project</h2>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
              <ProjectForm
                project={project}
                onCancel={() => setShowEdit(false)}
                onSaved={(updated) => {
                  setProject(updated);
                  setShowEdit(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
